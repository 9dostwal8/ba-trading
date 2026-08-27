import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketingIcon } from "@/lib/marketing-icons";
import { rewardBarItems, triText, type StoreSettings } from "@/lib/store";

/** Marketing bar under the home header that promotes the reward points program.
 *  Every line, its icon and the CTA label are admin-editable (Admin → Homepage Marketing). */
export function RewardBar({ settings }: { settings?: StoreSettings | null | undefined }) {
  const { lang } = useI18n();
  const dir = lang === "en" ? "ltr" : "rtl";
  if (settings?.rewards_enabled === false || settings?.show_reward_bar === false) return null;

  const facts = rewardBarItems(settings?.reward_bar_items)
    .map((f) => ({ icon: f.icon, text: (lang === "ku" ? f.ku : lang === "en" ? f.en : f.ar) || f.ar }))
    .filter((f) => f.text.trim().length > 0);
  if (!facts.length) return null;
  // One full cycle of facts; duplicated once for a seamless CSS loop.
  const track = [...facts, ...facts];

  const cta = triText(settings?.reward_bar_cta, { ar: "تفاصيل", ku: "وردەکاری", en: "Details" });
  const ctaText = (lang === "ku" ? cta.ku : lang === "en" ? cta.en : cta.ar) || cta.ar;

  const Arrow = dir === "ltr" ? ChevronRight : ChevronLeft;
  const BadgeIcon = marketingIcon(settings?.reward_bar_icon || "coin");
  const to = settings?.reward_bar_link || "/rewards";

  return (
    <div className="px-3 pt-2.5">
      <Link
        to={to}
        className="reward-shine relative isolate flex h-14 items-center overflow-hidden rounded-xl bg-gradient-to-r from-[var(--primary-deep)] via-[var(--primary)] to-[var(--primary)] text-[var(--primary-foreground)] shadow-md active:scale-[0.99]"
      >
        {/* animated icon badge */}
        <span className="reward-float relative z-10 ms-3 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary-foreground)]/20 backdrop-blur-sm">
          <BadgeIcon className="size-4" strokeWidth={2.4} />
        </span>

        {/* slow ticker strip — LTR layout so the duplicate copy sits on the right and the marquee works in any page direction */}
        <div className="reward-ticker relative z-10 flex-1 px-2" dir="ltr">
          <div className="reward-ticker-track" style={{ animationDuration: "24s" }}>
            {track.map((fact, i) => {
              const Icon = marketingIcon(fact.icon);
              return (
                <span
                  key={i}
                  dir={lang === "en" ? "ltr" : "rtl"}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-extrabold tracking-tight"
                >
                  <Icon className="size-3.5" />
                  <span>{fact.text}</span>
                  <span className="mx-0.5 opacity-60">•</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* fade behind the CTA so the ticker doesn't clash */}
        <div className="pointer-events-none absolute inset-y-0 end-0 z-20 w-16 bg-gradient-to-l from-[var(--primary)] via-[var(--primary)]/95 to-transparent" />

        {/* CTA pill */}
        <span className="relative z-20 me-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--primary-foreground)] px-2.5 py-1.5 text-[10px] font-black text-[var(--primary)] shadow-sm">
          <span>{ctaText}</span>
          <Arrow className="size-3.5" />
        </span>
      </Link>
    </div>
  );
}
