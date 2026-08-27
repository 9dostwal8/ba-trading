import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  CalendarClock,
  PackageOpen,
  Boxes,
  Flame,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { useI18n, type Lang } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "العروض والخصومات | دنتال ستور" },
      {
        name: "description",
        content: "كل العروض في مكان واحد: صفقات سريعة، قرب الانتهاء، أوتلت، باقات وخصومات الكمية.",
      },
      { property: "og:title", content: "العروض والخصومات | دنتال ستور" },
      { property: "og:description", content: "عروض محدودة الوقت على مستلزمات طب الأسنان." },
    ],
  }),
  component: OffersPage,
});

const cardMeta = [
  {
    to: "/deals",
    icon: Zap,
    title: { ar: "صفقات سريعة", ku: "ڕێککەوتنی خێرا", en: "Flash Deals",},
    subtitle: { ar: "خصومات لمدة محدودة على منتجات مختارة", ku: "داشکاندنی سنووردار لە بەرهەمی هەڵبژێردراو", en: "Limited-time discounts on selected products",},
    cta: { ar: "اكتشف العروض", ku: "ئۆفەرەکان ببینە", en: "Discover Offers",},
    bg: "linear-gradient(135deg, #d93025 0%, #ea4335 55%, #f06b5c 100%)",
    soft: "oklch(0.96 0.05 25)",
  },
  {
    to: "/expiring",
    icon: CalendarClock,
    title: { ar: "قرب الانتهاء", ku: "نزیک بەسەرچوون", en: "Nearing Expiry",},
    subtitle: { ar: "منتجات بخصومات عالية قبل انتهاء الصلاحية", ku: "بەرهەم بە داشکاندی بەرز پێش کۆتایی هاتنی ماوە", en: "Heavily discounted products before expiry",},
    cta: { ar: "وفّر الآن", ku: "ئێستا پاشەکەوت بکە", en: "Save Now",},
    bg: "linear-gradient(135deg, #e67e22 0%, #f39c12 60%, #f5b041 100%)",
    soft: "oklch(0.96 0.05 70)",
  },
  {
    to: "/outlet",
    icon: PackageOpen,
    title: { ar: "أوتلت التصفية", ku: "ئاوتلەتی پاککردنەوە", en: "Clearance Outlet",},
    subtitle: { ar: "مخزون قديم بأسعار أقل للتصفية السريعة", ku: "کۆگای کۆن بە نرخی کەمتر بۆ پاککردنەوەی خێرا", en: "Older stock at reduced prices for quick clearance",},
    cta: { ar: "تسوق التصفية", ku: "کڕینی پاککردنەوە", en: "Shop Clearance",},
    bg: "linear-gradient(135deg, #8e44ad 0%, #9b59b6 55%, #bb8fce 100%)",
    soft: "oklch(0.96 0.04 300)",
  },
  {
    to: "/bundles",
    icon: Boxes,
    title: { ar: "الباقات المجمّعة", ku: "کۆمەڵە پاکێجەکان", en: "Bundles",},
    subtitle: { ar: "اشترِ مجموعة منتجات بسعر أقل", ku: "کۆمەڵە بەرهەم بە نرخی کەمتر بکڕە", en: "Buy a product set for less",},
    cta: { ar: "شاهد الباقات", ku: "پاکێجەکان ببینە", en: "View Bundles",},
    bg: "linear-gradient(135deg, #1a73e8 0%, #4285f4 55%, #7bacf7 100%)",
    soft: "oklch(0.96 0.04 200)",
  },
  {
    to: "/featured",
    icon: Flame,
    title: { ar: "الأكثر مبيعاً", ku: "زۆرترین فرۆشتن", en: "Bestsellers",},
    subtitle: { ar: "منتجات مختارة من الأكثر طلباً", ku: "بەرهەمی هەڵبژێردراو لە زۆرترین داواکراو", en: "Featured products from the most in-demand",},
    cta: { ar: "تصفح المميز", ku: "تایبەتەکان ببینە", en: "Browse Featured",},
    bg: "linear-gradient(135deg, #0f9d58 0%, #34a853 55%, #5dc77a 100%)",
    soft: "oklch(0.96 0.04 150)",
  },
  {
    to: "/brands",
    icon: Sparkles,
    title: { ar: "عروض الماركات", ku: "ئۆفەری براندەکان", en: "Brand Offers",},
    subtitle: { ar: "تخفيضات خاصة من أفضل ماركات الأسنان", ku: "داشکاندنی تایبەت لە باشترین برانده کانی ددان", en: "Special discounts from top dental brands",},
    cta: { ar: "تصفح الماركات", ku: "براندەکان ببینە", en: "Browse Brands",},
    bg: "linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #e57373 100%)",
    soft: "oklch(0.96 0.04 265)",
  },
] as const;

