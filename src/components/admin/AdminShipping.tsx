import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Truck } from "lucide-react";
import { ShippingRates } from "@/components/shipping/ShippingRates";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const L = {
  title: { ar: "أجور التوصيل للبائعين", ku: "کرێی گەیاندنی فرۆشیارەکان", en: "Vendor shipping costs" },
  pick: { ar: "اختر البائع", ku: "فرۆشیار هەڵبژێرە", en: "Choose vendor" },
  hint: {
    ar: "لكل بائع أسعار توصيل خاصة لكل مدينة. يمكنك تعديلها هنا كإدارة.",
    ku: "هەر فرۆشیارێک نرخی گەیاندنی خۆی بۆ هەر شارێک هەیە. لێرە دەتوانیت دەستکاری بکەیت.",
    en: "Each vendor has its own per-city delivery prices. Admins can edit them here.",
  },
};

export function AdminShipping() {
  const { lang } = useI18n();
  const [vendorId, setVendorId] = useState("");

  const { data: vendors } = useQuery({
    queryKey: ["vendors-shipping-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="head-icon">
          <Truck className="size-4" strokeWidth={2.4} />
        </span>
        <h2 className="flex-1 text-sm font-extrabold">{L.title[lang]}</h2>
      </div>
      <p className="text-[11.5px] leading-snug text-muted-foreground">{L.hint[lang]}</p>

      <div>
        <Label className="text-[11.5px] font-extrabold">{L.pick[lang]}</Label>
        <select
          className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-[13px] font-bold"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
        >
          <option value="">{L.pick[lang]}…</option>
          {(vendors ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {vendorId && <ShippingRates vendorId={vendorId} />}
    </div>
  );
}
