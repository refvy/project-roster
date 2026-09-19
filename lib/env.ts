export function getAppUrl() {
  const raw = process.env.APP_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Magic-link and share URLs. Production always uses APP_URL (getskwad.com), never a Vercel alias. */
export function publicAppOrigin(requestOrigin?: string) {
  if (process.env.VERCEL_ENV === "production") {
    return getAppUrl();
  }
  const fallback = requestOrigin?.trim().replace(/\/$/, "");
  return fallback || getAppUrl();
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }
  return secret;
}

export function isAuthDebug() {
  // Production Vercel must never show the on-page magic-link shortcut,
  // even if AUTH_DEBUG is still set in the dashboard.
  if (process.env.VERCEL_ENV === "production") return false;
  const value = process.env.AUTH_DEBUG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || "Skwad <onboarding@resend.dev>";
}
