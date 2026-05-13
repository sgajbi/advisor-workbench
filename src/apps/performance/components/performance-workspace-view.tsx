import {
  MainWithSideRailLayout,
  Panel,
  SemanticBadge,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import {
  isPartialCapability,
  isSupportedCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";

import {
  getPerformanceWorkspaceCapabilities,
  type PerformanceWorkspaceCapabilities,
} from "../capabilities";
import {
  getPerformanceWorkspaceModeDefinition,
} from "../performance-workspace-modes";
import {
  getPerformanceWorkspacePresentation,
} from "../view-model";
import PerformanceAdvisorBriefMode from "./performance-advisor-brief-mode";
import PerformanceAnalysisMode from "./performance-analysis-mode";
import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceEvidenceMode from "./performance-evidence-mode";
import PerformanceRiskMode from "./performance-risk-mode";
import PerformanceSummaryMode from "./performance-summary-mode";
import PerformanceWorkspaceSidePanel from "./performance-workspace-side-panel";
import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioScreenNavigationKey } from "@/apps/portfolio/portfolio-screen-navigation";
import type {
  PerformanceWorkspaceControls,
  PerformanceWorkspaceViewProps,
} from "./performance-workspace-types";
import {
  getBenchmarkLabel,
  getPerformanceControlNormalizationNotice,
} from "./performance-workspace-view-helpers";

export default function PerformanceWorkspaceView({
  workspace,
  loadIssue,
  mode,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onModeChange,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
}: PerformanceWorkspaceViewProps) {
  const presentation = workspace ? getPerformanceWorkspacePresentation(workspace) : null;
  const capabilities = workspace ? getPerformanceWorkspaceCapabilities(workspace) : null;
  const modeDefinition = getPerformanceWorkspaceModeDefinition(mode);
  const workspaceTitle = modeDefinition.workspaceTitle;
  const unavailableCopy = getWorkspaceUnavailableCopy(loadIssue, workspaceTitle, modeDefinition.label);
  const railPortfolioId = workspace?.portfolio.portfolio_id ?? "Portfolio pending";
  const activeWorkbenchScreen = getActiveWorkbenchScreen(mode);
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;
  const controlNormalizationNotice = workspace
    ? getPerformanceControlNormalizationNotice(workspace)
    : null;
  const controls: PerformanceWorkspaceControls = {
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    onRequestChange,
    isUpdating,
    isDetailsPending,
  };

  const modePanel = !workspace ? null : mode === "summary" ? (
    <PerformanceSummaryMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
      selectedBenchmarkCode={selectedBenchmarkCode}
      selectedBenchmarkLabel={selectedBenchmarkLabel}
      selectedPerformance={selectedPerformance}
      primaryDriver={presentation?.primaryDriver ?? null}
      hasMoneyWeightedReturn={presentation?.hasMoneyWeightedReturn ?? false}
      suspiciousMoneyWeightedReturn={presentation?.suspiciousMoneyWeightedReturn ?? false}
      contributorScale={presentation?.contributorScale ?? 0.01}
      positivePositionContributors={presentation?.positivePositionContributors ?? []}
      negativePositionContributors={presentation?.negativePositionContributors ?? []}
      topContributors={presentation?.topContributors ?? []}
      bottomContributors={presentation?.bottomContributors ?? []}
    />
  ) : mode === "analysis" ? (
    <PerformanceAnalysisMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
    />
  ) : mode === "advisor" ? (
    <PerformanceAdvisorBriefMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
      onSelectMode={onModeChange}
    />
  ) : mode === "risk" ? (
    <PerformanceRiskMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
    />
  ) : (
    <PerformanceEvidenceMode
      capability={capabilities!.evidence}
      evidenceView={workspace.evidence_view ?? null}
    />
  );

  return (
    <MainWithSideRailLayout
      className="performance-layout"
      railClassName="portfolio-screen-rail-shell performance-rail-shell"
      mainClassName="performance-main"
      sideClassName="performance-side performance-side-wide"
      sideDensity="comfortable"
      rail={
        <PortfolioScreenRail
          portfolioId={railPortfolioId}
          activeScreen={activeWorkbenchScreen}
        />
      }
      main={
        !workspace ? (
            <WorkbenchPageFrame
            className={`performance-page-frame performance-page-frame-${mode}`}
            bodyClassName="performance-page-frame-body"
            title={workspaceTitle}
          >
            <WorkbenchSectionStack className="performance-page-sections">
              <PerformanceSurfaceSwitcher
                mode={mode}
                capabilities={capabilities}
                isDetailsPending={isDetailsPending}
                onModeChange={onModeChange}
              />
              <Panel className="performance-page-unavailable-shell">
                <PerformanceAnalyticalUnavailableState
                  ariaLabel={unavailableCopy.ariaLabel}
                  status={unavailableCopy.status}
                  title={unavailableCopy.title}
                  body={unavailableCopy.body}
                  hint={unavailableCopy.hint}
                  contextItems={unavailableCopy.contextItems}
                  availableItems={[
                    {
                      label: "Shell",
                      value: "Workspace navigation and route context remain available.",
                    },
                  ]}
                />
              </Panel>
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        ) : (
          <WorkbenchPageFrame
            className={`performance-page-frame performance-page-frame-${mode}`}
            bodyClassName="performance-page-frame-body"
            title={workspaceTitle}
          >
            <WorkbenchSectionStack className="performance-page-sections">
              <PerformanceSurfaceSwitcher
                mode={mode}
                capabilities={capabilities}
                isDetailsPending={isDetailsPending}
                onModeChange={onModeChange}
              />
              {controlNormalizationNotice ? (
                <div
                  className="performance-control-normalization-note"
                  role="status"
                  aria-label="Performance control normalization"
                >
                  <p className="performance-control-normalization-note-title">
                    {controlNormalizationNotice.title}
                  </p>
                  <p className="performance-control-normalization-note-message">
                    {controlNormalizationNotice.message}
                  </p>
                </div>
              ) : null}
              {modePanel}
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        )
      }
      side={
        <PerformanceWorkspaceSidePanel
          workspace={workspace}
          mode={mode}
          period={period}
          detailBasis={detailBasis}
          chartFrequency={chartFrequency}
          capabilities={capabilities}
          selectedBenchmarkLabel={selectedBenchmarkLabel}
          onModeChange={onModeChange}
        />
      }
    />
  );
}

const PERFORMANCE_SURFACE_ITEMS: Array<{
  mode: PerformanceWorkspaceViewProps["mode"];
  label: string;
  capabilityKey?: keyof PerformanceWorkspaceCapabilities;
}> = [
  { mode: "summary", label: "Performance Overview" },
  { mode: "analysis", label: "Performance Analysis", capabilityKey: "attributionDetail" },
  { mode: "advisor", label: "Advisor Brief" },
  { mode: "risk", label: "Risk Review", capabilityKey: "returnPath" },
  { mode: "evidence", label: "Evidence", capabilityKey: "evidence" },
];

function PerformanceSurfaceSwitcher({
  mode,
  capabilities,
  isDetailsPending,
  onModeChange,
}: {
  mode: PerformanceWorkspaceViewProps["mode"];
  capabilities: PerformanceWorkspaceCapabilities | null;
  isDetailsPending: boolean;
  onModeChange: PerformanceWorkspaceViewProps["onModeChange"];
}) {
  return (
    <div className="performance-surface-switcher" aria-label="Performance surface navigation">
      <div className="performance-surface-switcher-copy">
        <span>Performance Surface</span>
        <strong>{getPerformanceWorkspaceModeDefinition(mode).label}</strong>
      </div>
      <div className="performance-surface-switcher-actions">
        {PERFORMANCE_SURFACE_ITEMS.map((item) => {
          const capability = item.capabilityKey ? capabilities?.[item.capabilityKey] : null;
          const isPendingAnalysisAvailability =
            item.mode === "analysis" &&
            isDetailsPending &&
            capability?.state === "unavailable";
          const disabled =
            capability && !isPendingAnalysisAvailability
              ? !isInteractiveCapability(capability)
              : false;
          const active = mode === item.mode;

          return (
            <button
              key={item.mode}
              type="button"
              className={[
                "performance-surface-switcher-button",
                active ? "performance-surface-switcher-button-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              aria-current={active ? "page" : undefined}
              aria-pressed={active}
              title={
                isPendingAnalysisAvailability
                  ? "Analysis availability is loading."
                  : disabled
                    ? capability?.reason
                    : getPerformanceWorkspaceModeDefinition(item.mode).intro?.description
              }
              onClick={() => onModeChange(item.mode)}
            >
              <span>{item.label}</span>
              {isPendingAnalysisAvailability ? (
                <SemanticBadge tone="default">Loading</SemanticBadge>
              ) : capability ? (
                <SemanticBadge tone={getCapabilityTone(capability)}>
                  {getCapabilityLabel(capability)}
                </SemanticBadge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isInteractiveCapability(capability: WorkspaceCapability) {
  return isSupportedCapability(capability) || isPartialCapability(capability);
}

function getCapabilityTone(capability: WorkspaceCapability) {
  if (capability.state === "supported") {
    return "success" as const;
  }
  if (capability.state === "partial") {
    return "warn" as const;
  }
  return "danger" as const;
}

function getCapabilityLabel(capability: WorkspaceCapability) {
  if (capability.state === "supported") {
    return "Ready";
  }
  if (capability.state === "partial") {
    return "Partial";
  }
  return "Unavailable";
}

function getActiveWorkbenchScreen(
  mode: PerformanceWorkspaceViewProps["mode"]
): PortfolioScreenNavigationKey {
  if (mode === "risk") {
    return "risk";
  }
  if (mode === "advisor") {
    return "advisory";
  }
  return "performance";
}

function getWorkspaceUnavailableCopy(
  loadIssue: PerformanceWorkspaceViewProps["loadIssue"],
  workspaceTitle: string,
  modeLabel: string
) {
  if (loadIssue?.state === "permission_blocked") {
    return {
      ariaLabel: "Performance workspace access restricted",
      status: "permission_blocked" as const,
      title: "Access restricted",
      body:
        "The selected analytics workspace is permission-blocked for this caller context.",
      hint:
        "Use an entitled front-office role or contact platform support to verify the caller-context policy. Restricted entitlement details are intentionally not shown in the browser.",
      contextItems: [
        { label: "Surface", value: workspaceTitle },
        { label: "Mode", value: modeLabel },
        { label: "HTTP status", value: String(loadIssue.status ?? "401/403") },
      ],
    };
  }

  return {
    ariaLabel: "Performance workspace unavailable",
    status: "unavailable" as const,
    title: "Performance data unavailable",
    body: "The selected portfolio could not be loaded from the performance workspace contract.",
    hint:
      "The performance workspace contract must resolve successfully before benchmark-aware return, contribution, and risk surfaces can render.",
    contextItems: [
      { label: "Surface", value: workspaceTitle },
      { label: "Mode", value: modeLabel },
    ],
  };
}
