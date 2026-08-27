import { formatPrice, type Lang, type TKey } from "@/lib/i18n";
import type { FlashDeal, Offer } from "@/lib/store";

type T = (key: TKey) => string;


/** Big headline describing what the offer gives ("30% خصم", "اشترِ 2 واحصل 1 مجاناً"...). */
export function offerHeadline(offer: Offer, lang: Lang, t: T) {
  const value = Number(offer.discount_value) || 0;
  switch (offer.discount_type) {
    case "fixed":
      return `${t("off")} ${formatPrice(value, lang)}`;
    case "fixed_price":
      return `${formatPrice(value, lang)} / ${t("perPiece")}`;
    case "bxgy":
      return lang === "ar"
        ? `اشترِ ${offer.buy_qty} واحصل ${offer.get_qty} مجاناً`
        : `${offer.buy_qty} بکڕە ${offer.get_qty} خۆڕایی وەرگرە`;
    default:
      return `${value}% ${t("off")}`;
  }
}

/** Short chips describing the offer conditions. */
export function offerRuleChips(
  offer: Offer,
  lang: Lang,
  t: T,
  names: { category?: string | null | undefined; brand?: string | null | undefined } = {},
) {
  const chips: string[] = [];

  if (offer.scope === "all") chips.push(t("scopeAll"));
  if (offer.scope === "category" && names.category) chips.push(`${t("offerCategory")}: ${names.category}`);
  if (offer.scope === "brand") chips.push(`${t("offerBrand")}: ${names.brand ?? offer.brand}`);

  if (offer.min_qty > 1) chips.push(t("minQtyHint").replace("{n}", String(offer.min_qty)));

  if (offer.max_discount != null && offer.discount_type !== "bxgy")
    chips.push(t("capAt").replace("{n}", formatPrice(Number(offer.max_discount), lang)));

  return chips;
}

/** Big headline of a today-deal ("30% خصم", "سعر ثابت 5,000"...). */
export function dealHeadline(deal: FlashDeal, lang: Lang, t: T) {
  const value = Number(deal.discount_value) || 0;
  switch (deal.discount_type) {
    case "fixed":
      return `${t("off")} ${formatPrice(value, lang)}`;
    case "fixed_price":
      return `${formatPrice(value, lang)} / ${t("perPiece")}`;
    default:
      return `${value}% ${t("off")}`;
  }
}

/** Short chips describing the conditions of a today-deal. */
export function dealRuleChips(deal: FlashDeal, lang: Lang, t: T) {
  const chips: string[] = [];
  const minQty = Number(deal.min_qty ?? 1);
  if (minQty > 1) chips.push(t("minQtyHint").replace("{n}", String(minQty)));
  if (deal.max_discount != null)
    chips.push(t("capAt").replace("{n}", formatPrice(Number(deal.max_discount), lang)));
  if (deal.max_qty_per_order != null)
    chips.push(t("maxPerOrderHint").replace("{n}", String(deal.max_qty_per_order)));
  return chips;
}
