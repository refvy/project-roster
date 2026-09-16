import { expect, test, type Browser, type Page } from "@playwright/test";
import { describeImbalance } from "../lib/imbalance";
import { FOOTBALL_POSITIONS } from "../lib/positions";

test.describe("imbalance rule", () => {
  test("two GKs produce Too many GKs", () => {
    const message = describeImbalance(
      [{ positionKey: "GK" }, { positionKey: "GK" }, { positionKey: "MID" }],
      FOOTBALL_POSITIONS,
    );
    expect(message).toBe("Too many GKs");
  });

  test("overloaded DEF and empty MID", () => {
    const message = describeImbalance(
      [
        { positionKey: "DEF" },
        { positionKey: "DEF" },
        { positionKey: "DEF" },
        { positionKey: "FWD" },
      ],
      FOOTBALL_POSITIONS,
    );
    expect(message).toContain("Too many DEFs");
    expect(message).toContain("need a MID");
  });

  test("Any is ignored", () => {
    const message = describeImbalance(
      [{ positionKey: "ANY" }, { positionKey: "ANY" }, { positionKey: "MID" }],
      FOOTBALL_POSITIONS,
    );
    expect(message).toBeNull();
  });
});

test.describe("matchday board", () => {
  test("organiser creates match, guest goes, roster and GK imbalance", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    const stamp = Date.now();

    await orgPage.goto("/");
    await orgPage.getByLabel("Email").fill(`mark+${stamp}@example.com`);
    await orgPage.getByRole("button", { name: /magic link/i }).click();
    const magic = orgPage.getByTestId("debug-magic-link");
    await expect(magic).toBeVisible();
    await magic.click();
    await expect(orgPage).toHaveURL(/\/board/, { timeout: 15_000 });

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Sunday kickabout");
    await orgPage.getByLabel("When / where").fill("Sun 17:00 · Lumphini pitch 2");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Sunday kickabout" })).toBeVisible();

    const shareUrl = await orgPage.getByTestId("share-url").inputValue();
    expect(shareUrl).toMatch(/\/m\//);
    await orgPage.getByTestId("copy-link").click();

    await guestGoing(browser, shareUrl, "Nok", "MID");
    await orgPage.reload();
    const roster = orgPage.getByTestId("roster");
    await expect(roster).toContainText("Nok");
    await expect(roster).toContainText("MID");
    await expect(orgPage.getByTestId("imbalance-banner")).toHaveCount(0);

    await guestGoing(browser, shareUrl, "Aek", "GK");
    await guestGoing(browser, shareUrl, "Bee", "GK");
    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Aek");
    await expect(orgPage.getByTestId("roster")).toContainText("Bee");
    await expect(orgPage.getByTestId("imbalance-banner")).toContainText(
      /Too many GKs/i,
    );

    await organiser.close();
  });
});

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
