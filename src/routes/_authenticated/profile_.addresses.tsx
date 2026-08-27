import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubPage } from "@/components/profile/SubPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { reverseGeocode } from "@/lib/geocode.functions";

export const Route = createFileRoute("/_authenticated/profile_/addresses")({
  head: () => ({
    meta: [
      { title: "عناوين التوصيل | دنتال ستور" },
      { name: "description", content: "أضف عناوين عيادتك وحدّد العنوان الافتراضي للتوصيل." },
      { property: "og:title", content: "عناوين التوصيل | دنتال ستور" },
      { property: "og:description", content: "إدارة عناوين التوصيل الخاصة بحسابك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddressesPage,
});

const L = {
  hint: {
    ar: "يمكنك حفظ أكثر من عنوان واختيار الافتراضي عند الشراء.",
    ku: "دەتوانی چەند ناونیشان پاشەکەوت بکەی و بنەڕەتی هەڵبژێری.",
    en: "You can save multiple addresses and choose the default one when purchasing.",
  },
  empty: { ar: "لا عناوين محفوظة بعد", ku: "هێشتا ناونیشان نییە", en: "No addresses saved yet",},
};

const emptyAddress = {
  label: "",
  city: "",
  address_line: "",
  notes: "",
  latitude: null as number | null,
  longitude: null as number | null,
};

function AddressesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const getPlace = useServerFn(reverseGeocode);
  const [adding, setAdding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);

  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () =>
      (await supabase.from("addresses").select("*").order("is_default", { ascending: false }))
        .data ?? [],
  });

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error(t("locationFailed"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setNewAddress((a) => ({
          ...a,
          latitude,
          longitude,
          address_line: a.address_line || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        }));
        try {
          const place = await getPlace({
            data: { latitude, longitude, language: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar" },
          });
          setNewAddress((a) => ({
            ...a,
            latitude,
            longitude,
            city: place.city || a.city,
            address_line: place.addressLine || a.address_line,
            label: a.label || place.label,
          }));
        } catch {
          // keep raw coordinates when the address lookup is unavailable
        }
        setLocating(false);
        toast.success(t("locationCaptured"));
      },
      () => {
        setLocating(false);
        toast.error(t("locationFailed"));
      },
    );
  }

  async function addAddress() {
    if (!newAddress.city.trim()) {
      toast.error(t("city"));
      return;
    }
    if (!newAddress.address_line.trim()) {
      toast.error(t("address"));
      return;
    }
    const { error } = await supabase.from("addresses").insert({
      user_id: user!.id,
      label: newAddress.label.trim() || newAddress.city.trim(),
      city: newAddress.city.trim(),
      address_line: newAddress.address_line.trim(),
      notes: newAddress.notes || null,
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
      is_default: (addresses?.length ?? 0) === 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("saved"));
    setNewAddress(emptyAddress);
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["addresses"] });
  }

  async function makeDefault(id: string) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["addresses"] });
  }

  async function removeAddress(id: string) {
    await supabase.from("addresses").delete().eq("id", id);
    toast.success(t("deleted"));
    qc.invalidateQueries({ queryKey: ["addresses"] });
  }

  return (
    <SubPage title={t("myAddresses")} subtitle={L.hint[lang]}>
      <div className="space-y-1.5">
        {(addresses ?? []).map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-card"
          >
            <MapPin className="size-5 text-primary" />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-base font-extrabold leading-tight">
                <span className="truncate">{a.label || a.city}</span>
                {a.is_default && (
                  <span className="rounded bg-success/15 px-1 py-0.5 text-xs font-bold text-success">
                    {t("defaultAddress")}
                  </span>
                )}
              </p>
              <p className="truncate text-sm leading-tight text-muted-foreground">
                {a.city} — {a.address_line}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              {!a.is_default && (
                <button
                  className="grid size-8 place-items-center rounded-xl text-muted-foreground"
                  onClick={() => makeDefault(a.id)}
                  aria-label={t("defaultAddress")}
                >
                  <Star className="size-4" />
                </button>
              )}
              <button
                className="grid size-8 place-items-center rounded-xl text-destructive"
                onClick={() => removeAddress(a.id)}
                aria-label={t("delete")}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {(addresses?.length ?? 0) === 0 && (
          <p className="rounded-2xl border border-dashed border-border/70 bg-card p-4 text-center text-sm text-muted-foreground">
            {L.empty[lang]}
          </p>
        )}
      </div>

      {!adding ? (
        <Button
          variant="secondary"
          className="h-12 w-full rounded-xl text-base"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          {t("addAddress")}
        </Button>
      ) : (
        <div className="space-y-1.5 rounded-2xl border border-dashed border-primary/40 bg-card p-4">
          <Button
            variant="secondary"
            className="h-12 w-full rounded-xl text-base"
            onClick={detectLocation}
            disabled={locating}
          >
            <MapPin className="size-5" />
            {locating ? "..." : newAddress.latitude ? t("locationCaptured") : t("useMyLocation")}
          </Button>
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              className="h-12 rounded-xl text-base"
              placeholder={t("city")}
              value={newAddress.city}
              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
            />
            <Input
              className="h-12 rounded-xl text-base"
              placeholder={t("addressLabel")}
              value={newAddress.label}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
            />
          </div>
          <Textarea
            className="rounded-xl text-base"
            rows={2}
            placeholder={t("address")}
            value={newAddress.address_line}
            onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
          />
          <Input
            className="h-12 rounded-xl text-base"
            placeholder={t("notes")}
            value={newAddress.notes}
            onChange={(e) => setNewAddress({ ...newAddress, notes: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Button className="h-12 rounded-xl text-base" onClick={addAddress}>
              {t("save")}
            </Button>
            <Button
              variant="ghost"
              className="h-12 rounded-xl text-base"
              onClick={() => {
                setAdding(false);
                setNewAddress(emptyAddress);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </SubPage>
  );
}
