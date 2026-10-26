import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "BuildTrace — Track your construction",
  description: "BuildTrace gives V D Properties construction customers a clear view of agreed milestones, progress, approved costs, documents and handover.",
  alternates: { canonical: "/buildtrace" },
};

const FEATURES = [
  ["Agreed milestones", "Your project's own stages and planned dates — set from your agreement, not a generic template."],
  ["Honest progress", "Every update says who reported it. Contractor claims are shown separately from independent inspections."],
  ["Budget you can follow", "Contract value, approved variations, recorded payments and what's outstanding. Changes count only once approved."],
  ["Photos & documents", "Progress photos and project documents your team shares with you, kept private to your account."],
  ["Questions in one place", "Ask your project team directly and keep a record of every answer."],
  ["A clear handover", "A checklist of inspections, defects, warranties and keys — your home is handed over only when it's complete."],
];

export default async function BuildTraceLanding() {
  const user = await getCurrentUser();
  return (
    <>
      <PageIntro eyebrow="BuildTrace" title="Your build, followed step by step" crumbs={[{ label: "BuildTrace" }]}>
        For customers building a home with V D Properties. BuildTrace opens once your construction agreement is signed and our team sets up your project.
      </PageIntro>
      <div className="wrap py-14">
        <ol className="grid gap-px bg-line md:grid-cols-3">
          {FEATURES.map(([t, b], i) => (
            <li key={t} className="bg-white p-6">
              <span className="font-mono text-sm text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-3 text-2xl text-navy">{t}</h2>
              <p className="mt-2 text-slate">{b}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href={user?.role === "CUSTOMER" ? "/account" : "/account/login?next=/account"} className="btn btn-primary">Track My Build</Link>
          <Link href="/construction#enquire" className="btn btn-gold">Discuss a Construction Project</Link>
        </div>
        <p className="mt-6 max-w-2xl text-sm text-slate">Project records are visible only to you and your assigned project team. Online payments aren't taken through BuildTrace.</p>
      </div>
    </>
  );
}
