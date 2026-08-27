/**
 * QiCard Payment Gateway helpers (server-only).
 * Docs: https://developers-gate.qi.iq/docs/api-endpoints/create-payment
 */

export type QiPayment = {
  requestId: string;
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  formUrl?: string;
  canceled?: boolean;
  creationDate?: string;
};

function config() {
  const host = (process.env["QI_API_HOST"] ?? "https://uat-sandbox-3ds-api.qi.iq")
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "");
  const terminalId = process.env["QI_TERMINAL_ID"];
  const username = process.env["QI_USERNAME"];
  const password = process.env["QI_PASSWORD"];
  if (!terminalId || !username || !password) {
    throw new Error("QiCard credentials are not configured");
  }
  return { host, terminalId, basic: btoa(`${username}:${password}`) };
}


async function qiFetch(path: string, init?: { method?: string; body?: unknown }) {
  const { host, terminalId, basic } = config();
  const response = await fetch(`${host}/api/v1${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "X-Terminal-Id": terminalId,
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`QiCard request failed [${response.status}] ${path}: ${text}`);
    throw new Error(`QiCard request failed [${response.status}]: ${text}`);
  }
  return JSON.parse(text) as QiPayment;
}

export function createQiRequestId() {
  return crypto.randomUUID();
}

export async function createQiPayment(input: {
  requestId: string;
  amount: number;
  locale: "ar" | "ku";
  finishPaymentUrl: string;
  notificationUrl: string;
  additionalInfo?: Record<string, string>;
}) {
  return qiFetch("/payment", {
    method: "POST",
    body: {
      requestId: input.requestId,
      amount: Number(input.amount.toFixed(2)),
      currency: "IQD",
      locale: input.locale === "ku" ? "ar_IQ" : "ar_IQ",
      finishPaymentUrl: input.finishPaymentUrl,
      notificationUrl: input.notificationUrl,
      ...(input.additionalInfo ? { additionalInfo: input.additionalInfo } : {}),
    },
  });
}

export async function getQiPaymentStatus(paymentId: string) {
  return qiFetch(`/payment/${paymentId}/status`);
}

/**
 * Verifies the webhook `X-Signature` header.
 * Per the QiCard spec the signed string is the strict sequence
 * `paymentId|amount|currency|creationDate|status` ("-" for null values,
 * amounts formatted as 0.00), verified with RSA/SHA-256 against the
 * gateway's public key.
 */
export async function verifyQiSignature(
  event: {
    paymentId?: string | null | undefined;
    amount?: number | null | undefined;
    currency?: string | null | undefined;
    creationDate?: string | null | undefined;
    status?: string | null | undefined;
  },
  signature: string | null,
) {
  const pem = process.env["QI_WEBHOOK_PUBLIC_KEY"];
  if (!pem) throw new Error("QI_WEBHOOK_PUBLIC_KEY is not configured");
  if (!signature) return false;

  const base64 = pem
    .replace(/-----[A-Z ]+-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "spki",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sig = Uint8Array.from(atob(signature.replace(/\s+/g, "")), (c) => c.charCodeAt(0));

  const dash = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "-" : v);
  const signed = [
    dash(event.paymentId),
    event.amount === null || event.amount === undefined ? "-" : event.amount.toFixed(2),
    dash(event.currency),
    dash(event.creationDate),
    dash(event.status),
  ].join("|");

  const encoder = new TextEncoder();
  if (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, encoder.encode(signed))) {
    return true;
  }
  // Some gateway builds sign the hex sha256 digest of that string instead.
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(signed));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, encoder.encode(hex));
}


export function isQiSuccess(status: string | null | undefined) {
  return status === "SUCCESS" || status === "CONFIRMED" || status === "PAID";
}
