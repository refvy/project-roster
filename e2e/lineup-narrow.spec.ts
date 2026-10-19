import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SCREENSHOT_DIR = join(
  process.cwd(),
  "test-results",
  "screenshots",
  "lineup",
);

const FORMATIONS = ["4-4-2", "4-3-3", "4-1-4-1", "3-5-2"] as const;

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 430, height: 932 },
] as const;

/** Widest row, left to right. Long names land on the outside slots. */
const WIDE_ROW: Record<(typeof FORMATIONS)[number], string[]> = {
  "4-4-2": ["Christopher", "Bartholomew", "Alexandros", "Maximiliano"],
  "4-3-3": ["Christopher", "Bartholomew", "Alexandros", "Maximiliano"],
  "4-1-4-1": ["Christopher", "Bartholomew", "Alexandros", "Maximiliano"],
  "3-5-2": [
    "Maximiliano",
    "Christopher",
    "Bartholomew",
    "Alexandros",
    "Sebastian",
  ],
};

const WIDE_KEYS: Record<(typeof FORMATIONS)[number], string[]> = {
  "4-4-2": ["LB", "CB", "CB", "RB"],
  "4-3-3": ["LB", "CB", "CB", "RB"],
  "4-1-4-1": ["LW", "CM", "CM", "RW"],
  "3-5-2": ["LW", "CM", "CAM", "CM", "RW"],
};

/** Short names on rows of 1 or 2, so those chips stay pills. */
const PILL_NAMES = ["Cristiano", "Mohamed", "Jonathan"] as const;

const PILL_ROW: Record<
  (typeof FORMATIONS)[number],
  { key: string; name: (typeof PILL_NAMES)[number] }[]
> = {
  "4-4-2": [
    { key: "GK", name: "Cristiano" },
    { key: "ST", name: "Mohamed" },
    { key: "ST", name: "Jonathan" },
  ],
  "4-3-3": [{ key: "GK", name: "Cristiano" }],
  "4-1-4-1": [
    { key: "GK", name: "Cristiano" },
    { key: "CDM", name: "Mohamed" },
    { key: "ST", name: "Jonathan" },
  ],
  "3-5-2": [
    { key: "GK", name: "Cristiano" },
    { key: "ST", name: "Mohamed" },
    { key: "ST", name: "Jonathan" },
  ],
};

