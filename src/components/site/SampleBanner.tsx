import { getI18n } from "@/i18n/server";
import { db } from "@/lib/db";

/** Shown site-wide while any sample listing or project exists, so sample content can't go live unnoticed. */
export async function SampleBanner() {
  const [{ t }, p, j] = await Promise.all([getI18n(), db.property.count({ where: { isSample: true } }), db.project.count({ where: { isSample: true } })]);
  if (p + j === 0) return null;
  return (
    <div className="bg-terracotta-deep text-ivory">
      <p className="wrap py-1.5 text-center text-xs">
        {t.sampleBanner.before} <strong>{t.sampleBanner.strong}</strong>
        {t.sampleBanner.after}
      </p>
    </div>
  );
}
