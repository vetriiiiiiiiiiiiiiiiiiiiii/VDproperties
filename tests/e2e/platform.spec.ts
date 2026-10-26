import { expect, test, type Page } from "@playwright/test";
import { customerLogin, login, USERS, waitLikeAPerson } from "./fixtures";

/**
 * The connected journey: admin publishes a property with Twin data → it appears in search and on
 * the map → a customer opens its Twin and Studio, saves and compares a scenario, enquires →
 * an authorised user creates a BuildTrace project → milestones, changes and payments persist →
 * access is restricted → a sale is reflected everywhere.
 */
test.describe.serial("connected platform journey", () => {
  const stamp = Date.now();
  const title = `Journey Plot ${stamp}`;
  const cust = { name: "Asha Journey", email: `asha.${stamp}@example.test`, phone: "98400 11223", password: "Customer-Pass-2026" };
  const other = { name: "Ravi Other", email: `ravi.${stamp}@example.test`, phone: "98400 44556", password: "Customer-Pass-2026" };
  let editUrl = "";
  let slug = "";
  let projectUrl = "";
  let projectCode = "";

  async function register(page: Page, c: typeof cust) {
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

  test("1–2 · admin publishes a property with Twin data; it appears in search and on the map", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/properties/new");
    await page.getByLabel("Title *").fill(title);
    await page.getByLabel(/Asking price/).fill("2800000");
    await page.getByLabel("Land / plot area (sq ft)").fill("1500");
    await page.getByLabel("Location", { exact: true }).selectOption({ label: "North Zone (sample), Sample city" });
    await page.getByLabel("Latitude").fill("11.0425");
    await page.getByLabel("Longitude").fill("76.9725");
    await page.locator('input[name="showExactLocation"]').check();
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page).toHaveURL(/\/admin\/properties\/[a-z0-9]+\?created=1/);
    editUrl = page.url().split("?")[0];
    slug = await page.getByLabel("URL slug").inputValue();

    await page.getByLabel("Frontage (ft)").fill("30");
    await page.getByLabel("Depth (ft)").fill("50");
    await page.getByLabel("Road edge faces (°)").fill("90");
    await page.getByLabel("Nearby facilities").fill("Journey test school | school | 1.5 | EXISTING | e2e");
    await page.getByRole("button", { name: "Save Twin data" }).click();
    await expect(page.getByText("Property Twin data saved.")).toBeVisible();

    await page.goto(`/plots?q=${encodeURIComponent("Journey Plot")}`);
    await expect(page.locator("article h3")).toHaveText([title]);
    await page.getByRole("link", { name: "Map", exact: true }).click();
    await expect(page).toHaveURL(/view=map/);
    await expect(page.getByText(/1 of 1 matching property is shown/)).toBeVisible();
    await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
  });

  test("3–5 · customer opens the Twin, launches Studio with the property's data, and the plan and estimate update", async ({ page }) => {
    await register(page, cust);
    await page.goto(`/twin/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("30 ft × 50 ft")).toBeVisible();
    await expect(page.getByText("Journey test school")).toBeVisible();
    await page.getByRole("button", { name: "☆ Save to shortlist" }).click();
    await expect(page.getByRole("button", { name: "★ Saved" })).toBeVisible();

    await page.getByRole("link", { name: "Open in Property Studio" }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/${slug}`));
    const board = page.getByRole("complementary", { name: "Studio controls" });
    await expect(board.getByText("30 ft", { exact: false }).first()).toBeVisible();
    await expect(page.locator("tfoot")).toContainText("Estimated total project cost");
    const landLine = page.getByRole("row", { name: /Land purchase price/ });
    await expect(landLine).toContainText("Quoted");
    await expect(page.getByLabel("Land purchase price amount")).toHaveValue("2800000");

    const totalBefore = await page.locator("tfoot td").last().textContent();
    const achievedBefore = await page.getByText("Built-up achieved").locator("..").textContent();
    await board.locator("label", { hasText: /^1$/ }).first().click(); // one floor
    await expect.poll(async () => page.getByText("Built-up achieved").locator("..").textContent()).not.toBe(achievedBefore);
    await expect.poll(async () => page.locator("tfoot td").last().textContent()).not.toBe(totalBefore);
    await expect(page).toHaveURL(/fl=1/);

    await page.getByRole("tab", { name: "Massing" }).click();
    await expect(page.getByRole("img", { name: /Massing view: 1-storey/ })).toBeVisible();

    await page.getByLabel("Scenario name").fill("Single-storey option");
    await page.getByRole("button", { name: "Save scenario" }).click();
    await expect(page.getByText("Scenario saved to your account.")).toBeVisible();
    await board.locator("label", { hasText: /^2$/ }).first().click();
    await page.getByLabel("Scenario name").fill("Two-storey option");
    await page.getByRole("button", { name: "Save scenario" }).click();
    await expect(page.getByText("Scenario saved to your account.")).toBeVisible();
  });

  test("6–7 · PlotFit explains matches; scenarios and properties can be compared", async ({ page }) => {
    await page.goto("/plotfit/results?budget=6000000&reservePct=40&type=land&locations=north-zone-sample&builtUp=1400&bedrooms=3");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/fit what you told us/);
    const card = page.locator("li", { has: page.getByRole("link", { name: title }) }).first();
    await expect(card).toContainText("one of your preferred locations");
    await expect(card).toContainText(/fits on the 30 × 50 ft plot|fits across two floors/);
    await expect(card).toContainText("Setbacks for this plot aren't on record");

    await customerLogin(page, cust.email, cust.password);
    await page.goto("/account/compare");
    await expect(page.getByRole("columnheader", { name: "Single-storey option" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Two-storey option" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Estimated total" })).toBeVisible();

    await page.goto(`/compare?p=${slug},sample-plot-north-b04`);
    await expect(page.getByRole("rowheader", { name: "Concept fit (3 bed, 2 floors)" })).toBeVisible();
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });

  test("8 · a signed-in customer's enquiry reaches the admin and their account", async ({ page }) => {
    await customerLogin(page, cust.email, cust.password);
    await page.goto(`/properties/${slug}`);
    const panel = page.locator("#panel-enq");
    await panel.getByLabel(/Your name/).fill(cust.name);
    await panel.getByLabel(/Phone number/).fill(cust.phone);
    await panel.getByRole("checkbox").check();
    await waitLikeAPerson(page);
    await panel.getByRole("button", { name: "Send enquiry" }).click();
    await expect(panel.getByRole("status")).toContainText("received");
    await page.goto("/account");
    await expect(page.getByText(new RegExp(`Property enquiry · .*${title}`))).toBeVisible();

    await login(page, "enquiry");
    await page.goto("/admin/enquiries");
    await expect(page.getByRole("link", { name: cust.name }).first()).toBeVisible();
  });

  test("9–10 · an authorised user creates a BuildTrace project; milestones, changes and payments persist", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/buildtrace/new");
    await page.getByLabel("Project title *").fill(`Home for ${cust.name}`);
    await page.getByLabel("Customer account *").selectOption({ label: `${cust.name} · ${cust.email}` });
    const propertyValue = await page.locator('select[name="propertyId"] option', { hasText: title }).getAttribute("value");
    await page.getByLabel("Property", { exact: true }).selectOption(propertyValue!);
    await page.getByLabel("Project manager").selectOption({ label: "E2E PM" });
    await page.getByLabel("Agreed scope *").fill("Two-storey house, 1,600 sq ft, standard finish, as per agreement.");
    await page.getByLabel("Contract value (₹) *").fill("3500000");
    await page.getByLabel("Planned start *").fill("2026-12-01");
    await page.getByLabel("Planned completion *").fill("2027-09-30");
    await page.getByLabel("Agreement reference *").fill("AGR-E2E-001");
    await page.getByLabel("Agreement date *").fill("2026-11-20");
    await page.getByRole("button", { name: "Create BuildTrace project" }).click();
    await expect(page.getByText("Confirm that a signed agreement")).toBeVisible(); // refused without confirmation
    await page.locator('input[name="agreementConfirmed"]').check();
    await page.getByRole("button", { name: "Create BuildTrace project" }).click();
    await expect(page).toHaveURL(/\/admin\/buildtrace\/[a-z0-9]+\?created=1/);
    projectUrl = page.url().split("?")[0];
    projectCode = ((await page.getByRole("heading", { level: 1 }).textContent()) ?? "").split(" · ")[0];
    expect(projectCode).toMatch(/^BT-\d{4}$/);

    const first = page.locator("ol > li").first();
    await first.getByLabel("Status").selectOption("INSPECTED");
    await first.getByLabel("Completed").fill("2026-12-10");
    await first.getByLabel("Evidence").selectOption("CONTRACTOR_REPORTED");
    await first.getByRole("button", { name: "Save milestone" }).click();
    await expect(first.getByText(/needs an independent inspection/)).toBeVisible();
    await first.getByLabel("Status").selectOption("REPORTED_COMPLETE");
    await first.getByRole("button", { name: "Save milestone" }).click();
    await expect(first.getByText("Milestone saved.")).toBeVisible();

    await page.getByLabel("Requested change").fill("Add rooftop solar provision");
    await page.getByLabel("Cost impact (₹, − for savings)").fill("50000");
    await page.getByLabel("Schedule impact (days)").fill("10");
    await page.getByLabel("Reason & supporting details").fill("Customer request, quote attached to file.");
    await page.getByRole("button", { name: "Propose change" }).click();
    await expect(page.getByText(/doesn't affect the budget or schedule until approved/)).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    const change = page.locator("li", { hasText: "Add rooftop solar provision" });
    await expect(change.getByText("approved", { exact: true })).toBeVisible();

    await page.getByLabel("Amount received (₹)").fill("500000");
    await page.getByLabel("Received on").fill("2026-12-02");
    await page.getByLabel("Receipt / bank reference").fill("NEFT-E2E-1");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Payment recorded.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("₹35,50,000").first()).toBeVisible(); // current contract after approval
    await expect(page.getByText("NEFT-E2E-1")).toBeVisible();

    // Private project document — not shared with the customer.
    await page.getByLabel("Document title").fill("Internal cost sheet");
    await page.locator("#bt-doc").setInputFiles({ name: "sheet.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%e2e\n") });
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(page.getByText("Document added.")).toBeVisible();
  });

  test("11 · customers see only their own projects; private records stay private", async ({ page, request }) => {
    await login(page, "admin");
    await page.goto(projectUrl);
    const docHref = await page.getByRole("link", { name: "Internal cost sheet" }).getAttribute("href");
    expect(docHref).toMatch(/^\/buildtrace\/files\//);

    await customerLogin(page, cust.email, cust.password);
    await page.getByRole("link", { name: /Track My Build/ }).click();
    await expect(page).toHaveURL(new RegExp(`/account/projects/${projectCode}$`));
    await expect(page.getByText("Approved variations")).toBeVisible();
    await expect(page.getByText("Reported as complete — not yet independently inspected.")).toBeVisible();
    await expect(page.getByText("Internal cost sheet")).toHaveCount(0);
    expect((await page.request.get(docHref!)).status()).toBe(404);
    await page.getByLabel("Ask a question").fill("When does the foundation work start?");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.getByText("Question sent to your project team.")).toBeVisible();

    await register(page, other);
    const res = await page.goto(`/account/projects/${projectCode}`);
    expect(res?.status()).toBe(404);
    expect((await page.request.get(docHref!)).status()).toBe(404);

    expect((await request.get(docHref!)).status()).toBe(404); // anonymous
    const pm = await page.context().browser()!.newContext();
    const pmPage = await pm.newPage();
    await login(pmPage, "pm");
    await pmPage.goto(projectUrl);
    await expect(pmPage.getByText("When does the foundation work start?")).toBeVisible();
    await pm.close();

    await login(page, "property");
    await page.goto(projectUrl);
    await expect(page).toHaveURL(/\/admin\?denied=1/);
  });

  test("12 · a sale is reflected across search, Twin, PlotFit, shortlist and scenarios", async ({ page }) => {
    await login(page, "admin");
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Sold", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sold", exact: true })).toBeDisabled();

    await page.goto(`/plots?q=${encodeURIComponent("Journey Plot")}`);
    await expect(page.locator("article")).toHaveCount(0);
    await page.goto(`/twin/${slug}`);
    await expect(page.getByText(/This property is sold/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open in Property Studio" })).toHaveCount(0);
    await page.goto("/plotfit/results?type=land");
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
    await page.getByText(/didn't meet an essential requirement/).click();
    await expect(page.getByText(new RegExp(`${title} — No longer available`))).toBeVisible();

    await customerLogin(page, cust.email, cust.password);
    const saved = page.locator("li", { has: page.getByRole("link", { name: title }) });
    await expect(saved.getByText("Sold")).toBeVisible();
    await expect(page.getByText("Property is now sold").first()).toBeVisible();
  });
});

