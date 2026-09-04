import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Check,
  Loader2,
  Phone,
  User,
  Crown,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AdminCard, SectionHeader } from "../AdminKit";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const L = {
  title: { ar: "مستخدمو لوحة التحكم والصلاحيات", ku: "بەکارهێنەرانی ئەم پانێڵە و دەسەڵاتەکان", en: "Admin Panel Users & Permissions" },
  subtitle: {
    ar: "إدارة المشرفين، مدراء البراندات، وصلاحيات الوصول للوحة التحكم",
    ku: "بەڕێوەبردنی بەڕێوەبەران، بەڕێوەبەرانی براند، و دەسەڵاتەکانی چوونەژوورەوەی ئەم پانێڵە",
    en: "Manage administrators, brand managers, and dashboard staff",
  },
  addUser: { ar: "إضافة عضو إداري جديد", ku: "زیادکردنی ئەندامی نوێ", en: "Add Staff Member" },
  searchPlaceholder: { ar: "بحث بالاسم أو رقم الهاتف...", ku: "گەڕان بەپێی ناو یان ژمارەی مۆبایل...", en: "Search by name or phone..." },
  panelUsers: { ar: "مشرفو هذه اللوحة", ku: "بەکارهێنەرانی ئەم پانێڵە", en: "Admin Panel Staff" },
  admins: { ar: "المشرفون (Admin)", ku: "بەڕێوەبەران", en: "Admins" },
  managers: { ar: "مدراء البراندات", ku: "بەڕێوەبەرانی براند", en: "Brand Managers" },
  allAccounts: { ar: "جميع الحسابات", ku: "هەموو هەژمارەکان", en: "All Accounts" },
  roleAdmin: { ar: "مشرف عام (Admin)", ku: "بەڕێوەبەری گشتی (Admin)", en: "Full Admin" },
  roleManager: { ar: "مدير براند (Brand Manager)", ku: "بەڕێوەبەری براند", en: "Brand Manager" },
  roleCustomer: { ar: "عميل عادي (Customer)", ku: "کڕیاری ئاسایی", en: "Customer" },
  changeRole: { ar: "تغيير الصلاحية", ku: "گۆڕینی ڕۆڵ", en: "Change Role" },
  makeAdmin: { ar: "ترقية إلى مشرف عام", ku: "کردن بە بەڕێوەبەری گشتی", en: "Promote to Admin" },
  makeManager: { ar: "تعيين كمدير براند", ku: "دانان وەک بەڕێوەبەری براند", en: "Set as Brand Manager" },
  makeCustomer: { ar: "إلغاء الصلاحيات الإدارية", ku: "لابردنی دەسەڵاتی پانێڵ (کڕیار)", en: "Revoke Staff Access" },
  roleUpdated: { ar: "تم تحديث الصلاحية بنجاح", ku: "ڕۆڵی بەکارهێنەر بەسەرکەوتوویی نوێکرایەوە", en: "Role updated successfully" },
  createSuccess: { ar: "تم إنشاء الحساب بنجاح", ku: "هەژماری نوێ بەسەرکەوتوویی دروستکرا", en: "Staff account created" },
  fullName: { ar: "الاسم الكامل", ku: "ناوی تەواو", en: "Full Name" },
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone Number" },
  password: { ar: "كلمة المرور", ku: "وشەی تێپەڕ", en: "Password" },
  roleSelect: { ar: "نوع الصلاحية", ku: "جۆری ڕۆڵ", en: "Role Type" },
  cancel: { ar: "إلغاء", ku: "پاشگەزبوونەوە", en: "Cancel" },
  create: { ar: "حفظ وإنشاء", ku: "دروستکردن", en: "Create Account" },
  noUsers: { ar: "لا يوجد مستخدمون مطابقون", ku: "هیچ بەکارهێنەرێک نەدۆزرایەوە", en: "No users found" },
};

export interface UserItem {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  role: "admin" | "brand_manager" | "customer";
  roles: string[];
}

