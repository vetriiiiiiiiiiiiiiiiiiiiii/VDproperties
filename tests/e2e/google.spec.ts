import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DB, MOCK_GOOGLE } from "../../playwright.config";
import { login, USERS } from "./fixtures";

const setGoogle = (page: Page, who: object) => page.request.post(`${MOCK_GOOGLE}/next`, { data: who });

test.describe.serial("Google sign-in", () => {
  const stamp = Date.now();
  const email = `google.${stamp}@example.test`;

  test("a new customer signs up with Google, confirmed and returned to where they were", async ({ page }) => {
    await setGoogle(page, { sub: `g-${stamp}`, email, email_verified: true, name: "Google Person" });
    await page.goto("/account/login?next=/sell");
    await page.getByRole("link", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/\/sell$/);
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Google");
    await expect(page.getByText("Please confirm your email")).toHaveCount(0);
  });

  test("the same Google account signs back in, in the chosen language", async ({ page }) => {
    await setGoogle(page, { sub: `g-${stamp}`, email, email_verified: true, name: "Google Person" });
    await page.goto("/ta/account/login");
    await page.locator('a[href^="/api/auth/google/start"]').click();
    await expect(page).toHaveURL(/\/ta\/account$/);
  });

  test("an unconfirmed password account is taken over by the real email owner", async ({ page, browser }) => {
    const victim = `claimed.${stamp}@example.test`;
    const password = "Attacker-Pass-2026";
    const squatter = await browser.newContext();
    const sp = await squatter.newPage();
    await sp.goto("/account/register");
    await sp.getByLabel("Your name").fill("Someone Else");
    await sp.getByLabel("Email", { exact: true }).fill(victim);
    await sp.getByLabel("Phone number").fill("98400 90001");
    await sp.getByLabel("Password").fill(password);
    await sp.locator('input[name="terms"]').check();
    await sp.getByRole("button", { name: "Create account" }).click();
    await expect(sp).toHaveURL(/\/account$/);

    await setGoogle(page, { sub: `v-${stamp}`, email: victim, email_verified: true, name: "Real Owner" });
    await page.goto("/account/login");
    await page.getByRole("link", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/\/account$/);

    await sp.goto("/account");
    await expect(sp).toHaveURL(/\/account\/login/);
    await sp.getByLabel("Email").fill(victim);
    await sp.getByLabel("Password").fill(password);
    await sp.getByRole("button", { name: "Sign in" }).click();
    await expect(sp.getByText("Incorrect email or password.")).toBeVisible();
    await squatter.close();
  });

  test("staff and unverified Google emails are refused", async ({ page }) => {
    await setGoogle(page, { sub: `s-${stamp}`, email: USERS.admin.email, email_verified: true, name: "Not Staff" });
    await page.goto("/account/login");
    await page.getByRole("link", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/error=google-staff/);
    expect((await page.request.get("/admin", { maxRedirects: 0 })).status()).not.toBe(200);

    await setGoogle(page, { sub: `u-${stamp}`, email: `unverified.${stamp}@example.test`, email_verified: false, name: "No" });
    await page.getByRole("link", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/error=google-unverified/);
    const db = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
    expect(await db.user.count({ where: { email: `unverified.${stamp}@example.test` } })).toBe(0);
    await db.$disconnect();
  });

  test("a forged callback is refused", async ({ page }) => {
    await page.goto("/api/auth/google/callback?code=abc&state=forged");
    await expect(page).toHaveURL(/error=google-failed/);
  });

  test("staff still sign in with their password", async ({ page }) => {
    await login(page, "admin");
  });
});
