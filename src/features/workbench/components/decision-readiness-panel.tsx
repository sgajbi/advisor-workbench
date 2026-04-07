import { MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  hasValuationData: boolean;
  hasAnalytics: boolean;
  hasReporting: boolean;
  hasActiveSandbox: boolean;
  warningCount: number;
  failureCount: number;
  hhiProposed: number | null;
};

function statusLabel(ready: boolean): string {
  return ready ? "READY" : "PENDING";
}

function concentrationSignal(hhiProposed: number | null): string {
  if (hhiProposed === null) {
    return "UNAVAILABLE";
  }
  if (hhiProposed >= 0.25) {
    return "HIGH";
  }
  if (hhiProposed >= 0.15) {
    return "MEDIUM";
  }
  return "LOW";
}

export default function DecisionReadinessPanel(props: Props) {
  const dataIntegrityReady = props.warningCount === 0 && props.failureCount === 0;
  const riskSignal = concentrationSignal(props.hhiProposed);
  const readinessTone = (value: string) =>
    value === "READY" || value === "LOW"
      ? "success"
      : value === "ATTENTION" || value === "MEDIUM" || value === "UNAVAILABLE"
        ? "warn"
        : "danger";

  return (
    <SectionBlock title="Decision Readiness">
      <Text variant="secondary" className="muted">
        Backend readiness checks for simulation, advisory review, and execution preparation.
      </Text>
      <MetricRow label="Valuation Coverage" value={<SemanticBadge tone={readinessTone(statusLabel(props.hasValuationData))}>{statusLabel(props.hasValuationData)}</SemanticBadge>} />
      <MetricRow label="Analytics Coverage" value={<SemanticBadge tone={readinessTone(statusLabel(props.hasAnalytics))}>{statusLabel(props.hasAnalytics)}</SemanticBadge>} />
      <MetricRow label="Reporting Coverage" value={<SemanticBadge tone={readinessTone(statusLabel(props.hasReporting))}>{statusLabel(props.hasReporting)}</SemanticBadge>} />
      <MetricRow label="Sandbox Session" value={<SemanticBadge tone={readinessTone(statusLabel(props.hasActiveSandbox))}>{statusLabel(props.hasActiveSandbox)}</SemanticBadge>} />
      <MetricRow label="Data Integrity" value={<SemanticBadge tone={readinessTone(dataIntegrityReady ? "READY" : "ATTENTION")}>{dataIntegrityReady ? "READY" : "ATTENTION"}</SemanticBadge>} />
      <MetricRow
        label="Concentration Risk"
        value={<SemanticBadge tone={readinessTone(riskSignal)}>{riskSignal}</SemanticBadge>}
      />
    </SectionBlock>
  );
}
