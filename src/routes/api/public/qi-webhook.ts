import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  requestId: z.string().optional(),
  paymentId: z.string(),
  status: z.string(),
  amount: z.number().optional(),
  confirmedAmount: z.number().optional(),
  currency: z.string().optional(),
  creationDate: z.string().optional(),
});

export const Route = createFileRoute("/api/public/qi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const qi = await import("@/lib/qi.server");

        const parsed = payloadSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });
        const event = parsed.data;

        let valid = false;
        try {
          valid = await qi.verifyQiSignature(event, request.headers.get("x-signature"));
        } catch (error) {
          console.error("QiCard webhook verification error", error);
          return new Response("Verification unavailable", { status: 500 });
        }
        if (!valid) return new Response("Invalid signature", { status: 401 });


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const paid = qi.isQiSuccess(event.status);
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            qi_status: event.status,
            ...(paid ? { payment_status: "paid", paid_at: new Date().toISOString() } : {}),
          })
          .eq("qi_payment_id", event.paymentId);

        if (error) {
          console.error("QiCard webhook update failed", error.message);
          return new Response("Update failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
