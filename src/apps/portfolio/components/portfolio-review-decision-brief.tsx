"use client";

import { WorkbenchDecisionBrief } from "@/design-system";

import { buildPortfolioDecisionBrief } from "../portfolio-summary-view-model";
import type { PortfolioWorkspace } from "../types";

export default function PortfolioReviewDecisionBrief({
  workspace,
}: {
  workspace: PortfolioWorkspace;
}) {
  const brief = buildPortfolioDecisionBrief(workspace);
  const readinessSupport = brief.rows.some((row) => row.support === brief.readiness.support)
    ? undefined
    : brief.readiness.support;

  return (
    <WorkbenchDecisionBrief
      ariaLabel="Portfolio decision review"
      eyebrow="Review focus"
      title={brief.headline}
      support={brief.support}
      score={{
        label: "Portfolio readiness",
        value: brief.readiness.statusLabel,
        tone: brief.readiness.tone,
        support: readinessSupport,
      }}
      facts={brief.rows}
    />
  );
}
