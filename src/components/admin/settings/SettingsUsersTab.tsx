import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  Check,
  Loader2,
  Phone,
  User,
  Crown,
  ChevronDown,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AdminCard, SectionHeader } from "../AdminKit";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPermissionsPage } from "./UserPermissionsPage";

const L = {
  title: { ar: "مستخدمو لوحة التحكم والصلاحيات", ku: "بەکارهێنەرانی ئەم پانێڵە و دەسەڵاتەکان", en: "Admin Panel Users & Permissions" },
  subtitle: {
    ar: "إدارة المشرفين، مدراء البراندات، وتوزيع صلاحيات الوصول للوحة التحكم",
    ku: "بەڕێوەبردنی بەڕێوەبەران، بەڕێوەبەرانی براند، و دابەشکردنی دەسەڵاتەکانی ئەم پانێڵە",
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
  permissionsBtn: { ar: "الصلاحيات", ku: "دەسەڵاتەکان", en: "Permissions" },
  editBtn: { ar: "تعديل", ku: "دەستکاریکردن", en: "Edit" },
  deleteBtn: { ar: "حذف", ku: "سڕینەوە", en: "Delete" },
  colUser: { ar: "المستخدم", ku: "بەکارهێنەر", en: "User" },
  colPhone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone Number" },
  colRole: { ar: "الدور في النظام", ku: "ڕۆڵ لە سیستەم", en: "System Role" },
  colJoined: { ar: "تاريخ الانضمام", ku: "بەرواری تۆماربوون", en: "Joined Date" },
  colActions: { ar: "الإجراءات والصلاحيات", ku: "دەسەڵاتەکان و کردارەکان", en: "Permissions & Actions" },
  roleUpdated: { ar: "تم تحديث الصلاحية بنجاح", ku: "ڕۆڵی بەکارهێنەر بەسەرکەوتوویی نوێکرایەوە", en: "Role updated successfully" },
  createSuccess: { ar: "تم إنشاء الحساب بنجاح", ku: "هەژماری نوێ بەسەرکەوتوویی دروستکرا", en: "Staff account created" },
  userUpdated: { ar: "تم تحديث بيانات المستخدم بنجاح", ku: "زانیارییەکانی بەکارهێنەر نوێکرایەوە", en: "User details updated" },
  userDeleted: { ar: "تم حذف المستخدم بنجاح", ku: "بەکارهێنەرەکە بە سەرکەوتوویی سڕایەوە", en: "User deleted successfully" },
  fullName: { ar: "الاسم الكامل", ku: "ناوی تەواو", en: "Full Name" },
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone Number" },
  password: { ar: "كلمة المرور", ku: "وشەی تێپەڕ", en: "Password" },
  roleSelect: { ar: "نوع الصلاحية", ku: "جۆری ڕۆڵ", en: "Role Type" },
  cancel: { ar: "إلغاء", ku: "پاشگەزبوونەوە", en: "Cancel" },
  create: { ar: "حفظ وإنشاء", ku: "دروستکردن", en: "Create Account" },
  saveChanges: { ar: "حفظ التعديلات", ku: "پاشەکەوتکردنی گۆڕانکاری", en: "Save Changes" },
  editUserTitle: { ar: "تعديل بيانات المستخدم", ku: "دەستکاریکردنی بەکارهێنەر", en: "Edit User Details" },
  deleteConfirmTitle: { ar: "هل أنت متأكد من الحذف؟", ku: "ئایا دڵنیایت لە سڕینەوە؟", en: "Are you sure you want to delete?" },
  deleteConfirmDesc: {
    ar: "سيتم إزالة صلاحيات هذا المستخدم من لوحة التحكم بشكل نهائي.",
    ku: "دەسەڵاتەکانی ئەم بەکارهێنەرە لەم پانێڵەدا بە یەکجاری دەسڕدرێنەوە.",
    en: "This will revoke this user's administrative access to this panel permanently.",
  },
  cannotDeleteSelf: {
    ar: "لا يمكنك حذف حسابك الإداري الحالي المسجل به الدخول.",
    ku: "ناتوانیت هەژماری سەرەکی خۆت بسڕیتەوە کە پێی چوویتەتە ژوورەوە.",
    en: "You cannot delete your own active administrative account.",
  },
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
  const [roleFilter, setRoleFilter] = useState<"panel_users" | "admin" | "brand_manager" | "all">("panel_users");
  
  // Modals & Navigation
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserItem | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Form State for Add Staff
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "brand_manager">("admin");

  // Form State for Edit User
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "brand_manager" | "customer">("customer");

  // Current Auth User query
  const { data: currentAuthUser } = useQuery({
    queryKey: ["current-auth-user-meta"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

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

  // Open Edit User Modal
  const openEditModal = (user: UserItem) => {
    setUserToEdit(user);
    setEditName(user.full_name);
    setEditPhone(user.phone);
    setEditRole(user.role);
  };

  // Update User Mutation (Full Name, Phone, Role)
  const editUserMut = useMutation({
    mutationFn: async () => {
      if (!userToEdit) return;
      const cleanPhone = editPhone.replace(/\D/g, "");

      // 1. Update Profile
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert(
          { id: userToEdit.id, full_name: editName.trim(), phone: cleanPhone },
          { onConflict: "id" }
        );
      if (profErr) throw profErr;

      // 2. Update Role in user_roles
      if (editRole === "customer") {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userToEdit.id)
          .in("role", ["admin", "brand_manager"]);
      } else {
        await supabase.from("user_roles").upsert(
          { user_id: userToEdit.id, role: editRole },
          { onConflict: "user_id,role" }
        );
      }
    },
    onSuccess: () => {
      toast.success(tx("userUpdated"));
      setUserToEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user");
    },
  });

  // Delete User Mutation
  const deleteUserMut = useMutation({
    mutationFn: async (targetUser: UserItem) => {
      if (currentAuthUser && targetUser.id === currentAuthUser.id) {
        throw new Error(tx("cannotDeleteSelf"));
      }

      // Remove roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id);

      // Remove profile record
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", targetUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tx("userDeleted"));
      setUserToDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete user");
    },
  });

  // Create Staff Account Mutation
  const createStaffMut = useMutation({
    mutationFn: async () => {
      const cleanPhone = formPhone.replace(/\D/g, "");
      if (cleanPhone.length < 9) throw new Error(lang === "ku" ? "ژمارەی مۆبایل نادروستە" : "رقم هاتف غير صالح");
      if (formPassword.length < 6) throw new Error(lang === "ku" ? "وشەی تێپەڕ دەبێت لانیکەم ٦ پیت بێت" : "كلمة المرور يجب أن لا تقل عن 6 أحرف");
      if (!formName.trim()) throw new Error(lang === "ku" ? "تکایە ناو بنووسە" : "يرجى كتابة الاسم");

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
        await supabase.from("profiles").upsert(
          { id: userId, full_name: formName.trim(), phone: cleanPhone },
          { onConflict: "id" }
        );

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

  // If a user is selected for granular permissions, render the dedicated separate page!
  if (selectedUserForPermissions) {
    return (
      <UserPermissionsPage
        user={selectedUserForPermissions}
        onBack={() => setSelectedUserForPermissions(null)}
      />
    );
  }

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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4">
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

        {/* Users Data Table */}
        {isLoading ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[#007979]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            {tx("noUsers")}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 text-start">{tx("colUser")}</th>
                    <th className="py-3 px-4 text-start">{tx("colPhone")}</th>
                    <th className="py-3 px-4 text-start">{tx("colRole")}</th>
                    <th className="py-3 px-4 text-start hidden md:table-cell">{tx("colJoined")}</th>
                    <th className="py-3 px-4 text-end">{tx("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredUsers.map((user) => {
                    const isAdmin = user.role === "admin";
                    const isManager = user.role === "brand_manager";
                    const isSelf = currentAuthUser?.id === user.id;

                    const formattedDate = user.created_at
                      ? new Date(user.created_at).toLocaleDateString(lang === "ku" ? "ku" : lang === "ar" ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—";

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* User Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300 font-black text-xs shadow-2xs">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="size-full rounded-xl object-cover" />
                              ) : (
                                user.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {user.full_name}
                                </span>
                                {isSelf && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#007979]/15 text-[#007979] dark:text-teal-400">
                                    {lang === "ku" ? "تۆ" : lang === "ar" ? "أنت" : "You"}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                #{user.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Phone className="size-3 text-slate-400 shrink-0" />
                            <span dir="ltr" className="font-mono">{user.phone || "—"}</span>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                              isAdmin
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                                : isManager
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isAdmin && <Crown className="size-3 text-rose-500" />}
                            {isManager && <Shield className="size-3 text-amber-500" />}
                            {!isAdmin && !isManager && <User className="size-3 text-slate-400" />}
                            <span>
                              {isAdmin
                                ? tx("roleAdmin")
                                : isManager
                                ? tx("roleManager")
                                : tx("roleCustomer")}
                            </span>
                          </span>
                        </td>

                        {/* Date Column */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <Calendar className="size-3 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Permissions Button -> Opens Separate Permissions Page */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForPermissions(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-[#007979] dark:text-teal-400 border border-teal-500/20 text-xs font-black transition active:scale-95 shadow-2xs"
                              title={tx("permissionsBtn")}
                            >
                              <ShieldCheck className="size-3.5" />
                              <span className="hidden sm:inline">{tx("permissionsBtn")}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center justify-center size-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition active:scale-95 shadow-2xs"
                              title={tx("editBtn")}
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="inline-flex items-center justify-center size-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition active:scale-95 shadow-2xs"
                              title={tx("deleteBtn")}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Edit User Modal */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Pencil className="size-4 text-[#007979]" />
              <span>{tx("editUserTitle")}</span>
            </DialogTitle>
          </DialogHeader>

          {userToEdit && (
            <div className="space-y-3.5 pt-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tx("fullName")}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tx("phone")}
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tx("roleSelect")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole("admin")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                      editRole === "admin"
                        ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-400 font-extrabold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Crown className="size-3.5" />
                    <span>{tx("roleAdmin")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole("brand_manager")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                      editRole === "brand_manager"
                        ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Shield className="size-3.5" />
                    <span>{tx("roleManager")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole("customer")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                      editRole === "customer"
                        ? "bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-900 dark:text-white font-extrabold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <User className="size-3.5" />
                    <span>{tx("roleCustomer")}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {tx("cancel")}
                </button>
                <button
                  type="button"
                  disabled={editUserMut.isPending}
                  onClick={() => editUserMut.mutate()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-extrabold shadow-sm transition active:scale-95"
                >
                  {editUserMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{tx("saveChanges")}</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-600" />
              <span>{tx("deleteConfirmTitle")}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 pt-1">
              {tx("deleteConfirmDesc")}
              {userToDelete && (
                <span className="block mt-2 font-black text-slate-900 dark:text-white">
                  {userToDelete.full_name} ({userToDelete.phone})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-3">
            <AlertDialogCancel className="rounded-xl text-xs font-bold">
              {tx("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteUserMut.isPending}
              onClick={() => userToDelete && deleteUserMut.mutate(userToDelete)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              {deleteUserMut.isPending && <Loader2 className="size-3.5 animate-spin me-1.5" />}
              <span>{tx("deleteBtn")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
