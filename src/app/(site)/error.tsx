"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="wrap py-24">
      <p className="annot text-terracotta">Something went wrong</p>
      <h1 className="mt-4 text-headline text-navy">We couldn't load this page.</h1>
      <p className="mt-4 max-w-lg text-slate">This is a problem on our side. Please try again — if it keeps happening, contact us and we'll help directly.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline text-navy">Go to the homepage</Link>
      </div>
    </div>
  );
}
