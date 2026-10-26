import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL } from "@/lib/labels";

export const metadata = { title: "Enquiries" };

type SP = { q?: string; status?: string; type?: string; mine?: string; page?: string };
const PER = 30;

export default async function Enquiries({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("leads:manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 80);
  const where: Prisma.EnquiryWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { propertyLabel: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(sp.status && sp.status in ENQUIRY_STATUS_LABEL ? { status: sp.status as "NEW" } : { status: { not: "SPAM" } }),
    ...(sp.type && sp.type in ENQUIRY_TYPE_LABEL && { type: sp.type as "GENERAL" }),
    ...(sp.mine === "1" && { assignedToId: user.id }),
  };
  const [total, items] = await Promise.all([
    db.enquiry.count({ where }),
    db.enquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { assignedTo: { select: { name: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (n: number) => `?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(n) })}`;

  return (
    <>
      <PageHeader title="Enquiries" description={`${total} matching`} actions={<a href="/api/admin/leads/export?kind=enquiries" className="btn btn-outline min-h-10 text-sm text-navy">Export CSV</a>} />
      <form className="mb-6 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Name, phone, email or property" aria-label="Search enquiries" className="field" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field">
          <option value="">All except spam</option>
          {Object.entries(ENQUIRY_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} aria-label="Type" className="field">
          <option value="">All types</option>
          {Object.entries(ENQUIRY_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} className="accent-emerald" /> Assigned to me</label>
        <button className="btn btn-outline min-h-11 text-sm text-navy">Filter</button>
      </form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Received</th><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Type</th><th scope="col" className="px-4 py-3">About</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Assigned</th><th scope="col" className="px-4 py-3">Follow-up</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((e) => (
              <tr key={e.id} className={`hover:bg-ivory ${e.status === "NEW" ? "font-semibold" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3 text-slate">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-3"><Link href={`/admin/enquiries/${e.id}`} className="text-navy underline-offset-2 hover:underline">{e.name}</Link></td>
                <td className="px-4 py-3">{ENQUIRY_TYPE_LABEL[e.type]}</td>
                <td className="max-w-[16rem] truncate px-4 py-3">{e.propertyLabel ?? "—"}</td>
                <td className="px-4 py-3">{ENQUIRY_STATUS_LABEL[e.status]}</td>
                <td className="px-4 py-3">{e.assignedTo?.name ?? <span className="text-slate">—</span>}</td>
                <td className="whitespace-nowrap px-4 py-3">{e.followUpAt ? <span className={e.followUpAt < new Date() ? "text-terracotta-deep" : ""}>{formatDateTime(e.followUpAt)}</span> : "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate">No enquiries match.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={qs(page - 1)} className="underline">Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link href={qs(page + 1)} className="underline">Next</Link>}
        </nav>
      )}
    </>
  );
}
