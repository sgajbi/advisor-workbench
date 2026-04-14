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
  const workflowActions = buildWorkflowActions(mode);

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
          {workflowActions.map((action, index) => (
            <button
              key={action.label}
              type="button"
              className={[
                "performance-side-action",
                index === 0 ? "performance-side-action-primary" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onModeChange(action.mode)}
            >
              {action.label}
            </button>
          ))}
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

type WorkflowAction = {
  label: string;
  mode: PerformanceWorkspaceMode;
};

const PRIMARY_WORKFLOW_ACTION: Record<PerformanceWorkspaceMode, WorkflowAction> = {
  summary: { label: "Open Analysis", mode: "analysis" },
  analysis: { label: "Draft Advisor Brief", mode: "advisor" },
  advisor: { label: "Review Risk Surface", mode: "risk" },
  risk: { label: "Return to Summary", mode: "summary" },
  evidence: { label: "Return to Summary", mode: "summary" },
};

const SECONDARY_WORKFLOW_ACTIONS: WorkflowAction[] = [
  { label: "Open Advisor Brief", mode: "advisor" },
  { label: "Review Risk Surface", mode: "risk" },
];

function buildWorkflowActions(mode: PerformanceWorkspaceMode): WorkflowAction[] {
  const preferred = PRIMARY_WORKFLOW_ACTION[mode];
  const seenLabels = new Set<string>([preferred.label]);
  const seenModes = new Set<PerformanceWorkspaceMode>([preferred.mode]);
  const actions = [preferred];

  for (const action of SECONDARY_WORKFLOW_ACTIONS) {
    if (action.mode === mode || seenModes.has(action.mode) || seenLabels.has(action.label)) {
      continue;
    }
    seenLabels.add(action.label);
    seenModes.add(action.mode);
    actions.push(action);
  }

  return actions;
}
