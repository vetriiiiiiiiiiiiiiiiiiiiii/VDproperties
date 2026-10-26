import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("homepage presents the brand, search and featured listings", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Land, homes and the house you'll build on it.");
    // The hero shows a real featured listing and links to it.
    const showcase = page.getByRole("figure", { name: "Featured listing" });
    await expect(showcase.getByRole("link", { name: "View property" })).toHaveAttribute("href", /^\/properties\/[a-z0-9-]+$/);
    await expect(page.getByRole("search", { name: "Search properties" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured properties" })).toBeVisible();
    await expect(page.getByText("Development build: this site contains")).toBeVisible();
    await expect(page.locator("footer")).toContainText("Build better from now");
  });

  test("hero search returns matching listings with a clean shareable URL", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("search", { name: "Search properties" });
    await search.getByLabel("Property type").selectOption("homes");
    await search.getByLabel("Budget range").selectOption("10000000");
    await search.getByRole("button", { name: "Search properties" }).click();
    await expect(page).toHaveURL(/\/properties\?category=homes&maxPrice=10000000$/);
    const titles = await page.locator("article h3").allTextContents();
    expect(titles).toEqual(expect.arrayContaining(["Three-bedroom independent house", "Two-bedroom starter home"]));
    expect(titles).not.toContain("Four-bedroom villa with garden"); // ₹1.65 crore — over budget
    await expect(page.getByRole("link", { name: /Remove filter: Up to ₹1 crore/ })).toBeVisible();
  });

  test("filters combine, sort, and can be cleared", async ({ page }) => {
    await page.goto("/plots?amenities=paved-road&sort=price_desc");
    await expect(page.getByRole("heading", { name: /properties?$/ })).toContainText("2 properties");
    const titles = await page.locator("article h3").allTextContents();
    expect(titles).toEqual(["Rectangular plot near layout park", "East-facing residential plot"]);
    await page.getByRole("link", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/plots$/);
  });

  test("sold listings are hidden by default and shown on request", async ({ page }) => {
    await page.goto("/plots");
    await expect(page.locator("article h3", { hasText: "Residential plot (sold)" })).toHaveCount(0);
    await page.goto("/plots?availability=all");
    await expect(page.locator("article h3", { hasText: "Residential plot (sold)" })).toHaveCount(1);
  });

  test("empty results explain what to do next", async ({ page }) => {
    await page.goto("/properties?q=no-such-property-xyz");
    await expect(page.getByText("Nothing matches those filters yet.")).toBeVisible();
  });

  test("property detail adapts to homes and hides empty fields", async ({ page }) => {
    await page.goto("/properties/sample-house-lakeside-3bhk");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Three-bedroom independent house");
    await expect(page.getByText("VDP-S004").first()).toBeVisible();
    await expect(page.getByText("Built-up area").first()).toBeVisible();
    await expect(page.getByText("Approvals & registration")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Request a Site Visit" })).toBeVisible();
  });

  test("unknown and unpublished pages return 404", async ({ page }) => {
    const res = await page.goto("/properties/does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("robots and sitemap exclude private and sample content", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /"); // indexing disabled in the e2e environment
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("sample-");
  });
});
