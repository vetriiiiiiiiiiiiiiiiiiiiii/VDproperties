import { db } from "@/lib/db";

export async function propertyFormOptions() {
  const [locations, amenities, projects] = await Promise.all([
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
    db.amenity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { locations, amenities, projects };
}
