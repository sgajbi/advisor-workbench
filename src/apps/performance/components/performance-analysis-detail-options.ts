import type { WorkbenchSegmentedControlOption } from "@/design-system";

type ContributionDetailView = "positions" | "segments";

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
      label: formatCountLabel("Segment Summary", segmentCount),
      disabled: !hasSegmentBreakdown,
      title: hasSegmentBreakdown
        ? `${segmentCount} grouped segment contribution rows available`
        : "Grouped segment contribution is unavailable for this selection",
    },
  ];
}
