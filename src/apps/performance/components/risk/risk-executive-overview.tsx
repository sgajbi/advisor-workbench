import type { PerformanceRiskOverviewItem } from "../../risk-workspace-view-model";
import RiskMetricCard from "./risk-metric-card";

function mapOverviewToneToCardTone(tone: PerformanceRiskOverviewItem["tone"]) {
  if (tone === "success") {
    return "success";
  }

  if (tone === "warn") {
    return "warn";
  }

  if (tone === "danger") {
    return "danger";
  }

  return "default";
}

export default function RiskExecutiveOverview({
  overview,
}: {
  overview: PerformanceRiskOverviewItem[];
}) {
  if (!overview.length) {
    return null;
  }

  return (
    <section className="performance-risk-executive" aria-label="Risk executive overview">
      <div className="performance-risk-executive-grid">
        {overview.map((item) => (
          <RiskMetricCard
            key={item.key}
            label={item.label}
            value={item.value}
            support={item.support}
            tone={mapOverviewToneToCardTone(item.tone)}
            density="compact"
            className="performance-risk-executive-card"
            ariaLabel={`${item.label}: ${item.value}. ${item.support}`}
          />
        ))}
      </div>
    </section>
  );
}
