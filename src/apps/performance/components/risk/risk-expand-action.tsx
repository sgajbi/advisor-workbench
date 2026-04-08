import { DisclosureToggleButton } from "@/design-system";

export default function RiskExpandAction({
  expanded,
  onToggle,
  expandedLabel,
  collapsedLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  expandedLabel: string;
  collapsedLabel: string;
}) {
  return (
    <DisclosureToggleButton
      expanded={expanded}
      onToggle={onToggle}
      expandedToggleLabel={expandedLabel}
      collapsedToggleLabel={collapsedLabel}
      className="performance-risk-expand-action"
    />
  );
}
