import { buildPushPayload } from "@block65/webcrypto-web-push";

export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: string;
};

export type PushText = {
  title_ar: string;
  title_ku: string;
  title_en: string;
  body_ar: string;
  body_ku: string;
  body_en: string;
  link: string;
};

function pickLang(text: PushText, lang: string) {
  const t =
    lang === "ku"
      ? text.title_ku || text.title_ar || text.title_en
      : lang === "en"
        ? text.title_en || text.title_ar || text.title_ku
        : text.title_ar || text.title_en || text.title_ku;
  const b =
    lang === "ku"
      ? text.body_ku || text.body_ar || text.body_en
      : lang === "en"
        ? text.body_en || text.body_ar || text.body_ku
        : text.body_ar || text.body_en || text.body_ku;
  return { title: t || "OfferDent", body: b || "" };
}

/**
 * Delivers one web-push message to every target. Returns the endpoints that the
 * push service rejected as gone (404/410) so the caller can prune them.
 */
export async function deliverPush(
  targets: PushTarget[],
  text: PushText,
  origin: string,
): Promise<{ sent: number; failed: number; gone: string[] }> {
  const vapid = {
    subject: process.env["VAPID_SUBJECT"] || "mailto:admin@offerdent.app",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
  if (!vapid.publicKey || !vapid.privateKey) {
    throw new Error("Push keys are not configured");
  }

  const link = text.link?.startsWith("http")
    ? text.link
    : `${origin}${text.link?.startsWith("/") ? text.link : `/${text.link || ""}`}`;

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  // Push services are per-endpoint; send in small batches to stay well inside
  // the worker's concurrent-subrequest budget.
  const batchSize = 25;
  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (t) => {
        const { title, body } = pickLang(text, t.lang);
        try {
          const payload = await buildPushPayload(
            {
              data: {
                title,
                body,
                link,
                lang: t.lang,
                dir: t.lang === "en" ? "ltr" : "rtl",
                tag: "offerdent",
              },
              options: { ttl: 60 * 60 * 24, urgency: "normal" },
            },
            {
              endpoint: t.endpoint,
              expirationTime: null,
              keys: { auth: t.auth, p256dh: t.p256dh },
            },
            vapid,
          );
          const res = await fetch(t.endpoint, payload as unknown as RequestInit);
          if (res.ok) sent += 1;
          else {
            failed += 1;
            if (res.status === 404 || res.status === 410) gone.push(t.endpoint);
          }
        } catch {
          failed += 1;
        }
      }),
    );
  }

  return { sent, failed, gone };
}
