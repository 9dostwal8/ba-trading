/** Decode a QR code from a picked image file (jsqr is lazy-loaded to keep the app fast). */
export async function decodeQrFile(file: File): Promise<string | null> {
  const [{ default: jsQR }, bitmap] = await Promise.all([
    import("jsqr"),
    createImageBitmap(file),
  ]);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  return jsQR(img.data, img.width, img.height)?.data ?? null;
}

/**
 * If the QR holds a link to our own store (product, offer, vendor page…),
 * return the in-app path so we can jump straight there.
 */
export function inAppPath(text: string): string | null {
  const raw = text.trim();
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    if (typeof window !== "undefined" && url.host !== window.location.host) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
