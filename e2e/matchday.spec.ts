import { expect, test, type Browser, type Page } from "@playwright/test";
import { describeImbalance } from "../lib/imbalance";
import {
  fillPitch,
  getFormation,
  orderGoingForRoster,
} from "../lib/pitch";
import {
  BASKETBALL_POSITIONS,
  FOOTBALL_POSITIONS,
} from "../lib/positions";

test.describe("imbalance rule", () => {
  test("two GKs and a CB: Too many GKs", () => {
    const message = describeImbalance(
      [{ positionKey: "GK" }, { positionKey: "GK" }, { positionKey: "CB" }],
      FOOTBALL_POSITIONS,
      "football",
    );
    expect(message).toBe("Too many GKs");
  });

  test("two GKs without a CB", () => {
    const message = describeImbalance(
      [{ positionKey: "GK" }, { positionKey: "GK" }, { positionKey: "CM" }],
      FOOTBALL_POSITIONS,
      "football",
    );
    expect(message).toBe("Too many GKs · need a CB");
  });

  test("heavy CMs, light wings", () => {
    const message = describeImbalance(
      [
        { positionKey: "CM" },
        { positionKey: "CM" },
        { positionKey: "CM" },
        { positionKey: "CB" },
      ],
      FOOTBALL_POSITIONS,
      "football",
    );
    expect(message).toBe("Heavy on CMs · light on wings");
  });

  test("3 PGs need a big", () => {
    const message = describeImbalance(
      [{ positionKey: "PG" }, { positionKey: "PG" }, { positionKey: "PG" }],
      BASKETBALL_POSITIONS,
      "basketball",
    );
    expect(message).toBe("3 PGs · need a big");
  });

  test("Any is ignored", () => {
    const message = describeImbalance(
      [{ positionKey: "ANY" }, { positionKey: "ANY" }, { positionKey: "CM" }],
      FOOTBALL_POSITIONS,
      "football",
    );
    expect(message).toBeNull();
  });
});

test.describe("pitch fill", () => {
  test("first-fit CB fills a 4-1-4-1 CB slot; extra is bench", () => {
    const formation = getFormation("4-1-4-1");
    const { lines, bench } = fillPitch(formation.lines, [
      { id: "1", name: "Nok", positionKey: "CB" },
      { id: "2", name: "Bee", positionKey: "CB" },
      { id: "3", name: "Aek", positionKey: "CB" },
    ]);
    const cbs = lines.flatMap((line) =>
      line.slots.filter((slot) => slot.key === "CB"),
    );
    expect(cbs[0]?.player?.name).toBe("Nok");
    expect(cbs[1]?.player?.name).toBe("Bee");
    expect(bench.map((p) => p.name)).toEqual(["Aek"]);
  });

  test("roster order is formation back→front then Any/bench", () => {
    const ordered = orderGoingForRoster(
      [
        { id: "1", name: "Nok", positionKey: "CB" },
        { id: "2", name: "Bee", positionKey: "ANY" },
        { id: "3", name: "Aek", positionKey: "GK" },
      ],
      "football",
      "4-1-4-1",
    );
    expect(ordered.map((p) => p.name)).toEqual(["Aek", "Nok", "Bee"]);
  });

  test("Any is never a formation slot", () => {
    const { lines, any } = fillPitch(getFormation("4-3-3").lines, [
      { id: "1", name: "Bee", positionKey: "ANY" },
    ]);
    expect(any.map((p) => p.name)).toEqual(["Bee"]);
    expect(
      lines.flatMap((line) => line.slots).every((slot) => slot.player === null),
    ).toBe(true);
  });
});

