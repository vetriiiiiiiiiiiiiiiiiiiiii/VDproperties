"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { DEFAULT_HANDOVER, loadManagedProject, nextProjectCode } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { checkbox, formObject, optId, optStr, runAction, type ActionResult } from "@/lib/admin";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date").transform((v) => new Date(`${v}T00:00:00Z`));
const optDate = z.preprocess((v) => (v === "" || v == null ? undefined : v), date.optional());
const rupees = z.preprocess((v) => (typeof v === "string" ? v.replace(/[,\s]/g, "") : v), z.coerce.number({ error: "Enter an amount" }).int("Whole rupees only").min(0).max(1e11));
const signedRupees = z.preprocess((v) => (typeof v === "string" ? v.replace(/[,\s]/g, "") : v), z.coerce.number({ error: "Enter an amount" }).int().min(-1e11).max(1e11));

const refresh = (id?: string) => {
  revalidatePath("/admin/buildtrace", "layout");
  revalidatePath("/account", "layout");
  if (id) revalidatePath(`/admin/buildtrace/${id}`);
};

export async function createBuildProject(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:create");
    const input = z
      .object({
        title: z.string().trim().min(3, "Enter a project title").max(120),
        customerId: z.string().min(1, "Choose the customer"),
        propertyId: optId,
        managerId: optId,
        contractorName: optStr(120),
        scope: z.string().trim().min(10, "Describe the agreed scope").max(6000),
        contractValue: rupees,
        plannedStart: date,
        plannedEnd: date,
        agreementRef: z.string().trim().min(3, "Enter the agreement reference").max(120),
        agreementDate: date,
        agreementConfirmed: z.literal("on", { error: "Confirm that a signed agreement or written authorisation is in place" }),
        stages: z.array(z.string().trim().min(2).max(120)).min(1, "Add at least one milestone"),
        budget: z.string().max(5000).default(""),
        isDemo: checkbox,
      })
      .refine((v) => v.plannedEnd >= v.plannedStart, { path: ["plannedEnd"], message: "Completion must be after the start" })
      .parse({ ...formObject(fd, ["stages"]), stages: [...fd.getAll("stages").map(String), ...String(fd.get("customStages") ?? "").split("\n")].map((s) => s.trim()).filter(Boolean) });

    const customer = await db.user.findFirst({ where: { id: input.customerId, role: "CUSTOMER", active: true } });
    if (!customer) return { ok: false, message: "Choose a registered customer account.", errors: { customerId: "Customer not found" } };
    if (input.managerId && !(await db.user.findFirst({ where: { id: input.managerId, active: true, role: { in: ["PROJECT_MANAGER", "SUPER_ADMIN"] } } }))) {
      return { ok: false, message: "Choose an active project manager.", errors: { managerId: "Not a project manager" } };
    }
    if (input.propertyId && !(await db.property.findUnique({ where: { id: input.propertyId } }))) return { ok: false, message: "Property not found.", errors: { propertyId: "Not found" } };

    const budgetLines = input.budget
      .split("\n")
      .map((l) => l.split("|").map((x) => x.trim()))
      .filter(([c, a]) => c && a && /^\d[\d,]*$/.test(a))
      .map(([category, amount], i) => ({ category: category.slice(0, 80), allowance: BigInt(amount.replace(/,/g, "")), sortOrder: i }));

    const project = await db.buildProject.create({
      data: {
        code: await nextProjectCode(),
        title: input.title,
        customerId: customer.id,
        propertyId: input.propertyId ?? null,
        managerId: input.managerId ?? null,
        contractorName: input.contractorName ?? null,
        scope: input.scope,
        contractValue: BigInt(input.contractValue),
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        agreementRef: input.agreementRef,
        agreementDate: input.agreementDate,
        isDemo: input.isDemo,
        milestones: { create: input.stages.map((name, i) => ({ name, sortOrder: i })) },
        budgetLines: { create: budgetLines },
        handover: { create: DEFAULT_HANDOVER.map((label, i) => ({ label, sortOrder: i })) },
      },
    });
    await audit({ actorId: user.id, action: "build.created", entityType: "BuildProject", entityId: project.id, summary: `${project.code} created for ${customer.email} under agreement ${input.agreementRef}` });
    refresh();
    redirect(`/admin/buildtrace/${project.id}?created=1`);
  });
}

