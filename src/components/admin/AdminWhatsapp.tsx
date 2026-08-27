import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminCard, Field, SectionHeader } from "@/components/admin/AdminKit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  WA_TEMPLATES,
  fillTemplate,
  waLink,
  waNumber,
  type WaTemplateKey,
} from "@/lib/whatsapp";

const L = {
  title: { ar: "رسائل واتساب للبائعين", ku: "پەیامی واتسئاپ بۆ فرۆشیارەکان", en: "WhatsApp messages for vendors" },
  hint: {
    ar: "اختر القالب ثم المجموعة، واضغط زر واتساب بجانب كل بائع لإرسال الرسالة من هاتفك.",
    ku: "تێمپلەیت و گروپ هەڵبژێرە، پاشان کلیک لە دوگمەی واتسئاپ بکە بۆ ناردن لە مۆبایلی خۆت.",
    en: "Pick a template and a group, then tap the WhatsApp button next to each vendor to send from your phone.",
  },
  template: { ar: "القالب", ku: "تێمپلەیت", en: "Template" },
  audience: { ar: "المجموعة", ku: "گروپ", en: "Group" },
  msgLang: { ar: "لغة الرسالة", ku: "زمانی پەیام", en: "Message language" },
  message: { ar: "نص الرسالة", ku: "دەقی پەیام", en: "Message text" },
  tokens: {
    ar: "المتغيرات: {vendor} اسم البائع، {store} اسم المتجر، {count} عدد الطلبات، {amount} المبلغ، {days} أيام الخمول، {link} رابط اللوحة",
    ku: "گۆڕاوەکان: {vendor} ناوی فرۆشیار، {store} ناوی کۆگا، {count} ژمارەی داواکاری، {amount} بڕ، {days} ڕۆژی ناچالاکی، {link} لینک",
    en: "Tokens: {vendor} vendor name, {store} store name, {count} orders, {amount} amount, {days} idle days, {link} panel link",
  },
  reset: { ar: "استرجاع النص الأصلي", ku: "گەڕاندنەوەی دەقی سەرەکی", en: "Reset text" },
  all: { ar: "كل البائعين", ku: "هەموو فرۆشیارەکان", en: "All vendors" },
  withNew: { ar: "لديهم طلبات جديدة", ku: "داواکاری نوێیان هەیە", en: "With new orders" },
  idle: { ar: "غير نشطين ٣٠ يوم", ku: "٣٠ ڕۆژ ناچالاک", en: "Inactive 30+ days" },
  debt: { ar: "لم يدفعوا التسويق", ku: "پارەی ڕیکلام نەداوە", en: "Unpaid marketing" },
  vendorsCount: { ar: "بائع", ku: "فرۆشیار", en: "vendors" },
  send: { ar: "واتساب", ku: "واتسئاپ", en: "WhatsApp" },
  copy: { ar: "نسخ", ku: "کۆپی", en: "Copy" },
  copied: { ar: "تم النسخ", ku: "کۆپی کرا", en: "Copied" },
  noPhone: { ar: "لا يوجد رقم واتساب", ku: "ژمارەی واتسئاپ نییە", en: "No WhatsApp number" },
  empty: { ar: "لا يوجد بائعون في هذه المجموعة", ku: "هیچ فرۆشیارێک لەم گروپە نییە", en: "No vendors in this group" },
  newOrders: { ar: "طلبات جديدة", ku: "داواکاری نوێ", en: "new orders" },
  due: { ar: "مستحق", ku: "داواکراو", en: "due" },
  lastOrder: { ar: "آخر طلب قبل", ku: "دوا داواکاری پێش", en: "last order" },
  daysAgo: { ar: "يوم", ku: "ڕۆژ", en: "days ago" },
  never: { ar: "بلا طلبات", ku: "بێ داواکاری", en: "no orders yet" },
  preview: { ar: "معاينة", ku: "پێشبینین", en: "Preview" },
};

type Audience = "all" | "withNew" | "idle" | "debt";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  newOrders: number;
  unpaid: number;
  idleDays: number | null;
};

const DEFAULT_TPL: Record<Audience, WaTemplateKey> = {
  all: "offers",
  withNew: "newOrders",
  idle: "inactive",
  debt: "unpaid",
};

