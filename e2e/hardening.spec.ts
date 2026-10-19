import { expect, test } from "@playwright/test";
import { requestMagicLinkForEmail } from "../lib/auth";
import { isAuthDebug } from "../lib/env";
import { addFriendForGuest } from "../lib/friend-add";
import { prisma } from "../lib/prisma";
import { FOOTBALL_POSITIONS } from "../lib/positions";
import {
  GUEST_ADD_LIMIT,
  GUEST_ADD_LIMIT_MESSAGE,
  MAGIC_LINK_EMAIL_LIMIT,
  MAGIC_LINK_IP_LIMIT,
  MAGIC_LINK_LIMIT_MESSAGE,
} from "../lib/rate-limit";

async function withEnv<T>(
  updates: Record<string, string | undefined>,
  run: () => Promise<T> | T,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(updates)) {
    previous.set(key, process.env[key]);
    const value = updates[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const localDebug = {
  AUTH_DEBUG: "true",
  NODE_ENV: "development",
  VERCEL: undefined,
  VERCEL_ENV: undefined,
  RESEND_API_KEY: "",
} as const;

test.describe("magic-link rate limit", () => {
  test("the 14th rapid request for one email is refused", async () => {
    const email = `burst-${Date.now()}@example.com`;
    await withEnv(localDebug, async () => {
      const results = [];
      for (let i = 0; i < 14; i += 1) {
        results.push(
          await requestMagicLinkForEmail(email, "http://localhost:3000", null),
        );
      }
      expect(results[MAGIC_LINK_EMAIL_LIMIT - 1]?.ok).toBe(true);
      expect(results[MAGIC_LINK_EMAIL_LIMIT]?.ok).toBe(false);
      const fourteenth = results[13];
      expect(fourteenth?.ok).toBe(false);
      expect(fourteenth && "error" in fourteenth ? fourteenth.error : "").toBe(
        MAGIC_LINK_LIMIT_MESSAGE,
      );
      expect(
        fourteenth && "debugUrl" in fourteenth ? fourteenth.debugUrl : undefined,
      ).toBeUndefined();

      const organiser = await prisma.organiser.findUnique({
        where: { email },
        include: { _count: { select: { magicLinks: true } } },
      });
      expect(organiser?._count.magicLinks).toBe(MAGIC_LINK_EMAIL_LIMIT);
    });
  });

  test("per-IP limit refuses a new email from the same address", async () => {
    const ip = `203.0.113.${Date.now()}`;
    const stamp = Date.now();
    await withEnv(localDebug, async () => {
      for (let i = 0; i < MAGIC_LINK_IP_LIMIT; i += 1) {
        const result = await requestMagicLinkForEmail(
          `ip-${stamp}-${i}@example.com`,
          "http://localhost:3000",
          ip,
        );
        expect(result.ok, `request ${i + 1}`).toBe(true);
      }
      const refused = await requestMagicLinkForEmail(
        `ip-${stamp}-over@example.com`,
        "http://localhost:3000",
        ip,
      );
      expect(refused.ok).toBe(false);
      expect("error" in refused ? refused.error : "").toBe(
        MAGIC_LINK_LIMIT_MESSAGE,
      );
      expect(
        await prisma.organiser.findUnique({
          where: { email: `ip-${stamp}-over@example.com` },
        }),
      ).toBeNull();
    });
  });
});

test.describe("guest add rate limit", () => {
  test("friend adds stop at the limit", async () => {
    const stamp = `${Date.now()}`;
    const organiser = await prisma.organiser.create({
      data: { email: `guest-cap-${stamp}@example.com` },
    });
    const matchday = await prisma.matchday.create({
      data: {
        publicId: `cap${stamp}`,
        organiserId: organiser.id,
        title: "Cap",
        positions: FOOTBALL_POSITIONS.map((position) => ({ ...position })),
        sport: "football",
      },
    });
    const guestId = `guest-cap-${stamp}`;
    await prisma.rsvp.create({
      data: {
        matchdayId: matchday.id,
        guestId,
        name: "Nok",
        status: "GOING",
        positionKey: "ANY",
      },
    });

    for (let i = 0; i < GUEST_ADD_LIMIT; i += 1) {
      const result = await addFriendForGuest({
        publicId: matchday.publicId,
        name: `Pal ${i}`,
        status: "GOING",
        positionKeyRaw: "ANY",
        ip: null,
        getGuestId: async () => guestId,
      });
      expect(result.state.ok, `add ${i + 1}`).toBe(true);
    }

    const refused = await addFriendForGuest({
      publicId: matchday.publicId,
      name: "One More",
      status: "GOING",
      positionKeyRaw: "ANY",
      ip: null,
      getGuestId: async () => guestId,
    });
    expect(refused.state.ok).toBe(false);
    expect(refused.state.error).toBe(GUEST_ADD_LIMIT_MESSAGE);
    expect(refused.revalidate).toBeUndefined();
    expect(
      await prisma.rsvp.count({
        where: { matchdayId: matchday.id, addedByGuestId: guestId },
      }),
    ).toBe(GUEST_ADD_LIMIT);
  });
});

test.describe("AUTH_DEBUG", () => {
  test("is refused when not local development", async () => {
    await withEnv(
      {
        AUTH_DEBUG: "true",
        NODE_ENV: "production",
        VERCEL: undefined,
        VERCEL_ENV: undefined,
      },
      () => {
        expect(isAuthDebug()).toBe(false);
      },
    );

    await withEnv(
      {
        AUTH_DEBUG: "true",
        NODE_ENV: "development",
        VERCEL: "1",
        VERCEL_ENV: undefined,
        RESEND_API_KEY: "",
      },
      () => {
        expect(isAuthDebug()).toBe(false);
      },
    );

    const email = `auth-debug-${Date.now()}@example.com`;
    await withEnv(
      {
        AUTH_DEBUG: "true",
        NODE_ENV: "development",
        VERCEL: undefined,
        VERCEL_ENV: "preview",
        RESEND_API_KEY: "",
      },
      async () => {
        expect(isAuthDebug()).toBe(false);
        const result = await requestMagicLinkForEmail(
          email,
          "http://localhost:3000",
          "203.0.113.9",
        );
        expect(result.ok).toBe(false);
        expect(
          "debugUrl" in result ? result.debugUrl : undefined,
        ).toBeUndefined();
        expect(result.error ?? "").not.toMatch(/203\.0\.113|token=/);
      },
    );

    await withEnv(localDebug, () => {
      expect(isAuthDebug()).toBe(true);
    });
  });
});
