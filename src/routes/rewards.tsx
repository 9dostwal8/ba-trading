import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarCheck,
  Coins,
  Flame,
  Gift,
  HandCoins,
  MessageSquareHeart,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { formatPrice, useI18n, type Lang } from "@/lib/i18n";
import {
  COIN_WORD,
  coinsToMoney,
  ruleLabel,
  ruleMap,
  useRewardRules,
  useRewardSettings,
} from "@/lib/rewards";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "نقاط المكافأة | مكافآت لعيادات الأسنان" },
      {
        name: "description",
        content:
          "اجمع نقاط المكافأة مع كل طلب مستلزمات أسنان: مكافأة أول طلب، تحدي شهري، تقييمات، دعوة زملاء، واستبدل النقاط خصماً فورياً.",
      },
      { property: "og:title", content: "نقاط المكافأة لعيادات الأسنان" },
      {
        property: "og:description",
        content: "اجمع النقاط مع كل طلب واستبدلها خصماً فورياً على مستلزمات عيادتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RewardsMarketing,
});

const T = {
  hero: {
    ar: "كل دينار تشتريه يرجع لك نقاط",
    ku: "هەموو دینارێک دەیکڕیت وەک خاڵ دەگەڕێتەوە",
    en: "Every dinar you spend comes back as points",
  },
  heroSub: {
    ar: "برنامج مكافآت مجاني لعيادات الأسنان في العراق: اجمع النقاط من مشترياتك وتفاعلك، واستبدلها خصماً على طلبك القادم.",
    ku: "پرۆگرامی خەڵاتی بێ بەرامبەر بۆ کلینیکەکانی ددان لە عێراق: خاڵ کۆبکەرەوە و بکەیە داشکاندن بۆ داواکاری داهاتوو.",
    en: "A free rewards program for dental clinics in Iraq: collect points from orders and activity, then spend them as a discount.",
  },
  join: { ar: "أنشئ حساب العيادة", ku: "هەژماری کلینیک دروست بکە", en: "Create clinic account" },
  shop: { ar: "تسوّق الآن", ku: "ئێستا بکڕە", en: "Start shopping" },
  valueTitle: { ar: "قيمة النقاط بالدينار", ku: "بەهای خاڵ بە دینار", en: "What points are worth" },
  valueNote: {
    ar: "النقاط تُخصم مباشرة من إجمالي الطلب عند الدفع.",
    ku: "خاڵەکان ڕاستەوخۆ لە کۆی داواکاری کەم دەکرێن.",
    en: "Points are deducted straight from your order total at checkout.",
  },
  stepsTitle: { ar: "كيف يعمل؟", ku: "چۆن کار دەکات؟", en: "How it works" },
  earnTitle: { ar: "طرق جمع النقاط", ku: "ڕێگاکانی کۆکردنەوەی خاڵ", en: "Ways to earn" },
  rulesTitle: { ar: "قيمة كل خطوة", ku: "بەهای هەر هەنگاوێک", en: "Point values" },
  faqTitle: { ar: "أسئلة سريعة", ku: "پرسیاری خێرا", en: "Quick answers" },
  ctaTitle: {
    ar: "ابدأ بجمع النقاط من طلبك الأول",
    ku: "لە یەکەم داواکاریتەوە دەست بکە بە کۆکردنەوەی خاڵ",
    en: "Start earning from your first order",
  },
  ctaSub: {
    ar: "التسجيل يستغرق دقيقة واحدة، ومكافأة أول طلب تُضاف تلقائياً.",
    ku: "تۆمارکردن یەک خولەک دەخایەنێت و خەڵاتی یەکەم داواکاری ئۆتۆماتیک زیاد دەکرێت.",
    en: "Signing up takes a minute and the first-order bonus is automatic.",
  },
  points: { ar: "نقطة", ku: "خاڵ", en: "points" },
};

