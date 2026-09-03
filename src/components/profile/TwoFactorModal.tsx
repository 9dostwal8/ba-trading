import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

interface TwoFactorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (isActive: boolean) => void;
}

export function TwoFactorModal({ open, onOpenChange, onStatusChange }: TwoFactorModalProps) {
  const { lang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  // Enrollment State
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Unenroll State
  const [disabling, setDisabling] = useState(false);

  // Fetch current factors
  const fetchFactors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data?.totp?.find((f) => f.status === "verified");
      setActiveFactorId(verified ? verified.id : null);
      onStatusChange?.(Boolean(verified));
    } catch (err: any) {
      console.error("Failed to list MFA factors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFactors();
      setEnrolling(false);
      setVerifyCode("");
    }
  }, [open]);

  // Start Enrollment
  const handleStartEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "BA Trading",
        friendlyName: "Google Authenticator",
      });

      if (error) throw error;
      if (!data) throw new Error("No enrollment data returned");

      setFactorId(data.id);
      setSecret(data.totp.secret);

      // Generate QR Code data URL
      const uri = data.totp.uri;
      const qr = await QRCode.toDataURL(uri, {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      setQrSrc(qr);
      setEnrolling(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start 2FA enrollment");
    } finally {
      setLoading(false);
    }
  };

  // Verify and Confirm 2FA
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !verifyCode.trim()) return;

    setVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verifyRes = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode.trim(),
      });

      if (verifyRes.error) throw verifyRes.error;

      toast.success(
        lang === "ar"
          ? "تم تفعيل المصادقة الثنائية (Google Authenticator) بنجاح!"
          : lang === "ku"
            ? "پشتڕاستکردنەوەی دوو قۆناغی (Google Authenticator) بە سەرکەوتوویی چالاک کرا!"
            : "Google Authenticator 2FA activated successfully!"
      );

      setActiveFactorId(factorId);
      setEnrolling(false);
      onStatusChange?.(true);
    } catch (err: any) {
      toast.error(
        lang === "ar"
          ? "رمز التحقق غير صحيح، تأكد من الساعة في هاتفك وأعد المحاولة"
          : lang === "ku"
            ? "کۆدی پشکنین هەڵەیە، کاتی مۆبایلەکەت بپشکنە و دووبارە هەوڵ بدەوە"
            : "Invalid code. Please check the 6 digits on your phone and try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!activeFactorId) return;
    const confirmMsg =
      lang === "ar"
        ? "هل أنت متأكد من رغبتك في إيقاف المصادقة الثنائية؟ سيقل مستوى أمان حسابك."
        : lang === "ku"
          ? "ئایا دڵنیایت دەتەوێت پشتڕاستکردنەوەی دوو قۆناغی بکوژێنیتەوە؟ ئاستی پاراستنی هەژمارەکەت کەم دەبێتەوە."
          : "Are you sure you want to disable 2FA? This lowers your account security.";

    if (!window.confirm(confirmMsg)) return;

    setDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactorId });
      if (error) throw error;

      toast.info(
        lang === "ar"
          ? "تم إيقاف المصادقة الثنائية"
          : lang === "ku"
            ? "پشتڕاستکردنەوەی دوو قۆناغی کوژایەوە"
            : "2FA has been disabled"
      );

      setActiveFactorId(null);
      setEnrolling(false);
      onStatusChange?.(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to disable 2FA");
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info(
      lang === "ar" ? "تم نسخ الرمز السري" : lang === "ku" ? "کۆدی نهێنی کۆپیکرا" : "Secret code copied"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl sm:rounded-3xl border border-border/80 shadow-2xl overflow-hidden">
        <DialogHeader className="text-start">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {lang === "ar"
                  ? "المصادقة الثنائية (Google Authenticator)"
                  : lang === "ku"
                    ? "پشتڕاستکردنەوەی دوو قۆناغی (Google Authenticator)"
                    : "Two-Factor Authentication (2FA)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "حماية حسابك برمز أمان يتجدد كل 30 ثانية في هاتفك"
                  : lang === "ku"
                    ? "پاراستنی هەژمارەکەت بە کۆدێک کە هەر 30 چرکە جارێک لە مۆبایلەکەتدا نوێ دەبێتەوە"
                    : "Protect your account with a time-based code from your mobile"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <span className="text-xs font-bold text-muted-foreground">
              {lang === "ar" ? "جاري التحقق من الإعدادات..." : lang === "ku" ? "پشکنینی ڕێکخستنەکان..." : "Checking security settings..."}
            </span>
          </div>
        ) : activeFactorId ? (
          // Status: 2FA is currently ACTIVE
          <div className="py-4 space-y-5">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <CheckCircle2 className="size-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-start">
                <p className="font-extrabold text-sm text-emerald-950 dark:text-emerald-100">
                  {lang === "ar" ? "المصادقة الثنائية مفعّلة ونشطة" : lang === "ku" ? "پشتڕاستکردنەوەی دوو قۆناغی چالاکە" : "2FA is Active and Protecting You"}
                </p>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-1 leading-relaxed">
                  {lang === "ar"
                    ? "حسابك محمي بواسطة تطبيق Google Authenticator. في كل تسجيل دخول سيُطلب الرمز المكون من 6 أرقام."
                    : lang === "ku"
                      ? "هەژمارەکەت پارێزراوە بە Google Authenticator. لە هەر چوونەژوورەوەیەکدا کۆدی 6 ژمارەیی پێویست دەبێت."
                      : "Your account is secured with Google Authenticator. A 6-digit code will be required when logging in."}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisable2FA}
                disabled={disabling}
                className="w-full font-bold text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl"
              >
                <Trash2 className="size-4 me-1.5" />
                {disabling
                  ? (lang === "ar" ? "جاري الإيقاف..." : lang === "ku" ? "کوژاندنەوە..." : "Disabling...")
                  : (lang === "ar" ? "إيقاف المصادقة الثنائية" : lang === "ku" ? "کوژاندنەوەی 2FA" : "Disable 2FA")}
              </Button>
              <Button
                variant="default"
                onClick={() => onOpenChange(false)}
                className="w-full font-bold rounded-xl"
              >
                {lang === "ar" ? "تم" : lang === "ku" ? "تەواو" : "Done"}
              </Button>
            </div>
          </div>
        ) : enrolling && qrSrc ? (
          // Status: Setting up 2FA (QR Code and Verification)
          <form onSubmit={handleVerifyCode} className="py-2 space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-muted/30 p-4 text-center space-y-3">
              <p className="text-xs font-bold text-foreground">
                {lang === "ar"
                  ? "1. افتح تطبيق Google Authenticator في هاتفك وامسح رمز QR:"
                  : lang === "ku"
                    ? "1. ئەپی Google Authenticator بکەرەوە و ئەم کۆدە QR سکان بکە:"
                    : "1. Open Google Authenticator on your phone & scan this QR code:"}
              </p>

              {/* QR Image */}
              <div className="mx-auto w-48 h-48 bg-white p-2 rounded-2xl shadow-md border border-border/60 flex items-center justify-center">
                <img src={qrSrc} alt="2FA QR Code" className="w-full h-full object-contain" />
              </div>

              {/* Secret code backup */}
              {secret && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    {lang === "ar" ? "أو أدخل المفتاح يدوياً إذا تعذر المسح:" : lang === "ku" ? "یان کۆدەکە بنووسە بە دەست ئەگەر کامێرا نەیکردەوە:" : "Or enter this secret key manually:"}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-mono font-bold tracking-wider select-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="p-1 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
                    >
                      {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Enter 6 digits */}
            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-foreground">
                {lang === "ar"
                  ? "2. اكتب الرمز الظاهر في التطبيق (6 أرقام):"
                  : lang === "ku"
                    ? "2. ئەو 6 ژمارەیەی لە ئەپەکەدا دیارە بنووسە:"
                    : "2. Enter the 6-digit code shown in the app:"}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="h-12 text-center text-xl font-mono font-black tracking-widest rounded-xl"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEnrolling(false)}
                className="w-1/3 font-bold rounded-xl"
              >
                {lang === "ar" ? "إلغاء" : lang === "ku" ? "پاشگەزبوونەوە" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={verifying || verifyCode.length < 6}
                className="w-2/3 font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                {verifying
                  ? (lang === "ar" ? "جاري التأكيد..." : lang === "ku" ? "پشکنین..." : "Verifying...")
                  : (lang === "ar" ? "تأكيد وتفعيل 2FA" : lang === "ku" ? "چالاککردنی 2FA" : "Confirm & Enable")}
              </Button>
            </div>
          </form>
        ) : (
          // Status: Not Enrolled -> Prompt to Enable
          <div className="py-4 space-y-4 text-center">
            <div className="mx-auto size-16 rounded-3xl bg-primary/10 grid place-items-center text-primary shadow-inner">
              <Smartphone className="size-8" />
            </div>

            <div className="space-y-1 text-start">
              <h3 className="font-extrabold text-sm text-foreground">
                {lang === "ar" ? "لماذا يجب تفعيل المصادقة الثنائية؟" : lang === "ku" ? "بۆچی پێویستە 2FA چالاک بکەیت؟" : "Why enable 2FA?"}
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
                <li>
                  {lang === "ar"
                    ? "حماية حسابك حتى لو تم تسريب أو سرقة كلمة المرور."
                    : lang === "ku"
                      ? "پاراستنی هەژمارەکەت تەنانەت ئەگەر وشەی نهێنی دزرا بێت."
                      : "Prevents unauthorized access even if your password is leaked."}
                </li>
                <li>
                  {lang === "ar"
                    ? "الرمز يتجدد كل 30 ثانية ويعمل بدون الحاجة لإنترنت في هاتفك."
                    : lang === "ku"
                      ? "کۆدەکە هەر 30 چرکە جارێک نوێ دەبێتەوە و بەبێ ئینتەرنێت کاردەکات."
                      : "Codes regenerate every 30s and work 100% offline on your phone."}
                </li>
              </ul>
            </div>

            <Button
              onClick={handleStartEnroll}
              className="w-full h-11 font-black rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg mt-2"
            >
              <QrCode className="size-4 me-2" />
              {lang === "ar"
                ? "توليد رمز QR والبدء بالتفعيل"
                : lang === "ku"
                  ? "دروستکردنی کۆدی QR و دەستپێکردن"
                  : "Generate QR Code & Setup 2FA"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
