import { useNavigate } from "@tanstack/react-router";
import { Loader2, QrCode, ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { decodeQrFile, inAppPath } from "@/lib/qr-scan";
import { pick, useI18n, label } from "@/lib/i18n";
import { fetchVendor, parseVendorScan } from "@/lib/vendor-public";

const copy = {
  bar: {
    ar: "ابحث عن منتج أو مورد برمز QR",
    ku: "بە کۆدی QR بەرهەم یان فرۆشیار بدۆزە",
    en: "Scan QR for Product or Supplier",
  },
  hint: {
    ar: "اضغط لاختيار صورة الرمز من معرض الصور",
    ku: "دەستی لێبنە بۆ هەڵبژاردنی وێنەی کۆد لە گالەری",
    en: "Tap to choose QR image from gallery",
  },
  reading: { ar: "جاري القراءة…", ku: "خوێندنەوە…", en: "Scanning…",},
  notFound: { ar: "لم يتم العثور على رمز QR في الصورة", ku: "کۆدی QR لە وێنەدا نەدۆزرا", en: "No QR code found in image",},
  noVendor: { ar: "الرمز غير معروف", ku: "کۆد نەناسراوە", en: "Unknown Code",},
};

/**
 * One-tap QR entry point: opens the phone gallery straight away, reads the code
 * from the picked photo and jumps to the product / vendor it points at.
 */
export function QrScanBar({ compact = false }: { compact?: boolean }) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const found = await decodeQrFile(file);
      if (!found) {
        toast.error(label(copy.notFound, lang));
        return;
      }
      const path = inAppPath(found);
      if (path && path !== "/") {
        await navigate({ to: path });
        return;
      }
      const vendor = await fetchVendor(parseVendorScan(found));
      if (!vendor) {
        toast.error(label(copy.noVendor, lang));
        return;
      }
      await navigate({ to: "/vendor/$slug", params: { slug: vendor.slug } });
    } catch {
      toast.error(label(copy.notFound, lang));
    } finally {
      setBusy(false);
    }
  }

  const barLabel = label(copy.bar, lang);

  return (
    <>
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
        aria-label={barLabel}
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="dk-search min-w-0 flex-1 gap-2 text-start active:opacity-80"
      >
        {busy ? (
          <Loader2 className="size-[18px] shrink-0 animate-spin text-primary" />
        ) : (
          <QrCode className="size-[18px] shrink-0 text-primary" strokeWidth={2.4} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-bold text-foreground">
            {busy ? label(copy.reading, lang) : barLabel}
          </span>
          {!compact && (
            <span className="block truncate text-[10.5px] font-medium text-muted-foreground">
              {label(copy.hint, lang)}
            </span>
          )}
        </span>
        <ScanLine className="size-[18px] shrink-0 text-primary" strokeWidth={2.4} />
      </button>
    </>
  );
}
