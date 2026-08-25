export const ADVISORY_OVERVIEW_COPY = Object.freeze({
  heading: "Adviser priorities",
  subtitle:
    "Prioritise open proposals, review the next permitted action, and continue the advisory workflow.",
  decisionEyebrow: "Adviser decision",
  worklistEyebrow: "Adviser worklist",
  buildDraftAction: "Build adviser-use draft",
  refreshingDetail:
    "The current worklist remains available while proposal priorities are updated.",
  refreshConfirmedLabel: "Update complete",
  refreshConfirmedDetail: "Proposal priorities were updated.",
  emptyDetail:
    "Review available investment ideas or build a proposal when a client objective is ready.",
  selectedProposalDetail:
    "Open the proposal record to review evidence, approvals and its complete history.",
});

export type AdvisoryOverviewLoadingState = "initial" | "retrying";

export function advisoryOverviewLoadingCopy(
  state: AdvisoryOverviewLoadingState,
) {
  return state === "retrying"
    ? {
        title: "Checking advisory priorities",
        body: "Checking for updated proposal priorities for this portfolio.",
      }
    : {
        title: "Loading advisory priorities",
        body: "Loading proposal priorities and current actions for this portfolio.",
      };
}

export function advisoryOverviewUnavailableCopy({
  hasPreviousWindow,
  retryFailed,
}: {
  hasPreviousWindow: boolean;
  retryFailed: boolean;
}) {
  if (hasPreviousWindow) {
    return {
      title: "This proposal window is unavailable",
      body: "The next group of proposals could not be loaded.",
      hint: "Retry this proposal window, or return to the previously loaded proposals.",
    };
  }

  return {
    title: retryFailed
      ? "Advisory priorities remain unavailable"
      : "Advisory priorities are unavailable",
    body: "The proposal worklist could not be loaded.",
    hint:
      "Retry when proposal information is available. No substitute proposal, review, or implementation status is shown.",
  };
}

export const ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY = Object.freeze({
  title: "Proposal priorities could not be updated",
  body:
    "Previously loaded proposals remain available, but the latest update did not complete.",
  hint:
    "Retry before relying on this worklist for a client discussion or implementation decision.",
});
