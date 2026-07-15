import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal e2e config. The full happy-path suite (home→watch→chapter-seek→
 * watch-next, keyboard nav, search-open) lands in Phase 3D; for now a smoke
 * test guards the shell. CI runs this job as continue-on-error until Phase 3.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
