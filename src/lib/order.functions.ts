import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bundleLines,
  effectivePrice,
  flashIsLive,
  offerIsLive,
  tierUnitPrice,
  tiersOf,
  type Bundle,
  type ClearanceRule,
  type FlashDeal,
  type Offer,
  type Product,
  type ProductTier,
} from "@/lib/store";
import { shippingBreakdown, vendorSubtotals, type ShippingRate } from "@/lib/shipping";
import { coinsToMoney, moneyToCoins } from "@/lib/rewards";

const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(9999),
        bundleId: z.string().min(1).nullable().optional(),
      }),
    )
    .min(1, "Cart cannot be empty"),
  customerName: z.string().trim().min(2, "Customer name is required"),
  phone: z.string().trim().min(6, "Valid phone number is required"),
  city: z.string().trim().min(1, "City is required"),
  addressLine: z.string().trim().min(1, "Address is required"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  couponCode: z.string().trim().nullable().optional(),
  paymentMethod: z.enum(["cod", "qi"]).default("cod"),
  useCoins: z.boolean().optional().default(false),
  spendableCoins: z.number().int().nonnegative().optional().default(0),
});

/**
 * Places an order securely on the server.
 * Authoritatively calculates unit prices, promotional discounts, bundle pricing,
 * coupon validity, vendor shipping, and loyalty reward deductions on the server.
 */
