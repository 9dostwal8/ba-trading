import { z } from "zod";

export type Vendor = {
  id: string;
  name: string;
  brand_key: string;
  brands: string[];
  logo_domain: string | null;
  logo_url: string | null;
  commission_type: string;
  commission_value: number;
  is_active: boolean;
  is_verified: boolean;
  slug: string;
  code: string;
  tagline_ar: string;
  tagline_ku: string;
  about_ar: string;
  about_ku: string;
  cover_url: string | null;
  city: string;
  phone: string;
  whatsapp: string;
  hue: number;
  chroma: number;
};

export type VendorMember = {
  id: string;
  vendor_id: string;
  user_id: string;
};

export type VendorLine = {
  unit_price: number;
  quantity: number;
  commission_amount: number;
};

/** Sales / commission / net totals for a set of order lines. */
export function vendorTotals(lines: VendorLine[] = []) {
  let sales = 0;
  let commission = 0;
  let units = 0;
  for (const l of lines) {
    sales += Number(l.unit_price) * l.quantity;
    commission += Number(l.commission_amount ?? 0);
    units += l.quantity;
  }
  return { sales, commission, net: Math.max(0, sales - commission), units };
}

export const COMMISSION_TYPES = ["percent", "fixed_per_item", "fixed_per_order"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

/** Human hint of the commission rule, e.g. "10%" or "500 / piece". */
export function commissionLabel(type: string | null, value: number | null) {
  const v = Number(value ?? 0);
  if (type === "fixed_per_item") return `${v} / pcs`;
  if (type === "fixed_per_order") return `${v} / shipment`;
  return `${v}%`;
}

/** Split a comma / newline separated brand list into clean names. */
export function parseBrands(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/[,\n،]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

/** Is this a commission mode the order calculation knows how to apply? */
export function isCommissionType(type: unknown): type is CommissionType {
  return COMMISSION_TYPES.includes(type as CommissionType);
}

/** Upper bound of a commission value for a given mode (percent is capped at 100). */
export function commissionMax(type: string) {
  return type === "percent" ? 100 : 1_000_000_000;
}

/**
 * Validates a vendor commission setting against the rules the order
 * calculation relies on. Returns an i18n key when the setting is invalid.
 */
export const vendorCommissionSchema = z
  .object({
    name: z.string().trim().min(1, "vendorNameRequired").max(120, "vendorNameRequired"),
    commission_type: z.enum(COMMISSION_TYPES, { message: "commissionTypeInvalid" }),
    commission_value: z
      .number({ message: "commissionValueInvalid" })
      .finite("commissionValueInvalid")
      .min(0, "commissionValueInvalid"),
  })
  .superRefine((v, ctx) => {
    if (v.commission_type === "percent" && v.commission_value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["commission_value"],
        message: "commissionPercentMax",
      });
    }
    if (v.commission_type !== "percent" && !Number.isInteger(v.commission_value)) {
      ctx.addIssue({
        code: "custom",
        path: ["commission_value"],
        message: "commissionWholeAmount",
      });
    }
  });

export type VendorCommissionInput = z.input<typeof vendorCommissionSchema>;

/** Returns { ok } or { ok: false, key } where key is an i18n message key. */
export function validateVendorCommission(input: {
  name: string;
  commission_type: string;
  commission_value: string | number;
}): { ok: true; value: number; type: CommissionType } | { ok: false; key: string } {
  const raw =
    typeof input.commission_value === "number"
      ? input.commission_value
      : Number(String(input.commission_value).trim());
  const parsed = vendorCommissionSchema.safeParse({
    name: input.name,
    commission_type: input.commission_type,
    commission_value: Number.isNaN(raw) ? Number.NaN : raw,
  });
  if (!parsed.success) {
    return { ok: false, key: parsed.error.issues[0]?.message ?? "error" };
  }
  return { ok: true, value: parsed.data.commission_value, type: parsed.data.commission_type };
}