export function AdminWhatsapp() {
  const { lang } = useI18n();
  const [audience, setAudience] = useState<Audience>("withNew");
  const [tplKey, setTplKey] = useState<WaTemplateKey>("newOrders");
  const [msgLang, setMsgLang] = useState<"ar" | "ku" | "en">(lang === "en" ? "en" : lang);
  const [draft, setDraft] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["wa-vendors"],
    queryFn: async () => {
      const [vendors, items, charges, settings] = await Promise.all([
        supabase.from("vendors").select("id, name, phone, whatsapp, is_active").order("name"),
        supabase
          .from("order_items")
          .select("vendor_id, fulfillment_status, orders(created_at)")
          .not("vendor_id", "is", null),
        supabase.from("vendor_charges").select("vendor_id, amount, status"),
        supabase.from("store_settings").select("site_name_ar, site_name_ku").maybeSingle(),
      ]);
      if (vendors.error) throw vendors.error;

      const now = Date.now();
      const rows: Row[] = (vendors.data ?? []).map((v) => {
        const mine = (items.data ?? []).filter((i) => i.vendor_id === v.id);
        const newOrders = mine.filter((i) => i.fulfillment_status === "new").length;
        const times = mine
          .map((i) => {
            const o = i.orders as { created_at: string } | null;
            return o?.created_at ? new Date(o.created_at).getTime() : 0;
          })
          .filter(Boolean);
        const last = times.length ? Math.max(...times) : null;
        const unpaid = (charges.data ?? [])
          .filter((c) => c.vendor_id === v.id && c.status !== "paid")
          .reduce((s, c) => s + Number(c.amount ?? 0), 0);
        return {
          id: v.id,
          name: v.name,
          phone: v.whatsapp || v.phone || null,
          newOrders,
          unpaid,
          idleDays: last === null ? null : Math.floor((now - last) / 86_400_000),
        };
      });

      const s = settings.data as { site_name_ar?: string; site_name_ku?: string } | null;
      return {
        rows,
        storeName: (lang === "ku" ? s?.site_name_ku : s?.site_name_ar) || "OfferDent",
      };
    },
  });

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    if (audience === "withNew") return all.filter((r) => r.newOrders > 0);
    if (audience === "idle") return all.filter((r) => r.idleDays === null || r.idleDays >= 30);
    if (audience === "debt") return all.filter((r) => r.unpaid > 0);
    return all;
  }, [data, audience]);

  const baseBody = WA_TEMPLATES[tplKey].body[msgLang];
  const body = draft ?? baseBody;

  const pickAudience = (a: Audience) => {
    setAudience(a);
    setTplKey(DEFAULT_TPL[a]);
    setDraft(null);
  };

  const messageFor = (r: Row) =>
    fillTemplate(body, {
      store: data?.storeName ?? "OfferDent",
      vendor: r.name,
      count: r.newOrders,
      amount: formatPrice(r.unpaid, lang),
      days: r.idleDays ?? 30,
      link: `${typeof window === "undefined" ? "" : window.location.origin}/brand`,
    });

  const audiences: { key: Audience; label: string; n: number }[] = [
    { key: "withNew", label: L.withNew[lang], n: (data?.rows ?? []).filter((r) => r.newOrders > 0).length },
    { key: "debt", label: L.debt[lang], n: (data?.rows ?? []).filter((r) => r.unpaid > 0).length },
    {
      key: "idle",
      label: L.idle[lang],
      n: (data?.rows ?? []).filter((r) => r.idleDays === null || r.idleDays >= 30).length,
    },
    { key: "all", label: L.all[lang], n: (data?.rows ?? []).length },
  ];

  const tplKeys = Object.keys(WA_TEMPLATES) as WaTemplateKey[];

  return (
    <div className="space-y-3">
      <SectionHeader title={L.title[lang]} />

      <AdminCard>
        <p className="mb-2 text-[11px] text-muted-foreground">{L.hint[lang]}</p>

        <Field label={L.audience[lang]}>
          <div className="flex flex-wrap gap-1.5">
            {audiences.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => pickAudience(a.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                  audience === a.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                {a.label} · {a.n}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-3">
          <Field label={L.template[lang]}>
            <div className="flex flex-wrap gap-1.5">
              {tplKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setTplKey(k);
                    setDraft(null);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                    tplKey === k
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {WA_TEMPLATES[k].label[lang]}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-3">
          <Field label={L.msgLang[lang]}>
            <div className="flex gap-1.5">
              {(["ar", "ku", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setMsgLang(l);
                    setDraft(null);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase",
                    msgLang === l
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-3">
          <Field label={L.message[lang]}>
            <Textarea
              value={body}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              className="text-[12px] leading-6"
              dir={msgLang === "en" ? "ltr" : "rtl"}
            />
          </Field>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{L.tokens[lang]}</p>
          {draft !== null && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8 text-[11px]"
              onClick={() => setDraft(null)}
            >
              <RotateCcw className="me-1 h-3.5 w-3.5" />
              {L.reset[lang]}
            </Button>
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold">
            {rows.length} {L.vendorsCount[lang]}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px]"
            disabled={!rows.length}
            onClick={() => {
              const txt = rows
                .map((r) => `${r.name} — ${waNumber(r.phone) ?? "-"}\n${messageFor(r)}`)
                .join("\n\n———\n\n");
              void navigator.clipboard.writeText(txt);
              toast.success(L.copied[lang]);
            }}
          >
            <Copy className="me-1 h-3.5 w-3.5" />
            {L.copy[lang]}
          </Button>
        </div>

        {!rows.length && <p className="py-6 text-center text-xs text-muted-foreground">{L.empty[lang]}</p>}

        <div className="space-y-2">
          {rows.map((r) => {
            const link = waLink(r.phone, messageFor(r));
            return (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-card p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">{r.name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[10.5px] text-muted-foreground">
                      {r.newOrders > 0 && (
                        <span className="font-semibold text-rose-600">
                          {r.newOrders} {L.newOrders[lang]}
                        </span>
                      )}
                      {r.unpaid > 0 && (
                        <span className="font-semibold text-amber-600">
                          {L.due[lang]}: {formatPrice(r.unpaid, lang)}
                        </span>
                      )}
                      <span>
                        {r.idleDays === null
                          ? L.never[lang]
                          : `${L.lastOrder[lang]} ${r.idleDays} ${L.daysAgo[lang]}`}
                      </span>
                    </p>
                  </div>
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="sm"
                        className="h-9 bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="me-1 h-4 w-4" />
                        {L.send[lang]}
                      </Button>
                    </a>
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground">{L.noPhone[lang]}</span>
                  )}
                </div>
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-[10.5px] font-semibold text-primary">
                    {L.preview[lang]}
                  </summary>
                  <pre
                    dir={msgLang === "en" ? "ltr" : "rtl"}
                    className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/60 p-2 text-[11px] leading-5"
                  >
                    {messageFor(r)}
                  </pre>
                </details>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}
