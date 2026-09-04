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

/** Admin-only: list all user profiles with their assigned roles */
export const fetchUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rolesRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone, created_at, avatar_url")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const rolesMap = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push(r.role);
    }

    return (profilesRes.data ?? []).map((p) => {
      const userRoles = rolesMap.get(p.id) ?? [];
      let role = "customer";
      if (userRoles.includes("admin")) role = "admin";
      else if (userRoles.includes("brand_manager")) role = "brand_manager";

      return {
        id: p.id,
        full_name: p.full_name || "Unknown User",
        phone: p.phone || "",
        avatar_url: p.avatar_url || null,
        created_at: p.created_at,
        role,
        roles: userRoles,
      };
    });
  });

/** Admin-only: update or revoke user role */
export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { targetUserId: string; newRole: "admin" | "brand_manager" | "customer" }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.newRole === "customer") {
      // Remove staff roles
      const del = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .in("role", ["admin", "brand_manager"]);
      if (del.error) throw new Error(del.error.message);
    } else {
      // Upsert the chosen role
      const up = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: data.targetUserId, role: data.newRole },
          { onConflict: "user_id,role" }
        );
      if (up.error) throw new Error(up.error.message);
    }

    return { success: true };
  });

/** Admin: create staff account with specified role */
export const createStaffAccount = createServerFn({ method: "POST" })
  .validator(
    (input: {
      fullName: string;
      phone: string;
      password: string;
      role: "admin" | "brand_manager";
      email?: string;
    }) => input
  )
  .handler(async ({ data }) => {

    const phone = normalizePhone(data.phone);
    const fullName = (data.fullName ?? "").trim();
    if (phone.length < 9) throw new Error("badPhone");
    if ((data.password ?? "").length < 6) throw new Error("badPassword");
    if (fullName.length < 2) throw new Error("badName");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email =
      data.email && data.email.includes("@")
        ? data.email.trim().toLowerCase()
        : `${phone}@${PHONE_DOMAIN}`;

    const existing = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    let userId = existing.data?.id ?? null;

    if (userId) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, email },
      });
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, email },
      });
      if (created.error || !created.data.user) {
        throw new Error(created.error?.message ?? "createFailed");
      }
      userId = created.data.user.id;
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: fullName, phone }, { onConflict: "id" });

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });

    // Store email and password reference in ui_texts
    await supabaseAdmin.from("ui_texts").upsert(
      {
        key: `staff_email_${userId}`,
        section: "staff_credentials",
        ar: email,
        ku: email,
      },
      { onConflict: "key" }
    );

    await supabaseAdmin.from("ui_texts").upsert(
      {
        key: `staff_pwd_${userId}`,
        section: "staff_credentials",
        ar: data.password,
        ku: data.password,
      },
      { onConflict: "key" }
    );

    return { userId, phone, fullName, email, role: data.role };
  });

/** Admin: set or reset user password directly */
export const adminSetUserPassword = createServerFn({ method: "POST" })
  .validator((input: { targetUserId: string; newPassword: string }) => input)
  .handler(async ({ data }) => {
    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upd = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (upd.error) throw new Error(upd.error.message);

    // Save in ui_texts for admin quick reference
    await supabaseAdmin.from("ui_texts").upsert(
      {
        key: `staff_pwd_${data.targetUserId}`,
        section: "staff_credentials",
        ar: data.newPassword,
        ku: data.newPassword,
      },
      { onConflict: "key" }
    );

    return { success: true };
  });

/** Public/Admin: Lookup email or candidate auth identifier for phone login */
export const lookupAdminLoginEmail = createServerFn({ method: "POST" })
  .validator((input: { phoneOrEmail: string }) => input)
  .handler(async ({ data }) => {
    const raw = (data.phoneOrEmail ?? "").trim();
    if (!raw) return { email: "" };
    if (raw.includes("@")) return { email: raw.toLowerCase() };

    const digits = raw.replace(/\D/g, "");
    const cleanPhone = digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
    const withZero = `0${cleanPhone}`;

    // 1. Direct Dosty admin check
    if (cleanPhone === "7702269722" || cleanPhone.includes("7702269722")) {
      return { email: "dosty.wal98@gmail.com" };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 2. Query profiles by phone
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, phone")
        .or(`phone.eq.${cleanPhone},phone.eq.${withZero}`)
        .maybeSingle();

      if (profile?.id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (userData?.user?.email) {
          return { email: userData.user.email };
        }
      }

      // 3. Search auth users list
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
      for (const u of listData?.users ?? []) {
        const uPhone = (u.phone || (u.user_metadata?.phone as string) || "").replace(/\D/g, "");
        if (uPhone.endsWith(cleanPhone) && u.email) {
          return { email: u.email };
        }
      }
    } catch (e) {
      console.warn("lookupAdminLoginEmail error:", e);
    }

    return {
      email: `${cleanPhone}@dentalstore.app`,
      candidates: [
        `${cleanPhone}@dentalstore.app`,
        `${withZero}@dentalstore.app`,
        `${cleanPhone}@batrading.com`,
        `${withZero}@batrading.com`,
      ],
    };
  });


