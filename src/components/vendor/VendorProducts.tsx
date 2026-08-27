import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Hourglass,
  Layers,
  LibraryBig,
  PackageOpen,
  Pencil,
  Plus,
  ScanText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/admin/AdminKit";
import {
  ProductQuickForm,
  duplicateDraft,
  emptyProductDraft,
  productPayload,
  toProductDraft,
  type ProductDraft,
} from "@/components/catalog/ProductQuickForm";
import { PriceListScanner } from "@/components/catalog/PriceListScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { searchCatalog } from "@/lib/catalog";
import { monthsChip, monthsLeft, urgencyTone } from "@/lib/clearance";
import { tintStyle } from "@/lib/category-icons";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";

type Filter = "all" | "near_expiry" | "outlet";

/**
 * Vendor stock manager for the clearance marketplace: fast one-screen listing,
 * duplicate, catalog import, and filters that focus on expiring / outlet stock.
 */
export function VendorProducts({ vendorId, brands }: { vendorId: string; brands: string[] }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [catalog, setCatalog] = useState(false);
  const [scan, setScan] = useState(false);

  const bulk = useMutation({
    mutationFn: async (items: { name: string; brand: string; price: number; stock: number }[]) => {
      const payload = items.map((i) => ({
        name_ar: i.name,
        name_ku: i.name,
        description_ar: "",
        description_ku: "",
        brand: i.brand || brands[0] || "",
        sku: "",
        price: i.price,
        stock: i.stock || 1,
        vendor_id: vendorId,
        is_active: true,
      }));
      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("aiScanSaved"));
      setScan(false);
      qc.invalidateQueries({ queryKey: ["vendor-products", vendorId] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const [term, setTerm] = useState("");

  const { data: products } = useQuery({
    queryKey: ["vendor-products", vendorId],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const { data: rules } = useQuery({
    queryKey: ["clearance-rules"],
    queryFn: async () =>
      (
        await supabase
          .from("clearance_rules")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
      ).data ?? [],
  });

  const { data: catalogRows } = useQuery({
    queryKey: ["shared-catalog", term],
    enabled: catalog && term.trim().length > 1,
    queryFn: () => searchCatalog(term),
  });

  /** Pick a shared item: never duplicate it — edit mine, or add my price only. */
  const pickCatalog = (item: {
    id: string;
    name_ar: string;
    name_ku: string;
    description_ar: string;
    description_ku: string;
    brand: string;
    sku: string;
    image_url: string | null;
    category_id: string | null;
  }) => {
    setCatalog(false);
    const mine = (products ?? []).find((p) => p.catalog_item_id === item.id);
    if (mine) {
      setDraft(toProductDraft(mine));
      toast.info(t("alreadyListed"));
      return;
    }
    setDraft({
      ...emptyProductDraft,
      name_ar: item.name_ar,
      name_ku: item.name_ku,
      description_ar: item.description_ar,
      description_ku: item.description_ku,
      brand: item.brand || brands[0] || "",
      image_url: item.image_url ?? "",
      category_id: item.category_id ?? "",
      catalog_item_id: item.id,
      vendor_id: vendorId,
      stock: "1",
    });
  };

  const save = useMutation({
    mutationFn: async ({ d, again }: { d: ProductDraft; again: boolean }) => {
      const payload = { ...productPayload(d, vendorId), brand: d.brand || brands[0] || "" };
      const res = d.id
        ? await supabase.from("products").update(payload).eq("id", d.id)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
      return again;
    },
    onSuccess: (again) => {
      toast.success(t("saved"));
      setDraft(
        again
          ? { ...emptyProductDraft, brand: draft?.brand ?? "", category_id: draft?.category_id ?? "" }
          : null,
      );
      qc.invalidateQueries({ queryKey: ["vendor-products", vendorId] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["vendor-products", vendorId] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const rows = (products ?? []).filter((p) =>
    filter === "all" ? true : p.clearance_kind === filter,
  );

  const chips: { key: Filter; label: string; icon: typeof Layers; count: number }[] = [
    { key: "all", label: t("filterAll"), icon: Layers, count: (products ?? []).length },
    {
      key: "near_expiry",
      label: t("nearExpiry"),
      icon: Hourglass,
      count: (products ?? []).filter((p) => p.clearance_kind === "near_expiry").length,
    },
    {
      key: "outlet",
      label: t("outlet"),
      icon: PackageOpen,
      count: (products ?? []).filter((p) => p.clearance_kind === "outlet").length,
    },
  ];

  const openBlank = () =>
    setDraft({ ...emptyProductDraft, brand: brands[0] ?? "", stock: "1" });

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("myProducts")}
        action={
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setScan((v) => !v)}>
              <ScanText className="size-4" />
              {t("aiScanTitle")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCatalog((v) => !v)}>
              <LibraryBig className="size-4" />
              {t("fromCatalog")}
            </Button>

            <Button size="sm" onClick={() => (draft ? setDraft(null) : openBlank())}>
              {draft ? <X className="size-4" /> : <Plus className="size-4" />}
              {draft ? t("cancel") : t("quickAdd")}
            </Button>
          </div>
        }
      />

      {scan && (
        <PriceListScanner
          saving={bulk.isPending}
          onPublish={(items) => bulk.mutateAsync(items)}
        />
      )}


      {catalog && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-3 shadow-card">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-2.5" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("searchCatalog")}
              className="h-9 ps-8"
            />
          </div>
          <p className="text-[10.5px] font-semibold leading-5 text-muted-foreground">
            {t("sharedCatalogHint")}
          </p>
          <div className="space-y-1.5">
            {(catalogRows ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickCatalog(p)}
                className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 p-2 text-start active:scale-[0.99]"
              >
                <img
                  src={p.image_url ?? "/placeholder.svg"}
                  alt=""
                  className="size-9 shrink-0 rounded-lg bg-card object-contain p-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-extrabold">
                    {pickName(p, lang)}
                  </span>
                  <span className="block truncate text-[10px] font-semibold text-muted-foreground">
                    {p.brand}
                  </span>
                </span>
                <Copy className="size-4 shrink-0 text-primary" />
              </button>
            ))}
            {catalog && term.trim().length > 1 && !(catalogRows ?? []).length && (
              <p className="py-4 text-center text-[11px] font-semibold text-muted-foreground">
                {t("noResults")}
              </p>
            )}
          </div>
        </div>
      )}

      {draft && (
        <ProductQuickForm
          draft={draft}
          setDraft={setDraft}
          brands={brands}
          categories={categories ?? []}
          vendorId={vendorId}
          rules={rules ?? []}
          saving={save.isPending}
          onSave={() => save.mutate({ d: draft, again: false })}
          onSaveNew={() => save.mutate({ d: draft, again: true })}
          onCancel={() => setDraft(null)}
        />
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map(({ key, label, icon: Icon, count }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-all active:scale-95 ${
                active ? "bg-primary text-primary-foreground shadow-pop" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="size-3.5" strokeWidth={2.6} />
              {label}
              <span className={active ? "opacity-80" : "opacity-70"}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {rows.map((p) => {
          const months = monthsLeft(p.expiry_date);
          const tone = urgencyTone(months);
          const near = p.clearance_kind === "near_expiry" && months != null;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-card"
            >
              <img
                src={p.image_url ?? "/placeholder.svg"}
                alt={pickName(p, lang)}
                loading="lazy"
                className="size-12 shrink-0 rounded-xl bg-secondary/40 object-contain p-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[12.5px] font-extrabold">{pickName(p, lang)}</p>
                <p className="text-[10.5px] font-semibold text-muted-foreground">
                  {formatPrice(Number(p.price), lang)} · {t("stock")}: {p.stock}
                </p>
                {(near || p.clearance_kind === "outlet") && (
                  <span
                    style={near ? tintStyle(tone.hue, tone.chroma) : tintStyle(220, 0.12)}
                    className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold [background:var(--tint-soft)] [color:var(--tint-strong)]"
                  >
                    {near ? <Hourglass className="size-2.5" /> : <PackageOpen className="size-2.5" />}
                    {near ? monthsChip(months, lang) : t("outlet")}
                  </span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={t("duplicate")}
                onClick={() => setDraft(duplicateDraft(toProductDraft(p)))}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={t("edit")}
                onClick={() => setDraft(toProductDraft(p))}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive"
                aria-label={t("delete")}
                onClick={() => remove.mutate(p.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        {!rows.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        )}
      </div>
    </div>
  );
}
