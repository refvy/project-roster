import { ipAddress } from "@vercel/functions";
import { randomToken } from "./crypto";
import { isLocalDev } from "./env";
import { prisma } from "./prisma";

export {
  GUEST_ADD_LIMIT_MESSAGE,
  MAGIC_LINK_LIMIT_MESSAGE,
} from "./rate-limit-copy";

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

/** Self-RSVP writes per client IP per match. A flood, not a normal evening. */
export const SELF_RSVP_IP_LIMIT = 60;
export const SELF_RSVP_IP_WINDOW_MS = 60 * 60 * 1000;

/** Keep a bucket until its window has ended and another day has passed. */
export const RATE_LIMIT_BUCKET_GRACE_MS = 24 * 60 * 60 * 1000;

/** Copy pings per match per event. The clipboard still succeeds when this trips. */
export const COPY_EVENT_MATCH_LIMIT = 30;
export const COPY_EVENT_MATCH_WINDOW_MS = 15 * 60 * 1000;

/** Copy pings per client IP, across matches. Uses resolveClientIp. Skipped for loopback in local dev. */
export const COPY_EVENT_IP_LIMIT = 60;
export const COPY_EVENT_IP_WINDOW_MS = 15 * 60 * 1000;

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
 * Header chain for local and CI, where Vercel has not set the client IP.
 * Left-most address only. `x-client-ip` and `cf-connecting-ip` are never read.
 *
 * https://vercel.com/docs/headers/request-headers
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

function onVercel(): boolean {
  return Boolean(process.env.VERCEL?.trim());
}

/**
 * On Vercel, `ipAddress()` from `@vercel/functions` (the platform `x-real-ip`).
 * Off Vercel (local or CI), the header chain above. A missing address skips
 * the per-IP cap and warns once for this request. No shared bucket.
 */
export function resolveClientIp(headerStore: {
  get(name: string): string | null;
}): string | null {
  const resolved = onVercel()
    ? leftMostAddress(ipAddress(headerStore as Headers))
    : clientIp(headerStore);
  if (!resolved) {
    console.warn(
      "[rate-limit] no client IP on this request; skipping the per-IP cap",
    );
  }
  return resolved;
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

/** Gives back a slot when the attempt crashes after the increment. */
export async function releaseRateLimitSlot(key: string, windowMs: number) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  await prisma.$executeRaw`
    UPDATE "RateLimitBucket"
    SET "count" = GREATEST("count" - 1, 0)
    WHERE "key" = ${key} AND "windowStart" = ${windowStart}
  `;
}

function longestRateLimitWindowMs() {
  return Math.max(
    MAGIC_LINK_EMAIL_WINDOW_MS,
    MAGIC_LINK_IP_WINDOW_MS,
    GUEST_ADD_WINDOW_MS,
    GUEST_ADD_IP_WINDOW_MS,
    SELF_RSVP_IP_WINDOW_MS,
    COPY_EVENT_MATCH_WINDOW_MS,
    COPY_EVENT_IP_WINDOW_MS,
  );
}

/** Window start strictly older than this has been finished for more than a day. */
export function rateLimitBucketExpiredBefore(now = new Date()) {
  return new Date(
    now.getTime() - RATE_LIMIT_BUCKET_GRACE_MS - longestRateLimitWindowMs(),
  );
}

export async function deleteExpiredRateLimitBuckets(now = new Date()) {
  const result = await prisma.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: rateLimitBucketExpiredBefore(now) } },
  });
  return result.count;
}
