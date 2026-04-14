import type {
  AttributionSummaryView,
  ContributionSummaryView,
  PerformanceBenchmarkOptionView,
} from "@/features/workbench/types";

import type { PerformancePanelInfoRow } from "./performance-panel-info-drawer";
import { formatPct } from "../formatters";
import {
  getContributionCoverageAssessment,
  getContributionReconciliationAssessment,
} from "./performance-workspace-view-helpers";
import { getPerformanceBenchmarkContextValue } from "./performance-summary-context-helpers";

function formatContributionWeightingScheme(weightingScheme?: string | null) {
  switch (weightingScheme?.trim().toUpperCase()) {
    case "BOD":
      return "BOD weighting";
    case "EOD":
      return "EOD weighting";
    case "AVERAGE_WEIGHT":
      return "Average weight";
    default:
      return weightingScheme?.trim() || "Unavailable";
  }
}

function formatAttributionModelLabel(model?: string | null) {
  switch (model?.trim().toUpperCase()) {
    case "BF":
      return "Brinson-Fachler";
    default:
      return model?.trim() || "Unavailable";
  }
}

function formatAttributionLinkingLabel(linking?: string | null) {
  switch (linking?.trim().toUpperCase()) {
    case "CARINO":
      return "Carino";
    default:
      return linking?.trim() || "Unavailable";
  }
}

export function getAttributionMethodologyRows(
  attribution: AttributionSummaryView | null | undefined,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
): PerformancePanelInfoRow[] {
  if (!attribution) {
    return [];
  }

  return [
    {
      key: "benchmark",
      label: "Benchmark",
      value: attribution.benchmark_id
        ? getPerformanceBenchmarkContextValue({
            benchmark: attribution.benchmark_id,
            benchmarkOptions,
          })
        : "Unassigned",
      support: "Comparison reference used for active return and effect decomposition.",
    },
    {
      key: "benchmark-source",
      label: "Benchmark Source",
      value: attribution.benchmark_return_source?.trim() || "Unavailable",
      support: "Source of benchmark return observations used in attribution detail.",
    },
    {
      key: "model",
      label: "Attribution Model",
      value: formatAttributionModelLabel(attribution.model),
      support: "Effect model used to split allocation, selection, and interaction.",
    },
    {
      key: "linking",
      label: "Linking Method",
      value: formatAttributionLinkingLabel(attribution.linking),
      support: "Method used to reconcile period effects through time.",
    },
  ];
}

export function getContributionMethodologyRows(
  contribution: ContributionSummaryView | null | undefined
): PerformancePanelInfoRow[] {
  if (!contribution) {
    return [];
  }

  return [
    {
      key: "coverage",
      label: "Coverage",
      value:
        contribution.coverage_mv_pct != null
          ? formatPct(contribution.coverage_mv_pct)
          : "Unavailable",
      support:
        getContributionCoverageAssessment(contribution) ??
        "Coverage assessment unavailable for the selected contribution dataset.",
    },
    {
      key: "weighting",
      label: "Weighting Scheme",
      value: formatContributionWeightingScheme(contribution.weighting_scheme),
      support: "Weight basis applied to position and segment contribution ranking.",
    },
    {
      key: "reconciliation",
      label: "Return Reconciliation",
      value:
        contribution.total_portfolio_return_pct != null
          ? formatPct(contribution.total_portfolio_return_pct)
          : "Unavailable",
      support:
        getContributionReconciliationAssessment(contribution) ??
        "Contribution-to-return reconciliation unavailable for this selection.",
    },
  ];
}
