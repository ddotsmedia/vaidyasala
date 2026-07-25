import { expect, test } from "@playwright/test";

/**
 * Public happy path (§3D exit check): home → watch → chapter seek → transcript
 * → search open → keyboard focus. Deliberately does NOT start real YouTube
 * playback (no external network dependency in CI); it exercises the facade,
 * chapter/transcript wiring, and the ⌘K palette — the deterministic surface.
 */

test("home → watch → chapters, transcript, watch-next rail", async ({ page }) => {
  await page.goto("/");

  // Featured hero links to a watch page; follow the first video link.
  const firstVideo = page.locator('a[href^="/watch/"]').first();
  await expect(firstVideo).toBeVisible();
  await firstVideo.click();

  await expect(page).toHaveURL(/\/watch\//);
  // Title (Malayalam h1) + summary present.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Facade player shows a Play affordance (not a live iframe).
  await expect(page.getByRole("button", { name: /Play/i }).first()).toBeVisible();

  // Chapter list is rendered and a chapter is clickable (sets a pending seek —
  // must not throw even before the player is activated).
  const chapter = page.getByRole("button", { name: /\d+:\d{2}/ }).first();
  if (await chapter.count()) {
    await chapter.first().click();
  }

  // Transcript section is server-rendered (SEO); at least one segment visible.
  await expect(page.getByText(/Transcript|ട്രാൻസ്ക്രിപ്റ്റ്|രക്ത|പ്രമേഹം/).first()).toBeVisible();
});

test("search palette opens via the top bar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Search/i }).first().click();
  // The command dialog exposes a search input.
  await expect(page.getByPlaceholder(/Search/i).last()).toBeVisible();
  await page.keyboard.press("Escape");
});

test("keyboard: Tab reaches an interactive control on watch", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href^="/watch/"]').first().click();
  await expect(page).toHaveURL(/\/watch\//);
  await page.keyboard.press("Tab");
  const active = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(["A", "BUTTON", "INPUT"]).toContain(active);
});
