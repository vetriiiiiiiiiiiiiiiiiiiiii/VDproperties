import "server-only";
import type { BuildProject, MilestoneStatus } from "@prisma/client";
import { AuthError, type SessionUser } from "./auth";
import { db } from "./db";
import { can } from "./rbac";

export const DEFAULT_STAGES = [
  "Planning and design",
  "Approvals and preparation",
  "Site preparation",
  "Foundation",
  "Structural work",
  "Roofing",
  "Electrical and plumbing",
  "Plastering and finishing",
  "Fixtures and final works",
  "Inspection and handover",
];

export const DEFAULT_HANDOVER = [
  "Final inspection records",
  "Snag / defect list resolved",
  "Warranties and manuals handed over",
  "Keys and access details handed over",
  "Agreed final account settled",
  "Outstanding actions closed",
  "Customer handover acknowledgement",
];

export const BUILD_STATUS_LABEL = { PLANNING: "Planning", ACTIVE: "In progress", ON_HOLD: "On hold", HANDOVER: "Handover", COMPLETED: "Completed", CANCELLED: "Cancelled" } as const;
export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  REPORTED_COMPLETE: "Reported complete",
  INSPECTED: "Inspected",
  BLOCKED: "Blocked",
};
export const EVIDENCE_LABEL = {
  CONTRACTOR_REPORTED: "Contractor-reported",
  STAFF_OBSERVED: "Observed by V D Properties staff",
  INDEPENDENT_INSPECTION: "Independent inspection",
  PROFESSIONAL_CERTIFICATE: "Professional certificate",
} as const;

/** Super Admins manage every project; Project Managers only the projects assigned to them. */
export function canManageProject(user: SessionUser, project: Pick<BuildProject, "managerId">) {
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  return can(user.role, "buildtrace:manage") && project.managerId === user.id;
}

export async function loadManagedProject(user: SessionUser, projectId: string) {
  const project = await db.buildProject.findUnique({ where: { id: projectId } });
  if (!project) throw new AuthError(403);
  if (!canManageProject(user, project)) throw new AuthError(403);
  return project;
}

/** Contract figures derived only from recorded, authorised entries. */
export function projectFinancials(p: { contractValue: bigint; changes: { status: string; costImpact: bigint }[]; payments: { amount: bigint }[]; budgetLines: { allowance: bigint }[] }) {
  const contract = Number(p.contractValue);
  const variations = p.changes.filter((c) => c.status === "APPROVED").reduce((s, c) => s + Number(c.costImpact), 0);
  const pending = p.changes.filter((c) => c.status === "PROPOSED").reduce((s, c) => s + Number(c.costImpact), 0);
  const paid = p.payments.reduce((s, x) => s + Number(x.amount), 0);
  const current = contract + variations;
  const allowances = p.budgetLines.reduce((s, b) => s + Number(b.allowance), 0);
  return { contract, variations, pending, current, paid, outstanding: current - paid, allowances, forecast: current + pending };
}

export async function nextProjectCode() {
  const last = await db.buildProject.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const n = last ? Number(last.code.replace(/\D/g, "")) + 1 : 1;
  return `BT-${String(n).padStart(4, "0")}`;
}
