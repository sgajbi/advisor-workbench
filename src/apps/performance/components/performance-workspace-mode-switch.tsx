"use client";
import { ModeTabs, WorkbenchStatusRow } from "@/design-system";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import {
  isPartialCapability,
  isSupportedCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";
import { formatDate } from "../formatters";
export type PerformanceWorkspaceMode =
  | "summary"
  | "analysis"
  | "advisor"
  | "evidence";

const WORKSPACE_MODES: Array<{ key: PerformanceWorkspaceMode; label: string }> = [
  { key: "summary", label: "Summary" },
  { key: "analysis", label: "Analysis" },
  { key: "advisor", label: "Advisor Brief" },
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

function getAnalysisReadiness(capabilities?: PerformanceWorkspaceCapabilities | null): {
  value: string;
  tone: "default" | "warn" | "danger";
} | null {
  const analysisCapability = getAnalysisCapability(capabilities ?? undefined);
  if (!analysisCapability || !capabilities) {
    return null;
  }

  if (!isModeUsable(analysisCapability)) {
    return { value: "Analysis unavailable", tone: "danger" };
  }

  if (
    capabilities.contributionDetail.state === "partial" &&
    capabilities.contributionDetail.fallbackAvailable
  ) {
    return { value: "Analysis partial • aggregate fallback", tone: "warn" };
  }
  if (capabilities.attributionDetail.state === "unavailable") {
    return { value: "Analysis partial • no attribution", tone: "warn" };
  }
  if (
    capabilities.returnPath.state === "partial" &&
    capabilities.returnPath.latestAvailableDate
  ) {
    return {
      value: `Analysis partial • history through ${formatDate(capabilities.returnPath.latestAvailableDate)}`,
      tone: "warn",
    };
  }
  if (analysisCapability.state === "partial") {
    return { value: "Analysis partial", tone: "warn" };
  }

  return { value: "Analysis ready", tone: "default" };
}

function getEvidenceReadinessLabel(capability: WorkspaceCapability) {
  if (capability.state === "supported") {
    return "Evidence ready";
  }
  if (capability.state === "partial") {
    return "Evidence partial";
  }
  return capability.reason?.includes("not exposed by the current gateway contract")
    ? "Evidence pending contract"
    : "Evidence unavailable";
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
  const analysisReadiness = getAnalysisReadiness(capabilities);
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
    analysisReadiness && analysisReadiness.tone !== "default"
      ? {
          value: analysisReadiness.value,
          tone: analysisReadiness.tone,
        }
      : null,
    evidenceCapability?.state === "partial"
      ? {
          value: getEvidenceReadinessLabel(evidenceCapability),
          tone: "warn" as const,
        }
      : null,
  ].filter(Boolean) as Array<{ value: string; tone: "default" | "warn" | "danger" }>;

  return (
    <div
      className={[
        "performance-workspace-mode-switch-group",
        value === "advisor" ? "performance-workspace-mode-switch-group-advisor-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ModeTabs
        value={value}
        onChange={onChange}
        options={modeOptions}
        ariaLabel="Performance workspace mode"
        className="performance-workspace-mode-switch"
        accentModeKey={"advisor"}
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
