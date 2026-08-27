import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { refreshQiPayment } from "@/lib/qi.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/payment/$orderId")({
  head: () => ({
    meta: [
      { title: "نتيجة الدفع | دنتال ستور" },
      { name: "description", content: "تحقق من حالة دفع طلبك عبر بطاقة كي." },
      { property: "og:title", content: "نتيجة الدفع | دنتال ستور" },
      { property: "og:description", content: "حالة الدفع الإلكتروني لطلبك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentResultPage,
});

const copy = {
  ar: {
    title: "نتيجة الدفع",
    checking: "جاري التحقق من الدفع...",
    paid: "تم الدفع بنجاح",
    failed: "لم يكتمل الدفع",
    retry: "إعادة المحاولة",
    orders: "طلباتي",
    hint: "إذا دفعت للتو، قد يستغرق التأكيد ثوانٍ قليلة.",
  },
  ku: {
    title: "ئەنجامی پارەدان",
    checking: "پشکنینی پارەدان...",
    paid: "پارەدان سەرکەوتوو بوو",
    failed: "پارەدان تەواو نەبوو",
    retry: "دووبارە هەوڵ بدە",
    orders: "داواکاریەکانم",
    hint: "ئەگەر ئێستا پارەت داوە، چەند چرکەیەک دەخایەنێت.",
  },
  en: {
    title: "Payment result",
    checking: "Checking your payment...",
    paid: "Payment successful",
    failed: "Payment was not completed",
    retry: "Try again",
    orders: "My orders",
    hint: "If you just paid, confirmation may take a few seconds.",
  },
} as const;

function PaymentResultPage() {
  const { orderId } = useParams({ from: "/payment/$orderId" });
  const { lang } = useI18n();
  const c = copy[lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];
  const refresh = useServerFn(refreshQiPayment);

  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: ["qi-payment", orderId],
    queryFn: () => refresh({ data: { orderId } }),
    refetchInterval: (q) => (q.state.data?.paid ? false : 4000),
    retry: 1,
  });

  const paid = data?.paid === true;
  const pending = isPending || (!paid && data?.status === "CREATED");

  return (
    <StoreLayout>
      <div className="px-3 pt-4">
        <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span
            className={
              "tile-icon size-16 " +
              (paid ? "text-success" : pending ? "text-primary" : "text-destructive")
            }
          >
            {paid ? (
              <CheckCircle2 className="size-8" strokeWidth={2.4} />
            ) : pending ? (
              <Clock className="size-8 animate-pulse" strokeWidth={2.4} />
            ) : (
              <XCircle className="size-8" strokeWidth={2.4} />
            )}
          </span>
          <p className="font-display text-base font-extrabold">
            {paid ? c.paid : pending ? c.checking : c.failed}
          </p>
          <p className="text-xs text-muted-foreground">{c.hint}</p>
          {data?.status && (
            <span className="chip-soft inline-flex items-center gap-1.5">
              <CreditCard className="size-3.5" />
              {data.status}
            </span>
          )}
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/orders">{c.orders}</Link>
            </Button>
            {!paid && (
              <Button
                size="lg"
                variant="secondary"
                className="rounded-xl"
                disabled={isFetching}
                onClick={() => refetch()}
              >
                {c.retry}
              </Button>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
