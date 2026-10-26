import Link from "@/i18n/Link";
import { Illustration } from "@/components/site/Illustration";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  const x = t.notFound;
  return (
    <div className="wrap grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="annot text-emerald">{x.eyebrow}</p>
        <h1 className="mt-4 text-headline text-navy">{x.title}</h1>
        <p className="mt-4 max-w-md text-slate">{x.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/properties" className="btn btn-primary">{x.browse}</Link>
          <Link href="/contact" className="btn btn-outline text-navy">{x.contact}</Link>
        </div>
      </div>
      <div className="blob-mask relative aspect-[4/3]">
        <Illustration variant="land" label={false} title={x.drawing} />
      </div>
    </div>
  );
}
