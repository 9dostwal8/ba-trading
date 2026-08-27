import { createFileRoute } from "@tanstack/react-router";
import { BadgePercent, Boxes, Layers, ListOrdered, Timer, Trophy } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/how-discounts")({
  head: () => ({
    meta: [
      { title: "شرح الخصومات والعروض | دنتال ستور" },
      {
        name: "description",
        content:
          "كيف تُحسب الخصومات في دنتال ستور: صفقة اليوم، العروض، خصم الكمية، الباقات وكود الخصم، وأي خصم يُطبّق أولاً.",
      },
      { property: "og:title", content: "شرح الخصومات والعروض | دنتال ستور" },
      {
        property: "og:description",
        content: "دليل بسيط لطريقة حساب السعر النهائي في المتجر.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowDiscounts,
});

const blocks = [
  {
    icon: Timer,
    ar: {
      title: "صفقة اليوم",
      body: "صفقة مرتبطة بمنتج واحد ولها وقت بداية ونهاية. يظهر السعر فقط بعد وقت البداية وينتهي تلقائياً عند انتهاء العد التنازلي. يمكن أن تشترط أقل كمية لفتح السعر، وأن يكون لها سقف خصم للقطعة، وحد أقصى للكمية في الطلب.",
    },
    ku: {
      title: "ماملەی ئەمڕۆ",
      body: "ماملەیەک بۆ یەک بەرهەم لەگەڵ کاتی دەستپێک و کۆتایی. نرخ تەنها دوای کاتی دەستپێک دەردەکەوێت و بە تەواوبوونی ژماردن ڕادەوەستێت. دەتوانێت کەمترین بڕ، سنووری داشکاندن بۆ دانە و زۆرترین بڕ بۆ داواکاری هەبێت.",
    },
  },
  {
    icon: BadgePercent,
    ar: {
      title: "أنواع الخصم",
      body: "نسبة % من السعر، أو مبلغ ثابت يُخصم من السعر، أو سعر ثابت للقطعة، أو اشترِ X واحصل Y مجاناً (في العروض فقط). سقف الخصم يحدد أقصى مبلغ يُخصم من القطعة الواحدة.",
    },
    ku: {
      title: "جۆرەکانی داشکاندن",
      body: "ڕێژەی % لە نرخ، یان بڕی جێگیر کە کەم دەکرێت، یان نرخی جێگیر بۆ دانە، یان X بکڕە Y خۆڕایی وەرگرە (تەنها لە ئۆفەرەکان). سنووری داشکاندن زۆرترین بڕی کەمکردن بۆ یەک دانە دیاری دەکات.",
    },
  },
  {
    icon: Layers,
    ar: {
      title: "نطاق العرض",
      body: "العرض يمكن أن يستهدف منتجات محددة، أو قسماً كاملاً، أو ماركة كاملة، أو كل المتجر. صفقة اليوم تستهدف منتجاً واحداً فقط.",
    },
    ku: {
      title: "مەودای ئۆفەر",
      body: "ئۆفەر دەتوانێت بەرهەمی دیاریکراو، بەشێکی تەواو، براندێکی تەواو یان هەموو فرۆشگا بگرێتەوە. ماملەی ئەمڕۆ تەنها یەک بەرهەم دەگرێتەوە.",
    },
  },
  {
    icon: Trophy,
    ar: {
      title: "أي خصم يُطبّق؟",
      body: "الخصومات لا تُجمع. يُحسب سعر كل عرض مؤهل وصفقة اليوم، ويُطبّق الأرخص للكمية المطلوبة. عند تساوي السعر تفوز الأولوية الأعلى، وصفقة اليوم تفوز عند التعادل الكامل.",
    },
    ku: {
      title: "کام داشکاندن جێبەجێ دەبێت؟",
      body: "داشکاندنەکان کۆ نابنەوە. نرخی هەموو ئۆفەرێکی گونجاو و ماملەی ئەمڕۆ دەژمێردرێت و هەرزانترین جێبەجێ دەبێت. لە یەکسانی نرخ، پێشەنگی بەرزتر دەباتەوە و ماملەی ئەمڕۆ لە یەکسانی تەواو دەباتەوە.",
    },
  },
  {
    icon: ListOrdered,
    ar: {
      title: "خصم الكمية (الجملة)",
      body: "شرائح الكمية تُطبّق بعد الخصم: إذا كانت شريحة الجملة أرخص من سعر العرض للكمية نفسها، يُستخدم سعر الشريحة.",
    },
    ku: {
      title: "داشکاندنی بڕ (کۆ)",
      body: "پلەکانی بڕ دوای داشکاندن جێبەجێ دەبن: ئەگەر پلەی کۆ لە نرخی ئۆفەر بۆ هەمان بڕ هەرزانتر بوو، نرخی پلە بەکار دەهێنرێت.",
    },
  },
  {
    icon: Boxes,
    ar: {
      title: "الباقات وكود الخصم",
      body: "الباقة سعر واحد لمجموعة منتجات ولا تتأثر بالعروض. كود الخصم يُطبّق في نهاية السلة على المجموع بعد كل الخصومات السابقة.",
    },
    ku: {
      title: "پاکێج و کۆدی داشکاندن",
      body: "پاکێج یەک نرخە بۆ کۆمەڵە بەرهەم و کاریگەری ئۆفەر لەسەری نییە. کۆدی داشکاندن لە کۆتایی سەبەتە لەسەر کۆی گشتی دوای هەموو داشکاندنەکان جێبەجێ دەبێت.",
    },
  },
];

function HowDiscounts() {
  const { t, lang } = useI18n();
  return (
    <StoreLayout>
      <PageBlocks page="how-discounts" />
      <div className="space-y-3 px-3 py-4">
        <header className="rounded-2xl bg-gradient-hero p-4 text-primary-foreground shadow-pop">
          <h1 className="font-display text-[19px] font-extrabold leading-tight">
            {t("howDiscountsTitle")}
          </h1>
          <p className="mt-1 text-[12px] opacity-90">{t("howDiscountsSub")}</p>
        </header>

        {blocks.map((b) => {
          const copy = lang === "ar" ? b.ar : b.ku;
          return (
            <section
              key={copy.title}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <b.icon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[14px] font-extrabold">{copy.title}</h2>
                <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{copy.body}</p>
              </div>
            </section>
          );
        })}

        <p className="rounded-xl bg-secondary p-3 text-[12px] font-bold text-secondary-foreground">
          {t("onlyOneOfferApplies")}
        </p>
      </div>
      <PageBlocks page="how-discounts" position="bottom" />
    </StoreLayout>
  );
}
