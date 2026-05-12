const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createUploadService } = require("./upload.service");
const { createUploadController } = require("./upload.controller");

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

function createUploadRoutes(context) {
  const router = express.Router();
  const uploadService = createUploadService(context);
  const controller = createUploadController(uploadService);

  router.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type"],
    }),
  );

  const hasUpload = Boolean(context && context.profilePictureUpload);

  if (
    hasUpload &&
    typeof context.authenticateToken === "function" &&
    typeof context.profilePictureUpload.array === "function"
  ) {
    router.post(
      "/user/profile/picture",
      context.authenticateToken,
      context.profilePictureUpload.array("file", 1),
      controller.updateProfilePicture,
    );
  }
  router.post(
    "/upload",
    upload.single("file"),
    (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded",
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
          message: "Upload failed",
        });
      }
    },
    (err, _req, res, _next) => {
      console.error("UPLOAD ERROR:", err);
      const isMulterError = err instanceof multer.MulterError;
      const status = isMulterError ? 400 : 500;
      return res.status(status).json({
        success: false,
        message: err?.message || "Upload failed",
      });
    },
  );

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
