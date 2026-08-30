import { isValidReviewContextRecordId } from "@/shell/review-context";

import { isValidProposalSourceCursor } from "./proposal-source-window-navigation";
import type { ProposalListData } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isProposalSummary(value: unknown): value is ProposalListData["items"][number] {
  if (!isRecord(value)) return false;

  return (
    isValidReviewContextRecordId(value.proposal_id)
    && typeof value.current_state === "string"
    && value.current_state.length > 0
    && isOptionalString(value.portfolio_id)
    && (value.current_version_no === undefined || Number.isFinite(value.current_version_no))
    && (value.title === undefined || value.title === null || typeof value.title === "string")
    && isOptionalString(value.created_by)
    && isOptionalString(value.created_at)
  );
}

export function parseProposalListEnvelope(value: unknown): ProposalListData {
  if (
    !isRecord(value)
    || typeof value.correlation_id !== "string"
    || value.correlation_id.length === 0
    || typeof value.contract_version !== "string"
    || value.contract_version.length === 0
    || !isRecord(value.data)
    || !Array.isArray(value.data.items)
    || !value.data.items.every(isProposalSummary)
    || !(
      value.data.next_cursor === undefined
      || value.data.next_cursor === null
      || isValidProposalSourceCursor(value.data.next_cursor)
    )
  ) {
    throw new Error("Proposal list response was incomplete.");
  }

  return {
    items: value.data.items,
    next_cursor: value.data.next_cursor,
  };
}
