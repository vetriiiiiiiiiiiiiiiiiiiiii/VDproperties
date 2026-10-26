import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DB } from "../../playwright.config";
import { DICTS } from "../../src/i18n/dict";
import { waitLikeAPerson } from "./fixtures";

const ta = DICTS.ta;

test.describe("Tamil and English", () => {
  test("English is the default and /en redirects to it", async ({ page }) => {
    await page.goto("/en/plots");
    await expect(page).toHaveURL(/\/plots$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-IN");
  });

  test("choosing Tamil keeps the page and stays in Tamil while browsing", async ({ page }) => {
    await page.goto("/plots");
    await page.getByRole("banner").getByRole("group", { name: "Language" }).getByRole("link", { name: "தமிழ்" }).click();
    await expect(page).toHaveURL(/\/ta\/plots$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ta.listings.pages.plots.title);
    // Internal links carry the language prefix.
    await page.getByRole("link", { name: ta.homeNav }).first().click();
    await expect(page).toHaveURL(/\/ta$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ta.home.hero.title);
  });

  test("pages declare both languages for search engines", async ({ page }) => {
    await page.goto("/ta/plotfit");
    await expect(page.locator('link[rel="alternate"][hreflang="ta-IN"]')).toHaveAttribute("href", /\/ta\/plotfit$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en-IN"]')).toHaveAttribute("href", /\/plotfit$/);
  });

  test("forms validate and confirm in Tamil", async ({ page }) => {
    await page.goto("/ta/contact");
    const form = page.locator("#enquire form");
    await form.getByLabel(new RegExp(ta.forms.yourName)).fill("X");
    await waitLikeAPerson(page);
    await form.getByRole("button", { name: ta.forms.enquiry.submit }).click();
    await expect(form.getByText(ta.server.v.name)).toBeVisible();

    await form.getByLabel(new RegExp(ta.forms.yourName)).fill("தமிழ் சோதனை");
    await form.getByLabel(new RegExp(ta.forms.phone)).fill("98400 22222");
    await form.locator('input[name="consent"]').check();
    await waitLikeAPerson(page);
    await form.getByRole("button", { name: ta.forms.enquiry.submit }).click();
    // On success the form is replaced by the confirmation.
    await expect(page.locator("#enquire").getByRole("status")).toContainText(ta.server.enquiryOk);
  });

  test("PlotFit explains matches in Tamil", async ({ page }) => {
    await page.goto("/ta/plotfit/results?type=land");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/[஀-௿]/);
    await expect(page.getByText(ta.plotfit.results.footnote)).toBeVisible();
  });

  test("editors' Tamil content replaces English only on Tamil pages", async ({ page }) => {
    const db = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
    await db.property.update({ where: { slug: "sample-plot-north-a12" }, data: { translations: { ta: { title: "வடக்கு மாதிரி மனை A12" } } } });
    await db.$disconnect();
    await page.goto("/ta/properties/sample-plot-north-a12");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("வடக்கு மாதிரி மனை A12");
    await page.goto("/properties/sample-plot-north-a12");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("வடக்கு");
  });
});
