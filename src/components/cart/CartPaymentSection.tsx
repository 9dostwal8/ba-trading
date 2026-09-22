import { Banknote, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartPaymentSectionProps {
  payMethod: "cod" | "qi";
  setPayMethod: (method: "cod" | "qi") => void;
  payCopy: {
    title: string;
    cod: string;
    codNote: string;
    qi: string;
    qiNote: string;
  };
}

export function CartPaymentSection({
  payMethod,
  setPayMethod,
  payCopy,
}: CartPaymentSectionProps) {
  const options = [
    { key: "cod" as const, icon: Banknote, label: payCopy.cod, note: payCopy.codNote },
    { key: "qi" as const, icon: CreditCard, label: payCopy.qi, note: payCopy.qiNote },
  ];

  return (
    <section className="dk-block">
      <div className="dk-head border-b border-border/60">
        <span className="step-dot">3</span>
        <h2 className="min-w-0 flex-1 truncate font-display text-[14.5px] font-extrabold">
          {payCopy.title}
        </h2>
      </div>
      <div className="grid gap-2 p-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setPayMethod(opt.key)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-start transition active:scale-[0.99] disabled:opacity-60",
              payMethod === opt.key ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
          >
            <span
              className={cn(
                "head-icon",
                payMethod === opt.key ? "text-primary" : "text-muted-foreground",
              )}
            >
              <opt.icon className="size-4" strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold">{opt.label}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{opt.note}</span>
            </span>
            <span
              className={cn(
                "size-4 shrink-0 rounded-full border-2",
                payMethod === opt.key ? "border-primary bg-primary" : "border-border",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
