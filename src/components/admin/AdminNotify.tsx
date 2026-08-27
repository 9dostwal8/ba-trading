import { useMutation, useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminCard, Field, SectionHeader, TextField } from "@/components/admin/AdminKit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { sendPush } from "@/lib/push.functions";
import { PushToggle } from "@/components/PushToggle";
import { cn } from "@/lib/utils";

const L = {
  title: { ar: "إرسال إشعار", ku: "ناردنی ئاگاداری", en: "Send notification" },
  audience: { ar: "المستلمون", ku: "وەرگرەکان", en: "Recipients" },
  all: { ar: "الجميع", ku: "هەموو", en: "Everyone" },
  dentists: { ar: "الأطباء", ku: "پزیشکان", en: "Dentists" },
  vendors: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors" },
  admins: { ar: "الإدارة", ku: "بەڕێوەبەران", en: "Admins" },
  oneVendor: { ar: "بائع محدد", ku: "فرۆشیارێکی دیاریکراو", en: "One vendor" },
  pickVendor: { ar: "اختر البائع", ku: "فرۆشیار هەڵبژێرە", en: "Pick vendor" },
  titleAr: { ar: "العنوان (عربي)", ku: "ناونیشان (عەرەبی)", en: "Title (Arabic)" },
  titleKu: { ar: "العنوان (كردي)", ku: "ناونیشان (کوردی)", en: "Title (Kurdish)" },
  titleEn: { ar: "العنوان (إنجليزي)", ku: "ناونیشان (ئینگلیزی)", en: "Title (English)" },
  bodyAr: { ar: "النص (عربي)", ku: "دەق (عەرەبی)", en: "Message (Arabic)" },
  bodyKu: { ar: "النص (كردي)", ku: "دەق (کوردی)", en: "Message (Kurdish)" },
  bodyEn: { ar: "النص (إنجليزي)", ku: "دەق (ئینگلیزی)", en: "Message (English)" },
  link: { ar: "الرابط داخل التطبيق", ku: "لینک لە ناو ئەپ", en: "In-app link" },
  send: { ar: "إرسال", ku: "ناردن", en: "Send" },
  sending: { ar: "جارٍ الإرسال…", ku: "دەنێردرێت…", en: "Sending…" },
  needTitle: { ar: "اكتب العنوان أولاً", ku: "سەرەتا ناونیشان بنووسە", en: "Write a title first" },
  done: { ar: "تم الإرسال إلى", ku: "نێردرا بۆ", en: "Sent to" },
  users: { ar: "مستخدم", ku: "بەکارهێنەر", en: "users" },
  hint: {
    ar: "الأطباء فقط يمكنهم الشراء، البائعون يديرون متاجرهم.",
    ku: "تەنها پزیشکان دەتوانن بکڕن، فرۆشیارەکان فرۆشگای خۆیان بەڕێوە دەبەن.",
    en: "Dentists can buy, vendors manage their stores.",
  },
  quick: { ar: "روابط سريعة", ku: "لینکی خێرا", en: "Quick links" },
  pushed: { ar: "وإشعار جهاز إلى", ku: "و ئاگاداری ئامێر بۆ", en: "and device push to" },
};

type Audience = "all" | "dentists" | "vendors" | "admins" | "vendor";

export function AdminNotify() {
  const { lang } = useI18n();
  const [audience, setAudience] = useState<Audience>("all");
  const [vendorId, setVendorId] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleKu, setTitleKu] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyKu, setBodyKu] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [link, setLink] = useState("/rewards");

  const { data: vendors } = useQuery({
    queryKey: ["notify-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_broadcast_notification", {
        _audience: audience,
        _title_ar: titleAr,
        _title_ku: titleKu,
        _title_en: titleEn,
        _body_ar: bodyAr,
        _body_ku: bodyKu,
        _body_en: bodyEn,
        _link: link,
        ...(audience === "vendor" && vendorId ? { _vendor_id: vendorId } : {}),
        _kind: "announcement",
      });
      if (error) throw error;

      // Also deliver a real device push to whoever allowed notifications.
      let pushed = 0;
      try {
        const r = await sendPush({
          data: {
            audience,
            vendorId: audience === "vendor" ? vendorId : null,
            title_ar: titleAr,
            title_ku: titleKu,
            title_en: titleEn,
            body_ar: bodyAr,
            body_ku: bodyKu,
            body_en: bodyEn,
            link: link || "/notifications",
            origin: window.location.origin,
          },
        });
        pushed = r.sent;
      } catch {
        // In-app notifications already landed; push is best-effort.
      }
      return { count: (data as number) ?? 0, pushed };
    },
    onSuccess: ({ count, pushed }) => {
      toast.success(
        `${L.done[lang]} ${count} ${L.users[lang]}${pushed ? ` · ${L.pushed[lang]} ${pushed}` : ""}`,
      );
      setTitleAr("");
      setTitleKu("");
      setTitleEn("");
      setBodyAr("");
      setBodyKu("");
      setBodyEn("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const audiences: { key: Audience; label: string }[] = [
    { key: "all", label: L.all[lang] },
    { key: "dentists", label: L.dentists[lang] },
    { key: "vendors", label: L.vendors[lang] },
    { key: "admins", label: L.admins[lang] },
    { key: "vendor", label: L.oneVendor[lang] },
  ];

  const quickLinks = ["/rewards", "/offers", "/deals", "/products", "/expiring", "/brand", "/admin"];

  const canSend = !!(titleAr || titleKu || titleEn) && !(audience === "vendor" && !vendorId);

  return (
    <div className="space-y-3">
      <SectionHeader title={L.title[lang]} />
      <PushToggle />
      <AdminCard>
        <p className="mb-2 text-[11px] text-muted-foreground">{L.hint[lang]}</p>

        <Field label={L.audience[lang]}>
          <div className="flex flex-wrap gap-1.5">
            {audiences.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAudience(a.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
                  audience === a.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Field>

        {audience === "vendor" && (
          <div className="mt-2">
            <Field label={L.pickVendor[lang]}>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px]"
              >
                <option value="">—</option>
                {(vendors ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <div className="mt-3 grid gap-2">
          <TextField label={L.titleAr[lang]} value={titleAr} onChange={setTitleAr} />
          <TextField label={L.titleKu[lang]} value={titleKu} onChange={setTitleKu} />
          <TextField label={L.titleEn[lang]} value={titleEn} onChange={setTitleEn} />
          <Field label={L.bodyAr[lang]}>
            <Textarea rows={2} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} />
          </Field>
          <Field label={L.bodyKu[lang]}>
            <Textarea rows={2} value={bodyKu} onChange={(e) => setBodyKu(e.target.value)} />
          </Field>
          <Field label={L.bodyEn[lang]}>
            <Textarea rows={2} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
          </Field>
          <TextField label={L.link[lang]} value={link} onChange={setLink} />
          <div className="flex flex-wrap gap-1.5">
            {quickLinks.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setLink(q)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                  link === q ? "border-primary text-primary" : "border-border text-muted-foreground",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="mt-3 w-full gap-2"
          disabled={!canSend || send.isPending}
          onClick={() => (canSend ? send.mutate() : toast.error(L.needTitle[lang]))}
        >
          <Send className="size-4" />
          {send.isPending ? L.sending[lang] : L.send[lang]}
        </Button>
      </AdminCard>
    </div>
  );
}
