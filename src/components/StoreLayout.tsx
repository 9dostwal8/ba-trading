import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, LayoutGrid, Tag, ShoppingBag, User, Languages } from "lucide-react";
import { QrScanBar } from "@/components/QrScanBar";
import { NotificationBell } from "@/components/NotificationBell";
import { GooshiHeader } from "@/components/GooshiHeader";
import { GooshiFooter } from "@/components/GooshiFooter";

import { useEffect, useRef, type ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { fetchStoreData } from "@/lib/store";
import { SiteMeta } from "@/components/SiteMeta";
import { pick, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCanOrder } from "@/hooks/useCanOrder";
import { LayoutDashboard, Store } from "lucide-react";

const sideNavItems = [
  { to: "/", icon: Home, key: "home" },
  { to: "/products", icon: LayoutGrid, key: "products" },
] as const;

const cartNavItem = { to: "/cart", icon: ShoppingBag, key: "cart" } as const;

const rightNavItems = [
  { to: "/offers", icon: Tag, key: "offers" },
  { to: "/profile", icon: User, key: "account" },
] as const;

export function StoreLayout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { isStaff, isAdmin } = useCanOrder();
  const panelTo = (isAdmin ? "/admin" : "/brand") as "/admin" | "/brand";
  const cart = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const isCart = pathname === "/cart";
  const storePreview = searchStr.includes("view=store");
  const { data } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const s = data?.settings;
  // Theme tokens are applied globally on <html> by <ThemeSync />.
  const rootRef = useRef<HTMLDivElement>(null);

  const brand = (
    <Link to="/" className="flex shrink-0 items-center gap-1.5">
      {s?.logo_url ? (
        <img
          src={s.logo_url}
          alt={pick(s.site_name_ar, s.site_name_ku, lang) || t("storeName")}
          className="size-8 shrink-0 rounded-lg object-contain lg:size-10"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-base text-primary-foreground lg:size-10 lg:text-xl">
          {s?.logo_emoji || "🦷"}
        </span>
      )}
      <span className="max-w-[7rem] truncate font-display text-[13.5px] font-extrabold leading-tight lg:max-w-none lg:text-[17px]">
        {(s && pick(s.site_name_ar, s.site_name_ku, lang)) || t("storeName")}
      </span>
    </Link>
  );

  // Cycles only the languages enabled in admin settings (Arabic -> Kurdish -> English).
  const order: Array<"ar" | "ku" | "en"> = ["ar", "ku", "en"];
  const enabled = order.filter((l) =>
    !s ? true : Boolean((s as unknown as Record<string, boolean>)[`lang_${l}_enabled`]),
  );
  const active: Array<"ar" | "ku" | "en"> = enabled.length ? enabled : ["ar"];
  useEffect(() => {
    if (s && !active.includes(lang)) setLang(active[0]!);
  }, [s, lang, active, setLang]);
  const nextLang = active[(active.indexOf(lang) + 1) % active.length]!;
  const nextLabel = nextLang === "ku" ? t("langKu") : nextLang === "en" ? t("langEn") : t("langAr");
  const langBtn = active.length > 1 && (
    <button
      onClick={() => setLang(nextLang)}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 text-[13px] font-bold text-secondary-foreground transition active:scale-95"
      aria-label={t("language")}
    >
      <Languages className="size-[18px] shrink-0" />
      <span>{nextLabel}</span>
    </button>
  );

  // Admins and vendors get management navigation instead of the dentist one.
  // The second slot opens the dentist storefront preview for a quick look.
  const staffSideItems = [
    { to: "/" as const, icon: Home, key: "home" },
    { to: "/" as const, icon: Store, key: "storeView", search: { view: "store" } as never },
  ];
  const staffRightItems = [
    { to: "/offers" as const, icon: Tag, key: "offers" },
    { to: "/profile" as const, icon: User, key: "account" },
  ];
  type NavItem = {
    to: string;
    icon: typeof Home;
    key: string;
    search?: never;
  };
  const leftItems = (isStaff ? staffSideItems : [...sideNavItems]) as NavItem[];
  const rightItems = (isStaff ? staffRightItems : [...rightNavItems]) as NavItem[];
  const isActive = (item: NavItem) => {
    if (item.key === "storeView") return pathname === "/" && storePreview;
    if (item.to === "/") return pathname === "/" && !storePreview;
    return pathname.startsWith(item.to);
  };
  const staffLabel = (key: string) =>
    key === "manage"
      ? lang === "ar"
        ? "الإدارة"
        : lang === "ku"
          ? "بەڕێوەبردن"
          : "Manage"
      : key === "storeView"
        ? lang === "ar"
          ? "المتجر"
          : lang === "ku"
            ? "فرۆشگا"
            : "Store"
        : t(key as Parameters<typeof t>[0]);

  const desktopLinks = [...leftItems, ...rightItems];

  return (
    <div
      ref={rootRef}
      className="flex min-h-screen w-full flex-col bg-slate-50/40"
    >
      <SiteMeta settings={s} lang={lang} />
      {s?.show_announcement && pick(s.announcement_ar, s.announcement_ku, lang) ? (
        <div className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 px-3 py-2 text-center text-[12px] font-bold text-white shadow-sm">
          {pick(s.announcement_ar, s.announcement_ku, lang)}
        </div>
      ) : null}

      {/* GooshiShop Modern Sticky Header */}
      <GooshiHeader />

      {s?.maintenance_mode ? (
        <div className="mx-auto my-3 w-full max-w-[1536px] px-4">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12.5px] font-bold text-amber-900 shadow-sm">
            {pick(s.maintenance_note_ar, s.maintenance_note_ku, lang) || "🔧"}
          </div>
        </div>
      ) : null}
      
      <main className="flex-1 w-full pb-20 lg:pb-0">{children}</main>

      {/* GooshiShop Modern Footer */}
      <div className="w-full hidden lg:block">
        <GooshiFooter />
      </div>

      {!isCart && (
        <nav className="fixed bottom-0 inset-x-0 z-30 w-full border-t lg:hidden border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-lg">
          <ul className="flex items-end justify-between px-2 py-1 max-w-lg mx-auto">
            <div className="flex flex-1 items-center justify-around">
              {leftItems.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.key} className="flex-1">
                    <Link
                      to={item.to as never} {...(item.search ? { search: item.search } : {})}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-bold transition-colors",
                        active ? "nav-pill" : "text-muted-foreground",
                      )}
                    >
                      <item.icon className={cn("size-5", active && "stroke-[2.5]")} />
                      {staffLabel(item.key)}
                    </Link>
                  </li>
                );
              })}
            </div>

            {isStaff ? (
              <li className="relative -top-5 mx-2 flex-none">
                <Link
                  to={panelTo}
                  className="flex h-14 w-16 -translate-y-1 flex-col items-center justify-center rounded-[22px] bg-primary font-display text-[10.5px] font-bold text-primary-foreground shadow-pop transition active:scale-95"
                >
                  <LayoutDashboard className="size-6" />
                  {staffLabel("manage")}
                </Link>
              </li>
            ) : pathname.startsWith("/cart") ? (
              <li className="mx-2 w-16 flex-none" aria-hidden />
            ) : (
              <li className="relative -top-5 mx-2 flex-none">
                <Link
                  to={cartNavItem.to}
                  className="relative flex h-14 w-16 -translate-y-1 flex-col items-center justify-center rounded-[22px] bg-primary font-display text-[10.5px] font-bold text-primary-foreground shadow-pop transition active:scale-95"
                >
                  <span className="relative">
                    <ShoppingBag className="size-6" />
                    {cart.count > 0 && (
                      <span className="absolute -top-2.5 -end-2.5 grid min-w-[20px] place-items-center rounded-full bg-primary-foreground px-1 text-[10px] font-extrabold text-primary shadow-sm">
                        {cart.count}
                      </span>
                    )}
                  </span>
                  {t(cartNavItem.key)}
                </Link>
              </li>
            )}


            <div className="flex flex-1 items-center justify-around">
              {rightItems.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.key} className="flex-1">
                    <Link
                      to={item.to as never} {...(item.search ? { search: item.search } : {})}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-bold transition-colors",
                        active ? "nav-pill" : "text-muted-foreground",
                      )}
                    >
                      <item.icon className={cn("size-5", active && "stroke-[2.5]")} />
                      {staffLabel(item.key)}
                    </Link>
                  </li>
                );
              })}
            </div>
          </ul>
        </nav>
      )}
    </div>
  );
}

