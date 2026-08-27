/** Click-to-chat helpers: no API, no approval — just wa.me deep links. */

/** Normalize an Iraqi (or already-international) number to E.164 digits without "+". */
export function waNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("964")) return d;
  if (d.startsWith("0")) return `964${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("7")) return `964${d}`;
  return d;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export type WaVars = {
  store: string;
  vendor: string;
  count: number | string;
  amount: string;
  days: number | string;
  link: string;
};

export function fillTemplate(tpl: string, vars: WaVars): string {
  return tpl
    .replace(/\{store\}/g, vars.store)
    .replace(/\{vendor\}/g, vars.vendor)
    .replace(/\{count\}/g, String(vars.count))
    .replace(/\{amount\}/g, vars.amount)
    .replace(/\{days\}/g, String(vars.days))
    .replace(/\{link\}/g, vars.link);
}

export type WaTemplateKey =
  | "newOrders"
  | "accounting"
  | "offers"
  | "inactive"
  | "unpaid"
  | "general";

type Tri = { ar: string; ku: string; en: string };

export const WA_TEMPLATES: Record<
  WaTemplateKey,
  { label: Tri; body: Tri }
> = {
  newOrders: {
    label: {
      ar: "طلبات جديدة",
      ku: "داواکاری نوێ",
      en: "New orders",
    },
    body: {
      ar: "مرحباً {vendor} 👋\nلديك {count} طلب جديد في متجرك على {store}.\nيرجى فتح لوحة البائع وقبول الطلب لتجهيز الشحن:\n{link}\nشكراً لك 🌟",
      ku: "سڵاو {vendor} 👋\n{count} داواکاری نوێ لە فرۆشگاکەت لە {store} هەیە.\nتکایە پانێلی فرۆشیار بکەوە و داواکاری پەسەند بکە:\n{link}\nسوپاس 🌟",
      en: "Hello {vendor} 👋\nYou have {count} new order(s) on your {store} shop.\nPlease open your vendor panel and accept them:\n{link}\nThank you 🌟",
    },
  },
  accounting: {
    label: {
      ar: "كشف حساب / محاسبة",
      ku: "ژمێریاری",
      en: "Accounting statement",
    },
    body: {
      ar: "مرحباً {vendor} 👋\nهذا كشف حسابك على {store} لهذه الفترة.\nالمبلغ المستحق: {amount}\nيمكنك مراجعة الفواتير والتفاصيل من لوحة البائع:\n{link}\nشكراً لتعاملكم معنا 🙏",
      ku: "سڵاو {vendor} 👋\nئەمە ژمێریاری تۆیە لە {store} بۆ ئەم ماوەیە.\nبڕی داواکراو: {amount}\nدەتوانی پسوولەکان لە پانێلی فرۆشیار ببینی:\n{link}\nسوپاس 🙏",
      en: "Hello {vendor} 👋\nHere is your {store} statement for this period.\nAmount due: {amount}\nYou can review invoices in your vendor panel:\n{link}\nThanks for working with us 🙏",
    },
  },
  unpaid: {
    label: {
      ar: "تذكير بدفع أجور التسويق",
      ku: "بیرخستنەوەی پارەی ڕیکلام",
      en: "Marketing fees reminder",
    },
    body: {
      ar: "مرحباً {vendor} 👋\nتذكير ودّي: لديك أجور تسويق غير مدفوعة على {store} بمقدار {amount}.\nيرجى التسديد لتبقى عروضك ولافتاتك فعّالة.\nالتفاصيل: {link}\nشكراً 🙏",
      ku: "سڵاو {vendor} 👋\nبیرخستنەوە: پارەی ڕیکلامی نەدراو هەیە لە {store} بە بڕی {amount}.\nتکایە بدە بۆ ئەوەی ئۆفەر و بانەرەکانت چالاک بمێننەوە.\nوردەکاری: {link}\nسوپاس 🙏",
      en: "Hello {vendor} 👋\nFriendly reminder: you have unpaid marketing fees of {amount} on {store}.\nPlease settle it so your offers and banners stay live.\nDetails: {link}\nThank you 🙏",
    },
  },
  offers: {
    label: {
      ar: "دعوة لإضافة عروض",
      ku: "بانگهێشتن بۆ ئۆفەر",
      en: "Add offers invite",
    },
    body: {
      ar: "مرحباً {vendor} 👋\nالأطباء يبحثون الآن عن عروض وتصفية على {store}.\nأضف عرضاً أو صفقة يومية من لوحة البائع وستظهر في الصفحة الرئيسية:\n{link}\nالعروض المميزة تبيع أسرع 🚀",
      ku: "سڵاو {vendor} 👋\nپزیشکەکان ئێستا بەدوای ئۆفەر و ڕیکلامدان لە {store}.\nئۆفەرێک یان ئۆفەری ڕۆژ زیاد بکە لە پانێلی فرۆشیار و لە پەڕەی سەرەکی دەردەکەوێت:\n{link}\nئۆفەری باش خێراتر دەفرۆشێت 🚀",
      en: "Hello {vendor} 👋\nDentists are searching for deals on {store} right now.\nAdd an offer or a daily deal from your vendor panel and it shows on the homepage:\n{link}\nGood offers sell faster 🚀",
    },
  },
  inactive: {
    label: {
      ar: "بائع غير نشط",
      ku: "فرۆشیاری ناچالاک",
      en: "Inactive vendor",
    },
    body: {
      ar: "مرحباً {vendor} 👋\nلم نلاحظ نشاطاً لمتجرك على {store} منذ {days} يوم.\nحدّث المنتجات والأسعار والمخزون لتصل لأطباء أكثر:\n{link}\nنحن هنا للمساعدة في أي وقت 💙",
      ku: "سڵاو {vendor} 👋\nلە {days} ڕۆژە چالاکی فرۆشگاکەت نەبینیوە لە {store}.\nبەرهەم و نرخ و کۆگا نوێ بکە بۆ گەیشتن بە پزیشکی زیاتر:\n{link}\nئێمە لێرەین بۆ یارمەتی 💙",
      en: "Hello {vendor} 👋\nWe haven't seen activity from your {store} shop for {days} days.\nUpdate products, prices and stock to reach more dentists:\n{link}\nWe're here to help anytime 💙",
    },
  },
  general: {
    label: {
      ar: "رسالة عامة",
      ku: "پەیامی گشتی",
      en: "General message",
    },
    body: {
      ar: "مرحباً {vendor} 👋\nرسالة من فريق {store}:\n\n\nرابط اللوحة: {link}",
      ku: "سڵاو {vendor} 👋\nپەیام لە تیمی {store}:\n\n\nلینکی پانێل: {link}",
      en: "Hello {vendor} 👋\nA message from the {store} team:\n\n\nPanel link: {link}",
    },
  },
};
