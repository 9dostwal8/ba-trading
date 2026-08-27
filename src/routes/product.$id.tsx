import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Banknote,
  Check,
  ChevronDown,
  Layers,
  Minus,
  MessageCircle,
  Package,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { formatPrice, pick, pickName, useI18n, type Lang, type TKey } from "@/lib/i18n";
import { formatCoins, ruleMap, useRewardRules, useRewardSettings } from "@/lib/rewards";
import {
  bestPromo,
  effectivePrice,
  fetchStoreData,
  tierUnitPrice,
  tiersOf,
} from "@/lib/store";
import { dealHeadline, dealRuleChips, offerHeadline, offerRuleChips } from "@/lib/offer-text";
import { TierTable } from "@/components/TierTable";
import { ProductBadges, DiscountBlade } from "@/lib/badges";
import { fetchVendors } from "@/lib/vendor-public";
import { siblingOffers } from "@/lib/catalog";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج | دنتال ستور" },
      {
        name: "description",
        content: "تفاصيل المنتج، السعر، أسعار الجملة، التوصيل والدفع عند الاستلام في دنتال ستور.",
      },
      { property: "og:title", content: "تفاصيل المنتج | دنتال ستور" },
      { property: "og:description", content: "السعر، خصم الكمية، التوصيل والدفع عند الاستلام." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function TrustTile({
  icon: Icon,
  title,
  sub,
  tone = "primary",
}: {
  icon: typeof Truck;
  title: string;
  sub: string;
  tone?: "primary" | "info" | "success" | "violet";
}) {
  const badge =
    tone === "info"
      ? "bg-info/10 text-info"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "violet"
          ? "bg-violet/10 text-violet"
          : "bg-primary/10 text-primary";
  return (
    <div className="flex flex-col items-center gap-1 bg-card p-3 text-center">
      <span className={`grid size-7 shrink-0 place-items-center rounded-full ${badge}`}>
        <Icon className="size-3.5" strokeWidth={2.6} />
      </span>
      <p className="text-[9.5px] font-black leading-tight">{title}</p>
      <p className="text-[9px] leading-tight text-muted-foreground">{sub}</p>
    </div>
  );
}


function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-2.5 text-start text-[13px] font-bold"
      >
        <span className="min-w-0">{q}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="pb-3 text-[12px] leading-6 text-muted-foreground">{a}</p>}
    </div>
  );
}

function InfoChip({
  children,
  tone = "muted",
}: {
  icon?: typeof Truck;
  children: React.ReactNode;
  tone?: "muted" | "success" | "deal" | "primary";
}) {
  const dot =
    tone === "success"
      ? "bg-success"
      : tone === "deal"
        ? "bg-deal-foreground"
        : tone === "primary"
          ? "bg-info"
          : "bg-muted-foreground/60";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-[11px] font-bold text-muted-foreground">
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}


function RewardBanner({
  price,
  row,
}: {
  price: number;
  row: Record<string, unknown>;
}) {
  const { lang } = useI18n();
  const { data: settings } = useRewardSettings();
  const { data: rules } = useRewardRules();
  if (settings?.rewards_enabled !== true) return null;
  const perK = ruleMap(rules).get("purchase_per_1000_iqd") ?? 0;
  const mult = Math.max(1, Number(row["reward_multiplier"] ?? 1));
  const bonus = Math.max(0, Number(row["reward_bonus_points"] ?? 0));
  const earn = Math.round((price / 1000) * perK * mult) + bonus;
  if (earn <= 0) return null;
  const boosted = mult > 1 || bonus > 0;
  return (
    <Link
      to="/rewards"
      className="flex items-center justify-between gap-2 bg-gradient-to-l from-indigo-600 to-violet-500 px-4 py-2.5 text-white"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20">
          <Sparkles className="size-3" strokeWidth={2.8} />
        </span>
        <span className="truncate text-[11.5px] font-black">
          {EARN_COPY[lang]}: {formatCoins(earn, lang)}
        </span>
        {boosted && (
          <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black text-indigo-600">
            {mult > 1 ? `${mult}X` : "BONUS"}
          </span>
        )}
      </span>
      <ChevronDown className="size-4 shrink-0 -rotate-90 text-white/80 rtl:rotate-90" />
    </Link>
  );
}