const STEPS: { icon: LucideIcon; title: Record<Lang, string>; body: Record<Lang, string> }[] = [
  {
    icon: ShoppingBag,
    title: { ar: "اشترِ مستلزماتك", ku: "پێداویستی بکڕە", en: "Order supplies" },
    body: {
      ar: "كل طلب مدفوع يمنحك نقاط تلقائياً حسب قيمة الطلب.",
      ku: "هەر داواکاری پارەدراو ئۆتۆماتیک خاڵ دەداتێ.",
      en: "Every paid order automatically credits points by its value.",
    },
  },
  {
    icon: Coins,
    title: { ar: "اجمع النقاط", ku: "خاڵ کۆبکەرەوە", en: "Collect points" },
    body: {
      ar: "نقاط إضافية من التقييمات، الدعوات، والتحديات الشهرية.",
      ku: "خاڵی زیادە لە هەڵسەنگاندن، بانگهێشت و ئامانجی مانگانە.",
      en: "Extra points from reviews, invites and monthly challenges.",
    },
  },
  {
    icon: Wallet,
    title: { ar: "استبدلها خصماً", ku: "بکەیە داشکاندن", en: "Redeem as discount" },
    body: {
      ar: "بضغطة واحدة في السلة تتحول نقاطك إلى خصم فوري.",
      ku: "بە کلیکێک لە سەبەتە خاڵەکانت دەبنە داشکاندنی خێرا.",
      en: "One tap in the cart turns points into an instant discount.",
    },
  },
];

const EARN: { icon: LucideIcon; title: Record<Lang, string>; body: Record<Lang, string> }[] = [
  {
    icon: HandCoins,
    title: { ar: "نقاط من كل شراء", ku: "خاڵ لە هەر کڕینێک", en: "Points on purchases" },
    body: {
      ar: "تُحسب على كل 1000 دينار من قيمة الطلب.",
      ku: "بۆ هەموو ١٠٠٠ دیناری داواکاری حیساب دەکرێت.",
      en: "Credited for every 1,000 IQD of order value.",
    },
  },
  {
    icon: Sparkles,
    title: { ar: "مكافأة أول طلب", ku: "خەڵاتی یەکەم داواکاری", en: "First order bonus" },
    body: {
      ar: "دفعة نقاط ترحيبية تُضاف مع أول طلب مدفوع.",
      ku: "خاڵی بەخێرهاتن لەگەڵ یەکەم داواکاری پارەدراو.",
      en: "A welcome boost with your first paid order.",
    },
  },
  {
    icon: Store,
    title: { ar: "نقاط برعاية الماركات", ku: "خاڵی سپۆنسەری براند", en: "Brand-sponsored points" },
    body: {
      ar: "منتجات مختارة تمنح نقاط مضاعفة من الموردين.",
      ku: "بەرهەمی هەڵبژێردراو خاڵی چەند قات دەدەن.",
      en: "Selected products pay multiplied points from vendors.",
    },
  },
  {
    icon: CalendarCheck,
    title: { ar: "تحدي الشهر", ku: "ئامانجی مانگانە", en: "Monthly challenge" },
    body: {
      ar: "اِبلغ هدف الشراء الشهري واحصل على مكافأة إضافية.",
      ku: "ئامانجی کڕینی مانگانە بپێکە و خەڵاتی زیادە ببە.",
      en: "Hit the monthly spend target for a bonus.",
    },
  },
  {
    icon: Flame,
    title: { ar: "استمرارية الطلبات", ku: "بەردەوامی داواکاری", en: "Order streaks" },
    body: {
      ar: "3، 6 و12 شهراً متواصلة = مكافآت متزايدة.",
      ku: "٣، ٦ و ١٢ مانگ بەردەوام = خەڵاتی زیاتر.",
      en: "3, 6 and 12 months in a row pay increasing bonuses.",
    },
  },
  {
    icon: MessageSquareHeart,
    title: { ar: "تقييم المنتجات", ku: "هەڵسەنگاندنی بەرهەم", en: "Review rewards" },
    body: {
      ar: "قيّم ما اشتريته، والتقييم مع صورة يمنح نقاط أكثر.",
      ku: "هەڵسەنگاندن بکە، بە وێنە خاڵی زیاتر دەدات.",
      en: "Review what you bought — photo reviews pay more.",
    },
  },
  {
    icon: UserPlus,
    title: { ar: "دعوة زملاء", ku: "بانگهێشتی هاوکاران", en: "Referral coins" },
    body: {
      ar: "شارك كودك: أنت وزميلك تحصلان على نقاط.",
      ku: "کۆدەکەت هاوبەش بکە: تۆ و هاوکارت خاڵ دەبەن.",
      en: "Share your code: you and your colleague both earn.",
    },
  },
  {
    icon: BadgeCheck,
    title: { ar: "إكمال ملف العيادة", ku: "تەواوکردنی پرۆفایلی کلینیک", en: "Clinic profile" },
    body: {
      ar: "الاسم، التخصص، المدينة والأقسام المفضلة = نقاط.",
      ku: "ناو، پسپۆری، شار و بەشی دڵخواز = خاڵ.",
      en: "Name, specialty, city and preferred categories all pay.",
    },
  },
];

