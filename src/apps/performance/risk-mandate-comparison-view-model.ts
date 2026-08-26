import type {
  WorkbenchMandateComparison,
  WorkbenchMandateConstraintState,
} from "@/features/workbench/types";
import {
  formatBusinessDateValue,
  formatPercent,
  formatTimestampValue,
} from "@/design-system/utils/financial-formatters";

import { formatLabel } from "./formatters";

export type RiskMandateComparisonTone = "default" | "success" | "warn" | "danger";

export type RiskMandateConstraintViewModel = {
  key: string;
  name: string;
  state: WorkbenchMandateConstraintState | "unavailable";
  stateLabel: string;
  tone: RiskMandateComparisonTone;
  measure: string;
  limit: string;
  headroom: string;
  basis: string;
  asOf: string;
  reason: string;
  evidence: Array<{ label: string; value: string }>;
};

export type RiskMandateComparisonSourceViewModel = {
  key: "summary" | "concentration";
  label: string;
  supportability: "ready" | "partial" | "unavailable";
  supportabilityLabel: string;
  supportabilityTone: RiskMandateComparisonTone;
  supportabilityReason: string | null;
  mandateReference: string;
  mandateVersion: string;
  riskProfile: string;
  comparisonAsOf: string;
  mandateAsOf: string;
  mandateHealthAsOf: string;
  dateAlignment: "aligned" | "mismatch" | "unavailable";
  dateAlignmentLabel: string;
  dateAlignmentTone: RiskMandateComparisonTone;
  constraints: RiskMandateConstraintViewModel[];
  reviewPolicy: {
    frequency: string;
    state: "due" | "overdue" | "scheduled" | "not_defined";
    stateLabel: string;
    tone: RiskMandateComparisonTone;
    lastReviewDate: string;
    nextReviewDueDate: string;
  } | null;
  lineage: Array<{
    key: string;
    product: string;
    sourceSystem: string;
    sourceRecord: string;
    dataQuality: string;
    latestEvidence: string;
  }>;
};

export type RiskMandateComparisonViewModel = {
  availability: "not_supplied" | "supplied";
  availabilityLabel: string;
  availabilityTone: RiskMandateComparisonTone;
  summary: string;
  contextNotice: string | null;
  sources: RiskMandateComparisonSourceViewModel[];
};

export function buildRiskMandateComparisonViewModel({
  portfolioRisk,
  concentrationRisk,
}: {
  portfolioRisk: WorkbenchMandateComparison | null | undefined;
  concentrationRisk: WorkbenchMandateComparison | null | undefined;
}): RiskMandateComparisonViewModel {
  const sources = [
    portfolioRisk ? mapSource("summary", "Portfolio risk constraints", portfolioRisk) : null,
    concentrationRisk
      ? mapSource("concentration", "Concentration constraints", concentrationRisk)
      : null,
  ].filter((source): source is RiskMandateComparisonSourceViewModel => source !== null);

  if (sources.length === 0) {
    return {
      availability: "not_supplied",
      availabilityLabel: "Not supplied",
      availabilityTone: "default",
      summary:
        "Mandate comparison is not available for this Risk review. Confirm the approved mandate before deciding whether a limit applies; no breach or all-clear is shown.",
      contextNotice: null,
      sources: [],
    };
  }

  return {
    availability: "supplied",
    availabilityLabel: "Source evidence supplied",
    availabilityTone: "default",
    summary:
      "Compare each measure with its approved mandate limit. States, limits, headroom, review timing, and dates are shown exactly as received.",
    contextNotice: contextsConflict(sources)
      ? "Gateway returned different mandate contexts across portfolio risk and concentration. Review the source evidence before use."
      : null,
    sources,
  };
}

