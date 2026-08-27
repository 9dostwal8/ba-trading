import {
  BadgeCheck,
  Bell,
  Coins,
  Crown,
  Flame,
  Gift,
  Handshake,
  Heart,
  Percent,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  TrendingUp,
  Trophy,
  Truck,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Icon keys admins can pick for homepage marketing rows (reward bar + vendor CTA). */
export const MARKETING_ICONS: Record<string, LucideIcon> = {
  coin: Coins,
  gift: Gift,
  star: Star,
  trend: TrendingUp,
  users: Users,
  zap: Zap,
  sparkles: Sparkles,
  store: Store,
  percent: Percent,
  tag: Tag,
  wallet: Wallet,
  truck: Truck,
  shield: ShieldCheck,
  "badge-check": BadgeCheck,
  crown: Crown,
  trophy: Trophy,
  flame: Flame,
  rocket: Rocket,
  handshake: Handshake,
  heart: Heart,
  bell: Bell,
};

export const MARKETING_ICON_KEYS = Object.keys(MARKETING_ICONS);

export function marketingIcon(key: string | null | undefined): LucideIcon {
  return MARKETING_ICONS[(key ?? "").toLowerCase()] ?? Sparkles;
}