export const placeOrderSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => placeOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load requested products from DB
    const rawProductIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const { data: initialProducts, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", rawProductIds);

    if (prodErr || !initialProducts) {
      throw new Error("Failed to load products for checkout");
    }

    const allProducts: Product[] = [...(initialProducts as unknown as Product[])];

    // 2. Load active bundles if any items belong to kits
    const bundleIds = Array.from(
      new Set(data.items.map((i) => i.bundleId).filter((id): id is string => Boolean(id))),
    );

    const dbBundles: Bundle[] = [];
    if (bundleIds.length > 0) {
      const { data: bundlesData, error: bundleErr } = await supabaseAdmin
        .from("bundles")
        .select("*")
        .in("id", bundleIds)
        .eq("is_active", true);

      if (bundleErr || !bundlesData || bundlesData.length !== bundleIds.length) {
        throw new Error("One or more bundles in your cart are no longer available");
      }

      dbBundles.push(...(bundlesData as unknown as Bundle[]));

      // Ensure all products referenced by bundles are loaded
      const bundleProdIds = Array.from(new Set(dbBundles.flatMap((b) => b.product_ids || [])));
      const missingProdIds = bundleProdIds.filter((id) => !allProducts.some((p) => p.id === id));
      if (missingProdIds.length > 0) {
        const { data: extraProds } = await supabaseAdmin
          .from("products")
          .select("*")
          .in("id", missingProdIds);
        if (extraProds) {
          allProducts.push(...(extraProds as unknown as Product[]));
        }
      }
    }

    // 3. Verify all requested items exist and are active
    for (const item of data.items) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (!prod) {
        throw new Error("One or more items in your cart do not exist");
      }
      if (!prod.is_active) {
        throw new Error(`Product "${prod.name_ar || prod.name_ku}" is currently unavailable`);
      }
    }

    // 4. Fetch store campaigns and rules for authoritative price calculations
    const [
      offersRes,
      offerProductsRes,
      dealsRes,
      rulesRes,
      tiersRes,
      settingsRes,
      shippingRatesRes,
    ] = await Promise.all([
      supabaseAdmin.from("offers").select("*").eq("is_active", true),
      supabaseAdmin.from("offer_products").select("*"),
      supabaseAdmin.from("flash_deals").select("*").eq("is_active", true),
      supabaseAdmin.from("clearance_rules").select("*").eq("is_active", true).order("months_left"),
      supabaseAdmin.from("product_tiers").select("*").order("min_qty"),
      supabaseAdmin.from("store_settings").select("*").limit(1).maybeSingle(),
      supabaseAdmin.from("vendor_shipping_rates").select("*").eq("is_active", true),
    ]);

    const liveOffers = ((offersRes.data ?? []) as unknown as Offer[]).filter(offerIsLive);
    const offerProducts = (offerProductsRes.data ?? []) as { offer_id: string; product_id: string }[];
    const liveDeals = ((dealsRes.data ?? []) as unknown as FlashDeal[]).filter(flashIsLive);
    const clearanceRules = (rulesRes.data ?? []) as unknown as ClearanceRule[];
    const productTiers = (tiersRes.data ?? []) as unknown as ProductTier[];
    const storeSettings = settingsRes.data;
    const shippingRates = (shippingRatesRes.data ?? []) as unknown as ShippingRate[];

    // 5. Precompute bundle line prices
    const bundleLineMap = new Map<string, Map<string, number>>();
    for (const bundle of dbBundles) {
      const bProds = (bundle.product_ids ?? [])
        .map((pid) => allProducts.find((p) => p.id === pid))
        .filter(Boolean) as Product[];
      const lines = bundleLines(bundle, bProds);
      const prodMap = new Map<string, number>();
      for (const l of lines) {
        prodMap.set(l.id, l.price);
      }
      bundleLineMap.set(bundle.id, prodMap);
    }

    // 6. Compute authoritative price for each line item
    const resolvedLines: Array<{
      productId: string;
      bundleId: string | null;
      name_ar: string;
      name_ku: string;
      unitPrice: number;
      quantity: number;
      imageUrl: string | null;
      vendorId: string | null;
      lineTotal: number;
    }> = [];

    for (const item of data.items) {
      const prod = allProducts.find((p) => p.id === item.productId)!;
      let unitPrice: number;

      if (item.bundleId) {
        const bMap = bundleLineMap.get(item.bundleId);
        const bPrice = bMap?.get(item.productId);
        if (bPrice === undefined) {
          throw new Error(`Item ${prod.name_ar} is not part of the specified bundle`);
        }
        unitPrice = bPrice;
      } else {
        // Effective promotional price
        const promoPrice = effectivePrice(
          prod,
          liveOffers,
          offerProducts,
          item.quantity,
          liveDeals,
          clearanceRules,
        );
        // Wholesale tiers price
        const tierPrice = tierUnitPrice(
          Number(prod.price) || 0,
          item.quantity,
          tiersOf(prod.id, productTiers),
        );
        unitPrice = Math.min(promoPrice, tierPrice);
      }

      const lineTotal = unitPrice * item.quantity;
      resolvedLines.push({
        productId: prod.id,
        bundleId: item.bundleId ?? null,
        name_ar: prod.name_ar,
        name_ku: prod.name_ku,
        unitPrice,
        quantity: item.quantity,
        imageUrl: prod.image_url,
        vendorId: prod.vendor_id ?? null,
        lineTotal,
      });
    }

    // 7. Subtotal
    const subtotal = resolvedLines.reduce((acc, l) => acc + l.lineTotal, 0);

    // 8. Authoritative Coupon Validation
    let discount = 0;
    let verifiedCouponCode: string | null = null;
    if (data.couponCode && data.couponCode.trim()) {
      const { data: couponData, error: couponErr } = await supabaseAdmin.rpc("validate_coupon", {
        _code: data.couponCode.trim(),
        _subtotal: subtotal,
      });
      const coupon = Array.isArray(couponData) ? couponData[0] : couponData;
      if (couponErr || !coupon) {
        throw new Error("The coupon code is invalid or has expired");
      }
      verifiedCouponCode = coupon.code;
      discount =
        coupon.discount_type === "fixed"
          ? Math.min(Number(coupon.discount_value), subtotal)
          : Math.round((subtotal * Number(coupon.discount_value)) / 100);
    }

    // 9. Authoritative Shipping Calculation
    const deliveryFee = Number(storeSettings?.delivery_fee ?? 0);
    const freeOver = Number(storeSettings?.free_delivery_over ?? 0);
    const afterDiscount = Math.max(0, subtotal - discount);

    const vendorLines = vendorSubtotals(
      resolvedLines.map((l) => ({
        vendor_id: l.vendorId,
        price: l.unitPrice,
        quantity: l.quantity,
      })),
    );

    const cityShip = shippingBreakdown(
      vendorLines,
      data.city,
      shippingRates,
      deliveryFee,
      freeOver,
    );

    const shipping = freeOver > 0 && afterDiscount >= freeOver ? 0 : cityShip.total;
    const gross = afterDiscount + shipping;

    // 10. Authoritative Loyalty Coins Redemption
    let coinDiscount = 0;
    let verifiedSpentCoins = 0;
    const rewardsOn = Boolean(storeSettings?.rewards_enabled);
    const coinRate = Number(storeSettings?.points_per_1000_iqd ?? 0);
    const maxRedeemPct = Number(storeSettings?.rewards_max_redeem_percent ?? 0);

    if (data.useCoins && data.spendableCoins > 0 && rewardsOn && coinRate > 0) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance, is_frozen")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet && !wallet.is_frozen && wallet.balance > 0) {
        const allowedPct = Math.min(Math.max(maxRedeemPct, 0), 100);
        const allowedCoins = Math.floor((wallet.balance * allowedPct) / 100);
        const maxSpendable = Math.max(0, Math.min(allowedCoins, moneyToCoins(gross, coinRate)));
        verifiedSpentCoins = Math.min(data.spendableCoins, maxSpendable);
        coinDiscount = coinsToMoney(verifiedSpentCoins, coinRate);
      }
    }

    const finalTotal = Math.max(0, gross - coinDiscount);

    // 11. Notes & Multi-vendor attribution
    const vendorIds = new Set(resolvedLines.map((l) => l.vendorId ?? "none"));
    const multiVendor = vendorIds.size > 1;
    const multiVendorNote = multiVendor
      ? `طلب متعدد الموردين (${vendorIds.size} موردين)`
      : null;
    const finalNote = [data.note || null, multiVendorNote].filter(Boolean).join(" — ") || null;

    // 12. Insert Order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customerName,
        phone: data.phone,
        city: data.city,
        address_line: data.addressLine,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        note: finalNote,
        coupon_code: verifiedCouponCode,
        subtotal,
        discount,
        total: finalTotal,
        payment_method: data.paymentMethod,
        coins_spent: verifiedSpentCoins,
        coins_discount: coinDiscount,
      })
      .select()
      .single();

    if (orderErr || !order) {
      throw new Error(orderErr?.message ?? "Failed to create order");
    }

    // 13. Insert Order Items with Server-Verified Prices
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      resolvedLines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        bundle_id: l.bundleId,
        name_ar: l.name_ar,
        name_ku: l.name_ku,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        image_url: l.imageUrl,
        vendor_id: l.vendorId,
      })),
    );

    if (itemsErr) {
      // Rollback order header if items insert fails
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(itemsErr.message ?? "Failed to record order items");
    }

    // 14. If loyalty coins were redeemed, execute RPC
    if (verifiedSpentCoins > 0) {
      const { error: coinErr } = await supabaseAdmin.rpc("reward_redeem_order", {
        _order_id: order.id,
        _points: verifiedSpentCoins,
      });
      if (coinErr) {
        console.error("[Reward Redeem] Error redeeming coins:", coinErr.message);
      }
    }

    return {
      orderId: order.id,
      orderNo: order.order_no,
      subtotal,
      discount,
      shipping,
      coinDiscount,
      total: finalTotal,
    };
  });

