"use client";

import Link from "@/i18n/Link";
import { useI18n } from "@/i18n/client";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleSavedProperty } from "@/app/account/_actions/customer";

export function SaveButton({ propertyId, saved, signedIn, className = "" }: { propertyId: string; saved: boolean; signedIn: boolean; className?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isSaved, setSaved] = useState(saved);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!signedIn)
    return (
      <Link href={`/account/login?next=${encodeURIComponent(pathname)}`} className={`btn btn-outline text-navy ${className}`}>
        {t.listings.save.signIn}
      </Link>
    );
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={isSaved}
        disabled={pending}
        className={`btn ${isSaved ? "btn-gold" : "btn-outline text-navy"} ${className}`}
        onClick={() =>
          start(async () => {
            const r = await toggleSavedProperty(propertyId);
            if (r.ok) setSaved((s) => !s);
            setMsg(r.message);
          })
        }
      >
        {isSaved ? t.listings.save.saved : t.listings.save.save}
      </button>
      {msg && <span role="status" className="mt-1 text-xs text-slate">{msg}</span>}
    </span>
  );
}
