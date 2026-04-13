import {
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
  capabilities,
  selectedBenchmarkLabel,
  onModeChange,
  onRequestChange,
}: PerformanceWorkspaceRailProps) {
  const benchmarkLabel = selectedBenchmarkLabel ?? "Benchmark pending";

  return (
    <div className="performance-workspace-rail" aria-label="Performance workspace navigation">
      <WorkbenchRailCard className="performance-rail-card">
        <div className="performance-rail-section">
          <Text variant="label" className="performance-rail-section-label">
            Performance
          </Text>
          <div className="performance-rail-item-list">
            {WORKSPACE_NAV_ITEMS.map((item) => {
              const capability = item.capabilityKey ? capabilities?.[item.capabilityKey] : null;
              const disabled = capability ? !isInteractiveCapability(capability) : false;
              const active = mode === item.mode;
              const modeDefinition = getPerformanceWorkspaceModeDefinition(item.mode);

              return (
                <button
                  key={item.mode}
                  type="button"
                  className={[
                    "performance-rail-item",
                    active ? "performance-rail-item-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={active ? "page" : undefined}
                  aria-pressed={active}
                  disabled={disabled}
                  title={disabled ? capability?.reason : modeDefinition.intro?.description}
                  onClick={() => onModeChange(item.mode)}
                >
                  <span className="performance-rail-item-copy">
                    <span className="performance-rail-item-title">{item.label}</span>
                    <span className="performance-rail-item-support">
                      {resolveModeSupport(
                        modeDefinition.intro?.description ?? modeDefinition.workspaceSubtitle,
                        capability
                      )}
                    </span>
                  </span>
                  {capability ? (
                    <SemanticBadge
                      tone={getCapabilityTone(capability)}
                      className="performance-rail-item-badge"
                    >
                      {getCapabilityLabel(capability)}
                    </SemanticBadge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </WorkbenchRailCard>

      <WorkbenchRailCard className="performance-rail-card">
        <div className="performance-rail-section">
          <Text variant="label" className="performance-rail-section-label">
            Quick Views
          </Text>
          <div className="performance-rail-item-list">
            {QUICK_VIEW_ITEMS.map((item) => {
              const disabled = item.disabledWhen?.(period) ?? false;
              const active = item.period ? period === item.period : item.mode === mode;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={[
                    "performance-rail-item",
                    "performance-rail-quick-view",
                    active ? "performance-rail-item-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={active ? "page" : undefined}
                  disabled={disabled}
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
                  <span className="performance-rail-item-copy">
                    <span className="performance-rail-item-title">{item.label}</span>
                    <span className="performance-rail-item-support">
                      {resolveQuickViewSupport(item, period)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </WorkbenchRailCard>

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
                  ? `Client ${workspace.portfolio.client_id}`
                  : "Client identity not published by the current workspace."}
              </Text>
            </div>
            <dl className="performance-client-context-facts">
              <div className="performance-client-context-row">
                <dt>Total Assets</dt>
                <dd>
                  {workspace
                    ? formatCurrency(
                        workspace.overview.market_value_base,
                        workspace.portfolio.base_currency
                      )
                    : "Unavailable"}
                </dd>
              </div>
              <div className="performance-client-context-row">
                <dt>Base Currency</dt>
                <dd>{workspace?.portfolio.base_currency ?? "Unavailable"}</dd>
              </div>
              <div className="performance-client-context-row">
                <dt>Primary Benchmark</dt>
                <dd>{benchmarkLabel}</dd>
              </div>
              <div className="performance-client-context-row">
                <dt>As Of</dt>
                <dd>{workspace ? formatDate(workspace.as_of_date) : "Unavailable"}</dd>
              </div>
            </dl>
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

function resolveModeSupport(fallback: string, capability: WorkspaceCapability | null | undefined) {
  return capability?.reason ?? fallback;
}

function resolveQuickViewSupport(
  item: (typeof QUICK_VIEW_ITEMS)[number],
  period: string
) {
  if (item.key === "custom-range") {
    return period === "EXPLICIT" ? "Explicit window active" : "Awaiting explicit date range";
  }
  if (item.key === "peer-comparison") {
    return "Peer-relative panel not yet contract-backed";
  }
  if (item.period === period) {
    return "Current review horizon";
  }
  return item.period === "1Y" ? "Trailing annual window" : "Calendar-to-date window";
}
