import {
  getWorkbenchApiErrorEvidence,
  getWorkbenchApiErrorStatus,
} from "@/features/workbench/api-client";

export type ProposalActionFailureContext =
  | "advance_proposal"
  | "create_version"
  | "evaluate_draft"
  | "load_version"
  | "save_draft";

export class ProposalActionBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalActionBusinessError";
  }
}

export type ProposalActionSupportEvidence = Readonly<{
  requestReference: string | null;
  status: string;
}>;

const UNAVAILABLE_COPY: Record<ProposalActionFailureContext, string> = {
  advance_proposal:
    "The proposal action could not be completed. Review the current posture and try again.",
  create_version:
    "The next proposal version could not be created. Refresh current proposal evidence and try again.",
  evaluate_draft:
    "The proposal could not be evaluated from the current source evidence. Confirm portfolio holdings and try again.",
  load_version:
    "The requested proposal version could not be loaded. Check the version number and try again.",
  save_draft:
    "The advisor draft could not be retained. Confirm current source evidence and try again.",
};

export function proposalActionFailureCopy(
  error: unknown,
  context: ProposalActionFailureContext,
): string {
  if (error instanceof ProposalActionBusinessError) {
    return error.message;
  }
  const status = getWorkbenchApiErrorStatus(error);
  if (status === 401 || status === 403) {
    return "This proposal action is not available for your current access. No proposal change was recorded.";
  }
  if (status === 404) {
    return context === "load_version"
      ? "That proposal version is not available in the current history."
      : "The proposal workspace is no longer available. Return to the proposal worklist and reopen it.";
  }
  if (status === 409) {
    return "The source proposal changed before this action completed. Refresh current evidence before trying again.";
  }
  return UNAVAILABLE_COPY[context];
}

export function proposalActionFailureSupportEvidence(
  error: unknown,
): ProposalActionSupportEvidence | null {
  const evidence = getWorkbenchApiErrorEvidence(error);
  if (!evidence) {
    return null;
  }
  return {
    requestReference: evidence.requestReference ?? null,
    status: evidence.value,
  };
}
