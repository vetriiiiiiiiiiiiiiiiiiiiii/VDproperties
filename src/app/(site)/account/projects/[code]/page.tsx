import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/account/QuestionForm";
import { Breadcrumbs } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { BUILD_STATUS_LABEL, EVIDENCE_LABEL, MILESTONE_STATUS_LABEL, projectFinancials } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatRupeesFull } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track My Build", robots: { index: false } };

const utc = (v: Date) => formatDate(v, { dateStyle: "medium", timeZone: "UTC" });

/** A customer sees only their own project, and only records marked as shared with them. */
export default async function CustomerProject({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await requireCustomerPage(`/account/projects/${code}`);
  const p = await db.buildProject.findFirst({
    where: { code, customerId: me.id },
    include: {
      property: { select: { referenceCode: true, title: true, slug: true } },
      manager: { select: { name: true } },
      milestones: { where: { customerVisible: true }, orderBy: { sortOrder: "asc" } },
      updates: { where: { customerVisible: true }, orderBy: { createdAt: "desc" }, include: { files: { where: { customerVisible: true } }, milestone: { select: { name: true } } } },
      files: { where: { kind: "DOCUMENT", customerVisible: true }, orderBy: { createdAt: "desc" } },
      budgetLines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { receivedOn: "desc" } },
      changes: { where: { status: { in: ["APPROVED", "PROPOSED"] } }, orderBy: { createdAt: "desc" } },
      questions: { where: { authorId: me.id }, orderBy: { createdAt: "desc" } },
      handover: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) notFound();
  const fin = projectFinancials(p);
  const done = p.milestones.filter((m) => m.status === "REPORTED_COMPLETE" || m.status === "INSPECTED").length;
  const pct = p.milestones.length ? Math.round((done / p.milestones.length) * 100) : 0;
  const outstanding = [
    ...p.changes.filter((c) => c.status === "PROPOSED").map((c) => `Change “${c.title}” is awaiting approval`),
    ...p.questions.filter((q) => !q.reply).map(() => "A question you asked is awaiting a reply"),
    ...(p.status === "HANDOVER" ? p.handover.filter((h) => !h.done && h.required).map((h) => `Handover: ${h.label}`) : []),
  ];

  return (
    <div className="bg-ivory">
      <header className="survey-grid border-b border-line bg-navy text-ivory">
        <div className="wrap py-10">
          <Breadcrumbs items={[{ label: "Your account", href: "/account" }, { label: p.code }]} />
          <p className="annot mt-8 text-gold-light">BuildTrace · {p.code}{p.isDemo ? " · demonstration project" : ""}</p>
          <h1 className="mt-3 text-headline">{p.title}</h1>
          <p className="mt-2 text-ivory/80">{BUILD_STATUS_LABEL[p.status]} · planned {utc(p.plannedStart)} → {utc(p.plannedEnd)}{p.manager ? ` · project manager ${p.manager.name}` : ""}</p>
          <div className="mt-6 max-w-xl">
            <div className="flex justify-between text-xs text-ivory/70"><span>{done} of {p.milestones.length} milestones complete</span><span>{pct}%</span></div>
            <div className="mt-1 h-2 bg-ivory/15"><div className="h-full bg-sun" style={{ width: `${pct}%` }} /></div>
          </div>
          {p.customerNote && <p className="mt-6 max-w-2xl border-l-4 border-gold pl-4 text-ivory/90">{p.customerNote}</p>}
        </div>
      </header>

      <div className="wrap grid gap-10 py-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {outstanding.length > 0 && (
            <section className="border-l-4 border-gold bg-white p-5" aria-labelledby="oa-h">
              <h2 id="oa-h" className="annot text-gold-deep">Outstanding actions</h2>
              <ul className="mt-3 space-y-1 text-sm">{outstanding.map((o, i) => <li key={i}>• {o}</li>)}</ul>
            </section>
          )}

          <section aria-labelledby="tl-h">
            <h2 id="tl-h" className="annot text-emerald">Project timeline</h2>
            <ol className="mt-4 border-l-2 border-line pl-6">
              {p.milestones.map((m) => {
                const complete = m.status === "REPORTED_COMPLETE" || m.status === "INSPECTED";
                return (
                  <li key={m.id} className="relative pb-6">
                    <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-ivory ${m.status === "INSPECTED" ? "bg-emerald" : complete ? "bg-gold" : m.status === "BLOCKED" ? "bg-terracotta" : m.status === "IN_PROGRESS" ? "bg-sun-light" : "bg-line"}`} aria-hidden="true" />
                    <p className="font-semibold text-ink">{m.name}</p>
                    <p className="text-sm text-slate">
                      {MILESTONE_STATUS_LABEL[m.status]}
                      {m.evidence ? ` · ${EVIDENCE_LABEL[m.evidence]}` : ""}
                      {m.plannedDate ? ` · planned ${utc(m.plannedDate)}` : ""}
                      {m.completedDate ? ` · completed ${utc(m.completedDate)}` : ""}
                    </p>
                    {m.status === "REPORTED_COMPLETE" && <p className="text-xs text-gold-deep">Reported as complete — not yet independently inspected.</p>}
                    {m.issues && <p className="mt-1 text-sm text-terracotta-deep">Issue: {m.issues}</p>}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="pr-h">
            <h2 id="pr-h" className="annot text-emerald">Progress</h2>
            <ul className="mt-4 space-y-4">
              {p.updates.map((u) => (
                <li key={u.id} className="border border-line bg-white p-4">
                  <p className="text-xs text-slate">{formatDateTime(u.createdAt)} · {EVIDENCE_LABEL[u.source]}{u.milestone ? ` · ${u.milestone.name}` : ""}</p>
                  <p className="mt-2 whitespace-pre-line text-sm">{u.body}</p>
                  {u.files.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {u.files.map((f) => (
                        <a key={f.id} href={`/buildtrace/files/${f.id}`} target="_blank" rel="noopener" className="block aspect-[4/3] overflow-hidden border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/buildtrace/files/${f.id}`} alt={`${f.title} — ${u.milestone?.name ?? "progress"}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {p.updates.length === 0 && <li className="text-sm text-slate">Progress updates will appear here as your project team shares them.</li>}
            </ul>
          </section>

          <section aria-labelledby="q-h">
            <h2 id="q-h" className="annot text-emerald">Questions for your project team</h2>
            <div className="mt-4 border border-line bg-white p-5"><QuestionForm projectId={p.id} /></div>
            <ul className="mt-4 space-y-3 text-sm">
              {p.questions.map((q) => (
                <li key={q.id} className="border-l-2 border-line pl-3">
                  <p>{q.body}</p>
                  <p className="text-xs text-slate">{formatDateTime(q.createdAt)}</p>
                  {q.reply ? <p className="mt-1 bg-white p-2">↳ {q.reply}</p> : <p className="text-xs text-gold-deep">Awaiting reply</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section className="border border-line bg-white p-5" aria-labelledby="b-h">
            <h2 id="b-h" className="annot text-emerald">Budget</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {([["Agreed contract", fin.contract], ["Approved variations", fin.variations], ["Current contract value", fin.current], ["Payments recorded", fin.paid], ["Outstanding", fin.outstanding]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-slate">{k}</dt><dd className="font-semibold">{formatRupeesFull(v)}</dd></div>
              ))}
              {fin.pending !== 0 && <div className="flex justify-between text-gold-deep"><dt>Pending approval</dt><dd>{formatRupeesFull(fin.pending)}</dd></div>}
            </dl>
            {p.budgetLines.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate">Allowances</h3>
                <ul className="mt-2 space-y-1 text-sm">{p.budgetLines.map((b) => <li key={b.id} className="flex justify-between"><span>{b.category}</span><span>{formatRupeesFull(Number(b.allowance))}</span></li>)}</ul>
              </>
            )}
            {p.changes.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate">Changes</h3>
                <ul className="mt-2 space-y-1 text-sm">{p.changes.map((c) => <li key={c.id}>{c.title} · {formatRupeesFull(Number(c.costImpact))} · <span className={c.status === "APPROVED" ? "text-emerald" : "text-gold-deep"}>{c.status === "APPROVED" ? "approved" : "awaiting approval"}</span></li>)}</ul>
              </>
            )}
            <p className="mt-4 text-xs text-slate">Figures reflect recorded agreements, approved changes and payments recorded by our team. Online payments aren't taken here.</p>
          </section>

          <section className="border border-line bg-white p-5" aria-labelledby="d-h">
            <h2 id="d-h" className="annot text-emerald">Shared documents</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {p.files.map((f) => <li key={f.id}><a href={`/buildtrace/files/${f.id}`} target="_blank" rel="noopener" className="underline">{f.title}</a></li>)}
              {p.files.length === 0 && <li className="text-slate">None shared yet.</li>}
            </ul>
          </section>

          <section className="border border-line bg-white p-5" aria-labelledby="h-h">
            <h2 id="h-h" className="annot text-emerald">Handover requirements</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {p.handover.map((h) => <li key={h.id} className={h.done ? "text-slate line-through" : ""}>{h.done ? "✓" : "○"} {h.label}</li>)}
            </ul>
            <p className="mt-3 text-xs text-slate">Your home is marked handed over only when every required item is complete.</p>
          </section>
          {p.property && <p className="text-sm">Property: <a href={`/twin/${p.property.slug}`} className="underline">{p.property.referenceCode} · {p.property.title}</a></p>}
        </aside>
      </div>
    </div>
  );
}
