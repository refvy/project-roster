import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeImbalance } from "../lib/imbalance";
import {
  BASKETBALL_LINES,
  BASKETBALL_SLOT_LAYOUT,
  fillPitch,
  firstName,
  getFormation,
  orderGoingForRoster,
  slotOverflowCount,
} from "../lib/pitch";
import {
  BASKETBALL_POSITIONS,
  FOOTBALL_POSITIONS,
  groupedPositionRows,
} from "../lib/positions";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

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
    expect(message).toBe("3 on CM · light on CAM");
  });

  test("3 PGs need a big when SG is also Going", () => {
    const message = describeImbalance(
      [
        { positionKey: "PG" },
        { positionKey: "PG" },
        { positionKey: "PG" },
        { positionKey: "SG" },
      ],
      BASKETBALL_POSITIONS,
      "basketball",
    );
    expect(message).toBe("3 on PG · need a big");
  });

  test("3 on LW · light on RW", () => {
    const message = describeImbalance(
      [{ positionKey: "LW" }, { positionKey: "LW" }, { positionKey: "LW" }],
      FOOTBALL_POSITIONS,
      "football",
    );
    expect(message).toBe("3 on LW · light on RW");
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
  test("CBs stack across CB slots; extra stays off the bench", () => {
    const formation = getFormation("4-1-4-1");
    const { lines, bench } = fillPitch(formation.lines, [
      { id: "1", name: "Nok", positionKey: "CB" },
      { id: "2", name: "Bee", positionKey: "CB" },
      { id: "3", name: "Aek", positionKey: "CB" },
    ]);
    const cbs = lines.flatMap((line) =>
      line.slots.filter((slot) => slot.key === "CB"),
    );
    expect(cbs[0]?.players.map((p) => p.name)).toEqual(["Nok", "Aek"]);
    expect(cbs[1]?.players.map((p) => p.name)).toEqual(["Bee"]);
    expect(bench).toEqual([]);
  });

  test("three LWs stack on the one LW slot with +2 overflow", () => {
    const { lines, bench } = fillPitch(getFormation("4-3-3").lines, [
      { id: "1", name: "Tim", positionKey: "LW" },
      { id: "2", name: "Dan", positionKey: "LW" },
      { id: "3", name: "Mit", positionKey: "LW" },
    ]);
    const lw = lines
      .flatMap((line) => line.slots)
      .find((slot) => slot.key === "LW");
    expect(lw?.players.map((p) => p.name)).toEqual(["Tim", "Dan", "Mit"]);
    expect(slotOverflowCount(lw?.players ?? [])).toBe(2);
    expect(firstName("Alexander")).toBe("Alexande");
    expect(bench).toEqual([]);
  });

  test("CAM and CDM fill CM slots on 4-3-3", () => {
      { id: "2", name: "Joe", positionKey: "CAM" },
      { id: "3", name: "Wee", positionKey: "CDM" },
    ]);
    const cms = lines
      .flatMap((line) => line.slots)
      .filter((slot) => slot.key === "CM")
      .flatMap((slot) => slot.players);
    expect(cms.map((p) => p.name).sort()).toEqual(["Joe", "Terng", "Wee"]);
    expect(bench).toEqual([]);
  });

  test("CDM stays on CDM when the formation has that slot", () => {
    const { lines } = fillPitch(getFormation("4-1-4-1").lines, [
      { id: "1", name: "Wee", positionKey: "CDM" },
    ]);
    const cdm = lines
      .flatMap((line) => line.slots)
      .find((slot) => slot.key === "CDM");
    expect(cdm?.players.map((p) => p.name)).toEqual(["Wee"]);
  });

  test("LW fills LM when the formation uses LM/RM", () => {
    const { lines, bench } = fillPitch(
      [
        { area: "the keeper", keys: ["GK"] },
        { area: "midfield", keys: ["LM", "CM", "CM", "RM"] },
      ],
      [{ id: "1", name: "Nok", positionKey: "LW" }],
    );
    const lm = lines.flatMap((line) => line.slots).find((slot) => slot.key === "LM");
    expect(lm?.players.map((p) => p.name)).toEqual(["Nok"]);
    expect(bench).toEqual([]);
  });

  test("roster order is formation back→front then leftover Any", () => {
    const ordered = orderGoingForRoster(
      [
        { id: "1", name: "Nok", positionKey: "CB" },
        { id: "2", name: "Bee", positionKey: "ANY" },
        { id: "3", name: "Aek", positionKey: "GK" },
      ],
      "football",
      "4-1-4-1",
    );
    expect(ordered.map((p) => p.name)).toEqual(["Aek", "Bee", "Nok"]);
  });

  test("Any fills a remaining vacancy", () => {
    const { lines, any, bench } = fillPitch(getFormation("4-3-3").lines, [
      { id: "1", name: "Bee", positionKey: "ANY" },
    ]);
    expect(any).toEqual([]);
    expect(bench).toEqual([]);
    expect(
      lines.flatMap((line) => line.slots).some((slot) =>
        slot.players.some((p) => p.name === "Bee"),
      ),
    ).toBe(true);
  });

  test("leftover Any sits on the bench when the pitch is full", () => {
    const filled = getFormation("4-3-3")
      .lines.flatMap((line) => line.keys)
      .map((key, index) => ({
        id: String(index),
        name: `P${index}`,
        positionKey: key,
      }));
    const { any, bench } = fillPitch(getFormation("4-3-3").lines, [
      ...filled,
      { id: "any", name: "Bee", positionKey: "ANY" },
    ]);
    expect(any.map((p) => p.name)).toEqual(["Bee"]);
    expect(bench.map((p) => p.name)).toEqual(["Bee"]);
  });

  test("basketball lines are C, PF/SF wide, SG/PG closer", () => {
    expect(BASKETBALL_LINES.map((line) => line.keys)).toEqual([
      ["C"],
      ["PF", "SF"],
      ["SG", "PG"],
    ]);
    const pf = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.PF!.left);
    const sf = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.SF!.left);
    const sg = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.SG!.left);
    const pg = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.PG!.left);
    const cTop = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.C!.top);
    const wingTop = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.PF!.top);
    const guardTop = Number.parseFloat(BASKETBALL_SLOT_LAYOUT.SG!.top);
    expect(cTop).toBeLessThan(wingTop);
    expect(wingTop).toBeLessThan(guardTop);
    expect(Math.abs(sf - pf)).toBeGreaterThan(Math.abs(pg - sg));
  });

  test("position chips group like the board", () => {
    expect(
      groupedPositionRows(BASKETBALL_POSITIONS).map((row) =>
        row.map((p) => p.key),
      ),
    ).toEqual([["C"], ["PF", "SF"], ["SG", "PG"], ["ANY"]]);
    expect(
      groupedPositionRows(FOOTBALL_POSITIONS).map((row) =>
        row.map((p) => p.key),
      ),
    ).toEqual([
      ["GK"],
      ["LB", "CB", "RB"],
      ["CDM", "CM", "CAM"],
      ["LW", "CF", "RW"],
      ["ANY"],
    ]);
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
    await expect(orgPage.getByTestId("sport-label")).toHaveText("Football");
    await expect(orgPage.getByTestId("out-section")).toHaveCount(0);

    const shareUrl = await shareUrlOf(orgPage);
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
    await expect(orgPage.getByTestId("sport-label")).toHaveText("Basketball");
    await expect(orgPage.getByTestId("squad-heading")).toHaveText("Squad");
    await expect(orgPage.getByRole("heading", { name: "Pitch" })).toHaveCount(0);
    await expect(orgPage.getByTestId("copy-link")).toHaveText(
      "Copy invitation link",
    );
    await expect(orgPage.getByTestId("half-court")).toBeVisible();
    await expect(orgPage.getByTestId("half-pitch")).toHaveCount(0);

    const court = orgPage.getByTestId("half-court");
    const courtBox = await court.boundingBox();
    expect(courtBox).toBeTruthy();
    const ratio = courtBox!.width / courtBox!.height;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.9);

    const c = await orgPage.getByTestId("bb-slot-C").boundingBox();
    const pf = await orgPage.getByTestId("bb-slot-PF").boundingBox();
    const sf = await orgPage.getByTestId("bb-slot-SF").boundingBox();
    const sg = await orgPage.getByTestId("bb-slot-SG").boundingBox();
    const pg = await orgPage.getByTestId("bb-slot-PG").boundingBox();
    expect(c && pf && sf && sg && pg).toBeTruthy();
    expect(c!.y).toBeLessThan(pf!.y);
    expect(Math.abs(pf!.y - sf!.y)).toBeLessThan(12);
    expect(sg!.y).toBeGreaterThan(pf!.y);
    expect(Math.abs(sg!.y - pg!.y)).toBeLessThan(12);
    expect(centerX(sf!) - centerX(pf!)).toBeGreaterThan(
      centerX(pg!) - centerX(sg!),
    );

    const shareUrl = await shareUrlOf(orgPage);
    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByRole("link", { name: "Skwad" })).toBeVisible();
    await expect(page.getByTestId("sport-label")).toHaveText("Basketball");
    await expect(page.getByTestId("position-PG")).toBeVisible();
    await expect(page.getByTestId("coach-board")).toHaveCount(0);
    await expect(page.getByTestId("position-C")).toBeVisible();
    await expect(page.getByTestId("position-GK")).toHaveCount(0);
    await expect(page.getByTestId("position-CB")).toHaveCount(0);
    const chipC = await page.getByTestId("position-C").boundingBox();
    const chipPf = await page.getByTestId("position-PF").boundingBox();
    const chipSf = await page.getByTestId("position-SF").boundingBox();
    const chipSg = await page.getByTestId("position-SG").boundingBox();
    const chipPg = await page.getByTestId("position-PG").boundingBox();
    expect(chipC && chipPf && chipSf && chipSg && chipPg).toBeTruthy();
    expect(chipC!.y).toBeLessThan(chipPf!.y);
    expect(Math.abs(chipPf!.y - chipSf!.y)).toBeLessThan(12);
    expect(chipSg!.y).toBeGreaterThan(chipPf!.y);
    expect(centerX(chipSf!) - centerX(chipPf!)).toBeGreaterThan(
      centerX(chipPg!) - centerX(chipSg!),
    );

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Signup now for Tuesday run — powered by SKWAD",
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", "Tap Going. Pick your spot. No app.");

    await page.getByLabel("Your name").fill("Dan");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-PG").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("rsvp-confirmed")).toContainText(/going/i);
    await guest.close();

    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Dan");
    await expect(orgPage.getByTestId("roster")).toContainText("PG");
    await saveShot(court, "basketball-halfcourt.png");

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
    await expect(orgPage.getByTestId("squad-heading")).toHaveText("Squad");
    await expect(orgPage.getByTestId("coach-board").getByText(/Need /)).toHaveCount(
      0,
    );
    await expect(orgPage.getByTestId("slot-empty-CB-1")).toBeVisible();
    await expect(orgPage.getByTestId("slot-empty-CB-1")).toHaveText("CB");
    const pitch = orgPage.getByTestId("half-pitch");
    await expect(pitch).toBeVisible();
    const box = await pitch.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width / box!.height).toBeGreaterThan(0.65);
    expect(box!.width / box!.height).toBeLessThan(0.9);
    const gk = await orgPage.getByTestId("slot-empty-GK-0").boundingBox();
    const cf = await orgPage.getByTestId("slot-empty-CF-0").boundingBox();
    expect(gk && cf).toBeTruthy();
    expect(gk!.y).toBeGreaterThan(cf!.y);
    await expect(orgPage.getByTestId("bench")).toContainText("Bench / Any");
    await expect(orgPage.getByTestId("bench")).toContainText(
      "Nobody on the bench yet.",
    );
    await expect(orgPage.getByTestId("coach-banner")).toContainText(
      /Squad fills as players tap Going/i,
    );

    const shareUrl = await shareUrlOf(orgPage);
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
    const shareUrl = await shareUrlOf(orgPage);

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
    const shareUrl = await shareUrlOf(orgPage);

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
      /Bee\s*Any/,
      /Nok\s*CB/,
    ]);
    await guest.close();
    await organiser.close();
  });

  test("Any fills a remaining vacancy", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+any+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Any strip");
    await orgPage.getByLabel("When / where").fill("Sat 10:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const shareUrl = await shareUrlOf(orgPage);
    await guestGoing(browser, shareUrl, "Bee", "ANY");
    await orgPage.reload();
    await expect(orgPage.getByTestId("bench")).toContainText(
      "Nobody on the bench yet.",
    );
    await expect(orgPage.locator("[data-testid^=slot-filled-]")).toContainText(
      "Bee",
    );
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
    const shareUrl = await shareUrlOf(orgPage);

    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await page.getByLabel("Your name").fill("Nok");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-CB").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("rsvp-confirmed")).toBeVisible();
    await expect(page.getByRole("heading", { name: /i.?m going/i })).toBeVisible();
    await expect(page.getByTestId("add-friend")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /add someone else/i }),
    ).toBeVisible();

    await page.getByTestId("friend-name").fill("Bee");
    await page.getByTestId("friend-submit-going").click();
    await page.getByTestId("friend-submit-position-ANY").click();
    await page.getByTestId("friend-submit").click();
    await expect(page.getByTestId("added-by")).toContainText("added by Nok");
    await expect(page.getByTestId("roster")).toContainText("Bee");
    await expect(page.getByTestId("my-extras")).toContainText("Bee");

    await page.getByRole("button", { name: /^edit$/i }).click();
    await page.getByTestId("extra-name").fill("Bee2");
    await page.getByRole("button", { name: /^save$/i }).click();
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

  test("hero +N chip has no name when count≥2; CAM/CDM sit on CM; Out collapses", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+stack+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("LW stack");
    await orgPage.getByLabel("When / where").fill("Sat 19:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await orgPage.getByTestId("formation-4-3-3").click();
    await expect(orgPage.getByTestId("sport-label")).toHaveText("Football");
    await expect(orgPage.getByTestId("out-section")).toHaveCount(0);
    const shareUrl = await shareUrlOf(orgPage);

    await guestGoing(browser, shareUrl, "Tim", "LW");
    await guestGoing(browser, shareUrl, "Dan", "LW");
    await guestGoing(browser, shareUrl, "Mit", "LW");
    await guestGoing(browser, shareUrl, "Joe", "CAM");
    await guestGoing(browser, shareUrl, "Wee", "CDM");

    await orgPage.reload();
    await orgPage.getByTestId("formation-4-3-3").click();
    const slot = orgPage.getByTestId("slot-filled-LW");
    await expect(slot).not.toContainText("Tim");
    await expect(slot).not.toContainText("Dan");
    await expect(slot).not.toContainText("Mit");
    await expect(slot).toContainText("LW");
    await expect(orgPage.getByTestId("slot-overflow-LW")).toHaveText("+2");
    await saveShot(slot, "hero-plus-n.png");
    const cmText = (
      await orgPage.getByTestId("slot-filled-CM").allTextContents()
    ).join(" ");
    expect(cmText).toContain("Joe");
    expect(cmText).toContain("Wee");
    await expect(orgPage.getByTestId("bench")).not.toContainText("Dan");
    await expect(orgPage.getByTestId("bench")).not.toContainText("Joe");
    await expect(orgPage.getByTestId("bench")).not.toContainText("Wee");

    await slot.click();
    const sheet = orgPage.getByTestId("slot-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("slot-sheet-row")).toHaveCount(3);
    await expect(sheet).toContainText("Tim");
    await expect(sheet).toContainText("Dan");
    await expect(sheet).toContainText("Mit");
    await orgPage.getByTestId("slot-sheet-close").click();
    await expect(orgPage.getByTestId("slot-sheet")).toHaveCount(0);

    await guestOut(browser, shareUrl, "Aek");
    await orgPage.reload();
    await orgPage.getByTestId("formation-4-3-3").click();
    await expect(orgPage.getByTestId("out-toggle")).toContainText("Out · 1");
    await expect(orgPage.getByTestId("out-list")).toHaveCount(0);
    await orgPage.getByTestId("out-toggle").click();
    await expect(orgPage.getByTestId("out-list")).toContainText("Aek");

    await orgPage.goto("/board");
    await expect(orgPage.getByTestId("sport-chip")).toContainText("Football");

    await organiser.close();
  });

  test("home tabs Invited and Hosting; OG image", async ({ browser }) => {
    const host = await browser.newContext();
    const hostPage = await host.newPage();
    await signIn(hostPage, `mark+host+${Date.now()}@example.com`);
    await expect(
      hostPage.getByRole("link", { name: "+ New matchday" }),
    ).toBeVisible();
    await expect(hostPage.getByTestId("tab-invited")).toBeVisible();
    await expect(hostPage.getByTestId("tab-hosting")).toBeVisible();
    await expect(hostPage.getByTestId("tab-hosting")).toHaveAttribute(
      "aria-current",
      "page",
    );

    await hostPage.getByRole("link", { name: "+ New matchday" }).click();
    await hostPage.getByLabel("Title").fill("Hosted game");
    await hostPage.getByLabel("When / where").fill("Sat 18:00");
    await hostPage.getByRole("button", { name: /create matchday/i }).click();
    const hostedShare = await shareUrlOf(hostPage);

    const player = await browser.newContext();
    const playerPage = await player.newPage();
    await signIn(playerPage, `mark+play+${Date.now()}@example.com`);
    await playerPage.getByRole("link", { name: "+ New matchday" }).click();
    await playerPage.getByLabel("Title").fill("My hosting");
    await playerPage.getByLabel("When / where").fill("Sun 12:00");
    await playerPage.getByRole("button", { name: /create matchday/i }).click();
    await playerPage.goto("/board");
    await expect(playerPage.getByRole("link", { name: "My hosting" })).toBeVisible();
    await playerPage.getByTestId("tab-invited").click();
    await expect(playerPage.getByRole("link", { name: "My hosting" })).toHaveCount(
      0,
    );

    await playerPage.goto(hostedShare);
    await playerPage.getByLabel("Your name").fill("Nok");
    await playerPage.getByTestId("status-going").click();
    await playerPage.getByTestId("position-CB").click();
    await playerPage.getByTestId("rsvp-submit").click();
    await expect(playerPage.getByTestId("rsvp-confirmed")).toContainText(
      /going/i,
    );
    await playerPage.getByRole("link", { name: "Skwad" }).click();
    await expect(playerPage).toHaveURL(/\/board/);
    await expect(playerPage.getByTestId("tab-hosting")).toBeVisible();
    await playerPage.getByTestId("tab-invited").click();
    await expect(playerPage.getByTestId("tab-invited")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      playerPage.getByRole("link", { name: "Hosted game" }),
    ).toBeVisible();
    await expect(
      playerPage.getByRole("link", { name: "My hosting" }),
    ).toHaveCount(0);
    await playerPage.getByTestId("tab-hosting").click();
    await expect(
      playerPage.getByRole("link", { name: "My hosting" }),
    ).toBeVisible();
    await expect(
      playerPage.getByRole("link", { name: "Hosted game" }),
    ).toHaveCount(0);
    await saveShot(playerPage.getByTestId("home-tabs"), "home-tabs.png");
    await playerPage.screenshot({
      path: join(SCREENSHOT_DIR, "home-tabs-page.png"),
      fullPage: true,
    });

    const og = await playerPage.request.get(`${hostedShare}/opengraph-image`);
    expect(og.ok()).toBeTruthy();
    expect(og.headers()["content-type"]).toMatch(/image\/png/);
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    writeFileSync(join(SCREENSHOT_DIR, "og-image.png"), await og.body());

    await player.close();
    await host.close();
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
  await expect(page.getByRole("link", { name: "+ New matchday" })).toBeVisible();
  await expect(page.getByTestId("tab-invited")).toBeVisible();
  await expect(page.getByTestId("tab-hosting")).toBeVisible();
}

async function shareUrlOf(page: Page) {
  const raw = await page.getByTestId("share-url").textContent();
  return (raw ?? "").replace(/\s+/g, "").trim();
}

function centerX(box: { x: number; width: number }) {
  return box.x + box.width / 2;
}

async function saveShot(
  locator: { screenshot: (opts: { path: string }) => Promise<Buffer> },
  filename: string,
) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await locator.screenshot({ path: join(SCREENSHOT_DIR, filename) });
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

async function guestOut(browser: Browser, shareUrl: string, name: string) {
  const context = await browser.newContext();
  const page: Page = await context.newPage();
  await page.goto(shareUrl);
  await page.getByLabel("Your name").fill(name);
  await page.getByTestId("status-out").click();
  await page.getByTestId("rsvp-submit").click();
  await expect(page.getByTestId("rsvp-confirmed")).toContainText(/out/i);
  await context.close();
}
