import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CreditCard,
  Home,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Trash2,
  Truck,
  User,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { RewardEarnNote } from "@/components/cart/RewardEarnNote";
import { BannerSlot } from "@/components/BannerSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CartAuthGate } from "@/components/cart/CartAuthGate";
import { useCanOrder } from "@/hooks/useCanOrder";
import { lineKey, useCart, type CartItem } from "@/lib/cart";
import { startQiPayment } from "@/lib/qi.functions";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { useMyWallet } from "@/lib/wallet";
import {
  COIN_WORD,
  coinsToMoney,
  formatPoints,
  moneyToCoins,
  useRewardSettings,
} from "@/lib/rewards";
import { shippingBreakdown, vendorSubtotals, type ShippingRate } from "@/lib/shipping";
import { cn } from "@/lib/utils";

const STAFF_COPY = {
  ar: {
    cta: "الحساب لا يشتري",
    block: "حسابات الإدارة والموردين لا يمكنها الشراء — الشراء للعيادات فقط.",
    title: "هذا الحساب للإدارة فقط",
    note: "حسابات الإدارة والموردين تدير المنتجات والعروض فقط. الشراء ونقاط المكافأة للأطباء والعيادات.",
  },
  ku: {
    cta: "ئەم هەژمارە کڕین ناکات",
    block: "هەژماری بەڕێوەبەر و فرۆشیار ناتوانن بکڕن — تەنها کلینیکەکان دەکڕن.",
    title: "ئەم هەژمارە بۆ بەڕێوەبردنە",
    note: "هەژماری بەڕێوەبەر و فرۆشیار تەنها بەرهەم و پێشکەشکردن بەڕێوە دەبەن. کڕین و خاڵی خەڵات بۆ پزیشک و کلینیکەکانە.",
  },
  en: {
    cta: "Staff accounts can't buy",
    block: "Admin and vendor accounts cannot place orders — ordering is for clinics only.",
    title: "This is a management account",
    note: "Admin and vendor accounts only manage products and offers. Ordering and reward points are for dentists and clinics.",
  },
} as const;

const PAY_COPY = {
  ar: {
    title: "طريقة الدفع",
    cod: "الدفع عند الاستلام",
    codNote: "ادفع نقداً للمندوب عند وصول الطلب",
    qi: "بطاقة كي — Qi Card",
    qiNote: "دفع إلكتروني آمن عبر بوابة كي كارد",
    payError: "تعذر بدء الدفع الإلكتروني",
    payNow: "ادفع الآن",
    coins: "استبدال نقاط المكافأة",
    coinsAvail: "نقاطك المتاحة",
    coinsFrozen: "النقاط موقوفة مؤقتاً",
    coinsDone: "تم تطبيق خصم النقاط",
    coinsFail: "تعذر تطبيق خصم النقاط",
    coinsDiscount: "خصم النقاط",
    coinsCap: "المسموح استخدامه من نقاطك",
    coinsBal: "رصيدك الكامل",
    coinsUsable: "المسموح استخدامه في هذا الطلب",
    coinsOrderTotal: "إجمالي الطلب قبل الخصم",
    coinsBalValue: "قيمة النقاط المسموحة",
    coinsApplied: "الخصم المطبَّق الآن",
    coinsRule: "القاعدة: في كل طلب يمكنك استخدام {p}% كحد أقصى من نقاطك — والباقي يبقى في رصيدك للطلبات القادمة.",
    coinsWhy: "يُستخدم الأقل: النقاط المسموحة أو ما يغطي إجمالي الطلب",
  },
  ku: {
    title: "شێوازی پارەدان",
    cod: "پارەدان لە کاتی وەرگرتن",
    codNote: "پارە بە نەقدی بدە کاتێک داواکاری گەیشت",
    qi: "کارتی Qi — Qi Card",
    qiNote: "پارەدانی ئەلیکترۆنی پارێزراو بە دەروازەی Qi Card",
    payError: "نەتوانرا پارەدانی ئەلیکترۆنی دەست پێ بکات",
    payNow: "ئێستا پارە بدە",
    coins: "گۆڕینی خاڵی خەڵات",
    coinsAvail: "خاڵەکانی بەردەست",
    coinsFrozen: "خاڵەکان بەستراون",
    coinsDone: "داشکاندنی خاڵ جێبەجێ کرا",
    coinsFail: "نەتوانرا داشکاندنی خاڵ جێبەجێ بکرێت",
    coinsDiscount: "داشکاندنی خاڵ",
    coinsCap: "ئەوەی لە خاڵەکانت ڕێگەپێدراوە",
    coinsBal: "باڵانسی تەواوت",
    coinsUsable: "ئەوەی لەم داواکاریدا بەکاردێت",
    coinsOrderTotal: "کۆی داواکاری پێش داشکاندن",
    coinsBalValue: "بەهای خاڵی ڕێگەپێدراو",
    coinsApplied: "داشکاندنی جێبەجێکراو",
    coinsRule: "یاسا: لە هەر داواکاریدا تەنها {p}% ی خاڵەکانت بەکار دەهێنرێت — ئەوانی تر لە باڵانسەکەت دەمێنێتەوە.",
    coinsWhy: "کەمترین بەکاردێت: خاڵی ڕێگەپێدراو یان بەهای داواکاری",
  },
  en: {
    title: "Payment method",
    cod: "Cash on delivery",
    codNote: "Pay the courier in cash when your order arrives",
    qi: "Qi Card",
    qiNote: "Secure online payment through the Qi Card gateway",
    payError: "Could not start the online payment",
    payNow: "Pay now",
    coins: "Use Reward Points",
    coinsAvail: "Your available points",
    coinsFrozen: "Points are frozen",
    coinsDone: "Points discount applied",
    coinsFail: "Could not apply the points discount",
    coinsDiscount: "Points discount",
    coinsCap: "Allowed share of your points",
    coinsBal: "Your full balance",
    coinsUsable: "Usable on this order",
    coinsOrderTotal: "Order total before discount",
    coinsBalValue: "Value of allowed points",
    coinsApplied: "Discount applied now",
    coinsRule: "Rule: you can spend up to {p}% of your points on each order — the rest stays in your balance for next time.",
    coinsWhy: "The smaller of the two applies: allowed points, or the order value",
  },
} as const;

