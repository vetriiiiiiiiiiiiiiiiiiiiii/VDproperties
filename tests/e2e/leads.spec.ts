import { expect, test } from "@playwright/test";
import { login, waitLikeAPerson } from "./fixtures";

test.describe.serial("enquiries and site visits", () => {
  test("visitor sends a property enquiry", async ({ page }) => {
    await page.goto("/properties/sample-plot-north-a12");
    const panel = page.locator("#panel-enq");
    await panel.getByLabel(/Your name/).fill("Priya E2E");
    await panel.getByLabel(/Phone number/).fill("98400 12345");
    await panel.getByLabel(/Message/).fill("Is this plot still available?");
    await panel.getByRole("checkbox").check();
    await waitLikeAPerson(page);
    await panel.getByRole("button", { name: "Send enquiry" }).click();
    await expect(panel.getByRole("status")).toContainText("your enquiry has been received");
  });

  test("validation errors are shown and nothing fake is reported", async ({ page }) => {
    await page.goto("/contact");
    const form = page.locator("#enquire form");
    await form.getByLabel(/Your name/).fill("X");
    await waitLikeAPerson(page);
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(form.getByText("Please enter your name")).toBeVisible();
    await expect(form.getByText("Please confirm we may contact you")).toBeVisible();
    await expect(form.getByRole("status")).toHaveCount(0);
  });

  test("visitor requests a site visit", async ({ page }) => {
    await page.goto("/properties/sample-plot-north-a12");
    await page.getByRole("tab", { name: "Request a Site Visit" }).click();
    const panel = page.locator("#panel-visit");
    const d = new Date(Date.now() + 5 * 86_400_000);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    await panel.getByLabel(/Preferred date/).fill(d.toISOString().slice(0, 10));
    await panel.getByLabel(/Preferred time/).selectOption("MORNING");
    await panel.getByLabel(/Your name/).fill("Ravi E2E");
    await panel.getByLabel(/Phone number/).fill("98400 67890");
    await panel.getByRole("checkbox").check();
    await waitLikeAPerson(page);
    await panel.getByRole("button", { name: "Request site visit" }).click();
    await expect(panel.getByRole("status")).toContainText("site visit request has been received");
    await expect(panel).toContainText("not a confirmed appointment");
  });

  test("submissions without JavaScript post safely and never put details in the URL", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/contact");
    const form = page.locator("#enquire form");
    await form.getByLabel(/Your name/).fill("NoJS Visitor");
    await form.getByLabel(/Phone number/).fill("98400 55555");
    await form.getByRole("checkbox").check();
    await page.waitForTimeout(2800);
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page).toHaveURL(/\/thank-you\?kind=enquiry&ref=/);
    expect(page.url()).not.toContain("98400");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("enquiry has been received");
    await ctx.close();
  });

  test("staff see, assign and annotate the leads", async ({ page }) => {
    await login(page, "enquiry");
    await page.getByRole("link", { name: /^Enquiries/ }).click();
    await page.getByRole("link", { name: "Priya E2E" }).click();
    await expect(page).toHaveURL(/\/admin\/enquiries\/[a-z0-9]+$/);
    await expect(page.getByText("VDP-S001 · East-facing residential plot")).toBeVisible();
    await page.getByLabel("Status").selectOption("CONTACTED");
    await page.getByLabel("Assigned to").selectOption({ label: "E2E Staff" });
    await page.getByRole("button", { name: "Update enquiry" }).click();
    await expect(page.getByText("Enquiry updated.")).toBeVisible();
    await page.getByLabel("Add an internal note").fill("Called back, visiting Saturday.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Called back, visiting Saturday.")).toBeVisible();

    await page.goto("/admin/site-visits");
    await page.getByRole("link", { name: "Ravi E2E" }).click();
    await expect(page).toHaveURL(/\/admin\/site-visits\/[a-z0-9]+$/);
    await page.getByLabel("Status").selectOption("SCHEDULED");
    await page.getByRole("button", { name: "Update visit" }).click();
    await expect(page.getByText("Enter the confirmed date and time")).toBeVisible();

    // Exports are for admins.
    expect((await page.request.get("/api/admin/leads/export?kind=enquiries")).status()).toBe(403);
    await login(page, "property");
    const res = await page.request.get("/api/admin/leads/export?kind=enquiries");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Priya E2E");
  });
});
