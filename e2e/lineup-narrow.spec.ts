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
      await page
        .locator(
          `[data-testid="lineup-editor"] [data-slot-key="${keys[i]}"][data-filled="false"]`,
        )
        .first()
        .click();
      await page
        .getByTestId("lineup-picker-person")
        .filter({ hasText: names[i]! })
        .click();
      await expect(page.getByTestId("lineup-picker")).toHaveCount(0);
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

      const chips = await pitch.evaluate((el) => {
        const pitchRect = el.getBoundingClientRect();
        const lineLeft = pitchRect.left + pitchRect.width * (24 / 600);
        const lineRight = pitchRect.right - pitchRect.width * (24 / 600);
        const lineTop = pitchRect.top + pitchRect.height * (24 / 800);
        const lineBottom = pitchRect.bottom - pitchRect.height * (24 / 800);
        return [...el.querySelectorAll("[data-slot-key]")].map((chip) => {
          const rect = chip.getBoundingClientRect();
          const cell = chip.parentElement?.getBoundingClientRect();
          const name = chip.querySelector("[data-testid='lineup-slot-name']");
          const nameStyle = name ? getComputedStyle(name) : null;
          return {
            key: chip.getAttribute("data-slot-key"),
            text: name?.textContent ?? "",
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
            fontSize: nameStyle ? Number.parseFloat(nameStyle.fontSize) : null,
            pad: Number.parseFloat(getComputedStyle(chip).paddingLeft),
            rowCount: chip.parentElement?.parentElement?.children.length ?? 0,
            ellipsis: name
              ? {
                  overflow: nameStyle!.textOverflow,
                  whiteSpace: nameStyle!.whiteSpace,
                  truncated: (name as HTMLElement).scrollWidth > name.clientWidth + 1,
                }
              : null,
          };
        });
      });

      expect(chips.length).toBeGreaterThanOrEqual(11);
      for (const chip of chips) {
        const label = `${formation} ${viewport.width} ${chip.key} ${chip.text}`;
        expect(chip.left, label).toBeGreaterThanOrEqual(-1);
        expect(chip.right, label).toBeGreaterThanOrEqual(-1);
        expect(chip.top, label).toBeGreaterThanOrEqual(-1);
        expect(chip.bottom, label).toBeGreaterThanOrEqual(-1);
        expect(chip.insidePitch, label).toBe(true);
        expect(chip.cellGap, label).toBeGreaterThan(3);
        expect(chip.cellGap, label).toBeLessThan(6);
        const stepped = viewport.width <= 320 || chip.rowCount >= 5;
        expect(chip.pad, label).toBe(stepped ? 8 : 12);
        if (chip.fontSize) {
          expect(chip.fontSize, label).toBe(stepped ? 12 : 14);
        }
        if (
          chip.ellipsis &&
          (chip.text === "Maximiliano" || chip.text === "Sebastian") &&
          viewport.width <= 375
        ) {
          expect(chip.ellipsis.overflow, label).toBe("ellipsis");
          expect(chip.ellipsis.whiteSpace, label).toBe("nowrap");
          expect(chip.text, label).not.toBe("Maximili");
          expect(chip.ellipsis.truncated, label).toBe(true);
        }
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
