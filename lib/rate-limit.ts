import { randomToken } from "./crypto";
import { isLocalDev } from "./env";
import { prisma } from "./prisma";

/** Magic-link emails per address. Enough for a typo and a couple of retries. */
export const MAGIC_LINK_EMAIL_LIMIT = 5;
export const MAGIC_LINK_EMAIL_WINDOW_MS = 15 * 60 * 1000;

/**
 * Magic-link emails per client IP. Stops one address spraying many inboxes.
 * Skipped when the platform does not provide an IP (local dev, this suite).
 */
export const MAGIC_LINK_IP_LIMIT = 20;
export const MAGIC_LINK_IP_WINDOW_MS = 15 * 60 * 1000;

/** "Add someone else" rows per guest per match. A squad, not an open list. */
export const GUEST_ADD_LIMIT = 20;
export const GUEST_ADD_WINDOW_MS = 60 * 60 * 1000;

/** Same cap per IP per match, so clearing the guest cookie does not reset it. */
export const GUEST_ADD_IP_LIMIT = 40;
export const GUEST_ADD_IP_WINDOW_MS = 60 * 60 * 1000;

export const MAGIC_LINK_LIMIT_MESSAGE =
  "Too many sign-in emails just now. Wait a little, then try again.";

export const GUEST_ADD_LIMIT_MESSAGE =
  "You've added a lot of people. Wait a little, then add the next one.";

export const RATE_LIMIT_ERROR_MESSAGE =
  "Something went wrong. Try again in a moment.";

export function clientIp(headerStore: {
  get(name: string): string | null;
}): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "";
  if (!candidate) return null;
  return candidate.slice(0, 80).toLowerCase();
}

/** Local Playwright and `next dev` share ::1. Production still counts every address. */
export function ipForRateLimit(ip: string | null | undefined): string | null {
  const value = ip?.trim().toLowerCase() ?? "";
  if (!value) return null;
  const host = value.replace(/^::ffff:/, "");
  if (
    isLocalDev() &&
    (host === "::1" || host === "127.0.0.1" || host === "localhost")
  ) {
    return null;
  }
  return value.slice(0, 80);
}

/**
 * Atomically increments a fixed window. Allowed when the new count is within
 * the limit. A refused attempt still consumes a slot so retries cannot race past it.
 */
export async function takeRateLimitSlot(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const id = randomToken(16);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("id", "key", "windowStart", "count", "createdAt")
    VALUES (${id}, ${key}, ${windowStart}, 1, NOW())
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? limit + 1);
  return { allowed: Number.isFinite(count) && count <= limit };
}
