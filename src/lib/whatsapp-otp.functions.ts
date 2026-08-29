import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const otpSchema = z.object({
  phone: z.string().min(9),
  code: z.string().length(6),
  lang: z.enum(["ar", "ku", "en"]).default("ar"),
});

const GREEN_API_URL = "https://7107.api.greenapi.com/waInstance710722723229/sendMessage/47c9b8d2bd2e4f10a30c44b8a273a3951277c20da1a5495bb6";

export const sendWhatsAppOtp = createServerFn({ method: "POST" })
  .validator((input: unknown) => otpSchema.parse(input))
  .handler(async ({ data }) => {
    let cleanPhone = data.phone.replace(/\D/g, "");
    cleanPhone = cleanPhone.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
    const recipientPhone = `964${cleanPhone}`;

    const message =
      data.lang === "ku"
        ? `🔐 *دنتال ستۆر (BA Trading)*\n\nکۆدی پشتڕاستکردنەوە (OTP):\n*${data.code}*\n\nتکایە ئەم کۆدە لەگەڵ هیچ کەسێک هاوبەش مەکە.`
        : data.lang === "en"
        ? `🔐 *BA Trading Dental Store*\n\nYour verification code (OTP) is:\n*${data.code}*\n\nPlease do not share this code with anyone.`
        : `🔐 *دنتال ستور (BA Trading)*\n\nرمز التحقق الخاص بك (OTP):\n*${data.code}*\n\nيرجى عدم مشاركة هذا الرمز مع أي شخص.`;

    try {
      const response = await fetch(GREEN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: `${recipientPhone}@c.us`,
          message,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Green-API send error:", errText);
        return { success: false, error: errText };
      }

      const result = await response.json();
      return { success: true, idMessage: result.idMessage };
    } catch (e: unknown) {
      console.error("WhatsApp OTP dispatch exception:", e);
      return { success: false, error: e instanceof Error ? e.message : "Network error" };
    }
  });
