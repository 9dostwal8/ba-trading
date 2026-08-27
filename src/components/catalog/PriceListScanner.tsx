import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, Loader2, ScanText, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiScanPriceList, type AiScannedItem } from "@/lib/ai-listing.functions";
import { useI18n } from "@/lib/i18n";

type Row = AiScannedItem & { on: boolean };

/** Reads an image file as a compressed data URL the AI can see. */
async function toDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/**
 * "Sell in 60 seconds": vendor snaps their paper price list and every readable
 * row becomes a listing they can confirm in one tap.
 */
export function PriceListScanner({
  onPublish,
  saving,
}: {
  onPublish: (items: AiScannedItem[]) => Promise<void> | void;
  saving?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const scan = useServerFn(aiScanPriceList);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setRows([]);
    try {
      const url = await toDataUrl(file);
      const items = await scan({ data: { imageDataUrl: url } });
      if (!items.length) toast.info(t("aiScanNone"));
      setRows(items.map((i) => ({ ...i, on: true })));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  const patch = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const selected = rows.filter((r) => r.on && r.name.trim());

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <ScanText className="size-5" strokeWidth={2.6} />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-extrabold">{t("aiScanTitle")}</p>
          <p className="text-[10.5px] font-semibold leading-snug text-muted-foreground">
            {t("aiScanHint")}
          </p>
        </div>
      </div>

      <label className="block">
        <span className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary text-[12px] font-extrabold text-primary-foreground active:scale-[0.99]">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {busy ? t("aiWorking") : t("aiScanPick")}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>

      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-[11px] font-extrabold text-primary">
            <Sparkles className="size-3.5" /> {rows.length} {t("aiScanFound")}
          </p>
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card p-1.5"
              >
                <button
                  type="button"
                  onClick={() => patch(i, { on: !r.on })}
                  className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                    r.on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Check className="size-4" strokeWidth={3} />
                </button>
                <Input
                  value={r.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                  className="h-8 min-w-0 flex-1 text-[11.5px]"
                  dir="ltr"
                />
                <Input
                  type="number"
                  value={String(r.price || "")}
                  onChange={(e) => patch(i, { price: Number(e.target.value) || 0 })}
                  className="h-8 w-20 shrink-0 text-[11.5px]"
                  dir="ltr"
                />
                <Input
                  type="number"
                  value={String(r.stock || "")}
                  onChange={(e) => patch(i, { stock: Number(e.target.value) || 0 })}
                  className="h-8 w-14 shrink-0 text-[11.5px]"
                  dir="ltr"
                />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={saving || !selected.length}
            onClick={async () => {
              await onPublish(selected.map(({ on: _on, ...rest }) => rest));
              setRows([]);
            }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t("aiPublishAll")} ({selected.length})
          </Button>
        </div>
      )}
    </div>
  );
}
