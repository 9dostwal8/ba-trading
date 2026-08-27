import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { fetchVendor, parseVendorScan } from "@/lib/vendor-public";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "مسح رمز المورد | دنتال ستور" },
      { name: "description", content: "اختر صورة رمز QR الخاص بالمورد لعرض صفحته ومنتجاته وعروضه." },
      { property: "og:title", content: "مسح رمز المورد | دنتال ستور" },
      { property: "og:description", content: "ابحث عن المورد بصورة رمز QR أو بإدخال الرمز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

/** Decode a QR code from a picked image file (jsqr is loaded lazily to keep the app fast). */
async function decodeFile(file: File): Promise<string | null> {
  const [{ default: jsQR }, bitmap] = await Promise.all([
    import("jsqr"),
    createImageBitmap(file),
  ]);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  return jsQR(img.data, img.width, img.height)?.data ?? null;
}

function ScanPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function open(key: string) {
    const vendor = await fetchVendor(parseVendorScan(key));
    if (!vendor) {
      toast.error(t("vendorNotFound"));
      return;
    }
    navigate({ to: "/vendor/$slug", params: { slug: vendor.slug } });
  }

  async function onPick(file?: File | null) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const found = await decodeFile(file);
      if (!found) {
        toast.error(t("qrNotDetected"));
        return;
      }
      await open(found);
    } catch {
      toast.error(t("qrNotDetected"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreLayout>
      <div className="space-y-3 p-3 pb-10">
        <section className="auth-sky rounded-3xl px-4 py-5">
          <h1 className="font-display text-[20px] font-extrabold leading-tight">{t("scanQr")}</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed opacity-85">{t("scanQrHint")}</p>
        </section>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid w-full place-items-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-primary/40 bg-card p-6 text-center shadow-soft active:scale-[0.99]"
        >
          {preview ? (
            <img src={preview} alt="" className="max-h-56 w-auto rounded-2xl object-contain" />
          ) : (
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10">
              <ImagePlus className="size-7 text-primary" strokeWidth={2.4} />
            </span>
          )}
          <span className="inline-flex items-center gap-2 text-[13.5px] font-extrabold">
            {busy && <Loader2 className="size-4 animate-spin text-primary" />}
            {busy ? t("qrReading") : t("pickQrPhoto")}
          </span>
        </button>

        <div className="rounded-3xl border border-border/70 bg-card p-3 shadow-soft">
          <p className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold">
            <QrCode className="size-4 text-primary" />
            {t("enterVendorCode")}
          </p>
          <div className="flex gap-2">
            <Input
              className="h-11 flex-1 rounded-xl font-mono"
              dir="ltr"
              placeholder="V1234ABCD"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <Button className="h-11 rounded-xl" onClick={() => manual.trim() && void open(manual)}>
              {t("openVendor")}
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
