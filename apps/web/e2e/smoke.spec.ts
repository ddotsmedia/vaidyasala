import { expect, test } from "@playwright/test";

test("home renders the shell and hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Vaidyasala" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("styleguide renders every section without crashing", async ({ page }) => {
  await page.goto("/styleguide");
  await expect(page.getByRole("heading", { name: "Vaidyasala Styleguide" })).toBeVisible();
  await expect(page.getByText("Buttons")).toBeVisible();
});
