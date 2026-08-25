import { formatBusinessReason } from "@/copy/business-state-copy";

import type { PmOperatingQualityPanelState } from "@/features/workbench/pm-operating-quality-view-model";

export type PmOperatingQualityStatePanelCopy = {
  kind: "empty" | "partial" | "permission_blocked" | "unavailable";
  title: string;
  body: string;
};

export function pmOperatingQualityStatePanelCopy(
  state: PmOperatingQualityPanelState
): PmOperatingQualityStatePanelCopy {
  if (state === "empty") {
    return {
      kind: "empty",
      title: "No PM operating quality evidence returned",
      body: "No policy or score-run evidence is currently available for this PM book.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial",
      title: "PM operating quality evidence is partial",
      body: "Some policy or score-run inputs require review before a persisted score run is used.",
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked",
      title: "PM operating quality action is blocked",
      body: "Manage has published blocked actions for this PM operating quality posture.",
    };
  }
  return {
    kind: "unavailable",
    title: "PM operating quality is unavailable",
    body: "PM operating quality evidence could not be loaded from Gateway.",
  };
}

export function formatPmQualityReasonCodeList(value: string): string {
  if (!value || value === "N/A" || value === "-") {
    return value || "N/A";
  }
  return value
    .split(",")
    .map((reason) => reason.trim())
    .filter(Boolean)
    .map((reason) => `${formatBusinessReason(reason)} (${reason})`)
    .join(", ");
}
