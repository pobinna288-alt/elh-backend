function createUploadController(uploadService) {
  return {
    updateProfilePicture: (req, res) => {
      try {
        const result = uploadService.updateProfilePicture({
          userId: req.user.id,
          files: req.files,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Profile picture upload error:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to update profile picture",
        });
      }
    },

    uploadProfileImage: (req, res) => {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No image provided" });
      }
      try {
        const result = uploadService.uploadProfileImage({
          userId: req.user.id,
          file: req.file,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Profile image upload error:", error);
        return res.status(500).json({ success: false, error: "Upload failed" });
      }
    },

    createAd: async (req, res) => {
      try {
        const result = await uploadService.createAd({
          userId: req.user.id,
          body: req.body || {},
          validatedAd: req.validatedAd,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Create ad error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to create ad",
        });
      }
    },
  };
}

module.exports = {
  createUploadController,
};
