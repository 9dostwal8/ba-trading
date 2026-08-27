import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgePercent, Coins, PiggyBank, Sparkles, Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, useI18n } from "@/lib/i18n";
import { coinsToMoney, useRewardSettings, useRewardSummary } from "@/lib/rewards";
import { useTotalSavings } from "@/lib/savings";

const L = {
  hi: { ar: "أهلاً", ku: "بەخێربێی", en: "Welcome" },
  doctor: { ar: "د.", ku: "د.", en: "Dr." },
  total: { ar: "مجموع توفيرك", ku: "کۆی پاشەکەوتت", en: "Total savings" },
  thanks: { ar: "شكراً لكونك معنا 🦷", ku: "سوپاس بۆ بەشداریت 🦷", en: "Thanks for being with us 🦷" },
  offers: { ar: "خصومات", ku: "داشکاندن", en: "Discounts" },
  compare: { ar: "فرق السعر", ku: "جیاوازی نرخ", en: "Price gap" },
  used: { ar: "نقاط مستخدمة", ku: "خاڵی بەکارهاتوو", en: "Points used" },
  balance: { ar: "قيمة نقاطك", ku: "بەهای خاڵەکانت", en: "Points value" },
  more: { ar: "تفاصيل توفيرك", ku: "وردەکاری پاشەکەوتت", en: "Savings details" },
  hide: { ar: "إخفاء", ku: "شاردنەوە", en: "Hide" },
};

const SHOW_MS = 5 * 60 * 1000;

/** Compact savings card: shows for 5 minutes after login, dismissible, returns next session. */
export function SavingsHero() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const storeKey = user ? `savings-hero-hidden:${user.id}` : "";
  const startKey = user ? `savings-hero-start:${user.id}` : "";

  useEffect(() => {
    if (!storeKey || !startKey) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (sessionStorage.getItem(storeKey) === "1") {
        setHidden(true);
        return;
      }
      const saved = Number(sessionStorage.getItem(startKey) || 0);
      const start = saved > 0 ? saved : Date.now();
      if (!saved) sessionStorage.setItem(startKey, String(start));
      const left = start + SHOW_MS - Date.now();
      if (left <= 0) {
        setHidden(true);
        return;
      }
      setHidden(false);
      timer = setTimeout(() => setHidden(true), left);
    } catch {
      setHidden(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [storeKey, startKey]);

  const { data: settings } = useRewardSettings();
  const { data: summary } = useRewardSummary(user?.id);
  const rate = Number(summary?.points_per_1000_iqd || settings?.points_per_1000_iqd || 0);
  const balanceValue = coinsToMoney(Number(summary?.balance || 0), rate);
  const { breakdown } = useTotalSavings(user?.id, balanceValue);
  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name: string } | null;
    },
  });

  if (!user || hidden) return null;
  const name = (profile?.full_name || "").trim();
  const rows = [
    { icon: Tag, label: L.offers[lang], value: breakdown.offers },
    { icon: BadgePercent, label: L.compare[lang], value: breakdown.comparePrice },
    { icon: Coins, label: L.used[lang], value: breakdown.pointsUsed },
    { icon: Sparkles, label: L.balance[lang], value: breakdown.pointsBalanceValue },
  ];

  const hide = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(storeKey, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="px-3 pt-3">
      <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary-deep,var(--primary))] to-[var(--primary)] p-3 text-[var(--primary-foreground)] shadow-md">
        <PiggyBank className="pointer-events-none absolute -bottom-3 -end-2 size-20 opacity-10" />

        <div className="relative z-10 flex items-center gap-2">
          <PiggyBank className="size-4 shrink-0 opacity-90" />
          <p className="min-w-0 flex-1 truncate text-[12px] font-extrabold">
            {L.hi[lang]} {name ? `${L.doctor[lang]} ${name}` : ""} — {L.thanks[lang]}
          </p>
          <button
            type="button"
            onClick={hide}
            aria-label={L.hide[lang]}
            className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--primary-foreground)]/20 active:scale-95"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="relative z-10 mt-2 space-y-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-[11.5px] font-bold">
              <r.icon className="size-3.5 shrink-0 opacity-80" />
              <span className="min-w-0 flex-1 truncate opacity-85">{r.label}</span>
              <span className="shrink-0 font-extrabold">{formatPrice(r.value, lang)}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-2 flex items-center gap-2 border-t border-[var(--primary-foreground)]/25 pt-2">
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-extrabold">
            {L.total[lang]}
          </span>
          <span className="font-display text-[19px] font-extrabold leading-none">
            {formatPrice(breakdown.total, lang)}
          </span>
        </div>

        <Link
          to="/savings"
          className="relative z-10 mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-foreground)] px-2.5 py-1.5 text-[11.5px] font-extrabold text-[var(--primary)] active:scale-95"
        >
          <Sparkles className="size-3.5" />
          {L.more[lang]}
        </Link>
      </div>
    </div>
  );
}
