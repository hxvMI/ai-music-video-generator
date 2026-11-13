import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  use: { baseURL: "http://localhost:3000", viewport: { width: 1440, height: 1000 },
    channel: "msedge", screenshot: "only-on-failure" },
  webServer: { command: "npm.cmd run dev -- --port 3000", url: "http://localhost:3000", reuseExistingServer: true },
});
