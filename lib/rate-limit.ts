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
  "We've sent a few links already. Check your inbox (and spam), or try again in 15 minutes.";

export const GUEST_ADD_LIMIT_MESSAGE =
  "That's the limit for adding people right now. Try again in an hour.";

export const RATE_LIMIT_ERROR_MESSAGE =
  "Something went wrong. Try again in a moment.";

/**
 * Left-most address only. A later comma-separated hop is not the client,
 * even if the first entry is empty.
 */
function leftMostAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim() ?? "";
  if (!first) return null;
  return first.slice(0, 80).toLowerCase();
}

/**
 * Public client IP as Vercel presents it.
 *
 * https://vercel.com/docs/headers/request-headers
 * Vercel overwrites an incoming `x-forwarded-for` so a client cannot prepend
 * a fake address, and sets `x-real-ip` to that same public IP.
 * `x-vercel-forwarded-for` is the same value and stays Vercel's if a proxy
 * in front replaces `x-forwarded-for`. Only the left-most address is used.
 * `x-client-ip` and `cf-connecting-ip` are never read.
 */
export function clientIp(headerStore: {
  get(name: string): string | null;
}): string | null {
  return (
    leftMostAddress(headerStore.get("x-vercel-forwarded-for")) ||
    leftMostAddress(headerStore.get("x-real-ip")) ||
    leftMostAddress(headerStore.get("x-forwarded-for"))
  );
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
