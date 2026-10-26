"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/platform";
import { can } from "@/lib/rbac";
import { assertInScope, isAssignable } from "@/lib/zones";
import { formObject, optId, runAction, type ActionResult } from "@/lib/admin";

// datetime-local inputs carry no zone; staff enter India Standard Time.
const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+05:30` : v),
  z.coerce.date().nullable(),
);

const purchaseUpdate = z.object({
  status: z.enum(["NEW", "CONTACTED", "APPOINTMENT_SCHEDULED", "NEGOTIATING", "BOOKED", "COMPLETED", "CLOSED"]),
  assignedToId: optId,
  scheduledFor: dateOrNull,
  appointmentNote: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(500).optional()),
  followUpAt: dateOrNull,
  updateProperty: z.preprocess((v) => v === "on", z.boolean()),
});

/**
 * Moves a purchase request along. Confirming an appointment needs a date and time; a booking or
 * completed sale can also reserve or sell the property, which only admins may do.
 */
export async function updatePurchase(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("purchases:manage");
    await assertInScope(user, "purchase", id);
    const input = purchaseUpdate.parse(formObject(fd));
    if (!(await isAssignable(input.assignedToId))) return { ok: false, message: "That team member isn't available.", errors: { assignedToId: "Choose an active team member" } };
    if (input.status === "APPOINTMENT_SCHEDULED" && !input.scheduledFor) {
      return { ok: false, message: "Enter the confirmed appointment date and time.", errors: { scheduledFor: "Required to confirm the appointment" } };
    }
    const before = await db.purchaseRequest.findUniqueOrThrow({ where: { id }, select: { status: true, propertyId: true, propertyLabel: true } });
    await db.purchaseRequest.update({
      where: { id },
      data: { status: input.status, assignedToId: input.assignedToId ?? null, scheduledFor: input.scheduledFor, appointmentNote: input.appointmentNote ?? null, followUpAt: input.followUpAt },
    });

    let propertyNote = "";
    if (input.updateProperty && before.propertyId && (input.status === "BOOKED" || input.status === "COMPLETED")) {
      if (!can(user.role, "properties:publish")) return { ok: false, message: "Saved, but only an Admin can reserve or mark a property as sold." };
      const availability = input.status === "BOOKED" ? "RESERVED" : "SOLD";
      await db.property.update({ where: { id: before.propertyId }, data: { availability } });
      await recordActivity(before.propertyId, "AVAILABILITY", `Availability changed to ${availability.toLowerCase()}`);
      propertyNote = availability === "RESERVED" ? " The property is now reserved." : " The property is now marked sold.";
      revalidatePath("/", "layout");
    }
    await audit({ actorId: user.id, action: "purchase.updated", entityType: "PurchaseRequest", entityId: id, summary: `${before.propertyLabel}: ${before.status} → ${input.status}` });
    revalidatePath("/admin", "layout");
    revalidatePath("/account");
    return { ok: true, message: `Purchase request updated.${propertyNote}` };
  });
}
