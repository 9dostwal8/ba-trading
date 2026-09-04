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
  Eye,
  EyeOff,
  Copy,
  Key,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AdminCard, SectionHeader } from "../AdminKit";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { adminSetUserPassword, createStaffAccount } from "@/lib/admin-users.functions";

// Dedicated isolated client: creates new users in Auth WITHOUT touching or overwriting the active admin session!
function getIsolatedAuthClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || "https://yiaykxjwvwibotildtpo.supabase.co";
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_ecUDK7NsmMOTJO6itBoLcg_PQpHWpOG";
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}
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
  searchPlaceholder: { ar: "بحث بالاسم أو الهاتف أو البريد أو اسم المستخدم...", ku: "گەڕان بەپێی ناو، مۆبایل، ئیمەیڵ، یان ناوی بەکارهێنەر...", en: "Search by name, phone, email, or username..." },
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
  colUsername: { ar: "اسم المستخدم / الدخول", ku: "ناوی بەکارهێنەر / چوونەژوورەوە", en: "Username / Contact" },
  colPassword: { ar: "كلمة المرور", ku: "وشەی تێپەڕ", en: "Password" },
  colRole: { ar: "الدور في النظام", ku: "ڕۆڵ لە سیستەم", en: "System Role" },
  colJoined: { ar: "تاريخ الانضمام", ku: "بەرواری تۆماربوون", en: "Joined Date" },
  colActions: { ar: "الإجراءات والصلاحيات", ku: "دەسەڵاتەکان و کردارەکان", en: "Permissions & Actions" },
  roleUpdated: { ar: "تم تحديث الصلاحية بنجاح", ku: "ڕۆڵی بەکارهێنەر بەسەرکەوتوویی نوێکرایەوە", en: "Role updated successfully" },
  createSuccess: { ar: "تم إنشاء الحساب بنجاح", ku: "هەژماری نوێ بەسەرکەوتوویی دروستکرا", en: "Staff account created" },
  userUpdated: { ar: "تم تحديث بيانات المستخدم بنجاح", ku: "زانیارییەکانی بەکارهێنەر نوێکرایەوە", en: "User details updated" },
  userDeleted: { ar: "تم حذف المستخدم بنجاح", ku: "بەکارهێنەرەکە بە سەرکەوتوویی سڕایەوە", en: "User deleted successfully" },
  passwordUpdated: { ar: "تم تغيير كلمة المرور بنجاح", ku: "وشەی تێپەڕ بەسەرکەوتوویی گۆڕدرا", en: "Password updated successfully" },
  fullName: { ar: "الاسم الكامل", ku: "ناوی تەواو", en: "Full Name" },
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone Number" },
  email: { ar: "البريد الإلكتروني", ku: "ئیمەیڵ", en: "Email Address" },
  password: { ar: "كلمة المرور", ku: "وشەی تێپەڕ", en: "Password" },
  newPassword: { ar: "كلمة المرور الجديدة (اختياري)", ku: "وشەی تێپەڕی نوێ (ئارەزوومەندانە)", en: "New Password (optional)" },
  newPasswordRequired: { ar: "كلمة المرور الجديدة", ku: "وشەی تێپەڕی نوێ", en: "New Password" },
  newPasswordHelp: {
    ar: "اترك الحقل فارغاً إذا كنت لا ترغب بتغيير كلمة المرور",
    ku: "ئەگەر ناتەوێت وشەی تێپەڕ بگۆڕیت بە بەتاڵی جێی بهێڵە",
    en: "Leave blank to keep existing password unchanged",
  },
  roleSelect: { ar: "نوع الصلاحية", ku: "جۆری ڕۆڵ", en: "Role Type" },
  cancel: { ar: "إلغاء", ku: "پاشگەزبوونەوە", en: "Cancel" },
  create: { ar: "حفظ وإنشاء", ku: "دروستکردن", en: "Create Account" },
  saveChanges: { ar: "حفظ التعديلات", ku: "پاشەکەوتکردنی گۆڕانکاری", en: "Save Changes" },
  savePassword: { ar: "حفظ كلمة المرور", ku: "پاشەکەوتکردنی وشەی تێپەڕ", en: "Save Password" },
  editUserTitle: { ar: "تعديل بيانات المستخدم", ku: "دەستکاریکردنی بەکارهێنەر", en: "Edit User Details" },
  changePasswordTitle: { ar: "تعديل كلمة مرور المستخدم", ku: "گۆڕینی وشەی تێپەڕی بەکارهێنەر", en: "Change User Password" },
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
  copied: { ar: "تم النسخ للحافظة", ku: "کۆپی کرا بۆ کلیپبۆرد", en: "Copied to clipboard" },
  noUsers: { ar: "لا يوجد مستخدمون مطابقون", ku: "هیچ بەکارهێنەرێک نەدۆزرایەوە", en: "No users found" },
};

