import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, KeyRound, Pencil, Plus, Trash2, X, Store } from "lucide-react";
import { useState, Fragment } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
          <Button size="sm" onClick={() => setDraft(empty)}>
            <Plus className="size-4" />
            {t("addVendor")}
          </Button>
        }
      />
      <p className="text-[11px] text-muted-foreground">{t("vendorsHint")}</p>

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {draft?.id ? <Pencil className="size-4 text-[#007979]" /> : <Store className="size-4 text-[#007979]" />}
              <span>{draft?.id ? t("edit") : t("addVendor")}</span>
            </DialogTitle>
          </DialogHeader>
          
          {draft && (
            <div className="space-y-4 pt-2">
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr className="border-b border-slate-200/80 dark:border-slate-800">
              <th className="px-4 py-3 font-semibold text-start">{t("vendorName")}</th>
              <th className="px-4 py-3 font-semibold text-start">{t("commission")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("mySales")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("commissionDue")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("netPayout")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("accounts")}</th>
              <th className="px-4 py-3 font-semibold text-end"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {(vendors ?? []).map((v) => {
              const totals = totalsFor(v.id);
              const team = (members ?? []).filter((m) => m.vendor_id === v.id);
              const open = openId === v.id;
              const l = login[v.id] ?? emptyLogin;
              const setL = (patch: Partial<Login>) =>
                setLogin((s) => ({ ...s, [v.id]: { ...l, ...patch } }));
              return (
                <Fragment key={v.id}>
                  <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {v.name}
                          {!v.is_active && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                              {t("inactive")}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(v.brands ?? []).map((b) => (
                            <span
                              key={b}
                              className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400"
                            >
                              {b}
                            </span>
                          ))}
                          {(v.brands ?? []).length === 0 && (
                            <span className="text-[10px] text-muted-foreground">{t("noBrandsYet")}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-[#007979]">
                        {commissionLabel(v.commission_type, v.commission_value)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-300">
                        {formatPrice(totals.sales, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(totals.commission, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-300">
                        {formatPrice(totals.net, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setOpenId(open ? null : v.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        {team.length} {t("accounts")}
                        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 rounded-lg text-xs font-bold"
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
                          <Pencil className="size-3.5 sm:hidden" />
                          <span className="hidden sm:inline">{t("edit")}</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white"
                          onClick={() => remove.mutate(v.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                      <td colSpan={7} className="px-4 py-4 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="max-w-2xl">
                          <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("vendorAccounts")}</h4>
                              <div className="space-y-1.5">
                                {team.map((m) => {
                                  const p = (profiles ?? []).find((x) => x.id === m.user_id);
                                  return (
                                    <div
                                      key={m.id}
                                      className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xs"
                                    >
                                      <div className="grid size-8 place-items-center rounded-lg bg-teal-50 dark:bg-teal-900/20 text-[#007979]">
                                        <KeyRound className="size-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                          {p?.full_name || p?.phone || m.user_id}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p?.phone}</p>
                                      </div>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 rounded-lg text-red-600 hover:bg-red-500/10"
                                        onClick={() => removeLogin.mutate(m.id)}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                  );
                                })}
                                {team.length === 0 && (
                                  <p className="text-xs text-slate-500">{t("noResults")}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Plus className="size-3.5 text-[#007979]" /> {t("createVendorLogin")}
                              </h4>
                              <div className="space-y-2">
                                <TextField
                                  label={t("fullName")}
                                  value={l.fullName}
                                  onChange={(x) => setL({ fullName: x })}
                                />
                                <div className="grid grid-cols-2 gap-2">
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
                                  className="w-full rounded-lg bg-[#007979] hover:bg-teal-700 text-white font-bold"
                                  disabled={addLogin.isPending}
                                  onClick={() => addLogin.mutate({ vendorId: v.id, l })}
                                >
                                  {t("createVendorLogin")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {(vendors ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</td>
              </tr>
            )}
          </tbody>
        </table>
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
