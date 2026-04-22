"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const config_1 = require("@nestjs/config");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
exports.default = (0, config_1.registerAs)('storage', () => ({
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 120 * 1024 * 1024,
    allowedVideoMimeTypes: [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
    ],
}));
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
            const uniqueSuffix = `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`;
            cb(null, uniqueSuffix);
        },
    }),
    limits: {
        fileSize: 120 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo',
            'video/webm',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only video files are allowed.'), false);
        }
    },
};
//# sourceMappingURL=storage.config.js.map