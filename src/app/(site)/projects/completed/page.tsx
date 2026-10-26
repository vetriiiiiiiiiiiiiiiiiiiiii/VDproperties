import type { Metadata } from "next";
import { ProjectList } from "@/components/property/ProjectList";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.listings.projects.completed.meta, description: t.listings.projects.completed.desc, alternates: await alternates("/projects/completed") };
}

export default async function CompletedProjectsPage() {
  const { t } = await getI18n();
  const x = t.listings.projects.completed;
  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.title }]}>
        {x.intro}
      </PageIntro>
      <ProjectList status="COMPLETED" />
    </>
  );
}
