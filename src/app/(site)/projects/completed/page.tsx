import type { Metadata } from "next";
import { ProjectList } from "@/components/property/ProjectList";
import { PageIntro } from "@/components/site/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Completed Projects",
  description: "Developments completed by V D Properties.",
  alternates: { canonical: "/projects/completed" },
};

export default function CompletedProjectsPage() {
  return (
    <>
      <PageIntro eyebrow="Portfolio" title="Completed projects" crumbs={[{ label: "Completed projects" }]}>
        Developments we have delivered.
      </PageIntro>
      <ProjectList status="COMPLETED" />
    </>
  );
}
