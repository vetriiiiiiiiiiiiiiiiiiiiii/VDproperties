import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { E2E_DB } from "../../playwright.config";
import { login, waitLikeAPerson } from "./fixtures";

/**
 * Owners list property for sale → staff review and ask for changes → the owner updates → an admin
 * approves and publishes → a buyer requests to buy with an appointment → staff confirm it →
 * zonal officers only see their zones.
 */
test.describe.serial("selling, buying and appointments", () => {
  const stamp = Date.now();
  const seller = { name: "Meena Seller", email: `meena.${stamp}@example.test`, phone: "98400 70001", password: "Customer-Pass-2026" };
  const buyer = { name: "Karthik Buyer", email: `karthik.${stamp}@example.test`, phone: "98400 70002", password: "Customer-Pass-2026" };
  const title = `Owner plot ${stamp} near the bypass`;
  let listingId = "";
  let slug = "";

  async function register(page: Page, c: typeof seller) {
    await page.context().clearCookies();
    await page.goto("/account/register");
    await page.getByLabel("Your name").fill(c.name);
    await page.getByLabel("Email", { exact: true }).fill(c.email);
    await page.getByLabel("Phone number").fill(c.phone);
    await page.getByLabel("Password").fill(c.password);
    await page.locator('input[name="terms"]').check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);
  }

  test("an owner submits a property with a photo", async ({ page }) => {
    await page.goto("/sell");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sell your property with us");
    await register(page, seller);
    await page.goto("/account/listings/new");
    const form = page.locator("main form");
    await form.locator('[name="declaration"]').scrollIntoViewIfNeeded();
    // Validation first: nothing is saved without an address and the declaration.
    await form.locator('[name="title"]').fill(title);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(form.getByText("Enter the property address")).toBeVisible();
    await expect(form.getByText("Please confirm you own this property or are authorised to sell it")).toBeVisible();

    await form.locator('[name="sellerAddress"]').fill("No. 12, Lake View Road, North Zone");
    await form.locator('[name="localityLabel"]').fill("Near Lake View Road");
    await form.locator('[name="landAreaSqft"]').fill("1200");
    await form.locator('[name="plotDimensions"]').fill("30 ft × 40 ft");
    await form.locator('[name="expectedPrice"]').fill("2400000");
    await form.locator('[name="declaration"]').check();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page).toHaveURL(/\/account\/listings\/[a-z0-9]+\?created=1$/);
    listingId = page.url().split("/").pop()!.split("?")[0];
    await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();

    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 160, b: 90 } } }).png().toBuffer();
    await page.locator('input[type="file"][accept^="image"]').setInputFiles({ name: "plot.png", mimeType: "image/png", buffer: png });
    await expect(page.locator("main img")).toHaveCount(1);

    // Never public before approval.
    expect((await page.request.get(`/properties/${listingId}`)).status()).toBe(404);
  });

  test("staff ask for changes; the owner updates and resubmits", async ({ page }) => {
    await login(page, "enquiry");
    await page.goto("/admin/submissions");
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await expect(page.getByText("No. 12, Lake View Road")).toBeVisible();
    await page.getByLabel("Message to the seller").fill("Please add the survey number and a photo of the road.");
    await page.getByRole("button", { name: "Ask seller for changes" }).click();
    await expect(page.getByRole("status")).toContainText("Submission updated");
    // Staff can't approve.
    await expect(page.getByRole("button", { name: "Approve and prepare listing" })).toHaveCount(0);

    await page.context().clearCookies();
    await page.goto("/account/login");
    await page.getByLabel("Email").fill(seller.email);
    await page.getByLabel("Password").fill(seller.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto(`/account/listings/${listingId}`);
    await expect(page.getByText("Please add the survey number and a photo of the road.")).toBeVisible();
    await page.locator('[name="approvalInfo"]').fill("Patta available. Survey no. 123/4.");
    await page.locator('[name="declaration"]').check();
    await page.getByRole("button", { name: "Save and send back for review" }).click();
    await expect(page.getByText("Changes saved and sent back to our team for review.")).toBeVisible();
  });

  test("an admin approves, publishes, and the listing shows as an owner listing", async ({ page }) => {
    await login(page, "property");
    await page.goto(`/admin/submissions/${listingId}`);
    await page.getByRole("button", { name: "Mark as inspected" }).click();
    await expect(page.getByText("Record what you found at the inspection", { exact: true })).toBeVisible();
    await page.getByLabel("Inspection notes (internal)").fill("Boundary stones present, 30 ft road, patta seen.");
    await page.getByRole("button", { name: "Mark as inspected" }).click();
    await expect(page.getByRole("status").first()).toContainText("Submission updated");

    await page.getByLabel("Catalogue location").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Approve and prepare listing" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/properties/${listingId}$`));
    await expect(page.getByText("Listed by its owner")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.locator("main form").getByRole("status")).toContainText("Published");
    slug = (await page.locator('input[name="slug"]').inputValue()) || "";

    await page.goto(`/properties/${slug}`);
    await expect(page.getByText("Listed by owner")).toBeVisible();
    // The seller's private details never appear publicly.
    await expect(page.getByText("Lake View Road, North Zone")).toHaveCount(0);
    await expect(page.getByText(seller.phone)).toHaveCount(0);
  });

  test("a buyer requests to buy with an appointment, and staff confirm it", async ({ page }) => {
    await register(page, buyer);
    await page.goto(`/properties/${slug}`);
    await page.getByRole("tab", { name: "Buy this property" }).click();
    const panel = page.locator("#panel-buy");
    const d = new Date(Date.now() + 4 * 86_400_000);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    await panel.getByLabel("Your offer (₹)").fill("2300000");
    await panel.getByLabel("How will you pay?").selectOption("HOME_LOAN");
    await panel.getByLabel("Appointment type").selectOption("SITE_VISIT");
    await panel.getByLabel("Preferred date").fill(d.toISOString().slice(0, 10));
    await panel.locator('[name="consent"]').check();
    await waitLikeAPerson(page);
    await panel.getByRole("button", { name: "Send purchase request" }).click();
    await expect(panel.getByRole("status")).toContainText("Your purchase request has been received");

    await page.goto("/account");
    await expect(page.locator("#purchases")).toContainText("Received");

    await login(page, "enquiry");
    await page.goto("/admin/purchases");
    await page.getByRole("link", { name: buyer.name }).click();
    await expect(page.getByText("Home loan")).toBeVisible();
    await page.getByLabel("Status").selectOption("APPOINTMENT_SCHEDULED");
    await page.getByRole("button", { name: "Update request" }).click();
    await expect(page.getByText("Enter the confirmed appointment date and time.")).toBeVisible();
    await page.getByLabel("Confirmed appointment").fill(`${d.toISOString().slice(0, 10)}T10:30`);
    await page.getByLabel("Appointment details for the buyer").fill("Meet at the plot entrance; our officer will call 15 minutes before.");
    await page.getByRole("button", { name: "Update request" }).click();
    await expect(page.getByText("Purchase request updated.")).toBeVisible();
    // Staff can't change the property's sale state from here.
    await expect(page.getByText("Also update the property")).toHaveCount(0);

    await page.goto("/admin/appointments");
    await expect(page.getByText(buyer.name)).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/account/login");
    await page.getByLabel("Email").fill(buyer.email);
    await page.getByLabel("Password").fill(buyer.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator("#purchases")).toContainText("Appointment confirmed");
    await expect(page.locator("#purchases")).toContainText("Meet at the plot entrance");
  });

  test("zonal officers only see their zones", async ({ page }) => {
    const db = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
    const listing = await db.property.findUniqueOrThrow({ where: { id: listingId }, select: { locationId: true } });
    const outside = await db.location.findFirstOrThrow({ where: { id: { not: listing.locationId! } } });
    const officer = await db.user.findUniqueOrThrow({ where: { email: "e2e-zonal@vdproperties.test" } });
    await db.zone.create({ data: { name: `Zone ${stamp}`, locations: { connect: [{ id: listing.locationId! }] }, officers: { connect: [{ id: officer.id }] } } });
    const otherPlot = await db.property.findFirstOrThrow({ where: { locationId: outside.id, publication: "PUBLISHED" } });
    const outsideEnquiry = await db.enquiry.create({
      data: { type: "PROPERTY", name: `Outside zone ${stamp}`, phone: "9840070003", propertyId: otherPlot.id, propertyLabel: otherPlot.title, consent: true, fingerprint: `zone-${stamp}` },
    });
    await db.$disconnect();

    await login(page, "zonal");
    await page.goto("/admin/purchases");
    await expect(page.getByRole("link", { name: buyer.name })).toBeVisible();
    await page.goto("/admin/enquiries");
    await expect(page.getByText(`Outside zone ${stamp}`)).toHaveCount(0);
    await page.goto(`/admin/enquiries/${outsideEnquiry.id}`);
    await expect(page).toHaveURL(/\/admin\?denied=1/);
    await page.goto("/admin/properties");
    await expect(page).toHaveURL(/\/admin\?denied=1/);
  });
});