const FAQ: { q: Record<Lang, string>; a: Record<Lang, string> }[] = [
  {
    q: { ar: "هل النقاط تنتهي؟", ku: "خاڵەکان بەسەردەچن؟", en: "Do points expire?" },
    a: {
      ar: "نقاطك تبقى في حسابك وتستخدمها وقتما تشاء.",
      ku: "خاڵەکانت لە هەژمارت دەمێننەوە و هەر کاتێک بتەوێت بەکاریان دەهێنیت.",
      en: "Your points stay in your account and can be used any time.",
    },
  },
  {
    q: {
      ar: "كم أستطيع أن أخصم من الطلب؟",
      ku: "چەند لە داواکاری دەتوانم کەم بکەم؟",
      en: "How much can I discount?",
    },
    a: {
      ar: "يمكنك استخدام النقاط حتى الحد الأقصى المسموح من إجمالي الطلب.",
      ku: "دەتوانیت خاڵ بەکاربهێنیت هەتا ئەو ڕێژەی ڕێپێدراو لە کۆی داواکاری.",
      en: "Use points up to the allowed share of your order total.",
    },
  },
  {
    q: { ar: "هل الانضمام مجاني؟", ku: "بەشداری بێ بەرامبەرە؟", en: "Is joining free?" },
    a: {
      ar: "نعم، كل حساب عيادة مسجّل يجمع النقاط تلقائياً بدون أي رسوم.",
      ku: "بەڵێ، هەموو هەژمارێکی کلینیک ئۆتۆماتیک خاڵ کۆدەکاتەوە بێ هیچ کرێ.",
      en: "Yes — every registered clinic account earns automatically, no fees.",
    },
  },
];

