import { QrScanBar } from "@/components/QrScanBar";

/**
 * Top of the mobile home page: a plain white strip whose only action is the QR
 * reader — dentists find a product or a vendor by picking its QR photo.
 */
export function HomeIntro() {
  return (
    <div className="bg-card px-3 pb-3 pt-2.5">
      <div className="flex items-center gap-2">
        <QrScanBar />
      </div>
    </div>
  );
}
