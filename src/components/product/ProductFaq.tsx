import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function ProductFaq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-3 text-start text-[13px] font-bold text-slate-800 hover:text-primary transition-colors"
      >
        <span>{q}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-3 text-[12.5px] leading-relaxed text-slate-600 animate-in fade-in duration-200">
          {a}
        </p>
      )}
    </div>
  );
}
