import type {
  ContributionPositionView,
  ContributionRowView,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type { PerformanceWorkspacePresentation } from "../view-model";
import type { PerformanceWorkspaceMode } from "./performance-workspace-mode-switch";

export type PerformanceWorkspaceRequestPatch = {
  portfolioId?: string;
  period?: string;
  detailBasis?: string;
  contributionDimension?: string;
  attributionDimension?: string;
  chartFrequency?: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

export type PerformanceWorkspaceControls = {
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  onRequestChange?: (patch: PerformanceWorkspaceRequestPatch) => void;
  isUpdating: boolean;
  isDetailsPending: boolean;
};

export type PerformanceSummaryModeProps = PerformanceWorkspaceControls & {
  workspace: WorkbenchPerformanceWorkspace;
  capabilities: PerformanceWorkspaceCapabilities;
  selectedBenchmarkCode?: string;
  selectedBenchmarkLabel?: string | null;
  selectedPerformance:
    | WorkbenchPerformanceWorkspace["net_performance"]
    | WorkbenchPerformanceWorkspace["gross_performance"]
    | undefined;
  primaryDriver: ContributionRowView | null;
  hasMoneyWeightedReturn: boolean;
  suspiciousMoneyWeightedReturn: boolean;
  contributorScale: number;
  positivePositionContributors: ContributionPositionView[];
  negativePositionContributors: ContributionPositionView[];
};

export type PerformanceControlNormalizationHandler = (
  patch: Pick<
    PerformanceWorkspaceRequestPatch,
    "chartFrequency" | "attributionDimension"
  >
) => void;

export type PerformanceSummaryHeaderSectionProps = Pick<
  PerformanceSummaryModeProps,
  | "workspace"
  | "detailBasis"
  | "capabilities"
  | "selectedBenchmarkCode"
  | "selectedBenchmarkLabel"
  | "selectedPerformance"
  | "hasMoneyWeightedReturn"
  | "suspiciousMoneyWeightedReturn"
>;

export type PerformanceSummaryContributorsSectionProps = Pick<
  PerformanceSummaryModeProps,
  | "workspace"
  | "capabilities"
  | "contributorScale"
  | "positivePositionContributors"
  | "negativePositionContributors"
  | "isDetailsPending"
>;

export type PerformanceAnalysisModeProps = PerformanceWorkspaceControls & {
  workspace: WorkbenchPerformanceWorkspace;
  capabilities: PerformanceWorkspaceCapabilities;
  relativeSegmentRows: PerformanceWorkspacePresentation["relativeSegmentRows"];
  topAttributionEffectRows: PerformanceWorkspacePresentation["topAttributionEffectRows"];
  attributionEffectScale: number;
};

export type PerformanceAnalysisAttributionSectionProps = Pick<
  PerformanceAnalysisModeProps,
  | "workspace"
  | "attributionDimension"
  | "onRequestChange"
  | "isUpdating"
  | "isDetailsPending"
  | "capabilities"
  | "relativeSegmentRows"
  | "topAttributionEffectRows"
  | "attributionEffectScale"
>;

export type PerformanceWorkspaceViewProps = {
  workspace: WorkbenchPerformanceWorkspace | null;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  onRequestChange?: (patch: PerformanceWorkspaceRequestPatch) => void;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
};

export type PerformanceWorkspaceModeState = PerformanceWorkspaceMode;
