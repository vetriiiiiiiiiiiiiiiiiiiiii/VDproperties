import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setUpdateVisibility, toggleHandoverItem } from "@/app/admin/_actions/buildtrace";
import {
  BudgetLineForm,
  ChangeRequestForm,
  DecideChangeForm,
  HandoverAddForm,
  MilestoneForm,
  PaymentForm,
  ProgressForm,
  ProjectDocumentForm,
  ProjectStatusForm,
  ReplyForm,
} from "@/components/admin/BuildForms";
import { Panel } from "@/components/admin/kit";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { BUILD_STATUS_LABEL, canManageProject, EVIDENCE_LABEL, MILESTONE_STATUS_LABEL, projectFinancials } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatRupeesFull } from "@/lib/format";
import { can } from "@/lib/rbac";

export const metadata = { title: "BuildTrace project" };

const d = (v: Date | null) => (v ? v.toISOString().slice(0, 10) : "");
const utc = (v: Date) => formatDate(v, { dateStyle: "medium", timeZone: "UTC" });

export default async function BuildProjectAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requirePage("buildtrace:manage");
  const p = await db.buildProject.findUnique({
    where: { id: (await params).id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      property: { select: { referenceCode: true, title: true, slug: true } },
      manager: { select: { name: true } },
      milestones: { orderBy: { sortOrder: "asc" } },
      updates: { orderBy: { createdAt: "desc" }, include: { files: true, author: { select: { name: true } }, milestone: { select: { name: true } } } },
      files: { where: { kind: "DOCUMENT" }, orderBy: { createdAt: "desc" } },
      budgetLines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { receivedOn: "desc" }, include: { milestone: { select: { name: true } } } },
      changes: { orderBy: { createdAt: "desc" } },
      questions: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      handover: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) notFound();
  if (!canManageProject(user, p)) redirect("/admin?denied=1");
  const { created } = await searchParams;
  const managers = await db.user.findMany({ where: { active: true, role: { in: ["PROJECT_MANAGER", "SUPER_ADMIN"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const fin = projectFinancials(p);
  const msOpts = p.milestones.map((m) => ({ id: m.id, label: m.name }));
  const approver = can(user.role, "buildtrace:approve");

  return (
    <>
      <PageHeader
        title={`${p.code} · ${p.title}`}
        description={`${p.customer.name} · ${BUILD_STATUS_LABEL[p.status]} · agreement ${p.agreementRef} (${utc(p.agreementDate)})`}
        back={{ href: "/admin/buildtrace", label: "BuildTrace" }}
      />
      {created && <Notice tone="ok">Project created. The customer can now see it in their account.</Notice>}
      {p.isDemo && <Notice tone="warn">Demonstration project — not a real engagement.</Notice>}

      <div className="grid gap-6 2xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <dl className="grid gap-px bg-line sm:grid-cols-3 xl:grid-cols-6">
            {([
              ["Contract", fin.contract], ["Approved variations", fin.variations], ["Current contract", fin.current],
              ["Recorded payments", fin.paid], ["Outstanding", fin.outstanding], ["Forecast incl. pending", fin.forecast],
            ] as const).map(([k, v]) => (
              <div key={k} className="bg-white p-4"><dt className="annot-plain text-[0.6rem] text-slate">{k}</dt><dd className="mt-1 font-serif text-xl text-navy">{formatRupeesFull(v)}</dd></div>
            ))}
          </dl>

          <Panel title="Milestones" description="“Reported complete” records a claim; “Inspected” needs independent inspection or certification.">
            <ol className="space-y-6">
              {p.milestones.map((m, i) => (
                <li key={m.id} className="border-l-2 border-gold pl-4">
                  <p className="text-xs text-slate">Stage {i + 1} · {MILESTONE_STATUS_LABEL[m.status]}{m.evidence ? ` · ${EVIDENCE_LABEL[m.evidence]}` : ""}</p>
                  <div className="mt-2">
                    <MilestoneForm projectId={p.id} m={{ id: m.id, name: m.name, status: m.status, plannedDate: d(m.plannedDate), completedDate: d(m.completedDate), evidence: m.evidence ?? "", responsible: m.responsible ?? "", notes: m.notes ?? "", issues: m.issues ?? "", customerVisible: m.customerVisible }} />
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 border-t border-line pt-5">
              <MilestoneForm projectId={p.id} m={{ id: null, name: "", status: "NOT_STARTED", plannedDate: "", completedDate: "", evidence: "", responsible: "", notes: "", issues: "", customerVisible: true }} />
            </div>
          </Panel>

          <Panel title="Progress records">
            <ProgressForm projectId={p.id} milestones={msOpts} />
            <ul className="mt-6 space-y-4">
              {p.updates.map((u) => (
                <li key={u.id} className="border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate">
                    <span>{formatDateTime(u.createdAt)} · {EVIDENCE_LABEL[u.source]}{u.milestone ? ` · ${u.milestone.name}` : ""} · {u.author?.name ?? "—"}</span>
                    <form action={setUpdateVisibility.bind(null, p.id, u.id, !u.customerVisible)}>
                      <button className="underline">{u.customerVisible ? "Shared with customer — hide" : "Staff only — share"}</button>
                    </form>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm">{u.body}</p>
                  {u.files.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {u.files.map((f) => (
                        <a key={f.id} href={`/buildtrace/files/${f.id}`} target="_blank" rel="noopener" className="block h-20 w-28 overflow-hidden border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/buildtrace/files/${f.id}`} alt={f.title} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {p.updates.length === 0 && <li className="text-sm text-slate">No progress recorded yet.</li>}
            </ul>
          </Panel>

          <Panel title="Change requests" description="A change only alters the agreed budget or schedule once approved.">
            <ChangeRequestForm projectId={p.id} />
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {p.changes.map((c) => (
                <li key={c.id} className="py-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold">{c.title}</span>
                    <span className={c.status === "APPROVED" ? "text-emerald" : c.status === "REJECTED" ? "text-terracotta-deep" : "text-gold-deep"}>{c.status.toLowerCase()}</span>
                  </div>
                  <p className="text-slate">{c.reason}</p>
                  <p className="mt-1 text-xs">Cost {formatRupeesFull(Number(c.costImpact))} · schedule {c.scheduleImpactDays} day(s){c.decidedAt ? ` · decided ${formatDate(c.decidedAt)}` : ""}{c.decisionNote ? ` · “${c.decisionNote}”` : ""}</p>
                  {c.status === "PROPOSED" && (approver ? <div className="mt-2"><DecideChangeForm projectId={p.id} changeId={c.id} /></div> : <p className="mt-1 text-xs text-slate">Awaiting approval by a Super Admin.</p>)}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Budget & payments">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {p.budgetLines.map((b) => <tr key={b.id}><td className="py-2">{b.category}</td><td className="py-2 text-right">{formatRupeesFull(Number(b.allowance))}</td></tr>)}
                <tr className="font-semibold"><td className="py-2">Total allowances</td><td className="py-2 text-right">{formatRupeesFull(fin.allowances)}</td></tr>
              </tbody>
            </table>
            <div className="mt-4"><BudgetLineForm projectId={p.id} /></div>
            <h3 className="mt-8 text-sm font-semibold">Recorded payments</h3>
            <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
              {p.payments.map((x) => <li key={x.id} className="flex justify-between py-2"><span>{utc(x.receivedOn)} · ref {x.reference}{x.milestone ? ` · ${x.milestone.name}` : ""}</span><span>{formatRupeesFull(Number(x.amount))}</span></li>)}
              {p.payments.length === 0 && <li className="py-2 text-slate">None recorded.</li>}
            </ul>
            <div className="mt-4">{approver ? <PaymentForm projectId={p.id} milestones={msOpts} /> : <p className="text-xs text-slate">Payments are recorded by a Super Admin against a receipt or bank reference.</p>}</div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Project">
            <dl className="mb-4 space-y-1 text-sm">
              <div><dt className="inline text-slate">Customer: </dt><dd className="inline">{p.customer.name} · {p.customer.email}{p.customer.phone ? ` · ${p.customer.phone}` : ""}</dd></div>
              <div><dt className="inline text-slate">Property: </dt><dd className="inline">{p.property ? <Link href={`/twin/${p.property.slug}`} className="underline" target="_blank">{p.property.referenceCode} · {p.property.title}</Link> : "Not linked"}</dd></div>
              <div><dt className="inline text-slate">Schedule: </dt><dd className="inline">{utc(p.plannedStart)} → {utc(p.plannedEnd)}</dd></div>
            </dl>
            <p className="mb-4 whitespace-pre-line border-l-4 border-line pl-3 text-sm text-slate">{p.scope}</p>
            <ProjectStatusForm id={p.id} status={p.status} contractorName={p.contractorName ?? ""} customerNote={p.customerNote ?? ""} managerId={p.managerId ?? ""} managers={managers.map((m) => ({ id: m.id, label: m.name }))} canAssign={user.role === "SUPER_ADMIN"} />
          </Panel>

          <Panel title="Customer questions">
            <ul className="space-y-4 text-sm">
              {p.questions.map((q) => (
                <li key={q.id} className="border-l-2 border-line pl-3">
                  <p>{q.body}</p>
                  <p className="text-xs text-slate">{q.author?.name} · {formatDateTime(q.createdAt)}</p>
                  {q.reply ? <p className="mt-1 bg-paper p-2">↳ {q.reply}</p> : <ReplyForm projectId={p.id} questionId={q.id} />}
                </li>
              ))}
              {p.questions.length === 0 && <li className="text-slate">No questions yet.</li>}
            </ul>
          </Panel>

          <Panel title="Handover checklist" description="Completion is blocked until every required item is done.">
            <ul className="space-y-2 text-sm">
              {p.handover.map((h) => (
                <li key={h.id} className="flex items-center gap-3">
                  <form action={toggleHandoverItem.bind(null, p.id, h.id)}>
                    <button aria-pressed={h.done} aria-label={`${h.done ? "Reopen" : "Complete"} ${h.label}`} className={`flex h-5 w-5 items-center justify-center border ${h.done ? "border-emerald bg-emerald text-ivory" : "border-line"}`}>{h.done ? "✓" : ""}</button>
                  </form>
                  <span className={h.done ? "text-slate line-through" : ""}>{h.label}{!h.required && <span className="text-xs text-slate"> (optional)</span>}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4"><HandoverAddForm projectId={p.id} /></div>
          </Panel>

          <Panel title="Documents">
            <ProjectDocumentForm projectId={p.id} />
            <ul className="mt-4 space-y-1 text-sm">
              {p.files.map((f) => <li key={f.id}><a href={`/buildtrace/files/${f.id}`} target="_blank" rel="noopener" className="underline">{f.title}</a> <span className="text-xs text-slate">{f.customerVisible ? "shared" : "staff only"}</span></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
