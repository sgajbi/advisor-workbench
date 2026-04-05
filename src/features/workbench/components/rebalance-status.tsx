"use client";

import { MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  status: string;
  lastRunId: string | null;
};

export default function RebalanceStatus(props: Props) {
  const tone =
    props.status === "READY" ? "success" : props.status.includes("REVIEW") ? "warn" : "danger";

  return (
    <SectionBlock title="Rebalance Status">
      <MetricRow label="Status" value={<SemanticBadge tone={tone}>{props.status}</SemanticBadge>} />
      <Text variant="secondary" className="muted">
        Last Run: {props.lastRunId ?? "N/A"}
      </Text>
    </SectionBlock>
  );
}
