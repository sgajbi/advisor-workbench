import { Panel, WorkbenchStatusRow } from "@/design-system";

import type { PerformanceAdvisorBriefSupportabilityItem } from "../../advisor-brief-view-model";

export default function SupportabilityPanel({
  items,
}: {
  items: PerformanceAdvisorBriefSupportabilityItem[];
}) {
  return (
    <Panel className="performance-advisor-brief-supportability-panel">
      <p className="performance-advisor-brief-eyebrow">Supportability</p>
      <h3 className="performance-advisor-brief-rail-heading">
        Source coverage and brief status
      </h3>
      <WorkbenchStatusRow
        label="Advisor brief supportability"
        className="performance-advisor-brief-support-row"
        items={items.map((item) => ({
          value: `${item.label}: ${item.value}`,
          tone: item.tone,
        }))}
      />
    </Panel>
  );
}
