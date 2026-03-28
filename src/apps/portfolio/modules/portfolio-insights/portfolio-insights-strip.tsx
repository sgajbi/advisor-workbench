"use client";

import { InsightCallout, ReadinessIndicator } from "@/design-system";

import type { PortfolioInsight, PortfolioReadinessIndicator } from "../../types";

export default function PortfolioInsightsStrip({
  insights,
  readinessIndicators,
  onDismissInsight,
}: {
  insights: PortfolioInsight[];
  readinessIndicators: PortfolioReadinessIndicator[];
  onDismissInsight: (key: string) => void;
}) {
  return (
    <>
      {insights.length ? (
        <div className="portfolio-insight-strip" aria-label="Portfolio insights">
          {insights.map((insight) => (
            <InsightCallout
              key={insight.key}
              title={insight.title}
              detail={insight.detail}
              severity={insight.severity}
              href={insight.href}
              onDismiss={() => onDismissInsight(insight.key)}
            />
          ))}
        </div>
      ) : null}

      <div className="portfolio-readiness-strip" aria-label="Portfolio readiness indicators">
        {readinessIndicators.map((indicator) => (
          <ReadinessIndicator
            key={indicator.key}
            label={indicator.label}
            status={indicator.status}
            tone={mapIndicatorTone(indicator.status)}
            href={indicator.href}
          />
        ))}
      </div>
    </>
  );
}

function mapIndicatorTone(status: PortfolioReadinessIndicator["status"]): "success" | "warn" | "danger" | "neutral" {
  switch (status) {
    case "Ready":
      return "success";
    case "Partial":
      return "warn";
    case "Missing":
      return "danger";
    default:
      return "neutral";
  }
}
