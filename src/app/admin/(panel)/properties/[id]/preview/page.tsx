import { notFound } from "next/navigation";
import { PropertyDetailView } from "@/components/property/PropertyDetailView";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Preview", robots: { index: false } };

export default async function PreviewProperty({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("properties:manage");
  const p = await db.property.findUnique({
    where: { id: (await params).id },
    include: {
      location: true,
      amenities: { orderBy: { name: "asc" } },
      images: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      documents: { where: { isPublic: true } },
      project: true,
    },
  });
  if (!p) notFound();
  return (
    <div className="-mx-4 -my-6 sm:-mx-8 lg:-my-10">
      <p className="sticky top-0 z-20 bg-gold px-4 py-2 text-center text-sm font-semibold text-ink">
        Preview — {p.publication === "PUBLISHED" ? "this listing is live" : "this draft is not visible to the public"}
      </p>
      <PropertyDetailView p={p} preview />
    </div>
  );
}
