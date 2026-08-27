import {
  BadgeCheck,
  Banknote,
  Clock,
  CreditCard,
  Gift,
  Headphones,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Percent,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Icon keys admins can pick for a service highlight (header strip). */
export const USP_ICONS: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  shield: ShieldCheck,
  truck: Truck,
  package: Package,
  wallet: Wallet,
  banknote: Banknote,
  "credit-card": CreditCard,
  percent: Percent,
  headphones: Headphones,
  "message-circle": MessageCircle,
  phone: Phone,
  clock: Clock,
  refresh: RefreshCcw,
  gift: Gift,
  star: Star,
  "thumbs-up": ThumbsUp,
  heart: Heart,
  sparkles: Sparkles,
  store: Store,
  "map-pin": MapPin,
};

export const USP_ICON_KEYS = Object.keys(USP_ICONS);

export function uspIcon(key: string | null | undefined): LucideIcon {
  return USP_ICONS[(key ?? "").toLowerCase()] ?? BadgeCheck;
}