export async function updateBuildProject(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:manage");
    const project = await loadManagedProject(user, id);
    const input = z
      .object({
        status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "HANDOVER", "COMPLETED", "CANCELLED"]),
        contractorName: optStr(120),
        customerNote: optStr(2000),
        managerId: optId,
      })
      .parse(formObject(fd));

    if (input.status !== project.status) {
      if (input.status === "HANDOVER") {
        const open = await db.buildMilestone.count({ where: { projectId: id, status: { notIn: ["REPORTED_COMPLETE", "INSPECTED"] } } });
        if (open) return { ok: false, message: `${open} milestone(s) aren't complete yet, so the project can't move to handover.` };
      }
      if (input.status === "COMPLETED") {
        const pendingItems = await db.handoverItem.count({ where: { projectId: id, required: true, done: false } });
        const pendingChanges = await db.changeRequest.count({ where: { projectId: id, status: "PROPOSED" } });
        if (pendingItems || pendingChanges) {
          return { ok: false, message: `Can't mark as handed over: ${pendingItems} required handover item(s) and ${pendingChanges} pending change request(s) remain.` };
        }
      }
    }
    const managerChange = input.managerId !== undefined && input.managerId !== project.managerId;
    if (managerChange && user.role !== "SUPER_ADMIN") return { ok: false, message: "Only a Super Admin can reassign the project manager." };
    await db.buildProject.update({
      where: { id },
      data: {
        status: input.status,
        contractorName: input.contractorName ?? null,
        customerNote: input.customerNote ?? null,
        ...(user.role === "SUPER_ADMIN" && { managerId: input.managerId ?? null }),
      },
    });
    await audit({ actorId: user.id, action: "build.updated", entityType: "BuildProject", entityId: id, summary: `${project.code}: status ${project.status} → ${input.status}` });
    refresh(id);
    return { ok: true, message: "Project updated." };
  });
}

export async function saveMilestone(projectId: string, milestoneId: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:manage");
    const project = await loadManagedProject(user, projectId);
    const input = z
      .object({
        name: z.string().trim().min(2, "Name the milestone").max(120),
        status: z.enum(["NOT_STARTED", "IN_PROGRESS", "REPORTED_COMPLETE", "INSPECTED", "BLOCKED"]).default("NOT_STARTED"),
        plannedDate: optDate,
        completedDate: optDate,
        evidence: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["CONTRACTOR_REPORTED", "STAFF_OBSERVED", "INDEPENDENT_INSPECTION", "PROFESSIONAL_CERTIFICATE"]).optional()),
        responsible: optStr(120),
        notes: optStr(3000),
        issues: optStr(3000),
        customerVisible: checkbox,
      })
      .parse(formObject(fd));
    if ((input.status === "REPORTED_COMPLETE" || input.status === "INSPECTED") && !input.completedDate) {
      return { ok: false, message: "Enter the reported completion date.", errors: { completedDate: "Required for completed milestones" } };
    }
    if (input.status === "REPORTED_COMPLETE" && !input.evidence) {
      return { ok: false, message: "Record who reported the completion.", errors: { evidence: "Choose the evidence source" } };
    }
    if (input.status === "INSPECTED" && input.evidence !== "INDEPENDENT_INSPECTION" && input.evidence !== "PROFESSIONAL_CERTIFICATE") {
      return { ok: false, message: "“Inspected” needs an independent inspection or a professional certificate as evidence. Use “Reported complete” for contractor or staff reports.", errors: { evidence: "Inspection evidence required" } };
    }
    const data = {
      name: input.name,
      status: input.status,
      plannedDate: input.plannedDate ?? null,
      completedDate: input.completedDate ?? null,
      evidence: input.evidence ?? null,
      responsible: input.responsible ?? null,
      notes: input.notes ?? null,
      issues: input.issues ?? null,
      customerVisible: input.customerVisible,
    };
    if (milestoneId) {
      const m = await db.buildMilestone.findFirst({ where: { id: milestoneId, projectId } });
      if (!m) return { ok: false, message: "Milestone not found." };
      await db.buildMilestone.update({ where: { id: milestoneId }, data });
      await audit({ actorId: user.id, action: "build.milestone_updated", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: “${input.name}” ${m.status} → ${input.status}${input.evidence ? ` (${input.evidence})` : ""}` });
    } else {
      const count = await db.buildMilestone.count({ where: { projectId } });
      await db.buildMilestone.create({ data: { ...data, projectId, sortOrder: count } });
      await audit({ actorId: user.id, action: "build.milestone_added", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: milestone “${input.name}” added` });
    }
    refresh(projectId);
    return { ok: true, message: "Milestone saved." };
  });
}

export async function addBudgetLine(projectId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:manage");
    const project = await loadManagedProject(user, projectId);
    const input = z.object({ category: z.string().trim().min(2).max(80), allowance: rupees }).parse(formObject(fd));
    const count = await db.budgetLine.count({ where: { projectId } });
    await db.budgetLine.create({ data: { projectId, category: input.category, allowance: BigInt(input.allowance), sortOrder: count } });
    await audit({ actorId: user.id, action: "build.budget_line", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: allowance “${input.category}” added` });
    refresh(projectId);
    return { ok: true, message: "Allowance added." };
  });
}

export async function recordPayment(projectId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:approve");
    const project = await loadManagedProject(user, projectId);
    const input = z
      .object({ amount: rupees.refine((v) => v > 0, "Enter the amount received"), receivedOn: date, reference: z.string().trim().min(3, "Enter the receipt or bank reference").max(120), milestoneId: optId })
      .parse(formObject(fd));
    if (input.milestoneId && !(await db.buildMilestone.findFirst({ where: { id: input.milestoneId, projectId } }))) return { ok: false, message: "Milestone not found." };
    await db.buildPayment.create({ data: { projectId, amount: BigInt(input.amount), receivedOn: input.receivedOn, reference: input.reference, milestoneId: input.milestoneId ?? null, recordedById: user.id } });
    await audit({ actorId: user.id, action: "build.payment_recorded", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: payment ₹${input.amount.toLocaleString("en-IN")} recorded (ref ${input.reference})` });
    refresh(projectId);
    return { ok: true, message: "Payment recorded." };
  });
}