const EARN_COPY: Record<string, string> = {
  ar: "اشترِ واكسب",
  ku: "بکڕە و بەدەستی بهێنە",
  en: "Buy and earn",
};
const REWARD_SUB: Record<string, string> = {
  ar: "نقاط مكافآت تُستخدم في طلباتك القادمة",
  ku: "خاڵی پاداشت بەکاردەهێنرێت بۆ داواکارییە داهاتووەکان",
  en: "Reward points for your next orders",
};

function VendorOfferCard({
  vendor,
  product,
}: {
  vendor: { id: string; name: string; slug: string; logo_url: string | null; is_verified: boolean } | undefined;
  product: { brand: string; vendor_id?: string | null };
}) {
  const { t } = useI18n();
  if (!vendor) return null;
  return (
    <div className="px-4 py-3">
      <Link
        to="/vendor/$slug"
        params={{ slug: vendor.slug }}
        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 transition-colors active:bg-muted/70"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/60 bg-card text-muted-foreground shadow-sm">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <Store className="size-5" strokeWidth={2} />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-1 text-[13px] font-black">
              <span className="truncate">{vendor.name}</span>
              {vendor.is_verified && (
                <BadgeCheck
                  className="size-3.5 shrink-0 text-success"
                  strokeWidth={2.8}
                  aria-label={t("verified")}
                />
              )}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              <span className="truncate">{t("supplierOffer")}</span>
              <span className="size-1 shrink-0 rounded-full bg-border" />
              <span className="truncate text-info">{product.brand}</span>
            </span>
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground/50 rtl:rotate-90" />
      </Link>
    </div>
  );
}