const bundleNote = {
  ar: "محتويات الحزمة تُشترى كاملة بسعر الحزمة — لا يمكن حذف عنصر منها.",
  ku: "ناوەڕۆکی پاکێج بە تەواوی بە نرخی پاکێج دەکڕدرێت — ناتوانرێت یەک بەش لابردرێت.",
  en: "Package contents are purchased as a complete set at the package price — items cannot be removed.",
} as const;



export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة الشراء | دنتال ستور" },
      { name: "description", content: "راجع سلتك، أضف كود الخصم وأكمل طلبك بسهولة." },
      { property: "og:title", content: "سلة الشراء | دنتال ستور" },
      { property: "og:description", content: "أكمل طلبك من دنتال ستور بخطوات بسيطة." },
    ],
  }),
  component: CartPage,
});

type Coupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
};

const DELIV = {
  saved: {
    ar: "بياناتك المحفوظة",
    ku: "زانیاری پاشەکەوتکراوت",
    en: "Your saved details",
  },
  savedNote: {
    ar: "سنستخدم هذه البيانات للطلب. تحتاج تغيير الموقع فقط؟",
    ku: "هەمان زانیاری بۆ داواکاری بەکاردەهێنین. تەنها شوێن دەگۆڕیت؟",
    en: "We'll use these details for the order. Only need a different location?",
  },
  useSaved: { ar: "استخدم موقعي المحفوظ", ku: "شوێنی پاشەکەوتکراو", en: "Use saved location" },
  change: { ar: "تغيير الموقع", ku: "گۆڕینی شوێن", en: "Change location" },
  keep: { ar: "إبقاء المحفوظ", ku: "هێشتنەوەی پاشەکەوتکراو", en: "Keep saved" },
  editName: {
    ar: "الاسم والموبايل يُعدّلان من صفحة الحساب",
    ku: "ناو و مۆبایل لە پەیجی هەژمار دەگۆڕدرێن",
    en: "Name and mobile are edited from your account page",
  },
  noLoc: { ar: "لا يوجد موقع محفوظ", ku: "شوێنی پاشەکەوتکراو نییە", en: "No saved location" },
  savedTitle: {
    ar: "موقع التوصيل المحفوظ",
    ku: "شوێنی گەیاندنی پاشەکەوتکراو",
    en: "Saved delivery location",
  },
  askChange: {
    ar: "هل نوصل إلى هذا الموقع؟ يمكنك تغييره الآن.",
    ku: "بۆ ئەم شوێنە بگەیەنین؟ دەتوانی ئێستا بگۆڕیت.",
    en: "Deliver to this location? You can change it now.",
  },
  usingNew: {
    ar: "سيتم التوصيل إلى",
    ku: "دەگەیەنرێت بۆ",
    en: "Delivering to",
  },

};


