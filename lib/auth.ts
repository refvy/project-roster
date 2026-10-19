import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { hashToken, randomToken, signValue, unsignValue } from "./crypto";
import { getAppUrl, getResendApiKey, isAuthDebug } from "./env";
import { sendMagicLinkEmail } from "./mail";
import { prisma } from "./prisma";
import {
  MAGIC_LINK_EMAIL_LIMIT,
  MAGIC_LINK_EMAIL_WINDOW_MS,
  MAGIC_LINK_IP_LIMIT,
  MAGIC_LINK_IP_WINDOW_MS,
  MAGIC_LINK_LIMIT_MESSAGE,
  RATE_LIMIT_ERROR_MESSAGE,
  ipForRateLimit,
  releaseRateLimitSlot,
  takeRateLimitSlot,
} from "./rate-limit";

export const SESSION_COOKIE = "roster_session";
export const GUEST_ID_COOKIE = "roster_guest_id";
export const GUEST_NAME_COOKIE = "roster_guest_name";

const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 20;

function cookieBase() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function isUniqueConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/**
 * Prisma's upsert is a read then a write. Parallel first sign-ins for one
 * new email can both insert and one raises P2002. Re-read instead of crashing.
 */
async function findOrCreateOrganiser(email: string) {
  try {
    return await prisma.organiser.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  } catch (err) {
    if (!isUniqueConflict(err)) throw err;
    const existing = await prisma.organiser.findUnique({ where: { email } });
    if (!existing) throw err;
    return existing;
  }
}

export async function requestMagicLinkForEmail(
  emailRaw: string,
  origin = getAppUrl(),
  ip?: string | null,
) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 120) {
    return { ok: false as const, error: "Enter a valid email." };
  }

  const held: Array<{ key: string; windowMs: number }> = [];
  const releaseHeld = () =>
    Promise.all(
      held.map((slot) => releaseRateLimitSlot(slot.key, slot.windowMs)),
    );

  try {
    const byEmail = await takeRateLimitSlot(
      `magic-email:${email}`,
      MAGIC_LINK_EMAIL_LIMIT,
      MAGIC_LINK_EMAIL_WINDOW_MS,
    );
    if (!byEmail.allowed) {
      return {
        ok: false as const,
        error: MAGIC_LINK_LIMIT_MESSAGE,
        rateLimited: true as const,
      };
    }
    held.push({
      key: `magic-email:${email}`,
      windowMs: MAGIC_LINK_EMAIL_WINDOW_MS,
    });
    const clientIp = ipForRateLimit(ip);
    if (clientIp) {
      const byIp = await takeRateLimitSlot(
        `magic-ip:${clientIp}`,
        MAGIC_LINK_IP_LIMIT,
        MAGIC_LINK_IP_WINDOW_MS,
      );
      if (!byIp.allowed) {
        return {
          ok: false as const,
          error: MAGIC_LINK_LIMIT_MESSAGE,
          rateLimited: true as const,
        };
      }
      held.push({
        key: `magic-ip:${clientIp}`,
        windowMs: MAGIC_LINK_IP_WINDOW_MS,
      });
    }
  } catch (err) {
    await releaseHeld();
    console.error("[rate-limit] magic link check failed", err);
    return { ok: false as const, error: RATE_LIMIT_ERROR_MESSAGE };
  }

  let organiser;
  try {
    organiser = await findOrCreateOrganiser(email);
  } catch (err) {
    await releaseHeld();
    console.error("[auth] magic link sign-in failed", err);
    throw err;
  }

  const token = randomToken();
  await prisma.magicLink.create({
    data: {
      organiserId: organiser.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000),
    },
  });

  const verifyUrl = `${origin.replace(/\/$/, "")}/auth/verify?token=${token}`;
  const debug = isAuthDebug();
  if (debug) {
    console.info(`[AUTH_DEBUG] magic link for ${email}: ${verifyUrl}`);
  }

  let mailed = false;
  if (getResendApiKey()) {
    try {
      await sendMagicLinkEmail({ to: email, url: verifyUrl });
      mailed = true;
    } catch (err) {
      console.error("[auth] failed to send magic link email", err);
      if (!debug) {
        return {
          ok: false as const,
          error: "Could not send the email. Try again.",
        };
      }
    }
  }

  if (!mailed && !debug) {
    return {
      ok: false as const,
      error: "Email sending is not configured.",
    };
  }

  return {
    ok: true as const,
    mailed,
    debugUrl: debug ? verifyUrl : undefined,
  };
}

export async function consumeMagicLink(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.magicLink.findUnique({
    where: { tokenHash },
    include: { organiser: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.magicLink.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const sessionToken = randomToken();
  await prisma.session.create({
    data: {
      organiserId: record.organiserId,
      tokenHash: hashToken(sessionToken),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { organiser: record.organiser, sessionToken };
}

export function sessionCookieOptions() {
  return {
    ...cookieBase(),
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function signedSessionCookie(sessionToken: string) {
  return signValue(sessionToken);
}

export async function getOrganiser() {
  const jar = await cookies();
  const raw = unsignValue(jar.get(SESSION_COOKIE)?.value);
  if (!raw) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { organiser: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return session.organiser;
}

export async function logoutOrganiser() {
  const jar = await cookies();
  const raw = unsignValue(jar.get(SESSION_COOKIE)?.value);
  if (raw) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getOrCreateGuestId() {
  const jar = await cookies();
  const existing = jar.get(GUEST_ID_COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;
  const guestId = randomToken(16);
  jar.set(GUEST_ID_COOKIE, guestId, {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 365,
  });
  return guestId;
}

export async function rememberGuestName(name: string) {
  const jar = await cookies();
  jar.set(GUEST_NAME_COOKIE, name, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getRememberedGuestName() {
  const jar = await cookies();
  return jar.get(GUEST_NAME_COOKIE)?.value ?? "";
}

export async function getGuestId() {
  const jar = await cookies();
  return jar.get(GUEST_ID_COOKIE)?.value ?? null;
}
