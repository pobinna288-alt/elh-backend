const express = require("express");
const { createUploadService } = require("./upload.service");
const { createUploadController } = require("./upload.controller");

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
  router.post("/upload", ...profilePictureRouteHandlers);

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
