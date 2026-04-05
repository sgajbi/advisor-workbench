import Link from "next/link";
import { MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  portfolioId: string;
  warningCount: number;
  failureCount: number;
  netDeltaQuantity: number;
};

function readinessState(props: Props): "BLOCKED" | "CAUTION" | "READY" {
  if (props.failureCount > 0) {
    return "BLOCKED";
  }
  if (props.warningCount > 0) {
    return "CAUTION";
  }
  return "READY";
}

function recommendation(state: "BLOCKED" | "CAUTION" | "READY"): string {
  if (state === "BLOCKED") {
    return "Resolve upstream exceptions before progressing client-ready actions.";
  }
  if (state === "CAUTION") {
    return "Review warnings and validate assumptions before progressing the next action.";
  }
  return "Proceed to portfolio review and performance follow-up.";
}

export default function AdvisorSummaryCard(props: Props) {
  const state = readinessState(props);
  const tone = state === "READY" ? "success" : state === "CAUTION" ? "warn" : "danger";

  return (
    <SectionBlock title="Advisor Summary">
      <MetricRow label="Readiness" value={<SemanticBadge tone={tone}>{state}</SemanticBadge>} />
      <MetricRow label="Warnings" value={props.warningCount} />
      <MetricRow label="Failures" value={props.failureCount} />
      <MetricRow label="Net Delta Quantity" value={props.netDeltaQuantity.toFixed(4)} />
      <Text variant="secondary" className="muted">{recommendation(state)}</Text>
      <div className="toolbar">
        <Link
          className="nav-link"
          href={`/performance?portfolioId=${encodeURIComponent(props.portfolioId)}`}
        >
          Open Performance Workspace
        </Link>
        <Link className="nav-link" href={`/portfolio?portfolioId=${encodeURIComponent(props.portfolioId)}`}>
          Open Portfolio Workspace
        </Link>
      </div>
    </SectionBlock>
  );
}
