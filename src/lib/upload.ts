import type { Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Hard cap on what a vendor may push, before we downscale it. */
const MAX_BYTES = 8 * 1024 * 1024;
const OUT_TYPE = "image/webp";

/**
 * Storage and bandwidth are the only parts of the app that grow with content,
 * so every picture is re-encoded down to a small WebP before it ever leaves the
 * browser. Each preset has a longest-edge limit and a byte budget: we lower the
 * WebP quality (and finally the size) until the output fits the budget.
 */
type Preset = { edge: number; budget: number };
const PRESETS = {
  /** Catalog thumbnails/product galleries — shown small on mobile. */
  product: { edge: 900, budget: 90 * 1024 },
  /** Banner creatives — full width, so a bit wider, still tiny. */
  banner: { edge: 1200, budget: 140 * 1024 },
} satisfies Record<string, Preset>;

export class UploadError extends Error {}

/**
 * Reads the first bytes of the file and confirms it really is a JPEG, PNG or
 * WebP. Extensions and the browser-reported type are attacker-controlled, so
 * this is what actually blocks an HTML/SVG file renamed to `.jpg`.
 */
async function sniffImage(file: File) {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const is = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (is(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const riff = is(0x52, 0x49, 0x46, 0x46);
  const webp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  if (riff && webp) return "image/webp";
  throw new UploadError("unsupported-image");
}

/**
 * Decodes, downscales and re-encodes the picture. Re-encoding is a safety step
 * as well as a size step: the output is pixels we produced ourselves, so no
 * scripts, metadata or GPS coordinates from the original survive.
 */
async function normalizeImage(file: File, preset: Preset): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new UploadError("unsupported-image");
  });
  const draw = (edge: number, quality: number) => {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new UploadError("canvas-unavailable");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    return new Promise<Blob | null>((res) => canvas.toBlob(res, OUT_TYPE, quality));
  };

  let best: Blob | null = null;
  // Try progressively cheaper encodings until one fits the byte budget.
  for (const [edge, quality] of [
    [preset.edge, 0.72],
    [preset.edge, 0.6],
    [Math.round(preset.edge * 0.75), 0.6],
    [Math.round(preset.edge * 0.6), 0.55],
    [Math.round(preset.edge * 0.5), 0.5],
  ] as [number, number][]) {
    const blob = await draw(edge, quality);
    if (!blob) continue;
    best = blob;
    if (blob.size <= preset.budget) break;
  }
  bitmap.close();
  if (!best) throw new UploadError("encode-failed");
  return best;
}

async function prepare(file: File, preset: Preset) {
  if (file.size > MAX_BYTES) throw new UploadError("too-large");
  await sniffImage(file);
  return normalizeImage(file, preset);
}

async function put(bucket: string, path: string, body: Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    cacheControl: "31536000",
    upsert: false,
    contentType: OUT_TYPE,
  });
  if (error) throw error;
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

/**
 * Uploads a banner creative and returns a long-lived URL usable in <img src>.
 * The bucket is private, so we hand back a signed URL.
 */
export async function uploadBannerImage(file: File, prefix = "banners") {
  const body = await prepare(file, PRESETS.banner);
  return put("banners", `${prefix}/${crypto.randomUUID()}.webp`, body);
}

/**
 * Uploads a product photo into the folder that belongs to `vendorId` (admins
 * without a vendor use the shared `admin` folder). We always generate the file
 * name ourselves so nothing from the original name can escape the folder.
 */
export async function uploadProductImage(file: File, vendorId?: string | null) {
  const body = await prepare(file, PRESETS.product);
  const folder = vendorId && /^[0-9a-f-]{36}$/i.test(vendorId) ? vendorId : "admin";
  return put("products", `${folder}/${crypto.randomUUID()}.webp`, body);
}

/** Friendly bilingual reason an upload was refused. */
export function uploadMessage(e: unknown, lang: Lang) {
  const code = e instanceof UploadError ? e.message : "";
  if (code === "too-large")
    return lang === "ar" ? "الصورة كبيرة جداً (8 ميغا كحد أقصى)" : "وێنە زۆر گەورەیە (٨ مێگا)";
  if (code === "unsupported-image")
    return lang === "ar"
      ? "الملف ليس صورة صحيحة (JPG أو PNG أو WEBP فقط)"
      : "فایل وێنەی دروست نییە (تەنها JPG، PNG، WEBP)";
  return lang === "ar" ? "فشل رفع الصورة" : "بارکردنی وێنە سەرکەوتوو نەبوو";
}
