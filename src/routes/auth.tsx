import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BadgePercent,
  Building2,
  Check,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { reverseGeocode } from "@/lib/geocode.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | دنتال ستور" },
      { name: "description", content: "أنشئ حسابك بالموبايل في دنتال ستور لمتابعة طلباتك." },
      { property: "og:title", content: "تسجيل الدخول | دنتال ستور" },
      { property: "og:description", content: "حساب سريع بالموبايل فقط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const PHONE_DOMAIN = "batrading.com";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

/** Banned logins are vendor accounts awaiting admin approval. */
function authErrorText(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : "";
  if (/banned|user_banned/i.test(msg)) {
    return "حسابك قيد مراجعة الإدارة / هەژمارەکەت لە چاوەڕوانی ڕەزامەندیدایە";
  }
  return msg || fallback;
}

type Txt = { ar: string; ku: string; en: string };
const W = {
  s1: { ar: "الاسم", ku: "ناو", en: "Name" },
  s2: { ar: "الموقع", ku: "شوێن", en: "Location" },
  s3: { ar: "الدخول", ku: "چوونەژوورەوە", en: "Login" },
  nameHint: {
    ar: "اسم الطبيب أو العيادة",
    ku: "ناوی پزیشک یان کلینیک",
    en: "Doctor or clinic name",
  },
  city: { ar: "المدينة", ku: "شار", en: "City" },
  address: { ar: "العنوان", ku: "ناونیشان", en: "Address" },
  locBtn: { ar: "تحديد موقعي تلقائياً", ku: "شوێنم بە ئۆتۆماتیک", en: "Use my location" },
  locDone: { ar: "تم تحديد الموقع", ku: "شوێن دیاریکرا", en: "Location captured" },
  locFail: { ar: "تعذر تحديد الموقع", ku: "نەتوانرا شوێن دیاری بکرێت", en: "Could not get location" },
  captcha: { ar: "تحقق بشري", ku: "پشتڕاستکردنەوە", en: "Human check" },
  captchaBad: { ar: "الجواب غير صحيح", ku: "وەڵام هەڵەیە", en: "Wrong answer" },
  next: { ar: "التالي", ku: "دواتر", en: "Next" },
  back: { ar: "رجوع", ku: "گەڕانەوە", en: "Back" },
  create: { ar: "إنشاء الحساب", ku: "دروستکردنی هەژمار", en: "Create account" },
  needName: { ar: "الاسم مطلوب", ku: "ناو پێویستە", en: "Name is required" },
  needCity: { ar: "المدينة مطلوبة", ku: "شار پێویستە", en: "City is required" },
};

function AuthPage() {
  const { t, lang } = useI18n();
  const tx = (v: Txt) => (lang === "ku" ? v.ku : lang === "en" ? v.en : v.ar);
  const navigate = useNavigate();
  const { user } = useAuth();
  const getPlace = useServerFn(reverseGeocode);
  const [mode, setMode] = useState<"in" | "up">("up");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    password: "",
    fullName: "",
    city: "",
    address: "",
    captcha: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const quiz = useMemo(
    () => ({ a: 2 + Math.floor(Math.random() * 7), b: 1 + Math.floor(Math.random() * 6) }),
    [],
  );

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user, navigate]);

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error(tx(W.locFail));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setForm((f) => ({ ...f, latitude, longitude }));
        try {
          const place = await getPlace({
            data: {
              latitude,
              longitude,
              language: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar",
            },
          });
          setForm((f) => ({
            ...f,
            city: place.city || f.city,
            address: place.addressLine || f.address,
          }));
        } catch {
          setForm((f) => ({
            ...f,
            address: f.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          }));
        }
        setLocating(false);
        toast.success(tx(W.locDone));
      },
      () => {
        setLocating(false);
        toast.error(tx(W.locFail));
      },
    );
  }

  function next() {
    if (step === 0) {
      if (form.fullName.trim().length < 2) {
        toast.error(tx(W.needName));
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (form.city.trim().length < 2) {
        toast.error(tx(W.needCity));
        return;
      }
      setStep(2);
    }
  }

  /** Store the wizard's city + location on the new dentist profile. */
  async function saveDentistDetails() {
    const city = form.city.trim();
    const address = form.address.trim();
    const { data: me } = await supabase.auth.getUser();
    if (!me.user || !city) return;
    await supabase.from("profiles").update({ city }).eq("id", me.user.id);
    await supabase.from("addresses").insert({
      user_id: me.user.id,
      label: city,
      city,
      address_line: address || city,
      latitude: form.latitude,
      longitude: form.longitude,
      is_default: true,
    });
  }


  async function submit() {
    const phone = normalizePhone(form.phone);
    if (phone.length < 9) {
      toast.error("رقم الموبايل غير صحيح / ژمارەی مۆبایل هەڵەیە");
      return;
    }
    if (form.password.length < 6) {
      toast.error("كلمة المرور 6 أحرف على الأقل / وشەی نهێنی ٦ پیت");
      return;
    }
    const email = `${phone}@${PHONE_DOMAIN}`;
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        if (error) throw error;
        navigate({ to: "/profile" });
        return;
      }

      if (Number(form.captcha) !== quiz.a + quiz.b) {
        toast.error(tx(W.captchaBad));
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: form.fullName.trim(), phone, city: form.city.trim() },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          toast.error("هذا الرقم مسجل، سجّل الدخول / ئەم ژمارە تۆمارکراوە");
          setMode("in");
          return;
        }
        throw error;
      }
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        if (signInError) throw signInError;
      }
      await saveDentistDetails();
      toast.success("تم إنشاء الحساب / هەژمار دروستکرا");
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error(authErrorText(e, t("error")));
    } finally {
      setBusy(false);
    }
  }

  const perks = [
    { icon: BadgePercent, label: t("authPerk1") },
    { icon: PackageCheck, label: t("authPerk2") },
    { icon: Sparkles, label: t("authPerk3") },
  ];

  const demoAccounts = [
    { label: "مدير المتجر / Admin (Full Access)", phone: "07700000000", password: "admin123" },
    { label: "د. بەهزاد کاکە (Dentist)", phone: "07700000001", password: "dentist123" },
    { label: "GC Iraq (Vendor)", phone: "07710000001", password: "vendor123" },
    { label: "Tokuyama Center (Vendor)", phone: "07710000002", password: "vendor123" },
    { label: "Bisco Supply (Vendor)", phone: "07710000003", password: "vendor123" },
    { label: "3M Dental Hub (Vendor)", phone: "07710000004", password: "vendor123" },
    { label: "Orodeka Depot (Vendor)", phone: "07710000005", password: "vendor123" },
  ];

  async function quickLogin(phone: string, password: string) {
    setMode("in");
    setForm({ ...form, phone, password, fullName: "" });
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${normalizePhone(phone)}@${PHONE_DOMAIN}`,
        password,
      });
      if (error) throw error;
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  const wizardSteps = [W.s1, W.s2, W.s3];

  return (
    <StoreLayout>
      <PageBlocks page="auth" />
      <section className="auth-sky px-5 pb-12 pt-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-card/18 ring-1 ring-inset ring-card/30">
          <Stethoscope className="size-7" strokeWidth={2.3} />
        </span>
        <h1 className="mt-3 font-display text-[21px] font-extrabold leading-tight">
          {mode === "up" ? t("createAccountTitle") : t("welcomeBack")}
        </h1>
        <p className="mt-1 text-[12.5px] leading-relaxed opacity-85">
          {mode === "up" ? t("signUpSub") : t("signInSub")}
        </p>
      </section>

      <div className="relative z-10 -mt-6 px-3 pb-6">
        <div className="panel p-4">
          <div className="seg">
            <button
              data-on={mode === "up"}
              className="seg-item"
              onClick={() => {
                setMode("up");
                setStep(0);
              }}
            >
              {t("signUp")}
            </button>
            <button data-on={mode === "in"} className="seg-item" onClick={() => setMode("in")}>
              {t("signIn")}
            </button>
          </div>

          {mode === "up" && (
            <ol className="mt-4 flex items-center gap-1.5">
              {wizardSteps.map((s, i) => (
                <li key={s.en} className="flex flex-1 items-center gap-1.5">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                      i <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className="truncate text-[11px] font-extrabold">{tx(s)}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 space-y-3">
            {mode === "up" && step === 0 && (
              <div>
                <Label className="text-[11.5px] font-extrabold">{t("fullName")}</Label>
                <div className="field mt-1.5">
                  <User className="size-4" />
                  <Input
                    className="h-12 rounded-xl text-[15px]"
                    autoComplete="name"
                    placeholder={tx(W.nameHint)}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {mode === "up" && step === 1 && (
              <>
                <Button
                  variant="secondary"
                  className="h-12 w-full rounded-xl text-[14px] font-extrabold"
                  onClick={detectLocation}
                  disabled={locating}
                >
                  <MapPin className="size-4" />
                  {locating ? "..." : form.latitude ? tx(W.locDone) : tx(W.locBtn)}
                </Button>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(W.city)}</Label>
                  <div className="field mt-1.5">
                    <Building2 className="size-4" />
                    <Input
                      className="h-12 rounded-xl text-[15px]"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{tx(W.address)}</Label>
                  <Textarea
                    className="mt-1.5 min-h-[64px] rounded-xl text-[14px]"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </>
            )}

            {(mode === "in" || step === 2) && (
              <>
                <div>
                  <Label className="text-[11.5px] font-extrabold">{t("mobile")}</Label>
                  <div className="field mt-1.5">
                    <Phone className="size-4" />
                    <Input
                      className="h-12 rounded-xl text-[15px]"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      placeholder="0770 000 0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11.5px] font-extrabold">{t("password")}</Label>
                  <div className="field mt-1.5">
                    <Lock className="size-4" />
                    <Input
                      className="h-12 rounded-xl pe-11 text-[15px]"
                      type={show ? "text" : "password"}
                      autoComplete={mode === "up" ? "new-password" : "current-password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label={t("password")}
                      onClick={() => setShow((s) => !s)}
                      className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground active:scale-90"
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {mode === "up" && (
                  <div>
                    <Label className="text-[11.5px] font-extrabold">{tx(W.captcha)}</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        dir="ltr"
                        className="grid h-12 shrink-0 place-items-center rounded-xl bg-muted px-3 text-[15px] font-extrabold tracking-widest"
                      >
                        {quiz.a} + {quiz.b} = ?
                      </span>
                      <Input
                        className="h-12 rounded-xl text-[15px]"
                        inputMode="numeric"
                        dir="ltr"
                        value={form.captcha}
                        onChange={(e) => setForm({ ...form, captcha: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-1">
              {mode === "up" && step > 0 && (
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-xl font-extrabold"
                  onClick={() => setStep((s) => s - 1)}
                >
                  {tx(W.back)}
                </Button>
              )}
              {mode === "up" && step < 2 ? (
                <Button className="h-12 flex-[2] rounded-xl font-extrabold" onClick={next}>
                  {tx(W.next)}
                  <ArrowLeft className="size-4 ltr:rotate-180" />
                </Button>
              ) : (
                <Button
                  className="h-12 flex-[2] w-full rounded-xl text-[14.5px] font-extrabold"
                  size="lg"
                  disabled={busy}
                  onClick={submit}
                >
                  {mode === "up" ? tx(W.create) : t("signIn")}
                  <ArrowLeft className="size-4 ltr:rotate-180" />
                </Button>
              )}
            </div>

            <button
              className="w-full py-1 text-[12.5px] font-extrabold text-primary"
              onClick={() => {
                setMode(mode === "up" ? "in" : "up");
                setStep(0);
              }}
            >
              {mode === "up" ? t("haveAccount") : t("noAccount")}
            </button>
          </div>
        </div>

        <Link
          to="/vendor-signup"
          className="panel mt-3 flex items-center gap-2.5 p-3 active:scale-[0.99]"
        >
          <span className="head-icon">
            <Store className="size-4" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold">
              عندك متجر؟ سجّل كبائع / فرۆشگات هەیە؟
            </span>
            <span className="block text-[11px] text-muted-foreground">
              ٣ خطوات — بعد موافقة الإدارة
            </span>
          </span>
          <ArrowLeft className="size-4 text-primary ltr:rotate-180" />
        </Link>

        <div className="panel mt-3 p-3">
          <p className="text-[12px] font-extrabold">حسابات تجريبية / هەژماری نمونە</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            اضغط للدخول السريع / کرتە بکە بۆ چوونەژوورەوەی خێرا
          </p>
          <div className="mt-2 space-y-1.5">
            {demoAccounts.map((a) => (
              <button
                key={a.phone}
                disabled={busy}
                onClick={() => quickLogin(a.phone, a.password)}
                className="flex w-full items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-start active:scale-[0.99] disabled:opacity-60"
              >
                <span className="head-icon">
                  <User className="size-4" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-extrabold">{a.label}</span>
                  <span className="block text-[11px] text-muted-foreground" dir="ltr">
                    {a.phone} · {a.password}
                  </span>
                </span>
                <ArrowLeft className="size-4 text-primary ltr:rotate-180" />
              </button>
            ))}
          </div>
        </div>

        <div className="panel mt-3 divide-y divide-border/60">
          {perks.map((p) => (
            <div key={p.label} className="flex items-center gap-2.5 p-3">
              <span className="head-icon">
                <p.icon className="size-4" strokeWidth={2.4} />
              </span>
              <p className="text-[12.5px] font-bold">{p.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" />
          {t("secureCheckout")}
        </p>
      </div>
      <PageBlocks page="auth" position="bottom" />
    </StoreLayout>
  );
}
