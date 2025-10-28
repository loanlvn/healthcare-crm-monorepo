import type { Request, Response } from 'express';
import { processAvatar } from './image';
import { saveUserAvatar } from './serviceAvatar';
import { unauthorized } from '../../../utils/appError';

export async function postMyAvatar(req: Request, res: Response) {
  // @ts-ignore - ton guard ajoute req.user
  const userId: string = req.user?.id;
  // @ts-ignore multer single('file') => req.file
  const file: Express.Multer.File | undefined = req.file;

  if (!userId) throw unauthorized('UNAUTHORIZED')
  if (!file) return res.status(400).json({ error: 'NO_FILE' });

  try {
    const { buffer, ext } = await processAvatar(file.buffer);
    const out = await saveUserAvatar(userId, buffer, ext);
    return res.status(200).json(out);
  } catch (e: any) {
    const msg = (e && e.message) || 'PROCESSING_ERROR';
    // erreurs possibles: INVALID_MIME (jetée par fileFilter), sharp errors…
    return res.status(400).json({ error: msg });
  }
}
