import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on a separate database.
 * Requires PostgreSQL (e.g. `npm run db:local`) and E2E_DATABASE_URL pointing at an empty test database.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://vdp:vdp_local_only@localhost:5434/vd_properties_test";

export const E2E_MAIL_DIR = ".e2e-mail";
export const MOCK_GOOGLE = "http://localhost:3201";

const env = {
  DATABASE_URL: E2E_DB,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  NEXT_DIST_DIR: ".next-e2e",
  UPLOAD_DIR: "./uploads-e2e",
  STORAGE_DRIVER: "local",
  FORM_RATE_LIMIT: "1000",
  LOGIN_RATE_LIMIT: "1000",
  REGISTER_RATE_LIMIT: "1000",
  ALLOW_INDEXING: "false",
  GOOGLE_CLIENT_ID: "e2e-google-client",
  GOOGLE_CLIENT_SECRET: "e2e-google-secret",
  GOOGLE_OAUTH_TEST_BASE: MOCK_GOOGLE,
  MAIL_FROM: "V D Properties <test@vdproperties.test>",
  MAIL_CAPTURE_DIR: E2E_MAIL_DIR,
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [{ command: "node tests/e2e/mock-google.mjs", url: `${MOCK_GOOGLE}/health`, reuseExistingServer: false }, {
    command: `npx prisma migrate deploy && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env,
  }],
});
