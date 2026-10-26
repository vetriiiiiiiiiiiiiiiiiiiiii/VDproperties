import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/account/QuestionForm";
import { Breadcrumbs } from "@/components/site/ui";
import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";
import { requireCustomerPage } from "@/lib/auth";
import { projectFinancials } from "@/lib/buildtrace";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.build.projectMeta, robots: { index: false } };
}

/** A customer sees only their own project, and only records marked as shared with them. */
export default async function CustomerProject({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await requireCustomerPage(`/account/projects/${code}`);
  const { t, f } = await getI18n();
  const b = t.account.build;
  const utc = (v: Date) => f.date(v, { dateStyle: "medium", timeZone: "UTC" });
  const rupees = f.rupees;
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
    ...p.changes.filter((c) => c.status === "PROPOSED").map((c) => b.changeAwaiting(c.title)),
    ...p.questions.filter((q) => !q.reply).map(() => b.questionAwaiting),
    ...(p.status === "HANDOVER" ? p.handover.filter((h) => !h.done && h.required).map((h) => b.handoverItem(h.label)) : []),
  ];

  return (
    <div className="bg-ivory">
      <header className="survey-grid mx-2 mt-2 overflow-hidden rounded-[1.5rem] bg-navy text-ivory sm:mx-4">
        <div className="wrap py-10">
          <Breadcrumbs items={[{ label: t.account.dash.eyebrow, href: "/account" }, { label: p.code }]} />
          <p className="annot mt-8 text-gold-light">{b.projectEyebrow(p.code, p.isDemo)}</p>
          <h1 className="mt-3 text-headline">{p.title}</h1>
          <p className="mt-2 text-ivory/80">{b.planned(b.status[p.status], utc(p.plannedStart), utc(p.plannedEnd), p.manager?.name ?? null)}</p>
          <div className="mt-6 max-w-xl">
            <div className="flex justify-between text-xs text-ivory/70"><span>{b.progressOf(done, p.milestones.length)}</span><span>{pct}%</span></div>
            <div className="liquid-track mt-1 !bg-ivory/15"><div className="liquid-track-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          {p.customerNote && <p className="mt-6 max-w-2xl border-l-4 border-gold pl-4 text-ivory/90">{p.customerNote}</p>}
        </div>
      </header>

      <div className="wrap grid gap-10 py-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {outstanding.length > 0 && (
            <section className="surface border-l-4 border-gold p-5" aria-labelledby="oa-h">
              <h2 id="oa-h" className="annot text-gold-deep">{b.outstanding}</h2>
              <ul className="mt-3 space-y-1 text-sm">{outstanding.map((o, i) => <li key={i}>• {o}</li>)}</ul>
            </section>
          )}

          <section aria-labelledby="tl-h">
            <h2 id="tl-h" className="annot text-emerald">{b.timeline}</h2>
            <ol className="mt-4 border-l-2 border-line pl-6">
              {p.milestones.map((m) => {
                const complete = m.status === "REPORTED_COMPLETE" || m.status === "INSPECTED";
                return (
                  <li key={m.id} className="relative pb-6">
                    <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-ivory ${m.status === "INSPECTED" ? "bg-emerald" : complete ? "bg-gold" : m.status === "BLOCKED" ? "bg-terracotta" : m.status === "IN_PROGRESS" ? "bg-sun-light" : "bg-line"}`} aria-hidden="true" />
                    <p className="font-semibold text-ink">{m.name}</p>
                    <p className="text-sm text-slate">
                      {b.milestone[m.status]}
                      {m.evidence ? ` · ${b.evidence[m.evidence]}` : ""}
                      {m.plannedDate ? ` · ${b.plannedOn(utc(m.plannedDate))}` : ""}
                      {m.completedDate ? ` · ${b.completedOn(utc(m.completedDate))}` : ""}
                    </p>
                    {m.status === "REPORTED_COMPLETE" && <p className="text-xs text-gold-deep">{b.reportedNote}</p>}
                    {m.issues && <p className="mt-1 text-sm text-terracotta-deep">{b.issue(m.issues)}</p>}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="pr-h">
            <h2 id="pr-h" className="annot text-emerald">{b.progress}</h2>
            <ul className="mt-4 space-y-4">
              {p.updates.map((u) => (
                <li key={u.id} className="surface p-4">
                  <p className="text-xs text-slate">{f.dateTime(u.createdAt)} · {b.evidence[u.source]}{u.milestone ? ` · ${u.milestone.name}` : ""}</p>
                  <p className="mt-2 whitespace-pre-line text-sm">{u.body}</p>
                  {u.files.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {u.files.map((file) => (
                        <a key={file.id} href={`/buildtrace/files/${file.id}`} target="_blank" rel="noopener" className="block aspect-[4/3] overflow-hidden rounded-2xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/buildtrace/files/${file.id}`} alt={`${file.title} — ${u.milestone?.name ?? b.progressPhoto}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {p.updates.length === 0 && <li className="text-sm text-slate">{b.progressEmpty}</li>}
            </ul>
          </section>

          <section aria-labelledby="q-h">
            <h2 id="q-h" className="annot text-emerald">{b.questions}</h2>
            <div className="surface mt-4 p-5"><QuestionForm projectId={p.id} /></div>
            <ul className="mt-4 space-y-3 text-sm">
              {p.questions.map((q) => (
                <li key={q.id} className="border-l-2 border-line pl-3">
                  <p>{q.body}</p>
                  <p className="text-xs text-slate">{f.dateTime(q.createdAt)}</p>
                  {q.reply ? <p className="mt-1 rounded-2xl bg-white p-2">↳ {q.reply}</p> : <p className="text-xs text-gold-deep">{b.awaiting}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section className="surface p-5" aria-labelledby="b-h">
            <h2 id="b-h" className="annot text-emerald">{b.budget}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {([[b.fin.contract, fin.contract], [b.fin.variations, fin.variations], [b.fin.current, fin.current], [b.fin.paid, fin.paid], [b.fin.outstanding, fin.outstanding]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-slate">{k}</dt><dd className="font-semibold">{rupees(v)}</dd></div>
              ))}
              {fin.pending !== 0 && <div className="flex justify-between text-gold-deep"><dt>{b.fin.pending}</dt><dd>{rupees(fin.pending)}</dd></div>}
            </dl>
            {p.budgetLines.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate">{b.allowances}</h3>
                <ul className="mt-2 space-y-1 text-sm">{p.budgetLines.map((bl) => <li key={bl.id} className="flex justify-between"><span>{bl.category}</span><span>{rupees(Number(bl.allowance))}</span></li>)}</ul>
              </>
            )}
            {p.changes.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate">{b.changes}</h3>
                <ul className="mt-2 space-y-1 text-sm">{p.changes.map((c) => <li key={c.id}>{c.title} · {rupees(Number(c.costImpact))} · <span className={c.status === "APPROVED" ? "text-emerald" : "text-gold-deep"}>{c.status === "APPROVED" ? b.approved : b.awaitingApproval}</span></li>)}</ul>
              </>
            )}
            <p className="mt-4 text-xs text-slate">{b.budgetNote}</p>
          </section>

          <section className="surface p-5" aria-labelledby="d-h">
            <h2 id="d-h" className="annot text-emerald">{b.docs}</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {p.files.map((file) => <li key={file.id}><a href={`/buildtrace/files/${file.id}`} target="_blank" rel="noopener" className="underline">{file.title}</a></li>)}
              {p.files.length === 0 && <li className="text-slate">{b.noDocs}</li>}
            </ul>
          </section>

          <section className="surface p-5" aria-labelledby="h-h">
            <h2 id="h-h" className="annot text-emerald">{b.handover}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {p.handover.map((h) => <li key={h.id} className={h.done ? "text-slate line-through" : ""}>{h.done ? "✓" : "○"} {h.label}</li>)}
            </ul>
            <p className="mt-3 text-xs text-slate">{b.handoverNote}</p>
          </section>
          {p.property && <p className="text-sm">{b.property} <Link href={`/twin/${p.property.slug}`} className="underline">{p.property.referenceCode} · {p.property.title}</Link></p>}
        </aside>
      </div>
    </div>
  );
}
