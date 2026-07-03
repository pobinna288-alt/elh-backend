const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createUploadService } = require("./upload.service");
const { createUploadController } = require("./upload.controller");
const { aiCategorySuggestion } = require("../../middleware/aiCategorySuggestion");
const { validateAdCreateRequest } = require("../../middleware/adValidation");

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

function safePost(router, routePath, middlewares = [], handler) {
  if (typeof routePath !== "string") {
    console.warn("[Upload] Invalid route path:", routePath);
    return;
  }

  const validMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((fn) => typeof fn === "function")
    : [];
  const validHandler = typeof handler === "function";

  if (!validHandler) {
    console.warn(`[Upload] Skipping ${routePath} — handler missing`);
    return;
  }

  router.post(routePath, ...validMiddlewares, handler);
}

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

  const profileUpload = context?.profilePictureUpload;
  const auth = context?.authenticateToken;
  const canUseProfileUpload = Boolean(profileUpload && typeof profileUpload.array === "function");

  if (canUseProfileUpload && typeof auth === "function") {
    safePost(
      router,
      "/user/profile/picture",
      [auth, (req, res, next) => profileUpload.array("file", 1)(req, res, next)],
      controller?.updateProfilePicture,
    );
  }

  safePost(router, "/upload", [upload.single("file")], (req, res) => {
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
    });

  router.use("/upload", (err, _req, res, next) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Upload error",
      });
    }

    return next();
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

  const mediaUpload = context?.mediaUpload;
  const hasMediaUpload = Boolean(mediaUpload && typeof mediaUpload.array === "function");
  const adAuth = context?.authenticateToken;
  const adValidation = context?.validateAdCreateRequest || validateAdCreateRequest;

  const adMiddlewares = [
    adAuth,
    (req, res, next) => {
      if (!hasMediaUpload) {
        return res.status(503).json({
          success: false,
          message: "Upload service not available",
        });
      }

      return mediaUpload.array("media", 10)(req, res, next);
    },
    aiCategorySuggestion,
    adValidation,
  ];

  safePost(router, "/ads/create", adMiddlewares, controller?.createAd);
  safePost(router, "/api/ads/create", adMiddlewares, controller?.createAd);

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
