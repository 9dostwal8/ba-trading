import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiFilledProduct = {
  name_en: string;
  name_ar: string;
  name_ku: string;
  description_ar: string;
  description_ku: string;
  brand: string;
  sku: string;
  category: string;
};

export type AiScannedItem = { name: string; brand: string; price: number; stock: number };

/** One rough product name -> trilingual listing fields. */
export const aiFillProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; categories?: string[] }) => ({
    name: String(input.name ?? "").slice(0, 200),
    categories: (input.categories ?? []).slice(0, 40).map((c) => String(c).slice(0, 60)),
  }))
  .handler(async ({ data }) => {
    if (data.name.trim().length < 2) throw new Error("Type a product name first");
    const { askJson, FILL_SYSTEM } = await import("./ai-listing.server");
    const out = await askJson<Partial<AiFilledProduct>>([
      { role: "system", content: FILL_SYSTEM },
      {
        role: "user",
        content: `Product: ${data.name}\nAllowed categories: ${
          data.categories.length ? data.categories.join(" | ") : "(none)"
        }`,
      },
    ]);
    const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    return {
      name_en: s(out.name_en) || data.name.trim(),
      name_ar: s(out.name_ar),
      name_ku: s(out.name_ku),
      description_ar: s(out.description_ar),
      description_ku: s(out.description_ku),
      brand: s(out.brand),
      sku: s(out.sku).toUpperCase(),
      category: s(out.category),
    } satisfies AiFilledProduct;
  });

/** Photo of a price list -> rows the vendor can confirm and publish in bulk. */
export const aiScanPriceList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    const url = String(input.imageDataUrl ?? "");
    if (!url.startsWith("data:image/")) throw new Error("Invalid image");
    if (url.length > 8_000_000) throw new Error("Image too large");
    return { imageDataUrl: url };
  })
  .handler(async ({ data }) => {
    const { askJson, SCAN_SYSTEM } = await import("./ai-listing.server");
    const out = await askJson<{ items?: Partial<AiScannedItem>[] }>([
      { role: "system", content: SCAN_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the product rows from this price list." },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);
    return (out.items ?? [])
      .map((i) => ({
        name: typeof i.name === "string" ? i.name.trim() : "",
        brand: typeof i.brand === "string" ? i.brand.trim() : "",
        price: Math.max(0, Math.round(Number(i.price) || 0)),
        stock: Math.max(0, Math.round(Number(i.stock) || 0)),
      }))
      .filter((i) => i.name.length > 1)
      .slice(0, 60) satisfies AiScannedItem[];
  });