function PricePanel({
  price,
  oldPrice,
  percent,
  dealChips,
  freeQty,
  lang,
  t,
}: {
  price: number;
  oldPrice: number | null;
  percent: number;
  dealChips: string[];
  freeQty: number;
  lang: Lang;
  t: (k: TKey) => string;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            {percent > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-black text-primary-foreground">
                {percent}%
              </span>
            )}
            {oldPrice && (
              <span className="text-xs font-bold text-muted-foreground line-through decoration-border">
                {formatPrice(oldPrice, lang)}
              </span>
            )}
          </div>
          <span className="text-[27px] font-black leading-none tracking-tight text-foreground">
            {formatPrice(price, lang)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {percent > 0 && oldPrice && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-primary">
              <TrendingUp className="size-3.5" strokeWidth={2.8} />
              {t("youSave")} {formatPrice(oldPrice - price, lang)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-success">
            <Check className="size-3.5" strokeWidth={3} />
            {t("availableNow")}
          </span>
        </div>
      </div>

      {dealChips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {dealChips.map((c) => (
            <span
              key={c}
              className="rounded-lg bg-muted/60 px-2 py-1 text-[11px] font-bold text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {freeQty > 0 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-[11.5px] font-extrabold text-success">
          <GiftIcon className="size-4 shrink-0" />
          {t("freeUnits").replace("{n}", String(freeQty))} · {t("savings")}: {formatPrice(price * freeQty, lang)}
        </p>
      )}
    </div>
  );
}


function GiftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M7 12v5a2 2 0 002 2h6a2 2 0 002-2v-5M19 8h1a1 1 0 001-1 3 3 0 00-3-3 3 3 0 00-2.4 1.2L12 8l-2.6-2.8A3 3 0 007 4a3 3 0 00-3 3 1 1 0 001 1h1" />
    </svg>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const { lang, t } = useI18n();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const { data: vendors } = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });

  // A shared item can be listed by several vendors: picking one swaps the whole
  // buy panel in place, with no navigation.
  const [pickedId, setPickedId] = useState<string | null>(null);
  useEffect(() => setPickedId(null), [id]);
  const product =
    (pickedId ? data?.products.find((p) => p.id === pickedId) : undefined) ??
    data?.products.find((p) => p.id === id);
  const vendor = product?.vendor_id
    ? (vendors ?? []).find((v) => v.id === product.vendor_id)
    : undefined;

  if (isLoading)
    return (
      <StoreLayout>
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </StoreLayout>
    );

  if (!product)
    return (
      <StoreLayout>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          <Button asChild className="mt-4">
            <Link to="/products">{t("products")}</Link>
          </Button>
        </div>
      </StoreLayout>
    );

  const deal = bestPromo(
    product,
    qty,
    data?.offers ?? [],
    data?.offerProducts ?? [],
    data?.flashDeals ?? [],
    data?.clearanceRules ?? [],
  );
  const base = deal.unitPrice;
  const tiers = tiersOf(product.id, data?.tiers ?? []);
  const price = tierUnitPrice(base, qty, tiers);
  const freeQty = deal.freeQty;
  const lineTotal = price * Math.max(0, qty - freeQty);
  const cartUnit = qty > 0 ? Math.round(lineTotal / qty) : price;
  const dealChips = deal.offer
    ? [
        offerHeadline(deal.offer, lang, t),
        ...offerRuleChips(deal.offer, lang, t, { brand: deal.offer.brand }),
      ]
    : deal.deal
      ? [dealHeadline(deal.deal, lang, t), ...dealRuleChips(deal.deal, lang, t)]
      : [];
  const oldPrice =
    price < product.price
      ? product.price
      : product.compare_price && product.compare_price > price
        ? Number(product.compare_price)
        : null;
  const percent = oldPrice ? Math.round((1 - price / Number(oldPrice)) * 100) : 0;

  const settings = data?.settings;
  const fee = Number(settings?.delivery_fee ?? 0);
  const freeOver = Number(settings?.free_delivery_over ?? 0);
  const wa = (settings?.whatsapp ?? "").replace(/[^\d]/g, "");
  const low = product.stock > 0 && product.stock <= 5;

  const sameItem = [product, ...siblingOffers(product, data?.products ?? [])]
    .map((p) => ({
      row: p,
      unit: effectivePrice(
        p,
        data?.offers ?? [],
        data?.offerProducts ?? [],
        1,
        data?.flashDeals ?? [],
        data?.clearanceRules ?? [],
      ),
      vendor: (vendors ?? []).find((v) => v.id === p.vendor_id),
    }))
    .sort((a, b) => a.unit - b.unit);

  const related = (data?.products ?? [])
    .filter((p) => p.id !== product.id && (p.brand === product.brand || p.category_id === product.category_id))
    .slice(0, 6);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pickName(product, lang), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      /* user dismissed */
    }
  };

  return (
    <StoreLayout>
      <PageBlocks page="product" />
      {/* Photo stage */}
      <div className="relative bg-gradient-to-b from-primary/8 to-background px-3 pt-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/70 bg-card">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={pickName(product, lang)}
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">🦷</div>
          )}
          {percent > 0 && <DiscountBlade percent={percent} label={t("saveMoney")} />}
          <button
            type="button"
            onClick={share}
            aria-label={t("shareProduct")}
            className="absolute bottom-2 start-2 grid size-9 place-items-center rounded-full border border-border/70 bg-card/90 text-foreground/80 backdrop-blur active:scale-95"
          >
            <Share2 className="size-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Unified product info container */}
      <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
        <RewardBanner price={price} row={product} />

        {/* Title + info chips */}
        <div className="px-4 pb-3 pt-3.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">
              {product.brand}
            </span>
            {product.sku && (
              <span className="truncate text-[11px] font-semibold text-muted-foreground">
                {product.sku}
              </span>
            )}
          </div>
          <h1 className="text-[17px] font-black leading-7">{pickName(product, lang)}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <InfoChip tone={product.stock > 0 ? (low ? "deal" : "success") : "muted"}>
              {product.stock > 0
                ? low
                  ? t("stockLeft").replace("{n}", String(product.stock))
                  : t("availableNow")
                : t("outOfStock")}
            </InfoChip>
          </div>
          {(product.badges?.length ?? 0) > 0 && (
            <div className="mt-2">
              <ProductBadges badges={product.badges} lang={lang} max={4} size="md" />
            </div>
          )}

        </div>

        {vendor && (
          <div className="border-y border-border/50">
            <VendorOfferCard vendor={vendor} product={product} />
          </div>
        )}

        <PricePanel
          price={price}
          oldPrice={oldPrice}
          percent={percent}
          dealChips={dealChips}
          freeQty={freeQty}
          lang={lang}
          t={t}
        />

        <div className="mt-1 grid grid-cols-2 gap-px bg-border/60">
          <TrustTile
            icon={ShieldCheck}
            tone="primary"
            title={t("pdpAuthentic")}
            sub={t("pdpAuthenticSub")}
          />
          <TrustTile icon={Truck} tone="info" title={t("pdpFastShip")} sub={t("pdpFastShipSub")} />
          <TrustTile
            icon={Layers}
            tone="success"
            title={t("pdpWholesale")}
            sub={t("pdpWholesaleSub")}
          />
          <TrustTile
            icon={MessageCircle}
            tone="violet"
            title={t("pdpSupport")}
            sub={t("pdpSupportSub")}
          />
        </div>
      </div>


      {sameItem.length > 1 && (
        <section className="mx-3 mt-3 rounded-2xl border border-border/70 bg-card p-3 shadow-card">
          <h2 className="text-[13.5px] font-extrabold">{t("vendorsOffering")}</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
            {t("vendorsOfferingHint")}
          </p>
          <ul className="mt-2.5 space-y-2">
            {sameItem.map((o, i) => {
              const current = o.row.id === product.id;
              const out = o.row.stock <= 0;
              return (
                <li key={o.row.id}>
                  <button
                    type="button"
                    onClick={() => setPickedId(o.row.id)}
                    aria-pressed={current}
                    className={`flex w-full items-center gap-2 rounded-xl border p-2 text-start transition-colors active:scale-[0.99] ${current ? "border-primary/40 bg-primary/5" : "border-border/60"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1 text-[12.5px] font-extrabold">
                        <span className="truncate">{o.vendor?.name ?? t("soldBy")}</span>
                        {o.vendor?.is_verified && (
                          <BadgeCheck className="size-3.5 shrink-0 text-primary" strokeWidth={2.6} />
                        )}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        {i === 0 && (
                          <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-success">
                            {t("bestPrice")}
                          </span>
                        )}
                        {current && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                            {t("thisVendor")}
                          </span>
                        )}
                        <span className={out ? "text-destructive" : "text-muted-foreground"}>
                          {out ? t("outOfStock") : `${t("stock")}: ${o.row.stock}`}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-black tabular-nums text-primary">
                      {formatPrice(o.unit, lang)}
                    </span>
                    {current ? (
                      <Check className="size-4 shrink-0 text-primary" strokeWidth={3} />
                    ) : (
                      <span className="size-4 shrink-0 rounded-full border-2 border-border" />
                    )}
                  </button>
                  {current && !out && (
                    <Button
                      size="sm"
                      className="mt-1.5 h-9 w-full text-[11.5px]"
                      onClick={() => {
                        cart.add(
                          {
                            id: o.row.id,
                            name_ar: o.row.name_ar,
                            name_ku: o.row.name_ku,
                            price: o.unit,
                            image_url: o.row.image_url,
                            vendor_id: o.row.vendor_id ?? null,
                          },
                          1,
                        );
                        toast.success(t("added"));
                      }}
                    >
                      <ShoppingCart className="size-3.5" strokeWidth={2.6} />
                      {t("addToCart")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="space-y-3 p-3">
        <TierTable tiers={tiers} basePrice={base} qty={qty} />

        {/* Description */}
        {pick(product.description_ar, product.description_ku, lang) && (
          <section className="rounded-2xl border border-border/70 bg-card p-3">
            <h2 className="mb-1.5 text-[13px] font-extrabold">{t("productDetails")}</h2>
            <p className="text-[13px] leading-6 text-muted-foreground">
              {pick(product.description_ar, product.description_ku, lang)}
            </p>
          </section>
        )}

        {/* Shipping & payment */}
        <section className="rounded-2xl border border-border/70 bg-card p-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold">
            <Truck className="size-4 text-primary" strokeWidth={2.5} />
            {t("shippingInfo")}
          </h2>
          <ul className="space-y-2 text-[12px]">
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("shipFee")}</span>
              <span className="font-extrabold">{formatPrice(fee, lang)}</span>
            </li>
            {freeOver > 0 && (
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("shipFreeOver")}</span>
                <span className="font-extrabold text-emerald-600">
                  {formatPrice(freeOver, lang)}
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <Banknote className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.4} />
              <span>
                <b className="font-extrabold">{t("shipCod")}</b>{" "}
                <span className="text-muted-foreground">— {t("shipCodSub")}</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Package className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.4} />
              <span className="text-muted-foreground">{t("shipPacked")}</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.4} />
              <span className="text-muted-foreground">{t("shipAllIraq")}</span>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="rounded-2xl border border-border/70 bg-card px-3 py-1">
          <h2 className="pt-2 text-[13px] font-extrabold">{t("pdpFaqTitle")}</h2>
          <Faq q={t("pdpFaq1Q")} a={t("pdpFaq1A")} />
          <Faq q={t("pdpFaq2Q")} a={t("pdpFaq2A")} />
          <Faq q={t("pdpFaq3Q")} a={t("pdpFaq3A")} />
        </section>

        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(pickName(product, lang))}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] font-extrabold text-emerald-700 active:scale-[0.99]"
          >
            <MessageCircle className="size-4" strokeWidth={2.5} />
            {t("askOnWhatsapp")}
          </a>
        )}
      </div>

      {related.length > 0 && (
        <section className="px-3 pb-3">
          <h2 className="mb-2 text-[14px] font-extrabold">{t("relatedProducts")}</h2>
          <div className="grid grid-cols-2 items-stretch gap-2.5">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                price={effectivePrice(
                  p,
                  data?.offers ?? [],
                  data?.offerProducts ?? [],
                  1,
                  data?.flashDeals ?? [],
                  data?.clearanceRules ?? [],
                )}
              />
            ))}
          </div>
        </section>
      )}

      <div className="px-3 pb-4">
        <BannerSlot slot="product_page" />
      </div>

      {/* Sticky buy dock */}
      <div className="dock-bar flex items-center gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus className="size-4" />
          </Button>
          <span className="w-7 text-center text-sm font-extrabold tabular-nums">{qty}</span>
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => q + 1)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <Button
          size="lg"
          className="min-w-0 flex-1"
          disabled={product.stock <= 0}
          onClick={() => {
            cart.add(
              {
                id: product.id,
                name_ar: product.name_ar,
                name_ku: product.name_ku,
                price: cartUnit,
                image_url: product.image_url,
                vendor_id: product.vendor_id ?? null,
              },
              qty,
            );
            toast.success(t("added"));
          }}
        >
          <ShoppingCart className="size-5 shrink-0" />
          <span className="truncate">
            {product.stock > 0 ? `${t("addToCart")} · ${formatPrice(lineTotal, lang)}` : t("outOfStock")}
          </span>
        </Button>
      </div>
      <PageBlocks page="product" position="bottom" />
    </StoreLayout>
  );
}
