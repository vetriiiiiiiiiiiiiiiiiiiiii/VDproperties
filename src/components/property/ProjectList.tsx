import Link from "next/link";
import { Media } from "@/components/site/Media";
import { ProjectStatusBadge, SampleTag } from "@/components/site/ui";
import { getPublishedProjects } from "@/lib/queries";

export async function ProjectList({ status }: { status: "ONGOING" | "COMPLETED" }) {
  const projects = await getPublishedProjects(status);
  const upcoming = status === "ONGOING" ? await getPublishedProjects("UPCOMING") : [];
  const all = [...projects, ...upcoming];
  if (!all.length)
    return (
      <div className="wrap py-16">
        <div className="grid gap-8 border border-dashed border-line bg-white p-8 lg:grid-cols-12 lg:p-12">
          <p className="font-serif text-3xl text-navy lg:col-span-7">
            {status === "ONGOING" ? "Details of current developments will be published here once confirmed." : "Completed developments will be published here."}
          </p>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="text-slate">Interested in what we're working on? Ask us directly and we'll share what's available.</p>
            <Link href="/contact#enquire" className="btn btn-primary mt-5">Enquire about projects</Link>
          </div>
        </div>
      </div>
    );
  return (
    <ul className="wrap space-y-20 py-16 lg:py-20">
      {all.map((pr, i) => (
        <li key={pr.id} className="grid gap-8 lg:grid-cols-12 lg:items-center" data-reveal>
          <Link href={`/projects/${pr.slug}`} className={`group relative block aspect-[16/10] overflow-hidden lg:col-span-7 ${i % 2 ? "lg:order-2 lg:col-start-6" : ""}`}>
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02]">
              <Media src={pr.images[0]?.url} alt={pr.images[0]?.alt ?? pr.name} sizes="(min-width:1024px) 58vw, 100vw" priority={i === 0} />
            </div>
          </Link>
          <div className={`lg:col-span-4 ${i % 2 ? "lg:order-1" : "lg:col-start-9"}`}>
            <div className="flex flex-wrap gap-2">
              <ProjectStatusBadge value={pr.status} />
              {pr.isSample && <SampleTag />}
            </div>
            <p className="annot-plain mt-5 text-slate">{pr.localityLabel ?? pr.location?.name}</p>
            <h2 className="mt-2 text-4xl text-navy">{pr.name}</h2>
            {pr.summary && <p className="mt-4 text-slate">{pr.summary}</p>}
            {pr._count.properties > 0 && <p className="mt-4 text-sm text-ink">{pr._count.properties} listing{pr._count.properties > 1 ? "s" : ""} in this project</p>}
            <Link href={`/projects/${pr.slug}`} className="link-arrow mt-6 text-emerald">Project details</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
