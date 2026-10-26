import type { Prisma, SubmissionStatus } from "@prisma/client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, SUBMISSION_STATUS_LABEL } from "@/lib/labels";
import { propertyScope } from "@/lib/zones";

export const metadata = { title: "Owner submissions" };

const OPEN: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "INSPECTED"];

export default async function Submissions({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requirePage("submissions:review");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const status = sp.status && sp.status in SUBMISSION_STATUS_LABEL ? (sp.status as SubmissionStatus) : null;
  const where: Prisma.PropertyWhereInput = {
    source: "OWNER",
    AND: [
      await propertyScope(user),
      ...(q ? [{ OR: [{ title: { contains: q, mode: "insensitive" as const } }, { referenceCode: { contains: q, mode: "insensitive" as const } }, { seller: { name: { contains: q, mode: "insensitive" as const } } }] }] : []),
    ],
    submissionStatus: status ?? { in: OPEN },
  };
  const items = await db.property.findMany({
    where,
    orderBy: { submittedAt: "asc" },
    take: 200,
    include: { seller: { select: { name: true, phone: true } }, location: { select: { name: true, zone: { select: { name: true } } } }, _count: { select: { images: true, documents: true } } },
  });
  return (
    <>
      <PageHeader
        title="Owner submissions"
        description={`Properties owners have submitted for sale. ${user.role === "ZONAL_OFFICER" ? "Showing your zones only. " : ""}Review and inspect them; an Admin approves, then finishes and publishes the listing.`}
      />
      <form className="mb-6 grid gap-3 border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Title, ID or seller" aria-label="Search submissions" className="field" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field">
          <option value="">Open (needs action)</option>
          {Object.entries(SUBMISSION_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="btn btn-outline min-h-11 text-sm text-navy">Filter</button>
      </form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Submitted</th><th scope="col" className="px-4 py-3">Property</th><th scope="col" className="px-4 py-3">Seller</th><th scope="col" className="px-4 py-3">Location</th><th scope="col" className="px-4 py-3">Files</th><th scope="col" className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => (
              <tr key={p.id} className={`hover:bg-ivory ${p.submissionStatus === "SUBMITTED" ? "font-semibold" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3 text-slate">{p.submittedAt ? formatDateTime(p.submittedAt) : "—"}</td>
                <td className="px-4 py-3"><Link href={`/admin/submissions/${p.id}`} className="text-navy hover:underline">{p.referenceCode} · {p.title}</Link><span className="block text-xs font-normal text-slate">{PROPERTY_TYPE_LABEL[p.type]}</span></td>
                <td className="px-4 py-3">{p.seller?.name ?? "—"}<span className="block text-xs font-normal text-slate">{p.seller?.phone}</span></td>
                <td className="px-4 py-3">{p.location?.name ?? p.sellerLocationText ?? "—"}<span className="block text-xs font-normal text-slate">{p.location?.zone?.name ?? (p.location ? "No zone" : "Not in catalogue yet")}</span></td>
                <td className="px-4 py-3 text-slate">{p._count.images} photos · {p._count.documents} PDFs</td>
                <td className="px-4 py-3">{p.submissionStatus ? SUBMISSION_STATUS_LABEL[p.submissionStatus] : "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate">No submissions match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
