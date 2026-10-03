import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  use: { baseURL: "http://127.0.0.1:8787", trace: "retain-on-failure" },
  webServer: { command: "npm run build && node --import tsx scripts/e2e-server.ts", url: "http://127.0.0.1:8787/studio/login", reuseExistingServer: false },
});
