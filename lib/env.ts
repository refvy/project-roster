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

/** Local `next dev` only. Preview and production never qualify, even if NODE_ENV is wrong. */
export function isLocalDev() {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.VERCEL || process.env.VERCEL_ENV) return false;
  return true;
}

export function isAuthDebug() {
  // A preview with AUTH_DEBUG set must not print a magic link for any email.
  // Vercel sets VERCEL / VERCEL_ENV on production, preview, and `vercel dev`.
  if (!isLocalDev()) return false;
  const value = process.env.AUTH_DEBUG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || "Skwad <onboarding@resend.dev>";
}
