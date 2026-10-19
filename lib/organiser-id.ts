import { createHmac } from "crypto";

/**
 * Anonymous organiser id for PostHog. HMAC-SHA256 of the organiser user id.
 * Server-only secret. Missing secret or id → null, and callers omit the field.
 * Never pass an email or a name.
 */
export function organiserAnalyticsId(
  userId: string | null | undefined,
): string | null {
  const secret = process.env.ORGANISER_ID_SECRET?.trim() ?? "";
  const id = userId?.trim() ?? "";
  if (!secret || !id) return null;
  return createHmac("sha256", secret).update(id).digest("hex");
}
