import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export type WalletTxKind =
  | "admin_credit"
  | "admin_debit"
  | "card_redeem"
  | "order_payment"
  | "earn_purchase"
  | "earn_first_order"
  | "earn_review"
  | "earn_referral"
  | "earn_streak"
  | "earn_challenge"
  | "earn_profile"
  | "spend_order"
  | "refund";

export const TX_LABELS: Record<string, { ar: string; ku: string; en: string }> = {
  admin_credit: { ar: "نقاط من الإدارة", ku: "خاڵ لە بەڕێوەبەری", en: "Points from admin",},
  admin_debit: { ar: "خصم نقاط من الإدارة", ku: "کەمکردنی خاڵ لە بەڕێوەبەری", en: "Points deducted by admin",},
  card_redeem: { ar: "تفعيل كارت نقاط", ku: "چالاککردنی کارتی خاڵ", en: "Points card activated",},
  order_payment: { ar: "دفع طلب بالنقاط", ku: "پارەدانی داواکاری بە خاڵ", en: "Order paid with points",},
  spend_order: { ar: "استبدال نقاط بخصم على الطلب", ku: "گۆڕینی خاڵ بە داشکاندن", en: "Points redeemed on order",},
  earn_purchase: { ar: "نقاط من الشراء", ku: "خاڵ لە کڕین", en: "Coins from purchase",},
  earn_first_order: { ar: "مكافأة أول طلب", ku: "خەڵاتی یەکەم داواکاری", en: "First order bonus",},
  earn_review: { ar: "مكافأة تقييم منتج", ku: "خەڵاتی هەڵسەنگاندن", en: "Review reward",},
  earn_referral: { ar: "مكافأة دعوة زميل", ku: "خەڵاتی بانگهێشتی هاوکار", en: "Referral reward",},
  earn_streak: { ar: "مكافأة الاستمرارية", ku: "خەڵاتی بەردەوامی", en: "Buying streak reward",},
  earn_challenge: { ar: "مكافأة تحدي الشهر", ku: "خەڵاتی ئامانجی مانگانە", en: "Monthly challenge reward",},
  earn_profile: { ar: "مكافأة إكمال الملف", ku: "خەڵاتی تەواوکردنی پرۆفایل", en: "Profile completion reward",},
  refund: { ar: "إرجاع نقاط", ku: "گەڕاندنەوەی خاڵ", en: "Points refund",},
};

export const txLabel = (kind: string, lang: Lang) =>
  (TX_LABELS[kind] ?? { ar: kind, ku: kind, en: kind })[lang];


/** Human friendly card codes: no confusing 0/O/1/I characters. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCardCode(prefix = "DENT") {
  let body = "";
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 12; i++) {
    body += ALPHABET[buf[i]! % ALPHABET.length];
    if (i === 3 || i === 7) body += "-";
  }
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${body}`;
}

/** Store-level wallet switch + limits (readable by anyone via store settings). */
export function useWalletSettings() {
  return useQuery({
    queryKey: ["wallet-settings"],
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("wallet_enabled, wallet_max_balance, wallet_note_ar, wallet_note_ku")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

/** Current user's balance (auto-creates the wallet row on first read). */
export function useMyWallet(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ["my-wallet", userId],
    enabled: Boolean(userId) && enabled,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data: balance, error } = await supabase.rpc("wallet_my_balance");
      if (error) throw error;
      const [wallet, txs] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", userId!).maybeSingle(),
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      return {
        balance: Number(balance ?? 0),
        frozen: wallet.data?.is_frozen ?? false,
        transactions: txs.data ?? [],
      };
    },
  });
}

/** Full dated statement for the signed-in user: every credit / spend with notes. */
export function useMyWalletLedger(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ["my-wallet-ledger", userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("id, kind, amount, balance_after, note, ref_id, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      const rows = data ?? [];
      const credited = rows
        .filter((r) => Number(r.amount) > 0)
        .reduce((n, r) => n + Number(r.amount), 0);
      const spent = rows
        .filter((r) => Number(r.amount) < 0)
        .reduce((n, r) => n + Math.abs(Number(r.amount)), 0);
      return { rows, credited, spent };
    },
  });
}

/** "2026-08-22" bucket key in the viewer's local time. */
export const dayKey = (iso: string) => new Date(iso).toLocaleDateString();

export function groupByDay<T extends { created_at: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = dayKey(r.created_at);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return [...map.entries()];
}
