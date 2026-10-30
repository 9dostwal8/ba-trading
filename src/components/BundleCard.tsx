import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { formatPrice, pick, useI18n } from "@/lib/i18n";
import { fetchStoreData, type Bundle, type Product } from "@/lib/store";

/**
 * Calculates dynamic rotation, translation and z-index Tailwind classes
 * for a hand-of-cards fanned display from the bottom origin.
 */
function getFanCardClass(index: number, total: number): string {
  if (total <= 1) {
    return "rotate-0 translate-x-0 z-10";
  }
  if (total === 2) {
    return index === 0
      ? "-rotate-6 -translate-x-6 z-10"
      : "rotate-6 translate-x-6 z-20";
  }
  if (total === 3) {
    if (index === 0) return "-rotate-12 -translate-x-10 z-10";
    if (index === 1) return "rotate-0 translate-x-0 z-20";
    return "rotate-12 translate-x-10 z-10";
  }
  if (total === 4) {
    if (index === 0) return "-rotate-12 -translate-x-12 z-10";
    if (index === 1) return "-rotate-6 -translate-x-4 z-20";
    if (index === 2) return "rotate-6 translate-x-4 z-20";
    return "rotate-12 translate-x-12 z-10";
  }
  // total === 5
  if (index === 0) return "-rotate-12 -translate-x-16 z-10";
  if (index === 1) return "-rotate-6 -translate-x-8 z-20";
  if (index === 2) return "rotate-0 translate-x-0 z-30";
  if (index === 3) return "rotate-6 translate-x-8 z-20";
  return "rotate-12 translate-x-16 z-10";
}

export function BundleCard({
  bundle,
  products,
  className = "",
}: {
  bundle: Bundle;
  products?: Product[];
  className?: string;
}) {
  const { lang } = useI18n();

  const { data } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
    enabled: !products,
  });

  const allProducts = products ?? data?.products ?? [];

  const bundleProducts = (bundle.product_ids ?? [])
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const productImages = bundleProducts
    .map((p) => p.image_url)
    .filter((url): url is string => Boolean(url && url.trim().length > 0));

  const displayImages = (
    productImages.length > 0
      ? productImages
      : bundle.image_url
        ? [bundle.image_url]
        : []
  ).slice(0, 5);

  return (
    <Link
      to="/bundle/$id"
      params={{ id: bundle.id }}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-amber-400/50 hover:shadow-xl hover:-translate-y-1 ${className}`}
    >
      <div className="relative mb-3 flex h-52 w-full items-center justify-center rounded-2xl bg-amber-50/50 p-3 overflow-hidden">
        <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10.5px] font-black text-white shadow-sm z-30">
          {lang === "ar" ? "باقة خاصة" : lang === "ku" ? "پاکێجی تایبەت" : "Special Bundle"}
        </span>
        {displayImages.length > 0 ? (
          <div className="relative flex justify-center items-end h-44 w-full">
            {displayImages.map((img, idx) => (
              <div
                key={idx}
                className={`w-24 h-32 sm:w-28 sm:h-36 bg-white rounded-xl shadow-md border border-gray-200/90 p-1.5 flex items-center justify-center shrink-0 origin-bottom transition-all duration-300 -mx-4 sm:-mx-5 ${getFanCardClass(idx, displayImages.length)}`}
              >
                <img
                  src={img}
                  alt=""
                  className="h-full w-full object-contain pointer-events-none"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-600 shadow-inner">
            <Package className="size-11 stroke-[1.8]" />
          </div>
        )}
      </div>

      <h4 className="line-clamp-2 min-h-[38px] text-[13.5px] font-black text-slate-800 group-hover:text-primary transition-colors">
        {pick(bundle.title_ar, bundle.title_ku, lang)}
      </h4>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
        <span className="text-[11px] font-bold text-slate-400">
          {lang === "ar" ? "سعر الباقة" : lang === "ku" ? "نرخی پاکێج" : "Price"}
        </span>
        <span className="text-[14px] font-black text-slate-900">
          {formatPrice(bundle.price, lang)}
        </span>
      </div>
    </Link>
  );
}