function RewardsMarketing() {
  const { lang } = useI18n();
  const { data: settings } = useRewardSettings();
  const { data: rules } = useRewardRules();
  const rate = Number(settings?.points_per_1000_iqd) || 100;
  const map = ruleMap(rules);
  const tiers = [500, 1000, 5000];

  return (
    <StoreLayout>
      <PageBlocks page="rewards" />
      <div className="flex flex-col gap-2.5 px-3 pb-12 pt-2.5">
        {/* Hero */}
        <section className="dk-amazing relative overflow-hidden p-4 text-center">
          <span className="absolute -end-8 -top-10 size-32 rounded-full bg-white/10" aria-hidden />
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-white/15">
            <Coins className="size-7" strokeWidth={2.3} />
          </span>
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide opacity-90">
            {COIN_WORD[lang]}
          </p>
          <h1 className="mt-1 font-display text-[20px] font-extrabold leading-snug">
            {T.hero[lang]}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[12px] font-bold leading-relaxed opacity-95">
            {T.heroSub[lang]}
          </p>
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-[12px] font-extrabold text-primary"
            >
              <Gift className="size-4" />
              {T.join[lang]}
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-4 py-2.5 text-[12px] font-extrabold"
            >
              <ShoppingBag className="size-4" />
              {T.shop[lang]}
            </Link>
          </div>
        </section>

        {/* Value ladder */}
        <section className="dk-block p-3">
          <div className="flex items-center gap-2">
            <Coins className="size-[18px] text-primary" strokeWidth={2.4} />
            <h2 className="font-display text-[14px] font-extrabold">{T.valueTitle[lang]}</h2>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {tiers.map((p) => (
              <div key={p} className="rounded-xl bg-secondary/60 p-2.5 text-center">
                <p className="text-[13px] font-extrabold text-primary">
                  {p.toLocaleString(lang === "en" ? "en-US" : "ar-EG")}
                </p>
                <p className="text-[9.5px] font-bold text-muted-foreground">{T.points[lang]}</p>
                <p className="mt-1 text-[11.5px] font-extrabold">
                  {formatPrice(coinsToMoney(p, rate), lang)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">{T.valueNote[lang]}</p>
        </section>

        {/* Steps */}
        <section className="dk-block p-3">
          <h2 className="font-display text-[14px] font-extrabold">{T.stepsTitle[lang]}</h2>
          <div className="mt-2.5 grid gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="size-[19px]" strokeWidth={2.3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-extrabold">
                    {i + 1}. {s.title[lang]}
                  </p>
                  <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
                    {s.body[lang]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ways to earn */}
        <section className="dk-block p-3">
          <div className="flex items-center gap-2">
            <Star className="size-[18px] text-primary" strokeWidth={2.4} />
            <h2 className="font-display text-[14px] font-extrabold">{T.earnTitle[lang]}</h2>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {EARN.map((e, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <e.icon className="size-[17px]" strokeWidth={2.3} />
                </span>
                <p className="mt-1.5 text-[12px] font-extrabold leading-tight">{e.title[lang]}</p>
                <p className="mt-0.5 text-[10.5px] font-bold leading-relaxed text-muted-foreground">
                  {e.body[lang]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Live rule values */}
        {rules?.length ? (
          <section className="dk-block p-3">
            <h2 className="font-display text-[14px] font-extrabold">{T.rulesTitle[lang]}</h2>
            <ul className="mt-2 divide-y divide-border/60">
              {rules
                .filter((r) => r.is_active && r.key !== "challenge_target_iqd" && map.get(r.key))
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                      {ruleLabel(r.key, lang)}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                      +{Number(r.points).toLocaleString(lang === "en" ? "en-US" : "ar-EG")}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {/* FAQ */}
        <section className="dk-block p-3">
          <h2 className="font-display text-[14px] font-extrabold">{T.faqTitle[lang]}</h2>
          <div className="mt-2 grid gap-2">
            {FAQ.map((f, i) => (
              <div key={i} className="rounded-xl bg-secondary/50 p-2.5">
                <p className="text-[12px] font-extrabold">{f.q[lang]}</p>
                <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-muted-foreground">
                  {f.a[lang]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="dk-block border-primary/30 bg-primary/5 p-4 text-center">
          <h2 className="font-display text-[15px] font-extrabold">{T.ctaTitle[lang]}</h2>
          <p className="mx-auto mt-1 max-w-sm text-[11.5px] font-bold text-muted-foreground">
            {T.ctaSub[lang]}
          </p>
          <Link
            to="/auth"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[12.5px] font-extrabold text-primary-foreground"
          >
            <Gift className="size-4" />
            {T.join[lang]}
          </Link>
        </section>
      </div>
      <PageBlocks page="rewards" position="bottom" />
    </StoreLayout>
  );
}
