import {
  Activity,
  Bolt,
  Box,
  Brush,
  Droplets,
  Eye,
  FlaskConical,
  Gem,
  HeartPulse,
  Layers,
  Microscope,
  Package,
  Pill,
  Scissors,
  Shield,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Icon keys admins can pick for a category. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smile: Smile,
  sparkles: Sparkles,
  syringe: Syringe,
  brush: Brush,
  scissors: Scissors,
  wrench: Wrench,
  shield: Shield,
  droplets: Droplets,
  flask: FlaskConical,
  microscope: Microscope,
  stethoscope: Stethoscope,
  pill: Pill,
  gem: Gem,
  layers: Layers,
  box: Box,
  package: Package,
  zap: Zap,
  bolt: Bolt,
  activity: Activity,
  heart: HeartPulse,
  thermometer: Thermometer,
  eye: Eye,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function categoryIcon(key: string | null | undefined): LucideIcon {
  return CATEGORY_ICONS[(key ?? "").toLowerCase()] ?? Package;
}

/** Soft tinted surface + strong icon colour from an oklch hue/chroma pair. */
export function tintStyle(hue: number | string, chroma: number | string) {
  const h = Number(hue) || 0;
  const c = Math.min(Number(chroma) || 0, 0.3);
  return {
    "--tint-soft": `oklch(0.94 ${c * 0.35} ${h})`,
    "--tint-strong": `oklch(0.55 ${c} ${h})`,
    "--tint-border": `oklch(0.87 ${c * 0.5} ${h})`,
  } as React.CSSProperties;
}
