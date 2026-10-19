import { expect, test, type Page } from "@playwright/test";
import { GUEST_ID_COOKIE, requestMagicLinkForEmail } from "../lib/auth";
import { isAuthDebug } from "../lib/env";
import { addFriendForGuest } from "../lib/friend-add";
import { prisma } from "../lib/prisma";
import { FOOTBALL_POSITIONS } from "../lib/positions";
import {
  COPY_EVENT_IP_LIMIT,
  COPY_EVENT_IP_WINDOW_MS,
  COPY_EVENT_MATCH_LIMIT,
  GUEST_ADD_LIMIT,
  GUEST_ADD_LIMIT_MESSAGE,
  MAGIC_LINK_EMAIL_LIMIT,
  MAGIC_LINK_IP_LIMIT,
  MAGIC_LINK_LIMIT_MESSAGE,
  SELF_RSVP_IP_LIMIT,
  clientIp,
  deleteExpiredRateLimitBuckets,
  rateLimitBucketExpiredBefore,
  resolveClientIp,
  takeRateLimitSlot,
} from "../lib/rate-limit";
import { saveGuestRsvp } from "../lib/self-rsvp";

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
  const note = page.getByRole("status").filter({ hasText: message });
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS("color", LIMIT_NOTE_COLOR);
}

