import sharp from 'sharp';

export type ProcessedImage = {
  buffer: Buffer;
  ext: 'webp';
};

export async function processAvatar(input: Buffer): Promise<ProcessedImage> {
  // - cover: recadre pour un carré
  // - 512x512 (profil)
  // - retire metadata
  // - WebP q=82 + effort modéré
  const buffer = await sharp(input)
    .rotate() // oriente selon EXIF
    .resize(512, 512, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return { buffer, ext: 'webp' };
}