function mapSource(
  key: RiskMandateComparisonSourceViewModel["key"],
  label: string,
  comparison: WorkbenchMandateComparison,
): RiskMandateComparisonSourceViewModel {
  return {
    key,
    label,
    supportability: comparison.supportability.state,
    supportabilityLabel: supportabilityLabel(comparison.supportability.state),
    supportabilityTone: supportabilityTone(comparison.supportability.state),
    supportabilityReason: nonBlank(comparison.supportability.reason),
    mandateReference: nonBlank(comparison.mandate_id) ?? "Not reported",
    mandateVersion: nonBlank(comparison.mandate_version) ?? "Not reported",
    riskProfile: comparison.risk_profile
      ? formatSourceCodeLabel(comparison.risk_profile)
      : "Not reported",
    comparisonAsOf: formatBusinessDateValue(comparison.comparison_as_of_date, {
      nullDisplay: "Not reported",
    }),
    mandateAsOf: formatBusinessDateValue(comparison.mandate_as_of_date, {
      nullDisplay: "Not reported",
    }),
    mandateHealthAsOf: formatBusinessDateValue(comparison.mandate_health_as_of_date, {
      nullDisplay: "Not reported",
    }),
    dateAlignment: comparison.date_alignment_state,
    dateAlignmentLabel: dateAlignmentLabel(comparison.date_alignment_state),
    dateAlignmentTone: dateAlignmentTone(comparison.date_alignment_state),
    constraints: comparison.constraints
      .map(mapConstraint)
      .sort((left, right) => constraintPriority(left.state) - constraintPriority(right.state)),
    reviewPolicy: comparison.review_policy
      ? {
          frequency: formatSourceCodeLabel(comparison.review_policy.review_frequency),
          state: comparison.review_policy.state,
          stateLabel: reviewPolicyLabel(comparison.review_policy.state),
          tone: reviewPolicyTone(comparison.review_policy.state),
          lastReviewDate: formatBusinessDateValue(comparison.review_policy.last_review_date, {
            nullDisplay: "Not reported",
          }),
          nextReviewDueDate: formatBusinessDateValue(
            comparison.review_policy.next_review_due_date,
            { nullDisplay: "Not reported" },
          ),
        }
      : null,
    lineage: comparison.source_lineage.map((lineage, index) => ({
      key: `${lineage.product_name}:${lineage.product_version}:${lineage.source_record_id ?? index}`,
      product: `${lineage.product_name} ${lineage.product_version}`,
      sourceSystem: lineage.source_system,
      sourceRecord: nonBlank(lineage.source_record_id) ?? "Not reported",
      dataQuality: lineage.data_quality_status
        ? formatSourceCodeLabel(lineage.data_quality_status)
        : "Not reported",
      latestEvidence: formatTimestampValue(lineage.latest_evidence_timestamp, {
        nullDisplay: "Not reported",
      }),
    })),
  };
}

function mapConstraint(
  constraint: WorkbenchMandateComparison["constraints"][number],
): RiskMandateConstraintViewModel {
  const state = isConstraintState(constraint.state) ? constraint.state : "unavailable";
  const measure = finite(constraint.measure?.value);
  const minimum = finite(constraint.limit?.minimum);
  const maximum = finite(constraint.limit?.maximum);
  const headroom = finite(constraint.headroom);

  return {
    key: constraint.key,
    name: nonBlank(constraint.label) ?? "Mandate constraint",
    state,
    stateLabel: constraintStateLabel(state),
    tone: constraintStateTone(state),
    measure: formatRatio(measure),
    limit: formatLimit(minimum, maximum),
    headroom: formatHeadroom(headroom),
    basis: formatMeasureBasis(constraint.measure?.basis),
    asOf: formatBusinessDateValue(constraint.measure?.as_of_date, {
      nullDisplay: "Not reported",
    }),
    reason: nonBlank(constraint.reason) ?? "No source explanation was supplied.",
    evidence: [
      { label: "Constraint key", value: constraint.key },
      {
        label: "Measure source",
        value: nonBlank(constraint.measure?.source_service) ?? "Not reported",
      },
      {
        label: "Source metric",
        value: nonBlank(constraint.measure?.source_metric) ?? "Not reported",
      },
      {
        label: "Limit source",
        value: nonBlank(constraint.limit?.source_service) ?? "Not reported",
      },
      {
        label: "Source state",
        value: nonBlank(constraint.source_state) ?? "Not reported",
      },
      {
        label: "Source reason",
        value: nonBlank(constraint.source_reason_code) ?? "Not reported",
      },
    ],
  };
}

