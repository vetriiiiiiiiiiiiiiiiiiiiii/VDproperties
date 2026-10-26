/**
 * Seeds the first administrator, default site settings and — only when SEED_SAMPLE_CONTENT=true —
 * clearly labelled sample listings for development. Sample rows carry isSample=true and are shown
 * with a "Sample" label on the public site; delete them in /admin before launch.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const FAQS = [
  {
    question: "How do I request a site visit?",
    answer:
      "Open any property or project and choose “Request a site visit”, or use the site visit page. Pick a preferred date and time range and our team will call you to confirm. A request is not a confirmed appointment until we confirm it with you.",
  },
  {
    question: "What happens after I send an enquiry?",
    answer:
      "Your enquiry is recorded with the property it relates to and passed to our team, who will contact you on the phone number you provided. We only use your details to respond to your request.",
  },
  {
    question: "Why do some listings say “Contact for price”?",
    answer: "For some properties the price depends on the final plot, specification or current terms. Send an enquiry and we will share the current price with you directly.",
  },
  {
    question: "Can you help me build a house on land I already own?",
    answer: "Use the construction enquiry form with your plot location, approximate area and budget, and our team will get in touch to discuss your requirements.",
  },
];

async function main() {
  const existing = await db.siteSettings.findUnique({ where: { id: 1 } });
  if (!existing) await db.siteSettings.create({ data: { id: 1, faqs: FAQS } });

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: "Administrator", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Super admin ready: ${email}`);
  } else {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin user created.");
  }

  if (process.env.SEED_SAMPLE_CONTENT === "true") {
    await seedSamples();
    await seedPlatformDemo();
  }
}

/**
 * Demonstration data for Property Twin, Studio and PlotFit on the sample listings only.
 * Map positions are placeholders for development, and every rate card is flagged isDemo
 * so the site labels its figures "demonstration rates — not market data".
 */
async function seedPlatformDemo() {
  if (await db.costAssumption.count()) {
    console.log("Platform demo data already present — skipping.");
    return;
  }
  const finishes = [
    { finish: "BASIC" as const, constructionPerSqft: 1700 },
    { finish: "STANDARD" as const, constructionPerSqft: 2100 },
    { finish: "PREMIUM" as const, constructionPerSqft: 2800 },
  ];
  for (const f of finishes) {
    await db.costAssumption.create({
      data: {
        name: `Demonstration card — ${f.finish.toLowerCase()} finish`,
        finish: f.finish,
        constructionPerSqft: f.constructionPerSqft,
        foundationPerSqft: 250,
        sitePreparation: 60000,
        utilitiesConnection: 90000,
        registrationPct: 9,
        landscapingPerSqft: 120,
        parkingPerSlot: 45000,
        contingencyPct: 7,
        source: "Development placeholder — replace with the company's verified rates",
        effectiveDate: new Date("2026-10-01"),
        isDemo: true,
      },
    });
  }

  const geo: Record<string, Prisma.PropertyUpdateInput> = {
    "sample-plot-north-a12": {
      plotWidthFt: 30, plotDepthFt: 40, frontBearing: 90, latitude: 11.0412, longitude: 76.9701, showExactLocation: true,
      boundary: [[11.04128, 76.97004], [11.04128, 76.97013], [11.04117, 76.97013], [11.04117, 76.97004]], boundaryStatus: "APPROXIMATE", boundarySource: "Sample outline for development",
      nearbyFacilities: [
        { name: "Sample primary school", kind: "school", distanceKm: 1.2, status: "EXISTING", source: "Sample data" },
        { name: "Sample bus stop", kind: "transport", distanceKm: 0.4, status: "EXISTING", source: "Sample data" },
        { name: "Proposed clinic (sample)", kind: "hospital", distanceKm: 2.5, status: "PROPOSED", source: "Sample data" },
      ],
    },
    "sample-plot-north-b04": {
      plotWidthFt: 30, plotDepthFt: 50, latitude: 11.0418, longitude: 76.9712, showExactLocation: true,
      setbackFrontFt: 5, setbackRearFt: 3, setbackSideFt: 2, maxCoveragePct: 75,
      nearbyFacilities: [{ name: "Sample market", kind: "market", distanceKm: 0.8, status: "EXISTING", source: "Sample data" }],
    },
    "sample-land-east-1": { plotWidthFt: 120, plotDepthFt: 181.5, siteConstraints: "Sample: gentle slope towards the rear boundary." },
    "sample-house-lakeside-3bhk": { latitude: 11.0301, longitude: 76.9555, showExactLocation: true },
  };
  for (const [slug, data] of Object.entries(geo)) await db.property.updateMany({ where: { slug, isSample: true }, data: data as Prisma.PropertyUpdateManyMutationInput });

  const plot = await db.property.findUnique({ where: { slug: "sample-plot-north-a12" } });
  if (plot) {
    const items: [string, "REVIEWED" | "RECEIVED" | "UNDER_REVIEW" | "NOT_PROVIDED" | "NEEDS_FOLLOW_UP", string | null][] = [
      ["Title / sale deed", "REVIEWED", "Sample entry"],
      ["Encumbrance certificate", "UNDER_REVIEW", "Sample entry"],
      ["Approved layout plan", "RECEIVED", null],
      ["Survey sketch", "NEEDS_FOLLOW_UP", "Sample: awaiting updated sketch"],
      ["Building plan approval", "NOT_PROVIDED", null],
    ];
    let i = 0;
    for (const [documentType, status, publicNote] of items) {
      await db.passportItem.create({ data: { propertyId: plot.id, documentType, status, publicNote, sortOrder: i++, reviewedAt: status === "REVIEWED" ? new Date() : null } });
    }
    await db.propertyActivity.createMany({
      data: [
        { propertyId: plot.id, kind: "LISTED", summary: "Listing published (sample)" },
        { propertyId: plot.id, kind: "DOCUMENT", summary: "Title deed reviewed (sample)" },
      ],
    });
  }
  console.log("Seeded platform demonstration data.");
}

