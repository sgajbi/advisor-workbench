import { getWorkbenchApiErrorStatus } from "@/features/workbench/api-client";

export type ProposalActionFailureContext =
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

const UNAVAILABLE_COPY: Record<ProposalActionFailureContext, string> = {
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
