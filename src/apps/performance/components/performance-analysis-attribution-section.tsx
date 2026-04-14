import { useState } from "react";

import {
  WorkbenchChartShell,
} from "@/design-system";

import { ATTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisAttributionBreakdown from "./performance-analysis-attribution-breakdown";
import PerformanceAnalysisDetailPane from "./performance-analysis-detail-pane";
import { getAttributionDetailOptions } from "./performance-analysis-detail-options";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisSegmentToolbar from "./performance-analysis-segment-toolbar";
import PerformancePanelInfoDrawer from "./performance-panel-info-drawer";
import PerformanceRelativeSegmentPanel from "./performance-relative-segment-panel";
import { getAttributionDetailClassificationGapBody } from "./performance-attribution-presentations";
import type { PerformanceAnalysisAttributionSectionProps } from "./performance-workspace-types";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import { getAttributionMethodologyRows } from "./performance-analysis-methodology-rows";

type AttributionDetailView = "relative" | "breakdown";

export default function PerformanceAnalysisAttributionSection({
  workspace,
  attributionDimension,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  capabilities,
  relativeSegmentRows,
}: PerformanceAnalysisAttributionSectionProps) {
  const hasAttributionSummaryLevels = (workspace.attribution?.levels?.length ?? 0) > 0;
  const hasDetailedAttributionRows =
    workspace.attribution?.levels?.some((level) => level.rows.length > 0) ?? false;
  const hasRelativeSegmentRows = relativeSegmentRows.length > 0;
  const [detailView, setDetailView] = useState<AttributionDetailView>(
    hasRelativeSegmentRows ? "relative" : "breakdown"
  );
  const disableAttributionSegmentControl =
    isUpdating ||
    (capabilities.attributionDetail.state === "partial" &&
      hasAttributionSummaryLevels &&
      !hasDetailedAttributionRows);
  const attributionClassificationGapBody = getAttributionDetailClassificationGapBody({
    partialFailures: workspace.partial_failures,
    attributionDimension,
  });
  const effectiveAttributionCapability = attributionClassificationGapBody
    ? {
        ...capabilities.attributionDetail,
        state: "partial" as const,
        reason: attributionClassificationGapBody,
      }
    : capabilities.attributionDetail;
  const attributionMethodologyRows = getAttributionMethodologyRows(
    workspace.attribution,
    workspace.benchmark_options ?? []
  );
  return (
    <WorkbenchChartShell
      id="performance-attribution"
      title="Attribution Detail"
      actions={
        <div className="performance-analysis-panel-actions">
          <PerformanceAnalysisSegmentToolbar
            ariaLabel="Attribution Segment"
            value={attributionDimension}
            disabled={disableAttributionSegmentControl}
            options={ATTRIBUTION_DIMENSION_OPTIONS}
            isOptionSupported={(option) =>
              isCapabilityOptionSupported(capabilities.attributionDetail, "dimension", option)
            }
            onChange={(nextValue) =>
              onRequestChange?.({
                attributionDimension: nextValue,
              })
            }
          />
          <PerformancePanelInfoDrawer
            panelTitle="Attribution Detail"
            rows={attributionMethodologyRows}
            triggerVariant="inline"
          />
        </div>
      }
      className="performance-detail-panel-wide performance-analysis-module performance-workspace-panel"
    >
      <PerformanceAnalysisModuleState
        capability={effectiveAttributionCapability}
        isDetailsPending={isDetailsPending}
        loadingText="Loading attribution effects and benchmark-relative decomposition."
        partialTitle="Attribution detail is partial"
        unavailableTitle="Attribution detail unavailable"
        body={
          attributionClassificationGapBody ??
          effectiveAttributionCapability.reason ??
          "Attribution detail is not available for the current selection."
        }
        hint={
          attributionClassificationGapBody
            ? "Select a supported segment or use a benchmark with complete classification coverage for this dimension."
            : hasAttributionSummaryLevels
            ? "Summary-level attribution remains available even when segment rows are absent."
            : "Benchmark-relative attribution requires a comparable benchmark and source-backed attribution levels."
        }
        allowPartialContent={hasAttributionSummaryLevels && !attributionClassificationGapBody}
      >
        {workspace.attribution ? (
          <PerformanceAnalysisDetailPane
            value={detailView}
            onChange={setDetailView}
            options={getAttributionDetailOptions({
              hasSummaryOnlyBreakdown: hasAttributionSummaryLevels && !hasDetailedAttributionRows,
              hasRelativeSegmentContext: hasRelativeSegmentRows,
            })}
          >
            {detailView === "relative" ? (
              <PerformanceRelativeSegmentPanel rows={relativeSegmentRows} />
            ) : (
              <PerformanceAnalysisAttributionBreakdown levels={workspace.attribution.levels} />
            )}
          </PerformanceAnalysisDetailPane>
        ) : null}
      </PerformanceAnalysisModuleState>
    </WorkbenchChartShell>
  );
}
