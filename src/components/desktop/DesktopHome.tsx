import { Link } from "@tanstack/react-router";
import {
  Boxes,
  CalendarClock,
  ChevronLeft,
  Flame,
  PackageOpen,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AdCard, type AdCardData } from "@/components/banners/AdCard";
import { ProductCard } from "@/components/ProductCard";
import { brandLogo, type BrandCard } from "@/lib/brands";
import { monthsLeft } from "@/lib/clearance";
import { formatPrice, pick, pickName, useI18n, type Lang } from "@/lib/i18n";
import { sectionVars } from "@/lib/theme";
import type { Bundle, Category, FlashDeal, HomeSection, Product } from "@/lib/store";

type Data = {
  products: Product[];
  categories: Category[];
  banners: AdCardData[];
  brandCards: BrandCard[];
  flashDeals: FlashDeal[];
  bundles: Bundle[];
  homeSections: HomeSection[];
};

/** Desktop-only home template: aisle sidebar + wide editorial grid. */
export function DesktopHome({
  data,
  priceOf,
}: {
  data: Data;
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { lang } = useI18n();
  const byId = (id?: string | null) => data.products.find((p) => p.id === id);

  const dealProducts = data.flashDeals
    .map((d) => byId(d.product_id))
    .filter((p): p is Product => !!p)
    .slice(0, 8);

  const expiring = data.products
    .filter((p) => p.clearance_kind === "near_expiry" && p.expiry_date)
    .sort((a, b) => (monthsLeft(a.expiry_date) ?? 99) - (monthsLeft(b.expiry_date) ?? 99))
    .slice(0, 6);

  const outlet = data.products.filter((p) => p.clearance_kind === "outlet").slice(0, 8);
  const featured = data.products.filter((p) => p.is_featured).slice(0, 8);
  const newest = data.products.slice(0, 8);
  const heroBanner = data.banners[0];
  const sideBanners = data.banners.slice(1, 3);
  const sectionStyle = (kind: HomeSection["kind"]) => {
    const section = data.homeSections.find((item) => item.kind === kind && item.is_active);
    return section ? sectionVars(section.hue, section.chroma) : undefined;
  };

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-[248px_minmax(0,1fr)] gap-6">
        {/* ---------- Aisle sidebar ---------- */}
        <aside className="sticky top-[76px] self-start">
          <nav className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <p className="border-b border-border/60 px-4 py-3 font-display text-[13px] font-extrabold text-muted-foreground">
              {pick("أقسام المتجر", "بەشەکانی فرۆشگا", lang)}
            </p>
            <ul className="max-h-[420px] overflow-y-auto py-1">
              {data.categories.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/products"
                    search={{ cat: c.id } as never}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-bold text-foreground/85 transition-colors hover:bg-muted hover:text-primary"
                  >
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={pick(c.name_ar, c.name_ku, lang)}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = "grid";
                          }
                        }}
                        className="size-8 shrink-0 rounded-lg object-contain"
                      />
                    ) : null}
                    <span
                      style={{ display: c.image_url ? "none" : "grid" }}
                      className="size-8 shrink-0 place-items-center rounded-lg bg-muted text-[13px]"
                    >
                      🦷
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {pick(c.name_ar, c.name_ku, lang)}
                    </span>
                    <ChevronLeft className="size-4 shrink-0 opacity-40 ltr:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-4 grid gap-2">
            <SideLink to="/deals" icon={Zap} label={pick("صفقات سريعة", "ڕێککەوتنی خێرا", lang)} />
            <SideLink
              to="/expiring"
              icon={CalendarClock}
              label={pick("قرب الانتهاء", "نزیک بەسەرچوون", lang)}
            />
            <SideLink
              to="/outlet"
              icon={PackageOpen}
              label={pick("أوتلت التصفية", "ئاوتلێت", lang)}
            />
            <SideLink to="/bundles" icon={Boxes} label={pick("الباقات", "پاکێجەکان", lang)} />
            <SideLink to="/brands" icon={Sparkles} label={pick("الماركات", "براندەکان", lang)} />
          </div>
        </aside>

        {/* ---------- Wide content ---------- */}
        <div className="min-w-0 space-y-6">
          {/* Hero mosaic */}
          {heroBanner ? (
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
              <AdCard ad={heroBanner} className="h-full" />
              <div className="grid gap-4">
                {sideBanners.length ? (
                  sideBanners.map((b) => <AdCard key={b.id} ad={b} />)
                ) : (
                  <PitchTile lang={lang} />
                )}
              </div>
            </div>
          ) : null}

          {/* Flash deals */}
          {dealProducts.length ? (
            <div style={sectionStyle("hero")}>
              <Panel
                icon={Zap}
                title={pick("صفقات سريعة", "ڕێککەوتنی خێرا", lang)}
                seeAll="/deals"
              >
                <div className="grid grid-cols-4 gap-3">
                  {dealProducts.map((p, index) => (
                    <ProductCard key={`${p.id}-${index}`} product={p} price={priceOf(p.id, p.price)} />
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}

          {/* Split: expiring list + outlet grid */}
          <div className="grid grid-cols-2 gap-6">
            {expiring.length ? (
              <div style={sectionStyle("expiring")}>
                <Panel
                icon={CalendarClock}
                title={pick("ينتهي قريباً", "بەم زووە کۆتایی دێت", lang)}
                seeAll="/expiring"
              >
                <ul className="divide-y divide-border/60">
                  {expiring.map((p) => {
                    const price = priceOf(p.id, p.price);
                    const m = monthsLeft(p.expiry_date);
                    return (
                      <li key={p.id}>
                        <Link
                          to="/product/$id"
                          params={{ id: p.id }}
                          className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/50"
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={pickName(p, lang)}
                              loading="lazy"
                              className="size-14 shrink-0 rounded-xl border border-border/60 object-contain p-1"
                            />
                          ) : (
                            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted">
                              🦷
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold">{pickName(p, lang)}</p>
                            {m != null ? (
                              <p className="mt-0.5 text-[11.5px] font-extrabold text-clearance">
                                {m} {pick("شهر متبقي", "مانگ ماوە", lang)}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-end">
                            <p className="text-[13px] font-extrabold">{formatPrice(price, lang)}</p>
                            {price < p.price ? (
                              <p className="text-[11px] font-bold text-muted-foreground line-through">
                                {formatPrice(p.price, lang)}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                </Panel>
              </div>
            ) : null}

            {outlet.length ? (
              <div style={sectionStyle("outlet")}>
                <Panel
                  icon={PackageOpen}
                  title={pick("أوتلت التصفية", "ئاوتلێتی پاککردنەوە", lang)}
                  seeAll="/outlet"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {outlet.slice(0, 4).map((p) => (
                      <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
                    ))}
                  </div>
                </Panel>
              </div>
            ) : null}
          </div>

          {/* Bundles as wide rows */}
          {data.bundles.length ? (
            <div style={sectionStyle("bundles")}>
              <Panel icon={Boxes} title={pick("باقات موفرة", "پاکێجی پاشەکەوت", lang)} seeAll="/bundles">
              <div className="grid grid-cols-3 gap-3">
                {data.bundles.slice(0, 3).map((b) => (
                  <Link
                    key={b.id}
                    to="/bundle/$id"
                    params={{ id: b.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/60"
                  >
                    {b.image_url ? (
                      <img
                        src={b.image_url}
                        alt={pick(b.title_ar, b.title_ku, lang)}
                        loading="lazy"
                        className="size-16 shrink-0 rounded-xl bg-card object-contain p-1"
                      />
                    ) : (
                      <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-card text-2xl">
                        📦
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold">
                        {pick(b.title_ar, b.title_ku, lang)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-bold text-muted-foreground">
                        {b.product_ids.length} {pick("منتجات", "بەرهەم", lang)}
                      </p>
                      <p className="mt-1 text-[13px] font-extrabold text-primary">
                        {formatPrice(b.price, lang)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              </Panel>
            </div>
          ) : null}

          {/* Brands strip */}
          {data.brandCards.length ? (
            <div style={sectionStyle("brands")}>
              <Panel icon={Sparkles} title={pick("أفضل الماركات", "باشترین براندەکان", lang)} seeAll="/brands">
              <div className="grid grid-cols-6 gap-3">
                {data.brandCards.slice(0, 12).map((b) => {
                  const logo = brandLogo(b, 200);
                  return (
                    <Link
                      key={b.id}
                      to="/products"
                      search={{ q: b.match_key || b.name } as never}
                      className="grid h-20 place-items-center rounded-2xl border border-border/60 bg-card px-3 transition-colors hover:border-primary/40"
                    >
                      {logo ? (
                        <img src={logo} alt={b.name} loading="lazy" className="max-h-10 w-full object-contain" />
                      ) : (
                        <span className="font-display text-[13px] font-extrabold">{b.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
              </Panel>
            </div>
          ) : null}

          {/* Featured, newest, or full catalog */}
          {(() => {
            const list = featured.length ? featured : newest.length ? newest : data.products;
            if (!list.length) return null;
            return (
              <div style={sectionStyle("featured")}>
                <Panel
                  icon={Flame}
                  title={
                    featured.length
                      ? pick("الأكثر مبيعاً", "زۆرترین فرۆشتن", lang)
                      : newest.length
                        ? pick("وصل حديثاً", "نوێ گەیشتووە", lang)
                        : pick("جميع المنتجات", "هەموو بەرهەمەکان", lang)
                  }
                  seeAll="/products"
                >
                  <div className="grid grid-cols-4 gap-3 xl:grid-cols-5">
                    {list.slice(0, 15).map((p) => (
                      <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
                    ))}
                  </div>
                </Panel>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function SideLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-[13px] font-extrabold transition-colors hover:border-primary/40 hover:text-primary"
    >
      <Icon className="size-[18px] shrink-0 text-primary" strokeWidth={2.3} />
      {label}
    </Link>
  );
}

function Panel({
  icon: Icon,
  title,
  seeAll,
  children,
}: {
  icon: LucideIcon;
  title: string;
  seeAll?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Icon className="size-[19px] shrink-0 text-primary" strokeWidth={2.4} />
        <h2 className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold tracking-tight">
          {title}
        </h2>
        {seeAll ? (
          <Link
            to={seeAll}
            className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-extrabold text-primary hover:opacity-80"
          >
            {t("viewAll")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function PitchTile({ lang }: { lang: Lang }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl bg-gradient-hero p-6 text-center text-primary-foreground">
      <div>
        <p className="font-display text-[20px] font-extrabold">
          {pick("أسعار الجملة لعيادتك", "نرخی کۆ بۆ نەخۆشخانەکەت", lang)}
        </p>
        <p className="mt-2 text-[13px] font-bold opacity-90">
          {pick(
            "مخزون قريب الانتهاء وأوتلت بأسعار أقل — توصيل لكل العراق",
            "کۆگای نزیک بەسەرچوون و ئاوتلێت بە نرخی کەمتر — گەیاندن بۆ هەموو عێراق",
            lang,
          )}
        </p>
      </div>
    </div>
  );
}
