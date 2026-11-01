import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { E2E_MAIL_DIR } from "../../playwright.config";

// Test-only accounts created by global-setup in the e2e database.
export const USERS = {
  /** Super Admin */
  admin: { email: "e2e-admin@vdproperties.test", password: "E2e-Super-Admin-2026" },
  /** Admin: publishes listings, approves submissions, manages staff */
  property: { email: "e2e-property@vdproperties.test", password: "E2e-Property-Mgr-2026" },
  /** Staff */
  enquiry: { email: "e2e-enquiry@vdproperties.test", password: "E2e-Enquiry-Mgr-2026" },
  /** Staff assigned as a BuildTrace project manager */
  pm: { email: "e2e-pm@vdproperties.test", password: "E2e-Project-Mgr-2026" },
  /** Zonal officer (zones are set up by the tests that need them) */
  zonal: { email: "e2e-zonal@vdproperties.test", password: "E2e-Zonal-Officer-2026" },
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

/** Waits for the newest captured email to this address and returns the link it contains. */
export async function linkFromEmail(to: string, contains: string) {
  for (let i = 0; i < 40; i++) {
    const files = await readdir(E2E_MAIL_DIR).catch(() => [] as string[]);
    for (const f of files.sort().reverse()) {
      const mail = JSON.parse(await readFile(path.join(E2E_MAIL_DIR, f), "utf8")) as { to: string; text: string };
      const link = mail.text.match(/https?:\/\/\S+/g)?.find((u) => u.includes(contains));
      if (mail.to === to && link) return new URL(link).pathname + new URL(link).search;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} with a link containing ${contains}`);
}

/** Public forms reject submissions made faster than a person could type. */
export async function waitLikeAPerson(page: Page) {
  await page.waitForTimeout(2800);
}
