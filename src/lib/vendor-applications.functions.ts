import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: approve (unblock login) or reject a vendor application. */
export const reviewVendorApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().max(300).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const app = await supabaseAdmin
      .from("vendor_applications")
      .select("id, user_id, vendor_id")
      .eq("id", data.id)
      .single();
    if (app.error) throw new Error(app.error.message);

    if (app.data.user_id) {
      const upd = await supabaseAdmin.auth.admin.updateUserById(app.data.user_id, {
        ban_duration: data.approve ? "none" : "876000h",
      });
      if (upd.error) throw new Error(upd.error.message);
    }

    if (app.data.vendor_id) {
      await supabaseAdmin
        .from("vendors")
        .update({ is_active: data.approve })
        .eq("id", app.data.vendor_id);
    }

    const res = await supabaseAdmin
      .from("vendor_applications")
      .update({
        status: data.approve ? "approved" : "rejected",
        note: data.note,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (res.error) throw new Error(res.error.message);

    return { ok: true as const };
  });
