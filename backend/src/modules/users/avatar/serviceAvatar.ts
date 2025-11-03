import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '../../../infra/prisma';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');

export async function ensureAvatarDirs() {
  await fs.mkdir(AVATARS_DIR, { recursive: true });
}

export async function saveUserAvatar(userId: string, image: Buffer, ext: 'webp') {
  await ensureAvatarDirs();
  const filename = `${userId}_${Date.now()}.${ext}`;
  const abs = path.join(AVATARS_DIR, filename);

  await fs.writeFile(abs, image);

  // URL publique express.static('/uploads')
  const publicUrl = `/uploads/avatars/${filename}`;

  // Récup ancien avatar pour cleanup si local
  const prev = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: publicUrl, updatedAt: new Date() },
    select: { id: true, avatarUrl: true },
  });

  // Supprime l’ancien fichier si c’était un chemin local
  if (prev?.avatarUrl?.startsWith('/uploads/avatars/')) {
    const oldAbs = path.join(process.cwd(), prev.avatarUrl);
    fs.unlink(oldAbs).catch(() => {});
  }

  return updated;
}
