import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone, Store } from "lucide-react";
import { pick, useI18n, label } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";

const copy = {
  title: { ar: "تحتاج مساعدة في طلبك؟", ku: "پێویستت بە یارمەتییە بۆ داواکاریت؟", en: "Need help with your order?",},
  sub: {
    ar: "فريق الدعم يساعدك في اختيار المواد وأسعار الجملة للعيادات",
    ku: "تیمی پشتگیری یارمەتیت دەدات لە هەڵبژاردنی کەرەستە و نرخی کۆ بۆ نەخۆشخانەکان",
    en: "Our support team assists with material selection and wholesale prices for clinics.",
  },
  wa: { ar: "واتساب", ku: "واتسئاپ", en: "WhatsApp",},
  call: { ar: "اتصال", ku: "پەیوەندی", en: "Call",},
  vendorTitle: { ar: "هل أنت مورد أو موزع؟", ku: "دابینکەر یان بەشخشێنەری؟", en: "Are you a supplier or distributor?",},
  vendorSub: {
    ar: "افتح متجرك داخل دنتال ستور واعرض عروضك على آلاف الأطباء",
    ku: "فرۆشگای خۆت لە دەنتاڵ ستۆر بکەرەوە و ئۆفەرەکانت پیشانی هەزاران پزیشک بدە",
    en: "Open your store within Dental Store and showcase your offers to thousands of doctors.",
  },
  vendorCta: { ar: "تعرّف على الموردين", ku: "دابینکەران ببینە", en: "Meet the suppliers",},
};

/** Support + become-a-vendor call-to-action pair near the bottom of the feed. */
export function HelpCta() {
  const { lang } = useI18n();
  const { data } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const s = data?.settings;
  const wa = (s?.whatsapp || s?.contact_phone || "").replace(/[^\d+]/g, "");
  const phone = (s?.contact_phone || "").replace(/[^\d+]/g, "");

  return (
    <section className="mx-3 mt-3 space-y-2">
      <div className="dt-band p-3.5 text-primary-foreground">
        <p className="font-display text-[14px] font-extrabold">
          {label(copy.title, lang)}
        </p>
        <p className="mt-1 text-[11.5px] font-semibold leading-5 text-primary-foreground/85">
          {label(copy.sub, lang)}
        </p>
        <div className="mt-3 flex gap-2">
          {wa ? (
            <a
              href={`https://wa.me/${wa.replace(/^\+/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card px-3 py-2.5 text-[12px] font-extrabold text-primary active:scale-95"
            >
              <MessageCircle className="size-4" strokeWidth={2.6} />
              {label(copy.wa, lang)}
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-2.5 text-[12px] font-extrabold text-primary-foreground active:scale-95"
            >
              <Phone className="size-4" strokeWidth={2.6} />
              {label(copy.call, lang)}
            </a>
          ) : null}
        </div>
      </div>

      <Link
        to="/vendors"
        className="dt-tile flex items-center gap-3 p-3.5 active:scale-[0.99]"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent-foreground">
          <Store className="size-5" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold">
            {label(copy.vendorTitle, lang)}
          </span>
          <span className="mt-0.5 block text-[10.5px] font-semibold leading-4 text-muted-foreground">
            {label(copy.vendorSub, lang)}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary">
          {label(copy.vendorCta, lang)}
        </span>
      </Link>
    </section>
  );
}
