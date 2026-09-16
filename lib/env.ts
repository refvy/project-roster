export function getAppUrl() {
  const raw = process.env.APP_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }
  return secret;
}

export function isAuthDebug() {
  const value = process.env.AUTH_DEBUG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
