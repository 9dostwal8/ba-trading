import { PackageCheck, Search, ShoppingBag, Truck } from "lucide-react";
import { pick, useI18n, label } from "@/lib/i18n";

const copy = {
  title: { ar: "كيف تشتري من دنتال ستور؟", ku: "چۆن لە دەنتاڵ ستۆر بکڕم؟", en: "How to buy from Dental Store?",},
  sub: {
    ar: "أربع خطوات بسيطة من الاختيار حتى وصول الطلب لعيادتك",
    ku: "چوار هەنگاوی سادە لە هەڵبژاردنەوە تا گەیشتنی داواکاری بۆ نەخۆشخانەت",
    en: "Four simple steps from selection to receiving the order at your clinic.",
  },
  steps: [
    {
      icon: Search,
      ar: { t: "اختر المنتج", d: "ابحث بالماركة أو القسم أو امسح QR المورد" },
      ku: { t: "بەرهەم هەڵبژێرە", d: "بە براند، بەش یان سکانی QR ی فرۆشیار بگەڕێ" },
    },
    {
      icon: ShoppingBag,
      ar: { t: "أضف للسلة", d: "استفد من عروض الجملة والباقات والخصومات" },
      ku: { t: "بخە سەبەتە", d: "سوود لە ئۆفەری کۆ و پاکێج و داشکاندن ببینە" },
    },
    {
      icon: PackageCheck,
      ar: { t: "أكّد الطلب", d: "ادفع نقداً عند الاستلام أو بواسطة كي كارد" },
      ku: { t: "داواکاری پەسەند بکە", d: "بە کاش لە کاتی وەرگرتن یان بە Qi Card بدە" },
    },
    {
      icon: Truck,
      ar: { t: "استلم بسرعة", d: "توصيل لكل محافظات العراق مع تتبع الحالة" },
      ku: { t: "خێرا وەریبگرە", d: "گەیاندن بۆ هەموو پارێزگاکانی عێراق لەگەڵ بەدواداچوون" },
    },
  ],
};

/** Four-step "how it works" strip, mirroring the reference site's booking guide. */
export function HowItWorks() {
  const { lang } = useI18n();
  return (
    <section className="mx-3 mt-3">
      <h2 className="font-display text-[15px] font-extrabold tracking-tight">
        {label(copy.title, lang)}
      </h2>
      <p className="mt-0.5 text-[11.5px] font-semibold leading-5 text-muted-foreground">
        {label(copy.sub, lang)}
      </p>
      <ol className="mt-2.5 grid grid-cols-2 gap-2">
        {copy.steps.map((s, i) => {
          const c = lang === "ku" ? s.ku : s.ar;
          const Icon = s.icon;
          return (
            <li key={c.t} className="dt-tile relative p-2.5">
              <span className="absolute end-2 top-2 font-display text-[13px] font-extrabold text-primary/25">
                {i + 1}
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-[18px]" strokeWidth={2.5} />
              </span>
              <p className="mt-2 text-[12.5px] font-extrabold">{c.t}</p>
              <p className="mt-0.5 text-[10.5px] font-semibold leading-4 text-muted-foreground">
                {c.d}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
