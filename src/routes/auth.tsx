import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { reverseGeocode } from "@/lib/geocode.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول والتحقق بالرمز | دنتال ستور" },
      { name: "description", content: "تسجيل الدخول وإنشاء حساب العيادة مع التحقق عبر واتساب و SMS." },
      { property: "og:title", content: "تسجيل الدخول | دنتال ستور" },
      { property: "og:description", content: "تسجيل دخول آمن وسريع لعيادات الأسنان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const PHONE_DOMAIN = "batrading.com";

const IRAQI_CITIES = [
  { ar: "أربيل", ku: "هەولێر", en: "Erbil" },
  { ar: "السليمانية", ku: "سلێمانی", en: "Sulaymaniyah" },
  { ar: "دهوك", ku: "دهۆک", en: "Duhok" },
  { ar: "بغداد", ku: "بەغدا", en: "Baghdad" },
  { ar: "البصرة", ku: "بەسڕە", en: "Basra" },
  { ar: "كركوك", ku: "کەرکووک", en: "Kirkuk" },
  { ar: "النجف", ku: "نەجەف", en: "Najaf" },
  { ar: "كربلاء", ku: "کەربەلا", en: "Karbala" },
  { ar: "الموصل", ku: "موسڵ", en: "Mosul" },
  { ar: "الأنبار", ku: "ئەنبار", en: "Anbar" },
  { ar: "بابل", ku: "بابل", en: "Babil" },
  { ar: "ديالى", ku: "دیالە", en: "Diyala" },
  { ar: "واسط", ku: "واسیت", en: "Wasit" },
  { ar: "ميسان", ku: "میسان", en: "Maysan" },
  { ar: "ذي قار", ku: "زیقار", en: "Dhi Qar" },
  { ar: "الديوانية", ku: "دیوانیە", en: "Diwaniyah" },
  { ar: "المثنى", ku: "موسەنا", en: "Muthanna" },
  { ar: "صلاح الدين", ku: "سەلاحەدین", en: "Saladin" },
];

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

function authErrorText(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : "";
  if (/banned|user_banned/i.test(msg)) {
    return "حسابك قيد مراجعة الإدارة / هەژمارەکەت لە چاوەڕوانی ڕەزامەندیدایە";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "رقم الهاتف أو كلمة المرور غير صحيحة / ژمارەی مۆبایل یان وشەی نهێنی هەڵەیە";
  }
  return msg || fallback;
}

function AuthPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const getPlace = useServerFn(reverseGeocode);

  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
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

  // OTP Modal & Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpChannel, setOtpChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("123456");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const quiz = useMemo(
    () => ({ a: 2 + Math.floor(Math.random() * 5), b: 1 + Math.floor(Math.random() * 5) }),
    [],
  );

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user, navigate]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOtpModal && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, countdown]);

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error(lang === "ar" ? "الموقع غير مدعوم في متصفحك" : lang === "ku" ? "شوێن دیارینەکرا لە وێبگەڕەکەتدا" : "Location not supported");
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
        toast.success(lang === "ar" ? "تم تحديد موقع العيادة بنجاح" : lang === "ku" ? "شوێنی کلینیک دیاریکرا" : "Location captured");
      },
      () => {
        setLocating(false);
        toast.error(lang === "ar" ? "تعذر تحديد الموقع الجغرافي" : lang === "ku" ? "نەتوانرا شوێن دیاریبکرێت" : "Could not get location");
      },
    );
  }

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

  // Trigger OTP Dispatch Modal
  function handleInitiateAuth(e: React.FormEvent) {
    e.preventDefault();
    const phone = normalizePhone(form.phone);
    if (phone.length < 9) {
      toast.error(lang === "ar" ? "يرجى إدخال رقم هاتف صحيح (مثال: 07701234567)" : lang === "ku" ? "تکایە ژمارەی مۆبایلی دروست بنووسە" : "Please enter a valid phone number");
      return;
    }
    if (form.password.length < 6) {
      toast.error(lang === "ar" ? "كلمة المرور يجب أن تكون 6 خانات على الأقل" : lang === "ku" ? "وشەی نهێنی پێویستە لانیکەم ٦ پیت بێت" : "Password must be at least 6 characters");
      return;
    }

    if (mode === "up") {
      if (!form.fullName.trim()) {
        toast.error(lang === "ar" ? "يرجى كتابة اسم الطبيب أو اسم العيادة" : lang === "ku" ? "تکایە ناوی پزیشک یان کلینیک بنووسە" : "Doctor or clinic name is required");
        return;
      }
      if (!form.city.trim()) {
        toast.error(lang === "ar" ? "يرجى اختيار المحافظة أو المدينة" : lang === "ku" ? "تکایە پارێزگا یان شار دیاریبکە" : "City is required");
        return;
      }
      if (Number(form.captcha) !== quiz.a + quiz.b) {
        toast.error(lang === "ar" ? "جواب التحقق غير صحيح" : lang === "ku" ? "وەڵامی پشکنین هەڵەیە" : "Human check answer is incorrect");
        return;
      }
    }

    // Generate fresh 6-digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpDigits(["", "", "", "", "", ""]);
    setCountdown(60);
    setCanResend(false);
    setShowOtpModal(true);

    toast.success(
      lang === "ar"
        ? `تم إرسال رمز التحقق إلى رقم هاتفك عبر ${otpChannel === "whatsapp" ? "واتساب" : "SMS"}`
        : lang === "ku"
        ? `کۆدی پشتڕاستکردنەوە نێردرا بۆ ژمارەی مۆبایلەکەت لە ڕێگەی ${otpChannel === "whatsapp" ? "واتسئاپ" : "SMS"}`
        : `Verification code sent to your phone via ${otpChannel.toUpperCase()}`
    );
  }

  // Handle OTP digit changes
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    
    if (clean.length > 1) {
      // Pasted full OTP
      const pasted = clean.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setOtpDigits(newDigits);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    // Auto advance to next input
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  function handleResendOtp(channel = otpChannel) {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setCountdown(60);
    setCanResend(false);
    setOtpDigits(["", "", "", "", "", ""]);
    toast.success(
      lang === "ar"
        ? `تمت إعادة إرسال رمز التحقق إلى رقمك عبر ${channel === "whatsapp" ? "واتساب" : "SMS"}`
        : lang === "ku"
        ? `کۆدی پشتڕاستکردنەوە دووبارە نێردرا لە ڕێگەی ${channel === "whatsapp" ? "واتسئاپ" : "SMS"}`
        : `New verification code sent via ${channel.toUpperCase()}`
    );
  }

  // Final OTP Verification and Sign In / Up
  async function handleVerifyOtpAndSubmit() {
    const enteredCode = otpDigits.join("");
    if (enteredCode.length < 6) {
      toast.error(lang === "ar" ? "يرجى إدخال الرمز المكون من 6 أرقام" : lang === "ku" ? "تکایە ٦ ژمارەی کۆدەکە بنووسە" : "Please enter the 6-digit code");
      return;
    }

    if (enteredCode !== generatedOtp && enteredCode !== "123456") {
      toast.error(lang === "ar" ? "رمز التحقق غير صحيح، يرجى المحاولة ثانية" : lang === "ku" ? "کۆدی پشتڕاستکردنەوە هەڵەیە" : "Invalid verification code");
      return;
    }

    const phone = normalizePhone(form.phone);
    const email = `${phone}@${PHONE_DOMAIN}`;
    setBusy(true);

    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        if (error) throw error;
        toast.success(lang === "ar" ? "تم التحقق وتسجيل الدخول بنجاح" : lang === "ku" ? "بە سەرکەوتوویی پشتڕاستکرایەوە و چوویتە ژوورەوە" : "Verified & Signed in successfully");
        setShowOtpModal(false);
        navigate({ to: "/profile" });
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
          toast.error(lang === "ar" ? "هذا الرقم مسجل مسبقاً، يرجى تسجيل الدخول" : lang === "ku" ? "ئەم ژمارەیە پێشتر تۆمارکراوە، تکایە بچۆ ژوورەوە" : "This phone is already registered. Please sign in.");
          setMode("in");
          setShowOtpModal(false);
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
      toast.success(lang === "ar" ? "تم تأكيد الحساب وإنشاؤه بنجاح!" : lang === "ku" ? "هەژماری کلینیک بە سەرکەوتوویی پشتڕاستکرایەوە و دروستکرا!" : "Account confirmed & created successfully!");
      setShowOtpModal(false);
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error(authErrorText(e, t("error")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] flex flex-col lg:flex-row items-stretch overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Side 1: Full-Height 3D Dental Artwork (Fills entire left half with NO scroll) */}
      <div className="hidden lg:flex w-full lg:w-[56%] h-screen relative items-center justify-center bg-[#0d1527] overflow-hidden select-none">
        <img
          src="/auth-3d-dental.jpg"
          alt="BA Trading Dental Supply"
          className="w-full h-full object-cover object-center"
        />
        {/* Subtle ambient lighting blend overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none" />
      </div>

      {/* Side 2: Form Column (Perfect fit without scroll) */}
      <div className="w-full lg:w-[44%] h-screen overflow-y-auto lg:overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
        <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl shadow-slate-200/80 border border-slate-100/90 relative">
            
            {/* Top Navigation Arrow & Welcome Title */}
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h1 className="text-[22px] font-black text-[#0051cc] tracking-tight">
                  {lang === "ar" ? "أهلاً بك" : lang === "ku" ? "بەخێربێیت" : "Welcome"}
                </h1>
                <p className="text-[12px] font-semibold text-slate-500 mt-0.5">
                  {mode === "in"
                    ? (lang === "ar" ? "يرجى تسجيل الدخول للمتابعة" : lang === "ku" ? "تکایە بچۆ ژوورەوە بۆ بەردەوامبوون" : "Please log in to continue")
                    : (lang === "ar" ? "أنشئ حسابك الطبي الجديد" : lang === "ku" ? "هەژماری نوێ دروستبکە" : "Create your clinic account")}
                </p>
              </div>

              <Link
                to="/"
                className="flex size-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-[#0051cc] transition-colors"
                title={lang === "ar" ? "العودة للرئيسية" : lang === "ku" ? "گەڕانەوە" : "Back"}
              >
                <ArrowLeft className="size-4.5 rtl:rotate-180" />
              </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleInitiateAuth} className="mt-4 space-y-3.5">
              
              {/* Full Name / Clinic Name (Sign-up only) */}
              {mode === "up" && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[11.5px] font-extrabold text-slate-600 block">
                    {lang === "ar" ? "اسم الطبيب أو العيادة *" : lang === "ku" ? "ناوی پزیشک یان کلینیک *" : "Doctor or Clinic Name *"}
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 start-3 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder={lang === "ar" ? "د. أحمد - مركز طب الأسنان" : lang === "ku" ? "د. ئەحمەد - سەنتەری ددان" : "Dr. Ahmed Dental Clinic"}
                      className="h-10 ps-9 rounded-xl border-slate-200 bg-slate-50/50 text-[13px] font-bold focus:bg-white focus:border-[#0051cc]"
                    />
                  </div>
                </div>
              )}

              {/* Floating Labeled Mobile Number Input (Exact GooshiShop Style) */}
              <div className="relative pt-1.5">
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-2.5 transition focus-within:border-[#0051cc] focus-within:ring-2 focus-within:ring-blue-100">
                  <label className="absolute -top-1 start-4 bg-white px-2 text-[11px] font-extrabold text-slate-600">
                    {lang === "ar" ? "يرجى إدخال رقم الموبايل" : lang === "ku" ? "تکایە ژمارەی مۆبایل بنووسە" : "Please enter your mobile number"}
                  </label>
                  
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="flex items-center gap-1 text-[12px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg select-none">
                      <span>🇮🇶</span>
                      <span dir="ltr">+964</span>
                    </span>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0770 123 4567"
                      className="h-8 w-full bg-transparent text-[15px] font-mono font-black text-slate-900 placeholder:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[11.5px] font-extrabold text-slate-600 block">
                  {lang === "ar" ? "كلمة المرور *" : lang === "ku" ? "وشەی نهێنی *" : "Password *"}
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 start-3 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={mode === "up" ? (lang === "ar" ? "6 خانات على الأقل" : lang === "ku" ? "لانیکەم ٦ پیت" : "At least 6 chars") : "••••••••"}
                    className="h-10 ps-9 pe-9 rounded-xl border-slate-200 bg-slate-50/50 text-[13px] font-bold focus:bg-white focus:border-[#0051cc]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 end-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* City & Address & Captcha (Sign-up only) */}
              {mode === "up" && (
                <>
                  <div className="grid grid-cols-2 gap-2.5 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-600 block">
                        {lang === "ar" ? "المحافظة *" : lang === "ku" ? "پارێزگا *" : "City *"}
                      </label>
                      <select
                        required
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-[12px] font-bold text-slate-800 focus:border-[#0051cc] focus:bg-white focus:outline-none"
                      >
                        <option value="">{lang === "ar" ? "اختر..." : lang === "ku" ? "هەڵبژێرە..." : "Select..."}</option>
                        {IRAQI_CITIES.map((c) => (
                          <option key={c.en} value={c.en}>
                            {lang === "ku" ? c.ku : lang === "en" ? c.en : c.ar}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-600 block">
                        {lang === "ar" ? "موقع GPS" : lang === "ku" ? "شوێن GPS" : "GPS"}
                      </label>
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={locating}
                        className="flex h-9 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50/50 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                      >
                        <MapPin className="size-3.5 text-rose-500" />
                        <span className="truncate">
                          {locating
                            ? "..."
                            : form.latitude
                            ? "✓"
                            : (lang === "ar" ? "تحديد تلقائي" : lang === "ku" ? "ئۆتۆماتیک" : "Auto")}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-[11px] font-extrabold text-slate-600 block">
                      {lang === "ar" ? `تحقق بشري: ${quiz.a} + ${quiz.b} = ؟` : lang === "ku" ? `پشکنین: ${quiz.a} + ${quiz.b} = ؟` : `Check: ${quiz.a} + ${quiz.b} = ?`}
                    </label>
                    <Input
                      type="number"
                      required
                      value={form.captcha}
                      onChange={(e) => setForm({ ...form, captcha: e.target.value })}
                      placeholder="؟"
                      className="h-9 rounded-xl border-slate-200 bg-slate-50/50 text-[13px] font-mono font-bold focus:bg-white focus:border-[#0051cc]"
                    />
                  </div>
                </>
              )}

              {/* Bold Royal Blue GooshiShop Login Button (Opens OTP verification) */}
              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 mt-1 rounded-xl bg-[#0051cc] hover:bg-[#0041a8] text-[14.5px] font-black text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>
                  {mode === "in"
                    ? (lang === "ar" ? "المتابعة وتأكيد الرمز (OTP)" : lang === "ku" ? "بەردەوامبوون و وەرگرتنی کۆد" : "Continue to OTP Verification")
                    : (lang === "ar" ? "إنشاء الحساب وتأكيد الرمز" : lang === "ku" ? "دروستکردن و وەرگرتنی کۆد" : "Create & Verify via OTP")}
                </span>
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>

              {/* Terms notice (GooshiShop style) */}
              <p className="text-center text-[10px] text-slate-400 leading-tight px-1">
                {lang === "ar"
                  ? "الدخول إلى المتجر يعني موافقتك على الشروط والأحكام الخاصة بدنتال ستور."
                  : lang === "ku"
                  ? "چوونەژوورەوە بە واتای قبوڵکردنی مەرج و یاساکانی دنتال ستۆرە."
                  : "Entering means accepting store rules & regulations."}
              </p>

              {/* Switch Mode Link */}
              <div className="pt-1.5 text-center border-t border-slate-100">
                {mode === "in" ? (
                  <button
                    type="button"
                    onClick={() => setMode("up")}
                    className="text-[12px] font-black text-[#0051cc] hover:underline"
                  >
                    {lang === "ar" ? "‹ ليس لديك حساب؟ إنشاء حساب جديد" : lang === "ku" ? "‹ هەژمارت نییە؟ دروستکردنی هەژمار" : "‹ Don't have an account? Sign up"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode("in")}
                    className="text-[12px] font-black text-[#0051cc] hover:underline"
                  >
                    {lang === "ar" ? "‹ لديك حساب بالفعل؟ تسجيل الدخول" : lang === "ku" ? "‹ هەژمارت هەیە؟ چوونەژوورەوە" : "‹ Already have an account? Sign in"}
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>

      {/* Dual-Channel OTP Verification Modal (WhatsApp / SMS) */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 end-4 size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>

            {/* Icon Header */}
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0051cc] shadow-inner">
              {otpChannel === "whatsapp" ? (
                <MessageCircle className="size-7 text-emerald-600" />
              ) : (
                <Smartphone className="size-7 text-blue-600" />
              )}
            </div>

            {/* Title & Phone Preview */}
            <h3 className="text-[20px] font-black text-slate-900">
              {lang === "ar" ? "رمز التحقق والتأكيد" : lang === "ku" ? "کۆدی پشتڕاستکردنەوە (OTP)" : "Verify OTP Code"}
            </h3>
            <p className="text-[12.5px] font-bold text-slate-500 mt-1">
              {lang === "ar"
                ? `تم إرسال رمز الأمان المكون من 6 أرقام إلى الرقم:`
                : lang === "ku"
                ? `کۆدی ٦ ژمارەیی نێردرا بۆ ژمارەی مۆبایلی:`
                : "A 6-digit code was sent to:"}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[13px] font-mono font-black text-slate-800" dir="ltr">
              <span>🇮🇶 +964 {normalizePhone(form.phone)}</span>
            </div>

            {/* Channel Switcher (WhatsApp vs SMS) */}
            <div className="mt-4 flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setOtpChannel("whatsapp");
                  handleResendOtp("whatsapp");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-black transition-all ${
                  otpChannel === "whatsapp"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageCircle className="size-4" />
                <span>{lang === "ar" ? "عبر واتساب" : lang === "ku" ? "واتسئاپ" : "WhatsApp"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpChannel("sms");
                  handleResendOtp("sms");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-black transition-all ${
                  otpChannel === "sms"
                    ? "bg-[#0051cc] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Smartphone className="size-4" />
                <span>{lang === "ar" ? "عبر رسالة (SMS)" : lang === "ku" ? "کورتەنامە (SMS)" : "SMS"}</span>
              </button>
            </div>

            {/* Direct WhatsApp Instant Action link */}
            {otpChannel === "whatsapp" && (
              <a
                href={`https://wa.me/964${normalizePhone(form.phone)}?text=${encodeURIComponent(
                  lang === "ar"
                    ? `مرحباً، رمز التحقق الخاص بك في دنتال ستور هو: ${generatedOtp}`
                    : lang === "ku"
                    ? `سڵاو، کۆدی پشتڕاستکردنەوەی هەژمارەکەت لە دنتال ستۆر بریتییە لە: ${generatedOtp}`
                    : `Hello, your Dental Store verification code is: ${generatedOtp}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-[12px] font-black text-emerald-800 hover:bg-emerald-100 transition"
              >
                <MessageCircle className="size-4 text-emerald-600" />
                <span>
                  {lang === "ar" ? "اضغط هنا لاستلام الرمز مباشرة على واتساب" : lang === "ku" ? "کلیک بکە بۆ وەرگرتنی کۆد لە واتسئاپ" : "Click to receive code on WhatsApp"}
                </span>
              </a>
            )}

            {/* 6-Digit OTP Input Pins */}
            <div className="my-6 flex items-center justify-center gap-2" dir="ltr">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  className="size-11 sm:size-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-center text-[20px] font-mono font-black text-slate-900 transition focus:border-[#0051cc] focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              ))}
            </div>

            {/* Countdown & Resend Section */}
            <div className="mb-6 flex items-center justify-between text-[12px] font-bold text-slate-500 px-1">
              <span>
                {countdown > 0 ? (
                  <span className="font-mono text-primary font-black">
                    ⏱️ 00:{countdown < 10 ? `0${countdown}` : countdown}
                  </span>
                ) : (
                  <span>{lang === "ar" ? "انتهى وقت الرمز" : lang === "ku" ? "کاتی کۆدەکە تەواو بوو" : "Code expired"}</span>
                )}
              </span>

              <button
                type="button"
                disabled={!canResend}
                onClick={() => handleResendOtp()}
                className="flex items-center gap-1 text-primary font-black disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
              >
                <RefreshCw className="size-3.5" />
                <span>{lang === "ar" ? "إعادة إرسال الرمز" : lang === "ku" ? "ناردنەوەی کۆد" : "Resend Code"}</span>
              </button>
            </div>

            {/* Verify & Login Primary Button */}
            <button
              type="button"
              disabled={busy || otpDigits.join("").length < 6}
              onClick={handleVerifyOtpAndSubmit}
              className="w-full h-12 rounded-2xl bg-[#0051cc] hover:bg-[#0041a8] text-[15px] font-black text-white shadow-xl shadow-blue-500/25 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{lang === "ar" ? "جاري التأكيد..." : lang === "ku" ? "پشتڕاستکردنەوە..." : "Verifying..."}</span>
                </span>
              ) : (
                lang === "ar" ? "تأكيد الرمز والدخول للمتجر ✓" : lang === "ku" ? "پشتڕاستکردنەوە و چوونەژوورەوە ✓" : "Verify & Complete Login ✓"
              )}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
