import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketingIcon } from "@/lib/marketing-icons";
import { vendorCta, type StoreSettings } from "@/lib/store";

/** Home CTA inviting store owners to open a vendor account (text + icon admin-editable). */
export function VendorJoinCta({ settings }: { settings?: StoreSettings | null | undefined }) {
  const { lang } = useI18n();

  if (settings?.show_vendor_join_cta === false) return null;
  const cta = vendorCta(settings?.vendor_cta);
  const title = (lang === "ku" ? cta.title_ku : lang === "en" ? cta.title_en : cta.title_ar) || cta.title_ar;
  const sub = (lang === "ku" ? cta.sub_ku : lang === "en" ? cta.sub_en : cta.sub_ar) || cta.sub_ar;
  const Icon = marketingIcon(cta.icon || "store");
  const to = settings?.vendor_join_cta_link || "/vendor-signup";

  return (
    <div className="px-3 py-2">
      <Link to={to} className="dk-block flex items-center gap-2.5 p-3 active:scale-[0.99]">
        <span className="head-icon">
          <Icon className="size-4" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold">{title}</span>
          {sub.trim() ? (
            <span className="block text-[11.5px] text-muted-foreground">{sub}</span>
          ) : null}
        </span>
        <ArrowLeft className="size-4 text-primary ltr:rotate-180" />
      </Link>
    </div>
  );
}
