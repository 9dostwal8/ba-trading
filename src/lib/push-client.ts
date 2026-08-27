import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { getVapidPublicKey } from "@/lib/push.functions";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function keyToBase64(sub: PushSubscription, name: "p256dh" | "auth") {
  const raw = sub.getKey(name);
  if (!raw) return "";
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function registerSw() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/**
 * Enables/disables browser push for the signed-in user. The subscription rows
 * live in `push_subscriptions` and are keyed by the browser endpoint, so the
 * same person can allow notifications on several devices.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const supported = pushSupported();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!sub && Notification.permission === "granted");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || !user) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const { key } = await getVapidPublicKey();
      if (!key) throw new Error("Push is not configured");

      const reg = await registerSw();
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: keyToBase64(sub, "p256dh"),
          auth: keyToBase64(sub, "auth"),
          user_agent: navigator.userAgent.slice(0, 300),
          lang,
          last_seen_at: new Date().toISOString(),
        } as never,
        { onConflict: "endpoint" },
      );
      if (error) throw error;
      setEnabled(true);
      return true;
    } finally {
      setBusy(false);
    }
  }, [supported, user, lang]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, permission, enabled, busy, enable, disable };
}
