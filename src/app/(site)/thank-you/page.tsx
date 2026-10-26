import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Request received", robots: { index: false } };

const ERRORS: Record<string, string> = {
  "409": "We already received this request a few minutes ago, so there's no need to send it again.",
  "422": "Some details were missing or invalid. Please go back and check the form.",
  "429": "Too many requests were sent from this connection. Please try again in a few minutes.",
  "400": "We couldn't verify the submission. Please go back, wait a few seconds and try again.",
};

export default async function ThankYou({ searchParams }: { searchParams: Promise<{ kind?: string; ref?: string; error?: string }> }) {
  const { kind, ref, error } = await searchParams;
  const visit = kind === "visit";
  if (error) {
    return (
      <div className="wrap max-w-2xl py-24">
        <p className="annot text-terracotta">Not sent</p>
        <h1 className="mt-4 text-headline text-navy">Your request wasn't sent.</h1>
        <p className="mt-4 text-slate">{ERRORS[error] ?? "Something went wrong on our side and your request was not saved. Please try again, or call us."}</p>
        <Link href={visit ? "/site-visit" : "/contact#enquire"} className="btn btn-primary mt-8">Try again</Link>
      </div>
    );
  }
  return (
    <div className="wrap max-w-2xl py-24">
      <p className="annot text-emerald">Received</p>
      <h1 className="mt-4 text-headline text-navy">Thank you — your {visit ? "site visit request" : "enquiry"} has been received.</h1>
      {ref && <p className="annot-plain mt-3 text-slate">Reference {ref.replace(/[^A-Z0-9]/gi, "").slice(0, 12)}</p>}
      <p className="mt-6 text-lg text-slate">
        {visit
          ? "This is a request, not a confirmed appointment. Our team will call you to agree a time, and the visit is booked only once we've confirmed it with you."
          : "Our team will call you on the number you provided."}
      </p>
      <Link href="/properties" className="link-arrow mt-8 text-emerald">Continue browsing properties</Link>
    </div>
  );
}
