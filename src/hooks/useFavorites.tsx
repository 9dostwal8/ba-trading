import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

function getLocalFavorites(userId?: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`dental-favs-${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalFavorites(userId: string, ids: string[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`dental-favs-${userId}`, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function useFavorites() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const local = getLocalFavorites(user.id);

      try {
        // 1. Fetch from ui_texts
        const { data: uiData } = await supabase
          .from("ui_texts")
          .select("ar")
          .eq("key", `fav_${user.id}`)
          .maybeSingle();

        if (uiData?.ar) {
          try {
            const dbIds = JSON.parse(uiData.ar);
            if (Array.isArray(dbIds)) {
              setLocalFavorites(user.id, dbIds);
              return dbIds as string[];
            }
          } catch {
            // parse error
          }
        }

        // 2. Fallback check product_favorites table if it exists
        const { data: pfData } = await supabase
          .from("product_favorites")
          .select("product_id")
          .eq("user_id", user.id);

        if (pfData && Array.isArray(pfData) && pfData.length > 0) {
          const ids = pfData.map((row: any) => row.product_id as string);
          setLocalFavorites(user.id, ids);
          return ids;
        }
      } catch (err) {
        console.warn("Favorites fetch note:", err);
      }

      return local;
    },
    initialData: user ? getLocalFavorites(user.id) : [],
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        throw new Error("AUTH_REQUIRED");
      }

      const isFav = favoriteIds.includes(productId);
      const nextIds = isFav
        ? favoriteIds.filter((id) => id !== productId)
        : [...favoriteIds, productId];

      // Update local storage immediately
      setLocalFavorites(user.id, nextIds);

      // Save to database in ui_texts
      try {
        await supabase.from("ui_texts").upsert(
          {
            key: `fav_${user.id}`,
            section: "user_favorites",
            ar: JSON.stringify(nextIds),
            ku: JSON.stringify(nextIds),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      } catch (err) {
        console.warn("Failed to update fav in ui_texts:", err);
      }

      // Also try product_favorites table safely without failing if table is absent
      try {
        if (isFav) {
          await supabase
            .from("product_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", productId);
        } else {
          await supabase.from("product_favorites").insert({
            user_id: user.id,
            product_id: productId,
          });
        }
      } catch {
        // ignore if table doesn't exist
      }

      return { action: isFav ? "removed" : "added", productId, nextIds };
    },
    onMutate: async (productId: string) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ["favorites", user.id] });
      const previous = queryClient.getQueryData<string[]>(["favorites", user.id]) || [];

      const exists = previous.includes(productId);
      const next = exists
        ? previous.filter((id) => id !== productId)
        : [...previous, productId];

      queryClient.setQueryData(["favorites", user.id], next);
      setLocalFavorites(user.id, next);
      return { previous };
    },
    onError: (err: any, _productId, context) => {
      if (user && context?.previous) {
        queryClient.setQueryData(["favorites", user.id], context.previous);
        setLocalFavorites(user.id, context.previous);
      }
      if (err?.message === "AUTH_REQUIRED") {
        toast.error(
          lang === "ku"
            ? "پێویستە سەرەتا بچیتە ژوورەوە بۆ ئەوەی بەرهەم زیادبکەیت بۆ دڵخوازەکان"
            : "يجب تسجيل الدخول بحساب لإضافة المنتجات إلى المفضلة",
          {
            description:
              lang === "ku"
                ? "دڵخوازەکان تەنها بۆ بەکارهێنەرانی خاوەن هەژمار بەردەستە."
                : "قائمة المفضلة مخصصة للمستخدمين المسجلين فقط.",
          }
        );
      } else {
        toast.error(
          lang === "ku"
            ? "هەڵەیەک ڕوویدا لە تۆمارکردنی دڵخوازەکان"
            : "حدث خطأ أثناء تحديث المفضلة"
        );
      }
    },
    onSuccess: (res) => {
      if (res?.action === "added") {
        toast.success(
          lang === "ku" ? "زیادکرا بۆ دڵخوازەکان ❤️" : "تمت الإضافة إلى المفضلة ❤️"
        );
      } else if (res?.action === "removed") {
        toast.info(
          lang === "ku" ? "لە دڵخوازەکان لادرا" : "تمت الإزالة من المفضلة"
        );
      }
      if (user && res?.nextIds) {
        queryClient.setQueryData(["favorites", user.id], res.nextIds);
        queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
      }
    },
  });

  const isFavorite = (productId: string) => favoriteIds.includes(productId);

  const toggleFavorite = async (productId: string): Promise<boolean> => {
    if (!user) {
      toast.error(
        lang === "ku"
          ? "پێویستە سەرەتا بچیتە ژوورەوە بۆ ئەوەی بەرهەم زیادبکەیت بۆ دڵخوازەکان"
          : "يجب تسجيل الدخول بحساب لإضافة المنتجات إلى المفضلة",
        {
          description:
            lang === "ku"
              ? "دڵخوازەکان تەنها بۆ بەکارهێنەرانی خاوەن هەژمار بەردەستە."
              : "قائمة المفضلة مخصصة للمستخدمين المسجلين فقط.",
        }
      );
      return false;
    }
    try {
      await toggleMutation.mutateAsync(productId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    isLoading,
    user,
  };
}
