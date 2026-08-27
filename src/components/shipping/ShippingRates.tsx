import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard } from "@/components/admin/AdminKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { ANY_CITY, IRAQ_CITIES, type ShippingRate } from "@/lib/shipping";

const L = {
  title: { ar: "أجور التوصيل حسب المدينة", ku: "کرێی گەیاندن بەپێی شار", en: "Shipping cost per city" },
  hint: {
    ar: "حدّد سعر التوصيل لكل مدينة عراقية. عند الشراء، يُحسب سعر مدينة الطبيب تلقائياً ويضاف إلى الطلب.",
    ku: "نرخی گەیاندن بۆ هەر شارێکی عێراق دیاری بکە. لە کاتی کڕین، نرخی شاری پزیشک بەخۆکاری زیاد دەکرێت.",
    en: "Set delivery price for each Iraqi city. At checkout the dentist's city price is added automatically.",
  },
  city: { ar: "المدينة", ku: "شار", en: "City" },
  fee: { ar: "سعر التوصيل", ku: "نرخی گەیاندن", en: "Delivery price" },
  freeOver: { ar: "توصيل مجاني عند أكثر من", ku: "گەیاندن بێ بەرامبەر لە زیاتر لە", en: "Free shipping over" },
  freeOff: { ar: "٠ = بدون توصيل مجاني", ku: "٠ = بێ گەیاندنی خۆڕایی", en: "0 = no free shipping" },
  add: { ar: "إضافة مدينة", ku: "زیادکردنی شار", en: "Add city" },
  save: { ar: "حفظ", ku: "پاشەکەوت", en: "Save" },
  saved: { ar: "تم الحفظ", ku: "پاشەکەوت کرا", en: "Saved" },
  del: { ar: "حذف", ku: "سڕینەوە", en: "Delete" },
  any: { ar: "كل المدن الأخرى (افتراضي)", ku: "هەموو شارەکانی تر (بنەڕەت)", en: "All other cities (default)" },
  empty: {
    ar: "لا توجد أسعار بعد — أضف مدينة أو ضع سعراً افتراضياً لكل المدن.",
    ku: "هێشتا نرخ نییە — شارێک زیاد بکە یان نرخی بنەڕەت دابنێ.",
    en: "No prices yet — add a city or set one default price for all cities.",
  },
  dup: { ar: "هذه المدينة مضافة", ku: "ئەم شارە زیادکراوە", en: "City already added" },
  freeNote: { ar: "مجاني فوق", ku: "خۆڕایی سەروو", en: "Free over" },
};

type Draft = { city: string; fee: string; free_over: string };

