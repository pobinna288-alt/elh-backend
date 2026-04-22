const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const coinRewardService = require("../../services/coinRewardService");
const videoDurationExtractor = require("../../utils/videoDurationExtractor");

// URL prefix for ad media files stored by the mediaUpload multer in server.js
const AD_MEDIA_URL_PREFIX = "/uploads/ads/";

function createUploadService({
  database,
  ensureUserProfileDefaults,
  invalidateProfileCache,
  buildProfileOverview,
  buildLocationDetails,
  resolveUserAdPlan,
  convertToUsd,
  normalizeCurrencyCode,
  generateAdTargeting,
  storeAdRecord,
}) {
  return {
    coinRewardService,
    videoDurationExtractor,

    updateProfilePicture({ userId, files }) {
      const userIndex = database.users.findIndex((user) => user.id === userId);
      if (userIndex === -1) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      const uploadedFile = files?.profile_picture?.[0] || files?.image?.[0] || files?.file?.[0];
      if (!uploadedFile) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Profile image is required",
          },
        };
      }

      const imageUrl = `/uploads/profile-pictures/${uploadedFile.filename}`;
      const user = database.users[userIndex];
      user.profile_picture = imageUrl;
      user.profilePhoto = imageUrl;
      user.updatedAt = new Date();
      ensureUserProfileDefaults(user);
      invalidateProfileCache(user.id);

      return {
        status: 200,
        body: {
          success: true,
          message: "Profile picture updated successfully",
          profile_picture: imageUrl,
          image_url: imageUrl,
          profile: buildProfileOverview(user),
        },
      };
    },

    uploadProfileImage({ userId, file }) {
      const userIndex = database.users.findIndex((u) => u.id === userId);
      if (userIndex === -1) {
        // Clean up orphaned upload
        try { fs.unlinkSync(file.path); } catch (_) {}
        return { status: 404, body: { success: false, error: "User not found" } };
      }

      const user = database.users[userIndex];

      // Delete old profile image from disk if it exists and is locally stored
      const oldImage = user.profileImage || user.profile_picture || user.profilePhoto;
      if (oldImage && oldImage.startsWith("/uploads/profile/")) {
        const oldPath = path.join(__dirname, "../../../uploads", oldImage.replace("/uploads/", ""));
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }

      const imageUrl = `/uploads/profile/${file.filename}`;
      user.profileImage = imageUrl;
      user.profile_picture = imageUrl;
      user.profilePhoto = imageUrl;
      user.updatedAt = new Date();
      ensureUserProfileDefaults(user);
      invalidateProfileCache(user.id);

      return {
        status: 200,
        body: {
          success: true,
          profileImage: imageUrl,
        },
      };
    },

    async createAd({ userId, body, validatedAd }) {
      const {
        location,
        locality,
        city,
        country,
        latitude,
        longitude,
        currency,
        condition,
      } = body || {};

      const userIndex = database.users.findIndex((entry) => entry.id === userId);
      const user = userIndex !== -1 ? database.users[userIndex] : null;
      const locationDetails = buildLocationDetails({ location, locality, city, country });
      const plan = resolveUserAdPlan(user);
      const now = new Date();
      const {
        title,
        description,
        adType,
        categoryId,
        categoryName,
        mediaUrls,
        images,
        video,
        imageFiles,
        videoFile,
        price,
      } = validatedAd;
      // Merge URL-based media (from body.media) with disk-uploaded files
      const uploadedImageUrls = (imageFiles || []).map(f => `${AD_MEDIA_URL_PREFIX}${f.filename}`);
      const uploadedVideoUrl = videoFile ? `${AD_MEDIA_URL_PREFIX}${videoFile.filename}` : null;
      const adImages = [...(Array.isArray(images) ? images : []), ...uploadedImageUrls];
      const adVideo = (typeof video === "string" && video.length > 0 ? video : null) || uploadedVideoUrl;
      const normalizedCurrency = normalizeCurrencyCode(validatedAd.currency || currency);
      const numericPrice = Number.isFinite(price) ? price : 0;
      const priceUsd = await convertToUsd(numericPrice, normalizedCurrency);

      let targetCountries = locationDetails.country ? [locationDetails.country] : [];
      let targetingReasoning = [];
      let globalReachEnabled = false;

      if (locationDetails.country) {
        try {
          const targeting = generateAdTargeting({
            plan,
            userCountry: locationDetails.country,
            category: categoryName,
          });
          targetCountries = targeting.targetCountries;
          targetingReasoning = targeting.reasoning;
          globalReachEnabled = targetCountries.length > 1;
        } catch (targetingError) {
          console.warn("[Ad Targeting Fallback]", targetingError.message);
        }
      }

      const parsedLatitude = Number.parseFloat(latitude);
      const parsedLongitude = Number.parseFloat(longitude);
      const newAdId = uuidv4();
      const newAd = {
        id: newAdId,
        post_id: newAdId,
        userId,
        seller_id: userId,
        seller_type: user?.companyName ? "business" : "individual",
        ad_type: adType,
        adType,
        type: adType,
        title,
        description,
        caption: description || null,
        images: adImages,
        video: adVideo,
        media: [...adImages, ...(adVideo ? [adVideo] : [])],
        media_url: adVideo || adImages[0] || null,
        hasMedia: adImages.length > 0 || adVideo !== null,
        hasVideo: adVideo !== null,
        price: numericPrice,
        currency: normalizedCurrency,
        priceUsd,
        category_id: categoryId,
        category: categoryName,
        condition: condition || "used",
        location: locationDetails.displayLocation,
        location_locality: locationDetails.locality,
        location_city: locationDetails.city,
        location_country: locationDetails.country,
        latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : null,
        longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : null,
        plan,
        targetCountries,
        globalReachEnabled,
        targetingReasoning,
        status: "active",
        isActive: true,
        views: 0,
        clicks: 0,
        likes: 0,
        attention_score: 0,
        trust_score: user?.trust_score || 0,
        is_verified: Boolean(user?.email_verified),
        ai_approved: false,
        createdAt: now,
        updatedAt: now,
        created_at: now,
        updated_at: now,
      };

      storeAdRecord(newAd);

      if (userIndex !== -1) {
        user.totalAds = (user.totalAds || 0) + 1;
        database.users[userIndex] = user;
      }

      return {
        status: 201,
        body: {
          success: true,
          message: "Ad created successfully",
          coverage: locationDetails.country
            ? `This ad will be visible across cities and localities within ${locationDetails.country}`
            : "This ad will use the provided location visibility",
          ad: newAd,
        },
      };
    },
  };
}

module.exports = {
  coinRewardService,
  videoDurationExtractor,
  createUploadService,
};
