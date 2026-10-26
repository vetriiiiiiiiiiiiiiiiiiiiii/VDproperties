import { expect, type Page } from "@playwright/test";

// Test-only accounts created by global-setup in the e2e database.
export const USERS = {
  admin: { email: "e2e-admin@vdproperties.test", password: "E2e-Super-Admin-2026" },
  property: { email: "e2e-property@vdproperties.test", password: "E2e-Property-Mgr-2026" },
  enquiry: { email: "e2e-enquiry@vdproperties.test", password: "E2e-Enquiry-Mgr-2026" },
  pm: { email: "e2e-pm@vdproperties.test", password: "E2e-Project-Mgr-2026" },
};

export async function customerLogin(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/account/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

export async function login(page: Page, who: keyof typeof USERS) {
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(USERS[who].email);
  await page.getByLabel("Password").fill(USERS[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Public forms reject submissions made faster than a person could type. */
export async function waitLikeAPerson(page: Page) {
  await page.waitForTimeout(2800);
}
