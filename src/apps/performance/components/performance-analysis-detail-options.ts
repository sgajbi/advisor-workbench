import type { WorkbenchSegmentedControlOption } from "@/design-system";

type ContributionDetailView = "positions" | "segments";
type AttributionDetailView = "relative" | "breakdown";

function formatCountLabel(baseLabel: string, count: number | null | undefined) {
  return count && count > 0 ? `${baseLabel} (${count})` : baseLabel;
}

export function getContributionDetailOptions({
  positionCount,
  segmentCount,
  hasSegmentBreakdown,
}: {
  positionCount: number;
  segmentCount: number;
  hasSegmentBreakdown: boolean;
}): Array<WorkbenchSegmentedControlOption<ContributionDetailView>> {
  return [
    {
      key: "positions",
      label: formatCountLabel("Positions", positionCount),
      title:
        positionCount > 0
          ? `${positionCount} ranked positions available`
          : "Position-level ranking is unavailable for this selection",
    },
    {
      key: "segments",
      label: formatCountLabel("Segment Contribution", segmentCount),
      disabled: !hasSegmentBreakdown,
      title: hasSegmentBreakdown
        ? `${segmentCount} grouped segment rows available`
        : "Grouped segment contribution is unavailable for this selection",
    },
  ];
}

export function getAttributionDetailOptions({
  hasSummaryOnlyBreakdown,
}: {
  hasSummaryOnlyBreakdown: boolean;
}): Array<WorkbenchSegmentedControlOption<AttributionDetailView>> {
  return [
    {
      key: "relative",
      label: "Relative Segment Context",
      title: "Relative segment context for the selected attribution dimension",
    },
    {
      key: "breakdown",
      label: "Effect Breakdown",
      title: hasSummaryOnlyBreakdown
        ? "Only summary-level benchmark-relative effects are available"
        : "Detailed benchmark-relative effect breakdown",
    },
  ];
}
