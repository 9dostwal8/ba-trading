/**
 * Centralized Authentication & System Email Helpers
 *
 * ARCHITECTURAL CONTEXT:
 * When users register via phone number without a traditional email address,
 * Supabase Auth requires an email format unless native SMS providers (Twilio, MessageBird, etc.)
 * are configured in the Supabase Dashboard. Because this application dispatches OTPs via WhatsApp
 * (Green-API), phone numbers are converted to deterministic system emails (e.g. 7701234567@batrading.com).
 *
 * HOW TO ELIMINATE THIS SYNTHETIC EMAIL HACK ENTIRELY:
 * 1. Go to Supabase Dashboard -> Authentication -> Providers.
 * 2. Enable "Phone" provider and configure an SMS provider or a Custom SMS Webhook.
 * 3. Under Authentication -> Email Auth: Uncheck "Confirm email" and configure phone-based identity.
 * 4. Switch frontend authentication calls to:
 *    - supabase.auth.signInWithPassword({ phone: '+964' + cleanPhone, password })
 *    - supabase.auth.signUp({ phone: '+964' + cleanPhone, password })
 * 5. Run a backend migration to copy phone numbers directly into auth.users.phone.
 */

export const CANONICAL_PHONE_DOMAIN = "batrading.com";
export const LEGACY_PHONE_DOMAINS = ["batrading.com", "dentalstore.app"];

/**
 * Normalizes Iraqi mobile numbers by stripping country codes (00964, +964, 964)
 * and leading trunk zeros. Returns standard 10-digit format (e.g. "7701234567").
 */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

/**
 * Generates the canonical system email for phone authentication when the user
 * has not supplied a real email address.
 */
export function generateSystemEmail(phone: string): string {
  const clean = normalizePhone(phone);
  return `${clean}@${CANONICAL_PHONE_DOMAIN}`;
}

/**
 * Checks whether an email address is a synthetic system-generated placeholder.
 */
export function isSystemEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return LEGACY_PHONE_DOMAINS.some((domain) => lower.endsWith(`@${domain}`));
}

/**
 * Resolves the primary email to use for authentication:
 * Returns the trimmed real email if provided, otherwise generates a canonical system email from phone.
 */
export function resolveAuthEmail(phone: string, optionalEmail?: string | null): string {
  const trimmed = (optionalEmail ?? "").trim();
  if (trimmed && trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return generateSystemEmail(phone);
}

/**
 * Produces candidate login identifiers for a phone number across both the
 * canonical domain and legacy domains to prevent user lockouts.
 */
export function getLoginEmailCandidates(phoneOrEmail: string): string[] {
  const raw = (phoneOrEmail ?? "").trim();
  if (!raw) return [];
  if (raw.includes("@")) return [raw.toLowerCase()];

  const clean = normalizePhone(raw);
  if (!clean) return [];

  const candidates: string[] = [
    `${clean}@${CANONICAL_PHONE_DOMAIN}`,
    `0${clean}@${CANONICAL_PHONE_DOMAIN}`,
    `${clean}@dentalstore.app`,
    `0${clean}@dentalstore.app`,
  ];
  return Array.from(new Set(candidates));
}
