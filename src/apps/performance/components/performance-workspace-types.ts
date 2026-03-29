import type {
  ContributionPositionView,
  ContributionRowView,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";

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
  hasBenchmark: boolean;
  hasHistory: boolean;
  selectedBenchmarkCode?: string;
  selectedBenchmarkLabel?: string | null;
  selectedPerformance:
    | WorkbenchPerformanceWorkspace["net_performance"]
    | WorkbenchPerformanceWorkspace["gross_performance"]
    | undefined;
  primaryDriver: ContributionRowView | null;
  hasMoneyWeightedReturn: boolean;
  suspiciousMoneyWeightedReturn: boolean;
  hasContribution: boolean;
  hasPositionRanking: boolean;
  contributorScale: number;
  positivePositionContributors: ContributionPositionView[];
  negativePositionContributors: ContributionPositionView[];
};

export type PerformanceSummaryHeaderSectionProps = Pick<
  PerformanceSummaryModeProps,
  | "workspace"
  | "detailBasis"
  | "hasBenchmark"
  | "hasHistory"
  | "selectedBenchmarkCode"
  | "selectedBenchmarkLabel"
  | "selectedPerformance"
  | "primaryDriver"
  | "hasMoneyWeightedReturn"
  | "suspiciousMoneyWeightedReturn"
>;

export type PerformanceSummaryContributorsSectionProps = Pick<
  PerformanceSummaryModeProps,
  | "workspace"
  | "hasContribution"
  | "hasPositionRanking"
  | "contributorScale"
  | "positivePositionContributors"
  | "negativePositionContributors"
  | "isDetailsPending"
>;

export type PerformanceAnalysisModeProps = PerformanceWorkspaceControls & {
  workspace: WorkbenchPerformanceWorkspace;
  hasAttribution: boolean;
  hasContribution: boolean;
  relativeSegmentRows: PerformanceWorkspacePresentation["relativeSegmentRows"];
  topAttributionEffectRows: PerformanceWorkspacePresentation["topAttributionEffectRows"];
  attributionEffectScale: number;
};

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
