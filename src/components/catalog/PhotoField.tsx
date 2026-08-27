import { Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { uploadMessage, uploadProductImage } from "@/lib/upload";

/**
 * Photo picker for product forms: upload a file (validated, downscaled and
 * stored under the owning vendor's folder) or paste a link.
 */
export function PhotoField({
  value,
  onChange,
  vendorId,
}: {
  value: string;
  onChange: (url: string) => void;
  vendorId?: string | null;
}) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadProductImage(file, vendorId));
      toast.success(t("saved"));
    } catch (e) {
      toast.error(uploadMessage(e, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2.5">
      <label className="relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-secondary/50">
        {busy ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : value ? (
          <img src={value} alt="" className="h-full w-full object-contain p-1" />
        ) : (
          <Upload className="size-5 text-muted-foreground" />
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-[11.5px] font-extrabold">{t("imageUrl")}</label>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 pe-8"
            placeholder="https://…"
            dir="ltr"
          />
          {value && (
            <button
              type="button"
              aria-label={t("delete")}
              onClick={() => onChange("")}
              className="absolute end-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[10.5px] text-muted-foreground">
          {lang === "ar" ? "JPG / PNG / WEBP — حتى 8 ميغا" : "JPG / PNG / WEBP — تا ٨ مێگا"}
        </p>
      </div>
    </div>
  );
}
