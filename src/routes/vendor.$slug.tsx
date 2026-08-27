import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Boxes, Copy, MapPin, Store, Tag } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { HomeBlock, Rail } from "@/components/home/HomeBlock";
import { BundleRail } from "@/components/home/BundleRail";
import { DealOfDay } from "@/components/home/DealOfDay";
import { OfferCard } from "@/components/OfferCard";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { tintStyle } from "@/lib/category-icons";
import { pick, useI18n } from "@/lib/i18n";
import { effectivePrice } from "@/lib/store";
import {
  fetchVendor,
  fetchVendorCatalog,
  fetchVendorOrderCounts,
  vendorQrValue,
} from "@/lib/vendor-public";

export const Route = createFileRoute("/vendor/$slug")({
  head: () => ({
    meta: [
      { title: "صفحة المورد | دنتال ستور" },
      { name: "description", content: "منتجات وعروض المورد مع رمز QR خاص للوصول السريع." },
      { property: "og:title", content: "صفحة المورد | دنتال ستور" },
      { property: "og:description", content: "تصفح منتجات وعروض هذا المورد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorProfilePage,
});

function VendorProfilePage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", slug],
    queryFn: () => fetchVendor(slug),
  });

  const { data: catalog } = useQuery({
    queryKey: ["vendor-catalog", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: () => fetchVendorCatalog(vendor!.id),
  });

  const { data: orderCounts } = useQuery({
    queryKey: ["vendor-order-counts"],
    queryFn: fetchVendorOrderCounts,
  });

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="space-y-3 p-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </StoreLayout>
    );
  }

  if (!vendor) {
    return (
      <StoreLayout>
        <div className="grid min-h-[50vh] place-items-center p-6 text-center">
          <div>
            <p className="text-sm font-extrabold">{t("vendorNotFound")}</p>
            <Link to="/vendors" className="mt-3 inline-block text-[12px] font-bold text-primary">
              {t("vendorsTitle")}
            </Link>
          </div>
        </div>
      </StoreLayout>
    );
  }

  const tagline = pick(vendor.tagline_ar, vendor.tagline_ku, lang);
  const about = pick(vendor.about_ar, vendor.about_ku, lang);
  const products = catalog?.products ?? [];
  const priceOf = (id: string, price: number, qty = 1) => {
    const p = products.find((x) => x.id === id);
    if (!p) return price;
    return effectivePrice(p, catalog?.offers ?? [], [], qty, catalog?.flashDeals ?? []);
  };

  return (
    <StoreLayout>
      <PageBlocks page="vendor" />
      <div className="pb-10" style={tintStyle(vendor.hue, vendor.chroma)}>
        <section className="px-3 pt-3">
          <div className="dk-block p-3">
            <VendorHeader vendor={vendor} />

            <div className="mt-3">
              <Stat label={t("vendorOrders")} value={orderCounts?.[vendor.id] ?? 0} />
            </div>

            {/* Vendor phone numbers are private — never shown on the public store page. */}
          </div>
        </section>

        <div className="px-3 py-2">
          <BannerSlot slot="home_mid" />
        </div>

        {about && (
          <HomeBlock title={t("aboutVendor")} icon={Store}>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{about}</p>
          </HomeBlock>
        )}

        {(catalog?.flashDeals ?? []).length > 0 && (
          <HomeBlock title={t("flashDeals")} icon={Tag}>
            <DealOfDay deals={catalog!.flashDeals} products={products} priceOf={priceOf} />
          </HomeBlock>
        )}

        {(catalog?.offers ?? []).length > 0 && (
          <HomeBlock title={t("vendorOffersTitle")} icon={Tag}>
            <Rail>
              {catalog!.offers.map((o) => (
                <div key={o.id} className="w-[76%] shrink-0 snap-start">
                  <OfferCard offer={o} products={products} />
                </div>
              ))}
            </Rail>
          </HomeBlock>
        )}

        {(catalog?.bundles ?? []).length > 0 && (
          <HomeBlock title={t("bundles")} icon={Boxes}>
            <BundleRail bundles={catalog!.bundles} products={products} />
          </HomeBlock>
        )}

        <HomeBlock title={t("vendorItems")} icon={Store}>
          {products.length ? (
            <div className="grid grid-cols-2 items-stretch gap-2">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-muted-foreground">{t("noResults")}</p>
          )}
        </HomeBlock>
      </div>
      <PageBlocks page="vendor" position="bottom" />
    </StoreLayout>
  );
}

function VendorHeader({ vendor }: { vendor: NonNullable<ReturnType<typeof fetchVendor> extends Promise<infer R> ? R : never> }) {
  const { t, lang } = useI18n();
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const tagline = pick(vendor.tagline_ar, vendor.tagline_ku, lang);
  const value = vendorQrValue(vendor);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1220", light: "#ffffff" },
    })
      .then((url) => alive && setQrSrc(url))
      .catch(() => alive && setQrSrc(null));
    return () => {
      alive = false;
    };
  }, [value]);

  function downloadQr() {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `${vendor.code}-qr.png`;
    a.click();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(vendor.code);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyCode"));
    }
  }

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={downloadQr}
        className="group relative shrink-0 overflow-hidden rounded-lg border border-border/70 bg-white p-1.5 transition active:scale-95"
        aria-label={t("downloadQr")}
        title={t("downloadQr")}
      >
        {qrSrc ? (
          <img src={qrSrc} alt={`${vendor.name} QR`} className="size-[72px] rounded-lg bg-white" />
        ) : (
          <div className="size-[72px] animate-pulse rounded-lg bg-muted" />
        )}
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-[10px] font-extrabold text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          {t("downloadQr")}
        </span>
      </button>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="truncate font-display text-[20px] font-extrabold leading-tight text-foreground">
            {vendor.name}
          </h1>
          {vendor.is_verified && (
            <BadgeCheck
              className="size-5 shrink-0 text-primary"
              strokeWidth={2.6}
              aria-label={t("verified")}
            />
          )}
        </div>

        <button
          type="button"
          onClick={copyCode}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[12px] font-bold text-muted-foreground transition hover:bg-muted/80 active:scale-[0.98]"
          dir="ltr"
        >
          <Copy className="size-3.5" />
          <span className="font-mono tracking-widest">{vendor.code}</span>
        </button>

        {tagline && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{tagline}</p>
        )}

        {vendor.city && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <MapPin className="size-3 text-primary" />
            {vendor.city}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/50 px-2.5 py-2">
      <p className="text-[15px] font-extrabold text-foreground">{value}</p>
      <p className="truncate text-[10px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}
