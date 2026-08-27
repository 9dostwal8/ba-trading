import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SubPage } from "@/components/profile/SubPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile_/edit")({
  head: () => ({
    meta: [
      { title: "تعديل الملف الشخصي | دنتال ستور" },
      { name: "description", content: "حدّث اسمك ورقم هاتفك المستخدم في تأكيد الطلبات." },
      { property: "og:title", content: "تعديل الملف الشخصي | دنتال ستور" },
      { property: "og:description", content: "تحديث بيانات حسابك الأساسية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditProfilePage,
});

const L = {
  title: { ar: "تعديل الملف", ku: "دەستکاری پرۆفایل", en: "Edit Profile",},
  hint: {
    ar: "الاسم ورقم الهاتف يُستخدمان في تأكيد الطلبات والتوصيل.",
    ku: "ناو و ژمارەی مۆبایل بۆ پەسەندکردنی داواکاری و گەیاندن بەکار دێن.",
    en: "Name and phone number are used for order confirmation and delivery.",
  },
  email: { ar: "البريد الإلكتروني", ku: "ئیمەیل", en: "Email",},
};

function EditProfilePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, phone: form.phone })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error(t("error"));
    else {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
  }

  return (
    <SubPage title={L.title[lang]} subtitle={L.hint[lang]}>
      <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
        <Label text={t("fullName")} />
        <Input
          className="h-12 rounded-xl text-base"
          placeholder={t("fullName")}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <Label text={t("mobile")} />
        <Input
          className="h-12 rounded-xl text-base"
          inputMode="tel"
          dir="ltr"
          placeholder={t("mobile")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Label text={L.email[lang]} />
        <Input
          className="h-12 rounded-xl bg-secondary/50 text-base"
          dir="ltr"
          readOnly
          value={user?.email ?? "—"}
        />
        <Button className="mt-1 h-12 w-full rounded-xl text-base" disabled={saving} onClick={save}>
          {t("save")}
        </Button>
      </div>
    </SubPage>
  );
}

function Label({ text }: { text: string }) {
  return <p className="text-sm font-extrabold text-muted-foreground">{text}</p>;
}
