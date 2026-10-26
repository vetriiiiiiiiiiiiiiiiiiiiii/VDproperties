import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test.describe("admin access", () => {
  test("admin pages require a session", async ({ page }) => {
    await page.goto("/admin/properties");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("wrong credentials are refused without revealing which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("e2e-admin@vdproperties.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Incorrect email or password.");
  });

  test("a forged session cookie is rejected", async ({ page, context }) => {
    await context.addCookies([{ name: "vdp_session", value: "forged-token", url: "http://localhost:3200" }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe.serial("property lifecycle", () => {
  const title = `E2E Test Plot ${Date.now()}`;
  let editUrl = "";

  test("property manager creates a draft that isn't public", async ({ page }) => {
    await login(page, "property");
    await page.goto("/admin/properties/new");
    await page.getByLabel("Title *").fill(title);
    await page.getByLabel(/Asking price/).fill("3300000");
    await page.getByLabel("Land / plot area (sq ft)").fill("1500");
    await page.getByLabel("Plot dimensions").fill("30 ft × 50 ft");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/admin\/properties\/[a-z0-9]+\?created=1/);
    editUrl = page.url().split("?")[0];
    await page.goto(`/properties?q=${encodeURIComponent("E2E Test Plot")}`);
    await expect(page.getByText("Nothing matches those filters yet.")).toBeVisible();
  });

  test("publishing requires a location, then the listing appears in search", async ({ page }) => {
    await login(page, "property");
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.locator("main form").getByRole("alert")).toContainText("Add a location before publishing");
    await expect(page.getByLabel("Title *")).toHaveValue(title); // input survives the failed save
    await page.getByLabel("Location", { exact: true }).selectOption({ label: "North Zone (sample), Sample city" });
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.locator("main form").getByRole("status")).toContainText("Published");

    await page.goto("/plots?q=E2E+Test+Plot");
    await expect(page.locator("article h3")).toHaveText([title]);
    await expect(page.locator("article")).toContainText("₹33 lakh");
  });

  test("editing price visibility and marking sold update the public site", async ({ page }) => {
    await login(page, "property");
    await page.goto(editUrl);
    await page.getByLabel("Price visibility").selectOption("CONTACT_FOR_PRICE");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("main form").getByRole("status")).toContainText("Changes saved");
    await page.goto("/plots?q=E2E+Test+Plot");
    await expect(page.locator("article")).toContainText("Contact for price");
    await page.goto("/plots?q=E2E+Test+Plot&maxPrice=5000000");
    await expect(page.locator("article")).toHaveCount(0); // hidden prices never match budget filters

    await page.goto(editUrl);
    await page.getByRole("button", { name: "Sold", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sold", exact: true })).toBeDisabled(); // action completed
    await page.goto("/plots?q=E2E+Test+Plot");
    await expect(page.locator("article")).toHaveCount(0);
  });

  test("unpublishing removes the public page", async ({ page }) => {
    await login(page, "property");
    await page.goto(editUrl);
    const slug = await page.getByLabel("URL slug").inputValue();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.locator("main form").getByRole("status")).toContainText("Unpublished");
    const res = await page.goto(`/properties/${slug}`);
    expect(res?.status()).toBe(404);
  });
});

test.describe("role permissions are enforced on the server", () => {
  test("enquiry manager can't manage properties or settings", async ({ page }) => {
    await login(page, "enquiry");
    await expect(page.getByRole("link", { name: "Properties", exact: true })).toHaveCount(0);
    await page.goto("/admin/properties");
    await expect(page).toHaveURL(/\/admin\?denied=1/);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\?denied=1/);
    const upload = await page.request.post("/api/admin/uploads", { multipart: { target: "property", id: "x", alt: "test" } });
    expect(upload.status()).toBe(403);
  });

  test("property manager can't read leads or export them", async ({ page }) => {
    await login(page, "property");
    await page.goto("/admin/enquiries");
    await expect(page).toHaveURL(/\/admin\?denied=1/);
    const res = await page.request.get("/api/admin/leads/export?kind=enquiries");
    expect(res.status()).toBe(403);
  });

  test("anonymous requests to admin APIs are refused", async ({ request }) => {
    expect((await request.get("/api/admin/leads/export")).status()).toBe(401);
  });
});
