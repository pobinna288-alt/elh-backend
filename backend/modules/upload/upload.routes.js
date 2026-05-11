const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { createUploadService } = require("./upload.service");
const { createUploadController } = require("./upload.controller");

fs.mkdirSync(path.resolve(process.cwd(), "uploads"), { recursive: true });

const upload = multer({ dest: "uploads/" });

function createUploadRoutes(context) {
  const router = express.Router();
  const uploadService = createUploadService(context);
  const controller = createUploadController(uploadService);
  const profilePictureRouteHandlers = [
    context.authenticateToken,
    context.profilePictureUpload.fields([
      { name: "profile_picture", maxCount: 1 },
      { name: "image", maxCount: 1 },
      { name: "file", maxCount: 1 },
    ]),
    controller.updateProfilePicture,
  ];

  router.post("/user/profile/picture", ...profilePictureRouteHandlers);
  router.post("/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      return res.status(200).json({
        success: true,
        file: req.file,
      });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);

      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  router.post(
    "/api/user/upload-profile",
    context.authenticateToken,
    (req, res, next) => {
      context.profileImageUpload.single("profileImage")(req, res, (err) => {
        if (!err) return next();
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ success: false, error: "File exceeds 5MB" });
        }
        return res.status(400).json({ success: false, error: err.message || "Invalid file type" });
      });
    },
    controller.uploadProfileImage,
  );

  router.post(
    ["/ads/create", "/api/ads/create"],
    context.authenticateToken,
    context.mediaUpload.array("media", 10),
    context.validateAdCreateRequest,
    controller.createAd,
  );

  return router;
}

function registerUploadModule(app, context) {
  const router = createUploadRoutes(context);
  app.use("/", router);
  return router;
}

module.exports = {
  createUploadRoutes,
  registerUploadModule,
};
