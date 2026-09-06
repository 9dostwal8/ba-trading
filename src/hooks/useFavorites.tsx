import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export function useFavorites() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("product_favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) {
        console.warn("Failed to fetch favorites:", error);
        return [];
      }
      return (data || []).map((row: any) => row.product_id as string);
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        throw new Error("AUTH_REQUIRED");
      }

      const isFav = favoriteIds.includes(productId);

      if (isFav) {
        const { error } = await supabase
          .from("product_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        if (error) throw error;
        return { action: "removed", productId };
      } else {
        const { error } = await supabase
          .from("product_favorites")
          .insert({
            user_id: user.id,
            product_id: productId,
          });

        if (error) throw error;
        return { action: "added", productId };
      }
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
      return { previous };
    },
    onError: (err: any, _productId, context) => {
      if (user && context?.previous) {
        queryClient.setQueryData(["favorites", user.id], context.previous);
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
      if (user) {
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
