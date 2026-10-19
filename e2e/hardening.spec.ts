import { expect, test, type Page } from "@playwright/test";
import { GUEST_ID_COOKIE, requestMagicLinkForEmail } from "../lib/auth";
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
  clientIp,
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

const LIMIT_NOTE_COLOR = "rgb(94, 88, 79)";
const FORM_ERROR_COLOR = "rgb(180, 35, 24)";

async function expectLimitNote(page: Page, message: string) {
  const note = page.getByRole("alert").filter({ hasText: message });
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS("color", LIMIT_NOTE_COLOR);
}

test.describe("magic-link rate limit", () => {
  test("requests 1 to 5 succeed and the 6th is refused", async ({ page }) => {
    expect(MAGIC_LINK_EMAIL_LIMIT).toBe(5);
    const email = `burst-${Date.now()}@example.com`;
    await withEnv(localDebug, async () => {
      const results = [];
      for (let i = 0; i < 14; i += 1) {
        results.push(
          await requestMagicLinkForEmail(email, "http://localhost:3000", null),
        );
      }
      for (let i = 0; i < 5; i += 1) {
        expect(results[i]?.ok, `request ${i + 1}`).toBe(true);
      }
      expect(results[5]?.ok).toBe(false);
      expect(results[5] && "error" in results[5] ? results[5].error : "").toBe(
        MAGIC_LINK_LIMIT_MESSAGE,
      );
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
      expect(organiser?._count.magicLinks).toBe(5);
    });

    await page.goto("/");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a magic link" }).click();
    await expectLimitNote(page, MAGIC_LINK_LIMIT_MESSAGE);

    await page.getByLabel("Email").fill(`${"a".repeat(110)}@example.com`);
    await page.getByRole("button", { name: "Email me a magic link" }).click();
    const invalid = page.getByRole("alert").filter({
      hasText: "Enter a valid email.",
    });
    await expect(invalid).toBeVisible();
    await expect(invalid).toHaveCSS("color", FORM_ERROR_COLOR);
  });

  test("requests 1 to 20 from one IP succeed and the 21st is refused", async ({
    page,
  }) => {
    expect(MAGIC_LINK_IP_LIMIT).toBe(20);
    const ip = `203.0.113.${Date.now()}`;
    const stamp = Date.now();
    await withEnv(localDebug, async () => {
      for (let i = 0; i < 20; i += 1) {
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

    await page.setExtraHTTPHeaders({ "x-vercel-forwarded-for": ip });
    await page.goto("/");
    await page.getByLabel("Email").fill(`ip-${stamp}-browser@example.com`);
    await page.getByRole("button", { name: "Email me a magic link" }).click();
    await expectLimitNote(page, MAGIC_LINK_LIMIT_MESSAGE);
  });

  test("a spoofed client header cannot reset the per-IP limit", async ({
    page,
  }) => {
    expect(
      clientIp(
        new Headers({
          "x-forwarded-for": "203.0.113.10, 198.51.100.8",
          "x-client-ip": "1.2.3.4",
          "cf-connecting-ip": "8.8.8.8",
        }),
      ),
    ).toBe("203.0.113.10");
    expect(
      clientIp(
        new Headers({
          "x-forwarded-for": " , 203.0.113.99",
          "x-client-ip": "1.1.1.1",
        }),
      ),
    ).toBeNull();

    const real = `198.51.100.${Date.now()}`;
    const stamp = Date.now();
    await withEnv(localDebug, async () => {
      for (let i = 0; i < 20; i += 1) {
        const headers = new Headers();
        headers.set("x-vercel-forwarded-for", real);
        headers.set("x-real-ip", real);
        headers.set(
          "x-forwarded-for",
          `203.0.113.${i}, 10.0.0.${i}, ${real}`,
        );
        headers.set("x-client-ip", `192.0.2.${i}`);
        headers.set("cf-connecting-ip", `192.0.2.${i + 20}`);
        const ip = clientIp(headers);
        expect(ip).toBe(real.toLowerCase());
        const result = await requestMagicLinkForEmail(
          `spoof-${stamp}-${i}@example.com`,
          "http://localhost:3000",
          ip,
        );
        expect(result.ok, `request ${i + 1}`).toBe(true);
      }
      const dodging = new Headers();
      dodging.set("x-vercel-forwarded-for", `${real}, 203.0.113.250`);
      dodging.set("x-real-ip", real);
      dodging.set("x-forwarded-for", "198.51.100.250, 10.1.1.1");
      dodging.set("x-client-ip", "192.0.2.250");
      dodging.set("cf-connecting-ip", "192.0.2.251");
      const ip = clientIp(dodging);
      expect(ip).toBe(real.toLowerCase());
      const refused = await requestMagicLinkForEmail(
        `spoof-${stamp}-over@example.com`,
        "http://localhost:3000",
        ip,
      );
      expect(refused.ok).toBe(false);
      expect("error" in refused ? refused.error : "").toBe(
        MAGIC_LINK_LIMIT_MESSAGE,
      );
    });

    await page.setExtraHTTPHeaders({ "x-vercel-forwarded-for": real });
    await page.goto("/");
    await page.getByLabel("Email").fill(`spoof-${stamp}-browser@example.com`);
    await page.getByRole("button", { name: "Email me a magic link" }).click();
    await expectLimitNote(page, MAGIC_LINK_LIMIT_MESSAGE);
  });
});

test.describe("guest add rate limit", () => {
  test("the first 20 friend adds succeed and the 21st is refused", async ({
    page,
  }) => {
    expect(GUEST_ADD_LIMIT).toBe(20);
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

    for (let i = 0; i < 20; i += 1) {
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
    ).toBe(20);

    await page.context().addCookies([
      {
        name: GUEST_ID_COOKIE,
        value: guestId,
        url: "http://localhost:3000",
      },
    ]);
    await page.goto(`/m/${matchday.publicId}`);
    await page.getByTestId("friend-name").fill("Still red");
    await page.getByTestId("friend-submit").click();
    const missingPosition = page.getByRole("alert").filter({
      hasText: "Pick a position.",
    });
    await expect(missingPosition).toBeVisible();
    await expect(missingPosition).toHaveCSS("color", FORM_ERROR_COLOR);

    await page.getByTestId("friend-name").fill("One More");
    await page.getByTestId("friend-submit-going").click();
    await page.getByTestId("friend-submit-position-ANY").click();
    await page.getByTestId("friend-submit").click();
    await expectLimitNote(page, GUEST_ADD_LIMIT_MESSAGE);
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
