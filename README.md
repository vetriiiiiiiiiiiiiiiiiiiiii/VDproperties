# V D Properties — website & admin platform

**Build better from now.**

A real-estate platform for V D Properties: a public website for residential plots, land, houses and developments, a working property search, enquiry and site-visit workflows, and a secure admin dashboard for listings, projects, leads and company content.

---

## Contents

1. [What's included](#whats-included)
2. [Tech stack](#tech-stack)
3. [Languages: English & Tamil](#languages-english--tamil)
4. [Quick start (local)](#quick-start-local)
5. [Environment variables](#environment-variables)
6. [Database & migrations](#database--migrations)
7. [Admin accounts & roles](#admin-accounts--roles)
8. [Before launch: content onboarding](#before-launch-content-onboarding)
9. [Deployment](#deployment)
10. [Testing](#testing)
11. [Security notes](#security-notes)
12. [SEO notes](#seo-notes)
13. [Project structure](#project-structure)
14. [Known limitations](#known-limitations)

---

## What's included

**Public website**

| Page | Path |
| --- | --- |
| Home (hero search, discovery, featured listings, land perspective, construction, projects, strengths, enquiry) | `/` |
| Buy properties (all listings, full filters) | `/properties` |
| Residential plots & land | `/plots` |
| Houses & villas | `/houses` |
| Property detail (gallery, specs, location, enquiry, site visit, related) | `/properties/[slug]` |
| Ongoing / completed projects, project detail | `/projects/ongoing`, `/projects/completed`, `/projects/[slug]` |
| Construction services + structured enquiry | `/construction` |
| About | `/about` |
| Contact | `/contact` |
| Site visit request | `/site-visit` |
| FAQs, Privacy policy, Terms | `/faqs`, `/privacy`, `/terms` |

- **Search & filters**: keyword or property ID, category, type, location, budget, land area, built-up area, bedrooms, availability, project status and amenities. Filters combine, appear as removable chips, live in the URL (shareable), and only appear when the data can support them. Sorting by newest, price and area, with pagination.
- **Forms**: enquiries, site-visit requests and construction enquiries, validated in the browser and on the server, with spam protection (honeypot, timing check, link-spam check, per-IP rate limit), duplicate-submission prevention, consent capture and honest success/failure messages. They also work without JavaScript: they post normally and redirect to a confirmation page, so personal data never appears in a URL.
- **Sample content is always labelled.** Sample listings carry a visible "Sample listing" tag, a site-wide banner appears while any exist, and they're excluded from the sitemap and search indexing.

**Admin dashboard** (`/admin`)

- Overview with live counts (published properties, available plots and houses, ongoing projects, new enquiries, upcoming visits), recent updates and a launch checklist.
- Properties: create, edit, save drafts, preview, publish/unpublish, mark available/reserved/sold/unavailable, feature on the homepage, price visibility ("Contact for price"), SEO fields, amenities, location (with an explicit opt-in before exact coordinates are published), image upload/reorder/alt text/removal, and private or public PDF documents.
- Projects: create, edit, status, images, publish.
- Locations & amenities.
- Enquiries & site visits: search, filter, assign, status tracking (site visits: New → Contacted → Scheduled → Completed / Cancelled), follow-up dates, internal notes, CSV export.
- Team & roles (Super Admin only), company settings & onboarding, audit log.

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS 4** with a custom design system (`src/app/globals.css`)
- **PostgreSQL** + **Prisma 6** ORM with versioned migrations
- **Zod** schemas for validation on both client and server
- **sharp** for image processing; local disk or any S3-compatible bucket for storage
- **bcrypt** password hashing; server-side sessions stored hashed in the database
- **Nodemailer** for optional staff notifications over SMTP
- **Vitest** (unit) and **Playwright** (end-to-end) tests

Fonts: Newsreader (editorial serif), Manrope (sans) and IBM Plex Mono (technical annotations), plus Noto Serif Tamil and Catamaran for Tamil, all self-hosted at build time via `next/font`. Tamil fonts are only downloaded when Tamil text is on the page.

## Platform products

Four connected experiences share one source of truth: the `Property` records, customer accounts (`User` with role `CUSTOMER`) and `BuildProject` records. Nothing is copied between products.

| Product | Public path | What it does |
| --- | --- | --- |
| **PlotFit** | `/plotfit` → `/plotfit/results` | Nine-step guided questionnaire (every non-essential step skippable). Hard constraints (availability, type, budget after the share kept for construction, bedrooms, strict locations) exclude properties, with the reason shown. Weighted scores rank the rest, with plain-language reasons, compromises and unknowns. Properties that can't be assessed go to "needs more information" and are never presented as matches. Results are shareable URLs; signed-in customers can save searches and opt into new-listing alerts. |
| **Property Twin** | `/twin`, `/twin/[slug]` | A dossier per property: Leaflet map with boundary (labelled approximate or surveyed, and shown only when the exact location is authorised), plot drawn to scale from recorded dimensions, facts, a **Property Passport** document register (Not provided → Received → Under review → Reviewed / Needs follow-up), surroundings split into existing, proposed and unconfirmed, development potential, and an automatic activity history. |
| **Property Studio** | `/studio`, `/studio/[slug]`, `/studio/illustrative` | Loads the plot's recorded dimensions, setbacks, coverage limit and orientation (or a clearly labelled illustrative plot) and generates a conceptual site plan, floor zoning and isometric massing (`src/lib/studio/layout.ts`). A line-by-line budget (`src/lib/studio/estimate.ts`) tags every line as Quoted, Estimated (from an admin rate card, which is cited), Your figure or Missing, and never fills gaps with guesses. Scenarios save to the account and are recomputed on the server; scenarios are flagged when their property later changes or sells. |
| **BuildTrace** | `/buildtrace`, `/account/projects/[code]`, `/admin/buildtrace` | Created only by a Super Admin, linked to a registered customer, and only once an agreement reference, date and confirmation are recorded. Configurable milestones, with "Reported complete" (contractor or staff) kept distinct from "Inspected" (requires independent inspection or a certificate). Progress photos and documents are stored privately. Change requests move budget or schedule only once approved. Payments are recorded only against a receipt reference, with no online payments. The handover checklist blocks completion until it's finished. |

**Journey:** PlotFit → Property Twin → Property Studio (property data loads automatically) → save and compare → enquiry or site visit (linked to the customer's account) → BuildTrace project → milestones and costs. When a property sells, it disappears from search and recommendations, its Twin shows the sale, shortlists show "Sold", and saved scenarios are flagged.

**Customer accounts** (`/account`): registration with a separate opt-in for listing emails, shortlist, scenarios, scenario comparison (`/account/compare`), property comparison (`/compare`), saved searches, their enquiries and site visits, and their construction projects. Customers can never reach `/admin`, and every customer query is scoped to the signed-in user on the server.

**Admin additions**: Property Twin data and Passport on each property's edit page, **Studio rate cards** (`/admin/costs`, with source and effective date required), **Developers** (unauthorised developers' listings can't be published), **PlotFit matching** weights, **Customers**, and **BuildTrace**. Roles now include **Project Manager**, who sees and manages only the BuildTrace projects assigned to them.

## Brand, graphics & motion

- **Logo**: the official artwork lives in `brand/vd-properties-logo.png`. `node scripts/brand-assets.mjs` turns it into a transparent full logo, an emblem-only mark (`public/brand/`), the favicon (`src/app/icon.png`) and Apple touch icon. Re-run it whenever the source file changes. The header, footer, admin and sign-in page use the emblem with a live-text wordmark, so it stays legible on light and dark backgrounds.
- **Palette**: sampled from the logo (leaf greens, navy, metallic gold, sunrise red-orange) and defined as tokens in `src/app/globals.css`.
- **Graphics built from the logo's own motifs** (`src/components/site/brand/`):
  - **Homepage hero** (`FeaturedShowcase`): a split layout. On the left are a serif headline, two calls to action and live counts of available plots, available homes and locations. On the right, up to four featured listings that are still on offer are shown one at a time: the listing's own photo with a slow push-in, and a caption bar with status, reference, type, locality, area, price and a link to the listing. Listings crossfade every 6.5 seconds, pausing on hover, keyboard focus or reduced motion, with previous, pause and next controls. Feature listings in Admin → Properties to choose what appears; with none featured, a short invitation to enquire shows instead. (The hero photo setting isn't used on the homepage.)
  - `InkSun`: the hand-drawn sun used in page headers.
  - `PlotExplorer`: an interactive site plan where every parcel is a real plot listing (coloured by status). Hover, focus or tap a parcel to read its recorded details.
  - `InventorySkyline`: the logo's gold buildings used as a real chart, one building per location, with height equal to its open listings.
  - `LeafWave` dividers, the `FooterSunset` closing scene, a sunrise scroll-progress line and the rotating headline word.
- **Motion** uses CSS only (transforms, opacity, stroke drawing and scroll-driven timelines): no animation library, no WebGL, no scroll hijacking. Liquid motion is kept to things you use: the segmented toggles, PlotFit choice tiles, the score rings and the "drop" that travels the platform journey. Everything is disabled under `prefers-reduced-motion`, and browsers without scroll-timeline support simply show the finished state.

## Languages: English & Tamil

English is the default and has no URL prefix (`/plots`). Tamil lives under `/ta` (`/ta/plots`), and `/en/...` redirects to the unprefixed English URL. The **EN | தமிழ்** switch in the header and mobile menu keeps you on the same page, with the same filters. Once you choose a language, every link, form, redirect and message stays in it.

- **How it works**: `src/middleware.ts` reads the prefix and rewrites `/ta/...` to the same route, passing the language in a request header. No pages are duplicated. Server components call `getI18n()` (`src/i18n/server.ts`), client components call `useI18n()` (`src/i18n/client.tsx`), and `@/i18n/Link` adds the prefix automatically.
- **Interface text** is in typed dictionaries in `src/i18n/dict/` (one file per area). The Tamil dictionary is type-checked against the English one, and a unit test fails if any key is missing or empty.
- **Calculated text** (PlotFit reasons, Studio warnings, budget lines) comes back from the engines as message codes and is worded in the visitor's language. Validation and server messages from the forms and account actions are translated too.
- **Content entered by staff** (listing titles and descriptions, project text, About/FAQ/policy text in settings) can be given a Tamil version in the `translations` field (`{ "ta": { "title": "…" } }`) on properties, projects and site settings. Tamil pages use it wherever it's filled in and fall back to English otherwise; English pages never change. Default privacy and terms text has a Tamil version that states the English text prevails. The admin dashboard doesn't have Tamil input fields yet, so for now these values are set directly in the database.
- **Before launch**, have a native Tamil speaker review the dictionaries and the default policy text. They were written carefully but haven't been professionally proofread.
- **SEO**: every page declares `hreflang` alternates (`en-IN`, `ta-IN`, `x-default`), and `<html lang>` matches the page.
- **Adding a language later**: add it to `LOCALES` in `src/i18n/config.ts`, add a dictionary object typed against English, and extend the middleware prefix pattern.

## Quick start (local)

Requirements: Node.js 20+ (22 recommended). Docker is **not** required.

```bash
npm install
cp .env.example .env        # then edit values, see below
```

Start a local PostgreSQL server (real Postgres binaries, data in `.data/postgres`, port 5434). Keep it running in its own terminal:

```bash
npm run db:local
```

In another terminal, apply migrations, seed and start the app:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

- Website: http://localhost:3000 (this repo's `.claude/launch.json` previews on port 3100)
- Admin: http://localhost:3000/admin, signing in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`

To seed labelled sample listings for development, set `SEED_SAMPLE_CONTENT="true"` before `npm run db:seed`. **Never enable this in production.**

## Environment variables

Every variable is documented in [`.env.example`](.env.example). Secrets never belong in source code. Company contact details are **not** environment variables: staff edit them in Admin → Company settings.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public base URL (no trailing slash), used for canonical URLs, sitemap and Open Graph |
| `ALLOW_INDEXING` | | `"false"` sends `noindex` everywhere and an empty sitemap. Use it on staging. |
| `FORM_RATE_LIMIT` | | Public form submissions allowed per IP per 10 minutes, per form (default 6) |
| `STORAGE_DRIVER` | | `local` (default) or `s3` |
| `UPLOAD_DIR` | | Local upload folder (default `./uploads`). Use a persistent volume in production. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | if `s3` | S3-compatible storage (AWS S3, Cloudflare R2, DigitalOcean Spaces). Public images go under `public/`, private documents under `private/`, so the bucket policy should only expose `public/*`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | | Optional staff notifications. Leave `SMTP_HOST` empty to disable. |
| `LEAD_NOTIFICATION_EMAILS` | | Comma-separated staff addresses notified of new leads. Emails contain a dashboard link, not customer details. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only | First Super Admin, created by `npm run db:seed` (password: 12+ characters) |
| `SEED_SAMPLE_CONTENT` | seed only | `"true"` adds labelled sample listings for development |

## Database & migrations

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma). Migrations are committed in `prisma/migrations/`.

| Task | Command |
| --- | --- |
| Apply migrations (production/CI) | `npm run db:deploy` |
| Create a migration after editing the schema (development) | `npm run db:migrate -- --name describe_change` |
| Seed the admin user and default settings | `npm run db:seed` |
| Reset a **development** database (destroys data) | `npm run db:reset` |

Data model highlights:

- `Property` keeps **publication** (`DRAFT` / `PUBLISHED`) separate from **availability** (`AVAILABLE` / `RESERVED` / `SOLD` / `UNAVAILABLE`). Land and home fields are optional, and empty fields are hidden on the site.
- `publicPrice` is derived on save and is null when the price is hidden, so hidden prices can never leak through filtering or sorting.
- `Enquiry` and `SiteVisit` store a snapshot label of the property they relate to, and use `ON DELETE SET NULL`. Lead history is never lost when a listing is sold or removed.
- `Session` stores only a SHA-256 hash of the session token. `AuditEvent` records significant admin actions.
- `SiteSettings` (single row) holds all company details and editable content.

## Admin accounts & roles

| Role | Can do |
| --- | --- |
| **Super Admin** | Everything: team and roles (including other Super Admins and Admins), company settings, PlotFit weights, audit log |
| **Admin** | Runs the business: publishes, unpublishes, features and deletes listings; marks them reserved or sold; approves or declines owner submissions; manages projects, locations, zones, developers and rate cards; creates BuildTrace projects and approves changes; exports leads; adds and edits **Staff** and **Zonal Officers**; views the audit log |
| **Staff** | Day-to-day work: prepares and edits listing drafts (can't publish), photos, documents and Property Passport; handles enquiries, site visits, purchase requests and appointments; reviews owner submissions; works on BuildTrace projects assigned to them |
| **Zonal Officer** | Only for locations in their zones: reviews and inspects owner submissions, and handles enquiries, site visits, purchase requests and appointments. Can't edit or publish listings, see customers, or export |
| **Customer** | Public account: lists their own property for sale, sends purchase requests, and keeps their shortlist, scenarios, searches, enquiries and projects |

The first Super Admin is created by the seed. Add others in **Admin → Team & roles**: Super Admins can give any staff role; Admins can only add or change Staff and Zonal Officers. There must always be at least one active Super Admin; role changes, deactivation and password resets sign the affected person out everywhere. Upgrading from the earlier roles, the `roles_zones_owner_listings_purchases` migration turns Property, Enquiry and Project Managers into Staff.

**Zones** (Admin → Zones) group locations. A zonal officer covers one or more zones (set on their team entry) and sees only records whose property or project is in those locations; anything outside them, or with no catalogue location, stays with the office team. Every admin list, detail page, count and action checks this on the server.

## Selling and buying

- **Sell your property** (`/sell`, then `/account/listings`): a signed-in customer submits a plot, land, house or villa with its location, size, private address, expected price and their relationship to it, then adds up to 12 photos (re-encoded, location metadata stripped) and 5 private PDFs. Nothing is public until approved. They follow the status and the team's messages in their account, can edit and resubmit while it's *Submitted* or *Changes requested*, and can withdraw it.
- **Review** (Admin → Owner submissions): reviewers start the review, ask the seller for changes (the message appears in their account), record an inspection with internal notes, and add internal notes. An Admin chooses the catalogue location (which decides the zone) and approves it into Properties as a draft, or declines with a reason. The listing is then finished and published like any other, labelled *Listed by owner* with a note that enquiries go to V D Properties. The seller's name, phone and address are never shown publicly, and their asking price stays private unless staff choose to show a price.
- **Buy this property** (a tab on every listing's contact panel): a signed-in buyer sends an optional offer, how they'll pay, a timeline, and a preferred appointment (site visit, office meeting or video call, with date and time slot). Staff work it through *New → Contacted → Appointment confirmed → Negotiating → Booked → Sale completed* (or *Closed*), confirm the appointment time and details (shown in the buyer's account), assign it and add notes. An Admin can reserve the property on booking or mark it sold on completion from the same screen. No payment is taken online.
- **Appointments** (Admin → Appointments): one day-by-day list of upcoming site visits and buyer appointments, confirmed or still requested.

## Before launch: content onboarding

The website never invents facts. Until real information is entered, sections hide themselves or show neutral copy. Work through **Admin → Overview → Launch checklist**:

1. **Company settings**: official phone, WhatsApp, email, office address, map link, business hours, social links.
2. **About**: introduction, approach, values, service area and *verified* registrations only.
3. **Construction**: only the services and stages the company confirms. Empty lists are hidden.
4. **Why V D Properties**: genuine strengths. The section is hidden when empty.
5. **Photographs**: upload authentic, permitted photos for the hero and the homes, enquiry and about slots.
6. **Logo**: already set up from the official artwork. If it changes, replace `brand/vd-properties-logo.png` and run `node scripts/brand-assets.mjs`.
7. **Locations & amenities**: real service areas and verifiable amenities.
8. **Inventory**: add real properties and projects with verified details, then **delete every sample listing and project** (filter Properties by "sample"). The red development banner disappears once none remain.
9. **Policies**: the built-in privacy policy and terms describe what this site actually does. Have them reviewed by the company's legal adviser, then edit or replace them in settings.
10. Set `ALLOW_INDEXING="true"` and the production `NEXT_PUBLIC_SITE_URL`.

## Deployment

Any Node.js host with PostgreSQL works. The general steps:

1. Provision managed PostgreSQL (Neon, Supabase, RDS, DigitalOcean…) and set `DATABASE_URL`.
2. Choose storage: `STORAGE_DRIVER="s3"` for serverless or multi-instance hosting, or `local` with a persistent disk on a single VM or container.
3. Set the environment variables above on the host.
4. Build and migrate:
   ```bash
   npm ci
   npm run db:deploy
   npm run build
   npm run start            # serves on port 3000; put HTTPS (a reverse proxy or platform TLS) in front
   ```
5. Seed once to create the first Super Admin: `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed`. Then remove `SEED_ADMIN_PASSWORD` from the environment.

**Vercel**: set the env vars, use `npm run build` as the build command, and run `npm run db:deploy` as part of the build or release step. Use `STORAGE_DRIVER="s3"`, because the filesystem is ephemeral.

**Single VM / Docker**: run behind Nginx or Caddy for TLS, mount `UPLOAD_DIR` on a persistent volume, and set `X-Forwarded-For` at the proxy so rate limiting sees real client IPs.

## Testing

```bash
npm run typecheck      # TypeScript
npm test               # unit tests (search parsing, validation, spam, roles, formatting)
npm run test:e2e       # end-to-end, see below
```

The end-to-end suite builds the app into `.next-e2e` and runs it on port 3200 against a **separate** database (`E2E_DATABASE_URL`, default `vd_properties_test` on the local server). The suite empties that database at the start of each run. It needs a running PostgreSQL (`npm run db:local`) and a one-time `npx playwright install chromium`.

Covered journeys include the full platform flow (`tests/e2e/platform.spec.ts`, one test per acceptance criterion): publish with Twin data → search and map → Twin → Studio with the property's data → plan and estimate update → save and compare scenarios → PlotFit reasons → signed-in enquiry in admin and account → BuildTrace creation (refused without an agreement) → inspection-evidence rule → change approval → payment → customer-only access to projects and private files → a sale reflected everywhere. Also: homepage, hero search, combined filters and sorting, sold-listing handling, empty states, property detail, 404s, robots/sitemap, property enquiry, validation errors, site-visit request, no-JavaScript form submission, lead assignment/notes/status rules and CSV export, admin sign-in and rejection of forged sessions, the full property lifecycle (draft → publish → edit → hidden price → sold → unpublish), and server-side role enforcement on pages and APIs.

## Security notes

- Passwords hashed with bcrypt (cost 12). Accounts lock for 15 minutes after 5 failed attempts, sign-in is rate-limited per IP, and failures use the same message and timing whether or not the email exists.
- Sessions are random 256-bit tokens in `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production), stored hashed and expiring after 12 hours of inactivity.
- **Authorisation is enforced on the server** in every admin page, server action and API route (`requirePage` / `requirePermission`). Hiding navigation items is purely cosmetic. Middleware only redirects requests that have no cookie.
- Server Actions get Next.js's built-in origin checks; admin API routes and public form endpoints verify `Origin` themselves.
- Uploads: images are decoded and re-encoded by sharp (anything that isn't a real JPEG, PNG, WebP or AVIF is rejected), resized, and stripped of metadata such as GPS coordinates. PDFs are checked by signature. Size limits are 12 MB for images and 10 MB for documents. Documents are private by default and served only after an access check.
- CSV exports neutralise spreadsheet-formula injection. Notification emails contain no customer personal data. Visitor IPs are stored only as salted hashes.
- Security headers: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS. `/admin` and `/api` send `X-Robots-Tag: noindex`.

## SEO notes

- Unique titles, descriptions and canonical URLs on every page. Property and project pages use their own SEO fields when set.
- `sitemap.xml` lists only published, non-sample, unsold listings and projects. `robots.txt` blocks `/admin`, `/api` and `/documents`.
- Structured data: `RealEstateAgent` (only with configured details), `RealEstateListing` with an `Offer` when the price is public, `BreadcrumbList` and `FAQPage`.
- Filtered search permutations are `noindex, follow` to avoid thin duplicates. Sold, unavailable and sample listings stay reachable but are `noindex`. Unpublished listings return 404.
- No auto-generated location pages: locations appear only where real listings or verified service areas exist.

## Project structure

```
prisma/                schema, migrations, seed
scripts/local-db.mjs   local PostgreSQL without Docker
src/app/(site)/        public pages
src/app/admin/         login, dashboard (panel) and server actions (_actions)
src/app/api/           public form endpoints, admin upload/export APIs
src/components/site    header, footer, illustrations, shared UI
src/components/property listing, search, gallery, detail
src/components/forms   public forms
src/components/admin   admin UI
src/lib/               auth, RBAC, search, validation, storage, queries, settings
tests/unit, tests/e2e  Vitest and Playwright suites
```

## Backups & recovery

- **Database:** take automated daily snapshots with point-in-time recovery from your managed PostgreSQL provider. For a manual backup: `pg_dump --format=custom "$DATABASE_URL" > vdp-$(date +%F).dump`. To restore into an empty database: `pg_restore --clean --no-owner -d "$DATABASE_URL" vdp-YYYY-MM-DD.dump`, then `npm run db:deploy`.
- **Files:** back up the upload store. That's `UPLOAD_DIR` (both `public/` and `private/`) with the local driver, or the bucket with versioning or replication enabled for S3. Private documents and BuildTrace files live under `private/`.
- **Test restores** quarterly on a staging database, and keep at least 30 days of backups. Customer records, contracts and payment references are business records, so set retention to match your legal obligations.

## Known limitations

- **Rate limiting is in-memory**, so it applies per server instance. With several instances, back it with a shared store such as Redis (`src/lib/rate-limit.ts`).
- **Site-visit availability isn't a live calendar.** Staff configure closed weekdays and blackout dates, every request is confirmed by phone, and the site says so plainly.
- **Listing images are sample illustrations** (architectural line drawings, labelled "Sample illustration · not a photo") until the company uploads its own photographs. The brand graphics (hero, explorer, skyline) are permanent design elements, not stand-ins for photos.
- **Maps**: Leaflet with OpenStreetMap tiles by default. OSM's tile policy suits low traffic only, so configure `NEXT_PUBLIC_MAP_TILE_URL` with a commercial provider in production. The satellite layer appears only when a provider is configured. Pins and boundaries appear only for properties whose exact location is authorised.
- **Property Studio** produces conceptual layouts, not architectural drawings. Setbacks and coverage are checked only against recorded or customer-entered values; local building rules aren't built in. There's no 3D viewer; the isometric massing is an exact projection of the generated footprint.
- **New-listing alerts** are emailed only when SMTP is configured and the customer has opted in. There's no email verification for customer accounts yet.
- **Customer password reset** isn't self-service yet (it needs a configured email provider). Staff can't reset customer passwords from the admin.
- **Dependency advisory**: Prisma 6's CLI config loader depends on `deepmerge-ts` < 8 (a stack-exhaustion advisory). It only runs on trusted local config, never on request input; upgrading to Prisma 7 resolves it.
- **No route-level `loading.tsx` on listing pages.** In Next.js 15.5 production builds, a segment loading boundary stalled same-page search-parameter navigations (filters, chips, sorting), so the filter and sort controls show their own "Updating…" state instead. The e2e suite covers this.
- Lighthouse and Core Web Vitals should be measured on the production deployment with real photographs, because image weight dominates those scores.
