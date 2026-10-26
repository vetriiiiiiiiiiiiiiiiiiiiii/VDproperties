import Link from "next/link";

export function PageHeader({ title, description, back, actions }: { title: string; description?: string; back?: { href: string; label: string }; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        {back && <Link href={back.href} className="annot-plain text-slate hover:text-emerald">← {back.label}</Link>}
        <h1 className="mt-2 text-4xl text-navy">{title}</h1>
        {description && <p className="mt-1 text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok"; children: React.ReactNode }) {
  const styles = { info: "border-navy/30 bg-white", warn: "border-terracotta bg-terracotta/5", ok: "border-emerald bg-emerald/5" }[tone];
  return <div className={`mb-6 border-l-4 px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
