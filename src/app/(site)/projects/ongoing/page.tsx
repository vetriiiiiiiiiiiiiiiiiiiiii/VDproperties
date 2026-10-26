import type { Metadata } from "next";
import { ProjectList } from "@/components/property/ProjectList";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.listings.projects.ongoing.meta, description: t.listings.projects.ongoing.desc, alternates: await alternates("/projects/ongoing") };
}

export default async function OngoingProjectsPage() {
  const { t } = await getI18n();
  const x = t.listings.projects.ongoing;
  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.title }]}>
        {x.intro}
      </PageIntro>
      <ProjectList status="ONGOING" />
    </>
  );
}
