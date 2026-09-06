import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  KeyRound,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import React, { Component, type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSetUserPassword } from "@/lib/admin-users.functions";

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string;
  lang?: string;
  created_at?: string;
  updated_at?: string;
};

type OrderRow = {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
};

class AdminUsersErrorBoundary extends Component<
  { children: ReactNode; lang?: string },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: ReactNode; lang?: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: String(error?.message || error) };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("AdminUsers error caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 space-y-4 max-w-lg mx-auto my-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 mx-auto">
            <ShieldAlert className="size-6" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
            {this.props.lang === "ku"
              ? "هەڵەیەک ڕوویدا لە پیشاندانی بەکارهێنەران"
              : "حدث خطأ أثناء تحميل بيانات المستخدمين"}
          </h3>
          <p className="text-xs text-rose-500 font-mono">{this.state.errorMsg}</p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black"
          >
            {this.props.lang === "ku" ? "دووبارە هەوڵبدەرەوە" : "إعادة المحاولة"}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminUsersContent() {
  const { lang } = useI18n();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "ordered" | "new">("all");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form states for Edit / Password
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch All Profiles
  const {
    data: profiles = [],
    isLoading: profilesLoading,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ["admin_website_profiles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone, lang, created_at, updated_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Profiles fetch note:", error);
          return [];
        }
        return (data || []) as ProfileRow[];
      } catch (err) {
        console.warn("Profiles fetch exception:", err);
        return [];
      }
    },
  });

  // 2. Fetch Orders for User Stats
  const { data: orders = [] } = useQuery({
    queryKey: ["admin_user_orders_summary"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, user_id, total, status, created_at");

        if (error) {
          console.warn("Orders fetch note:", error);
          return [];
        }
        return (data || []) as OrderRow[];
      } catch (err) {
        console.warn("Orders fetch exception:", err);
        return [];
      }
    },
  });

  // 3. Fetch User Orders for Selected User
  const { data: userOrders = [] } = useQuery({
    queryKey: ["admin_user_orders", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      try {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", selectedUser.id)
          .order("created_at", { ascending: false });
        return data || [];
      } catch (err) {
        console.warn("User orders error:", err);
        return [];
      }
    },
    enabled: !!selectedUser?.id && isDetailOpen,
  });

  // 4. Fetch User Favorites for Selected User
  const { data: userFavorites = [] } = useQuery({
    queryKey: ["admin_user_favorites", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      try {
        // Check ui_texts
        const { data: uiData } = await supabase
          .from("ui_texts")
          .select("ar")
          .eq("key", `fav_${selectedUser.id}`)
          .maybeSingle();

        if (uiData?.ar) {
          try {
            const ids: string[] = JSON.parse(uiData.ar);
            if (Array.isArray(ids) && ids.length > 0) {
              const { data: prods } = await supabase
                .from("products")
                .select("id, name_ar, name_ku, price, image_url")
                .in("id", ids);

              return (prods || []).map((p) => ({
                id: p.id,
                product_id: p.id,
                products: p,
              }));
            }
          } catch {
            // parse error
          }
        }

        const { data } = await supabase
          .from("product_favorites")
          .select("id, product_id, created_at, products(id, name_ar, name_ku, price, image_url)")
          .eq("user_id", selectedUser.id);
        return data || [];
      } catch (err) {
        console.warn("User favorites error:", err);
        return [];
      }
    },
    enabled: !!selectedUser?.id && isDetailOpen,
  });

  // 5. Fetch User Reviews for Selected User
  const { data: userReviews = [] } = useQuery({
    queryKey: ["admin_user_reviews", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      try {
        const list: any[] = [];
        // Check ui_texts
        const { data: uiTexts } = await supabase
          .from("ui_texts")
          .select("key, ar, created_at")
          .eq("section", "product_reviews");

        if (uiTexts && Array.isArray(uiTexts)) {
          for (const row of uiTexts) {
            try {
              const parsed = JSON.parse(row.ar);
              if (parsed?.user_id === selectedUser.id) {
                list.push({
                  id: row.key,
                  product_id: parsed.product_id,
                  rating: Number(parsed.rating || 5),
                  comment: parsed.comment || "",
                  reviewer_name: parsed.reviewer_name || selectedUser.full_name,
                  created_at: parsed.created_at || row.created_at,
                  products: { name_ar: parsed.comment || "Product", name_ku: parsed.comment || "Product" },
                });
              }
            } catch {
              // ignore
            }
          }
        }

        const { data } = await supabase
          .from("product_reviews")
          .select("id, product_id, rating, comment, created_at, products(id, name_ar, name_ku)")
          .eq("user_id", selectedUser.id);

        if (data && Array.isArray(data)) {
          for (const d of data) {
            if (!list.some((l) => l.product_id === d.product_id)) {
              list.push(d);
            }
          }
        }

        return list;
      } catch (err) {
        console.warn("User reviews error:", err);
        return [];
      }
    },
    enabled: !!selectedUser?.id && isDetailOpen,
  });

  // Map orders to user statistics
  const userOrderStats = useMemo(() => {
    const map = new Map<string, { count: number; totalSpent: number; lastOrderDate: string | null }>();
    for (const ord of orders) {
      if (!ord.user_id) continue;
      const current = map.get(ord.user_id) || { count: 0, totalSpent: 0, lastOrderDate: null };
      current.count += 1;
      current.totalSpent += Number(ord.total || 0);
      if (!current.lastOrderDate || new Date(ord.created_at) > new Date(current.lastOrderDate)) {
        current.lastOrderDate = ord.created_at;
      }
      map.set(ord.user_id, current);
    }
    return map;
  }, [orders]);

  // General Top Metrics
  const metrics = useMemo(() => {
    const totalUsers = profiles.length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const newThisWeek = profiles.filter(
      (p) => p.created_at && new Date(p.created_at) >= oneWeekAgo
    ).length;

    const orderedUsersCount = profiles.filter((p) => {
      const st = userOrderStats.get(p.id);
      return (st?.count ?? 0) > 0;
    }).length;

    const totalOrdersPlaced = orders.length;

    return { totalUsers, newThisWeek, orderedUsersCount, totalOrdersPlaced };
  }, [profiles, userOrderStats, orders]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((user) => {
      const matchesSearch =
        !q ||
        (user.full_name && user.full_name.toLowerCase().includes(q)) ||
        (user.phone && user.phone.includes(q)) ||
        user.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const st = userOrderStats.get(user.id);
      if (filter === "ordered") {
        return (st?.count ?? 0) > 0;
      }
      if (filter === "new") {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return user.created_at ? new Date(user.created_at) >= twoWeeksAgo : false;
      }
      return true;
    });
  }, [profiles, search, filter, userOrderStats]);

  // Actions
  const openDetail = (u: ProfileRow) => {
    setSelectedUser(u);
    setIsDetailOpen(true);
  };

  const openEdit = (u: ProfileRow) => {
    setSelectedUser(u);
    setEditName(u.full_name || "");
    setEditPhone(u.phone || "");
    setIsEditOpen(true);
  };

  const openPassword = (u: ProfileRow) => {
    setSelectedUser(u);
    setNewPassword("");
    setIsPasswordModalOpen(true);
  };

  const openDelete = (u: ProfileRow) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success(
        lang === "ku" ? "زانیاری بەکارهێنەر نوێکرایەوە" : "تم تحديث بيانات المستخدم بنجاح"
      );
      qc.invalidateQueries({ queryKey: ["admin_website_profiles"] });
      setIsEditOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || newPassword.length < 6) {
      toast.error(
        lang === "ku" ? "وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت" : "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await adminSetUserPassword({
        data: {
          targetUserId: selectedUser.id,
          newPassword,
        },
      });
      toast.success(
        lang === "ku" ? "وشەی نهێنی بە سەرکەوتوویی گۆڕدرا" : "تم تغيير كلمة المرور بنجاح"
      );
      setIsPasswordModalOpen(false);
      setNewPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success(
        lang === "ku" ? "بەکارهێنەر سڕدرایەوە" : "تم حذف المستخدم بنجاح"
      );
      qc.invalidateQueries({ queryKey: ["admin_website_profiles"] });
      setIsDeleteModalOpen(false);
      setIsDetailOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-8">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
            <Users className="size-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {lang === "ku" ? "بەکارهێنەرانی سایت" : lang === "ar" ? "مستخدمو الموقع والعملاء" : "Website Users & Customers"}
          </h1>
        </div>
      </div>

      {/* Top Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Users className="size-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
              {lang === "ku" ? "کۆی بەکارهێنەران" : "إجمالي المسجلين"}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalUsers}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <UserPlus className="size-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
              {lang === "ku" ? "نوێی ئەم هەفتەیە" : "جدد هذا الأسبوع"}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              +{metrics.newThisWeek}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <ShoppingBag className="size-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
              {lang === "ku" ? "کڕیارانی چالاک" : "عملاء اشتروا"}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {metrics.orderedUsersCount}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
              {lang === "ku" ? "داواکاریەکان" : "إجمالي الطلبات"}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalOrdersPlaced}
            </span>
          </div>
        </div>

      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === "ku"
                ? "گەڕان بەپێی ناوی دکتۆر، کلینیک، ژمارەی مۆبایل..."
                : "ابحث بالاسم أو اسم العيادة أو رقم الموبايل..."
            }
            className="ps-10 h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {lang === "ku" ? `هەموو (${profiles.length})` : `الكل (${profiles.length})`}
          </button>
          <button
            type="button"
            onClick={() => setFilter("ordered")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              filter === "ordered"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {lang === "ku" ? "کڕیارەکان" : "المشترون"}
          </button>
          <button
            type="button"
            onClick={() => setFilter("new")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              filter === "new"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {lang === "ku" ? "تۆمارکراوانی نوێ" : "المسجلون حديثاً"}
          </button>
        </div>

      </div>

      {/* Users Table / Grid */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        
        {profilesLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="size-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-bold text-slate-400">Loading website users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <User className="size-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-black text-slate-700 dark:text-slate-200">
              {lang === "ku" ? "هیچ بەکارهێنەرێک نەدۆزرایەوە" : "لم يتم العثور على أي مستخدم"}
            </h3>
            <p className="text-xs font-semibold text-slate-400">
              {search
                ? lang === "ku"
                  ? "وشەی گەڕانەکەت بگۆڕە"
                  : "جرب البحث بكلمات أخرى"
                : lang === "ku"
                ? "تا ئێستا هیچ بەکارهێنەرێک هەژماری دروست نەکردووە"
                : "لا يوجد مستخدمون مسجلون حتى الآن"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-bold">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3.5 text-start">{lang === "ku" ? "بەکارهێنەر / کلینیک" : "المستخدم / العيادة"}</th>
                  <th className="px-4 py-3.5 text-start">{lang === "ku" ? "مۆبایل" : "رقم الموبايل"}</th>
                  <th className="px-4 py-3.5 text-start">{lang === "ku" ? "بەرواری تۆمارکردن" : "تاريخ التسجيل"}</th>
                  <th className="px-4 py-3.5 text-start">{lang === "ku" ? "داواکاریەکان" : "الطلبات"}</th>
                  <th className="px-4 py-3.5 text-start">{lang === "ku" ? "کۆی کڕین" : "المجموع"}</th>
                  <th className="px-5 py-3.5 text-end">{lang === "ku" ? "کردارەکان" : "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUsers.map((user) => {
                  const st = userOrderStats.get(user.id);
                  const ordersCount = st?.count || 0;
                  const totalSpent = st?.totalSpent || 0;
                  const cleanPhone = (user.phone || "").replace(/\D/g, "");

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-black text-sm">
                            {(user.full_name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {user.full_name || (lang === "ku" ? "بێ ناو" : "بدون اسم")}
                              </span>
                              {ordersCount > 0 && (
                                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-black">
                                  {lang === "ku" ? "کڕیار" : "عميل"}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block truncate max-w-[160px]">
                              ID: {user.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5">
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 dir-ltr">
                              {user.phone}
                            </span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/964${cleanPhone.replace(/^0/, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp"
                                className="flex size-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                              >
                                <MessageCircle className="size-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                        {user.created_at ? (
                          <div className="flex flex-col">
                            <span className="font-bold">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10.5px] text-slate-400">
                              {new Date(user.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Orders Count */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black ${
                            ordersCount > 0
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Package className="size-3" />
                          {ordersCount}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-3.5">
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatPrice(totalSpent, lang)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetail(user)}
                            title={lang === "ku" ? "بینینی زانیاری" : "عرض التفاصيل"}
                            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/60 dark:text-slate-300 transition"
                          >
                            <Eye className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openPassword(user)}
                            title={lang === "ku" ? "وشەی نهێنی" : "كلمة المرور"}
                            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 dark:bg-slate-800 dark:hover:bg-amber-950/60 dark:text-slate-300 transition"
                          >
                            <KeyRound className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            title={lang === "ku" ? "دەستکاری" : "تعديل"}
                            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-950/60 dark:text-slate-300 transition"
                          >
                            <UserCheck className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openDelete(user)}
                            title={lang === "ku" ? "سڕینەوە" : "حذف"}
                            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-300 transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* User Detail Drawer / Modal */}
      {isDetailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg shadow-md">
                  {(selectedUser.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedUser.full_name || (lang === "ku" ? "بەکارهێنەری بێ ناو" : "مستخدم بدون اسم")}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {selectedUser.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Profile Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-bold">
              <div>
                <span className="text-slate-400 block mb-0.5">{lang === "ku" ? "ژمارەی مۆبایل" : "رقم الموبايل"}</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 dir-ltr block">
                  {selectedUser.phone || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{lang === "ku" ? "بەرواری دروستکردنی هەژمار" : "تاريخ إنشاء الحساب"}</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{lang === "ku" ? "زمانی بەکارهێنەر" : "لغة الواجهة"}</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">
                  {selectedUser.lang || "ar"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{lang === "ku" ? "کۆی داواکارییەکان" : "إجمالي الطلبات"}</span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                  {userOrders.length} {lang === "ku" ? "داواکاری" : "طلبات"}
                </span>
              </div>
            </div>

            {/* Direct WhatsApp Action */}
            {selectedUser.phone && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="size-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                      {lang === "ku" ? "پەیوەندی ڕاستەوخۆ بە واتسئاپ" : "مراسلة مباشرة عبر واتساب"}
                    </h4>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {lang === "ku" ? "ناردنی پەیام بۆ کلینیک یان پزیشک" : "إرسال رسالة أو عرض خاص للعميل"}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/964${selectedUser.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(
                    lang === "ku"
                      ? `سڵاو دکتۆر ${selectedUser.full_name || ""}، هیوادارین باش بن.`
                      : `مرحباً دكتور ${selectedUser.full_name || ""}، نتمنى لك يوماً سعيداً.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-black shadow-sm transition"
                >
                  {lang === "ku" ? "کردنەوەی چات" : "فتح المحادثة"}
                </a>
              </div>
            )}

            {/* Orders History Tab */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ShoppingBag className="size-4 text-blue-600" />
                <span>{lang === "ku" ? "مێژووی داواکاریەکان" : "سجل الطلبات"} ({userOrders.length})</span>
              </h4>

              {userOrders.length === 0 ? (
                <p className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-center text-xs font-bold text-slate-400">
                  {lang === "ku" ? "هیچ داواکارییەکی ئەنجام نەداوە" : "لم يقم هذا العميل بأي طلبات بعد"}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userOrders.map((ord: any) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold"
                    >
                      <div>
                        <span className="font-mono text-slate-700 dark:text-slate-300 block">
                          #{ord.id.slice(0, 8)}
                        </span>
                        <span className="text-[10.5px] text-slate-400">
                          {new Date(ord.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-end">
                        <span className="font-black text-slate-900 dark:text-white block">
                          {formatPrice(ord.total, lang)}
                        </span>
                        <span className="text-[10px] font-black uppercase text-blue-600">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Favorites Tab */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Heart className="size-4 text-rose-500 fill-rose-500" />
                <span>{lang === "ku" ? "بەرهەمە دڵخوازەکان" : "المنتجات المفضلة"} ({userFavorites.length})</span>
              </h4>

              {userFavorites.length === 0 ? (
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-center text-xs font-bold text-slate-400">
                  {lang === "ku" ? "هیچ بەرهەمێکی دڵخوازی نییە" : "لا توجد منتجات في المفضلة"}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {userFavorites.map((fav: any) => (
                    <div
                      key={fav.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold"
                    >
                      {fav.products?.image_url ? (
                        <img src={fav.products.image_url} alt="" className="size-8 object-contain rounded-lg" />
                      ) : (
                        <span className="text-sm">🦷</span>
                      )}
                      <span className="truncate flex-1 text-slate-800 dark:text-slate-200">
                        {lang === "ku" ? fav.products?.name_ku : fav.products?.name_ar}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Reviews Tab */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Star className="size-4 text-amber-400 fill-amber-400" />
                <span>{lang === "ku" ? "هەڵسەنگاندنەکانی بەکارهێنەر" : "التقييمات المكتوبة"} ({userReviews.length})</span>
              </h4>

              {userReviews.length === 0 ? (
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-center text-xs font-bold text-slate-400">
                  {lang === "ku" ? "هیچ هەڵسەنگاندنێکی نەنووسیوە" : "لم يقم بكتابة أي تقييم"}
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {userReviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-800 dark:text-slate-200 truncate">
                          {lang === "ku" ? rev.products?.name_ku : rev.products?.name_ar}
                        </span>
                        <span className="text-amber-400">{"⭐".repeat(rev.rating || 5)}</span>
                      </div>
                      {rev.comment && <p className="text-slate-500 text-[11px] font-medium">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-xl font-black text-xs"
              >
                {lang === "ku" ? "داخستن" : "إغلاق"}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {lang === "ku" ? "دەستکاریکردنی زانیاری بەکارهێنەر" : "تعديل بيانات المستخدم"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {lang === "ku" ? "ناوی دکتۆر یان کلینیک" : "الاسم أو اسم العيادة"}
                </Label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {lang === "ku" ? "ژمارەی مۆبایل" : "رقم الموبايل"}
                </Label>
                <Input
                  required
                  dir="ltr"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-10 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  {lang === "ku" ? "پاشگەزبوونەوە" : "إلغاء"}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black"
                >
                  {isSubmitting ? "Saving..." : lang === "ku" ? "پاشەکەوتکردن" : "حفظ التعديلات"}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {lang === "ku" ? "دانانی وشەی نهێنی نوێ" : "تعيين كلمة مرور جديدة"}
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-500">
              {lang === "ku"
                ? `دانانی وشەی نهێنی نوێ بۆ ${selectedUser.full_name || selectedUser.phone}`
                : `تعيين كلمة مرور جديدة لحساب ${selectedUser.full_name || selectedUser.phone}`}
            </p>

            <form onSubmit={handleSetPassword} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {lang === "ku" ? "وشەی نهێنی نوێ (لانیکەم ٦ پیت)" : "كلمة المرور الجديدة (6 أحرف فأكثر)"}
                </Label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  {lang === "ku" ? "پاشگەزبوونەوە" : "إلغاء"}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black"
                >
                  {isSubmitting ? "Setting..." : lang === "ku" ? "نوێکردنەوەی وشەی نهێنی" : "تغيير كلمة المرور"}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {lang === "ku" ? "دڵنیایت لە سڕینەوەی بەکارهێنەر؟" : "هل أنت متأكد من حذف المستخدم؟"}
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  {selectedUser.full_name || selectedUser.phone}
                </p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
              {lang === "ku"
                ? "ئەم کردارە هەژماری بەکارهێنەر دەسڕێتەوە و ناگەڕێتەوە."
                : "سيتم حذف حساب وبيانات هذا المستخدم بشكل نهائي."}
            </p>

            <div className="flex items-center gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                {lang === "ku" ? "پاشگەزبوونەوە" : "إلغاء"}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteUser}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black"
              >
                {isSubmitting ? "Deleting..." : lang === "ku" ? "بەڵێ، بسڕەوە" : "نعم، احذف"}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export function AdminUsers() {
  const { lang } = useI18n();
  return (
    <AdminUsersErrorBoundary lang={lang}>
      <AdminUsersContent />
    </AdminUsersErrorBoundary>
  );
}