test("every formation fits at 320, 375 and 430 with names ellipsized", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const organiser = await browser.newContext();
  const page = await organiser.newPage();
  await signIn(page, `mark+narrow+${Date.now()}@example.com`);
  await page.getByRole("link", { name: /new matchday/i }).click();
  await page.getByLabel("Title").fill("TEST narrow lineup");
  await page.getByRole("button", { name: /create matchday/i }).click();
  await expect(page.getByRole("heading", { name: "TEST narrow lineup" })).toBeVisible();
  const shareUrl = ((await page.getByTestId("share-url").textContent()) ?? "")
    .replace(/\s+/g, "")
    .trim();

  for (const name of [
    "Maximiliano",
    "Sebastian",
    "Christopher",
    "Bartholomew",
    "Alexandros",
    ...PILL_NAMES,
  ]) {
    await guestGoing(browser, shareUrl, name, "ANY");
  }
  await page.reload();
  await page.getByTestId("create-lineup").click();
  await expect(page.getByTestId("lineup-editor")).toBeVisible();

  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  for (const formation of FORMATIONS) {
    await page.getByTestId(`lineup-formation-${formation}`).click();
    await expect(page.getByTestId(`lineup-formation-${formation}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const keys = WIDE_KEYS[formation];
    const names = WIDE_ROW[formation];
    for (let i = 0; i < keys.length; i += 1) {
      await assignSlot(page, keys[i]!, names[i]!);
    }
    for (const pill of PILL_ROW[formation]) {
      await assignSlot(page, pill.key, pill.name);
    }

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const editor = page.getByTestId("lineup-editor");
      const pitch = editor.getByTestId("lineup-pitch");
      await expect(pitch).toBeVisible();
      const gkBox = await editor.locator('[data-slot-key="GK"]').boundingBox();
      const footerBox = await page.getByTestId("lineup-editor-footer").boundingBox();
      expect(gkBox && footerBox).toBeTruthy();
      expect(gkBox!.y + gkBox!.height).toBeLessThanOrEqual(footerBox!.y + 2);

      const measured = await pitch.evaluate((el) => {
        const pitchRect = el.getBoundingClientRect();
        const lineLeft = pitchRect.left + pitchRect.width * (24 / 600);
        const lineRight = pitchRect.right - pitchRect.width * (24 / 600);
        const lineTop = pitchRect.top + pitchRect.height * (24 / 800);
        const lineBottom = pitchRect.bottom - pitchRect.height * (24 / 800);
        function visibleChars(name: Element) {
          const text = name.textContent ?? "";
          const available = (name as HTMLElement).clientWidth;
          if (!text) return 0;
          const style = getComputedStyle(name);
          const probe = document.createElement("span");
          probe.style.position = "absolute";
          probe.style.visibility = "hidden";
          probe.style.whiteSpace = "nowrap";
          probe.style.font = style.font;
          probe.style.letterSpacing = style.letterSpacing;
          document.body.appendChild(probe);
          const widthOf = (sample: string) => {
            probe.textContent = sample;
            return probe.getBoundingClientRect().width;
          };
          let fitted = text.length;
          if (widthOf(text) > available + 0.5) {
            fitted = 0;
            for (let i = 1; i <= text.length; i += 1) {
              if (widthOf(`${text.slice(0, i)}…`) <= available + 0.5) fitted = i;
              else break;
            }
          }
          probe.remove();
          return fitted;
        }
        return {
          pitchWidth: pitchRect.width,
          pitchLeft: pitchRect.left,
          chips: [...el.querySelectorAll("[data-slot-key]")].map((chip) => {
            const rect = chip.getBoundingClientRect();
            const cell = chip.parentElement?.getBoundingClientRect();
            const name = chip.querySelector("[data-testid='lineup-slot-name']");
            const nameStyle = name ? getComputedStyle(name) : null;
            return {
              key: chip.getAttribute("data-slot-key"),
              text: name?.textContent ?? "",
              ariaLabel: chip.getAttribute("aria-label"),
              left: rect.left - (lineLeft + 8),
              right: lineRight - 8 - rect.right,
              top: rect.top - (lineTop + 8),
              bottom: lineBottom - 8 - rect.bottom,
              insidePitch:
                rect.left >= pitchRect.left - 0.5 &&
                rect.right <= pitchRect.right + 0.5 &&
                rect.top >= pitchRect.top - 0.5 &&
                rect.bottom <= pitchRect.bottom + 0.5,
              cellGap: cell ? cell.width - rect.width : null,
              chipWidth: rect.width,
              cellWidth: cell?.width ?? null,
              x: rect.left,
              y: rect.top,
              h: rect.height,
              fontSize: nameStyle ? Number.parseFloat(nameStyle.fontSize) : null,
              pad: Number.parseFloat(getComputedStyle(chip).paddingLeft),
              rowCount: chip.parentElement?.parentElement?.children.length ?? 0,
              visibleChars: name ? visibleChars(name) : null,
              ellipsis: name
                ? {
                    overflow: nameStyle!.textOverflow,
                    whiteSpace: nameStyle!.whiteSpace,
                    truncated:
                      (name as HTMLElement).scrollWidth > name.clientWidth + 1,
                  }
                : null,
            };
          }),
        };
      });
      const chips = measured.chips;
      const tightRow = (rowCount: number) =>
        rowCount >= 5 && (viewport.width < 360 || measured.pitchWidth < 360);

      expect(chips.length).toBeGreaterThanOrEqual(11);
      for (const chip of chips) {
        const label = `${formation} ${viewport.width} ${chip.key} ${chip.text}`;
        expect(chip.left, label).toBeGreaterThanOrEqual(-1);
        expect(chip.right, label).toBeGreaterThanOrEqual(-1);
        expect(chip.top, label).toBeGreaterThanOrEqual(-1);
        expect(chip.bottom, label).toBeGreaterThanOrEqual(-1);
        expect(chip.insidePitch, label).toBe(true);
        if (chip.text) {
          expect(chip.ariaLabel, label).toBe(chip.text);
        }
        const narrow = viewport.width < 360 || measured.pitchWidth < 360;
        const fourWide = chip.rowCount === 4 && narrow;
        const tight = tightRow(chip.rowCount);
        if (tight) {
          expect(chip.cellGap, label).toBeGreaterThan(1);
          expect(chip.cellGap, label).toBeLessThan(3.5);
          expect(chip.chipWidth, label).toBeGreaterThanOrEqual(
            (chip.cellWidth ?? 0) - 2.5,
          );
          expect(chip.pad, label).toBe(4);
          expect(chip.fontSize, label).toBe(11);
        } else if (fourWide) {
          expect(chip.chipWidth, label).toBeLessThanOrEqual((chip.cellWidth ?? 0) - 3);
          expect(chip.pad, label).toBe(4);
          if (chip.fontSize) expect(chip.fontSize, label).toBe(11);
        } else {
          expect(chip.chipWidth, label).toBeLessThanOrEqual((chip.cellWidth ?? 0) - 3);
          const stepped = viewport.width <= 320 || chip.rowCount >= 5;
          expect(chip.pad, label).toBe(stepped ? 8 : 12);
          if (chip.fontSize) {
            expect(chip.fontSize, label).toBe(stepped ? 12 : 14);
          }
        }
        if (
          viewport.width === 375 &&
          chip.rowCount <= 2 &&
          (PILL_NAMES as readonly string[]).includes(chip.text)
        ) {
          expect(chip.chipWidth, label).toBeGreaterThanOrEqual(80);
          expect(chip.chipWidth, label).toBeLessThanOrEqual(120);
          expect(chip.chipWidth, label).toBeLessThan((chip.cellWidth ?? 0) * 0.85);
        }
        if (viewport.width === 375 && chip.rowCount === 4 && chip.text) {
          expect(chip.visibleChars, label).toBeGreaterThanOrEqual(8);
        }
        if (
          chip.ellipsis &&
          (chip.text === "Maximiliano" || chip.text === "Sebastian") &&
          viewport.width <= 375
        ) {
          expect(chip.ellipsis.overflow, label).toBe("ellipsis");
          expect(chip.ellipsis.whiteSpace, label).toBe("nowrap");
          expect(chip.text, label).not.toBe("Maximili");
          if ((chip.visibleChars ?? chip.text.length) < chip.text.length) {
            expect(chip.ellipsis.truncated, label).toBe(true);
          }
        }
        if (
          formation === "3-5-2" &&
          viewport.width === 320 &&
          chip.rowCount >= 5 &&
          chip.text
        ) {
          expect(chip.visibleChars, label).toBeGreaterThanOrEqual(3);
          expect(chip.ellipsis?.truncated, label).toBe(true);
        }
      }

      const rows = groupRows(chips);
      for (const row of rows) {
        const sorted = [...row].sort((a, b) => a.x - b.x);
        for (let i = 1; i < sorted.length; i += 1) {
          expect(
            sorted[i]!.x,
            `${formation} ${viewport.width} overlap ${sorted[i - 1]!.key}/${sorted[i]!.key}`,
          ).toBeGreaterThanOrEqual(sorted[i - 1]!.x + sorted[i - 1]!.chipWidth - 1);
        }
        sorted.forEach((chip, index) => {
          const center = chip.x + chip.chipWidth / 2;
          const expected =
            measured.pitchLeft + ((index + 0.5) / sorted.length) * measured.pitchWidth;
          expect(
            Math.abs(center - expected),
            `${formation} ${viewport.width} spread ${chip.key}`,
          ).toBeLessThan(measured.pitchWidth * 0.08);
        });
      }

      if (viewport.width === 320 || viewport.width === 375) {
        await page.screenshot({
          path: join(SCREENSHOT_DIR, `lineup-${viewport.width}-${formation}.png`),
        });
      }
    }
  }

  await organiser.close();
});

function groupRows<T extends { y: number }>(chips: T[]) {
  const groups: T[][] = [];
  for (const chip of chips) {
    const group = groups.find((row) => Math.abs(row[0]!.y - chip.y) < 8);
    if (group) group.push(chip);
    else groups.push([chip]);
  }
  return groups;
}

async function assignSlot(page: Page, key: string, name: string) {
  await page
    .locator(
      `[data-testid="lineup-editor"] [data-slot-key="${key}"][data-filled="false"]`,
    )
    .first()
    .click();
  await page.getByTestId("lineup-picker-person").filter({ hasText: name }).click();
  await expect(page.getByTestId("lineup-picker")).toHaveCount(0);
}

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /magic link/i }).click();
  await page.getByTestId("debug-magic-link").click();
  await expect(page).toHaveURL(/\/board/, { timeout: 15_000 });
}

async function guestGoing(
  browser: Browser,
  shareUrl: string,
  name: string,
  position: string,
) {
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto(shareUrl);
  await guest.getByLabel("Your name").fill(name);
  await guest.getByTestId("status-going").click();
  await guest.getByTestId(`position-${position}`).click();
  await guest.getByTestId("rsvp-submit").click();
  await expect(guest.getByTestId("rsvp-confirmed")).toContainText(/going/i);
  await context.close();
}
