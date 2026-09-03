import {
  buildPmQualityActionError,
  type PmQualityActionError,
} from "@/features/workbench/pm-operating-quality-actions";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "@/features/workbench/types";
import type { DpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";

/**
 * The command-lifecycle vocabulary for PM operating-quality actions (#989): what a
 * command submission carries, what a persisted command returns, and how a mutation's
 * settled state speaks on the one feedback surface. Everything here is read from
 * TanStack mutation state -- nothing is mirrored into browser-owned result slots.
 */

// A command refused before it reaches Gateway (source-owned readiness, missing preview)
// still travels through its mutation, so pending/error posture stays derived from Query
// state rather than living in a parallel error slot.
export class PmQualityCommandError extends Error {
  readonly actionError: PmQualityActionError;

  constructor(actionError: PmQualityActionError) {
    super(actionError.body);
    this.actionError = actionError;
  }
}

export function toActionError(error: unknown, fallback: string): PmQualityActionError {
  return error instanceof PmQualityCommandError
    ? error.actionError
    : buildPmQualityActionError(error, fallback);
}

// Every command captures the selection epoch it was submitted under. The epoch moves
// only on supervisor-driven selection changes, so posture from a superseded selection
// is fenced out at render time instead of being cleared by hand in eleven places.
export type PmQualityCommandVariables = {
  epoch: number;
  previewKey?: string;
  scoreRunId?: string;
};

export type PmQualitySummaryResult = {
  scoreRunId: string;
  response: DpmPmOperatingQualitySummaryResponse | null;
  outcome: DpmAiWorkflowOutcome | null;
};

export type PmQualityCommandPosture = {
  status: string;
  error: unknown;
  submittedAt: number;
  inEpoch: boolean;
  successMessage: string;
  failureLabel: string;
};

// What each settled command says on the feedback surface. The copy lives with the
// lifecycle so a command and its wording cannot drift apart across call sites.
export const PM_QUALITY_COMMAND_COPY = {
  scoreRunPreview: {
    success: "Preview returned Manage operating-quality evidence.",
    failure: "PM operating quality preview failed",
  },
  fairnessPreview: {
    success: "Fairness preview returned Manage segment evidence.",
    failure: "PM operating quality fairness preview failed",
  },
  fairnessCreate: {
    success: "Persisted fairness analysis returned Manage evidence.",
    failure: "PM operating quality fairness analysis persistence failed",
  },
  supportSummary: {
    success: "",
    failure: "PM operating quality support summary request failed",
  },
  reviewActionPreview: {
    success: "Review-action preview returned Manage supervisory evidence.",
    failure: "PM operating quality review-action preview failed",
  },
  reviewActionCreate: {
    success: "Recorded Manage-owned supervisory review action.",
    failure: "PM operating quality review-action create failed",
  },
  summaryInvocationPreview: {
    success: "Summary-invocation preview returned Manage evidence.",
    failure: "PM operating quality summary-invocation preview failed",
  },
  summaryInvocationCreate: {
    success: "Recorded Manage-owned PM quality summary invocation.",
    failure: "PM operating quality summary-invocation create failed",
  },
} as const;

export function commandPosture(
  mutation: { status: string; error: unknown; submittedAt: number },
  copy: { success: string; failure: string },
  inEpoch: boolean,
): PmQualityCommandPosture {
  return {
    status: mutation.status,
    error: mutation.error,
    submittedAt: mutation.submittedAt,
    inEpoch,
    successMessage: copy.success,
    failureLabel: copy.failure,
  };
}

// One feedback surface: the most recently submitted command that still belongs to the
// current selection epoch speaks; everything older is fenced out.
export function resolveCommandFeedback(commands: PmQualityCommandPosture[]): {
  actionMessage: string | null;
  commandError: PmQualityActionError | null;
} {
  const latest = commands
    .filter((command) => command.status !== "idle" && command.inEpoch)
    .sort((left, right) => left.submittedAt - right.submittedAt)
    .at(-1);
  return {
    actionMessage:
      latest?.status === "success" && latest.successMessage ? latest.successMessage : null,
    commandError:
      latest?.status === "error" ? toActionError(latest.error, latest.failureLabel) : null,
  };
}

export type PmQualityPersistedRecordResult = {
  response: DpmPmOperatingQualityGatewayResponse;
  detail: DpmPmOperatingQualityGatewayResponse | null;
};
