import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Starts a QiCard payment for an order the caller owns and returns the payment link. */
export const startQiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().uuid(),
        origin: z.string().url(),
        locale: z.enum(["ar", "ku"]).default("ar"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_no, total, payment_status, qi_payment_id, qi_form_url")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    if (order.payment_status === "paid") return { alreadyPaid: true as const, formUrl: null };

    const qi = await import("./qi.server");
    const requestId = qi.createQiRequestId();
    const payment = await qi.createQiPayment({
      requestId,
      amount: Number(order.total),
      locale: data.locale,
      finishPaymentUrl: `${data.origin}/payment/${order.id}`,
      notificationUrl: `${data.origin}/api/public/qi-webhook`,
      additionalInfo: { orderId: order.id, orderNo: String(order.order_no) },
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({
        payment_method: "qi",
        qi_payment_id: payment.paymentId,
        qi_request_id: requestId,
        qi_status: payment.status,
        qi_form_url: payment.formUrl ?? null,
      })
      .eq("id", order.id);

    return { alreadyPaid: false as const, formUrl: payment.formUrl ?? null };
  });

/** Re-checks the gateway for an order's payment status (used on the return page). */
export const refreshQiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_no, total, payment_status, qi_payment_id, qi_status")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (!order.qi_payment_id)
      return { status: order.qi_status ?? "NONE", paid: order.payment_status === "paid" };

    const qi = await import("./qi.server");
    const payment = await qi.getQiPaymentStatus(order.qi_payment_id);
    const paid = qi.isQiSuccess(payment.status);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({
        qi_status: payment.status,
        ...(paid ? { payment_status: "paid", paid_at: new Date().toISOString() } : {}),
      })
      .eq("id", order.id);

    return { status: payment.status, paid };
  });
