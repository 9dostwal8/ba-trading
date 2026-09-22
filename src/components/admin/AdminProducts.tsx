import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Filter,
  LayoutGrid,
  ListFilter,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, Field, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { PRODUCT_BADGES, ProductBadges, badgeLabel } from "@/lib/badges";
import { PhotoField } from "@/components/catalog/PhotoField";

type Draft = {
  id?: string;
  name_ar: string;
  name_ku: string;
  description_ar: string;
  description_ku: string;
  brand: string;
  sku: string;
  price: string;
  compare_price: string;
  stock: string;
  image_url: string;
  category_id: string;
  vendor_id: string;
  is_active: boolean;
  is_featured: boolean;
  badges: string[];
};

const empty: Draft = {
  name_ar: "",
  name_ku: "",
  description_ar: "",
  description_ku: "",
  brand: "",
  sku: "",
  price: "",
  compare_price: "",
  stock: "0",
  image_url: "",
  category_id: "",
  vendor_id: "",
  is_active: true,
  is_featured: false,
  badges: [],
};

export function AdminProducts() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () =>
      (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ??
      [],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-vendors-lite"],
    queryFn: async () => (await supabase.from("vendors").select("id, name").order("name")).data ?? [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        name_ar: d.name_ar.trim(),
        name_ku: d.name_ku.trim() || d.name_ar.trim(),
        description_ar: d.description_ar,
        description_ku: d.description_ku,
        brand: d.brand,
        sku: d.sku,
        price: Number(d.price) || 0,
        compare_price: d.compare_price ? Number(d.compare_price) : null,
        stock: Number(d.stock) || 0,
        image_url: d.image_url || null,
        category_id: d.category_id || null,
        vendor_id: d.vendor_id || null,
        is_active: d.is_active,
        is_featured: d.is_featured,
        badges: d.badges,
      };
      const res = d.id
        ? await supabase.from("products").update(payload).eq("id", d.id)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
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
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  // Calculate Summary Metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    return { total, active, lowStock, outOfStock };
  }, [products]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Vendor filter
      if (filterVendor !== "all") {
        if (filterVendor === "none" && p.vendor_id) return false;
        if (filterVendor !== "none" && p.vendor_id !== filterVendor) return false;
      }
      // Category filter
      if (filterCategory !== "all" && p.category_id !== filterCategory) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameAr = (p.name_ar || "").toLowerCase();
        const nameKu = (p.name_ku || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        if (!nameAr.includes(q) && !nameKu.includes(q) && !brand.includes(q) && !sku.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, filterVendor, filterCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Page Header & Actions */}
      <SectionHeader
        title={lang === "ar" ? "إدارة منتجات العيادات والفرۆشیاران" : lang === "ku" ? "بەڕێوەبردنی بەرهەمەکان" : "Product Management"}
        action={
          <Button
            size="sm"
            onClick={() => setDraft(draft ? null : empty)}
            className={`rounded-xl font-bold transition-all shadow-md active:scale-95 ${
              draft
                ? "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                : "bg-primary text-primary-foreground hover:opacity-95 shadow-primary/20"
            }`}
          >
            {draft ? <X className="size-4 me-1.5" /> : <Plus className="size-4 me-1.5" />}
            {draft ? t("cancel") : (lang === "ar" ? "إضافة منتج جديد" : lang === "ku" ? "زیاکردنی بەرهەم" : "Add Product")}
          </Button>
        }
      />

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-3.5 shadow-xs dark:border-slate-800/80 dark:from-slate-900 dark:to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {lang === "ar" ? "إجمالي المنتجات" : lang === "ku" ? "کۆی بەرهەمەکان" : "Total Products"}
            </span>
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Boxes className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 to-white p-3.5 shadow-xs dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {lang === "ar" ? "منتجات نشطة" : lang === "ku" ? "بەرهەمی چالاک" : "Active Items"}
            </span>
            <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{metrics.active}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white p-3.5 shadow-xs dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {lang === "ar" ? "مخزون منخفض (≤5)" : lang === "ku" ? "مەخزونی کەم" : "Low Stock"}
            </span>
            <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{metrics.lowStock}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50/40 to-white p-3.5 shadow-xs dark:border-rose-900/40 dark:from-rose-950/20 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              {lang === "ar" ? "نفذت الكمية" : lang === "ku" ? "نەمابوو" : "Out of Stock"}
            </span>
            <span className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
              <Package className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">{metrics.outOfStock}</p>
        </div>
      </div>

      {/* Product Form Modal / Section */}
      {draft && (
        <AdminCard className="border-primary/30 bg-card/95 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-1">
            <h3 className="text-sm font-extrabold flex items-center gap-2 text-primary">
              <Sparkles className="size-4" />
              {draft.id
                ? lang === "ar"
                  ? "تعديل تفاصيل المنتج"
                  : lang === "ku"
                  ? "دەستکاریی بەرهەم"
                  : "Edit Product"
                : lang === "ar"
                ? "إضافة منتج جديد للعيادات"
                : lang === "ku"
                ? "زیاکردنی بەرهەمی نوێ"
                : "New Product Form"}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 rounded-lg"
              onClick={() => setDraft(null)}
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label={lang === "ar" ? "اسم المنتج *" : lang === "ku" ? "ناوی بەرهەم *" : "Product Name *"}
                value={draft.name_ar}
                onChange={(v) => setDraft({ ...draft, name_ar: v, name_ku: v })}
                placeholder={lang === "ar" ? "مثال: كوزموبوليتان حشوة أسنان 3M" : "e.g. 3M Composite Resin"}
              />
            </div>

            <TextField
              label={t("price")}
              type="number"
              value={draft.price}
              onChange={(v) => setDraft({ ...draft, price: v })}
              placeholder="0"
            />
            <TextField
              label={t("oldPrice")}
              type="number"
              value={draft.compare_price}
              onChange={(v) => setDraft({ ...draft, compare_price: v })}
              placeholder="0"
            />
            <TextField
              label={t("stock")}
              type="number"
              value={draft.stock}
              onChange={(v) => setDraft({ ...draft, stock: v })}
              placeholder="0"
            />
            <TextField
              label={t("brand")}
              value={draft.brand}
              onChange={(v) => setDraft({ ...draft, brand: v })}
              placeholder="3M, GC, Tokuyama..."
            />
            <TextField
              label={t("sku")}
              value={draft.sku}
              onChange={(v) => setDraft({ ...draft, sku: v })}
              placeholder="SKU-1002"
            />

            <Field
              label={`${t("category")} ${
                lang === "ar" ? "(إلزامي)" : lang === "ku" ? "(پێویست)" : "(required)"
              }`}
            >
              <Select
                value={draft.category_id}
                onValueChange={(v) => setDraft({ ...draft, category_id: v })}
              >
                <SelectTrigger
                  className={`h-9 rounded-xl ${
                    draft.category_id ? "" : "border-destructive ring-1 ring-destructive/30"
                  }`}
                >
                  <SelectValue placeholder={t("category")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {pickName(c, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("brandManager")}>
            <Select
              value={draft.vendor_id}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  vendor_id: v,
                  brand: vendors.find((x) => x.id === v)?.name ?? draft.brand,
                })
              }
            >
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder={t("brandManager")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <PhotoField
            value={draft.image_url}
            vendorId={draft.vendor_id || null}
            onChange={(v) => setDraft({ ...draft, image_url: v })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("descAr")}>
              <Textarea
                rows={3}
                className="rounded-xl"
                value={draft.description_ar}
                onChange={(e) => setDraft({ ...draft, description_ar: e.target.value })}
              />
            </Field>
            <Field label={t("descKu")}>
              <Textarea
                rows={3}
                className="rounded-xl"
                value={draft.description_ku}
                onChange={(e) => setDraft({ ...draft, description_ku: e.target.value })}
              />
            </Field>
          </div>

          <Field label={lang === "ar" ? "ملصقات ترويجية للمنتج" : "ستیکەرەکانی بەرهەم"}>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_BADGES.map((b) => {
                const on = draft.badges.includes(b.key);
                const Icon = b.icon;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        badges: on
                          ? draft.badges.filter((x) => x !== b.key)
                          : [...draft.badges, b.key],
                      })
                    }
                    style={
                      on
                        ? { backgroundColor: b.ink, borderColor: b.ink }
                        : {
                            backgroundColor: `color-mix(in oklab, ${b.ink} 8%, white)`,
                            borderColor: `color-mix(in oklab, ${b.ink} 20%, white)`,
                            color: b.ink,
                          }
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold tracking-tight transition-all active:scale-95 ${
                      on ? "text-white shadow-md" : ""
                    }`}
                  >
                    <Icon className="size-3.5" strokeWidth={2.7} />
                    {badgeLabel(b, lang)}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <ToggleField
              label={t("active")}
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
            <ToggleField
              label={t("isFeatured")}
              checked={draft.is_featured}
              onChange={(v) => setDraft({ ...draft, is_featured: v })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(null)}
              className="flex-1 rounded-xl h-10 font-bold"
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1 rounded-xl h-10 font-bold bg-primary text-white shadow-md shadow-primary/20"
              disabled={save.isPending || !draft.category_id}
              onClick={() => save.mutate(draft)}
            >
              {save.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </AdminCard>
      )}

      {/* Control Bar: Search, Category Filter, Grid/List Switcher */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Live Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "ar"
                ? "ابحث باسم المنتج، الماركة، أو رمز SKU..."
                : lang === "ku"
                ? "گەڕان بە ناوی بەرهەم، براند یان بارکۆد..."
                : "Search products by name, brand, or SKU..."
            }
            className="h-10 rounded-xl border-slate-200 bg-slate-50/80 ps-9.5 text-xs dark:border-slate-800 dark:bg-slate-800/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filters & View Controls */}
        <div className="flex items-center gap-2">
          {/* Category Dropdown Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800">
              <Filter className="size-3.5 me-1 text-slate-400" />
              <SelectValue placeholder={t("allCategories")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">{t("allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {pickName(c, lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-800/80">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="List View"
            >
              <ListFilter className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vendor Filter Horizontal Pills */}
      <div className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-1 no-scrollbar">
        {[
          { id: "all", name: t("allBrands") },
          ...vendors,
          { id: "none", name: t("noBrand") },
        ].map((v) => {
          const isSelected = filterVendor === v.id;
          const count =
            v.id === "all"
              ? products.length
              : v.id === "none"
              ? products.filter((p) => !p.vendor_id).length
              : products.filter((p) => p.vendor_id === v.id).length;

          return (
            <button
              key={v.id}
              onClick={() => setFilterVendor(v.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all active:scale-95 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>{v.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Products Display List / Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Package className="mx-auto size-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-extrabold text-slate-600 dark:text-slate-300">
            {t("noResults")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lang === "ar"
              ? "لم يتم العثور على أي منتج يطابق خيارات التصفية الحالية."
              : "No products match the selected filters."}
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filteredProducts.map((p) => {
            const vendorObj = vendors.find((v) => v.id === p.vendor_id);
            const vendorName = vendorObj?.name ?? p.brand ?? t("noBrand");
            const isLowStock = p.stock > 0 && p.stock <= 5;
            const isOutStock = p.stock <= 0;

            return (
              <div
                key={p.id}
                className="group relative flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                {/* Product Thumbnail */}
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
                  <img
                    src={p.image_url ?? "/placeholder.svg"}
                    alt={pickName(p, lang)}
                    loading="lazy"
                    className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  {!p.is_active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
                      <span className="text-[9px] font-black text-rose-300 uppercase">
                        {t("outOfStock")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Container */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="line-clamp-1 text-[13.5px] font-black text-slate-900 dark:text-white">
                      {pickName(p, lang)}
                    </h4>
                    {p.is_featured && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                        <Sparkles className="size-3" />
                        {t("isFeatured")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Tag className="size-3 text-primary" />
                      {vendorName}
                    </span>
                    <span>•</span>
                    <span className="font-extrabold text-primary">
                      {formatPrice(Number(p.price), lang)}
                    </span>
                    {p.compare_price && Number(p.compare_price) > Number(p.price) && (
                      <span className="line-through opacity-50 text-[11px]">
                        {formatPrice(Number(p.compare_price), lang)}
                      </span>
                    )}
                    <span>•</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold ${
                        isOutStock
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                          : isLowStock
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isOutStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      {isOutStock
                        ? t("outOfStock")
                        : `${t("stock")}: ${p.stock}`}
                    </span>
                  </div>

                  {/* Badges preview */}
                  {p.badges && p.badges.length > 0 && (
                    <div className="pt-0.5">
                      <ProductBadges badges={p.badges} lang={lang} max={3} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-xl border border-slate-100 bg-slate-50 text-slate-700 hover:bg-primary/10 hover:text-primary dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    onClick={() =>
                      setDraft({
                        id: p.id,
                        name_ar: p.name_ar,
                        name_ku: p.name_ku,
                        description_ar: p.description_ar ?? "",
                        description_ku: p.description_ku ?? "",
                        brand: p.brand ?? "",
                        sku: p.sku ?? "",
                        price: String(p.price),
                        compare_price: p.compare_price ? String(p.compare_price) : "",
                        stock: String(p.stock),
                        image_url: p.image_url ?? "",
                        category_id: p.category_id ?? "",
                        vendor_id: p.vendor_id ?? "",
                        is_active: p.is_active,
                        is_featured: p.is_featured,
                        badges: p.badges ?? [],
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-xl border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-400"
                    onClick={() => remove.mutate(p.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => {
            const vendorObj = vendors.find((v) => v.id === p.vendor_id);
            const vendorName = vendorObj?.name ?? p.brand ?? t("noBrand");

            return (
              <div
                key={p.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/80">
                    <img
                      src={p.image_url ?? "/placeholder.svg"}
                      alt={pickName(p, lang)}
                      className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute start-2 top-2 rounded-lg bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {vendorName}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <h4 className="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">
                      {pickName(p, lang)}
                    </h4>
                    <p className="text-xs font-black text-primary">
                      {formatPrice(Number(p.price), lang)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">
                    {t("stock")}: {p.stock}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg"
                      onClick={() =>
                        setDraft({
                          id: p.id,
                          name_ar: p.name_ar,
                          name_ku: p.name_ku,
                          description_ar: p.description_ar ?? "",
                          description_ku: p.description_ku ?? "",
                          brand: p.brand ?? "",
                          sku: p.sku ?? "",
                          price: String(p.price),
                          compare_price: p.compare_price ? String(p.compare_price) : "",
                          stock: String(p.stock),
                          image_url: p.image_url ?? "",
                          category_id: p.category_id ?? "",
                          vendor_id: p.vendor_id ?? "",
                          is_active: p.is_active,
                          is_featured: p.is_featured,
                          badges: p.badges ?? [],
                        })
                      }
                    >
                      <Pencil className="size-4 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg text-rose-600"
                      onClick={() => remove.mutate(p.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
