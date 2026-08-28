export type ProposalMemoActionCopyKey =
  | "create"
  | "review"
  | "report"
  | "commentary";

export const PROPOSAL_MEMO_ACTION_FAILURE_COPY: Readonly<
  Record<ProposalMemoActionCopyKey, string>
> = Object.freeze({
  create:
    "The advisor memo was not prepared. Recheck the advisor reference and try again.",
  review:
    "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
  report:
    "Discussion material was not requested. Confirm the advisor review and try again.",
  commentary:
    "Advisor commentary was not requested. Confirm the advisor review and try again.",
});

const CURRENT_VERSION_REFRESH_FAILURE_COPY: Readonly<
  Record<ProposalMemoActionCopyKey, string>
> = Object.freeze({
  create:
    "The memo request completed, but the current evidence record could not confirm it. Refresh before taking another action.",
  review:
    "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
  report:
    "The material request was submitted, but the current memo record could not confirm it. Refresh before retrying.",
  commentary:
    "The commentary request was submitted, but the current memo record could not confirm it. Refresh before retrying.",
});

const ACTION_SUBJECT: Readonly<Record<ProposalMemoActionCopyKey, string>> =
  Object.freeze({
    create: "Memo preparation",
    review: "Advisor review",
    report: "Discussion material",
    commentary: "Advisor commentary",
  });

export function proposalMemoRefreshFailureCopy({
  action,
  currentVersionNo,
  historicalEvidenceUnavailable,
  versionNo,
}: {
  action: ProposalMemoActionCopyKey;
  currentVersionNo: number | null;
  historicalEvidenceUnavailable: boolean;
  versionNo: number;
}): string {
  if (currentVersionNo !== null && versionNo > currentVersionNo) {
    return `${ACTION_SUBJECT[action]} is recorded for proposal version ${versionNo}, but the active proposal record reports version ${currentVersionNo}. Refresh the proposal record before taking another action.`;
  }
  if (currentVersionNo === null || versionNo === currentVersionNo) {
    return CURRENT_VERSION_REFRESH_FAILURE_COPY[action];
  }
  const sourcePosture = historicalEvidenceUnavailable
    ? "retained evidence for that version is unavailable"
    : "its retained evidence has not yet confirmed the action";
  return `${ACTION_SUBJECT[action]} for proposal version ${versionNo} was recorded, but ${sourcePosture}. Recheck this earlier record before relying on it, and use the current source posture to determine the next available action.`;
}

export function proposalMemoActionSuccessCopy(
  action: ProposalMemoActionCopyKey,
  versionNo: number,
): string {
  const subject: Record<ProposalMemoActionCopyKey, string> = {
    create: "Advisor memo",
    review: "Advisor review",
    report: "Discussion material",
    commentary: "Advisor commentary",
  };
  return `${subject[action]} confirmed for proposal version ${versionNo}.`;
}

export function proposalMemoPendingActionCopy(
  action: ProposalMemoActionCopyKey,
  versionNo: number,
): string {
  return `${ACTION_SUBJECT[action]} for proposal version ${versionNo} is still being recorded. Wait for the confirmed outcome before taking another proposal action.`;
}
