import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeImbalance } from "../lib/imbalance";
import {
  BASKETBALL_LINES,
  BASKETBALL_SLOT_LAYOUT,
  fillPitch,
  firstName,
  getFormation,
  overflowBadgeLabel,
  orderGoingForRoster,
  slotOverflowCount,
} from "../lib/pitch";
import {
  BASKETBALL_FIRST_NAMES,
  FOOTBALL_FIRST_NAMES,
} from "../lib/athlete-names";
import { arcSweepFlag, halfCourtGeometry, horizontalArcBulgeY } from "../lib/court";
import { publicAppOrigin } from "../lib/env";
import {
  BASKETBALL_POSITIONS,
  FOOTBALL_POSITIONS,
  groupedPositionRows,
} from "../lib/positions";
import {
  bangkokDateTimeToUtc,
  displayWhen,
  displayWhere,
  formatBangkokWhen,
  formatWhenWhereLine,
  hasStructuredStart,
  matchdayWhenWhereLine,
} from "../lib/when-where";
import { buildMatchdayIcs } from "../lib/ics";
import {
  inviteShareUrl,
  matchdaySharePulse,
  ogImageUrl,
  pulseBody,
  shareUpdateText,
  shareUpdateUrl,
  squadCapacity,
  stampKind,
  stampView,
  signupTitle,
} from "../lib/share-pulse";

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
    expect(overflowBadgeLabel(lw?.players ?? [])).toBe("+2");
    expect(
      overflowBadgeLabel(
        Array.from({ length: 12 }, (_, i) => ({
          id: String(i),
          name: `P${i}`,
          positionKey: "LW",
        })),
      ),
    ).toBe("9+");
    expect(firstName("Alexander")).toBe("Alexande");
    expect(bench).toEqual([]);
  });

  test("CAM and CDM fill CM slots on 4-3-3", () => {
    const { lines, bench } = fillPitch(getFormation("4-3-3").lines, [
      { id: "1", name: "Terng", positionKey: "CM" },
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
      ["LW", "CF", "RW"],
      ["CAM", "CM", "CDM"],
      ["LB", "CB", "RB"],
      ["ANY", "GK"],
    ]);
  });
});

test.describe("when/where display", () => {
  test("collapses newlines to a single middle-dot line", () => {
    expect(formatWhenWhereLine("Sun 17:00\nLumphini pitch 2")).toBe(
      "Sun 17:00 · Lumphini pitch 2",
    );
    expect(formatWhenWhereLine("  Mon 20:00  \n\n  Court 1  ")).toBe(
      "Mon 20:00 · Court 1",
    );
  });

  test("prefers structured Bangkok date + place; else free text; else TBD", () => {
    const start = bangkokDateTimeToUtc("2026-10-03", "20:00");
    expect(start).toBeTruthy();
    expect(formatBangkokWhen(start!)).toBe("Sat 3 Oct 2026 · 20:00");
    expect(
      matchdayWhenWhereLine({
        startsAt: start,
        place: "Lumphini pitch 2",
        whenWhere: "ignore me",
      }).text,
    ).toBe("Sat 3 Oct 2026 · 20:00 · Lumphini pitch 2");
    expect(
      displayWhen({ startsAt: null, place: null, whenWhere: "Sun 17:00" }).text,
    ).toBe("Sun 17:00");
    expect(
      displayWhere({ startsAt: start, place: null, whenWhere: "Sun 17:00" }),
    ).toEqual({ text: "TBD", tbd: true });
    expect(
      matchdayWhenWhereLine({ startsAt: null, place: null, whenWhere: "" }),
    ).toEqual({ text: "TBD", tbd: true });
    expect(hasStructuredStart({ startsAt: start, whenWhere: "" })).toBe(true);
    expect(hasStructuredStart({ startsAt: null, whenWhere: "Sun" })).toBe(false);
  });

  test("ICS includes UTC start and optional end", () => {
    const startsAt = bangkokDateTimeToUtc("2026-10-03", "20:00")!;
    const endsAt = bangkokDateTimeToUtc("2026-10-03", "22:00")!;
    const ics = buildMatchdayIcs({
      publicId: "abc",
      title: "Sunday kickabout",
      place: "Lumphini",
      startsAt,
      endsAt,
      url: "https://getskwad.com/m/abc",
    });
    expect(ics).toContain("DTSTART:20261003T130000Z");
    expect(ics).toContain("DTEND:20261003T150000Z");
    expect(ics).toContain("LOCATION:Lumphini");
    expect(ics).toContain("SUMMARY:Sunday kickabout");
  });
});

test.describe("half-court geometry", () => {
  test("restricted under the rim inside the key; FT arc outside toward midcourt; 3pt from short corners", () => {
    const g = halfCourtGeometry();
    expect(g.restrictedBulgeY).toBeGreaterThan(g.hoopY);
    expect(g.restrictedBulgeY).toBeLessThan(g.keyBottom);
    expect(g.ftBulgeY).toBeGreaterThan(g.keyBottom);
    expect(g.restR).toBeLessThan(g.ftR);
    expect(g.cornerY).toBeGreaterThan(g.top + 40);
    expect(g.threeLeft.startsWith(`M${g.c1} ${g.top} V`)).toBe(true);
    expect(g.threeArc).not.toMatch(new RegExp(`M${g.c1} ${g.top} A`));
    expect(g.restricted).toMatch(/A 28 28 0 0 1 /);
    expect(g.freeThrow).toMatch(/A 43 43 0 0 1 /);
    expect(arcSweepFlag(g.restricted)).toBe(1);
    expect(arcSweepFlag(g.freeThrow)).toBe(1);
    expect(horizontalArcBulgeY(g.hoopY, g.restR, 1)).toBe(g.restrictedBulgeY);
    expect(horizontalArcBulgeY(g.keyBottom, g.ftR, 1)).toBe(g.ftBulgeY);
  });
});

