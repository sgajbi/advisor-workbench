import type {
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "./capabilities";
import { buildFallbackAdvisorBriefViewModel } from "./advisor-brief/build-fallback-advisor-brief-view-model";
import { buildGatewayAdvisorBriefViewModel } from "./advisor-brief/build-gateway-advisor-brief-view-model";
import type { PerformanceAdvisorBriefViewModel } from "./advisor-brief/advisor-brief-view-model-types";

export type {
  PerformanceAdvisorBriefAction,
  PerformanceAdvisorBriefAudit,
  PerformanceAdvisorBriefEvidenceRef,
  PerformanceAdvisorBriefItem,
  PerformanceAdvisorBriefMetric,
  PerformanceAdvisorBriefStatus,
  PerformanceAdvisorBriefSupportabilityItem,
  PerformanceAdvisorBriefTone,
  PerformanceAdvisorBriefViewModel,
} from "./advisor-brief/advisor-brief-view-model-types";

export function buildPerformanceAdvisorBriefViewModel({
  workspace,
  advisorBrief,
  advisorBriefUnavailable,
  advisorBriefPermissionBlocked,
  capabilities,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  isDetailsPending,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  advisorBrief?: WorkbenchPerformanceAdvisorBrief | null;
  advisorBriefUnavailable?: boolean;
  advisorBriefPermissionBlocked?: boolean;
  capabilities: PerformanceWorkspaceCapabilities;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  isDetailsPending: boolean;
}): PerformanceAdvisorBriefViewModel {
  if (advisorBrief) {
    return buildGatewayAdvisorBriefViewModel(advisorBrief, workspace);
  }

  return buildFallbackAdvisorBriefViewModel({
    workspace,
    advisorBriefUnavailable: advisorBriefUnavailable ?? false,
    advisorBriefPermissionBlocked: advisorBriefPermissionBlocked ?? false,
    capabilities,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    isDetailsPending,
  });
}
