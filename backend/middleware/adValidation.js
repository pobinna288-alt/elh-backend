const { AD_CATEGORIES, findAdCategory } = require("../config/adCategories");

const ALLOWED_AD_TYPES = Object.freeze(["image", "video", "text"]);
const TITLE_LIMITS = Object.freeze({ min: 5, max: 50 });
const DESCRIPTION_LIMITS = Object.freeze({ min: 10, max: 200 });
const IMAGE_PATTERN = /image\/|\.(png|jpe?g|gif|webp)$/i;
const VIDEO_PATTERN = /video\/|\.(mp4|mov|avi|mkv|webm)$/i;
const MAX_SHORT_VIDEO_DURATION_SECONDS = 60;

const ALLOWED_IMAGE_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_MIME_TYPES = Object.freeze(["video/mp4", "video/webm"]);
const ALLOWED_MEDIA_MIME_TYPES = Object.freeze([...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES]);

function sanitizePlainText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return `${value}`
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMediaInput(media) {
  const items = Array.isArray(media) ? media : media ? [media] : [];

  return items
    .map(item => sanitizePlainText(item))
    .filter(Boolean)
    .slice(0, 5);
}

function inferAdType(files, mediaUrls) {
  const signals = [
    ...files.map(file => `${file?.mimetype || ""} ${file?.originalname || ""}`.toLowerCase()),
    ...mediaUrls.map(item => item.toLowerCase()),
  ];

  if (signals.some(item => VIDEO_PATTERN.test(item))) {
    return "video";
  }

  if (signals.some(item => IMAGE_PATTERN.test(item))) {
    return "image";
  }

  return "text";
}

function resolveAdType(value, files, mediaUrls) {
  const normalized = sanitizePlainText(value).toLowerCase();

  if (ALLOWED_AD_TYPES.includes(normalized)) {
    return normalized;
  }

  return inferAdType(files, mediaUrls);
}

/**
 * Validates file MIME types and separates all media (files + URL strings) into
 * distinct image and video buckets.
 *
 * Returns { imageFiles, videoFiles, imageUrls, videoUrls, error }.
 * When `error` is non-null the remaining fields are absent and the request
 * should be rejected immediately.
 */
function separateAndValidateMedia(files, mediaUrls) {
  for (const file of files) {
    if (!ALLOWED_MEDIA_MIME_TYPES.includes(file.mimetype)) {
      return {
        error: `File type "${file.mimetype}" is not allowed. Accepted types: JPEG, PNG, WEBP images and MP4, WEBM videos`,
      };
    }
  }

  const imageFiles = files.filter(f => ALLOWED_IMAGE_MIME_TYPES.includes(f.mimetype));
  const videoFiles = files.filter(f => ALLOWED_VIDEO_MIME_TYPES.includes(f.mimetype));

  // A URL string may technically match both patterns (unlikely but safe to check video first)
  const imageUrls = mediaUrls.filter(url => IMAGE_PATTERN.test(url) && !VIDEO_PATTERN.test(url));
  const videoUrls = mediaUrls.filter(url => VIDEO_PATTERN.test(url));

  return { imageFiles, videoFiles, imageUrls, videoUrls, error: null };
}

function logMediaRejection(userId, reason) {
  console.warn(JSON.stringify({
    event: "ad_media_rejected",
    userId: userId || "unauthenticated",
    reason,
    timestamp: new Date().toISOString(),
  }));
}

function sendValidationError(res, field, message, extra = {}) {
  return res.status(400).json({
    error: message,
    field,
    ...extra,
  });
}

