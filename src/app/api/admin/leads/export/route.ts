import { audit } from "@/lib/audit";
import { csvCell } from "@/lib/csv";
import { db } from "@/lib/db";
import { guard } from "@/lib/admin-route";
import { ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, SITE_VISIT_STATUS_LABEL, TIME_SLOT_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req, "leads:export", { mutating: false });
  if ("error" in g) return g.error;
  const kind = new URL(req.url).searchParams.get("kind") === "site-visits" ? "site-visits" : "enquiries";

  let rows: unknown[][];
  if (kind === "enquiries") {
    const items = await db.enquiry.findMany({ orderBy: { createdAt: "desc" }, include: { assignedTo: { select: { name: true } } }, take: 10000 });
    rows = [
      ["Reference", "Received", "Type", "Status", "Name", "Phone", "Email", "Property / project", "Message", "Site location", "Plot sq ft", "House sq ft", "Budget", "Start", "Assigned to", "Follow-up"],
      ...items.map((e) => [e.id.slice(-8).toUpperCase(), e.createdAt, ENQUIRY_TYPE_LABEL[e.type], ENQUIRY_STATUS_LABEL[e.status], e.name, e.phone, e.email, e.propertyLabel, e.message, e.siteLocation, e.plotAreaSqft, e.houseSizeSqft, e.budgetRange, e.startTimeframe, e.assignedTo?.name, e.followUpAt]),
    ];
  } else {
    const items = await db.siteVisit.findMany({ orderBy: { createdAt: "desc" }, include: { assignedTo: { select: { name: true } } }, take: 10000 });
    rows = [
      ["Reference", "Received", "Status", "Subject", "Preferred date", "Time", "Confirmed for", "Name", "Phone", "Email", "Message", "Assigned to"],
      ...items.map((v) => [v.id.slice(-8).toUpperCase(), v.createdAt, SITE_VISIT_STATUS_LABEL[v.status], v.subjectLabel, v.preferredDate.toISOString().slice(0, 10), TIME_SLOT_LABEL[v.timeSlot], v.scheduledFor, v.name, v.phone, v.email, v.message, v.assignedTo?.name]),
    ];
  }

  await audit({ actorId: g.user.id, action: "leads.exported", entityType: kind === "enquiries" ? "Enquiry" : "SiteVisit", summary: `Exported ${rows.length - 1} ${kind}` });
  const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vd-properties-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
