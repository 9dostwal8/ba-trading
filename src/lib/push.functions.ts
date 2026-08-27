import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Public: the browser needs the VAPID public key to create a subscription. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  key: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));

const textSchema = z.object({
  audience: z.enum(["all", "dentists", "vendors", "admins", "vendor", "self"]),
  vendorId: z.string().uuid().optional().nullable(),
  title_ar: z.string().max(120).default(""),
  title_ku: z.string().max(120).default(""),
  title_en: z.string().max(120).default(""),
  body_ar: z.string().max(400).default(""),
  body_ku: z.string().max(400).default(""),
  body_en: z.string().max(400).default(""),
  link: z.string().max(300).default("/"),
  origin: z.string().url(),
});

/**
 * Sends a push message. `self` targets only the caller's own devices (test
 * button); every other audience requires the admin role, enforced by the
 * `push_targets` database function.
 */
export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => textSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { deliverPush } = await import("@/lib/push.server");
    const sb = context.supabase as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: rows, error } =
      data.audience === "self"
        ? await sb.rpc("push_targets_self")
        : await sb.rpc("push_targets", {
            _audience: data.audience,
            _vendor_id: data.vendorId ?? null,
          });
    if (error) throw new Error(error.message);

    const targets = (rows ?? []) as Array<{
      endpoint: string;
      p256dh: string;
      auth: string;
      lang: string;
    }>;
    if (!targets.length) return { sent: 0, failed: 0, devices: 0 };

    const result = await deliverPush(targets, data, data.origin);
    for (const endpoint of result.gone) {
      await sb.rpc("push_subscription_prune", { _endpoint: endpoint });
    }
    return { sent: result.sent, failed: result.failed, devices: targets.length };
  });
