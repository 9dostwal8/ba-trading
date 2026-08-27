import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { usePushNotifications } from "@/lib/push-client";
import { sendPush } from "@/lib/push.functions";
import { cn } from "@/lib/utils";

const L = {
  title: { ar: "إشعارات الجهاز", ku: "ئاگادارییەکانی ئامێر", en: "Device notifications" },
  desc: {
    ar: "استلم تنبيهات الطلبات والعروض والنقاط على هذا الجهاز حتى لو كان التطبيق مغلقاً.",
    ku: "ئاگاداری داواکاری، ئۆفەر و خاڵ لەم ئامێرەدا وەربگرە، تەنانەت ئەگەر ئەپ داخرابێت.",
    en: "Get order, offer and points alerts on this device even when the app is closed.",
  },
  enable: { ar: "تشغيل الإشعارات", ku: "چالاککردنی ئاگاداری", en: "Enable notifications" },
  disable: { ar: "إيقاف على هذا الجهاز", ku: "ڕاگرتن لەم ئامێرەدا", en: "Turn off on this device" },
  on: { ar: "مُفعّل على هذا الجهاز", ku: "چالاکە لەم ئامێرەدا", en: "Enabled on this device" },
  test: { ar: "إرسال تجربة", ku: "ناردنی تاقیکردنەوە", en: "Send a test" },
  testTitle: { ar: "تجربة إشعار", ku: "تاقیکردنەوەی ئاگاداری", en: "Test notification" },
  testBody: {
    ar: "الإشعارات تعمل بنجاح 🎉",
    ku: "ئاگادارییەکان بەسەرکەوتوویی کار دەکەن 🎉",
    en: "Push notifications are working 🎉",
  },
  blocked: {
    ar: "الإشعارات محجوبة في إعدادات المتصفح. افتحها من إعدادات الموقع.",
    ku: "ئاگادارییەکان لە ڕێکخستنی وێبگەڕ بلۆک کراون. لە ڕێکخستنی سایت بکەرەوە.",
    en: "Notifications are blocked in browser settings. Allow them for this site.",
  },
  unsupported: {
    ar: "هذا المتصفح لا يدعم إشعارات الجهاز.",
    ku: "ئەم وێبگەڕە پشتگیری ئاگاداری ئامێر ناکات.",
    en: "This browser does not support device notifications.",
  },
  sent: { ar: "أُرسل", ku: "نێردرا", en: "Sent" },
};

export function PushToggle({ className }: { className?: string }) {
  const { lang } = useI18n();
  const { supported, permission, enabled, busy, enable, disable } = usePushNotifications();
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      const r = await sendPush({
        data: {
          audience: "self",
          title_ar: L.testTitle.ar,
          title_ku: L.testTitle.ku,
          title_en: L.testTitle.en,
          body_ar: L.testBody.ar,
          body_ku: L.testBody.ku,
          body_en: L.testBody.en,
          link: "/notifications",
          origin: window.location.origin,
        },
      });
      toast.success(`${L.sent[lang]} · ${r.sent}/${r.devices}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-3", className)}>
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {enabled ? <BellRing className="size-5" /> : <Bell className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold">{L.title[lang]}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {!supported
              ? L.unsupported[lang]
              : permission === "denied"
                ? L.blocked[lang]
                : enabled
                  ? L.on[lang]
                  : L.desc[lang]}
          </p>

          {supported && permission !== "denied" && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {!enabled ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    enable().catch((e: Error) => toast.error(e.message))
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[12px] font-extrabold text-primary-foreground transition active:scale-95 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
                  {L.enable[lang]}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={testing}
                    onClick={test}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[12px] font-extrabold text-primary-foreground transition active:scale-95 disabled:opacity-60"
                  >
                    {testing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <BellRing className="size-4" />
                    )}
                    {L.test[lang]}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => disable()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-bold text-muted-foreground transition active:scale-95"
                  >
                    <BellOff className="size-4" />
                    {L.disable[lang]}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