function BigOfferCard({
  meta,
  count,
  lang,
}: {
  meta: (typeof cardMeta)[number];
  count: number;
  lang: Lang;
}) {
  return (
    <Link
      to={meta.to}
      className="group relative isolate flex h-44 w-full items-center overflow-hidden rounded-2xl px-5 py-4 shadow-lift active:scale-[0.985]"
      style={{ background: meta.bg }}
    >
      {/* Decorative circle behind icon */}
      <div className="absolute -start-6 -top-6 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -end-8 size-40 rounded-full bg-white/10 blur-2xl" />

      {/* Icon */}
      <span
        className="relative z-10 grid size-16 shrink-0 place-items-center rounded-2xl bg-white/20 text-white shadow-lg backdrop-blur-sm"
      >
        <meta.icon className="size-8" strokeWidth={2.2} />
      </span>

      {/* Text content */}
      <div className="relative z-10 ms-4 flex-1 min-w-0">
        <h2 className="text-[18px] font-extrabold leading-7 text-white drop-shadow-sm">
          {meta.title[lang]}
        </h2>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-white/90">
          {meta.subtitle[lang]}
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
          {meta.cta[lang]}
          <ChevronLeft className="size-3.5 text-white/90 rtl:rotate-180" />
        </div>
      </div>

      {/* Count badge */}
      {count > 0 && (
        <div className="absolute top-3 end-3 z-10 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-sm">
          {count} {lang === "ar" ? "عنصر" : "بابەت"}
        </div>
      )}
    </Link>
  );
}

function OffersPage() {
  const { lang, t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
  const flashDeals = data?.flashDeals ?? [];
  const bundles = data?.bundles ?? [];
  const nearExpiry = products.filter((p) => p.clearance_kind === "expiry" || p.expiry_date);
  const outlet = products.filter((p) => p.clearance_kind === "outlet");

  const counts: Record<string, number> = {
    "/deals": flashDeals.length,
    "/expiring": nearExpiry.length,
    "/outlet": outlet.length,
    "/bundles": bundles.length,
    "/featured": 0,
    "/brands": (data?.brandCards ?? []).length,
  };

  return (
    <StoreLayout>
      <PageBlocks page="offers" />
      <div className="bg-gradient-deal px-4 py-5 text-deal-foreground">
        <h1 className="font-display text-[22px] font-extrabold">🔥 {t("dealsTitle")}</h1>
        <p className="mt-1 text-[13px] font-semibold opacity-85">{t("dealsSub")}</p>
      </div>

      <div className="flex flex-col gap-3 p-3 pb-28 lg:grid lg:grid-cols-2 lg:gap-4 lg:p-6 lg:pb-10">
        {isLoading && (
          <>
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </>
        )}
        {!isLoading &&
          cardMeta.map((m) => (
            <BigOfferCard key={m.to} meta={m} count={counts[m.to] ?? 0} lang={lang} />
          ))}
      </div>
      <PageBlocks page="offers" position="bottom" />
    </StoreLayout>
  );
}
