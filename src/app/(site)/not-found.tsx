import Link from "next/link";
import { Illustration } from "@/components/site/Illustration";

export default function NotFound() {
  return (
    <div className="wrap grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="annot text-emerald">404 — Not found</p>
        <h1 className="mt-4 text-headline text-navy">This page isn't on the map.</h1>
        <p className="mt-4 max-w-md text-slate">The listing may have been removed, or the link may be incorrect.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/properties" className="btn btn-primary">Browse properties</Link>
          <Link href="/contact" className="btn btn-outline text-navy">Contact us</Link>
        </div>
      </div>
      <div className="relative aspect-[4/3]">
        <Illustration variant="land" label={false} title="Survey drawing of an open land parcel" />
      </div>
    </div>
  );
}
