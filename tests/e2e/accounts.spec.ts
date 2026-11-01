import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DB, E2E_MAIL_DIR } from "../../playwright.config";
import { linkFromEmail, login } from "./fixtures";

test.describe.serial("password reset, email confirmation and updates", () => {
  const stamp = Date.now();
  const user = { name: "Lakshmi Account", email: `lakshmi.${stamp}@example.test`, phone: "98400 80001", password: "Customer-Pass-2026" };
  const newPassword = "Brand-New-Pass-2026";

  async function signIn(page: Page, password: string) {
    await page.context().clearCookies();
    await page.goto("/account/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  test("a new account must confirm its email before listing a property", async ({ page }) => {
    await page.goto("/ta/account/register");
    await page.locator('[name="name"]').fill(user.name);
    await page.locator('[name="email"]').fill(user.email);
    await page.locator('[name="phone"]').fill(user.phone);
    await page.locator('[name="password"]').fill(user.password);
    await page.locator('[name="terms"]').check();
    await page.locator('main form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/ta\/account$/);

    await page.goto("/account");
    await expect(page.getByText("Please confirm your email")).toBeVisible();

    await page.goto("/account/listings/new");
    const form = page.locator("main form");
    await form.locator('[name="title"]').fill("Unconfirmed owner plot");
    await form.locator('[name="sellerAddress"]').fill("1 Test Road, Test Town");
    await form.locator('[name="declaration"]').check();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(form.getByRole("alert")).toContainText("Please confirm your email first");

    // The email is in the language they registered in, and the link keeps that language.
    const link = await linkFromEmail(user.email, "/account/verify");
    expect(link).toMatch(/^\/ta\/account\/verify/);
    await page.goto(link);
    await page.locator('main form button[type="submit"]').click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.goto("/account");
    await expect(page.getByText("Please confirm your email")).toHaveCount(0);

    // One use only.
    await page.goto(link);
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
  });

  test("forgotten passwords reset by a one-time link, ending old sessions", async ({ page, browser }) => {
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto("/account/login");
    await otherPage.getByLabel("Email").fill(user.email);
    await otherPage.getByLabel("Password").fill(user.password);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await expect(otherPage).toHaveURL(/\/account$/);

    await page.context().clearCookies();
    await page.goto("/account/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page).toHaveURL(/\/account\/forgot$/);
    // Unknown emails get exactly the same answer.
    await page.getByLabel("Email").fill(`nobody.${stamp}@example.test`);
    await page.getByRole("button", { name: "Send reset link" }).click();
    const answer = await page.getByRole("status").innerText();
    expect(answer).toContain("If that email is registered");
    const files = await readdir(E2E_MAIL_DIR);
    for (const f of files) expect(JSON.parse(await readFile(path.join(E2E_MAIL_DIR, f), "utf8")).to).not.toContain("nobody.");

    await page.goto("/account/forgot");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toHaveText(answer);
    const link = await linkFromEmail(user.email, "/account/reset");

    await page.goto(link);
    await page.locator('[name="password"]').fill("short");
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator("main .field-error")).toBeVisible();
    await page.locator('[name="password"]').fill(newPassword);
    await page.locator('main form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/account\/login\?reset=1/);

    await signIn(page, user.password);
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await signIn(page, newPassword);
    await expect(page).toHaveURL(/\/account$/);

    // The other device was signed out, and the link can't be reused.
    await otherPage.goto("/account");
    await expect(otherPage).toHaveURL(/\/account\/login/);
    await other.close();
    await page.goto(link);
    await expect(page.getByRole("link", { name: /Request a new link|புதிய இணைப்பை/ })).toBeVisible();
  });

  test("tokens are stored only as hashes", async () => {
    const db = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
    const link = await linkFromEmail(user.email, "/account/reset");
    const raw = new URLSearchParams(link.split("?")[1]).get("token")!;
    expect(await db.authToken.count({ where: { tokenHash: raw } })).toBe(0);
    await db.$disconnect();
  });

  test("staff enter Tamil text; only the Tamil site shows it", async ({ page }) => {
    await login(page, "property");
    await page.goto("/admin/projects");
    await page.goto("/admin/properties");
    await page.getByRole("link", { name: /East-facing residential plot/ }).first().click();
    await page.getByLabel("Title (Tamil)").fill("கிழக்கு நோக்கிய மாதிரி மனை");
    await page.getByRole("button", { name: "Save Tamil text" }).click();
    await expect(page.getByText("Tamil text saved.")).toBeVisible();
    await page.goto("/ta/properties/sample-plot-north-a12");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("கிழக்கு நோக்கிய மாதிரி மனை");
    await page.goto("/properties/sample-plot-north-a12");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("கிழக்கு");
  });

  test("the health check reports the database", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
