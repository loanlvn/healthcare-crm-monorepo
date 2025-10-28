import multer from 'multer';

const MAX_BYTES = Number(process.env.AVATAR_MAX_BYTES ?? 1 * 1024 * 1024); // 1MB MAAAAX
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

export const uploadAvatar = multer({
  storage: multer.memoryStorage(), // => je passe le buffer à sharp
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('INVALID_MIME'));
    }
    cb(null, true);
  },
});
