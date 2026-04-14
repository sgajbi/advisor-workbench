import {
  DefinitionList,
  SemanticBadge,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import {
  isPartialCapability,
  isSupportedCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import {
  getPerformanceWorkspaceModeDefinition,
  type PerformanceWorkspaceMode,
} from "../performance-workspace-modes";
import { formatCurrency, formatDate } from "../formatters";
import type { PerformanceWorkspaceRequestPatch } from "./performance-workspace-types";

type PerformanceWorkspaceRailProps = {
  workspace: WorkbenchPerformanceWorkspace | null;
  mode: PerformanceWorkspaceMode;
  period: string;
  isDetailsPending?: boolean;
  capabilities?: PerformanceWorkspaceCapabilities | null;
  selectedBenchmarkLabel?: string | null;
  onModeChange: (mode: PerformanceWorkspaceMode) => void;
  onRequestChange?: (patch: PerformanceWorkspaceRequestPatch) => void;
};

const WORKSPACE_NAV_ITEMS: Array<{
  mode: PerformanceWorkspaceMode;
  label: string;
  capabilityKey?: keyof PerformanceWorkspaceCapabilities;
}> = [
  { mode: "summary", label: "Performance Overview" },
  { mode: "analysis", label: "Performance Analysis", capabilityKey: "attributionDetail" },
  { mode: "advisor", label: "Advisor Brief" },
  { mode: "risk", label: "Risk Review", capabilityKey: "returnPath" },
  { mode: "evidence", label: "Evidence", capabilityKey: "evidence" },
];

const QUICK_VIEW_ITEMS: Array<{
  key: string;
  label: string;
  period?: string;
  mode?: PerformanceWorkspaceMode;
  disabledWhen?: (period: string) => boolean;
  disabledReason?: string;
}> = [
  { key: "ytd", label: "YTD", period: "YTD" },
  { key: "last-12-months", label: "Last 12 Months", period: "1Y" },
  {
    key: "custom-range",
    label: "Custom Range",
    period: "EXPLICIT",
    disabledWhen: (period) => period !== "EXPLICIT",
    disabledReason: "Explicit date-window selection is not exposed from the current shell.",
  },
  {
    key: "peer-comparison",
    label: "Peer Comparison",
    disabledWhen: () => true,
    disabledReason: "Peer benchmark comparison is not exposed by the current performance contract.",
  },
];

export default function PerformanceWorkspaceRail({
  workspace,
  mode,
  period,
  isDetailsPending = false,
  capabilities,
  selectedBenchmarkLabel,
  onModeChange,
  onRequestChange,
}: PerformanceWorkspaceRailProps) {
  const benchmarkLabel = selectedBenchmarkLabel ?? "Benchmark pending";
  const clientContextFacts = [
    {
      label: "Base Currency",
      value: workspace?.portfolio.base_currency ?? "Unavailable",
    },
    {
      label: "As Of",
      value: workspace ? formatDate(workspace.as_of_date) : "Unavailable",
    },
  ];

  return (
    <div className="performance-workspace-rail" aria-label="Performance workspace navigation">
      <WorkbenchRailCard className="performance-rail-card performance-client-context-card">
        <div className="performance-rail-section">
          <Text variant="label" className="performance-rail-section-label">
            Client Context
          </Text>
          <div className="performance-client-context">
            <div className="performance-client-context-header">
              <Text variant="cardTitle">
                {workspace ? workspace.portfolio.portfolio_id : "Portfolio pending"}
              </Text>
              <Text variant="secondary" className="performance-client-context-copy">
                {workspace?.portfolio.client_id
                  ? workspace.portfolio.client_id
                  : "Client identity not published by the current workspace."}
              </Text>
            </div>
            <div className="performance-client-context-summary" aria-label="Client context market value">
              <Text variant="label" className="performance-client-context-summary-label">
                Total Assets
              </Text>
              <Text variant="metricValueM" className="performance-client-context-summary-value">
                {workspace
                  ? formatCurrency(
                      workspace.overview.market_value_base,
                      workspace.portfolio.base_currency
                    )
                  : "Unavailable"}
              </Text>
            </div>
            <div className="performance-client-context-benchmark">
              <Text variant="label" className="performance-client-context-benchmark-label">
                Primary Benchmark
              </Text>
              <Text variant="body" className="performance-client-context-benchmark-value">
                {benchmarkLabel}
              </Text>
            </div>
            <DefinitionList
              ariaLabel="Client context facts"
              className="performance-client-context-facts"
              rowClassName="performance-client-context-fact-row"
              items={clientContextFacts}
            />
          </div>
        </div>
      </WorkbenchRailCard>

      <WorkbenchRailCard className="performance-rail-card">
        <div className="performance-rail-section performance-rail-section-nav">
          <Text variant="label" className="performance-rail-section-label">
            Performance
          </Text>
          <div className="performance-rail-item-list">
            {WORKSPACE_NAV_ITEMS.map((item) => {
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
              const modeDefinition = getPerformanceWorkspaceModeDefinition(item.mode);
              const badge = isPendingAnalysisAvailability ? (
                <SemanticBadge
                  tone="default"
                  className="performance-rail-item-badge"
                  title="Analysis availability is still loading."
                >
                  Loading
                </SemanticBadge>
              ) : capability ? (
                <SemanticBadge
                  tone={getCapabilityTone(capability)}
                  className="performance-rail-item-badge"
                >
                  {getCapabilityLabel(capability)}
                </SemanticBadge>
              ) : null;

              return (
                <PerformanceRailActionItem
                  key={item.mode}
                  active={active}
                  disabled={disabled}
                  aria-current={active ? "page" : undefined}
                  aria-pressed={active}
                  title={
                    isPendingAnalysisAvailability
                      ? "Analysis availability is loading."
                      : disabled
                        ? capability?.reason
                        : modeDefinition.intro?.description
                  }
                  onClick={() => onModeChange(item.mode)}
                  badge={badge}
                >
                  {item.label}
                </PerformanceRailActionItem>
              );
            })}
          </div>
        </div>
      </WorkbenchRailCard>

      <WorkbenchRailCard className="performance-rail-card">
        <div className="performance-rail-section performance-rail-section-quick-views">
          <Text variant="label" className="performance-rail-section-label">
            Quick Views
          </Text>
          <div className="performance-rail-item-list">
            {QUICK_VIEW_ITEMS.map((item) => {
              const disabled = item.disabledWhen?.(period) ?? false;
              const active = item.period ? period === item.period : item.mode === mode;

              return (
                <PerformanceRailActionItem
                  key={item.key}
                  className="performance-rail-quick-view"
                  active={active}
                  disabled={disabled}
                  aria-current={active ? "page" : undefined}
                  aria-pressed={active}
                  title={disabled ? item.disabledReason : undefined}
                  onClick={() => {
                    if (item.period) {
                      onRequestChange?.({ period: item.period });
                    }
                    if (item.mode) {
                      onModeChange(item.mode);
                    }
                  }}
                >
                  {item.label}
                </PerformanceRailActionItem>
              );
            })}
          </div>
        </div>
      </WorkbenchRailCard>
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

function PerformanceRailActionItem({
  children,
  className,
  active = false,
  disabled = false,
  badge = null,
  ...buttonProps
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={[
        "performance-rail-item",
        active ? "performance-rail-item-active" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      {...buttonProps}
    >
      <span className="performance-rail-item-copy">
        <span className="performance-rail-item-title">{children}</span>
      </span>
      {badge ? <span className="performance-rail-item-affordance">{badge}</span> : null}
    </button>
  );
}
