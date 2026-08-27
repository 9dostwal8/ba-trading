/**
 * Per-city shipping: every vendor prices delivery for each Iraqi city and may
 * offer free delivery above an order amount. A `*` city row is the vendor's
 * default for any city it did not price.
 */
export const ANY_CITY = "*";

export type ShippingRate = {
  id: string;
  vendor_id: string;
  city: string;
  fee: number;
  free_over: number;
  is_active: boolean;
};

/** Iraqi cities offered in the shipping editor. */
export const IRAQ_CITIES: { ar: string; ku: string; en: string }[] = [
  { ar: "بغداد", ku: "بەغدا", en: "Baghdad" },
  { ar: "أربيل", ku: "هەولێر", en: "Erbil" },
  { ar: "السليمانية", ku: "سلێمانی", en: "Sulaymaniyah" },
  { ar: "دهوك", ku: "دهۆک", en: "Duhok" },
  { ar: "حلبجة", ku: "هەڵەبجە", en: "Halabja" },
  { ar: "كركوك", ku: "کەرکوک", en: "Kirkuk" },
  { ar: "الموصل", ku: "موسڵ", en: "Mosul" },
  { ar: "البصرة", ku: "بەسڕە", en: "Basra" },
  { ar: "النجف", ku: "نەجەف", en: "Najaf" },
  { ar: "كربلاء", ku: "کەربەلا", en: "Karbala" },
  { ar: "الحلة", ku: "حیلە", en: "Hilla" },
  { ar: "الديوانية", ku: "دیوانیە", en: "Diwaniyah" },
  { ar: "الناصرية", ku: "ناسریە", en: "Nasiriyah" },
  { ar: "العمارة", ku: "عەمارە", en: "Amarah" },
  { ar: "الكوت", ku: "کوت", en: "Kut" },
  { ar: "السماوة", ku: "سەماوە", en: "Samawah" },
  { ar: "الرمادي", ku: "ڕەمادی", en: "Ramadi" },
  { ar: "بعقوبة", ku: "بەعقوبە", en: "Baquba" },
  { ar: "تكريت", ku: "تکریت", en: "Tikrit" },
  { ar: "زاخو", ku: "زاخۆ", en: "Zakho" },
];

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Match a city name against the known list in any language. */
export function cityAliases(city: string): string[] {
  const c = norm(city);
  const row = IRAQ_CITIES.find(
    (r) => norm(r.ar) === c || norm(r.ku) === c || norm(r.en) === c,
  );
  return row ? [row.ar, row.ku, row.en].map(norm) : [c];
}

/** The rate a vendor applies to a city (exact match, else its default row). */
export function rateFor(vendorId: string | null | undefined, city: string, rates: ShippingRate[]) {
  const mine = rates.filter((r) => r.is_active && r.vendor_id === (vendorId ?? ""));
  const names = cityAliases(city);
  return (
    mine.find((r) => names.includes(norm(r.city))) ??
    mine.find((r) => norm(r.city) === ANY_CITY) ??
    null
  );
}

export type ShipLine = { vendorId: string | null; subtotal: number; fee: number; free: boolean };

/**
 * Shipping per vendor for a cart: each vendor charges its own city price and
 * drops to zero once that vendor's own lines pass its free-shipping amount.
 */
export function shippingBreakdown(
  lines: { vendorId: string | null; subtotal: number }[],
  city: string,
  rates: ShippingRate[],
  fallbackFee: number,
  fallbackFreeOver: number,
): { rows: ShipLine[]; total: number } {
  const rows = lines.map(({ vendorId, subtotal }) => {
    const r = rateFor(vendorId, city, rates);
    const fee = r ? Math.max(0, Number(r.fee) || 0) : Math.max(0, fallbackFee);
    const freeOver = r ? Math.max(0, Number(r.free_over) || 0) : Math.max(0, fallbackFreeOver);
    const free = freeOver > 0 && subtotal >= freeOver;
    return { vendorId, subtotal, fee: free ? 0 : fee, free };
  });
  return { rows, total: rows.reduce((s, r) => s + r.fee, 0) };
}

/** Cart lines grouped by vendor. */
export function vendorSubtotals(items: { vendor_id?: string | null; price: number; quantity: number }[]) {
  const map = new Map<string, { vendorId: string | null; subtotal: number }>();
  for (const i of items) {
    const key = i.vendor_id ?? "none";
    const cur = map.get(key) ?? { vendorId: i.vendor_id ?? null, subtotal: 0 };
    cur.subtotal += (Number(i.price) || 0) * i.quantity;
    map.set(key, cur);
  }
  return [...map.values()];
}
