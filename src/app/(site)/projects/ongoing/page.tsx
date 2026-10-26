import type { Metadata } from "next";
import { ProjectList } from "@/components/property/ProjectList";
import { PageIntro } from "@/components/site/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ongoing Projects",
  description: "Residential developments V D Properties is currently developing, with their status and available listings.",
  alternates: { canonical: "/projects/ongoing" },
};

export default function OngoingProjectsPage() {
  return (
    <>
      <PageIntro eyebrow="Developments" title="Ongoing projects" crumbs={[{ label: "Ongoing projects" }]}>
        Layouts and homes in development. Status is updated by our team as work progresses.
      </PageIntro>
      <ProjectList status="ONGOING" />
    </>
  );
}