function CartPage() {
  const { lang, t } = useI18n();
  const cart = useCart();
  const { user } = useAuth();
  const { isStaff } = useCanOrder();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "", note: "" });
  const [addressId, setAddressId] = useState<string | null>(null);
  const [editLoc, setEditLoc] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [payMethod, setPayMethod] = useState<"cod" | "qi">("cod");
  const [useCoins, setUseCoins] = useState(false);
  const { data: rewardSettings } = useRewardSettings();
  const rewardsOn = rewardSettings?.rewards_enabled === true;
  const coinRate = Number(rewardSettings?.points_per_1000_iqd ?? 0);
  const maxRedeemPct = Number(rewardSettings?.rewards_max_redeem_percent ?? 0);
  const { data: myWallet } = useMyWallet(user?.id, rewardsOn);
  const coinBalance = Math.floor(myWallet?.balance ?? 0);
  const coinsFrozen = myWallet?.frozen === true;
  const startPayment = useServerFn(startQiPayment);
  const payCopy = PAY_COPY[lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];


  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false });
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["store-settings-shipping"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("delivery_fee, free_delivery_over")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const vendorIds = [...new Set(cart.items.map((i) => i.vendor_id).filter(Boolean))] as string[];
  const { data: shipRates } = useQuery({
    queryKey: ["cart-ship-rates", vendorIds.join(",")],
    enabled: vendorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_shipping_rates")
        .select("*")
        .eq("is_active", true)
        .in("vendor_id", vendorIds);
      return (data ?? []) as unknown as ShippingRate[];
    },
  });

  const { data: shipVendors } = useQuery({
    queryKey: ["cart-ship-vendors", vendorIds.join(",")],
    enabled: vendorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, name").in("id", vendorIds);
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; phone?: string };
    const fallbackPhone =
      meta.phone || user?.phone || (user?.email ? user.email.split("@")[0] : "");
    setForm((f) => ({
      ...f,
      name: f.name || profile?.full_name || meta.full_name || "",
      phone: f.phone || profile?.phone || fallbackPhone || "",
    }));
  }, [profile, user]);


  useEffect(() => {
    const def = addresses?.[0];
    if (def && !addressId) {
      setAddressId(def.id);
      setForm((f) => ({ ...f, city: def.city, address: def.address_line }));
      return;
    }
    if (!def && profile?.city) {
      setForm((f) => ({ ...f, city: f.city || profile.city }));
    }
  }, [addresses, addressId, profile]);

  const savedLoc = (() => {
    const def = addresses?.[0];
    const city = def?.city || profile?.city || "";
    const line = def?.address_line || "";
    return { city, line, has: Boolean(city || line) };
  })();

  // The cart never re-asks for a location the account already has: the saved
  // city/address are used unless the dentist typed a different one.
  const finalCity = (form.city || savedLoc.city).trim();
  const finalAddress = (form.address || savedLoc.line || finalCity).trim();



  const discount = coupon
    ? coupon.discount_type === "fixed"
      ? Math.min(Number(coupon.discount_value), cart.subtotal)
      : Math.round((cart.subtotal * Number(coupon.discount_value)) / 100)
    : 0;
  const deliveryFee = Number(settings?.delivery_fee ?? 0);
  const freeOver = Number(settings?.free_delivery_over ?? 0);
  const vendorCount = Math.max(1, cart.vendorCount);
  const afterDiscount = Math.max(0, cart.subtotal - discount);
  // Each vendor prices delivery for the dentist's city; the store-wide free
  // delivery threshold still wins when the whole order passes it.
  const cityShip = shippingBreakdown(
    vendorSubtotals(cart.items),
    finalCity,
    shipRates ?? [],
    deliveryFee,
    freeOver,
  );
  const freeShipping =
    (freeOver > 0 && afterDiscount >= freeOver) ||
    (cart.items.length > 0 && cityShip.total === 0);
  const shipping = freeOver > 0 && afterDiscount >= freeOver ? 0 : cityShip.total;
  const gross = afterDiscount + shipping;
  // The cap is a share of the dentist's OWN points balance (not of the order total).
  const allowedPct = Math.min(Math.max(maxRedeemPct, 0), 100);
  const allowedCoins = Math.floor((coinBalance * allowedPct) / 100);
  const spendableCoins = Math.max(
    0,
    Math.min(allowedCoins, moneyToCoins(gross, coinRate)),
  );
  const coinsReady = rewardsOn && coinRate > 0 && !coinsFrozen && spendableCoins > 0;
  const coinDiscount = useCoins && coinsReady ? coinsToMoney(spendableCoins, coinRate) : 0;
  const total = Math.max(0, gross - coinDiscount);

  useEffect(() => {
    if (useCoins && !coinsReady) setUseCoins(false);
  }, [useCoins, coinsReady]);
  const multiVendor = vendorCount > 1;
  const multiVendorNote = t("multiVendorNote").replaceAll("{n}", String(vendorCount));

  async function applyCoupon() {
    const { data, error } = await supabase.rpc("validate_coupon", {
      _code: code.trim(),
      _subtotal: cart.subtotal,
    });
    const c = (Array.isArray(data) ? data[0] : data) as Coupon | undefined;
    if (error || !c) {
      toast.error(t("couponInvalid"));
      return;
    }
    setCoupon(c);
    toast.success(t("couponApplied"));
  }

  async function placeOrder() {
    if (isStaff) {
      toast.error(STAFF_COPY[lang].block);
      return;
    }
    if (!user) {
      toast.error(t("loginRequired"));
      navigate({ to: "/auth" });
      return;
    }
    const missing = (
      [
        [form.name, "fullName"],
        [form.phone, "mobile"],
        [finalCity, "city"],
        [finalAddress, "address"],
      ] as const
    ).filter(([value]) => !String(value ?? "").trim());
    if (missing.length > 0) {
      toast.error(missing.map(([, label]) => t(label)).join(" • "));
      return;
    }

    setPlacing(true);
    const picked = addresses?.find((a) => a.id === addressId);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: form.name,
        phone: form.phone,
        city: finalCity,
        address_line: finalAddress,
        latitude: picked?.latitude ?? null,
        longitude: picked?.longitude ?? null,
        note: [form.note || null, multiVendor ? multiVendorNote : null]
          .filter(Boolean)
          .join(" — ") || null,
        coupon_code: coupon?.code ?? null,
        // Money is recomputed server-side from the real lines, coupon and
        // delivery settings — these are only an optimistic placeholder.
        subtotal: cart.subtotal,
        discount,
        total,
        payment_method: payMethod,
      })
      .select()
      .single();

    if (error || !order) {
      setPlacing(false);
      toast.error(error?.message ?? t("error"));
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      cart.items.map((i) => ({
        order_id: order.id,
        product_id: i.id,
        bundle_id: i.bundle_id ?? null,
        name_ar: i.name_ar,
        name_ku: i.name_ku,
        unit_price: i.price,
        quantity: i.quantity,
        image_url: i.image_url,
      })),
    );

    if (itemsError) {
      setPlacing(false);
      toast.error(itemsError.message);
      return;
    }

    if (useCoins && coinsReady) {
      const { error: coinError } = await supabase.rpc("reward_redeem_order", {
        _order_id: order.id,
        _points: spendableCoins,
      });
      if (coinError) toast.error(payCopy.coinsFail);
      else toast.success(payCopy.coinsDone);
    }

    if (payMethod === "qi") {
      try {
        const res = await startPayment({
          data: {
            orderId: order.id,
            origin: window.location.origin,
            locale: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar",
          },
        });
        cart.clear();
        if (res.formUrl) {
          window.location.href = res.formUrl;
          return;
        }
        setPlacing(false);
        navigate({ to: "/payment/$orderId", params: { orderId: order.id } });
        return;
      } catch (err) {
        setPlacing(false);
        toast.error(err instanceof Error ? err.message : payCopy.payError);
        return;
      }
    }

    setPlacing(false);
    cart.clear();
    toast.success(t("orderPlaced"));
    navigate({ to: "/orders" });
  }


  if (cart.items.length === 0)
    return (
      <StoreLayout>
        <div className="px-3 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <Link
              to="/"
              aria-label={t("back")}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-foreground shadow-card"
            >
              <ArrowRight className="size-5" />
            </Link>
            <h1 className="min-w-0 flex-1 text-base font-extrabold">{t("cart")}</h1>
          </div>
          <div className="dk-block flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="tile-icon size-16 text-primary">
              <ShoppingBag className="size-7" strokeWidth={2.4} />
            </span>
            <p className="font-display text-base font-extrabold">{t("emptyCart")}</p>
            <p className="text-xs text-muted-foreground">{t("tagline")}</p>
            <Button asChild size="lg" className="mt-1 w-full max-w-xs rounded-lg">
              <Link to="/products">{t("startShopping")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full max-w-xs gap-2 rounded-lg">
              <Link to="/">
                <Home className="size-5" />
                {t("home")}
              </Link>
            </Button>
          </div>
        </div>
      </StoreLayout>
    );

  const itemCount = cart.items.reduce((n, i) => n + i.quantity, 0);
  const remaining = freeOver > 0 ? Math.max(0, freeOver - afterDiscount) : 0;
  const progress = freeOver > 0 ? Math.min(100, Math.round((afterDiscount / freeOver) * 100)) : 0;

  type BundleGroup = {
    kind: "bundle";
    key: string;
    title_ar: string;
    title_ku: string;
    items: CartItem[];
    qty: number;
    total: number;
  };
  type SingleGroup = { kind: "single"; key: string; item: CartItem };
  const cartGroups: (BundleGroup | SingleGroup)[] = [];
  for (const i of cart.items) {
    if (!i.bundle_id) {
      cartGroups.push({ kind: "single", key: lineKey(i), item: i });
      continue;
    }
    const existing = cartGroups.find(
      (g): g is BundleGroup => g.kind === "bundle" && g.key === i.bundle_id,
    );
    if (existing) {
      existing.items.push(i);
      existing.total += i.price * i.quantity;
      existing.qty = Math.max(existing.qty, i.quantity);
    } else {
      cartGroups.push({
        kind: "bundle",
        key: i.bundle_id,
        title_ar: i.bundle_title_ar ?? "",
        title_ku: i.bundle_title_ku ?? "",
        items: [i],
        qty: i.quantity,
        total: i.price * i.quantity,
      });
    }
  }


  return (
    <StoreLayout>
      <PageBlocks page="cart" />
      <div className="space-y-3 px-3 pb-4 pt-3">
        {isStaff && (
          <div className="rounded-xl border-2 border-dashed border-destructive/50 bg-destructive/5 p-3">
            <p className="text-[13px] font-extrabold text-destructive">
              {STAFF_COPY[lang].title}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              {STAFF_COPY[lang].note}
            </p>
          </div>
        )}
        {/* Items */}
        <section className="dk-block">
          <div className="dk-head border-b border-border/60">
            <span className="step-dot">1</span>
            <h2 className="min-w-0 flex-1 truncate font-display text-[14.5px] font-extrabold">
              {t("cartReview")}
            </h2>
            <span className="chip-soft">
              {itemCount} {t("pieceUnit")}
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {cartGroups.map((g) =>
              g.kind === "bundle" ? (
                <li key={g.key} className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                      <PackageCheck className="size-4" strokeWidth={2.6} />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[13px] font-extrabold">
                      {lang === "ku" ? g.title_ku || g.title_ar : g.title_ar || g.title_ku}
                    </p>
                    <button
                      aria-label={t("delete")}
                      onClick={() => cart.removeBundle(g.key)}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground active:scale-90"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <ul className="space-y-1.5 rounded-xl border border-dashed border-border bg-secondary/40 p-2">
                    {g.items.map((i) => (
                      <li key={lineKey(i)} className="flex items-center gap-2">
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card">
                          {i.image_url ? (
                            <img
                              src={i.image_url}
                              alt={pickName(i, lang)}
                              loading="lazy"
                              className="h-full w-full object-contain p-0.5"
                            />
                          ) : (
                            <span className="text-base">🦷</span>
                          )}
                        </div>
                        <p className="line-clamp-1 min-w-0 flex-1 text-[11.5px] font-bold">
                          {pickName(i, lang)}
                        </p>
                        <span className="text-[11px] font-extrabold tabular-nums text-muted-foreground">
                          ×{i.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10.5px] font-bold text-muted-foreground">
                    {bundleNote[lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"]}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-0.5">
                      <button
                        aria-label="-"
                        onClick={() => cart.setBundleQty(g.key, g.qty - 1)}
                        className="grid size-7 place-items-center rounded-full bg-card shadow-soft active:scale-90"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-7 text-center text-[13px] font-extrabold tabular-nums">
                        {g.qty}
                      </span>
                      <button
                        aria-label="+"
                        onClick={() => cart.setBundleQty(g.key, g.qty + 1)}
                        className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="ms-auto price-lg text-[14px] text-primary">
                      {formatPrice(g.total, lang)}
                    </span>
                  </div>
                </li>
              ) : (
                <li key={g.key} className="flex gap-3 p-3">
                  <div className="media-pad size-[74px] shrink-0">
                    {g.item.image_url ? (
                      <img
                        src={g.item.image_url}
                        alt={pickName(g.item, lang)}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-2xl">🦷</div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start gap-2">
                      <p className="line-clamp-2 flex-1 text-[13px] font-bold leading-snug">
                        {pickName(g.item, lang)}
                      </p>
                      <button
                        aria-label={t("delete")}
                        onClick={() => cart.remove(g.key)}
                        className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground active:scale-90"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="price-lg mt-0.5 text-[15px] text-primary">
                      {formatPrice(g.item.price, lang)}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-1.5">
                      <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-0.5">
                        <button
                          aria-label="-"
                          onClick={() => cart.setQty(g.key, g.item.quantity - 1)}
                          className="grid size-7 place-items-center rounded-full bg-card shadow-soft active:scale-90"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-[13px] font-extrabold tabular-nums">
                          {g.item.quantity}
                        </span>
                        <button
                          aria-label="+"
                          onClick={() => cart.setQty(g.key, g.item.quantity + 1)}
                          className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="ms-auto text-[12px] font-bold text-muted-foreground">
                        {formatPrice(g.item.price * g.item.quantity, lang)}
                      </span>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>

          <div className="hairline" />
          <Link
            to="/products"
            className="flex items-center justify-center gap-1.5 p-3 text-[12.5px] font-extrabold text-primary active:scale-[0.99]"
          >
            <Plus className="size-3.5" />
            {t("continueShopping")}
          </Link>
        </section>

        {/* Free shipping meter */}
        {freeOver > 0 && !freeShipping && (
          <div className="dk-block p-3">
            <div className="flex items-center gap-2">
              <span className="head-icon">
                <Truck className="size-4" strokeWidth={2.4} />
              </span>
              <p className="flex-1 text-[12px] font-bold leading-snug">
                {t("freeShipLeft").replaceAll("{n}", formatPrice(remaining, lang))}
              </p>
            </div>
            <div className="meter mt-2">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Coupon */}
        <section className="dk-block p-3">
          <div className="flex items-center gap-2">
            <span className="head-icon">
              <TicketPercent className="size-4" strokeWidth={2.4} />
            </span>
            <Label className="flex-1 text-[12.5px] font-extrabold">{t("couponCode")}</Label>
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              className="h-11 rounded-lg"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="DENTAL10"
            />
            <Button className="h-11 rounded-lg px-5" variant="secondary" onClick={applyCoupon}>
              {t("apply")}
            </Button>
          </div>
          {coupon && (
            <p className="mt-2 text-[11.5px] font-bold text-success">
              {t("couponApplied")} — {coupon.code}
            </p>
          )}
        </section>

        {/* Delivery */}
        <section className="dk-block">
          <div className="dk-head border-b border-border/60">
            <span className="step-dot">2</span>
            <h2 className="min-w-0 flex-1 truncate font-display text-[14.5px] font-extrabold">
              {t("deliveryDetails")}
            </h2>
          </div>
          <CartAuthGate locked={!user && cart.items.length > 0}>
          <div className="space-y-2.5 p-3">

            {/* Saved identity — read only, edited from the account page */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                {DELIV.saved[lang]}
              </p>
              <div className="mt-2 space-y-1.5 text-[12.5px] font-bold">
                <p className="flex items-center gap-2">
                  <User className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{form.name || t("fullName")}</span>
                </p>
                <p className="flex items-center gap-2" dir="ltr">
                  <Phone className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{form.phone || t("mobile")}</span>
                </p>
              </div>
              <p className="mt-2 text-[10.5px] font-semibold leading-relaxed text-muted-foreground">
                {DELIV.editName[lang]}
              </p>
            </div>

            {/* Location — the only editable part in the cart */}
            <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/[0.05] p-3">
              <div className="flex items-start gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <MapPin className="size-4" strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
                    {DELIV.savedTitle[lang]}
                  </p>
                  <div className="mt-1 rounded-lg border border-primary/25 bg-card/80 p-2">
                    {savedLoc.has ? (
                      <>
                        <p className="text-[12.5px] font-extrabold">{savedLoc.city}</p>
                        {savedLoc.line && (
                          <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-muted-foreground">
                            {savedLoc.line}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[12px] font-bold text-muted-foreground">
                        {DELIV.noLoc[lang]}
                      </p>
                    )}
                  </div>
                  {editLoc &&
                    (form.city !== savedLoc.city || form.address !== savedLoc.line) && (
                      <p className="mt-1.5 text-[11px] font-extrabold text-success">
                        {DELIV.usingNew[lang]}: {form.city}
                        {form.city && form.address ? " — " : ""}
                        {form.address}
                      </p>
                    )}
                  <p className="mt-1.5 text-[10.5px] font-semibold leading-relaxed text-muted-foreground">
                    {editLoc ? DELIV.savedNote[lang] : DELIV.askChange[lang]}
                  </p>
                </div>
                <button
                  onClick={() => setEditLoc((v) => !v)}
                  className="shrink-0 rounded-lg border border-primary/40 bg-card px-2.5 py-1.5 text-[11.5px] font-extrabold text-primary active:scale-95"
                >
                  {editLoc ? DELIV.keep[lang] : DELIV.change[lang]}
                </button>
              </div>


              {editLoc && (
                <div className="mt-2.5 space-y-2">
                  {(addresses ?? []).length > 0 && (
                    <div className="rail-x">
                      {(addresses ?? []).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setAddressId(a.id);
                            setForm((f) => ({ ...f, city: a.city, address: a.address_line }));
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-start text-[12px] font-bold",
                            addressId === a.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground",
                          )}
                        >
                          <span className="block">{a.label || a.city}</span>
                          <span className="mt-0.5 block max-w-[10rem] truncate text-[10.5px] font-semibold opacity-70">
                            {a.address_line}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="field">
                    <Building2 className="size-4" />
                    <Input
                      className="h-11 rounded-lg"
                      placeholder={t("city")}
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <MapPin className="size-4" />
                    <Textarea
                      className="min-h-[68px] rounded-lg pt-3"
                      placeholder={t("address")}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <Textarea
              className="min-h-[56px] rounded-lg"
              placeholder={t("notes")}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          </CartAuthGate>


        </section>

        {multiVendor && (
          <div className="ship-alert p-3">
            <div className="relative z-10 flex items-start gap-2.5">
              <span className="ship-alert-icon">
                <PackageCheck className="size-4.5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13.5px] font-extrabold text-violet">{t("multiVendorTitle")}</p>
                  <span className="rounded-full bg-violet px-1.5 py-0.5 text-[10px] font-extrabold text-violet-foreground">
                    ×{vendorCount}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-foreground/75">
                  {multiVendorNote}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Reward points */}
        {rewardsOn && user && (
          <section className="relative overflow-hidden rounded-xl border-2 border-dashed border-info/70 bg-info/[0.06] p-3">
            <div className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-info/15 blur-xl" />
            <div className="relative flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info text-info-foreground">
                <Sparkles className="size-4" />
              </span>
              <p className="min-w-0 flex-1 text-[13.5px] font-extrabold text-info">
                {payCopy.coins}
              </p>
            </div>

            {coinsFrozen ? (
              <p className="relative mt-2 text-[11.5px] font-bold leading-relaxed text-muted-foreground">
                {payCopy.coinsFrozen}
              </p>
            ) : (
              <>
                <div className="relative mt-2.5 grid gap-1.5 rounded-lg bg-card/70 p-2.5 text-[11.5px] font-bold">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{payCopy.coinsBal}</span>
                    <span className="text-foreground">
                      {formatPoints(coinBalance, lang)} {COIN_WORD[lang]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {payCopy.coinsCap} ({Math.round(allowedPct)}%)
                    </span>
                    <span className="text-foreground">
                      {formatPoints(allowedCoins, lang)} {COIN_WORD[lang]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{payCopy.coinsBalValue}</span>
                    <span className="text-foreground">
                      {formatPrice(coinsToMoney(allowedCoins, coinRate), lang)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{payCopy.coinsOrderTotal}</span>
                    <span className="text-foreground">{formatPrice(gross, lang)}</span>
                  </div>
                  <p className="text-[10.5px] font-bold text-muted-foreground">
                    ↳ {payCopy.coinsWhy}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-dashed border-info/40 pt-1.5">
                    <span className="text-info">{payCopy.coinsUsable}</span>
                    <span className="text-end">
                      <span className="block font-extrabold text-info">
                        {formatPoints(spendableCoins, lang)} {COIN_WORD[lang]}
                      </span>
                      <span className="block text-[11px] text-info">
                        = {formatPrice(coinsToMoney(spendableCoins, coinRate), lang)}
                      </span>
                    </span>
                  </div>
                  {useCoins && coinDiscount > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-success">{payCopy.coinsApplied}</span>
                      <span className="font-extrabold text-success">
                        − {formatPrice(coinDiscount, lang)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="relative mt-2 text-[10.5px] font-bold leading-relaxed text-muted-foreground">
                  {payCopy.coinsRule.replace("{p}", String(Math.round(maxRedeemPct)))}
                </p>

                <Button
                  type="button"
                  variant={useCoins ? "default" : "secondary"}
                  className="relative mt-2.5 h-11 w-full rounded-lg text-[12.5px] font-extrabold"
                  disabled={!coinsReady}
                  onClick={() => setUseCoins((v) => !v)}
                >
                  {useCoins ? t("cancel") : payCopy.coinsDiscount}
                </Button>
              </>
            )}
          </section>
        )}

        {/* Payment method */}
        <section className="dk-block">
          <div className="dk-head border-b border-border/60">
            <span className="step-dot">3</span>
            <h2 className="min-w-0 flex-1 truncate font-display text-[14.5px] font-extrabold">
              {payCopy.title}
            </h2>
          </div>
          <div className="grid gap-2 p-3">
            {(
              [
                { key: "cod" as const, icon: Banknote, label: payCopy.cod, note: payCopy.codNote },
                { key: "qi" as const, icon: CreditCard, label: payCopy.qi, note: payCopy.qiNote },
              ] as {
                key: "cod" | "qi";
                icon: typeof Banknote;
                label: string;
                note: string;
                disabled?: boolean;
              }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={opt.disabled}
                onClick={() => setPayMethod(opt.key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-start transition active:scale-[0.99] disabled:opacity-60",
                  payMethod === opt.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card",
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
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    {opt.note}
                  </span>
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

        {/* Summary */}
        <section className="dk-block">
          <div className="dk-head border-b border-border/60">
            <span className="step-dot">4</span>
            <h2 className="min-w-0 flex-1 truncate font-display text-[14.5px] font-extrabold">
              {t("orderSummary")}

            </h2>
          </div>
          <div className="space-y-1.5 p-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span className="font-bold tabular-nums">{formatPrice(cart.subtotal, lang)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-deal-foreground">
                <span>{t("discount")}</span>
                <span className="font-bold tabular-nums">-{formatPrice(discount, lang)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("shippingFee")}
                {finalCity ? ` — ${finalCity}` : ""}
              </span>
              <span className="font-bold tabular-nums">
                {shipping > 0 ? formatPrice(shipping, lang) : t("shippingFree")}
              </span>
            </div>
            {multiVendor &&
              cityShip.rows.map((r) => (
                <div
                  key={r.vendorId ?? "none"}
                  className="flex justify-between text-[11.5px] text-muted-foreground"
                >
                  <span className="truncate">
                    {shipVendors?.find((v) => v.id === r.vendorId)?.name ?? t("shippingFee")}
                  </span>
                  <span className="font-bold tabular-nums">
                    {r.fee > 0 ? formatPrice(r.fee, lang) : t("shippingFree")}
                  </span>
                </div>
              ))}
            {multiVendor && (
              <p className="text-[11px] text-muted-foreground">{t("shippingPerVendor")}</p>
            )}
            {coinDiscount > 0 && (
              <div className="flex justify-between text-primary">
                <span>{payCopy.coinsDiscount}</span>
                <span className="font-bold tabular-nums">-{formatPrice(coinDiscount, lang)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
              <span className="text-[13px] font-extrabold">{t("total")}</span>
              <span className="price-lg text-[19px] text-primary">{formatPrice(total, lang)}</span>
            </div>
            <div className="pt-2">
              {!isStaff && <RewardEarnNote items={cart.items} orderTotal={total} />}
            </div>
            <p className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" />
              {t("secureCheckout")}
            </p>
          </div>
        </section>

        <BannerSlot slot="cart" />
      </div>

      <div className="dock-bar !bottom-[env(safe-area-inset-bottom)] px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted-foreground">
              {t("total")}
            </p>
            <p className="price-lg truncate text-[17px] text-primary">
              {formatPrice(total, lang)}
            </p>
          </div>
          <Button
            size="lg"
            className="h-12 flex-1 rounded-lg text-[14px] font-extrabold"
            disabled={placing || isStaff}
            onClick={placeOrder}
          >
            {isStaff
              ? STAFF_COPY[lang].cta
              : !user
              ? t("loginRequired")
              : payMethod === "qi"
                ? payCopy.payNow
                : t("checkout")}
            {payMethod === "qi" && user ? (
              <CreditCard className="size-4" />
            ) : (
              <ArrowLeft className="size-4 ltr:rotate-180" />
            )}

          </Button>
        </div>
      </div>
      <PageBlocks page="cart" position="bottom" />
    </StoreLayout>
  );
}
