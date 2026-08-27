import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, ColorField, Field, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { VendorApplications } from "./VendorApplications";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createBrandManager } from "@/lib/admin-users.functions";
import { formatPrice, useI18n } from "@/lib/i18n";
import {
  commissionLabel,
  commissionMax,
  parseBrands,
  validateVendorCommission,
  vendorTotals,
  type Vendor,
  type VendorMember,
} from "@/lib/vendors";

type Draft = {
  id?: string;
  name: string;
  brandsRaw: string;
  logo_domain: string;
  logo_url: string;
  cover_url: string;
  tagline_ar: string;
  tagline_ku: string;
  about_ar: string;
  about_ku: string;
  city: string;
  phone: string;
  hue: number;
  chroma: number;
  commission_type: string;
  commission_value: string;
  is_active: boolean;
  is_verified: boolean;
};

const empty: Draft = {
  name: "",
  brandsRaw: "",
  logo_domain: "",
  logo_url: "",
  cover_url: "",
  tagline_ar: "",
  tagline_ku: "",
  about_ar: "",
  about_ku: "",
  city: "",
  phone: "",
  hue: 250,
  chroma: 0.14,
  commission_type: "percent",
  commission_value: "10",
  is_active: true,
  is_verified: false,
};

type Login = { fullName: string; phone: string; password: string };
const emptyLogin: Login = { fullName: "", phone: "", password: "" };