export interface UserItem {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  username: string;
  saved_password?: string;
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
  
  // Password Visibility Toggle per user ID
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Modals & Navigation State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserItem | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserItem | null>(null);

  // Form State for Add Staff
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "brand_manager">("admin");

  // Form State for Edit User
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "brand_manager" | "customer">("customer");
  const [editPassword, setEditPassword] = useState("");

  // Form State for Quick Password Change Modal
  const [quickNewPassword, setQuickNewPassword] = useState("");

  // Toggle Password Visibility
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Copy to Clipboard Helper
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label}: ${tx("copied")}`);
  };

  // Current Auth User query
  const { data: currentAuthUser } = useQuery({
    queryKey: ["current-auth-user-meta"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  // Query users directly using client Supabase
  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const [userAuthRes, profilesRes, rolesRes, credsRes] = await Promise.all([
        supabase.auth.getUser().catch(() => ({ data: { user: null } })),
        supabase
          .from("profiles")
          .select("id, full_name, phone, created_at, avatar_url")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("ui_texts")
          .select("key, ar")
          .eq("section", "staff_credentials"),
      ]);

      const currentUser = userAuthRes?.data?.user;
      
      // Map stored staff passwords and emails
      const pwdsMap = new Map<string, string>();
      const emailsMap = new Map<string, string>();

      for (const item of credsRes.data ?? []) {
        if (item.key.startsWith("staff_pwd_")) {
          const uId = item.key.replace("staff_pwd_", "");
          pwdsMap.set(uId, item.ar);
        } else if (item.key.startsWith("staff_email_")) {
          const uId = item.key.replace("staff_email_", "");
          emailsMap.set(uId, item.ar);
        }
      }

      // Map roles
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

        const phone = p.phone || "";
        const savedEmail = emailsMap.get(p.id) || (phone ? `${phone}@dentalstore.app` : "");
        const username = phone || (p.full_name ? p.full_name.toLowerCase().replace(/\s+/g, '_') : `user_${p.id.slice(0, 6)}`);

        userMap.set(p.id, {
          id: p.id,
          full_name: p.full_name || phone || "User",
          phone,
          email: savedEmail,
          username,
          saved_password: pwdsMap.get(p.id) || "",
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

          const savedEmail = emailsMap.get(userId) || "";

          userMap.set(userId, {
            id: userId,
            full_name: role === "admin" ? "Admin Staff" : "Brand Manager",
            phone: "",
            email: savedEmail,
            username: `staff_${userId.slice(0, 6)}`,
            saved_password: pwdsMap.get(userId) || "",
            avatar_url: null,
            created_at: new Date().toISOString(),
            role,
            roles: userRoles,
          });
        }
      }

      // 1. Always guarantee Super Admin (Dosty Rebwar) is permanently listed in the roster
      const dostyPhone = "07702269722";
      const dostyEmail = "dosty.wal98@gmail.com";

      let dostyEntry = Array.from(userMap.values()).find(
        (u) =>
          u.email?.toLowerCase() === dostyEmail ||
          u.phone === dostyPhone ||
          u.phone === "7702269722" ||
          u.full_name.toLowerCase().includes("dosty")
      );

      if (!dostyEntry) {
        const dostyId = "dosty_super_admin";
        userMap.set(dostyId, {
          id: dostyId,
          full_name: "Dosty Rebwar",
          phone: dostyPhone,
          email: dostyEmail,
          username: dostyPhone,
          saved_password: pwdsMap.get(dostyId) || pwdsMap.get("dosty") || "",
          avatar_url: null,
          created_at: "2026-01-01T00:00:00.000Z",
          role: "admin",
          roles: ["admin"],
        });
      } else {
        dostyEntry.role = "admin";
        if (!dostyEntry.roles.includes("admin")) {
          dostyEntry.roles.push("admin");
        }
      }

      // 2. Ensure current logged-in panel user is also in the list if not already present
      if (currentUser && !userMap.has(currentUser.id)) {
        const name =
          (currentUser.user_metadata?.["full_name"] as string) ||
          (currentUser.user_metadata?.["name"] as string) ||
          (currentUser.email ? currentUser.email.split("@")[0] : "Admin");
        const phone =
          (currentUser.user_metadata?.["phone"] as string) ||
          currentUser.phone ||
          "";
        const email = currentUser.email || "";
        const username = phone || (email ? email.split("@")[0] : currentUser.id.slice(0, 6));

        userMap.set(currentUser.id, {
          id: currentUser.id,
          full_name: name,
          phone,
          email,
          username,
          saved_password: pwdsMap.get(currentUser.id) || "",
          avatar_url: null,
          created_at: currentUser.created_at || new Date().toISOString(),
          role: "admin",
          roles: ["admin"],
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
    setEditEmail(user.email || "");
    setEditRole(user.role);
    setEditPassword(user.saved_password || "");
  };

  // Open Quick Password Change Modal
  const openQuickPasswordModal = (user: UserItem) => {
    setUserForPasswordChange(user);
    setQuickNewPassword(user.saved_password || "");
  };

  // Update User Mutation (Full Name, Phone, Email, Role, and optional Password)
  const editUserMut = useMutation({
    mutationFn: async () => {
      if (!userToEdit) return;
      const cleanPhone = editPhone.replace(/\D/g, "");
      const trimmedEmail = editEmail.trim().toLowerCase();

      // 1. Update Profile
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert(
          { id: userToEdit.id, full_name: editName.trim(), phone: cleanPhone },
          { onConflict: "id" }
        );
      if (profErr) throw profErr;

      // 2. Update Email in ui_texts if provided
      if (trimmedEmail) {
        await supabase.from("ui_texts").upsert(
          {
            key: `staff_email_${userToEdit.id}`,
            section: "staff_credentials",
            ar: trimmedEmail,
            ku: trimmedEmail,
          },
          { onConflict: "key" }
        );
      }

      // 3. Update Role in user_roles
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

      // 4. Update Password if provided
      if (editPassword.trim()) {
        if (editPassword.trim().length < 6) {
          throw new Error(lang === "ku" ? "وشەی تێپەڕ دەبێت لانیکەم ٦ پیت بێت" : "كلمة المرور يجب أن لا تقل عن 6 أحرف");
        }

        // Save to ui_texts for quick reference
        await supabase.from("ui_texts").upsert(
          {
            key: `staff_pwd_${userToEdit.id}`,
            section: "staff_credentials",
            ar: editPassword.trim(),
            ku: editPassword.trim(),
          },
          { onConflict: "key" }
        );

        // If editing own account, update directly via client auth without needing service role key!
        if (currentAuthUser && userToEdit.id === currentAuthUser.id) {
          await supabase.auth.updateUser({
            password: editPassword.trim(),
            data: { full_name: editName.trim(), phone: cleanPhone },
          });
        } else {
          try {
            await adminSetUserPassword({
              data: {
                targetUserId: userToEdit.id,
                newPassword: editPassword.trim(),
              },
            });
          } catch (srvErr) {
            console.warn("adminSetUserPassword note:", srvErr);
          }
        }
      } else if (currentAuthUser && userToEdit.id === currentAuthUser.id) {
        // Update user metadata name
        await supabase.auth.updateUser({
          data: { full_name: editName.trim(), phone: cleanPhone },
        });
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

  // Quick Password Change Mutation
  const changePasswordMut = useMutation({
    mutationFn: async () => {
      if (!userForPasswordChange) return;
      if (!quickNewPassword.trim() || quickNewPassword.trim().length < 6) {
        throw new Error(lang === "ku" ? "وشەی تێپەڕ دەبێت لانیکەم ٦ پیت بێت" : "كلمة المرور يجب أن لا تقل عن 6 أحرف");
      }

      // Save to ui_texts for quick reference
      await supabase.from("ui_texts").upsert(
        {
          key: `staff_pwd_${userForPasswordChange.id}`,
          section: "staff_credentials",
          ar: quickNewPassword.trim(),
          ku: quickNewPassword.trim(),
        },
        { onConflict: "key" }
      );

      // If updating own password, update directly via client auth!
      if (currentAuthUser && userForPasswordChange.id === currentAuthUser.id) {
        await supabase.auth.updateUser({ password: quickNewPassword.trim() });
      } else {
        try {
          await adminSetUserPassword({
            data: {
              targetUserId: userForPasswordChange.id,
              newPassword: quickNewPassword.trim(),
            },
          });
        } catch (srvErr) {
          console.warn("adminSetUserPassword note:", srvErr);
        }
      }
    },
    onSuccess: () => {
      toast.success(tx("passwordUpdated"));
      setUserForPasswordChange(null);
      setQuickNewPassword("");
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update password");
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

      // Remove credentials records
      await supabase
        .from("ui_texts")
        .delete()
        .in("key", [`staff_pwd_${targetUser.id}`, `staff_email_${targetUser.id}`]);

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

  // Create Staff Account Mutation (With Name, Phone, Email, Password, Role)
  const createStaffMut = useMutation({
    mutationFn: async () => {
      const cleanPhone = formPhone.replace(/\D/g, "");
      if (cleanPhone.length < 9) throw new Error(lang === "ku" ? "ژمارەی مۆبایل نادروستە" : "رقم هاتف غير صالح");
      if (formPassword.length < 6) throw new Error(lang === "ku" ? "وشەی تێپەڕ دەبێت لانیکەم ٦ پیت بێت" : "كلمة المرور يجب أن لا تقل عن 6 أحرف");
      if (!formName.trim()) throw new Error(lang === "ku" ? "تکایە ناو بنووسە" : "يرجى كتابة الاسم");

      const trimmedEmail = formEmail.trim().toLowerCase();
      const finalEmail = trimmedEmail.includes("@") ? trimmedEmail : `${cleanPhone}@dentalstore.app`;

      // Prevent reusing owner phone/email
      if (cleanPhone.includes("7702269722") || finalEmail.includes("dosty.wal98@gmail.com")) {
        throw new Error(lang === "ku" ? "ئەم ژمارە یان ئیمەیڵە تایبەتە بە هەژماری سەرەکی" : "هذا الرقم أو البريد مخصص للحساب الرئيسي");
      }

      // 1. Register with isolated client so active admin session is NEVER replaced or logged out!
      let newUserId: string | null = null;
      try {
        const isolatedClient = getIsolatedAuthClient();
        const { data: signUpData, error: signUpErr } = await isolatedClient.auth.signUp({
          email: finalEmail,
          password: formPassword,
          options: {
            data: {
              full_name: formName.trim(),
              phone: cleanPhone,
              email: finalEmail,
            },
          },
        });

        if (signUpErr && !signUpErr.message.toLowerCase().includes("already registered")) {
          throw signUpErr;
        }

        newUserId = signUpData?.user?.id || null;
      } catch (authErr: any) {
        console.warn("Isolated auth registration warning:", authErr);
      }

      // Check if an existing profile already exists with this phone
      if (!newUserId) {
        const { data: existingProf } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (existingProf?.id) {
          newUserId = existingProf.id;
        }
      }

      // Fallback: must ALWAYS be a valid UUID for PostgreSQL
      if (!newUserId) {
        newUserId = crypto.randomUUID();
      }

      // 2. Insert profile record into profiles table using admin session
      const { error: profErr } = await supabase.from("profiles").upsert(
        { id: newUserId, full_name: formName.trim(), phone: cleanPhone },
        { onConflict: "id" }
      );
      if (profErr) throw profErr;

      // 3. Assign role in user_roles table
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: newUserId, role: formRole },
        { onConflict: "user_id,role" }
      );
      if (roleErr) throw roleErr;

      // 4. Save password to ui_texts for quick reference
      await supabase.from("ui_texts").upsert(
        {
          key: `staff_pwd_${newUserId}`,
          section: "staff_credentials",
          ar: formPassword,
          ku: formPassword,
        },
        { onConflict: "key" }
      );

      // 5. Save email to ui_texts for quick reference
      await supabase.from("ui_texts").upsert(
        {
          key: `staff_email_${newUserId}`,
          section: "staff_credentials",
          ar: finalEmail,
          ku: finalEmail,
        },
        { onConflict: "key" }
      );
    },
    onSuccess: () => {
      toast.success(tx("createSuccess"));
      setIsAddOpen(false);
      setFormName("");
      setFormPhone("");
      setFormEmail("");
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
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.full_name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.username.toLowerCase().includes(q);

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

                  {/* Email Input Field */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                      <Mail className="size-3 text-[#007979]" />
                      <span>{tx("email")}</span>
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="admin@batrading.iq"
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

        {/* Users Data Table with Username, Email and Password */}
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
              <table className="w-full text-start border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 text-start">{tx("colUser")}</th>
                    <th className="py-3 px-4 text-start">{tx("colUsername")}</th>
                    <th className="py-3 px-4 text-start">{tx("colPassword")}</th>
                    <th className="py-3 px-4 text-start">{tx("colRole")}</th>
                    <th className="py-3 px-4 text-start hidden lg:table-cell">{tx("colJoined")}</th>
                    <th className="py-3 px-4 text-end">{tx("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredUsers.map((user) => {
                    const isAdmin = user.role === "admin";
                    const isManager = user.role === "brand_manager";
                    const isSelf = currentAuthUser?.id === user.id;
                    const isPasswordRevealed = !!visiblePasswords[user.id];
                    const pwdDisplay = user.saved_password || "";

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
                        {/* User Column (Avatar, Name, Email, ID) */}
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
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px]">
                                  {user.full_name}
                                </span>
                                {isSelf && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#007979]/15 text-[#007979] dark:text-teal-400">
                                    {lang === "ku" ? "تۆ" : lang === "ar" ? "أنت" : "You"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{user.id.slice(0, 8)}
                                </span>
                                {user.email && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    <Mail className="size-2.5 text-slate-400" />
                                    <span className="truncate max-w-[140px]">{user.email}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Username & Contact Column */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                <Phone className="size-3 text-slate-400 shrink-0" />
                                <span dir="ltr">{user.phone || user.username}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(user.phone || user.username, tx("phone"))}
                                className="size-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                title={tx("phone")}
                              >
                                <Copy className="size-3" />
                              </button>
                            </div>

                            {user.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <Mail className="size-3 text-slate-400 shrink-0" />
                                <span className="font-mono truncate max-w-[150px]">{user.email}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(user.email!, tx("email"))}
                                  className="size-5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                  title={tx("email")}
                                >
                                  <Copy className="size-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Password Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              <Key className="size-3 text-slate-400 shrink-0" />
                              <span dir="ltr">
                                {pwdDisplay
                                  ? isPasswordRevealed
                                    ? pwdDisplay
                                    : "••••••••"
                                  : "••••••••"}
                              </span>
                            </div>

                            {/* Show/Hide Toggle */}
                            {pwdDisplay && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="size-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                                title={isPasswordRevealed ? "Hide password" : "Show password"}
                              >
                                {isPasswordRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                            )}

                            {/* Copy Password Button */}
                            {pwdDisplay && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(pwdDisplay, tx("colPassword"))}
                                className="size-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                                title={tx("colPassword")}
                              >
                                <Copy className="size-3" />
                              </button>
                            )}

                            {/* Quick Set/Change Password Key Button */}
                            <button
                              type="button"
                              onClick={() => openQuickPasswordModal(user)}
                              className="size-7 rounded-lg hover:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                              title={tx("savePassword")}
                            >
                              <Pencil className="size-3" />
                            </button>
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
                        <td className="py-3 px-4 hidden lg:table-cell">
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

      {/* Edit User Modal (With Name, Phone, Email, Role, and Password) */}
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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <Mail className="size-3 text-[#007979]" />
                  <span>{tx("email")}</span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="admin@batrading.iq"
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tx("newPassword")}
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                />
                <p className="text-[10px] text-slate-400 mt-1">{tx("newPasswordHelp")}</p>
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

      {/* Quick Password Change Modal */}
      <Dialog open={!!userForPasswordChange} onOpenChange={(open) => !open && setUserForPasswordChange(null)}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="size-4 text-amber-500" />
              <span>{tx("changePasswordTitle")}</span>
            </DialogTitle>
          </DialogHeader>

          {userForPasswordChange && (
            <div className="space-y-3.5 pt-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {userForPasswordChange.full_name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {userForPasswordChange.phone || userForPasswordChange.email || userForPasswordChange.username}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tx("newPasswordRequired")}
                </label>
                <input
                  type="text"
                  value={quickNewPassword}
                  onChange={(e) => setQuickNewPassword(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserForPasswordChange(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {tx("cancel")}
                </button>
                <button
                  type="button"
                  disabled={changePasswordMut.isPending}
                  onClick={() => changePasswordMut.mutate()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-extrabold shadow-sm transition active:scale-95"
                >
                  {changePasswordMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{tx("savePassword")}</span>
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
                  {userToDelete.full_name} ({userToDelete.email || userToDelete.phone})
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