test.describe("magic-link rate limit", () => {
  test("requests 1 to 5 succeed and the 6th is refused", async ({ page }) => {
    expect(MAGIC_LINK_EMAIL_LIMIT).toBe(5);
    const email = `burst-${Date.now()}@example.com`;
    await prisma.organiser.create({ data: { email } });
    await withEnv(localDebug, async () => {
      const results = [];
      for (let i = 0; i < 14; i += 1) {
        results.push(
          await requestMagicLinkForEmail(email, "http://localhost:3000", null),
        );
      }
      const accepted = results.filter((result) => result.ok);
      const refused = results.filter((result) => !result.ok);
      expect(accepted).toHaveLength(5);
      expect(refused).toHaveLength(9);
      for (const result of refused) {
        expect("error" in result ? result.error : "").toBe(
          MAGIC_LINK_LIMIT_MESSAGE,
        );
      }
      for (let i = 0; i < 5; i += 1) {
        expect(results[i]?.ok, `request ${i + 1}`).toBe(true);
      }
      expect(results[5]?.ok).toBe(false);
      expect(results[5] && "error" in results[5] ? results[5].error : "").toBe(
        MAGIC_LINK_LIMIT_MESSAGE,
      );
      expect(
        results[5] && "rateLimited" in results[5]
          ? results[5].rateLimited
          : false,
      ).toBe(true);
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

  test("14 parallel sign-ins for a new email accept 5 and refuse the rest", async () => {
    const email = `race-${Date.now()}@example.com`;
    await withEnv(localDebug, async () => {
      const settled = await Promise.allSettled(
        Array.from({ length: 14 }, () =>
          requestMagicLinkForEmail(email, "http://localhost:3000", null),
        ),
      );
      expect(
        settled.filter((item) => item.status === "rejected"),
        "server errors",
      ).toHaveLength(0);
      const results = settled.flatMap((item) =>
        item.status === "fulfilled" ? [item.value] : [],
      );
      const accepted = results.filter((result) => result.ok);
      const refused = results.filter((result) => !result.ok);
      expect(accepted).toHaveLength(5);
      expect(refused).toHaveLength(9);
      for (const result of refused) {
        expect("error" in result ? result.error : "").toBe(
          MAGIC_LINK_LIMIT_MESSAGE,
        );
      }
      const organiser = await prisma.organiser.findUnique({
        where: { email },
        include: { _count: { select: { magicLinks: true } } },
      });
      expect(organiser?._count.magicLinks).toBe(5);
    });
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

    await withEnv({ VERCEL: "1", VERCEL_ENV: "production" }, () => {
      expect(
        resolveClientIp(
          new Headers({
            "x-real-ip": "198.51.100.10",
            "x-forwarded-for": "203.0.113.10, 198.51.100.8",
            "x-vercel-forwarded-for": "203.0.113.99",
            "x-client-ip": "1.2.3.4",
            "cf-connecting-ip": "8.8.8.8",
          }),
        ),
      ).toBe("198.51.100.10");

      const warnings: unknown[][] = [];
      const original = console.warn;
      console.warn = (...args: unknown[]) => {
        warnings.push(args);
      };
      try {
        expect(
          resolveClientIp(
            new Headers({
              "x-forwarded-for": "203.0.113.10",
              "x-vercel-forwarded-for": "198.51.100.20",
              "x-client-ip": "1.2.3.4",
            }),
          ),
        ).toBeNull();
      } finally {
        console.warn = original;
      }
      expect(warnings).toHaveLength(1);
    });

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
    expect(refused.state.rateLimited).toBe(true);
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

test.describe("migration gate", () => {
  test("runs for production and for local or CI, and skips every other case", async () => {
    const { migrationDecision } = await import("../scripts/migrate-gate.mjs");
    const { spawnSync } = await import("node:child_process");

    expect(migrationDecision({ VERCEL_ENV: "production", VERCEL: "1" }).run).toBe(
      true,
    );
    expect(migrationDecision({ VERCEL_ENV: "production" }).run).toBe(true);
    expect(migrationDecision({}).run).toBe(true);
    expect(migrationDecision({ VERCEL: "", VERCEL_ENV: "  " }).run).toBe(true);

    const missing = migrationDecision({ VERCEL: "1" });
    expect(missing.run).toBe(false);
    expect(missing.log).toContain("VERCEL is set and VERCEL_ENV is missing");
    expect(missing.log).toContain("skipped");

    const preview = migrationDecision({ VERCEL: "1", VERCEL_ENV: "preview" });
    expect(preview.run).toBe(false);
    expect(preview.log).toContain("VERCEL_ENV=preview");
    expect(migrationDecision({ VERCEL_ENV: "preview" }).run).toBe(false);
    expect(
      migrationDecision({ VERCEL: "1", VERCEL_ENV: "development" }).run,
    ).toBe(false);

    const skipped = spawnSync(
      process.execPath,
      ["scripts/migrate-if-production.mjs"],
      {
        encoding: "utf8",
        env: { ...process.env, VERCEL: "1", VERCEL_ENV: "" },
      },
    );
    expect(skipped.status).toBe(0);
    expect(skipped.stdout).toContain("skipped");
    expect(skipped.stdout).toContain("VERCEL is set and VERCEL_ENV is missing");
    expect(skipped.stdout).not.toContain("applying migrations");
  });
});

test.describe("copy analytics endpoint", () => {
  test("rejects a bad body, unknown matches, and a flooded match or IP", async ({
    request,
  }) => {
    const bad = await request.post("/api/analytics/copy", {
      data: { event: "player_rsvp", publicId: "nope" },
    });
    expect(bad.status()).toBe(400);

    const missing = await request.post("/api/analytics/copy", {
      data: { event: "invite_copied", publicId: "missingmatch" },
    });
    expect(missing.status()).toBe(404);

    const stamp = `${Date.now()}`;
    const organiser = await prisma.organiser.create({
      data: { email: `copy-cap-${stamp}@example.com` },
    });
    const matchday = await prisma.matchday.create({
      data: {
        publicId: `copy${stamp}`,
        organiserId: organiser.id,
        title: "Copy cap",
        positions: FOOTBALL_POSITIONS.map((position) => ({ ...position })),
        sport: "football",
      },
    });

    const ok = await request.post("/api/analytics/copy", {
      data: { event: "roster_copied", publicId: matchday.publicId },
    });
    expect(ok.status()).toBe(204);

    for (let i = 1; i < COPY_EVENT_MATCH_LIMIT; i += 1) {
      const next = await request.post("/api/analytics/copy", {
        data: { event: "roster_copied", publicId: matchday.publicId },
      });
      expect(next.status(), `copy ${i + 1}`).toBe(204);
    }
    const refused = await request.post("/api/analytics/copy", {
      data: { event: "roster_copied", publicId: matchday.publicId },
    });
    expect(refused.status()).toBe(429);

    const other = await request.post("/api/analytics/copy", {
      data: { event: "invite_copied", publicId: matchday.publicId },
    });
    expect(other.status()).toBe(204);

    const real = `198.51.100.${stamp.slice(-2)}`;
    for (let i = 0; i < COPY_EVENT_IP_LIMIT; i += 1) {
      await takeRateLimitSlot(
        `copy-ip:${real}`,
        COPY_EVENT_IP_LIMIT,
        COPY_EVENT_IP_WINDOW_MS,
      );
    }
    const ipRefused = await request.post("/api/analytics/copy", {
      headers: {
        "x-vercel-forwarded-for": `${real}, 203.0.113.9`,
        "x-real-ip": real,
        "x-forwarded-for": "203.0.113.50, 10.0.0.1",
        "x-client-ip": "192.0.2.8",
        "cf-connecting-ip": "8.8.8.8",
      },
      data: { event: "invite_copied", publicId: "doesnotexist01" },
    });
    expect(ipRefused.status()).toBe(429);

    const ignoredSpoof = await request.post("/api/analytics/copy", {
      headers: {
        "x-forwarded-for": "203.0.113.77",
        "x-client-ip": real,
        "cf-connecting-ip": real,
      },
      data: { event: "invite_copied", publicId: "doesnotexist01" },
    });
    expect(ignoredSpoof.status()).toBe(404);
  });
});

test.describe("self-rsvp rate limit", () => {
  test("the 60th self-RSVP from one IP is accepted and the 61st is refused", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    expect(SELF_RSVP_IP_LIMIT).toBe(60);
    const stamp = `${Date.now()}`;
    const ip = `198.51.100.${stamp.slice(-2)}`;
    const organiser = await prisma.organiser.create({
      data: { email: `self-cap-${stamp}@example.com` },
    });
    const matchday = await prisma.matchday.create({
      data: {
        publicId: `self${stamp}`,
        organiserId: organiser.id,
        title: "Self cap",
        positions: FOOTBALL_POSITIONS.map((position) => ({ ...position })),
        sport: "football",
      },
    });

    for (let i = 0; i < SELF_RSVP_IP_LIMIT; i += 1) {
      const result = await saveGuestRsvp({
        publicId: matchday.publicId,
        name: `Mate ${i}`,
        status: "GOING",
        positionKeyRaw: "ANY",
        guestId: `self-${stamp}-${i}`,
        ip,
      });
      expect(result.ok, `rsvp ${i + 1}`).toBe(true);
      expect(result.rateLimited).toBeUndefined();
    }
    expect(
      await prisma.rsvp.count({ where: { matchdayId: matchday.id } }),
    ).toBe(60);

    const refused = await saveGuestRsvp({
      publicId: matchday.publicId,
      name: "One More",
      status: "GOING",
      positionKeyRaw: "ANY",
      guestId: `self-${stamp}-late`,
      ip,
    });
    expect(refused.ok).toBe(false);
    expect(refused.error).toBe(GUEST_ADD_LIMIT_MESSAGE);
    expect(refused.rateLimited).toBe(true);
    expect(refused.revalidate).toBeUndefined();
    expect(
      await prisma.rsvp.count({ where: { matchdayId: matchday.id } }),
    ).toBe(60);

    await page.context().addCookies([
      {
        name: GUEST_ID_COOKIE,
        value: `self-ui-${stamp}`,
        url: "http://localhost:3000",
      },
    ]);
    await page.setExtraHTTPHeaders({ "x-vercel-forwarded-for": ip });
    await page.goto(`/m/${matchday.publicId}`);
    await page.getByLabel("Your name").fill("Still waiting");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-ANY").click();
    await page.getByTestId("rsvp-submit").click();
    await expectLimitNote(page, GUEST_ADD_LIMIT_MESSAGE);
    expect(
      await prisma.rsvp.count({ where: { matchdayId: matchday.id } }),
    ).toBe(60);
  });
});

test.describe("rate-limit cleanup", () => {
  test("the daily cron deletes buckets whose window ended more than a day ago", async ({
    request,
  }) => {
    const now = new Date();
    const cutoff = rateLimitBucketExpiredBefore(now);
    const staleKey = `stale-${now.getTime()}`;
    const edgeKey = `edge-${now.getTime()}`;
    const freshKey = `fresh-${now.getTime()}`;
    await prisma.rateLimitBucket.create({
      data: {
        key: staleKey,
        windowStart: new Date(cutoff.getTime() - 1000),
        count: 4,
      },
    });
    await prisma.rateLimitBucket.create({
      data: {
        key: edgeKey,
        windowStart: new Date(cutoff.getTime() + 1000),
        count: 1,
      },
    });
    await prisma.rateLimitBucket.create({
      data: {
        key: freshKey,
        windowStart: now,
        count: 1,
      },
    });

    const removed = await deleteExpiredRateLimitBuckets(now);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.rateLimitBucket.findFirst({ where: { key: staleKey } }),
    ).toBeNull();
    expect(
      await prisma.rateLimitBucket.findFirst({ where: { key: edgeKey } }),
    ).not.toBeNull();
    expect(
      await prisma.rateLimitBucket.findFirst({ where: { key: freshKey } }),
    ).not.toBeNull();

    const cron = await request.get("/api/cron/og-refresh");
    expect(cron.ok()).toBeTruthy();
    const body = (await cron.json()) as {
      ok: boolean;
      rateLimitBucketsDeleted: number;
    };
    expect(body.ok).toBe(true);
    expect(body.rateLimitBucketsDeleted).toBeGreaterThanOrEqual(0);
    expect(
      await prisma.rateLimitBucket.findFirst({ where: { key: freshKey } }),
    ).not.toBeNull();
  });
});