/** Vendors: one card per vendor — brands sold, commission, payout and logins. */
export function AdminVendors() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const createLogin = useServerFn(createBrandManager);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [login, setLogin] = useState<Record<string, Login>>({});

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () =>
      ((await supabase.from("vendors").select("*").order("name")).data ?? []) as unknown as Vendor[],
  });

  const { data: members } = useQuery({
    queryKey: ["admin-vendor-members"],
    queryFn: async () =>
      ((await supabase.from("vendor_members").select("id, vendor_id, user_id")).data ??
        []) as VendorMember[],
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, phone")).data ?? [],
  });

  const { data: lines } = useQuery({
    queryKey: ["admin-vendor-accounting"],
    queryFn: async () =>
      (
        await supabase
          .from("order_items")
          .select("vendor_id, unit_price, quantity, commission_amount")
      ).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const check = validateVendorCommission({
        name: d.name,
        commission_type: d.commission_type,
        commission_value: d.commission_value,
      });
      if (!check.ok) throw new Error(check.key);
      const brands = parseBrands(d.brandsRaw);
      const payload = {
        name: d.name.trim(),
        brands,
        brand_key: brands[0] ?? d.name.trim(),
        logo_domain: d.logo_domain.trim() || null,
        logo_url: d.logo_url.trim() || null,
        cover_url: d.cover_url.trim() || null,
        tagline_ar: d.tagline_ar.trim(),
        tagline_ku: d.tagline_ku.trim(),
        about_ar: d.about_ar.trim(),
        about_ku: d.about_ku.trim(),
        city: d.city.trim(),
        phone: d.phone.trim(),
        hue: d.hue,
        chroma: d.chroma,
        commission_type: check.type,
        commission_value: check.value,
        is_active: d.is_active,
        is_verified: d.is_verified,
      };
      const res = d.id
        ? await supabase.from("vendors").update(payload).eq("id", d.id)
        : await supabase.from("vendors").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (e: Error) => {
      const key = e.message as Parameters<typeof t>[0];
      const msg = t(key);
      toast.error(msg && msg !== key ? msg : t("error"));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const addLogin = useMutation({
    mutationFn: async ({ vendorId, l }: { vendorId: string; l: Login }) =>
      createLogin({ data: { ...l, vendorId } }),
    onSuccess: (_r, vars) => {
      toast.success(t("accountCreated"));
      setLogin((s) => ({ ...s, [vars.vendorId]: emptyLogin }));
      qc.invalidateQueries({ queryKey: ["admin-vendor-members"] });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message || t("error")),

  });

  const removeLogin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vendor-members"] }),
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const totalsFor = (vendorId: string) =>
    vendorTotals((lines ?? []).filter((l) => l.vendor_id === vendorId) as never);

  return (
    <div className="space-y-3">
      <VendorApplications />
      <SectionHeader
        title={t("vendorList")}
        action={
          <Button size="sm" onClick={() => setDraft(draft ? null : empty)}>
            {draft ? <X className="size-4" /> : <Plus className="size-4" />}
            {draft ? t("cancel") : t("addVendor")}
          </Button>
        }
      />
      <p className="text-[11px] text-muted-foreground">{t("vendorsHint")}</p>

      {draft && (
        <AdminCard>
          <TextField
            label={t("vendorName")}
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
          />
          <Field label={t("vendorBrandsList")}>
            <Textarea
              value={draft.brandsRaw}
              placeholder="GC, Bisco, 3M"
              onChange={(e) => setDraft({ ...draft, brandsRaw: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("commissionType")}>
              <Select
                value={draft.commission_type}
                onValueChange={(v) => setDraft({ ...draft, commission_type: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t("percentOfSales")}</SelectItem>
                  <SelectItem value="fixed_per_item">{t("fixedPerItem")}</SelectItem>
                  <SelectItem value="fixed_per_order">{t("fixedPerOrder")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <TextField
              label={t("commissionValue")}
              type="number"
              value={draft.commission_value}
              onChange={(v) => {
                const n = Number(v);
                const max = commissionMax(draft.commission_type);
                const clamped =
                  v === "" || Number.isNaN(n) ? v : String(Math.min(Math.max(n, 0), max));
                setDraft({ ...draft, commission_value: clamped });
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {draft.commission_type === "percent"
              ? t("commissionHintPercent")
              : draft.commission_type === "fixed_per_item"
                ? t("commissionHintItem")
                : t("commissionHintOrder")}
          </p>
          <TextField
            label={t("imageUrl")}
            value={draft.logo_domain}
            onChange={(v) => setDraft({ ...draft, logo_domain: v })}
            placeholder="gc.dental"
          />

          <SectionHeader title={t("vendorProfileFields")} />
          <TextField
            label={t("vendorLogoUrl")}
            value={draft.logo_url}
            onChange={(v) => setDraft({ ...draft, logo_url: v })}
          />
          <TextField
            label={t("vendorCover")}
            value={draft.cover_url}
            onChange={(v) => setDraft({ ...draft, cover_url: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("vendorTagline")}
              value={draft.tagline_ar}
              onChange={(v) => setDraft({ ...draft, tagline_ar: v })}
            />
            <TextField
              label={t("vendorTaglineKu")}
              value={draft.tagline_ku}
              onChange={(v) => setDraft({ ...draft, tagline_ku: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("vendorAbout")}
              value={draft.about_ar}
              onChange={(v) => setDraft({ ...draft, about_ar: v })}
            />
            <TextField
              label={t("vendorAboutKu")}
              value={draft.about_ku}
              onChange={(v) => setDraft({ ...draft, about_ku: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("vendorCity")}
              value={draft.city}
              onChange={(v) => setDraft({ ...draft, city: v })}
            />
            <TextField
              label={t("vendorPhone")}
              value={draft.phone}
              onChange={(v) => setDraft({ ...draft, phone: v })}
            />
          </div>
          <ColorField
            label={t("vendorColor")}
            hue={String(draft.hue)}
            chroma={String(draft.chroma)}
            onChange={(hue, chroma) =>
              setDraft({ ...draft, hue: Number(hue) || 0, chroma: Number(chroma) || 0 })
            }
          />

          <ToggleField
            label={t("active")}
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />
          <ToggleField
            label={t("verified")}
            checked={draft.is_verified}
            onChange={(v) => setDraft({ ...draft, is_verified: v })}
          />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-2">
        {(vendors ?? []).map((v) => {
          const totals = totalsFor(v.id);
          const team = (members ?? []).filter((m) => m.vendor_id === v.id);
          const open = openId === v.id;
          const l = login[v.id] ?? emptyLogin;
          const setL = (patch: Partial<Login>) =>
            setLogin((s) => ({ ...s, [v.id]: { ...l, ...patch } }));
          return (
            <div
              key={v.id}
              className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-card"
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">
                    {v.name}
                    {!v.is_active && (
                      <span className="ms-1.5 text-[10px] font-bold text-destructive">
                        ({t("inactive")})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("commission")}: {commissionLabel(v.commission_type, v.commission_value)} ·{" "}
                    {t("accounts")}: {team.length}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() =>
                    setDraft({
                      id: v.id,
                      name: v.name,
                      brandsRaw: (v.brands ?? []).join(", "),
                      logo_domain: v.logo_domain ?? "",
                      logo_url: v.logo_url ?? "",
                      cover_url: v.cover_url ?? "",
                      tagline_ar: v.tagline_ar ?? "",
                      tagline_ku: v.tagline_ku ?? "",
                      about_ar: v.about_ar ?? "",
                      about_ku: v.about_ku ?? "",
                      city: v.city ?? "",
                      phone: v.phone ?? "",
                      hue: Number(v.hue) || 250,
                      chroma: Number(v.chroma) || 0.14,
                      commission_type: v.commission_type,
                      commission_value: String(v.commission_value),
                      is_active: v.is_active,
                      is_verified: Boolean((v as { is_verified?: boolean }).is_verified),
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive"
                  onClick={() => remove.mutate(v.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {(v.brands ?? []).map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground"
                  >
                    {b}
                  </span>
                ))}
                {(v.brands ?? []).length === 0 && (
                  <span className="text-[10px] text-muted-foreground">{t("noBrandsYet")}</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-2 text-center">
                <Mini label={t("mySales")} value={formatPrice(totals.sales, lang)} />
                <Mini label={t("commissionDue")} value={formatPrice(totals.commission, lang)} />
                <Mini label={t("netPayout")} value={formatPrice(totals.net, lang)} />
              </div>

              <button
                onClick={() => setOpenId(open ? null : v.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold"
              >
                {t("vendorAccounts")}
                <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="space-y-1.5">
                  {team.map((m) => {
                    const p = (profiles ?? []).find((x) => x.id === m.user_id);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
                      >
                        <KeyRound className="size-3.5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-xs font-bold">
                          {p?.full_name || p?.phone || m.user_id}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{p?.phone}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive"
                          onClick={() => removeLogin.mutate(m.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}

                  <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2">
                    <TextField
                      label={t("fullName")}
                      value={l.fullName}
                      onChange={(x) => setL({ fullName: x })}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <TextField
                        label={t("managerPhone")}
                        value={l.phone}
                        onChange={(x) => setL({ phone: x })}
                        placeholder="0770..."
                      />
                      <TextField
                        label={t("password")}
                        value={l.password}
                        onChange={(x) => setL({ password: x })}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={addLogin.isPending}
                      onClick={() => addLogin.mutate({ vendorId: v.id, l })}
                    >
                      <Plus className="size-4" />
                      {t("createVendorLogin")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {(vendors ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-extrabold text-primary">{value}</p>
    </div>
  );
}