test.describe("athlete placeholders", () => {
  test("twenty first names per sport, never Bee or Nok", () => {
    expect(FOOTBALL_FIRST_NAMES).toHaveLength(20);
    expect(BASKETBALL_FIRST_NAMES).toHaveLength(20);
    expect(FOOTBALL_FIRST_NAMES).not.toContain("Bee");
    expect(FOOTBALL_FIRST_NAMES).not.toContain("Nok");
    expect(BASKETBALL_FIRST_NAMES).not.toContain("Bee");
    expect(BASKETBALL_FIRST_NAMES).not.toContain("Nok");
  });
});

test.describe("public origin", () => {
  test("production magic links use APP_URL, not a Vercel alias", () => {
    const prevV = process.env.VERCEL_ENV;
    const prevA = process.env.APP_URL;
    process.env.VERCEL_ENV = "production";
    process.env.APP_URL = "https://getskwad.com";
    try {
      expect(publicAppOrigin("https://project-roster-tau.vercel.app")).toBe(
        "https://getskwad.com",
      );
    } finally {
      if (prevV === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevV;
      if (prevA === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prevA;
    }
  });
});

test.describe("share pulse", () => {
  test("capacity is formation slot count", () => {
    expect(squadCapacity("football", "4-3-3")).toBe(11);
    expect(squadCapacity("football", "3-5-2")).toBe(11);
    expect(squadCapacity("basketball", "4-3-3")).toBe(5);
  });

  test("title is stable signup copy", () => {
    expect(signupTitle("3 เส้า v SISB v STA")).toBe(
      "Signup now for 3 เส้า v SISB v STA — powered by SKWAD",
    );
  });

  test("Low stamp: white fill, coral NEED / n MORE, −12°", () => {
    expect(stampKind(8, 2, 11)).toBe("low");
    const stamp = stampView(9, 0, 11);
    expect(stamp).toMatchObject({
      kind: "low",
      tiltDeg: -12,
      border: "#FF5A3D",
      fill: "#ffffff",
      line1: { text: "NEED", color: "#FF5A3D" },
      line2: { text: "2 MORE", color: "#FF5A3D" },
    });
  });

  test("Enough + Out: teal border, black n GOING, gray n OUT, +12°", () => {
    expect(stampKind(11, 2, 11)).toBe("enough-out");
    const stamp = stampView(8, 2, 8);
    expect(stamp).toMatchObject({
      kind: "enough-out",
      tiltDeg: 12,
      border: "#00D4C8",
      fill: "#ffffff",
      line1: { text: "8 GOING", color: "#1a1714" },
      line2: { text: "2 OUT", color: "#6B7280" },
    });
  });

  test("Enough with no Out omits the Out line", () => {
    expect(stampKind(5, 0, 5)).toBe("enough");
    const stamp = stampView(5, 0, 5);
    expect(stamp).toMatchObject({
      kind: "enough",
      tiltDeg: 12,
      border: "#00D4C8",
      fill: "#ffffff",
      line1: { text: "5 GOING", color: "#1a1714" },
      line2: null,
    });
  });

  test("no stamp until a Going or Out exists", () => {
    expect(stampKind(0, 0, 11)).toBeNull();
    expect(stampView(0, 0, 11)).toBeNull();
  });

  test("body pulses Going, Out, imbalance, when/where", () => {
    expect(
      pulseBody({
        going: 0,
        out: 0,
        imbalance: null,
        whenWhere: "Tue 20:00 · Court 1",
      }),
    ).toBe("Tue 20:00 · Court 1");
    expect(
      pulseBody({
        going: 8,
        out: 0,
        imbalance: "need a CB",
        whenWhere: "Sat 18:00",
      }),
    ).toBe("8 Going · need a CB · Sat 18:00");
    expect(
      pulseBody({
        going: 8,
        out: 2,
        imbalance: "need a CB",
        whenWhere: "Sat 18:00",
      }),
    ).toBe("8 Going · 2 Out · need a CB · Sat 18:00");
  });

  test("Share update URL adds ?v=; invite URL stays clean", () => {
    expect(inviteShareUrl("https://getskwad.com", "abc")).toBe(
      "https://getskwad.com/m/abc",
    );
    expect(shareUpdateUrl("https://getskwad.com", "abc", "1710000000")).toBe(
      "https://getskwad.com/m/abc?v=1710000000",
    );
    expect(ogImageUrl("abc", "1710000000")).toBe(
      "/m/abc/opengraph-image?v=1710000000",
    );
    expect(
      shareUpdateText(
        "Signup now for Pulse — powered by SKWAD",
        "2 Going · Sat 18:00",
        "https://getskwad.com/m/abc?v=1",
      ),
    ).toBe(
      "Signup now for Pulse — powered by SKWAD\n2 Going · Sat 18:00\nhttps://getskwad.com/m/abc?v=1",
    );
  });

  test("matchdaySharePulse wires stamp + body", () => {
    const low = matchdaySharePulse({
      title: "Sunday",
      sport: "football",
      formation: "4-3-3",
      whenWhere: "Sun 17:00",
      positions: FOOTBALL_POSITIONS,
      rsvps: [
        { status: "GOING", positionKey: "GK" },
        { status: "GOING", positionKey: "GK" },
        { status: "OUT", positionKey: null },
      ],
    });
    expect(low.title).toBe("Signup now for Sunday — powered by SKWAD");
    expect(low.stamp?.kind).toBe("low");
    expect(low.body).toContain("2 Going · 1 Out");
    expect(low.body).toContain("Too many GKs");
    expect(low.body).toContain("Sun 17:00");
  });
});

test.describe("matchday board", () => {
  test("football CB on roster, then GK imbalance", async ({ browser }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+fb+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await expect(orgPage.getByTestId("sport-icon-football")).toBeVisible();
    await expect(orgPage.getByTestId("sport-icon-basketball")).toBeVisible();
    await saveShot(orgPage.getByTestId("sport-football"), "sport-icon-football.png");
    await orgPage.getByTestId("sport-basketball").click();
    await saveShot(
      orgPage.getByTestId("sport-basketball"),
      "sport-icon-basketball.png",
    );
    await orgPage.getByTestId("sport-football").click();
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

    const chipGuest = await browser.newContext();
    const chipPage = await chipGuest.newPage();
    await chipPage.goto(shareUrl);
    await expect(chipPage.getByLabel("Your name")).toHaveAttribute(
      "placeholder",
      new RegExp(`^(${FOOTBALL_FIRST_NAMES.join("|")})$`),
    );
    await expect(chipPage.getByLabel("Your name")).not.toHaveAttribute(
      "placeholder",
      /^(Bee|Nok)$/i,
    );
    const lwChip = await chipPage.getByTestId("position-LW").boundingBox();
    const gkChip = await chipPage.getByTestId("position-GK").boundingBox();
    const anyChip = await chipPage.getByTestId("position-ANY").boundingBox();
    expect(lwChip && gkChip && anyChip).toBeTruthy();
    expect(lwChip!.y).toBeLessThan(gkChip!.y);
    expect(Math.abs(anyChip!.y - gkChip!.y)).toBeLessThan(20);
    await chipGuest.close();

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
    await expect(orgPage.getByTestId("bb-3pt")).toBeVisible();
    await expect(orgPage.getByTestId("bb-center-circle")).toBeVisible();
    const marks = halfCourtGeometry();
    await expect(orgPage.getByTestId("bb-restricted")).toHaveAttribute(
      "d",
      marks.restricted,
    );
    await expect(orgPage.getByTestId("bb-ft-arc")).toHaveAttribute(
      "d",
      marks.freeThrow,
    );
    await expect(orgPage.getByTestId("bb-3pt-left")).toHaveAttribute(
      "d",
      marks.threeLeft,
    );
    await expect(orgPage.getByTestId("bb-3pt-right")).toHaveAttribute(
      "d",
      marks.threeRight,
    );
    await expect(orgPage.getByTestId("bb-3pt")).toHaveAttribute(
      "d",
      marks.threeArc,
    );
    await saveShot(court, "basketball-halfcourt.png");

    const shareUrl = await shareUrlOf(orgPage);
    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByRole("link", { name: "Skwad" })).toBeVisible();
    await expect(page.getByTestId("sport-label")).toHaveText("Basketball");
    await expect(page.getByTestId("signup-helper")).toHaveText(
      "No app. Pick a spot and tap Done.",
    );
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
    ).toHaveAttribute("content", "Tue 20:00 · Court 1");

    await expect(page.getByLabel("Your name")).toHaveAttribute(
      "placeholder",
      new RegExp(`^(${BASKETBALL_FIRST_NAMES.join("|")})$`),
    );
    await expect(page.getByLabel("Your name")).not.toHaveAttribute(
      "placeholder",
      /^(Bee|Nok)$/i,
    );
    await saveShot(page.getByTestId("guest-name"), "athlete-placeholder.png");
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "athlete-placeholder-page.png"),
    });
    await page.getByLabel("Your name").fill("Dan");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-PG").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("rsvp-confirmed")).toContainText(/going/i);
    await guest.close();

    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Dan");
    await expect(orgPage.getByTestId("roster")).toContainText("PG");
    await saveShot(court, "basketball-halfcourt-going.png");

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
    await expect(orgPage.getByTestId("bench")).toContainText("Bench");
    await expect(orgPage.getByTestId("bench")).not.toContainText("Bench / Any");
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
    await expect(orgPage.getByTestId("slot-lead-CB")).toHaveText("Nok");
    await expect(orgPage.getByTestId("slot-abbr-CB")).toHaveText("CB");
    await expect(orgPage.getByTestId("slot-overflow-CB")).toHaveCount(0);
    const occupiedNameSize = await fontSizeOf(orgPage.getByTestId("slot-lead-CB"));
    const occupiedAbbrSize = await fontSizeOf(orgPage.getByTestId("slot-abbr-CB"));
    expect(occupiedNameSize).toBeGreaterThan(occupiedAbbrSize);
    await saveChipShot(orgPage.getByTestId("slot-filled-CB"), "occupied-chip.png");
    await expect(orgPage.getByTestId("roster")).toContainText("Nok");

    await organiser.close();
  });

  test("edit title and when/where", async ({ browser }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+edit+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Sunday kickabout");
    await orgPage.getByLabel("When / where").fill("Sun 17:00\nLumphini");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Sunday kickabout" })).toBeVisible();
    await expect(orgPage.getByTestId("when-where")).toHaveText("Sun 17:00 · Lumphini");

    await orgPage.getByRole("link", { name: /^edit$/i }).click();
    await expect(orgPage.locator('textarea[name="whenWhere"]')).toHaveValue(
      "Sun 17:00\nLumphini",
    );
    await orgPage.getByLabel("Title").fill("Monday 5s");
    await orgPage.getByLabel("When / where").fill("Mon 20:00\nCourt 1");
    await orgPage.getByTestId("edit-formation-4-1-4-1").click();
    await orgPage.getByRole("button", { name: /^save$/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Monday 5s" })).toBeVisible();
    await expect(orgPage.getByTestId("when-where")).toHaveText("Mon 20:00 · Court 1");
    await expect(orgPage.getByTestId("formation-4-1-4-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await organiser.close();
  });

  test("cancel match: guest sees cancelled page; live RSVP still works; delete stays gone", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+cancel+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Saturday 5s");
    await orgPage.getByLabel("When / where").fill("Sat 18:00 · Court 2");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const shareUrl = await shareUrlOf(orgPage);

    await guestGoing(browser, shareUrl, "Nok", "CB");
    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Nok");

    await orgPage.getByTestId("cancel-matchday").click();
    await expect(orgPage.getByTestId("cancel-match-sheet")).toBeVisible();
    await orgPage.getByTestId("cancel-matchday-confirm").click();
    await expect(orgPage).toHaveURL(/\/board\/?$/);
    await expect(orgPage.getByTestId("history-toggle")).toHaveText("History");
    await expect(orgPage.getByTestId("cancelled-chip")).toBeHidden();
    await orgPage.getByTestId("history-toggle").click();
    await expect(orgPage.getByTestId("cancelled-chip")).toBeVisible();
    await expect(orgPage.getByRole("link", { name: /Saturday 5s/ })).toBeVisible();

    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByTestId("matchday-cancelled")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "This match was cancelled" }),
    ).toBeVisible();
    await expect(page.getByTestId("when-where")).toHaveText("Sat 18:00 · Court 2");
    await expect(
      page.getByText("Ask your captain if there’s a new date."),
    ).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveCount(0);
    await expect(page.getByTestId("status-going")).toHaveCount(0);
    await expect(page.getByTestId("status-out")).toHaveCount(0);
    await expect(page.getByTestId("rsvp-submit")).toHaveCount(0);
    await guest.close();

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("To delete after cancel");
    await orgPage.getByLabel("When / where").fill("Sun 10:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const deleteUrl = await shareUrlOf(orgPage);
    orgPage.once("dialog", (dialog) => dialog.accept());
    await orgPage.getByTestId("delete-matchday").click();
    await expect(orgPage).toHaveURL(/\/board\/?$/);

    const goneGuest = await browser.newContext();
    const gonePage = await goneGuest.newPage();
    await gonePage.goto(deleteUrl);
    await expect(gonePage.getByTestId("matchday-gone")).toContainText(/deleted/i);
    await expect(gonePage.getByLabel("Your name")).toHaveCount(0);
    await goneGuest.close();
    await organiser.close();
  });

  test("mark completed: guest sees read-only roster; cancel and delete still work", async ({
    browser,
  }) => {
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+done+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Friday kickabout");
    await orgPage.getByLabel("When / where").fill("Fri 19:00 · Pitch 1");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const shareUrl = await shareUrlOf(orgPage);

    await guestGoing(browser, shareUrl, "Nok", "CB");
    await orgPage.reload();
    await expect(orgPage.getByTestId("roster")).toContainText("Nok");

    await orgPage.getByTestId("complete-matchday").click();
    await expect(orgPage.getByTestId("complete-match-sheet")).toBeVisible();
    await orgPage.getByTestId("complete-matchday-confirm").click();
    await expect(orgPage).toHaveURL(/\/board\/?$/);
    await orgPage.getByTestId("history-toggle").click();
    await expect(orgPage.getByTestId("completed-chip")).toHaveText("Completed");
    await expect(orgPage.getByTestId("cancelled-chip")).toHaveCount(0);
    await expect(orgPage.getByRole("link", { name: /Friday kickabout/ })).toBeVisible();

    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(shareUrl);
    await expect(page.getByTestId("matchday-completed")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Match completed" })).toBeVisible();
    await expect(page.getByText("This match was cancelled")).toHaveCount(0);
    await expect(page.getByTestId("when-where")).toHaveText("Fri 19:00 · Pitch 1");
    await expect(page.getByTestId("roster")).toContainText("Nok");
    await expect(page.getByTestId("coach-board")).toBeVisible();
    await expect(page.getByTestId("formation-4-3-3")).toHaveCount(0);
    await expect(page.getByLabel("Your name")).toHaveCount(0);
    await expect(page.getByTestId("status-going")).toHaveCount(0);
    await expect(page.getByTestId("rsvp-submit")).toHaveCount(0);
    await guest.close();

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Still live then cancel");
    await orgPage.getByLabel("When / where").fill("Sat 09:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const cancelUrl = await shareUrlOf(orgPage);
    await orgPage.getByTestId("cancel-matchday").click();
    await orgPage.getByTestId("cancel-matchday-confirm").click();
    await orgPage.getByTestId("history-toggle").click();
    await expect(orgPage.getByTestId("cancelled-chip")).toBeVisible();

    const cancelGuest = await browser.newContext();
    const cancelPage = await cancelGuest.newPage();
    await cancelPage.goto(cancelUrl);
    await expect(cancelPage.getByTestId("matchday-cancelled")).toBeVisible();
    await expect(cancelPage.getByTestId("roster")).toHaveCount(0);
    await expect(cancelPage.getByLabel("Your name")).toHaveCount(0);
    await cancelGuest.close();

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Wipe after complete");
    await orgPage.getByLabel("When / where").fill("Sun 11:00");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const deleteUrl = await shareUrlOf(orgPage);
    orgPage.once("dialog", (dialog) => dialog.accept());
    await orgPage.getByTestId("delete-matchday").click();

    const goneGuest = await browser.newContext();
    const gonePage = await goneGuest.newPage();
    await gonePage.goto(deleteUrl);
    await expect(gonePage.getByTestId("matchday-gone")).toContainText(/deleted/i);
    await goneGuest.close();
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
    await expect(page.getByTestId("event-card")).toBeVisible();
    await expect(page.getByTestId("add-friend")).toBeVisible();
    await expect(page.getByRole("heading", { name: /i.?m going/i })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("heading", { name: /add someone else/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Friend's name")).toHaveAttribute(
      "placeholder",
      new RegExp(`^(${FOOTBALL_FIRST_NAMES.join("|")})$`),
    );
    await expect(page.getByLabel("Friend's name")).not.toHaveAttribute(
      "placeholder",
      /^(Bee|Nok)$/i,
    );
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

  test("crowded chip keeps the name with stroked +N on the pill; CAM/CDM sit on CM; Out collapses", async ({
    browser,
  }) => {
    const organiser = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
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

    await guestGoing(browser, shareUrl, "Dan", "LW");
    await guestGoing(browser, shareUrl, "Tim", "LW");
    await guestGoing(browser, shareUrl, "Mit", "LW");
    await guestGoing(browser, shareUrl, "Job", "RW");
    await guestGoing(browser, shareUrl, "Pat", "RW");
    await guestGoing(browser, shareUrl, "Sam", "RW");
    await guestGoing(browser, shareUrl, "Joe", "CAM");
    await guestGoing(browser, shareUrl, "Wee", "CDM");
    await guestGoing(browser, shareUrl, "Jet", "GK");
    await guestGoing(browser, shareUrl, "Ben", "GK");

    await orgPage.reload();
    await orgPage.getByTestId("formation-4-3-3").click();
    const slot = orgPage.getByTestId("slot-filled-LW");
    await expect(slot).toContainText("Dan");
    await expect(slot).not.toContainText("Tim");
    await expect(slot).not.toContainText("Mit");
    await expect(slot).toContainText("LW");
    const name = orgPage.getByTestId("slot-lead-LW");
    const nameSize = await fontSizeOf(name);
    const abbrSize = await fontSizeOf(orgPage.getByTestId("slot-abbr-LW"));
    expect(nameSize).toBeGreaterThan(abbrSize);
    expect(nameSize).toBeGreaterThanOrEqual(18);
    const badge = orgPage.getByTestId("slot-overflow-LW");
    await expect(badge).toHaveText("+2");
    await expect(badge).not.toHaveClass(/rounded-full/);
    await expect(badge).not.toHaveClass(/\bring-/);
    const badgeLook = await badge.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        background: s.backgroundColor,
        radius: s.borderRadius,
        color: s.color,
        stroke: s.getPropertyValue("-webkit-text-stroke"),
        paintOrder: s.paintOrder,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      };
    });
    expect(badgeLook.background).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(Number.parseFloat(badgeLook.radius) || 0).toBe(0);
    expect(badgeLook.color).toMatch(/rgb\(\s*26,\s*23,\s*20\s*\)/);
    expect(badgeLook.stroke).toMatch(/px/);
    const strokePx = Number.parseFloat(badgeLook.stroke);
    expect(strokePx).toBeGreaterThanOrEqual(3);
    expect(strokePx).toBeLessThanOrEqual(3.5);
    expect(badgeLook.paintOrder).toMatch(/stroke/i);
    expect(badgeLook.width).toBeGreaterThan(badgeLook.height);
    await assertOverflowOnPill(orgPage, "LW", "+2");
    await saveChipShot(slot, "name-plus-n.png");
    await expect(orgPage.getByTestId("slot-filled-RW")).toContainText("Job");
    await assertOverflowOnPill(orgPage, "RW", "+2");
    await saveChipShot(orgPage.getByTestId("slot-filled-RW"), "crowded-chip-job.png");
    await expect(orgPage.getByTestId("slot-filled-GK")).toContainText("Jet");
    await assertOverflowOnPill(orgPage, "GK", "+1");
    await saveChipShot(orgPage.getByTestId("slot-filled-GK"), "crowded-chip-jet.png");
    await saveShot(orgPage.getByTestId("half-pitch"), "crowded-pitch-mobile.png");
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
    const landing = await browser.newPage();
    await landing.goto("/");
    await expect(
      landing.getByRole("heading", {
        name: "Paste a link. Get your squad signed up.",
      }),
    ).toBeVisible();
    await expect(
      landing.getByText(
        "Create friendly matches — football, basketball, and more. Get the squad signed up and manage the roster in one link.",
      ),
    ).toBeVisible();
    await expect(landing.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      "Paste a link. Get your squad signed up.",
    );
    const landingOg = await landing.request.get("/opengraph-image");
    expect(landingOg.ok()).toBeTruthy();
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    writeFileSync(join(SCREENSHOT_DIR, "og-landing.png"), await landingOg.body());
    await landing.close();

    const host = await browser.newContext();
    const hostPage = await host.newPage();
    await signIn(hostPage, `mark+host+${Date.now()}@example.com`);
    await expect(
      hostPage.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", "Paste a link. Get your squad signed up.");
    const boardOg = await hostPage.request.get("/board/opengraph-image");
    expect(boardOg.ok()).toBeTruthy();
    writeFileSync(join(SCREENSHOT_DIR, "og-board.png"), await boardOg.body());
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

  test("Share update copies ?v=; OG Low stamp and pulse body", async ({
    browser,
  }) => {
    test.setTimeout(45_000);
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+pulse+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Pulse game");
    await orgPage.getByLabel("When / where").fill("Sat 18:00 · Court 2");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByTestId("share-update")).toBeVisible();
    await orgPage.screenshot({
      path: join(SCREENSHOT_DIR, "share-update-board.png"),
      fullPage: true,
    });
    const shareUrl = await shareUrlOf(orgPage);
    expect(shareUrl).toMatch(/\/m\/[^/?]+$/);
    expect(shareUrl).not.toContain("?v=");

    const guestPage = await browser.newPage();
    await guestPage.goto(shareUrl);
    await expect(guestPage.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Signup now for Pulse game — powered by SKWAD",
    );
    await expect(
      guestPage.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", "Sat 18:00 · Court 2");
    await guestPage.close();

    await guestGoing(browser, shareUrl, "Aek", "GK");
    await guestGoing(browser, shareUrl, "Bee", "GK");
    await guestOut(browser, shareUrl, "Nok");

    const pulsed = await browser.newPage();
    await pulsed.goto(shareUrl);
    await expect(pulsed.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Signup now for Pulse game — powered by SKWAD",
    );
    await expect(
      pulsed.locator('meta[property="og:description"]'),
    ).toHaveAttribute(
      "content",
      "2 Going · 1 Out · Too many GKs · need a CB · Sat 18:00 · Court 2",
    );
    const ogImage = pulsed.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /opengraph-image\?v=/);
    const lowOg = await pulsed.request.get(`${shareUrl}/opengraph-image`);
    expect(lowOg.ok()).toBeTruthy();
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    writeFileSync(join(SCREENSHOT_DIR, "og-stamp-low.png"), await lowOg.body());
    await pulsed.close();

    await orgPage.reload();
    await orgPage.getByTestId("share-update").click();
    await expect(orgPage.getByTestId("share-update")).toHaveText("Copied");
    const updateUrl = await orgPage.getByTestId("share-update-url").textContent();
    expect(updateUrl ?? "").toMatch(/\?v=\d+/);
    expect(updateUrl ?? "").toContain(shareUrl);
    const copied = await orgPage.getByTestId("share-update-text").textContent();
    expect(copied).toContain("Signup now for Pulse game — powered by SKWAD");
    expect(copied).toContain(
      "2 Going · 1 Out · Too many GKs · need a CB · Sat 18:00 · Court 2",
    );
    expect(copied).toContain("?v=");
    expect(await shareUrlOf(orgPage)).toBe(shareUrl);

    await organiser.close();
  });

  test("OG stamps Enough and Enough+Out; completed hides Share update", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+enough+${Date.now()}@example.com`);

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByTestId("sport-basketball").click();
    await orgPage.getByLabel("Title").fill("Enough run");
    await orgPage.getByLabel("When / where").fill("Tue 20:00 · Court 1");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    const enoughUrl = await shareUrlOf(orgPage);
    await guestGoing(browser, enoughUrl, "Dan", "C");
    await guestGoing(browser, enoughUrl, "Pat", "PF");
    await guestGoing(browser, enoughUrl, "Sam", "SF");
    await guestGoing(browser, enoughUrl, "Joe", "SG");
    await guestGoing(browser, enoughUrl, "Wee", "PG");

    const enoughPage = await browser.newPage();
    await enoughPage.goto(enoughUrl);
    await expect(
      enoughPage.locator('meta[property="og:title"]'),
    ).toHaveAttribute(
      "content",
      "Signup now for Enough run — powered by SKWAD",
    );
    await expect(
      enoughPage.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", "5 Going · Tue 20:00 · Court 1");
    const enoughOg = await enoughPage.request.get(
      `${enoughUrl}/opengraph-image`,
    );
    expect(enoughOg.ok()).toBeTruthy();
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    writeFileSync(
      join(SCREENSHOT_DIR, "og-stamp-enough.png"),
      await enoughOg.body(),
    );
    await enoughPage.close();

    await guestOut(browser, enoughUrl, "Aek");
    const outPage = await browser.newPage();
    await outPage.goto(enoughUrl);
    await expect(
      outPage.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", "5 Going · 1 Out · Tue 20:00 · Court 1");
    const outOg = await outPage.request.get(`${enoughUrl}/opengraph-image`);
    expect(outOg.ok()).toBeTruthy();
    writeFileSync(
      join(SCREENSHOT_DIR, "og-stamp-enough-out.png"),
      await outOg.body(),
    );
    await outPage.close();

    await orgPage.getByTestId("complete-matchday").click();
    await orgPage.getByTestId("complete-matchday-confirm").click();
    await orgPage.getByTestId("history-toggle").click();
    await orgPage.getByRole("link", { name: "Enough run" }).click();
    await expect(orgPage.getByTestId("completed-chip")).toBeVisible();
    await expect(orgPage.getByTestId("share-update")).toHaveCount(0);
    await expect(orgPage.getByTestId("copy-link")).toBeVisible();

    const cron = await orgPage.request.get("/api/cron/og-refresh");
    expect(cron.ok()).toBeTruthy();
    const cronBody = (await cron.json()) as { ok: boolean };
    expect(cronBody.ok).toBe(true);

    await organiser.close();
  });

  test("History is collapsed; empty History hidden; event card + calendar", async ({
    browser,
  }) => {
    test.setTimeout(45_000);
    const organiser = await browser.newContext();
    const orgPage = await organiser.newPage();
    await signIn(orgPage, `mark+event+${Date.now()}@example.com`);
    await expect(orgPage.getByTestId("history")).toHaveCount(0);
    await expect(orgPage.getByTestId("active-empty")).toContainText(
      "No upcoming matches — create one.",
    );

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("Dated kickabout");
    await orgPage.getByTestId("start-date").fill("2026-10-03");
    await orgPage.getByTestId("start-time").fill("20:00");
    await orgPage.getByTestId("end-time").fill("22:00");
    await orgPage.getByLabel("Place").fill("Lumphini pitch 2");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByRole("heading", { name: "Dated kickabout" })).toBeVisible();
    await expect(orgPage.getByTestId("when-where")).toHaveText(
      "Sat 3 Oct 2026 · 20:00 · Lumphini pitch 2",
    );

    await orgPage.getByRole("link", { name: /^edit$/i }).click();
    await expect(orgPage.getByTestId("start-date")).toHaveValue("2026-10-03");
    await expect(orgPage.getByTestId("start-time")).toHaveValue("20:00");
    await expect(orgPage.getByTestId("end-time")).toHaveValue("22:00");
    await orgPage.getByLabel("Place").fill("Court 1");
    await orgPage.getByRole("button", { name: /^save$/i }).click();
    await expect(orgPage.getByTestId("when-where")).toHaveText(
      "Sat 3 Oct 2026 · 20:00 · Court 1",
    );

    const datedUrl = await shareUrlOf(orgPage);
    const guest = await browser.newContext();
    const page = await guest.newPage();
    await page.goto(datedUrl);
    await expect(page.getByTestId("signup-helper")).toBeVisible();
    await expect(page.getByTestId("add-to-calendar")).toHaveCount(0);
    await page.getByLabel("Your name").fill("Nok");
    await page.getByTestId("status-going").click();
    await page.getByTestId("position-CB").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("event-card")).toBeVisible();
    await expect(page.getByTestId("event-when")).toHaveText(
      "Sat 3 Oct 2026 · 20:00",
    );
    await expect(page.getByTestId("event-where")).toHaveText("Court 1");
    await expect(page.getByTestId("event-counts")).toHaveText("Going · 1");
    await expect(page.getByTestId("add-to-calendar")).toBeVisible();
    await expect(page.getByTestId("change-status")).toHaveText("Change status");
    const ics = await page.request.get(`${datedUrl}/calendar`);
    expect(ics.ok()).toBeTruthy();
    expect(ics.headers()["content-type"]).toMatch(/text\/calendar/);
    const icsBody = await ics.text();
    expect(icsBody).toContain("DTSTART:20261003T130000Z");
    expect(icsBody).toContain("DTEND:20261003T150000Z");
    expect(icsBody).toContain("LOCATION:Court 1");

    await page.getByTestId("change-status").click();
    await expect(page.getByRole("heading", { name: /i.?m going/i })).toBeVisible();
    await page.getByTestId("status-out").click();
    await page.getByTestId("rsvp-submit").click();
    await expect(page.getByTestId("rsvp-confirmed")).toContainText(/out/i);
    await expect(page.getByTestId("event-counts")).toHaveText(
      "Going · 0 · Out · 1",
    );
    await guest.close();

    await orgPage.goto("/board");
    await expect(orgPage.getByTestId("history")).toHaveCount(0);
    await expect(orgPage.getByTestId("active-matchdays")).toContainText(
      "Dated kickabout",
    );

    await orgPage.getByRole("link", { name: /new matchday/i }).click();
    await orgPage.getByLabel("Title").fill("TBD night");
    await orgPage.getByRole("button", { name: /create matchday/i }).click();
    await expect(orgPage.getByTestId("when-where")).toHaveText("TBD");
    const tbdUrl = await shareUrlOf(orgPage);
    const tbdGuest = await browser.newContext();
    const tbdPage = await tbdGuest.newPage();
    await tbdPage.goto(tbdUrl);
    await tbdPage.getByLabel("Your name").fill("Bee");
    await tbdPage.getByTestId("status-going").click();
    await tbdPage.getByTestId("position-CB").click();
    await tbdPage.getByTestId("rsvp-submit").click();
    await expect(tbdPage.getByTestId("event-when")).toHaveText("TBD");
    await expect(tbdPage.getByTestId("event-where")).toHaveText("TBD");
    await expect(tbdPage.getByTestId("add-to-calendar")).toHaveCount(0);
    const missing = await tbdPage.request.get(`${tbdUrl}/calendar`);
    expect(missing.status()).toBe(404);
    await tbdGuest.close();

    await orgPage.getByTestId("complete-matchday").click();
    await orgPage.getByTestId("complete-matchday-confirm").click();
    await expect(orgPage.getByTestId("history")).toBeVisible();
    await expect(orgPage.getByTestId("completed-chip")).toBeHidden();
    await orgPage.getByTestId("history-toggle").click();
    await expect(orgPage.getByTestId("completed-chip")).toHaveText("Completed");

    await organiser.close();
  });
});

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Skwad" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /magic link/i }).click();
  await expect(page.getByTestId("magic-link-sent")).toHaveCount(0);
  const magic = page.getByTestId("debug-magic-link");
  await expect(magic).toBeVisible();
  await magic.click();
  await expect(page).toHaveURL(/\/board/, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: "+ New matchday" })).toBeVisible();
  await expect(page.getByTestId("tab-invited")).toBeVisible();
  await expect(page.getByTestId("tab-hosting")).toBeVisible();
  await expect(
    page.getByText("No upcoming matches — create one."),
  ).toBeVisible();
  await expect(page.getByTestId("history")).toHaveCount(0);
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

/** Chip crop with padding so rim-nudged +N is not clipped. */
async function saveChipShot(locator: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`no bounding box for ${filename}`);
  }
  const pad = 28;
  const page = locator.page();
  const vp = page.viewportSize() ?? { width: 1280, height: 720 };
  const x = Math.min(Math.max(0, box.x - pad), Math.max(0, vp.width - 1));
  const y = Math.min(Math.max(0, box.y - pad), Math.max(0, vp.height - 1));
  const width = Math.max(1, Math.min(vp.width - x, box.width + pad * 2));
  const height = Math.max(1, Math.min(vp.height - y, box.height + pad * 2));
  await page.screenshot({
    path: join(SCREENSHOT_DIR, filename),
    clip: { x, y, width, height },
  });
}

/** +N center sits on the teal top-right rim (~half on-pill). Centered name; slight overlap OK. */
async function assertOverflowOnPill(
  page: Page,
  slotKey: string,
  label: string,
) {
  const slot = page.getByTestId(`slot-filled-${slotKey}`);
  const name = page.getByTestId(`slot-lead-${slotKey}`);
  const badge = page.getByTestId(`slot-overflow-${slotKey}`);
  await expect(badge).toHaveText(label);
  const slotBox = await slot.boundingBox();
  const nameBox = await name.boundingBox();
  const badgeBox = await badge.boundingBox();
  expect(slotBox && nameBox && badgeBox).toBeTruthy();
  const nameCx = nameBox!.x + nameBox!.width / 2;
  const slotCx = slotBox!.x + slotBox!.width / 2;
  expect(Math.abs(nameCx - slotCx)).toBeLessThan(8);
  const badgeCx = badgeBox!.x + badgeBox!.width / 2;
  const badgeCy = badgeBox!.y + badgeBox!.height / 2;
  const alongX = (badgeCx - slotBox!.x) / slotBox!.width;
  const alongY = (badgeCy - slotBox!.y) / slotBox!.height;
  expect(alongX).toBeGreaterThan(0.72);
  expect(alongX).toBeLessThan(0.98);
  expect(alongY).toBeGreaterThan(0.02);
  expect(alongY).toBeLessThan(0.32);
  const overlapX =
    Math.min(badgeBox!.x + badgeBox!.width, slotBox!.x + slotBox!.width) -
    Math.max(badgeBox!.x, slotBox!.x);
  const overlapY =
    Math.min(badgeBox!.y + badgeBox!.height, slotBox!.y + slotBox!.height) -
    Math.max(badgeBox!.y, slotBox!.y);
  const onPill = Math.max(0, overlapX) * Math.max(0, overlapY);
  const ratio = onPill / (badgeBox!.width * badgeBox!.height);
  expect(ratio).toBeGreaterThanOrEqual(0.35);
}

async function fontSizeOf(locator: Locator) {
  return locator.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
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
