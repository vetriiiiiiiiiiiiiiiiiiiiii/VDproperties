"use server";

import type { SubmissionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission, type SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logSubmission } from "@/lib/listings";
import { assertInScope } from "@/lib/zones";
import { formObject, runAction, type ActionResult } from "@/lib/admin";

const OPEN: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "INSPECTED"];

async function load(user: SessionUser, id: string) {
  await assertInScope(user, "property", id);
  const p = await db.property.findFirst({ where: { id, source: "OWNER" }, select: { id: true, referenceCode: true, title: true, submissionStatus: true, locationId: true } });
  if (!p || !p.submissionStatus) throw new Error("Submission not found");
  return p;
}

function refresh(id: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/account", "layout");
}

/** Reviewers (including zonal officers in their zones) move a submission through review. */
export async function reviewSubmission(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("submissions:review");
    const p = await load(user, id);
    if (!OPEN.includes(p.submissionStatus!)) return { ok: false, message: "This submission is closed." };
    const input = z
      .object({
        step: z.enum(["start", "changes", "inspected", "note"]),
        message: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(2000).optional()),
        inspectionNotes: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(4000).optional()),
      })
      .parse(formObject(fd));

    if (input.step === "start") {
      await db.property.update({ where: { id }, data: { submissionStatus: "UNDER_REVIEW" } });
      await logSubmission(id, { actorId: user.id, status: "UNDER_REVIEW", message: input.message ?? "Our team has started reviewing your property." });
    } else if (input.step === "changes") {
      const msg = input.message ?? "";
      if (msg.length < 10) return { ok: false, message: "Tell the seller what to change.", errors: { message: "Tell the seller what to change" } };
      await db.property.update({ where: { id }, data: { submissionStatus: "CHANGES_REQUESTED" } });
      await logSubmission(id, { actorId: user.id, status: "CHANGES_REQUESTED", message: msg });
    } else if (input.step === "inspected") {
      const notes = input.inspectionNotes ?? "";
      if (notes.length < 10) return { ok: false, message: "Record what you found at the inspection.", errors: { inspectionNotes: "Record what you found at the inspection" } };
      await db.property.update({ where: { id }, data: { submissionStatus: "INSPECTED", inspectedById: user.id, inspectedAt: new Date(), inspectionNotes: notes } });
      await logSubmission(id, { actorId: user.id, status: "INSPECTED", message: input.message ?? "Our team has inspected the property." });
      await logSubmission(id, { actorId: user.id, message: `Inspection notes: ${notes}`, visibleToSeller: false });
    } else {
      const msg = input.message ?? "";
      if (msg.length < 2) return { ok: false, message: "Write a note first.", errors: { message: "Write a note" } };
      await logSubmission(id, { actorId: user.id, message: msg, visibleToSeller: false });
    }
    await audit({ actorId: user.id, action: `submission.${input.step}`, entityType: "Property", entityId: id, summary: `${p.referenceCode}: ${input.step}` });
    refresh(id);
    return { ok: true, message: input.step === "note" ? "Note added." : "Submission updated." };
  });
}

/** Admins approve a submission into the catalogue (as a draft to finish and publish) or decline it. */
export async function decideSubmission(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let approved = false;
  const result = await runAction(async () => {
    const user = await requirePermission("submissions:approve");
    const p = await load(user, id);
    if (!OPEN.includes(p.submissionStatus!)) return { ok: false, message: "This submission is closed." };
    const input = z
      .object({
        decision: z.enum(["approve", "reject"]),
        locationId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
        message: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(2000).optional()),
      })
      .parse(formObject(fd));
    if (input.decision === "reject") {
      const msg = input.message ?? "";
      if (msg.length < 10) return { ok: false, message: "Explain to the seller why it wasn't accepted.", errors: { message: "Explain why it wasn't accepted" } };
      await db.property.update({ where: { id }, data: { submissionStatus: "REJECTED", publication: "DRAFT" } });
      await logSubmission(id, { actorId: user.id, status: "REJECTED", message: msg });
      await audit({ actorId: user.id, action: "submission.rejected", entityType: "Property", entityId: id, summary: p.referenceCode });
      refresh(id);
      return { ok: true, message: "Submission declined. The seller can see your message." };
    }
    const locationId = input.locationId ?? p.locationId;
    if (!locationId || !(await db.location.findUnique({ where: { id: locationId }, select: { id: true } }))) {
      return { ok: false, message: "Choose the catalogue location before approving, so the listing reaches the right zone.", errors: { locationId: "Choose a location" } };
    }
    await db.property.update({ where: { id }, data: { submissionStatus: "APPROVED", locationId } });
    await logSubmission(id, { actorId: user.id, status: "APPROVED", message: input.message ?? "Approved. We're preparing your listing to publish." });
    await audit({ actorId: user.id, action: "submission.approved", entityType: "Property", entityId: id, summary: p.referenceCode });
    refresh(id);
    approved = true;
    return { ok: true, message: "Approved." };
  });
  // Next step is preparing the listing (price display, photo descriptions) and publishing it.
  if (approved) redirect(`/admin/properties/${id}`);
  return result;
}
