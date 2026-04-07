import { ActionLink, MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  hasValuationData: boolean;
  hasAnalytics: boolean;
  hasReporting: boolean;
  hasActiveSandbox: boolean;
  warningCount: number;
  failureCount: number;
  riskWorkspaceHref: string;
};

function statusLabel(ready: boolean): string {
  return ready ? "READY" : "PENDING";
}

export default function DecisionReadinessPanel(props: Props) {
  const dataIntegrityReady = props.warningCount === 0 && props.failureCount === 0;
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
        label="Risk Workspace"
        value={<ActionLink href={props.riskWorkspaceHref}>Open Risk</ActionLink>}
      />
    </SectionBlock>
  );
}
