import { WorkbenchSegmentedControl, WorkbenchStatusRow } from "@/design-system";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import {
  isPartialCapability,
  isSupportedCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";

export type PerformanceWorkspaceMode = "summary" | "analysis" | "evidence";

const WORKSPACE_MODES: Array<{ key: PerformanceWorkspaceMode; label: string }> = [
  { key: "summary", label: "Summary" },
  { key: "analysis", label: "Analysis" },
  { key: "evidence", label: "Evidence" },
];

function isModeUsable(capability: WorkspaceCapability) {
  return isSupportedCapability(capability) || isPartialCapability(capability);
}

function getAnalysisCapability(
  capabilities?: PerformanceWorkspaceCapabilities
): WorkspaceCapability | null {
  if (!capabilities) {
    return null;
  }

  const analyticCapabilities = [
    capabilities.returnPath,
    capabilities.attributionDetail,
    capabilities.contributionDetail,
  ];

  if (analyticCapabilities.some((capability) => isSupportedCapability(capability))) {
    return { state: "supported" };
  }
  if (analyticCapabilities.some((capability) => isPartialCapability(capability))) {
    return {
      state: "partial",
      reason: "Analysis is available with partial module coverage.",
    };
  }
  return {
    state: "unavailable",
    reason: "Analysis requires published return history, contribution detail, or attribution detail.",
  };
}

export default function PerformanceWorkspaceModeSwitch({
  value,
  onChange,
  capabilities,
}: {
  value: PerformanceWorkspaceMode;
  onChange: (value: PerformanceWorkspaceMode) => void;
  capabilities?: PerformanceWorkspaceCapabilities | null;
}) {
  const analysisCapability = getAnalysisCapability(capabilities ?? undefined);
  const evidenceCapability = capabilities?.evidence ?? null;
  const modeOptions = WORKSPACE_MODES.map((mode) => {
    if (mode.key === "analysis" && analysisCapability) {
      return {
        ...mode,
        disabled: !isModeUsable(analysisCapability),
        title: !isModeUsable(analysisCapability) ? analysisCapability.reason : undefined,
      };
    }
    if (mode.key === "evidence" && evidenceCapability) {
      return {
        ...mode,
        disabled: !isModeUsable(evidenceCapability),
        title: !isModeUsable(evidenceCapability) ? evidenceCapability.reason : undefined,
      };
    }
    return mode;
  });
  const modeStatusItems = [
    analysisCapability
      ? {
          value:
            analysisCapability.state === "supported"
              ? "Analysis ready"
              : analysisCapability.state === "partial"
                ? "Analysis partial"
                : "Analysis unavailable",
          tone:
            analysisCapability.state === "supported"
              ? ("default" as const)
              : analysisCapability.state === "partial"
                ? ("warn" as const)
                : ("danger" as const),
        }
      : null,
    evidenceCapability
      ? {
          value:
            evidenceCapability.state === "supported"
              ? "Evidence ready"
              : evidenceCapability.state === "partial"
                ? "Evidence partial"
                : "Evidence unavailable",
          tone:
            evidenceCapability.state === "supported"
              ? ("default" as const)
              : evidenceCapability.state === "partial"
                ? ("warn" as const)
                : ("danger" as const),
        }
      : null,
  ].filter(Boolean) as Array<{ value: string; tone: "default" | "warn" | "danger" }>;

  return (
    <div className="performance-workspace-mode-switch-group">
      <WorkbenchSegmentedControl
        value={value}
        onChange={onChange}
        options={modeOptions}
        ariaLabel="Performance workspace mode"
        className="performance-workspace-mode-switch"
      />
      {modeStatusItems.length ? (
        <WorkbenchStatusRow
          label="Performance mode readiness"
          items={modeStatusItems}
          className="performance-workspace-mode-status"
        />
      ) : null}
    </div>
  );
}