export function SettingsUsersTab() {
  const { lang } = useI18n();
  const tx = (k: keyof typeof L) => L[k][lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  // Default filter to "panel_users" (users who have access to this admin panel)
  const [roleFilter, setRoleFilter] = useState<"panel_users" | "admin" | "brand_manager" | "all">("panel_users");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State for Add Staff
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "brand_manager">("admin");

  // Query users directly using client Supabase
  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const [userAuthRes, profilesRes, rolesRes] = await Promise.all([
        supabase.auth.getUser().catch(() => ({ data: { user: null } })),
        supabase
          .from("profiles")
          .select("id, full_name, phone, created_at, avatar_url")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const currentUser = userAuthRes?.data?.user;
      const rolesMap = new Map<string, string[]>();
      for (const r of rolesRes.data ?? []) {
        if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
        rolesMap.get(r.user_id)!.push(r.role);
      }

      const userMap = new Map<string, UserItem>();

      for (const p of profilesRes.data ?? []) {
        const userRoles = rolesMap.get(p.id) ?? [];
        let role: "admin" | "brand_manager" | "customer" = "customer";
        if (userRoles.includes("admin")) role = "admin";
        else if (userRoles.includes("brand_manager")) role = "brand_manager";

        userMap.set(p.id, {
          id: p.id,
          full_name: p.full_name || p.phone || "User",
          phone: p.phone || "",
          avatar_url: p.avatar_url || null,
          created_at: p.created_at,
          role,
          roles: userRoles,
        });
      }

      // If any staff member is in user_roles but not yet in profiles, ensure they show up
      for (const [userId, userRoles] of rolesMap.entries()) {
        if (!userMap.has(userId)) {
          let role: "admin" | "brand_manager" | "customer" = "customer";
          if (userRoles.includes("admin")) role = "admin";
          else if (userRoles.includes("brand_manager")) role = "brand_manager";

          userMap.set(userId, {
            id: userId,
            full_name: role === "admin" ? "Admin Staff" : "Brand Manager",
            phone: "",
            avatar_url: null,
            created_at: new Date().toISOString(),
            role,
            roles: userRoles,
          });
        }
      }

      // Ensure current logged-in panel admin (e.g. Dosty Rebwar) is always listed as Admin
      if (currentUser) {
        const existing = userMap.get(currentUser.id);
        const name =
          (currentUser.user_metadata?.["full_name"] as string) ||
          (currentUser.user_metadata?.["name"] as string) ||
          existing?.full_name ||
          "Dosty Rebwar";
        const phone =
          (currentUser.user_metadata?.["phone"] as string) ||
          currentUser.phone ||
          existing?.phone ||
          "07702269722";
        const roles = existing?.roles?.length ? existing.roles : ["admin"];

        userMap.set(currentUser.id, {
          id: currentUser.id,
          full_name: name,
          phone,
          avatar_url: existing?.avatar_url || null,
          created_at: existing?.created_at || currentUser.created_at || new Date().toISOString(),
          role: "admin",
          roles: roles.includes("admin") ? roles : [...roles, "admin"],
        });
      }

      return Array.from(userMap.values());
    },
  });

  // Role Updater Mutation
  const updateRoleMut = useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: "admin" | "brand_manager" | "customer" }) => {
      if (newRole === "customer") {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .in("role", ["admin", "brand_manager"]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: targetUserId, role: newRole }, { onConflict: "user_id,role" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(tx("roleUpdated"));
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update role");
    },
  });

  // Create Staff Account Mutation
  const createStaffMut = useMutation({
    mutationFn: async () => {
      const cleanPhone = formPhone.replace(/\D/g, "");
      if (cleanPhone.length < 9) throw new Error(lang === "ku" ? "ژمارەی مۆبایل نادروستە" : "رقم هاتف غير صالح");
      if (formPassword.length < 6) throw new Error(lang === "ku" ? "وشەی تێپەڕ دەبێت لانیکەم ٦ پیت بێت" : "كلمة المرور يجب أن لا تقل عن 6 أحرف");
      if (!formName.trim()) throw new Error(lang === "ku" ? "تکایە ناو بنووسە" : "يرجى كتابة الاسم");

      // Register or update via supabase auth
      const email = `${cleanPhone}@dentalstore.app`;
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: formPassword,
        options: {
          data: {
            full_name: formName.trim(),
            phone: cleanPhone,
          },
        },
      });

      if (signUpErr && !signUpErr.message.includes("already registered")) {
        throw signUpErr;
      }

      const userId = signUpData?.user?.id;
      if (userId) {
        // Upsert profile
        await supabase.from("profiles").upsert(
          { id: userId, full_name: formName.trim(), phone: cleanPhone },
          { onConflict: "id" }
        );

        // Upsert role
        const { error: roleErr } = await supabase.from("user_roles").upsert(
          { user_id: userId, role: formRole },
          { onConflict: "user_id,role" }
        );
        if (roleErr) throw roleErr;
      }
    },
    onSuccess: () => {
      toast.success(tx("createSuccess"));
      setIsAddOpen(false);
      setFormName("");
      setFormPhone("");
      setFormPassword("");
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create staff account");
    },
  });

  // Filtered users according to the selected view
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (roleFilter === "panel_users") {
      return u.role === "admin" || u.role === "brand_manager";
    }
    if (roleFilter === "admin") {
      return u.role === "admin";
    }
    if (roleFilter === "brand_manager") {
      return u.role === "brand_manager";
    }
    return true; // all
  });

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <AdminCard>
        <SectionHeader
          title={tx("title")}
          action={
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition"
                >
                  <UserPlus className="size-3.5" />
                  <span>{tx("addUser")}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="size-4 text-[#007979]" />
                    <span>{tx("addUser")}</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3.5 pt-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {tx("fullName")}
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Dr. Ahmed / Dosty..."
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {tx("phone")}
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0770xxxxxxx"
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {tx("password")}
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {tx("roleSelect")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormRole("admin")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          formRole === "admin"
                            ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-400 font-extrabold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Crown className="size-3.5" />
                        <span>{tx("roleAdmin")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormRole("brand_manager")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          formRole === "brand_manager"
                            ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Shield className="size-3.5" />
                        <span>{tx("roleManager")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      {tx("cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={createStaffMut.isPending}
                      onClick={() => createStaffMut.mutate()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-extrabold shadow-sm transition active:scale-95"
                    >
                      {createStaffMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      <span>{tx("create")}</span>
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 pb-3">{tx("subtitle")}</p>

        {/* Filters & Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3">
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx("searchPlaceholder")}
              className="w-full h-9 ps-9 pe-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setRoleFilter("panel_users")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                roleFilter === "panel_users"
                  ? "bg-[#007979] text-white shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tx("panelUsers")}
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                roleFilter === "admin"
                  ? "bg-rose-600 text-white shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tx("admins")}
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("brand_manager")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                roleFilter === "brand_manager"
                  ? "bg-amber-600 text-white shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tx("managers")}
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                roleFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tx("allAccounts")}
            </button>
          </div>
        </div>

        {/* Users List Table */}
        {isLoading ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[#007979]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            {tx("noUsers")}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            {filteredUsers.map((user) => {
              const isAdmin = user.role === "admin";
              const isManager = user.role === "brand_manager";

              return (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors gap-3"
                >
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300 font-black text-xs">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="size-full rounded-xl object-cover" />
                      ) : (
                        user.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {user.full_name}
                        </span>
                        {/* Role Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                            isAdmin
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                              : isManager
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isAdmin && <Crown className="size-3 text-rose-500" />}
                          {isManager && <Shield className="size-3 text-amber-500" />}
                          <span>
                            {isAdmin
                              ? tx("roleAdmin")
                              : isManager
                              ? tx("roleManager")
                              : tx("roleCustomer")}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="size-3" />
                        <span>{user.phone || "No phone registered"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Role Actions Dropdown */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={updateRoleMut.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs active:scale-95"
                        >
                          <span>{tx("changeRole")}</span>
                          <ChevronDown className="size-3 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                        <DropdownMenuItem
                          onClick={() => updateRoleMut.mutate({ targetUserId: user.id, newRole: "admin" })}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 ${
                            isAdmin ? "bg-rose-50/80 dark:bg-rose-950/40" : ""
                          }`}
                        >
                          <Crown className="size-3.5" />
                          <span>{tx("makeAdmin")}</span>
                          {isAdmin && <Check className="size-3.5 ms-auto" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => updateRoleMut.mutate({ targetUserId: user.id, newRole: "brand_manager" })}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 ${
                            isManager ? "bg-amber-50/80 dark:bg-amber-950/40" : ""
                          }`}
                        >
                          <Shield className="size-3.5" />
                          <span>{tx("makeManager")}</span>
                          {isManager && <Check className="size-3.5 ms-auto" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => updateRoleMut.mutate({ targetUserId: user.id, newRole: "customer" })}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            !isAdmin && !isManager ? "bg-slate-100 dark:bg-slate-800" : ""
                          }`}
                        >
                          <User className="size-3.5" />
                          <span>{tx("makeCustomer")}</span>
                          {!isAdmin && !isManager && <Check className="size-3.5 ms-auto" />}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