export function ShippingRates({ vendorId }: { vendorId: string }) {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>({ city: "", fee: "", free_over: "" });
  const [edits, setEdits] = useState<Record<string, Draft>>({});

  const { data: rows } = useQuery({
    queryKey: ["shipping-rates", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_shipping_rates")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("city");
      if (error) throw error;
      return (data ?? []) as unknown as ShippingRate[];
    },
  });

  const list = rows ?? [];
  const used = useMemo(() => new Set(list.map((r) => r.city.trim().toLowerCase())), [list]);
  const cityLabel = (c: string) => {
    if (c.trim() === ANY_CITY) return L.any[lang];
    const row = IRAQ_CITIES.find((r) => [r.ar, r.ku, r.en].includes(c));
    return row ? row[lang] : c;
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["shipping-rates", vendorId] });

  async function addRow() {
    const city = draft.city.trim();
    if (!city) return;
    if (used.has(city.toLowerCase())) {
      toast.error(L.dup[lang]);
      return;
    }
    const { error } = await supabase.from("vendor_shipping_rates").insert({
      vendor_id: vendorId,
      city,
      fee: Number(draft.fee) || 0,
      free_over: Number(draft.free_over) || 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft({ city: "", fee: "", free_over: "" });
    toast.success(L.saved[lang]);
    refresh();
  }

  async function saveRow(row: ShippingRate) {
    const d = edits[row.id];
    if (!d) return;
    const { error } = await supabase
      .from("vendor_shipping_rates")
      .update({ fee: Number(d.fee) || 0, free_over: Number(d.free_over) || 0 })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEdits((e) => {
      const next = { ...e };
      delete next[row.id];
      return next;
    });
    toast.success(L.saved[lang]);
    refresh();
  }

  async function delRow(id: string) {
    const { error } = await supabase.from("vendor_shipping_rates").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  const options = [
    { value: ANY_CITY, label: L.any[lang] },
    ...IRAQ_CITIES.map((c) => ({ value: c[lang], label: c[lang] })),
  ].filter((o) => !used.has(o.value.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="head-icon">
          <Truck className="size-4" strokeWidth={2.4} />
        </span>
        <h2 className="flex-1 text-sm font-extrabold">{L.title[lang]}</h2>
      </div>
      <p className="text-[11.5px] leading-snug text-muted-foreground">{L.hint[lang]}</p>

      <AdminCard>
        <div className="space-y-2">
          <Label className="text-[11.5px] font-extrabold">{L.add[lang]}</Label>
          <select
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-[13px] font-bold"
            value={draft.city}
            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
          >
            <option value="">{L.city[lang]}…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">{L.fee[lang]}</Label>
              <Input
                className="h-11 rounded-lg"
                type="number"
                inputMode="numeric"
                value={draft.fee}
                onChange={(e) => setDraft((d) => ({ ...d, fee: e.target.value }))}
                placeholder="5000"
              />
            </div>
            <div>
              <Label className="text-[11px]">{L.freeOver[lang]}</Label>
              <Input
                className="h-11 rounded-lg"
                type="number"
                inputMode="numeric"
                value={draft.free_over}
                onChange={(e) => setDraft((d) => ({ ...d, free_over: e.target.value }))}
                placeholder="100000"
              />
            </div>
          </div>
          <p className="text-[10.5px] text-muted-foreground">{L.freeOff[lang]}</p>
          <Button className="h-11 w-full rounded-lg" onClick={addRow} disabled={!draft.city}>
            <Plus className="size-4" />
            {L.add[lang]}
          </Button>
        </div>
      </AdminCard>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
          {L.empty[lang]}
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((row) => {
            const d = edits[row.id] ?? {
              city: row.city,
              fee: String(row.fee ?? 0),
              free_over: String(row.free_over ?? 0),
            };
            const dirty = !!edits[row.id];
            return (
              <AdminCard key={row.id}>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-extrabold">
                    {cityLabel(row.city)}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                    {formatPrice(Number(row.fee) || 0, lang)}
                  </span>
                  <button
                    className="text-destructive"
                    aria-label={L.del[lang]}
                    onClick={() => delRow(row.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">{L.fee[lang]}</Label>
                    <Input
                      className="h-11 rounded-lg"
                      type="number"
                      inputMode="numeric"
                      value={d.fee}
                      onChange={(e) =>
                        setEdits((s) => ({ ...s, [row.id]: { ...d, fee: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">{L.freeOver[lang]}</Label>
                    <Input
                      className="h-11 rounded-lg"
                      type="number"
                      inputMode="numeric"
                      value={d.free_over}
                      onChange={(e) =>
                        setEdits((s) => ({ ...s, [row.id]: { ...d, free_over: e.target.value } }))
                      }
                    />
                  </div>
                </div>
                {Number(row.free_over) > 0 && !dirty && (
                  <p className="mt-1.5 text-[11px] font-bold text-success">
                    {L.freeNote[lang]} {formatPrice(Number(row.free_over), lang)}
                  </p>
                )}
                {dirty && (
                  <Button className="mt-2 h-10 w-full rounded-lg" onClick={() => saveRow(row)}>
                    <Save className="size-4" />
                    {L.save[lang]}
                  </Button>
                )}
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