function validateAdCreateRequest(req, res, next) {
  const body = req.body || {};
  const files = Array.isArray(req.files) ? req.files : [];
  const mediaUrls = sanitizeMediaInput(body.media);
  const title = sanitizePlainText(body.title);
  const description = sanitizePlainText(body.description);
  const adType = resolveAdType(body.ad_type || body.adType, files, mediaUrls);
  const category = findAdCategory(body.category_id ?? body.categoryId ?? body.category);

  if (!title) {
    return sendValidationError(res, "title", "Title is required");
  }

  if (title.length < TITLE_LIMITS.min || title.length > TITLE_LIMITS.max) {
    return sendValidationError(res, "title", `Title must be between ${TITLE_LIMITS.min} and ${TITLE_LIMITS.max} characters`);
  }

  if (!description) {
    return sendValidationError(res, "description", "Description is required");
  }

  if (description.length < DESCRIPTION_LIMITS.min || description.length > DESCRIPTION_LIMITS.max) {
    return sendValidationError(res, "description", `Description must be between ${DESCRIPTION_LIMITS.min} and ${DESCRIPTION_LIMITS.max} characters`);
  }

  if (!ALLOWED_AD_TYPES.includes(adType)) {
    return sendValidationError(res, "ad_type", `Ad type must be one of: ${ALLOWED_AD_TYPES.join(", ")}`);
  }

  if (!category) {
    return sendValidationError(res, "category_id", "Invalid category. Select a valid category_id from /api/categories", {
      allowed_categories: AD_CATEGORIES,
    });
  }

  const suppliedUserId = sanitizePlainText(body.user_id || body.userId);
  if (suppliedUserId && req.user?.id && suppliedUserId !== req.user.id) {
    return res.status(403).json({
      error: "user_id does not match the authenticated user",
      field: "user_id",
    });
  }

  let parsedPrice = null;
  if (body.price !== undefined && body.price !== null && `${body.price}`.trim() !== "") {
    parsedPrice = Number.parseFloat(body.price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return sendValidationError(res, "price", "Price must be a valid non-negative number");
    }
  }

  const currency = sanitizePlainText(body.currency || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return sendValidationError(
      res,
      "currency",
      "Currency must be a valid 3-letter ISO code like NGN, GHS, EUR, or USD",
    );
  }

  const hasImageMedia = files.some(file => IMAGE_PATTERN.test(`${file?.mimetype || ""} ${file?.originalname || ""}`))
    || mediaUrls.some(item => IMAGE_PATTERN.test(item));
  const hasVideoMedia = files.some(file => VIDEO_PATTERN.test(`${file?.mimetype || ""} ${file?.originalname || ""}`))
    || mediaUrls.some(item => VIDEO_PATTERN.test(item));

  if (adType === "image" && !hasImageMedia) {
    return sendValidationError(res, "media", "Image ads require at least one photo or image URL");
  }

  if (adType === "video" && !hasVideoMedia) {
    return sendValidationError(res, "media", "Video ads require at least one video file or video URL");
  }

  const rawVideoDuration = body.video_duration ?? body.videoDuration ?? body.duration;
  let parsedVideoDuration = null;

  if (rawVideoDuration !== undefined && rawVideoDuration !== null && `${rawVideoDuration}`.trim() !== "") {
    parsedVideoDuration = Number.parseFloat(rawVideoDuration);

    if (!Number.isFinite(parsedVideoDuration) || parsedVideoDuration <= 0) {
      return sendValidationError(res, "video_duration", "Video duration must be a valid number greater than 0");
    }

    if (parsedVideoDuration > MAX_SHORT_VIDEO_DURATION_SECONDS) {
      return sendValidationError(
        res,
        "video_duration",
        `Short video ads must be ${MAX_SHORT_VIDEO_DURATION_SECONDS} seconds or less`
      );
    }
  }

  // ── Media separation & multi-video enforcement ────────────────────────────
  const mediaSeparation = separateAndValidateMedia(files, mediaUrls);

  if (mediaSeparation.error) {
    logMediaRejection(req.user?.id, mediaSeparation.error);
    return res.status(400).json({ success: false, message: mediaSeparation.error });
  }

  const totalVideoCount = mediaSeparation.videoFiles.length + mediaSeparation.videoUrls.length;

  if (totalVideoCount > 1) {
    const reason = `Multiple videos detected (${totalVideoCount}): only one video is allowed per ad`;
    logMediaRejection(req.user?.id, reason);
    return res.status(400).json({
      success: false,
      message: "Only one video is allowed per ad",
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  req.validatedAd = {
    userId: req.user?.id || suppliedUserId || null,
    title,
    description,
    adType,
    categoryId: category.id,
    categoryName: category.name,
    mediaUrls,
    images: mediaSeparation.imageUrls,
    video: mediaSeparation.videoUrls[0] || null,
    imageFiles: mediaSeparation.imageFiles,
    videoFile: mediaSeparation.videoFiles[0] || null,
    price: parsedPrice,
    currency,
    videoDuration: parsedVideoDuration,
  };

  req.body.title = title;
  req.body.description = description;
  req.body.ad_type = adType;
  req.body.category_id = category.id;
  req.body.category = category.name;
  req.body.currency = currency;

  if (parsedPrice !== null) {
    req.body.price = parsedPrice;
  }

  if (parsedVideoDuration !== null) {
    req.body.video_duration = parsedVideoDuration;
  }

  next();
}

module.exports = {
  ALLOWED_AD_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  DESCRIPTION_LIMITS,
  TITLE_LIMITS,
  sanitizePlainText,
  validateAdCreateRequest,
};