export async function proposeChange(projectId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:manage");
    const project = await loadManagedProject(user, projectId);
    const input = z
      .object({
        title: z.string().trim().min(3, "Describe the change").max(160),
        reason: z.string().trim().min(5, "Give the reason").max(3000),
        costImpact: signedRupees,
        scheduleImpactDays: z.coerce.number().int().min(-365).max(730),
      })
      .parse(formObject(fd));
    await db.changeRequest.create({ data: { projectId, ...input, costImpact: BigInt(input.costImpact), requestedById: user.id } });
    await audit({ actorId: user.id, action: "build.change_proposed", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: change “${input.title}” proposed (₹${input.costImpact.toLocaleString("en-IN")}, ${input.scheduleImpactDays} days)` });
    refresh(projectId);
    return { ok: true, message: "Change request recorded. It doesn't affect the budget or schedule until approved." };
  });
}

/** Only an approver can accept a change; approval is what moves the agreed budget and schedule. */
export async function decideChange(projectId: string, changeId: string, decision: "APPROVED" | "REJECTED", _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:approve");
    const project = await loadManagedProject(user, projectId);
    const change = await db.changeRequest.findFirst({ where: { id: changeId, projectId, status: "PROPOSED" } });
    if (!change) return { ok: false, message: "This change request has already been decided." };
    const note = z.string().trim().max(1000).optional().parse(fd.get("decisionNote") || undefined);
    await db.$transaction(async (tx) => {
      await tx.changeRequest.update({ where: { id: changeId }, data: { status: decision, decidedById: user.id, decidedAt: new Date(), decisionNote: note ?? null } });
      if (decision === "APPROVED" && change.scheduleImpactDays) {
        await tx.buildProject.update({ where: { id: projectId }, data: { plannedEnd: new Date(project.plannedEnd.getTime() + change.scheduleImpactDays * 86_400_000) } });
      }
    });
    await audit({ actorId: user.id, action: `build.change_${decision.toLowerCase()}`, entityType: "BuildProject", entityId: projectId, summary: `${project.code}: change “${change.title}” ${decision.toLowerCase()}` });
    refresh(projectId);
    return { ok: true, message: decision === "APPROVED" ? "Approved — the agreed budget and schedule are updated." : "Change request rejected." };
  });
}

export async function replyQuestion(projectId: string, questionId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:manage");
    const project = await loadManagedProject(user, projectId);
    const reply = z.string().trim().min(2, "Write a reply").max(3000).parse(fd.get("reply"));
    const q = await db.buildQuestion.findFirst({ where: { id: questionId, projectId } });
    if (!q) return { ok: false, message: "Question not found." };
    await db.buildQuestion.update({ where: { id: questionId }, data: { reply, repliedById: user.id, repliedAt: new Date() } });
    await audit({ actorId: user.id, action: "build.question_replied", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: customer question answered` });
    refresh(projectId);
    return { ok: true, message: "Reply sent." };
  });
}

export async function toggleHandoverItem(projectId: string, itemId: string) {
  const user = await requirePermission("buildtrace:manage");
  const project = await loadManagedProject(user, projectId);
  const item = await db.handoverItem.findFirst({ where: { id: itemId, projectId } });
  if (!item) return;
  await db.handoverItem.update({ where: { id: itemId }, data: { done: !item.done, doneAt: item.done ? null : new Date(), doneById: item.done ? null : user.id } });
  await audit({ actorId: user.id, action: "build.handover_item", entityType: "BuildProject", entityId: projectId, summary: `${project.code}: “${item.label}” ${item.done ? "reopened" : "completed"}` });
  refresh(projectId);
}

export async function addHandoverItem(projectId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("buildtrace:manage");
    await loadManagedProject(user, projectId);
    const label = z.string().trim().min(3).max(160).parse(fd.get("label"));
    const count = await db.handoverItem.count({ where: { projectId } });
    await db.handoverItem.create({ data: { projectId, label, sortOrder: count, required: fd.get("required") === "on" } });
    refresh(projectId);
    return { ok: true, message: "Checklist item added." };
  });
}

export async function setUpdateVisibility(projectId: string, updateId: string, visible: boolean) {
  const user = await requirePermission("buildtrace:manage");
  await loadManagedProject(user, projectId);
  await db.buildUpdate.updateMany({ where: { id: updateId, projectId }, data: { customerVisible: visible } });
  await db.buildFile.updateMany({ where: { updateId, projectId }, data: { customerVisible: visible } });
  refresh(projectId);
}
