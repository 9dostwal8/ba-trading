import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Percent } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { tierUnitPrice, tiersOf } from "@/lib/store";
import type { Product, ProductTier } from "@/lib/store";

function useProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () =>
      ((await supabase.from("products").select("*").order("created_at", { ascending: false }))
        .data ?? []) as unknown as Product[],
  });
}

function useTiers() {
  return useQuery({
    queryKey: ["admin-tiers"],
    queryFn: async () =>
      ((await supabase.from("product_tiers").select("*").order("min_qty")).data ??
        []) as unknown as ProductTier[],
  });
}

/** Quantity-discount (wholesale tier) control room: pick a product, manage its ladder, simulate. */
export function AdminTiers() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const { data: tiers } = useTiers();
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [minQty, setMinQty] = useState("3");
  const [price, setPrice] = useState("");
  const [pct, setPct] = useState("10");

  const list = products ?? [];
  const product = list.find((p) => p.id === productId) ?? null;
  const base = Number(product?.price ?? 0);
  const rows = product ? tiersOf(product.id, tiers ?? []) : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const withTiers = (id: string) => (tiers ?? []).some((tr) => tr.product_id === id);
    return list
      .filter((p) => !q || pickName(p, lang).toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
      .sort((a, b) => Number(withTiers(b.id)) - Number(withTiers(a.id)));
  }, [list, tiers, search, lang]);

  const save = useMutation({
    mutationFn: async (row: { id?: string; min_qty: number; price: number }) => {
      if (!productId) throw new Error("no product");
      if (row.min_qty < 2) throw new Error("qty");
      if (row.price <= 0 || row.price >= base) throw new Error("price");
      const payload = { product_id: productId, min_qty: row.min_qty, price: row.price };
      const { error } = row.id
        ? await supabase.from("product_tiers").update(payload).eq("id", row.id)
        : await supabase.from("product_tiers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setPrice("");
      qc.invalidateQueries();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "qty" ? t("tierQtyError") : e.message === "price" ? t("tierPriceError") : t("error"),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_tiers").delete().eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const pctPrice = Math.round(base * (1 - (Number(pct) || 0) / 100));

  return (
    <div className="space-y-3">
      <AdminCard>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("tiersHelp")}</p>
      </AdminCard>

      <SectionHeader title={t("product")} />
      <AdminCard>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchProduct")}
          className="h-9"
        />
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {filtered.map((p) => {
            const count = (tiers ?? []).filter((tr) => tr.product_id === p.id).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className={`flex w-full items-center gap-2 rounded-md p-1.5 text-start ${
                  productId === p.id ? "bg-primary/10" : ""
                }`}
              >
                <span className="line-clamp-1 flex-1 text-[11px] font-bold">{pickName(p, lang)}</span>
                {count > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                    {count} {t("tierCount")}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatPrice(Number(p.price), lang)}
                </span>
              </button>
            );
          })}
        </div>
      </AdminCard>

      {product && (
        <>
          <SectionHeader title={t("wholesaleTiers")} />
          <div className="space-y-1">
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2 text-[11px]">
              <span className="flex-1 font-bold">
                {t("fromQty")} 1 · {t("basePriceLabel")}
              </span>
              <span className="font-extrabold">{formatPrice(base, lang)}</span>
            </div>
            {rows.map((tr) => (
              <TierRow
                key={tr.id}
                tier={tr}
                base={base}
                onSave={(min_qty, p) => save.mutate({ id: tr.id, min_qty, price: p })}
                onDelete={() => remove.mutate(tr.id)}
              />
            ))}
            {rows.length === 0 && (
              <p className="px-1 text-[11px] text-muted-foreground">{t("noTiersYet")}</p>
            )}
          </div>

          <AdminCard>
            <div className="grid grid-cols-2 gap-2">
              <TextField label={t("minQty")} type="number" value={minQty} onChange={setMinQty} />
              <TextField
                label={t("unitPrice")}
                type="number"
                value={price}
                onChange={setPrice}
                placeholder={String(base)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label={t("tierByPercent")} type="number" value={pct} onChange={setPct} />
              </div>
              <Button
                variant="secondary"
                className="h-9"
                onClick={() => setPrice(String(pctPrice))}
              >
                <Percent className="size-4" />
                {formatPrice(pctPrice, lang)}
              </Button>
            </div>
            <Button
              className="w-full"
              onClick={() =>
                save.mutate({ min_qty: Number(minQty) || 0, price: Number(price) || 0 })
              }
            >
              <Plus className="size-4" />
              {t("addTier")}
            </Button>
            {rows.length > 0 && (
              <Button variant="ghost" className="w-full text-destructive" onClick={() => clearAll.mutate()}>
                <Trash2 className="size-4" />
                {t("clearTiers")}
              </Button>
            )}
          </AdminCard>

          <TierSimulator product={product} tiers={rows} />
        </>
      )}
    </div>
  );
}

function TierRow({
  tier,
  base,
  onSave,
  onDelete,
}: {
  tier: ProductTier;
  base: number;
  onSave: (minQty: number, price: number) => void;
  onDelete: () => void;
}) {
  const { t, lang } = useI18n();
  const [qty, setQty] = useState(String(tier.min_qty));
  const [price, setPrice] = useState(String(Number(tier.price)));
  const off = base > 0 ? Math.round((1 - Number(price) / base) * 100) : 0;
  const dirty = qty !== String(tier.min_qty) || price !== String(Number(tier.price));

  return (
    <div className="rounded-lg border border-border bg-card px-2 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{t("fromQty")}</span>
        <Input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="h-8 w-16 text-center"
        />
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 flex-1"
        />
        <span className="w-10 text-center text-[11px] font-extrabold text-primary">-{off}%</span>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
      {dirty && (
        <Button
          size="sm"
          className="mt-2 h-7 w-full text-[11px]"
          onClick={() => onSave(Number(qty) || 0, Number(price) || 0)}
        >
          {t("save")}
        </Button>
      )}
      <p className="mt-1 px-1 text-[10px] text-muted-foreground">
        {t("perPiece")} {formatPrice(Number(price) || 0, lang)}
      </p>
    </div>
  );
}

function TierSimulator({ product, tiers }: { product: Product; tiers: ProductTier[] }) {
  const { t, lang } = useI18n();
  const [qty, setQty] = useState(1);
  const base = Number(product.price);
  const unit = tierUnitPrice(base, qty, tiers);
  const off = base > 0 ? Math.round(((base - unit) / base) * 100) : 0;
  const active = tiers.filter((r) => qty >= r.min_qty && Number(r.price) <= unit).at(-1);
  const next = tiers.find((r) => r.min_qty > qty);

  return (
    <div className="space-y-2">
      <SectionHeader title={t("tierSimulator")} />
      <AdminCard>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">{t("quantity")}</Label>
            <span className="text-[12px] font-extrabold">
              {qty} {t("pieces")}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">{t("simQtyHint")}</p>
          <Slider value={[qty]} min={1} max={50} step={1} onValueChange={(v) => setQty(v[0] ?? 1)} />
          <div className="flex gap-1.5 pt-1">
            {[1, 3, 6, 12, 24].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={qty === n ? "default" : "secondary"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setQty(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">{t("perPiece")}</p>
              <p className="text-[18px] font-extrabold text-primary">{formatPrice(unit, lang)}</p>
            </div>
            <div className="text-end">
              <p className="text-[10px] text-muted-foreground">{t("total")}</p>
              <p className="text-[14px] font-extrabold">{formatPrice(unit * qty, lang)}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <span className="text-muted-foreground">{t("basePriceLabel")}</span>
            <span className="text-end font-bold">{formatPrice(base, lang)}</span>
            <span className="text-muted-foreground">{t("discountPct")}</span>
            <span className="text-end font-bold">{off}%</span>
            <span className="text-muted-foreground">{t("savings")}</span>
            <span className="text-end font-bold">{formatPrice((base - unit) * qty, lang)}</span>
            <span className="text-muted-foreground">{t("activeTier")}</span>
            <span className="text-end font-bold">
              {active ? `${t("fromQty")} ${active.min_qty}` : t("basePriceLabel")}
            </span>
          </div>
          {next && (
            <p className="mt-2 text-[11px] font-bold text-accent-foreground">
              {t("nextTierAt")} {next.min_qty} {t("pieces")} · {formatPrice(Number(next.price), lang)}{" "}
              {t("perPiece")}
            </p>
          )}
          {tiers.length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">{t("noTiersYet")}</p>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
