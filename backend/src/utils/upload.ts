import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = process.env.UPLOAD_DIR
  ? path.isAbsolute(process.env.UPLOAD_DIR)
    ? process.env.UPLOAD_DIR
    : path.join(process.cwd(), process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

export const signalementUpload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(new Error('Seules les images JPEG, PNG, WebP ou GIF sont acceptées'));
      return;
    }
    cb(null, true);
  }
});

export function publicUploadUrl(filename: string): string {
  const base = process.env.PUBLIC_URL || '';
  return `${base}/uploads/${filename}`;
}

export function conditionalSignalementPhotos(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.is('multipart/form-data')) {
    signalementUpload.array('photos', 8)(req, res, next);
    return;
  }
  next();
}
