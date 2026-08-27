import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Lock, MapPin, Phone, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyAsVendor } from "@/lib/vendor-signup.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/vendor-signup")({
  head: () => ({
    meta: [
      { title: "سجّل متجرك | دنتال ستور" },
      {
        name: "description",
        content: "افتح حساب بائع في دنتال ستور بثلاث خطوات: اسم المتجر، الموقع، ورقم الموبايل.",
      },
      { property: "og:title", content: "سجّل متجرك | دنتال ستور" },
      { property: "og:description", content: "حساب بائع بثلاث خطوات، بعد موافقة الإدارة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorSignupPage,
});

type Txt = { ar: string; ku: string; en: string };
const T = {
  title: { ar: "سجّل متجرك", ku: "فرۆشگاکەت تۆمار بکە", en: "Register your store" },
  sub: {
    ar: "٣ خطوات فقط — ثم تفعيل الحساب بعد موافقة الإدارة",
    ku: "تەنها ٣ هەنگاو — پاشان چالاککردن دوای ڕەزامەندی بەڕێوەبەر",
    en: "Just 3 steps — activated after admin approval",
  },
  s1: { ar: "اسم المتجر", ku: "ناوی فرۆشگا", en: "Store name" },
  s2: { ar: "الموقع", ku: "شوێن", en: "Location" },
  s3: { ar: "الدخول", ku: "چوونەژوورەوە", en: "Login" },
  city: { ar: "المدينة", ku: "شار", en: "City" },
  address: { ar: "العنوان (اختياري)", ku: "ناونیشان (ئارەزوومەندانە)", en: "Address (optional)" },
  phone: { ar: "رقم الموبايل", ku: "ژمارەی مۆبایل", en: "Mobile number" },
  phoneNote: {
    ar: "لن يُعرض رقمك في صفحة متجرك",
    ku: "ژمارەکەت لە پەیجی فرۆشگاکەت نیشان نادرێت",
    en: "Your number is never shown on your store page",
  },
  password: { ar: "كلمة المرور", ku: "وشەی نهێنی", en: "Password" },
  captcha: { ar: "تحقق بشري", ku: "پشتڕاستکردنەوە", en: "Human check" },
  next: { ar: "التالي", ku: "دواتر", en: "Next" },
  back: { ar: "رجوع", ku: "گەڕانەوە", en: "Back" },
  submit: { ar: "إرسال الطلب", ku: "ناردنی داواکاری", en: "Send request" },
  doneTitle: { ar: "تم إرسال طلبك", ku: "داواکارییەکەت نێردرا", en: "Request sent" },
  doneSub: {
    ar: "سيتم تفعيل حسابك بعد موافقة الإدارة، ثم سجّل الدخول برقمك وكلمة المرور.",
    ku: "دوای ڕەزامەندی بەڕێوەبەر هەژمارەکەت چالاک دەکرێت، پاشان بە ژمارە و وشەی نهێنی بچۆ ژوورەوە.",
    en: "Your account is activated after admin approval; then sign in with your number and password.",
  },
  home: { ar: "الرئيسية", ku: "سەرەکی", en: "Home" },
  errors: {
    badCaptcha: { ar: "الجواب غير صحيح", ku: "وەڵام هەڵەیە", en: "Wrong answer" },
    phoneTaken: { ar: "هذا الرقم مسجل مسبقاً", ku: "ئەم ژمارە پێشتر تۆمارکراوە", en: "Number already registered" },
    alreadyApplied: {
      ar: "لديك طلب قيد المراجعة",
      ku: "داواکاریت لە چاوەڕوانیدایە",
      en: "You already have a pending request",
    },
  } as Record<string, Txt>,
};

function VendorSignupPage() {
  const { lang } = useI18n();
  const tx = (v: Txt) => (lang === "ku" ? v.ku : lang === "en" ? v.en : v.ar);
  const apply = useServerFn(applyAsVendor);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    storeName: "",
    city: "",
    addressLine: "",
    phone: "",
    password: "",
    captcha: "",
  });
  const quiz = useMemo(
    () => ({ a: 2 + Math.floor(Math.random() * 7), b: 1 + Math.floor(Math.random() * 6) }),
    [],
  );

  const steps = [T.s1, T.s2, T.s3];

  function next() {
    if (step === 0 && form.storeName.trim().length < 2) return;
    if (step === 1 && form.city.trim().length < 2) return;
    setStep((s) => Math.min(2, s + 1));
  }

  async function submit() {
    if (form.phone.replace(/\D/g, "").length < 9) {
      toast.error(tx({ ar: "رقم غير صحيح", ku: "ژمارە هەڵەیە", en: "Invalid number" }));
      return;
    }
    if (form.password.length < 6) {
      toast.error(tx({ ar: "كلمة المرور 6 أحرف على الأقل", ku: "وشەی نهێنی ٦ پیت", en: "Min 6 characters" }));
      return;
    }
    setBusy(true);
    try {
      await apply({
        data: {
          storeName: form.storeName.trim(),
          city: form.city.trim(),
          addressLine: form.addressLine.trim(),
          phone: form.phone.trim(),
          password: form.password,
          captchaA: quiz.a,
          captchaB: quiz.b,
          captchaAnswer: Number(form.captcha),
        },
      });
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      const known = Object.keys(T.errors).find((k) => msg.includes(k));
      toast.error(known ? tx(T.errors[known]!) : msg);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <StoreLayout>
        <div className="px-3 py-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success/12 text-success">
            <CheckCircle2 className="size-8" strokeWidth={2.4} />
          </span>
          <h1 className="mt-3 font-display text-[19px] font-extrabold">{tx(T.doneTitle)}</h1>
          <p className="mx-auto mt-2 max-w-[320px] text-[12.5px] leading-relaxed text-muted-foreground">
            {tx(T.doneSub)}
          </p>
          <Link to="/" className="mt-5 inline-flex">
            <Button className="h-11 rounded-xl px-6 font-extrabold">{tx(T.home)}</Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <PageBlocks page="vendor-signup" />
      <section className="auth-sky px-5 pb-10 pt-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-card/18 ring-1 ring-inset ring-card/30">
          <Store className="size-7" strokeWidth={2.3} />
        </span>
        <h1 className="mt-3 font-display text-[21px] font-extrabold">{tx(T.title)}</h1>
        <p className="mt-1 text-[12.5px] opacity-85">{tx(T.sub)}</p>
      </section>

      <div className="relative z-10 -mt-5 px-3 pb-8">
        <div className="panel p-4 pt-5">

          <ol className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <li key={s.en} className="flex flex-1 items-center gap-1.5">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                    i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="truncate text-[11px] font-extrabold">{tx(s)}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 space-y-3">
            {step === 0 && (
              <div>
                <Label className="text-[11.5px] font-extrabold">{tx(T.s1)}</Label>
                <div className="field mt-1.5">
                  <Store className="size-4" />
                  <Input
                    className="h-12 rounded-xl text-[15px]"
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(T.city)}</Label>
                  <div className="field mt-1.5">
                    <MapPin className="size-4" />
                    <Input
                      className="h-12 rounded-xl text-[15px]"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(T.address)}</Label>
                  <div className="field mt-1.5">
                    <MapPin className="size-4" />
                    <Input
                      className="h-12 rounded-xl text-[15px]"
                      value={form.addressLine}
                      onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(T.phone)}</Label>
                  <div className="field mt-1.5">
                    <Phone className="size-4" />
                    <Input
                      className="h-12 rounded-xl text-[15px]"
                      inputMode="tel"
                      dir="ltr"
                      placeholder="0770 000 0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-success" />
                    {tx(T.phoneNote)}
                  </p>
                </div>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(T.password)}</Label>
                  <div className="field mt-1.5">
                    <Lock className="size-4" />
                    <Input
                      key="password"
                      className="h-12 rounded-xl text-[15px]"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(T.captcha)}</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      dir="ltr"
                      className="grid h-12 shrink-0 place-items-center rounded-xl bg-muted px-3 text-[15px] font-extrabold tracking-widest"
                    >
                      {quiz.a} + {quiz.b} = ?
                    </span>
                    <Input
                      key="captcha"
                      type="text"
                      className="h-12 rounded-xl text-[15px]"
                      inputMode="numeric"
                      dir="ltr"
                      value={form.captcha}
                      onChange={(e) => setForm({ ...form, captcha: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              {step > 0 && (
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-xl font-extrabold"
                  onClick={() => setStep((s) => s - 1)}
                >
                  {tx(T.back)}
                </Button>
              )}
              {step < 2 ? (
                <Button className="h-12 flex-[2] rounded-xl font-extrabold" onClick={next}>
                  {tx(T.next)}
                  <ArrowLeft className="size-4 ltr:rotate-180" />
                </Button>
              ) : (
                <Button
                  className="h-12 flex-[2] rounded-xl font-extrabold"
                  disabled={busy}
                  onClick={submit}
                >
                  {tx(T.submit)}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <PageBlocks page="vendor-signup" position="bottom" />
    </StoreLayout>
  );
}
