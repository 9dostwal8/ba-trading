import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  LogOut,
  MapPin,
  Package,
  PiggyBank,
  Shield,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect, type ComponentType } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { TwoFactorModal } from "@/components/profile/TwoFactorModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useMyVendor } from "@/hooks/useVendor";
import { formatPrice, useI18n } from "@/lib/i18n";
import { useMyWallet } from "@/lib/wallet";
import {
  coinsToMoney,
  formatCoins,
  REWARD_TITLE,
  useRewardSettings,
  useRewardSummary,
} from "@/lib/rewards";
import { useTotalSavings } from "@/lib/savings";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي | دنتال ستور" },
      { name: "description", content: "حسابك: البيانات، الطلبات، المحفظة وعناوين التوصيل." },
      { property: "og:title", content: "ملفي الشخصي | دنتال ستور" },
      { property: "og:description", content: "إدارة بياناتك وعناوين التوصيل والمحفظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const L = {
  editProfile: { ar: "تعديل الملف", ku: "دەستکاری پرۆفایل", en: "Edit Profile",},
  editHint: { ar: "الاسم ورقم الهاتف", ku: "ناو و ژمارەی مۆبایل", en: "Name and Phone Number",},
  panel: { ar: "لوحة التحكم", ku: "پانێڵی بەڕێوەبردن", en: "Dashboard",},
  account: { ar: "الحساب", ku: "هەژمار", en: "Account",},
  wallet: { ar: "محفظتي", ku: "جزدانی من", en: "My Wallet",},
  walletHint: { ar: "نقاط المكافأة، طرق الربح والاستبدال", ku: "خاڵ، ڕێگەی بەدەستهێنان و گۆڕین", en: "Reward points, earning and redeeming",},
  ordersHint: { ar: "متابعة كل طلباتك", ku: "بەدواداچوونی داواکارییەکانت", en: "Track all your orders",},
  addressHint: { ar: "عناوين التوصيل المحفوظة", ku: "ناونیشانەکانی گەیاندن", en: "Saved Delivery Addresses",},
  mySavings: { ar: "توفيري", ku: "پاشەکەوتەکانم", en: "My Savings",},
  mySavingsHint: { ar: "كل ما وفّرته من عروض ونقاط ومفاجآت", ku: "هەموو ئەو پاشەکەوتەی لە ئۆفەر و خاڵ و سەرپرایزەکان بەدەستهێناوە", en: "Everything you saved from offers, points and surprises",},
  savingsCTA: { ar: "شوف التفاصيل", ku: "وردەکاری ببینە", en: "View details",},
  savingsTotal: { ar: "مجموع التوفير", ku: "کۆی پاشەکەوت", en: "Total saved",},
};

function ProfilePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { data: vendor } = useMyVendor(user?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: rewardSettings } = useRewardSettings();
  const walletOn = rewardSettings?.rewards_enabled === true;
  const { data: wallet } = useMyWallet(user?.id, walletOn);
  const { data: rewardSummary } = useRewardSummary(user?.id, walletOn);
  const rate = Number(
    rewardSummary?.points_per_1000_iqd || rewardSettings?.points_per_1000_iqd || 0,
  );
  const balanceValue = coinsToMoney(Number(rewardSummary?.balance || 0), rate);
  const { breakdown } = useTotalSavings(user?.id, balanceValue);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });

  // Automatically route Admins to dedicated Admin Profile
  useEffect(() => {
    if (user && isAdmin === true) {
      navigate({ to: "/admin/profile", replace: true });
    }
  }, [user, isAdmin, navigate]);

  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !vendor,
    queryFn: async () =>
      (await supabase.from("addresses").select("id").order("is_default", { ascending: false }))
        .data ?? [],
  });

  const [show2FaModal, setShow2FaModal] = useState(false);
  const { data: mfaActive, refetch: refetchMfa } = useQuery({
    queryKey: ["mfa-factors", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        return Boolean(data?.totp?.some((f) => f.status === "verified"));
      } catch {
        return false;
      }
    },
  });




  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <StoreLayout>
      <PageBlocks page="profile" />
      <div className="mx-auto max-w-3xl space-y-3 bg-secondary/40 p-4 pb-12 sm:space-y-4 sm:p-6">
        {/* Identity */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary sm:size-16">
            <UserRound className="size-7" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold leading-tight sm:text-xl">
              {profile?.full_name || t("profile")}
            </p>
            <p className="truncate text-sm text-muted-foreground sm:text-base" dir="ltr">
              {profile?.phone || user?.email || "—"}
            </p>
          </div>
          <button
            onClick={signOut}
            aria-label={t("signOut")}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive"
          >
            <LogOut className="size-5" />
          </button>
        </div>

        {/* Panel access — admin / vendor only */}
        {(vendor || isAdmin) && (
          <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-card">
            <p className="bg-primary/10 px-4 py-2 text-sm font-extrabold text-primary">
              {L.panel[lang]}
            </p>
            <div className="divide-y divide-border/50">
              {vendor && <RowLink to="/brand" icon={Store} label={t("brandPortal")} />}
              {isAdmin && <RowLink to="/admin/dashboard" icon={Shield} label={t("dashboard")} />}
            </div>
          </div>
        )}

        {/* My Savings — dentists only */}
        {!isAdmin && !vendor && (
          <Link
            to="/savings"
            className="relative isolate block overflow-hidden rounded-2xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep,var(--primary))] p-4 text-[var(--primary-foreground)] shadow-card"
          >
            <PiggyBank className="pointer-events-none absolute -bottom-2 -end-2 size-20 opacity-10" />
            <div className="relative z-10 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-foreground)]/20">
                <TrendingDown className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold opacity-90">{L.savingsTotal[lang]}</p>
                <p className="font-display text-2xl font-black leading-tight">
                  {formatPrice(breakdown.total, lang)}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold opacity-80">
                  {L.mySavingsHint[lang]}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--primary-foreground)] px-2.5 py-1 text-xs font-extrabold text-[var(--primary)]">
                <Tag className="size-3.5" />
                {L.savingsCTA[lang]}
              </span>
            </div>
          </Link>
        )}

        {/* Every section is its own page */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
          <p className="bg-secondary/60 px-4 py-2 text-sm font-extrabold text-muted-foreground">
            {L.account[lang]}
          </p>
          <div className="divide-y divide-border/50">
            <RowLink
              to="/profile/edit"
              icon={UserRound}
              label={L.editProfile[lang]}
              hint={L.editHint[lang]}
            />
            <button
              type="button"
              onClick={() => setShow2FaModal(true)}
              className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 text-start hover:bg-secondary/40 transition"
            >
              <ShieldCheck className="size-5 text-primary" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-bold text-foreground">
                    {lang === "ar"
                      ? "المصادقة الثنائية (Google Authenticator)"
                      : lang === "ku"
                        ? "پشتڕاستکردنەوەی دوو قۆناغی (2FA)"
                        : "Two-Factor Auth (2FA)"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      mfaActive
                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {mfaActive
                      ? (lang === "ar" ? "مفعل" : lang === "ku" ? "چالاکە" : "Active")
                      : (lang === "ar" ? "غير مفعل" : lang === "ku" ? "ناچالاکە" : "Off")}
                  </span>
                </div>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {lang === "ar"
                    ? "حماية الحساب بتطبيق Google Authenticator"
                    : lang === "ku"
                      ? "پاراستنی هەژمار بە ئەپی Google Authenticator"
                      : "Protect account with Google Authenticator"}
                </p>
              </div>
              <ChevronLeft className="size-5 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
            </button>
            {!vendor && (
              <RowLink
                to="/orders"
                icon={Package}
                label={t("myOrders")}
                hint={L.ordersHint[lang]}
              />
            )}
            {walletOn && !isAdmin && !vendor && (
              <RowLink
                to="/profile/wallet"
                icon={Sparkles}
                label={REWARD_TITLE[lang]}
                hint={L.walletHint[lang]}
                badge={formatCoins(wallet?.balance ?? 0, lang)}
              />
            )}
            {!vendor && (
              <RowLink
                to="/profile/addresses"
                icon={MapPin}
                label={t("myAddresses")}
                hint={L.addressHint[lang]}
                badge={String(addresses?.length ?? 0)}
              />
            )}




            <button
              onClick={signOut}
              className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 text-start"
            >
              <LogOut className="size-5 text-destructive" />
              <span className="min-w-0 truncate text-base font-bold text-destructive">
                {t("signOut")}
              </span>
              <ChevronLeft className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
      <TwoFactorModal
        open={show2FaModal}
        onOpenChange={setShow2FaModal}
        onStatusChange={() => refetchMfa()}
      />
      <PageBlocks page="profile" position="bottom" />
    </StoreLayout>
  );
}

function RowLink({
  to,
  icon: Icon,
  label,
  hint,
  badge,
}: {
  to: "/orders" | "/brand" | "/admin" | "/admin/dashboard" | "/profile/edit" | "/profile/wallet" | "/profile/addresses";
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
    >
      <Icon className="size-5 text-foreground/80" />
      <span className="min-w-0">
        <span className="block truncate text-base font-bold">{label}</span>
        {hint ? (
          <span className="block truncate text-xs text-muted-foreground sm:text-sm">{hint}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {badge ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary sm:text-sm">
            {badge}
          </span>
        ) : null}
        <ChevronLeft className="size-5 text-muted-foreground" />
      </span>
    </Link>
  );
}
