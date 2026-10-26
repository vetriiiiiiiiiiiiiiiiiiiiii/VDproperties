import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Customers" };

export default async function Customers() {
  await requirePage("customers:view");
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, name: true, email: true, phone: true, createdAt: true, marketingConsent: true, _count: { select: { savedProperties: true, scenarios: true, customerEnquiries: true, buildProjects: true } } },
  });
  return (
    <>
      <PageHeader title="Customer accounts" description="Registered customers. Use these accounts when creating BuildTrace projects." />
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Customer</th><th scope="col" className="px-4 py-3">Joined</th><th scope="col" className="px-4 py-3">Saved</th><th scope="col" className="px-4 py-3">Scenarios</th><th scope="col" className="px-4 py-3">Enquiries</th><th scope="col" className="px-4 py-3">Projects</th><th scope="col" className="px-4 py-3">Listing emails</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3"><span className="font-semibold">{c.name}</span><span className="block text-xs text-slate">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span></td>
                <td className="px-4 py-3 text-slate">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">{c._count.savedProperties}</td>
                <td className="px-4 py-3">{c._count.scenarios}</td>
                <td className="px-4 py-3">{c._count.customerEnquiries}</td>
                <td className="px-4 py-3">{c._count.buildProjects}</td>
                <td className="px-4 py-3">{c.marketingConsent ? "Opted in" : "No"}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate">No customer accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
