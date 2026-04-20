import { registerAs } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export default registerAs('storage', () => ({
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 120 * 1024 * 1024, // 120MB default
  allowedVideoMimeTypes: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ],
}));

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/temp',
    filename: (req, file, cb) => {
      const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueSuffix);
    },
  }),
  limits: {
    fileSize: 120 * 1024 * 1024, // 120MB
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
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'), false);
    }
  },
};