function formatRatio(value: number | null): string {
  return value === null
    ? "Not reported"
    : formatPercent(value * 100, { minimumFractionDigits: 2 });
}

function formatLimit(minimum: number | null, maximum: number | null): string {
  if (minimum !== null && maximum !== null) {
    return `${formatRatio(minimum)}–${formatRatio(maximum)}`;
  }
  if (minimum !== null) {
    return `Minimum ${formatRatio(minimum)}`;
  }
  if (maximum !== null) {
    return `Maximum ${formatRatio(maximum)}`;
  }
  return "Not defined";
}

function formatHeadroom(value: number | null): string {
  if (value === null) {
    return "Not reported";
  }
  const magnitude = formatPercent(Math.abs(value) * 100, { minimumFractionDigits: 2 });
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${magnitude.replace("%", " pp")}`;
}

function formatMeasureBasis(value: string | null | undefined): string {
  if (!value) {
    return "Not reported";
  }
  if (value === "total_market_value_base") {
    return "Total market value in base currency";
  }
  return formatSourceCodeLabel(value);
}

function isConstraintState(value: string): value is WorkbenchMandateConstraintState {
  return ["within", "breach", "not_defined", "measure_unavailable"].includes(value);
}

function constraintStateLabel(
  state: RiskMandateConstraintViewModel["state"],
): string {
  switch (state) {
    case "within":
      return "Within mandate";
    case "breach":
      return "Outside mandate";
    case "not_defined":
      return "Limit not defined";
    case "measure_unavailable":
      return "Measure unavailable";
    default:
      return "Evidence unavailable";
  }
}

function constraintStateTone(
  state: RiskMandateConstraintViewModel["state"],
): RiskMandateComparisonTone {
  if (state === "breach") {
    return "danger";
  }
  if (state === "not_defined" || state === "measure_unavailable") {
    return "warn";
  }
  return "default";
}

function constraintPriority(state: RiskMandateConstraintViewModel["state"]): number {
  return {
    breach: 0,
    measure_unavailable: 1,
    not_defined: 2,
    unavailable: 3,
    within: 4,
  }[state];
}

function supportabilityLabel(
  state: RiskMandateComparisonSourceViewModel["supportability"],
): string {
  return state === "ready"
    ? "Evidence ready"
    : state === "partial"
      ? "Partial evidence"
      : "Evidence unavailable";
}

function supportabilityTone(
  state: RiskMandateComparisonSourceViewModel["supportability"],
): RiskMandateComparisonTone {
  return state === "ready" ? "default" : state === "partial" ? "warn" : "danger";
}

function dateAlignmentLabel(
  state: RiskMandateComparisonSourceViewModel["dateAlignment"],
): string {
  return state === "aligned"
    ? "Dates aligned"
    : state === "mismatch"
      ? "Dates differ"
      : "Date alignment unavailable";
}

function dateAlignmentTone(
  state: RiskMandateComparisonSourceViewModel["dateAlignment"],
): RiskMandateComparisonTone {
  return state === "aligned" ? "default" : state === "mismatch" ? "warn" : "danger";
}

function reviewPolicyLabel(
  state: NonNullable<RiskMandateComparisonSourceViewModel["reviewPolicy"]>["state"],
): string {
  return {
    due: "Review due",
    overdue: "Review overdue",
    scheduled: "Review scheduled",
    not_defined: "Review cadence not defined",
  }[state];
}

function reviewPolicyTone(
  state: NonNullable<RiskMandateComparisonSourceViewModel["reviewPolicy"]>["state"],
): RiskMandateComparisonTone {
  return state === "overdue" ? "danger" : state === "due" || state === "not_defined" ? "warn" : "default";
}

function contextsConflict(sources: RiskMandateComparisonSourceViewModel[]): boolean {
  if (sources.length < 2) {
    return false;
  }
  const [first, ...rest] = sources;
  return rest.some(
    (source) =>
      source.mandateReference !== first.mandateReference ||
      source.mandateVersion !== first.mandateVersion ||
      source.comparisonAsOf !== first.comparisonAsOf,
  );
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonBlank(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatSourceCodeLabel(value: string): string {
  return formatLabel(value.toLocaleLowerCase("en-US"));
}
