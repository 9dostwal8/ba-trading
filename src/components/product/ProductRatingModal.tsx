import React from "react";
import { Star } from "lucide-react";
import { pickName, type Lang } from "@/lib/i18n";
import type { Product } from "@/lib/store";

interface ProductRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  lang: Lang;
  userStars: number;
  setUserStars: (stars: number) => void;
  hoverStars: number;
  setHoverStars: (stars: number) => void;
  reviewerName: string;
  setReviewerName: (name: string) => void;
  reviewComment: string;
  setReviewComment: (comment: string) => void;
  isSubmittingRating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProductRatingModal({
  isOpen,
  onClose,
  product,
  lang,
  userStars,
  setUserStars,
  hoverStars,
  setHoverStars,
  reviewerName,
  setReviewerName,
  reviewComment,
  setReviewComment,
  isSubmittingRating,
  onSubmit,
}: ProductRatingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-[17px] font-black text-slate-900">
            {lang === "ar"
              ? "تقييم المنتج والجودة"
              : lang === "ku"
              ? "هەڵسەنگاندنی بەرهەم"
              : "Rate this Product"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {/* Product mini header */}
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt=""
                className="size-12 object-contain rounded-xl bg-white p-1 border border-slate-100"
              />
            ) : (
              <span className="text-2xl">🦷</span>
            )}
            <div>
              <h4 className="line-clamp-1 text-[13px] font-black text-slate-800">
                {pickName(product, lang)}
              </h4>
              <span className="text-[11px] font-bold text-primary">{product.brand}</span>
            </div>
          </div>

          {/* Interactive Star Picker */}
          <div className="text-center py-2 space-y-1.5">
            <span className="text-[12px] font-black text-slate-500 block">
              {lang === "ar"
                ? "اختر التقييم بالنجوم:"
                : lang === "ku"
                ? "هەڵسەنگاندن بە ئەستێرە دیاریبکە:"
                : "Select your rating:"}
            </span>
            <div className="flex items-center justify-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setUserStars(s)}
                  onMouseEnter={() => setHoverStars(s)}
                  onMouseLeave={() => setHoverStars(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`size-8 transition-colors ${
                      s <= (hoverStars || userStars)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-[13px] font-black text-amber-600">
              {userStars === 5
                ? lang === "ar"
                  ? "ممتاز جداً 🌟🌟🌟🌟🌟"
                  : lang === "ku"
                  ? "ناوازە و نایاب"
                  : "Excellent"
                : userStars === 4
                ? lang === "ar"
                  ? "جيد جداً ⭐⭐⭐⭐"
                  : lang === "ku"
                  ? "زۆر باش"
                  : "Very Good"
                : userStars === 3
                ? lang === "ar"
                  ? "جيد ⭐⭐⭐"
                  : lang === "ku"
                  ? "باش"
                  : "Good"
                : lang === "ar"
                ? "مقبول ⭐"
                : lang === "ku"
                ? "مامناوەند"
                : "Fair"}
            </span>
          </div>

          {/* Name / Clinic Name */}
          <div className="space-y-1">
            <label className="text-[12px] font-black text-slate-700 block">
              {lang === "ar"
                ? "اسمك أو اسم العيادة *"
                : lang === "ku"
                ? "ناوی پزیشک یان کلینیک *"
                : "Your Name / Clinic Name *"}
            </label>
            <input
              type="text"
              required
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "مثال: د. سارة - مركز بغداد الطبي"
                  : lang === "ku"
                  ? "نموونە: د. سارا - کلینیکی هەولێر"
                  : "e.g. Dr. Sarah Dental Clinic"
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
            />
          </div>

          {/* Review Text */}
          <div className="space-y-1">
            <label className="text-[12px] font-black text-slate-700 block">
              {lang === "ar"
                ? "ملاحظاتك ورأيك في المنتج"
                : lang === "ku"
                ? "سەرنج و تێبینی لەسەر بەرهەم"
                : "Your Review & Feedback"}
            </label>
            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "اكتب تفاصيل تجربتك مع المنتج..."
                  : lang === "ku"
                  ? "تێبینی و ڕای خۆت بنووسە..."
                  : "Write your thoughts on product quality..."
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 active:scale-95"
            >
              {lang === "ar" ? "إلغاء" : lang === "ku" ? "پاشگەزبوونەوە" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmittingRating}
              className="flex-1 h-11 rounded-xl bg-primary text-[13.5px] font-black text-white shadow-md transition hover:opacity-95 active:scale-95 disabled:opacity-50"
            >
              {isSubmittingRating
                ? lang === "ar"
                  ? "جاري الحفظ..."
                  : lang === "ku"
                  ? "پاشەکەوت دەکرێت..."
                  : "Saving..."
                : lang === "ar"
                ? "إرسال التقييم"
                : lang === "ku"
                ? "ناردنی هەڵسەنگاندن"
                : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
