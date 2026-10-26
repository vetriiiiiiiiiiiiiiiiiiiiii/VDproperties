import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { WeightsForm } from "@/components/admin/PlatformForms";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { normaliseWeights } from "@/lib/plotfit";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "PlotFit matching" };

export default async function PlotFitAdmin() {
  await requirePage("plotfit:manage");
  const [s, searches, alerting] = await Promise.all([getSettings(), db.savedSearch.count(), db.savedSearch.count({ where: { alertsEnabled: true } })]);
  return (
    <>
      <PageHeader title="PlotFit matching" description="How preferences are weighed. Hard requirements (availability, type, budget, bedrooms, strict locations) always apply first." />
      <div className="space-y-6">
        <Panel title="Scoring weights" description="Relative importance of each factor (0–100). Ranking never uses commercial considerations.">
          <WeightsForm weights={normaliseWeights(s.plotfitWeights)} />
        </Panel>
        <Panel title="Saved searches">
          <p className="text-sm">{searches} saved searches · {alerting} with new-listing alerts on (sent only to customers who consented, and only when SMTP is configured).</p>
        </Panel>
      </div>
    </>
  );
}
