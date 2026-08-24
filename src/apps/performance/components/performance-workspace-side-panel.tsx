import {
  ActionLink,
  SemanticBadge,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { PERFORMANCE_ACTION_LABELS } from "../performance-terminology";
import {
  getPerformanceTrustStripPresentation,
} from "./performance-workspace-view-helpers";
import { type PerformanceWorkspaceMode } from "../performance-workspace-modes";

type PerformanceWorkspaceSidePanelProps = {
  workspace: WorkbenchPerformanceWorkspace | null;
  mode: PerformanceWorkspaceMode;
  capabilities?: PerformanceWorkspaceCapabilities | null;
  onModeChange: (mode: PerformanceWorkspaceMode) => void;
};

export default function PerformanceWorkspaceSidePanel({
  workspace,
  mode,
  capabilities,
  onModeChange,
}: PerformanceWorkspaceSidePanelProps) {
  const trustItems = capabilities
    ? getPerformanceTrustStripPresentation({ capabilities }).items
    : [];
  const showSupportability = mode !== "summary" && trustItems.length > 0;
  const workflowActions = buildWorkflowActions(mode);
  const portfolioHref = workspace
    ? `/portfolio?portfolioId=${encodeURIComponent(workspace.portfolio_id)}`
    : "/portfolio";
  return (
    <div className="performance-side-panel" aria-label="Performance workspace context">
      {showSupportability ? (
        <WorkbenchRailCard className="performance-side-card">
          <div className="performance-card-header">
            <Text variant="cardTitle" className="performance-side-card-title">
              Supportability
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
          <ActionLink href={portfolioHref} className="performance-side-link performance-side-action">
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
  summary: { label: PERFORMANCE_ACTION_LABELS.openAnalysis, mode: "analysis" },
  analysis: { label: PERFORMANCE_ACTION_LABELS.draftAdviserBrief, mode: "advisor" },
  advisor: { label: PERFORMANCE_ACTION_LABELS.reviewRisk, mode: "risk" },
  risk: { label: PERFORMANCE_ACTION_LABELS.returnToOverview, mode: "summary" },
  evidence: { label: PERFORMANCE_ACTION_LABELS.returnToOverview, mode: "summary" },
};

const SECONDARY_WORKFLOW_ACTIONS: WorkflowAction[] = [
  { label: PERFORMANCE_ACTION_LABELS.openAdviserBrief, mode: "advisor" },
  { label: PERFORMANCE_ACTION_LABELS.reviewRisk, mode: "risk" },
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
