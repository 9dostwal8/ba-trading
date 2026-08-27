/** Lovable AI Gateway helpers for the vendor "sell in 60 seconds" onboarding. */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type Msg = {
  role: "system" | "user";
  content: string | Array<Record<string, unknown>>;
};

/** Calls the gateway and returns the parsed JSON payload of the reply. */
export async function askJson<T>(messages: Msg[]): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, response_format: { type: "json_object" } }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached, try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("AI returned an unreadable answer");
  }
}

export const FILL_SYSTEM = [
  "You help dental suppliers in Iraq list products fast.",
  "Given a rough product name (usually English), return clean marketing-ready data.",
  "Reply as JSON only with keys:",
  "name_en (clean English name), name_ar (Arabic), name_ku (Central Kurdish / Sorani),",
  "description_ar (1-2 short sentences), description_ku, brand (known dental brand or empty),",
  "sku (short uppercase code), category (choose exactly one from the provided list, or empty).",
  "Never invent prices. Keep names short and searchable.",
].join(" ");

export const SCAN_SYSTEM = [
  "You read photos of dental supplier price lists, invoices or handwritten sheets.",
  "Extract every product row you can read.",
  'Reply as JSON only: {"items":[{"name":"","brand":"","price":0,"stock":0}]}.',
  "price is the unit selling price as a plain number in Iraqi Dinar (no separators).",
  "If a value is unreadable use 0 or an empty string. Skip totals, taxes and headers.",
].join(" ");
