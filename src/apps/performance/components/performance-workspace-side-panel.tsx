import {
  ActionLink,
  SemanticBadge,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import {
  getPerformanceTrustStripPresentation,
} from "./performance-workspace-view-helpers";
import {
  getPerformanceWorkspaceModeDefinition,
  type PerformanceWorkspaceMode,
} from "../performance-workspace-modes";
import { formatDate, formatLabel } from "../formatters";

type PerformanceWorkspaceSidePanelProps = {
  workspace: WorkbenchPerformanceWorkspace | null;
  mode: PerformanceWorkspaceMode;
  period: string;
  detailBasis: string;
  chartFrequency: string;
  capabilities?: PerformanceWorkspaceCapabilities | null;
  selectedBenchmarkLabel?: string | null;
  onModeChange: (mode: PerformanceWorkspaceMode) => void;
};

export default function PerformanceWorkspaceSidePanel({
  workspace,
  mode,
  period,
  detailBasis,
  chartFrequency,
  capabilities,
  selectedBenchmarkLabel,
  onModeChange,
}: PerformanceWorkspaceSidePanelProps) {
  const modeDefinition = getPerformanceWorkspaceModeDefinition(mode);
  const trustItems = capabilities
    ? getPerformanceTrustStripPresentation({ capabilities }).items
    : [];
  const showSupportability = mode !== "summary" && trustItems.length > 0;

  return (
    <div className="performance-side-panel" aria-label="Performance workspace context">
      <WorkbenchRailCard className="performance-side-card">
        <div className="performance-card-header">
          <Text variant="cardTitle" className="performance-side-card-title">
            Review Context
          </Text>
        </div>
        <dl className="performance-side-facts">
          <div className="performance-side-fact">
            <dt>Active Surface</dt>
            <dd>{modeDefinition.label}</dd>
          </div>
          <div className="performance-side-fact">
            <dt>Review Window</dt>
            <dd>
              {workspace
                ? `${formatDate(workspace.report_start_date)} - ${formatDate(workspace.report_end_date)}`
                : "Unavailable"}
            </dd>
          </div>
          <div className="performance-side-fact">
            <dt>Horizon</dt>
            <dd>{formatLabel(period)}</dd>
          </div>
          <div className="performance-side-fact">
            <dt>Basis</dt>
            <dd>{formatLabel(detailBasis)}</dd>
          </div>
          <div className="performance-side-fact">
            <dt>Frequency</dt>
            <dd>{formatLabel(chartFrequency)}</dd>
          </div>
          <div className="performance-side-fact">
            <dt>Benchmark</dt>
            <dd>{selectedBenchmarkLabel ?? "Benchmark pending"}</dd>
          </div>
        </dl>
      </WorkbenchRailCard>

      {showSupportability ? (
        <WorkbenchRailCard className="performance-side-card">
          <div className="performance-card-header">
            <Text variant="cardTitle" className="performance-side-card-title">
              Supportability
            </Text>
            <Text variant="secondary" className="performance-card-subtitle">
              Published module coverage and benchmark-relative readiness for the current selection.
            </Text>
          </div>
          <div className="performance-side-status-list">
            {trustItems.map((item) => (
              <div key={item.label} className="performance-side-status-item">
                <div className="performance-side-status-copy">
                  <span className="performance-side-status-label">{item.label}</span>
                  <span className="performance-side-status-support">{item.support}</span>
                </div>
                <SemanticBadge tone={mapItemTone(item.tone)}>{item.value}</SemanticBadge>
              </div>
            ))}
          </div>
        </WorkbenchRailCard>
      ) : null}

      <WorkbenchRailCard className="performance-side-card">
        <div className="performance-card-header">
          <Text variant="cardTitle" className="performance-side-card-title">
            Workflow
          </Text>
          <Text variant="secondary" className="performance-card-subtitle">
            Move between summary, diagnostics, advisory narrative, and risk review without losing context.
          </Text>
        </div>
        <div className="performance-side-actions">
          <button
            type="button"
            className="performance-side-action performance-side-action-primary"
            onClick={() => onModeChange(nextMode(mode))}
          >
            {getPrimaryActionLabel(mode)}
          </button>
          <button
            type="button"
            className="performance-side-action"
            onClick={() => onModeChange("advisor")}
          >
            Open Advisor Brief
          </button>
          <button
            type="button"
            className="performance-side-action"
            onClick={() => onModeChange("risk")}
          >
            Review Risk Surface
          </button>
          <ActionLink href="/portfolio" className="performance-side-link">
            Return to Portfolio
          </ActionLink>
        </div>
      </WorkbenchRailCard>
    </div>
  );
}

function mapItemTone(tone?: "default" | "success" | "warn" | "danger") {
  if (tone === "success") {
    return "success" as const;
  }
  if (tone === "warn") {
    return "warn" as const;
  }
  if (tone === "danger") {
    return "danger" as const;
  }
  return "default" as const;
}

function nextMode(mode: PerformanceWorkspaceMode): PerformanceWorkspaceMode {
  if (mode === "summary") {
    return "analysis";
  }
  if (mode === "analysis") {
    return "advisor";
  }
  if (mode === "advisor") {
    return "risk";
  }
  return "summary";
}

function getPrimaryActionLabel(mode: PerformanceWorkspaceMode) {
  if (mode === "summary") {
    return "Open Analysis";
  }
  if (mode === "analysis") {
    return "Draft Advisor Brief";
  }
  if (mode === "advisor") {
    return "Review Risk Surface";
  }
  return "Return to Summary";
}
