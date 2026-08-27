import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Lang } from "@/lib/i18n";

export type Notification = {
  id: string;
  kind: string;
  title_ar: string;
  title_ku: string;
  title_en: string;
  body_ar: string;
  body_ku: string;
  body_en: string;
  link: string;
  order_id: string | null;
  vendor_id: string | null;
  is_read: boolean;
  created_at: string;
};

/** Picks the notification text for the active language, falling back sensibly. */
export function notifText(
  row: { ar: string; ku: string; en: string },
  lang: Lang,
): string {
  const v = lang === "ku" ? row.ku : lang === "en" ? row.en : row.ar;
  return v || row.ar || row.en || row.ku || "";
}

export function notifTitle(n: Notification, lang: Lang) {
  return notifText({ ar: n.title_ar, ku: n.title_ku, en: n.title_en }, lang);
}

export function notifBody(n: Notification, lang: Lang) {
  return notifText({ ar: n.body_ar, ku: n.body_ku, en: n.body_en }, lang);
}

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id, is_read, created_at",
    )
    // Admins can read every row via RLS, so scope the feed to the current user
    // — otherwise the unread badge counts other people's notifications and
    // "mark all read" (which only touches own rows) can never clear it.
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

/** Live-ish notification feed for the signed-in user (polls every 30s). */
export function useNotifications() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["notifications", user?.id ?? "anon"],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const items = q.data ?? [];
  return { ...q, items, unread: items.filter((n) => !n.is_read).length };
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return async (ids?: string[]) => {
    const key = ["notifications", user?.id ?? "anon"];
    const idSet = ids ? new Set(ids) : null;
    // Optimistic: flip locally so the badge/rows update instantly.
    qc.setQueryData<Notification[]>(key, (prev) =>
      (prev ?? []).map((n) =>
        !idSet || idSet.has(n.id) ? { ...n, is_read: true } : n,
      ),
    );
    const { error } = await supabase.rpc(
      "notifications_mark_read",
      ids ? { _ids: ids } : {},
    );
    if (error) {
      await qc.invalidateQueries({ queryKey: key });
      throw error;
    }
    await qc.invalidateQueries({ queryKey: key });
  };
}


/** Relative "x minutes ago" label in the active language. */
export function timeAgo(iso: string, lang: Lang) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  const tx = (ar: string, ku: string, en: string) =>
    lang === "ku" ? ku : lang === "en" ? en : ar;
  if (min < 1) return tx("الآن", "ئێستا", "just now");
  if (min < 60) return `${min} ${tx("دقيقة", "خولەک", "min ago")}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ${tx("ساعة", "کاتژمێر", "h ago")}`;
  const d = Math.floor(hr / 24);
  return `${d} ${tx("يوم", "ڕۆژ", "d ago")}`;
}
