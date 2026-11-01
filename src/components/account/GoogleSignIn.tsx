"use client";

import Link from "@/i18n/Link";
import { useI18n } from "@/i18n/client";

/** A plain link: signing in leaves the site, so it must never be prefetched. */
export function GoogleSignIn({ next }: { next: string }) {
  const { t, locale } = useI18n();
  const a = t.market.auth;
  return (
    <div className="mb-5">
      <a
        href={`/api/auth/google/start?${new URLSearchParams({ next, lang: locale })}`}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-navy"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.400c-.5 2.900-2.100 5.300-4.600 7l7.100 5.500c4.200-3.900 7.200-9.600 7.200-17z" />
          <path fill="#FBBC05" d="M10.600 28.600c-.5-1.400-.8-3-.8-4.600s.3-3.200.8-4.600l-8-6.200C.9 16.500 0 20.100 0 24s.9 7.500 2.600 10.800l8-6.200z" />
          <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.900l-7.100-5.500c-2.200 1.500-5 2.400-8.800 2.400-6.200 0-11.500-4.200-13.400-9.900l-8 6.200C6.500 42.600 14.600 48 24 48z" />
        </svg>
        {a.google}
      </a>
      <p className="mt-2 text-center text-xs text-slate">
        {a.googleTermsA} <Link href="/terms" className="underline">{t.account.auth.terms}</Link> {a.googleTermsAnd} <Link href="/privacy" className="underline">{t.account.auth.privacy}</Link>.
      </p>
      <p className="mt-4 flex items-center gap-3 text-xs text-slate" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />{a.or}<span className="h-px flex-1 bg-line" />
      </p>
    </div>
  );
}
