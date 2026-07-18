"use client";

import type { PlatformShellWorkspaceDescriptor } from "@/features/platform-capabilities/types";

type WorkspaceAvailabilityPosture =
  | "availability_unconfirmed"
  | "not_enabled"
  | "required_information_unavailable"
  | "review_required";

const WORKSPACE_AVAILABILITY_POSTURE_BY_REASON = {
  advisory_disabled: "not_enabled",
  advisory_disabled_in_fallback: "availability_unconfirmed",
  advisory_ready: "availability_unconfirmed",
  dependency_degraded: "required_information_unavailable",
  lifecycle_disabled: "not_enabled",
  lotus_advise_unavailable: "required_information_unavailable",
  lotus_advise_unknown: "availability_unconfirmed",
  lotus_core_unavailable: "required_information_unavailable",
  lotus_core_unknown: "availability_unconfirmed",
  lotus_performance_unavailable: "required_information_unavailable",
  lotus_performance_unknown: "availability_unconfirmed",
  lotus_risk_unavailable: "required_information_unavailable",
  lotus_risk_unknown: "availability_unconfirmed",
  performance_disabled: "not_enabled",
  performance_disabled_in_fallback: "availability_unconfirmed",
  policy_review_required: "review_required",
  portfolio_disabled: "not_enabled",
  portfolio_disabled_in_fallback: "availability_unconfirmed",
  proposal_disabled: "not_enabled",
  proposal_disabled_in_fallback: "availability_unconfirmed",
  risk_disabled: "not_enabled",
  risk_disabled_in_fallback: "availability_unconfirmed",
} as const satisfies Record<string, WorkspaceAvailabilityPosture>;

export function getWorkspaceDisabledTitle(
  workspace: PlatformShellWorkspaceDescriptor
): string {
  const sourceReason = workspace.supportability.reasons[0];
  const posture = sourceReason
    ? WORKSPACE_AVAILABILITY_POSTURE_BY_REASON[
        sourceReason as keyof typeof WORKSPACE_AVAILABILITY_POSTURE_BY_REASON
      ] ?? "availability_unconfirmed"
    : "availability_unconfirmed";

  return workspaceAvailabilityTitle(workspace.label, posture);
}

function workspaceAvailabilityTitle(
  workspaceLabel: string,
  posture: WorkspaceAvailabilityPosture
): string {
  switch (posture) {
    case "not_enabled":
      return `${workspaceLabel} is not enabled for the current operating configuration.`;
    case "required_information_unavailable":
      return `${workspaceLabel} is temporarily unavailable because required information could not be retrieved.`;
    case "review_required":
      return `${workspaceLabel} is unavailable until the required business review is complete.`;
    case "availability_unconfirmed":
      return `${workspaceLabel} availability could not be confirmed.`;
  }
}
