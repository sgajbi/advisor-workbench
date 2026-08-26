import {
  WorkbenchChartShell,
} from "@/design-system";

import { ATTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisAttributionBreakdown from "./performance-analysis-attribution-breakdown";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisSegmentToolbar from "./performance-analysis-segment-toolbar";
import PerformancePanelInfoDrawer from "./performance-panel-info-drawer";
import {
  getAttributionDetailClassificationGapBody,
  getAttributionSourcePosture,
} from "./performance-attribution-presentations";
import type { PerformanceAnalysisAttributionSectionProps } from "./performance-workspace-types";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import { getAttributionMethodologyRows } from "./performance-analysis-methodology-rows";

export default function PerformanceAnalysisAttributionSection({
  workspace,
  attributionDimension,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  capabilities,
}: PerformanceAnalysisAttributionSectionProps) {
  const hasAttributionSummaryLevels = (workspace.attribution?.levels?.length ?? 0) > 0;
  const hasDetailedAttributionRows =
    workspace.attribution?.levels?.some((level) => level.rows.length > 0) ?? false;
  const disableAttributionSegmentControl =
    isUpdating ||
    (capabilities.attributionDetail.state === "partial" &&
      hasAttributionSummaryLevels &&
      !hasDetailedAttributionRows);
  const attributionClassificationGapBody = getAttributionDetailClassificationGapBody({
    partialFailures: workspace.partial_failures,
    attributionDimension,
  });
  const attributionSourcePosture = getAttributionSourcePosture(workspace.attribution);
  const missingAttributionLevelsBody =
    capabilities.attributionDetail.state !== "unavailable" &&
    (!workspace.attribution || !hasAttributionSummaryLevels)
      ? "Attribution detail is marked available, but no segment attribution levels were returned for the current selection."
      : null;
  const effectiveAttributionCapability = attributionClassificationGapBody
    ? {
        ...capabilities.attributionDetail,
        state: "partial" as const,
        reason: attributionClassificationGapBody,
      }
    : missingAttributionLevelsBody
    ? {
        ...capabilities.attributionDetail,
        state: "partial" as const,
        reason: missingAttributionLevelsBody,
      }
    : attributionSourcePosture?.state === "partial"
    ? {
        ...capabilities.attributionDetail,
        state: "partial" as const,
        reason:
          attributionSourcePosture.reason ??
          "Attribution is available with data-quality qualifications for this selection.",
      }
    : attributionSourcePosture?.state === "unavailable"
    ? {
        ...capabilities.attributionDetail,
        state: "unavailable" as const,
        reason:
          attributionSourcePosture.reason ??
          "Attribution is unavailable for this selection.",
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
        <div className="performance-analysis-panel-actions performance-analysis-panel-actions-inline">
          <PerformanceAnalysisSegmentToolbar
            ariaLabel="Attribution Segment"
            value={attributionDimension}
            disabled={disableAttributionSegmentControl}
            options={ATTRIBUTION_DIMENSION_OPTIONS}
            isOptionSupported={(option) =>
              isCapabilityOptionSupported(capabilities.attributionDetail, "dimension", option)
            }
            onChange={(nextValue) =>
              onRequestChange?.(
                { attributionDimension: nextValue },
                { kind: "field", fieldLabel: "Attribution Segment" }
              )
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
          missingAttributionLevelsBody ??
          attributionSourcePosture?.reason ??
          effectiveAttributionCapability.reason ??
          "Attribution detail is not available for the current selection."
        }
        hint={
          attributionClassificationGapBody
            ? "Select a supported segment or use a benchmark with complete classification coverage for this dimension."
            : missingAttributionLevelsBody
            ? "Use the attribution trend and supportability posture while the selected segment detail is incomplete."
            : attributionSourcePosture?.state === "partial"
            ? "Review source reason codes, residual materiality, and supportability evidence before using attribution in client-facing commentary."
            : hasAttributionSummaryLevels
            ? "Summary-level attribution remains available even when segment rows are absent."
            : "Benchmark-relative attribution requires a comparable benchmark and source-backed attribution levels."
        }
        allowPartialContent={hasAttributionSummaryLevels && !attributionClassificationGapBody}
      >
        {workspace.attribution ? (
          <PerformanceAnalysisAttributionBreakdown attribution={workspace.attribution} />
        ) : null}
      </PerformanceAnalysisModuleState>
    </WorkbenchChartShell>
  );
}
