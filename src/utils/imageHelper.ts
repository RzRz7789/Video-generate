import type { UploadedPhoto } from '../types/studio';

export async function processUploadedFile(file: File): Promise<UploadedPhoto> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}`));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Format gambar ${file.name} tidak didukung.`));
    image.src = dataUrl;
  });

  // Resize to max 1280px on longest side for fast AI analysis & crisp 1080p canvas rendering
  const maxDim = 1280;
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height / width) * maxDim);
      width = maxDim;
    } else {
      width = Math.round((width / height) * maxDim);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas tidak tersedia di peramban.');
  ctx.drawImage(img, 0, 0, width, height);

  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const base64Data = compressedDataUrl.split(',')[1] || '';

  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    previewUrl: compressedDataUrl,
    mimeType: 'image/jpeg',
    base64Data,
  };
}

export async function urlToUploadedPhoto(
  url: string,
  name: string
): Promise<UploadedPhoto> {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
  return processUploadedFile(file);
}

export function formatTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getWavDurationSeconds(base64Audio: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const audioCtx = new AudioContext();
      audioCtx
        .decodeAudioData(bytes.buffer)
        .then((decoded) => {
          const dur = decoded.duration;
          audioCtx.close().catch(() => {});
          resolve(dur);
        })
        .catch(() => {
          audioCtx.close().catch(() => {});
          resolve(0);
        });
    } catch {
      resolve(0);
    }
  });
}
