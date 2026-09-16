import { expect, test, type Browser, type Page } from "@playwright/test";
import { describeImbalance } from "../lib/imbalance";
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

    const shareUrl = await orgPage.getByTestId("share-url").inputValue();
    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByTestId("position-PG")).toBeVisible();
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
});

async function signIn(page: Page, email: string) {
  await page.goto("/");
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
  await page.getByLabel("Your name").fill(name);
  await page.getByTestId("status-going").click();
  await page.getByTestId(`position-${position}`).click();
  await page.getByTestId("rsvp-submit").click();
  await expect(page.getByTestId("rsvp-confirmed")).toContainText(/going/i);
  await context.close();
}
