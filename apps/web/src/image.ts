export type PreparedImage = {
  blob: Blob;
  fileName: string;
  contentType: 'image/jpeg' | 'image/png';
  sha256: string;
  width: number;
  height: number;
};

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2,'0')).join('');
}

export async function prepareImage(file: File, prefix: 'person'|'garment'): Promise<PreparedImage> {
  if (!['image/jpeg','image/png'].includes(file.type)) throw new Error('UNSUPPORTED_IMAGE_TYPE');
  if (file.size > 10 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');

  const bitmap = await createImageBitmap(file);
  const maxSide = 2048;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {alpha: file.type === 'image/png'});
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('IMAGE_REENCODE_FAILED')), contentType, 0.92);
  });
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const extension = contentType === 'image/png' ? 'png' : 'jpg';
  return {
    blob,
    fileName: `${prefix}-${crypto.randomUUID()}.${extension}`,
    contentType,
    sha256: hex(digest),
    width,
    height
  };
}
