import {
  ActionLink,
  MetricRow,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import {
  DECISION_READINESS_COPY,
  decisionDataQualityStatus,
  decisionReadinessStatus,
  type DecisionReadinessStatus,
} from "@/copy/decision-readiness-copy";

type Props = {
  hasValuationData: boolean;
  hasAnalytics: boolean;
  hasReporting: boolean;
  hasActiveSandbox: boolean;
  warningCount: number;
  failureCount: number;
  riskWorkspaceHref: string;
};

export default function DecisionReadinessPanel(props: Props) {
  const readinessRows = [
    {
      label: DECISION_READINESS_COPY.valuationLabel,
      status: decisionReadinessStatus(props.hasValuationData),
    },
    {
      label: DECISION_READINESS_COPY.analyticsLabel,
      status: decisionReadinessStatus(props.hasAnalytics),
    },
    {
      label: DECISION_READINESS_COPY.reportingLabel,
      status: decisionReadinessStatus(props.hasReporting),
    },
    {
      label: DECISION_READINESS_COPY.scenarioLabel,
      status: decisionReadinessStatus(props.hasActiveSandbox),
    },
    {
      label: DECISION_READINESS_COPY.dataQualityLabel,
      status: decisionDataQualityStatus(props.warningCount, props.failureCount),
    },
  ] satisfies Array<{ label: string; status: DecisionReadinessStatus }>;

  return (
    <SectionBlock title={DECISION_READINESS_COPY.title}>
      <Text variant="secondary" className="muted">
        {DECISION_READINESS_COPY.description}
      </Text>
      {readinessRows.map(({ label, status }) => (
        <MetricRow
          key={label}
          label={label}
          value={
            <SemanticBadge tone={status.tone}>{status.label}</SemanticBadge>
          }
        />
      ))}
      <MetricRow
        label="Risk review"
        value={
          <ActionLink href={props.riskWorkspaceHref}>
            {DECISION_READINESS_COPY.riskAction}
          </ActionLink>
        }
      />
    </SectionBlock>
  );
}
