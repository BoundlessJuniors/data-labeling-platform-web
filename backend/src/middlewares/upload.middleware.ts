/**
 * Multer Upload Middleware
 *
 * Uses memory storage so files stay in RAM as Buffers.
 * Filters to allow only image files (JPEG, PNG, WEBP).
 * Max file size: 10 MB.
 */
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { isAllowedImageMimeType } from '../config/upload-security';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  if (isAllowedImageMimeType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Yalnızca resim dosyalarına izin verilir (JPEG, PNG, WEBP).'));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});
