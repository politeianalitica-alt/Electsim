import { HeroBriefing } from "@/components/dashboard/hero-briefing";
import { LiveTicker } from "@/components/dashboard/live-ticker";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { IntelGrid } from "@/components/dashboard/intel-grid";
import { ModuleGrid } from "@/components/dashboard/module-grid";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <LiveTicker />
      <HeroBriefing />
      <KpiStrip />
      <IntelGrid />
      <ModuleGrid />
    </div>
  );
}
