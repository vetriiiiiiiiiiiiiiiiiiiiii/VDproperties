import { db } from "@/lib/db";

/** Shown site-wide while any sample listing or project exists, so sample content can't go live unnoticed. */
export async function SampleBanner() {
  const [p, j] = await Promise.all([db.property.count({ where: { isSample: true } }), db.project.count({ where: { isSample: true } })]);
  if (p + j === 0) return null;
  return (
    <div className="bg-terracotta-deep text-ivory">
      <p className="wrap py-2 text-center text-xs sm:text-sm">
        Development build: this site contains <strong>sample listings and placeholder text</strong>. They aren't real properties. Remove them in the admin dashboard before launch.
      </p>
    </div>
  );
}
