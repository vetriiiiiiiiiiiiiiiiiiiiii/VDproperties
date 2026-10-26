import type { Metadata } from "next";
import { SellerListingForm, type SellerValues } from "@/components/account/SellerForms";
import { Breadcrumbs } from "@/components/site/ui";
import { getI18n } from "@/i18n/server";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.form.newTitle, robots: { index: false } };
}

export default async function NewListing() {
  const me = await requireCustomerPage("/account/listings/new");
  const { t } = await getI18n();
  const [user, locations] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, phone: true } }),
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
  ]);
  const empty = Object.fromEntries(
    ["type", "title", "description", "locationId", "sellerLocationText", "localityLabel", "sellerAddress", "landAreaSqft", "plotDimensions", "facing", "builtUpAreaSqft", "bedrooms", "bathrooms", "floors", "accessRoad", "approvalInfo", "expectedPrice", "sellerRelation"].map((k) => [k, ""]),
  ) as Omit<SellerValues, "name" | "phone">;
  return (
    <div className="wrap max-w-4xl py-10">
      <Breadcrumbs items={[{ label: t.account.dash.eyebrow, href: "/account" }, { label: t.market.mine.title, href: "/account/listings" }, { label: t.market.form.newTitle }]} />
      <h1 className="mt-6 text-headline text-navy">{t.market.form.newTitle}</h1>
      <p className="mt-2 max-w-2xl text-slate">{t.market.form.newIntro}</p>
      <div className="mt-8">
        <SellerListingForm
          values={{ ...empty, name: user.name, phone: user.phone ?? "" }}
          locations={locations.map((l) => ({ id: l.id, label: l.name.replace(/\s*\(sample\)/i, "") + (l.city ? `, ${l.city}` : "") }))}
        />
      </div>
    </div>
  );
}
