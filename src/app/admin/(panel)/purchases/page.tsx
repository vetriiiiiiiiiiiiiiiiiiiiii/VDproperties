import type { Prisma, PurchaseStatus } from "@prisma/client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { APPOINTMENT_MODE_LABEL, PURCHASE_STATUS_LABEL } from "@/lib/labels";
import { purchaseScope } from "@/lib/zones";

export const metadata = { title: "Purchase requests" };

export default async function Purchases({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; mine?: string }> }) {
  const user = await requirePage("purchases:manage");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const where: Prisma.PurchaseRequestWhereInput = {
    AND: [await purchaseScope(user), ...(q ? [{ OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { propertyLabel: { contains: q, mode: "insensitive" as const } }] }] : [])],
    ...(sp.status && sp.status in PURCHASE_STATUS_LABEL ? { status: sp.status as PurchaseStatus } : { status: { notIn: ["CLOSED", "COMPLETED"] } }),
    ...(sp.mine === "1" && { assignedToId: user.id }),
  };
  const items = await db.purchaseRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { assignedTo: { select: { name: true } } } });
  return (
    <>
      <PageHeader title="Purchase requests" description={`Buyers who've asked to buy a listing and proposed an appointment.${user.role === "ZONAL_OFFICER" ? " Showing your zones only." : ""} Nothing is paid online; record bookings and sales here once agreed.`} />
      <form className="mb-6 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Buyer, phone or property" aria-label="Search purchase requests" className="field" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field">
          <option value="">Open requests</option>
          {Object.entries(PURCHASE_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} className="accent-emerald" /> Assigned to me</label>
        <button className="btn btn-outline min-h-11 text-sm text-navy">Filter</button>
      </form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Received</th><th scope="col" className="px-4 py-3">Buyer</th><th scope="col" className="px-4 py-3">Property</th><th scope="col" className="px-4 py-3">Offer</th><th scope="col" className="px-4 py-3">Appointment</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Assigned</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((r) => (
              <tr key={r.id} className={`hover:bg-ivory ${r.status === "NEW" ? "font-semibold" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3 text-slate">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3"><Link href={`/admin/purchases/${r.id}`} className="text-navy hover:underline">{r.name}</Link><span className="block text-xs font-normal text-slate">{r.phone}</span></td>
                <td className="max-w-[16rem] truncate px-4 py-3">{r.propertyLabel}</td>
                <td className="px-4 py-3">{r.offerAmount !== null ? formatPrice(Number(r.offerAmount)) : "—"}</td>
                <td className="px-4 py-3">{APPOINTMENT_MODE_LABEL[r.mode]}<span className="block text-xs font-normal text-slate">{r.scheduledFor ? `Confirmed ${formatDateTime(r.scheduledFor)}` : `Asked for ${formatDate(r.preferredDate, { dateStyle: "medium", timeZone: "UTC" })}`}</span></td>
                <td className="px-4 py-3">{PURCHASE_STATUS_LABEL[r.status]}</td>
                <td className="px-4 py-3">{r.assignedTo?.name ?? <span className="text-slate">—</span>}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate">No purchase requests match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
