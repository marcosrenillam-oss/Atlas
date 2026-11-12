import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

/** Reduce fotos grandes antes de guardarlas (ahorra espacio en el iPhone). */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) {
      bmp.close();
      return file;
    }
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return out && out.size < file.size ? out : file;
  } catch {
    return file; // formato no decodificable (p. ej. HEIC en navegadores que no lo soportan)
  }
}

/** URL local (object URL) de un archivo guardado; se libera al desmontar. */
export function useFileUrl(fileId?: string | null): string | null {
  const file = useLiveQuery(async () => (fileId ? (await db.files.get(fileId)) ?? null : null), [fileId]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file?.blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${(n / 1024 ** 3).toFixed(2).replace('.', ',')} GB`;
}

/** Abre un archivo local en una pestaña nueva (o lo descarga si el navegador lo bloquea). */
export async function openStoredFile(fileId: string): Promise<void> {
  const f = await db.files.get(fileId);
  if (!f) throw new Error('El archivo no está guardado en este dispositivo.');
  const url = URL.createObjectURL(f.blob);
  const w = window.open(url, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
