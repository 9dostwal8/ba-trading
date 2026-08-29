import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { fetchStoreData } from "@/lib/store";
import { pick, useI18n } from "@/lib/i18n";

export function GooshiFooter() {
  const { lang } = useI18n();
  const { data } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const s = data?.settings;

  const trustFeatures = [
    {
      icon: Truck,
      title_ar: "توصيل سريع",
      title_ku: "گەیاندنی خێرا",
      title_en: "Express Delivery",
      desc_ar: "توصيل لكافة مدن العراق وكردستان",
      desc_ku: "گەیاندن بۆ هەموو عێراق و کوردستان",
      desc_en: "Fast shipping to all cities",
    },
    {
      icon: ShieldCheck,
      title_ar: "ضمان الجودة والأصالة",
      title_ku: "گەرەنتی ڕەسەنایەتی",
      title_en: "100% Genuine",
      desc_ar: "منتجات طبية معتمدة من الوكلاء",
      desc_ku: "بەرهەمی پەسەندکراو لە بریکارەکان",
      desc_en: "Certified dental materials",
    },
    {
      icon: Headphones,
      title_ar: "دعم فني واستشاري",
      title_ku: "پشتیوانی بەردەوام",
      title_en: "24/7 Support",
      desc_ar: "فريق جاهز لخدمتكم يومياً",
      desc_ku: "تیمێکی ئامادە بۆ خزمەتتان",
      desc_en: "Dedicated support team",
    },
    {
      icon: CheckCircle2,
      title_ar: "أفضل أسعار الجملة",
      title_ku: "باشترین نرخی کۆ",
      title_en: "Best Wholesale Prices",
      desc_ar: "عروض وباقات خاصة بالعيادات",
      desc_ku: "ئۆفەری تایبەت بۆ کلینیکەکان",
      desc_en: "Special clinic tier prices",
    },
  ];

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      {/* Trust Features Strip (GooshiShop Style) */}
      <div className="border-b border-slate-100 bg-slate-50/70 py-8">
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-4 lg:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            {trustFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feat.icon className="size-6" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-extrabold text-slate-800">
                    {lang === "ar" ? feat.title_ar : lang === "ku" ? feat.title_ku : feat.title_en}
                  </h4>
                  <p className="truncate text-[11px] font-medium text-slate-500">
                    {lang === "ar" ? feat.desc_ar : lang === "ku" ? feat.desc_ku : feat.desc_en}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-4 py-10 lg:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Column 1: Store Intro */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg text-white">
                {s?.logo_emoji || "🦷"}
              </span>
              <span className="font-display text-[17px] font-black text-slate-800">
                {(s && pick(s.site_name_ar, s.site_name_ku, lang)) || "BA Trading"}
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate-500">
              {lang === "ar"
                ? "المنصة الأولى المعتمدة لتجهيز عيادات ومراكز طب الأسنان بأفضل المواد والمعدات وأسعار الجملة."
                : lang === "ku"
                ? "یەکەمین پلاتفۆرمی پەسەندکراو بۆ دابینکردنی کەرەستە و ئامێری پزیشکی ددان بە نرخی کۆفرۆشی."
                : "The premier platform for dental clinics supplying high-quality instruments and dental materials."}
            </p>
            {s?.whatsapp && (
              <a
                href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              >
                <MessageCircle className="size-4" />
                <span>{lang === "ar" ? "تواصل معنا عبر واتساب" : lang === "ku" ? "پەیوەندی بە وەتسئاپ" : "WhatsApp Us"}</span>
              </a>
            )}
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h5 className="mb-3 text-[13.5px] font-black text-slate-800">
              {lang === "ar" ? "روابط سريعة" : lang === "ku" ? "بەستەری خێرا" : "Quick Links"}
            </h5>
            <ul className="space-y-2 text-[12.5px] font-medium text-slate-600">
              <li>
                <Link to="/products" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "جميع المنتجات" : lang === "ku" ? "هەموو بەرهەمەکان" : "All Products"}
                </Link>
              </li>
              <li>
                <Link to="/deals" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "العروض السريعة" : lang === "ku" ? "ئۆفەری خێرا" : "Flash Deals"}
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "تخفيضات خاصة" : lang === "ku" ? "داشکاندنی تایبەت" : "Special Offers"}
                </Link>
              </li>
              <li>
                <Link to="/bundles" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "باقات العيادات" : lang === "ku" ? "پاکێجی کلینیکەکان" : "Clinic Bundles"}
                </Link>
              </li>
              <li>
                <Link to="/brands" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "الماركات المعتمدة" : lang === "ku" ? "براندە پەسەندکراوەکان" : "Approved Brands"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h5 className="mb-3 text-[13.5px] font-black text-slate-800">
              {lang === "ar" ? "خدمة العملاء" : lang === "ku" ? "خزمەتگوزاری کڕیاران" : "Customer Service"}
            </h5>
            <ul className="space-y-2 text-[12.5px] font-medium text-slate-600">
              <li>
                <Link to="/profile" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "حساب الطبيب / المركز" : lang === "ku" ? "هەژماری پزیشک" : "Doctor Account"}
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "متابعة الطلبات" : lang === "ku" ? "بەدواداچوونی داواکاری" : "Track Orders"}
                </Link>
              </li>
              <li>
                <Link to="/vendor-signup" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "تسجيل الموردين والشركات" : lang === "ku" ? "تۆمارکردنی کۆمپانیاکان" : "Vendor Registration"}
                </Link>
              </li>
              <li>
                <Link to="/rewards" className="hover:text-primary transition-colors">
                  {lang === "ar" ? "نقاط ومكافآت الأطباء" : lang === "ku" ? "خاڵ و پاداشتەکان" : "Reward Points"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Information */}
          <div className="space-y-2.5">
            <h5 className="mb-3 text-[13.5px] font-black text-slate-800">
              {lang === "ar" ? "معلومات التواصل" : lang === "ku" ? "زانیاری پەیوەندی" : "Contact Info"}
            </h5>
            {s?.contact_phone && (
              <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-slate-700">
                <Phone className="size-4 text-primary" />
                <span dir="ltr">{s.contact_phone}</span>
              </div>
            )}
            {s?.contact_email && (
              <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-slate-600">
                <Mail className="size-4 text-primary" />
                <span>{s.contact_email}</span>
              </div>
            )}
            {s?.address_ar && (
              <div className="flex items-start gap-2.5 text-[12.5px] font-medium text-slate-600">
                <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                <span>{pick(s.address_ar, s.address_ku, lang)}</span>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="mt-10 border-t border-slate-100 pt-6 text-center text-[11.5px] font-medium text-slate-400">
          <p>© {new Date().getFullYear()} BA Trading — {lang === "ar" ? "جميع الحقوق محفوظة" : lang === "ku" ? "هەموو مافەکان پارێزراون" : "All rights reserved"}</p>
        </div>
      </div>
    </footer>
  );
}