test("illustrative plots are labelled and planned without a listing", async ({ page }) => {
  await page.goto("/studio/illustrative?w=40&d=60&price=3000000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("40 × 60 ft plot you described");
  await expect(page.getByText("This is an illustrative plot you described — not a surveyed property.")).toBeVisible();
  await expect(page.getByLabel("Land purchase price amount")).toHaveValue("3000000");
  await expect(page.getByRole("row", { name: /Land purchase price/ })).toContainText("Your figure");
});

test("a property without recorded dimensions is never given invented ones", async ({ page }) => {
  await page.goto("/studio/sample-house-lakeside-3bhk");
  await expect(page.getByText("This property's plot dimensions aren't on record yet.")).toBeVisible();
});

test("the PlotFit wizard walks through questions and lands on results", async ({ page }) => {
  await page.goto("/plotfit");
  await page.getByRole("button", { name: "₹50 lakh" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: /Land or a plot/ }).click();
  await page.getByRole("button", { name: "See matches now with what I've answered" }).click();
  await expect(page).toHaveURL(/\/plotfit\/results\?budget=5000000&type=land/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("customer accounts can't reach the staff admin", async ({ page }) => {
  const email = `cust.only.${Date.now()}@example.test`;
  await page.goto("/account/register");
  await page.getByLabel("Your name").fill("Only Customer");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Phone number").fill("98400 99887");
  await page.getByLabel("Password").fill("Customer-Pass-2026");
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account$/);
  expect((await page.request.get("/api/admin/leads/export")).status()).toBe(403);
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Customer-Pass-2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Incorrect email or password.");
  void USERS;
});
