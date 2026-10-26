"use client";

import Link from "@/i18n/Link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  const x = t.errorPage;
  useEffect(() => console.error(error), [error]);
  return (
    <div className="wrap py-24">
      <p className="annot text-terracotta">{x.eyebrow}</p>
      <h1 className="mt-4 text-headline text-navy">{x.title}</h1>
      <p className="mt-4 max-w-lg text-slate">{x.body}</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">{x.retry}</button>
        <Link href="/" className="btn btn-outline text-navy">{x.home}</Link>
      </div>
    </div>
  );
}
