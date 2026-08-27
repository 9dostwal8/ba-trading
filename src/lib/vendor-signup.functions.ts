import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PHONE_DOMAIN = "dentalstore.app";
/** ~100 years — the login stays blocked until an admin approves it. */
const BAN_FOREVER = "876000h";

function normalizePhone(raw: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

/** Public: a store owner applies for a vendor account. Login stays blocked until approved. */
export const applyAsVendor = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        storeName: z.string().trim().min(2).max(80),
        city: z.string().trim().min(2).max(60),
        addressLine: z.string().trim().max(200).default(""),
        phone: z.string().trim().min(9).max(20),
        password: z.string().min(6).max(72),
        captchaA: z.number().int().min(0).max(20),
        captchaB: z.number().int().min(0).max(20),
        captchaAnswer: z.number().int(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (data.captchaA + data.captchaB !== data.captchaAnswer) throw new Error("badCaptcha");

    const phone = normalizePhone(data.phone);
    if (phone.length < 9) throw new Error("badPhone");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const taken = await supabaseAdmin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (taken.error) throw new Error(taken.error.message);
    if (taken.data) throw new Error("phoneTaken");

    const pending = await supabaseAdmin
      .from("vendor_applications")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (pending.data) throw new Error("alreadyApplied");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: `${phone}@${PHONE_DOMAIN}`,
      password: data.password,
      email_confirm: true,
      ban_duration: BAN_FOREVER,
      user_metadata: { full_name: data.storeName, phone },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "createFailed");
    }
    const userId = created.data.user.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.storeName, phone, city: data.city }, { onConflict: "id" });

    const vendor = await supabaseAdmin
      .from("vendors")
      .insert({
        name: data.storeName,
        brand_key: data.storeName,
        brands: [data.storeName],
        city: data.city,
        phone,
        is_active: false,
        is_verified: false,
      })
      .select("id")
      .single();
    if (vendor.error) throw new Error(vendor.error.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "brand_manager" }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("vendor_members")
      .upsert({ vendor_id: vendor.data.id, user_id: userId }, { onConflict: "vendor_id,user_id" });

    const app = await supabaseAdmin.from("vendor_applications").insert({
      store_name: data.storeName,
      city: data.city,
      address_line: data.addressLine,
      phone,
      user_id: userId,
      vendor_id: vendor.data.id,
      status: "pending",
    });
    if (app.error) throw new Error(app.error.message);

    return { ok: true as const };
  });
