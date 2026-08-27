import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { vendorQrValue } from "@/lib/vendor-public";
import type { Vendor } from "@/lib/vendors";

/**
 * Printable QR card for a vendor: scanning it opens the vendor profile in the
 * app. Used on the public vendor page and inside the vendor portal.
 */
export function VendorQrCard({ vendor }: { vendor: Vendor }) {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const value = vendorQrValue(vendor);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1220", light: "#ffffff" },
    })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value]);

  function download() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${vendor.code}-qr.png`;
    a.click();
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: vendor.name, url: value });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard?.writeText(value);
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="tile-icon size-9 text-primary">
          <QrCode className="size-4.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold">{t("vendorQr")}</p>
          <p className="truncate text-[11px] text-muted-foreground">{t("vendorQrHint")}</p>
        </div>
      </div>

      <div className="mt-3 grid place-items-center rounded-2xl bg-secondary/50 p-4">
        {src ? (
          <img src={src} alt={`${vendor.name} QR`} className="size-40 rounded-xl bg-white p-1.5" />
        ) : (
          <div className="size-40 animate-pulse rounded-xl bg-muted" />
        )}
        <p className="mt-2 font-mono text-[13px] font-extrabold tracking-widest" dir="ltr">
          {vendor.code}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-10 rounded-xl" onClick={download}>
          <Download className="size-4" />
          {t("downloadQr")}
        </Button>
        <Button variant="secondary" className="h-10 rounded-xl" onClick={share}>
          <Share2 className="size-4" />
          {t("shareQr")}
        </Button>
      </div>
    </div>
  );
}
