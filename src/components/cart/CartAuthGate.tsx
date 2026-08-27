import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Lock, LogIn, Phone, User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const PHONE_DOMAIN = "dentalstore.app";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

type Txt = { ar: string; ku: string; en: string };
const C = {
  title: {
    ar: "سجّل الدخول لإكمال الطلب",
    ku: "بچۆ ژوورەوە بۆ تەواوکردنی داواکاری",
    en: "Sign in to finish your order",
  },
  sub: {
    ar: "سلتك محفوظة — ثانية واحدة بالموبايل وكلمة المرور.",
    ku: "سەبەتەت پاشەکەوتە — تەنها مۆبایل و وشەی نهێنی.",
    en: "Your cart is saved — just your mobile and password.",
  },
  signIn: { ar: "دخول", ku: "چوونەژوورەوە", en: "Sign in" },
  signUp: { ar: "حساب جديد", ku: "هەژماری نوێ", en: "New account" },
  name: { ar: "الاسم / العيادة", ku: "ناو / کلینیک", en: "Name / clinic" },
  badPhone: { ar: "رقم الموبايل غير صحيح", ku: "ژمارەی مۆبایل هەڵەیە", en: "Invalid mobile number" },
  badPass: {
    ar: "كلمة المرور 6 أحرف على الأقل",
    ku: "وشەی نهێنی ٦ پیت",
    en: "Password must be 6+ characters",
  },
  needName: { ar: "الاسم مطلوب", ku: "ناو پێویستە", en: "Name is required" },
  exists: {
    ar: "هذا الرقم مسجل، سجّل الدخول",
    ku: "ئەم ژمارە تۆمارکراوە، بچۆ ژوورەوە",
    en: "This number exists — sign in instead",
  },
  done: { ar: "تم تسجيل الدخول", ku: "چوویتە ژوورەوە", en: "Signed in" },
};

/**
 * Blurs the checkout details for guests and offers a quick inline
 * phone + password sign in / sign up right inside the cart.
 */
export function CartAuthGate({ locked, children }: { locked: boolean; children: ReactNode }) {
  const { lang, t } = useI18n();
  const tx = (v: Txt) => (lang === "ku" ? v.ku : lang === "en" ? v.en : v.ar);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  if (!locked) return <>{children}</>;

  async function submit() {
    const p = normalizePhone(phone);
    if (p.length < 9) {
      toast.error(tx(C.badPhone));
      return;
    }
    if (password.length < 6) {
      toast.error(tx(C.badPass));
      return;
    }
    if (mode === "up" && fullName.trim().length < 2) {
      toast.error(tx(C.needName));
      return;
    }
    const email = `${p}@${PHONE_DOMAIN}`;
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), phone: p },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            setMode("in");
            toast.error(tx(C.exists));
            return;
          }
          throw error;
        }
        if (!data.session) {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
          if (e2) throw e2;
        }
      }
      toast.success(tx(C.done));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1">
      <div
        aria-hidden
        className="pointer-events-none col-start-1 row-start-1 select-none overflow-hidden blur-[6px] saturate-50 opacity-50"
      >
        {children}
      </div>

      <div className="col-start-1 row-start-1 grid place-items-center p-2">
        <div className="w-full max-w-[22rem] rounded-2xl border-2 border-dashed border-primary/50 bg-card/95 p-3 shadow-lg backdrop-blur-sm">

          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Lock className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold leading-tight">{tx(C.title)}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-muted-foreground">
                {tx(C.sub)}
              </p>
            </div>
          </div>

          <div className="seg mt-3">
            <button data-on={mode === "in"} className="seg-item" onClick={() => setMode("in")}>
              {tx(C.signIn)}
            </button>
            <button data-on={mode === "up"} className="seg-item" onClick={() => setMode("up")}>
              {tx(C.signUp)}
            </button>
          </div>

          <div className="mt-2.5 space-y-2">
            {mode === "up" && (
              <div>
                <Label className="text-[11px] font-extrabold">{tx(C.name)}</Label>
                <div className="field mt-1">
                  <User className="size-4" />
                  <Input
                    className="h-11 rounded-lg text-[14px]"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div>
              <Label className="text-[11px] font-extrabold">{t("mobile")}</Label>
              <div className="field mt-1">
                <Phone className="size-4" />
                <Input
                  className="h-11 rounded-lg text-[14px]"
                  inputMode="tel"
                  dir="ltr"
                  autoComplete="tel"
                  placeholder="0770 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-extrabold">{t("password")}</Label>
              <div className="field mt-1">
                <Lock className="size-4" />
                <Input
                  className="h-11 rounded-lg pe-11 text-[14px]"
                  type={show ? "text" : "password"}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button
              className="h-11 w-full rounded-lg text-[13.5px] font-extrabold"
              disabled={busy}
              onClick={submit}
            >
              {mode === "in" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
              {mode === "in" ? tx(C.signIn) : tx(C.signUp)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
