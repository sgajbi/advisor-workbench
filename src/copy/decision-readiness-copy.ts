export type DecisionReadinessTone = "success" | "warn";

export type DecisionReadinessStatus = {
  label: "Ready" | "Review required";
  tone: DecisionReadinessTone;
};

export const DECISION_READINESS_COPY = Object.freeze({
  title: "Decision readiness",
  description:
    "Confirm the evidence required to assess, simulate and prepare this portfolio.",
  valuationLabel: "Valuation evidence",
  analyticsLabel: "Analytics evidence",
  reportingLabel: "Reporting evidence",
  scenarioLabel: "Scenario analysis",
  dataQualityLabel: "Data quality",
  riskAction: "Review risk",
});

export function decisionReadinessStatus(
  ready: boolean,
): DecisionReadinessStatus {
  return ready
    ? { label: "Ready", tone: "success" }
    : { label: "Review required", tone: "warn" };
}

export function decisionDataQualityStatus(
  warningCount: number,
  failureCount: number,
): DecisionReadinessStatus {
  return decisionReadinessStatus(warningCount === 0 && failureCount === 0);
}