test.describe("matchday board", () => {
  test("football CB on roster, then GK imbalance", async ({ browser }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+fb+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await expect(orgPage.getByTestId("sport-football")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await orgPage.getByLabel("Title").fill("Sunday kickabout");
    await orgPage.getByLabel("When / where").fill("Sun 17:00 · Lumphini pitch 2");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Sunday kickabout" })).toBeVisible();

    const shareUrl = await orgPage.getByTestId("share-url").inputValue();
    expect(shareUrl).toMatch(/\/m\//);
    await orgPage.getByTestId("copy-link").click();

    await guestGoing(browser, shareUrl, "Nok", "CB");
    await orgPage.reload();
    const roster = orgPage.getByTestId("roster");
    await expect(roster).toContainText("Nok");
    await expect(roster).toContainText("CB");
    await expect(orgPage.getByTestId("imbalance-banner")).toHaveCount(0);

    await guestGoing(browser, shareUrl, "Aek", "GK");
    await guestGoing(browser, shareUrl, "Bee", "GK");
    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Aek");
    await expect(orgPage.getByTestId("imbalance-banner")).toContainText(
      /Too many GKs/i,
    );

    await organiser.close();
  });

  test("basketball matchday shows PG chips", async ({ browser }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+bb+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByTestId("sport-basketball").click();
    await orgPage.getByLabel("Title").fill("Tuesday run");
    await orgPage.getByLabel("When / where").fill("Tue 20:00 · Court 1");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Tuesday run" })).toBeVisible();
    await expect(orgPage.getByTestId("half-court")).toBeVisible();
    await expect(orgPage.getByTestId("half-pitch")).toHaveCount(0);

    const shareUrl = await orgPage.getByTestId("share-url").inputValue();
    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByRole("link", { name: "Skwad" })).toBeVisible();
    await expect(page.getByTestId("position-PG")).toBeVisible();
    await expect(page.getByTestId("coach-board")).toHaveCount(0);
    await expect(page.getByTestId("position-C")).toBeVisible();
    await expect(page.getByTestId("position-GK")).toHaveCount(0);
    await expect(page.getByTestId("position-CB")).toHaveCount(0);

    await page.getByLabel("Your name").fill("Dan");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-PG").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("rsvp-confirmed")).toContainText(/going/i);
    await guest.close();

    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Dan");
    await expect(orgPage.getByTestId("roster")).toContainText("PG");

    await organiser.close();
  });

  test("empty slots show muted abbr only, Going CB fills a CB slot", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+pitch+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Coach board");
    await orgPage.getByLabel("When / where").fill("Thu 20:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await orgPage.getByTestId("formation-4-1-4-1").click();
    await expect(orgPage.getByTestId("coach-board").getByText(/Need /)).toHaveCount(
      0,
    );
    await expect(orgPage.getByTestId("slot-empty-CB-1")).toBeVisible();
    await expect(orgPage.getByTestId("slot-empty-CB-1")).toHaveText("CB");
    const pitch = orgPage.getByTestId("half-pitch");
    await expect(pitch).toBeVisible();
    const box = await pitch.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width / box!.height).toBeGreaterThan(1.15);
    const gk = await orgPage.getByTestId("slot-empty-GK-0").boundingBox();
    const cf = await orgPage.getByTestId("slot-empty-CF-0").boundingBox();
    expect(gk && cf).toBeTruthy();
    expect(gk!.y).toBeGreaterThan(cf!.y);
    await expect(orgPage.getByTestId("coach-banner")).toContainText(
      /Pitch fills as players tap Going/i,
    );

    const shareUrl = await orgPage.getByTestId("share-url").inputValue();
    await guestGoing(browser, shareUrl, "Nok", "CB");
    await orgPage.reload();
    await orgPage.getByTestId("formation-4-1-4-1").click();
    await expect(orgPage.getByTestId("slot-filled-CB")).toContainText("Nok");
    await expect(orgPage.getByTestId("roster")).toContainText("Nok");

    await organiser.close();
  });

  test("edit title and when/where", async ({ browser }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+edit+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Sunday kickabout");
    await orgPage.getByLabel("When / where").fill("Sun 17:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Sunday kickabout" })).toBeVisible();

    await orgPage.getByRole("link", { name: /^edit$/i }).click();
    await orgPage.getByLabel("Title").fill("Monday 5s");
    await orgPage.getByLabel("When / where").fill("Mon 20:00 · Court 1");
    await orgPage.getByTestId("edit-formation-4-1-4-1").click();
    await orgPage.getByRole("button", { name: /^save$/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Monday 5s" })).toBeVisible();
    await expect(orgPage.getByText(/Mon 20:00 · Court 1/)).toBeVisible();
    await expect(orgPage.getByTestId("formation-4-1-4-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await organiser.close();
  });

  test("delete matchday: guest sees deleted state", async ({ browser }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+del+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("To delete");
    await orgPage.getByLabel("When / where").fill("Fri 19:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const shareUrl = await orgPage.getByTestId("share-url").inputValue();

    orgPage.once("dialog", (dialog) => dialog.accept());
    await orgPage.getByTestId("delete-matchday").click();
    await expect(orgPage).toHaveURL(/\/board\/?$/);
    await expect(orgPage.getByRole("link", { name: "To delete" })).toHaveCount(0);

    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByTestId("matchday-gone")).toContainText(
      /deleted/i,
    );
    await expect(page.getByLabel("Your name")).toHaveCount(0);
    await guest.close();
    await organiser.close();
  });

  test("guest sees Going list sorted back→front then Any", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+sort+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Sorted roster");
    await orgPage.getByLabel("When / where").fill("Sat 16:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await orgPage.getByTestId("formation-4-1-4-1").click();
    const shareUrl = await orgPage.getByTestId("share-url").inputValue();

    await guestGoing(browser, shareUrl, "Nok", "CB");
    await guestGoing(browser, shareUrl, "Bee", "ANY");
    await guestGoing(browser, shareUrl, "Aek", "GK");

    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    const roster = page.getByTestId("roster");
    await expect(roster).toBeVisible();
    await expect(roster.locator("li")).toHaveText([
      /Aek\s*GK/,
      /Nok\s*CB/,
      /Bee\s*Any/,
    ]);
    await guest.close();
    await organiser.close();
  });

  test("Any sits on the bench strip, not a formation slot", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+any+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Any strip");
    await orgPage.getByLabel("When / where").fill("Sat 10:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const shareUrl = await orgPage.getByTestId("share-url").inputValue();
    await guestGoing(browser, shareUrl, "Bee", "ANY");
    await orgPage.reload();
    await expect(orgPage.getByTestId("bench")).toContainText("Bee");
    await expect(orgPage.getByTestId("bench")).toContainText("Any");
    await expect(orgPage.locator("[data-testid^=slot-filled-]")).toHaveCount(0);
    await expect(orgPage.getByTestId("roster")).toContainText("Bee");

    await organiser.close();
  });

  test("guest adds a friend with added by, then edits and deletes them", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+friend+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Bring a friend");
    await orgPage.getByLabel("When / where").fill("Sun 11:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const shareUrl = await orgPage.getByTestId("share-url").inputValue();

    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await page.getByLabel("Your name").fill("Nok");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-CB").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("rsvp-confirmed")).toBeVisible();
    await expect(page.getByTestId("add-friend")).toBeVisible();

    await page.getByTestId("friend-name").fill("Bee");
    await page.getByTestId("friend-submit-going").click();
    await page.getByTestId("friend-submit-position-ANY").click();
    await page.getByTestId("friend-submit").click();
    await expect(page.getByTestId("added-by")).toContainText("added by Nok");
    await expect(page.getByTestId("roster")).toContainText("Bee");
    await expect(page.getByTestId("my-extras")).toContainText("Bee");

    await page.getByRole("button", { name: /^edit$/i }).click();
    await page.getByTestId("extra-name").fill("Bee2");
    await page.locator('[data-testid^="extra-save-"]').click();
    await expect(page.getByTestId("roster")).toContainText("Bee2");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator('[data-testid^="extra-delete-"]').click();
    await expect(page.getByTestId("roster")).not.toContainText("Bee2");
    await expect(page.getByTestId("my-extras")).toHaveCount(0);

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(shareUrl);
    await otherPage.getByLabel("Your name").fill("Aek");
    await otherPage.getByTestId("status-going").click();
    await otherPage.getByTestId("position-GK").click();
    await otherPage.getByTestId("rsvp-submit").click();
    await expect(otherPage.getByTestId("add-friend")).toBeVisible();
    await expect(otherPage.getByTestId("my-extras")).toHaveCount(0);
    await expect(otherPage.getByRole("button", { name: /^delete$/i })).toHaveCount(
      0,
    );
    await other.close();
    await guest.close();
    await organiser.close();
  });
});

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Skwad" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /magic link/i }).click();
  const magic = page.getByTestId("debug-magic-link");
  await expect(magic).toBeVisible();
  await magic.click();
  await expect(page).toHaveURL(/\/board/, { timeout: 15_000 });
}

async function guestGoing(
  browser: Browser,
  shareUrl: string,
  name: string,
  position: string,
) {
  const context = await browser.newContext();
  const page: Page = await context.newPage();
  await page.goto(shareUrl);
  await expect(page.getByRole("link", { name: "Skwad" })).toBeVisible();
  await page.getByLabel("Your name").fill(name);
  await page.getByTestId("status-going").click();
  await page.getByTestId(`position-${position}`).click();
  await page.getByTestId("rsvp-submit").click();
  await expect(page.getByTestId("rsvp-confirmed")).toContainText(/going/i);
  await context.close();
}
