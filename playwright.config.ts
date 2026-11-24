import { defineConfig } from "@playwright/test";

/**
 * E2E feliz (HP-QA-03): corre contra el stack real —
 * backend en :8080 + Postgres con `e2e/seed.sql` aplicado + este front en :3000.
 * `pnpm test:e2e` arranca `next dev` solo si :3000 no responde ya.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // el fixture es compartido — nada de paralelismo
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
