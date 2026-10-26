"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formObject, optId, runAction, type ActionResult } from "@/lib/admin";
import { assertInScope, isAssignable as checkAssignee } from "@/lib/zones";

// datetime-local inputs carry no zone; staff enter India Standard Time.
const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+05:30` : v),
  z.coerce.date().nullable(),
);

const enquiryUpdate = z.object({
  status: z.enum(["NEW", "CONTACTED", "IN_PROGRESS", "CLOSED", "SPAM"]),
  assignedToId: optId,
  followUpAt: dateOrNull,
});

export async function updateEnquiry(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("leads:manage");
    await assertInScope(user, "enquiry", id);
    const input = enquiryUpdate.parse(formObject(fd));
    if (!(await checkAssignee(input.assignedToId))) {
      return { ok: false, message: "That team member isn't available.", errors: { assignedToId: "Choose an active team member" } };
    }
    const before = await db.enquiry.findUniqueOrThrow({ where: { id }, select: { status: true, assignedToId: true } });
    await db.enquiry.update({ where: { id }, data: { status: input.status, assignedToId: input.assignedToId ?? null, followUpAt: input.followUpAt } });
    await audit({
      actorId: user.id,
      action: "enquiry.updated",
      entityType: "Enquiry",
      entityId: id,
      summary: `Status ${before.status} → ${input.status}${before.assignedToId !== (input.assignedToId ?? null) ? ", reassigned" : ""}`,
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Enquiry updated." };
  });
}

const visitUpdate = z.object({
  status: z.enum(["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"]),
  assignedToId: optId,
  followUpAt: dateOrNull,
  scheduledFor: dateOrNull,
});

export async function updateSiteVisit(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("leads:manage");
    await assertInScope(user, "siteVisit", id);
    const input = visitUpdate.parse(formObject(fd));
    if (!(await checkAssignee(input.assignedToId))) {
      return { ok: false, message: "That team member isn't available.", errors: { assignedToId: "Choose an active team member" } };
    }
    if (input.status === "SCHEDULED" && !input.scheduledFor) {
      return { ok: false, message: "Enter the confirmed date and time before marking the visit as scheduled.", errors: { scheduledFor: "Required for scheduled visits" } };
    }
    const before = await db.siteVisit.findUniqueOrThrow({ where: { id }, select: { status: true } });
    await db.siteVisit.update({ where: { id }, data: { ...input, assignedToId: input.assignedToId ?? null } });
    await audit({ actorId: user.id, action: "site_visit.updated", entityType: "SiteVisit", entityId: id, summary: `Status ${before.status} → ${input.status}` });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Site visit updated." };
  });
}

export async function addNote(target: { enquiryId?: string; siteVisitId?: string; purchaseId?: string }, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("leads:manage");
    if (target.enquiryId) await assertInScope(user, "enquiry", target.enquiryId);
    if (target.siteVisitId) await assertInScope(user, "siteVisit", target.siteVisitId);
    if (target.purchaseId) await assertInScope(user, "purchase", target.purchaseId);
    const body = z.string().trim().min(1, "Write a note").max(4000).parse(fd.get("body"));
    await db.leadNote.create({ data: { body, authorId: user.id, enquiryId: target.enquiryId ?? null, siteVisitId: target.siteVisitId ?? null, purchaseId: target.purchaseId ?? null } });
    await audit({
      actorId: user.id,
      action: "lead.note_added",
      entityType: target.enquiryId ? "Enquiry" : target.siteVisitId ? "SiteVisit" : "PurchaseRequest",
      entityId: target.enquiryId ?? target.siteVisitId ?? target.purchaseId,
      summary: "Internal note added",
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Note added." };
  });
}