async function seedSamples() {
  if (await db.property.count({ where: { isSample: true } })) {
    console.log("Sample content already present — skipping.");
    return;
  }

  await db.siteSettings.update({
    where: { id: 1 },
    data: {
      aboutIntro:
        "[Sample text] V D Properties sells residential plots and land, develops properties, and builds and sells houses. Replace this paragraph with the company's own introduction in Admin → Settings.",
      aboutApproach: "[Sample text] Describe how the company selects land, plans developments and works with buyers.",
      aboutValues: "[Sample text] List the values the company wants to be known for.",
      constructionServices: [
        { title: "House construction", body: "[Sample] Building a home on a plot you own or buy through us. Confirm the scope before publishing." },
        { title: "Help choosing suitable land", body: "[Sample] Guidance on plots suited to the house you want to build." },
      ],
      constructionStages: [
        { title: "Requirements", body: "[Sample] Understanding your plot, budget and how you want to live." },
        { title: "Planning & design", body: "[Sample] Layout and specification agreed with you before work begins." },
        { title: "Construction", body: "[Sample] Regular updates as the house is built." },
        { title: "Handover", body: "[Sample] Walk-through of the completed home." },
      ],
      strengths: [
        { title: "Property selection and guidance", body: "[Sample] Help narrowing down land and homes to the ones that fit your plans." },
        { title: "Clear listing information", body: "[Sample] Each listing shows the details we hold for it, and hides what we don't." },
        { title: "Site visits with our team", body: "[Sample] Visit a plot or home with someone who can answer your questions." },
        { title: "Construction expertise", body: "[Sample] One team from choosing land to building the house." },
      ],
    },
  });

  const loc = async (slug: string, name: string) =>
    db.location.create({ data: { slug, name, city: "Sample city", isServiceArea: true } });
  const north = await loc("north-zone-sample", "North Zone (sample)");
  const east = await loc("east-zone-sample", "East Zone (sample)");
  const lake = await loc("lakeside-sample", "Lakeside (sample)");

  const amenity = async (slug: string, name: string) => db.amenity.create({ data: { slug, name } });
  const [road, water, power, drain, park, gate] = await Promise.all([
    amenity("paved-road", "Paved internal road"),
    amenity("water-supply", "Water supply"),
    amenity("electricity", "Electricity connection"),
    amenity("drainage", "Storm-water drainage"),
    amenity("park", "Open space / park"),
    amenity("gated", "Gated entrance"),
  ]);

  const ongoing = await db.project.create({
    data: {
      slug: "sample-layout-north",
      name: "Sample Layout — North",
      summary: "[Sample project] A residential plotted layout used to demonstrate project pages.",
      description: "[Sample project] Replace with the real project's description, approved-layout details and verified facts.",
      status: "ONGOING",
      publication: "PUBLISHED",
      isSample: true,
      locationId: north.id,
      localityLabel: "North Zone (sample)",
      images: { create: [{ url: "placeholder:site-plan", alt: "Sample site plan drawing", sortOrder: 0 }] },
    },
  });
  const completed = await db.project.create({
    data: {
      slug: "sample-homes-lakeside",
      name: "Sample Homes — Lakeside",
      summary: "[Sample project] A small group of completed homes used to demonstrate the completed-projects page.",
      status: "COMPLETED",
      publication: "PUBLISHED",
      isSample: true,
      locationId: lake.id,
      localityLabel: "Lakeside (sample)",
      images: { create: [{ url: "placeholder:elevation", alt: "Sample house elevation drawing", sortOrder: 0 }] },
    },
  });

  type Sample = Omit<Prisma.PropertyUncheckedCreateInput, "referenceCode" | "isSample" | "publication"> & {
    amenityIds?: string[];
    imgs: string[];
  };
  const samples: Sample[] = [
    {
      slug: "sample-plot-north-a12", title: "East-facing residential plot", type: "RESIDENTIAL_PLOT",
      summary: "[Sample listing] A corner plot within a plotted layout.", locationId: north.id, localityLabel: "North Zone (sample)",
      priceAmount: 2450000n, priceDisplay: "SHOW_PRICE", landAreaSqft: 1200, plotDimensions: "30 ft × 40 ft", facing: "East",
      accessRoad: "30 ft internal road (sample)", developmentStatus: "Layout roads laid (sample)", projectId: ongoing.id, featured: true,
      amenityIds: [road.id, water.id, power.id, drain.id], imgs: ["placeholder:plot", "placeholder:site-plan"],
    },
    {
      slug: "sample-plot-north-b04", title: "Rectangular plot near layout park", type: "RESIDENTIAL_PLOT",
      summary: "[Sample listing] Plot overlooking the layout's open space.", locationId: north.id, localityLabel: "North Zone (sample)",
      priceAmount: 3100000n, priceDisplay: "SHOW_PRICE", landAreaSqft: 1500, plotDimensions: "30 ft × 50 ft", facing: "North",
      accessRoad: "40 ft main road (sample)", projectId: ongoing.id, availability: "RESERVED",
      amenityIds: [road.id, water.id, power.id, park.id], imgs: ["placeholder:plot"],
    },
    {
      slug: "sample-land-east-1", title: "Open land parcel", type: "LAND",
      summary: "[Sample listing] A larger land parcel shown with price on request.", locationId: east.id, localityLabel: "East Zone (sample)",
      priceAmount: 18500000n, priceDisplay: "CONTACT_FOR_PRICE", landAreaSqft: 21780, landAreaLabel: "50 cents (sample)",
      accessRoad: "Access from district road (sample)", amenityIds: [power.id], imgs: ["placeholder:land"], featured: true,
    },
    {
      slug: "sample-house-lakeside-3bhk", title: "Three-bedroom independent house", type: "HOUSE",
      summary: "[Sample listing] A completed two-storey home.", locationId: lake.id, localityLabel: "Lakeside (sample)",
      priceAmount: 8900000n, priceDisplay: "SHOW_PRICE", landAreaSqft: 1800, plotDimensions: "36 ft × 50 ft", builtUpAreaSqft: 2150,
      bedrooms: 3, bathrooms: 3, floors: 2, facing: "West", projectId: completed.id, featured: true,
      constructionSpecs: "[Sample] RCC framed structure. Replace with the verified specification.",
      amenityIds: [road.id, water.id, power.id, gate.id], imgs: ["placeholder:elevation", "placeholder:floor-plan"],
    },
    {
      slug: "sample-villa-lakeside", title: "Four-bedroom villa with garden", type: "VILLA",
      summary: "[Sample listing] A detached villa on a larger plot.", locationId: lake.id, localityLabel: "Lakeside (sample)",
      priceAmount: 16500000n, priceDisplay: "SHOW_PRICE", landAreaSqft: 3200, builtUpAreaSqft: 3400, bedrooms: 4, bathrooms: 4, floors: 2,
      projectId: completed.id, amenityIds: [water.id, power.id, gate.id, park.id], imgs: ["placeholder:villa", "placeholder:floor-plan"],
    },
    {
      slug: "sample-house-east-2bhk", title: "Two-bedroom starter home", type: "HOUSE",
      summary: "[Sample listing] A compact single-storey home.", locationId: east.id, localityLabel: "East Zone (sample)",
      priceAmount: 4800000n, priceDisplay: "SHOW_PRICE", landAreaSqft: 1200, builtUpAreaSqft: 1050, bedrooms: 2, bathrooms: 2, floors: 1,
      amenityIds: [water.id, power.id], imgs: ["placeholder:elevation"],
    },
    {
      slug: "sample-plot-east-sold", title: "Residential plot (sold)", type: "RESIDENTIAL_PLOT",
      summary: "[Sample listing] Demonstrates how sold listings appear.", locationId: east.id, localityLabel: "East Zone (sample)",
      priceAmount: 1900000n, priceDisplay: "SHOW_PRICE", landAreaSqft: 1000, plotDimensions: "25 ft × 40 ft", availability: "SOLD",
      imgs: ["placeholder:plot"],
    },
  ];

  let n = 1;
  for (const s of samples) {
    const { amenityIds = [], imgs, ...data } = s;
    const isHome = data.type === "HOUSE" || data.type === "VILLA";
    await db.property.create({
      data: {
        ...data,
        referenceCode: `VDP-S${String(n++).padStart(3, "0")}`,
        isSample: true,
        publication: "PUBLISHED",
        publishedAt: new Date(Date.now() - n * 86_400_000),
        publicPrice: data.priceDisplay === "SHOW_PRICE" ? data.priceAmount : null,
        primaryAreaSqft: isHome ? (data.builtUpAreaSqft ?? data.landAreaSqft) : data.landAreaSqft,
        amenities: { connect: amenityIds.map((id) => ({ id })) },
        images: {
          create: imgs.map((url, i) => ({
            url,
            alt: `Sample illustration for ${data.title}`,
            sortOrder: i,
            kind: url.endsWith("floor-plan") ? "FLOOR_PLAN" : url.endsWith("site-plan") ? "SITE_PLAN" : "PHOTO",
          })),
        },
      },
    });
  }
  console.log(`Seeded ${samples.length} sample listings and 2 sample projects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
