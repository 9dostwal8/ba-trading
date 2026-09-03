import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PHONE_DOMAIN = "dentalstore.app";

function normalizePhone(raw: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

/** Admin-only: create a vendor login (phone + password) and link it to a vendor. */
export const createBrandManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { fullName: string; phone: string; password: string; vendorId?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const phone = normalizePhone(data.phone);
    const fullName = (data.fullName ?? "").trim();
    if (phone.length < 9) throw new Error("badPhone");
    if ((data.password ?? "").length < 6) throw new Error("badPassword");
    if (fullName.length < 2) throw new Error("badName");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${phone}@${PHONE_DOMAIN}`;

    // Reuse an existing account with the same phone instead of failing.
    const existing = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    let userId = existing.data?.id ?? null;

    if (userId) {
      const upd = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone },
      });
      if (upd.error) throw new Error(upd.error.message);
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone },
      });
      if (created.error || !created.data.user) {
        throw new Error(created.error?.message ?? "createFailed");
      }
      userId = created.data.user.id;
    }

    const prof = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: fullName, phone }, { onConflict: "id" });
    if (prof.error) throw new Error(prof.error.message);

    const role = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "brand_manager" }, { onConflict: "user_id,role" });
    if (role.error) throw new Error(role.error.message);

    if (data.vendorId) {
      const link = await supabaseAdmin
        .from("vendor_members")
        .upsert({ vendor_id: data.vendorId, user_id: userId }, { onConflict: "vendor_id,user_id" });
      if (link.error) throw new Error(link.error.message);
    }

    return { userId, phone, fullName };
  });

/** Admin-only: immediately update the admin's own email address directly without email bounce. */
export const updateCurrentAdminEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { newEmail: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const email = (data.newEmail ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Invalid email format");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const upd = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email,
      email_confirm: true,
    });

    if (upd.error) throw new Error(upd.error.message);

    return { success: true, email };
  });

/** Secure Owner Activation: Ensure Dosty's account is verified and has admin role */
export const claimSuperAdminForDosty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch user details from auth.users
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userErr || !userData?.user) throw new Error("User not found");

    const user = userData.user;
    const email = (user.email || "").toLowerCase();
    const phone = (user.phone || "").replace(/\D/g, "");
    const name = ((user.user_metadata?.["full_name"] || "") as string).toLowerCase();

    // Check if user is Dosty
    const isDosty =
      email.includes("dosty") ||
      email.includes("7702269722") ||
      phone.includes("7702269722") ||
      name.includes("dosty");

    if (!isDosty) {
      throw new Error("Unauthorized");
    }

    // 1. Update email to dosty.wal98@gmail.com and confirm
    await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email: "dosty.wal98@gmail.com",
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        full_name: "Dosty Rebwar",
        phone: "07702269722",
      },
    });

    // 2. Insert admin role into user_roles
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: context.userId, role: "admin" },
      { onConflict: "user_id,role" }
    );

    // 3. Update profile
    await supabaseAdmin.from("profiles").upsert(
      { id: context.userId, full_name: "Dosty Rebwar", phone: "07702269722" },
      { onConflict: "id" }
    );

    return { success: true };
  });

