import type { PortfolioBookResponse } from "@/apps/portfolio/api";
import type { PortfolioPositionView } from "@/apps/portfolio/types";
import { isBusinessDateValue } from "@/design-system/utils/financial-formatters";
import {
  projectQuerySourcePosture,
  type QuerySourcePosture,
} from "@/features/platform-runtime/query-source-posture";

export type ProposalPortfolioEvidenceStatus =
  | "not_selected"
  | "checking"
  | "refreshing"
  | "ready"
  | "partial"
  | "context_mismatch"
  | "unavailable"
  | "refresh_failed";

export type ProposalPositionsEvidenceStatus =
  | "loading"
  | "ready"
  | "empty"
  | "partial"
  | "refreshing"
  | "cached"
  | "context_mismatch"
  | "unavailable";

export type ProposalCashAuthority = "portfolio_book" | "manual_scenario";

export type ProposalEvidenceDateIssue =
  | "invalid_requested_date"
  | "invalid_source_date";

type QueryEvidence<TData> = {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

type ProposalBookEvidence = Partial<
  Pick<PortfolioBookResponse, "as_of_date" | "portfolio" | "summary" | "positions">
>;

export type ProposalPortfolioEvidenceModel = {
  status: ProposalPortfolioEvidenceStatus;
  canEvaluateAndHandoff: boolean;
  title: string;
  body: string;
  hint: string | null;
  context: {
    requestedAsOfDate: string;
    effectiveAsOfDate: string | null;
    dateIssue: ProposalEvidenceDateIssue | null;
    requestedCurrency: string;
    effectiveCurrency: string | null;
  };
  positions: {
    status: ProposalPositionsEvidenceStatus;
    items: PortfolioPositionView[];
  };
  cash: {
    amount: number | null;
    authority: ProposalCashAuthority;
    label: string;
  };
};

export function buildProposalPortfolioEvidence({
  portfolioId,
  asOfDate,
  reportingCurrency,
  bookQuery,
  manualCashAmount,
}: {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  bookQuery: QueryEvidence<ProposalBookEvidence>;
  manualCashAmount: number | null;
}): ProposalPortfolioEvidenceModel {
  const normalizedPortfolioId = portfolioId.trim();
  const normalizedAsOfDate = asOfDate.trim();
  const normalizedCurrency = reportingCurrency.trim().toUpperCase();
  const hasValidRequestedDate = isBusinessDateValue(normalizedAsOfDate);
  const hasSelectedContext =
    normalizedPortfolioId.length > 0 &&
    hasValidRequestedDate &&
    /^[A-Z]{3}$/.test(normalizedCurrency);
  const bookPositions = Array.isArray(bookQuery.data?.positions)
    ? bookQuery.data.positions
    : null;
  const sourceCash = finiteNumberOrNull(bookQuery.data?.summary?.cash_market_value_base);
  const effectiveAsOfDate = nonEmptyStringOrNull(bookQuery.data?.as_of_date);
  const hasValidEffectiveDate = isBusinessDateValue(effectiveAsOfDate);
  const dateIssue = resolveDateIssue({
    requestedAsOfDate: normalizedAsOfDate,
    hasValidRequestedDate,
    effectiveAsOfDate,
    hasValidEffectiveDate,
  });
  const effectivePortfolioId = nonEmptyStringOrNull(bookQuery.data?.portfolio?.portfolio_id);
  const effectiveCurrency = currencyCodeOrNull(bookQuery.data?.portfolio?.base_currency);
  const hasCompleteBook =
    bookPositions !== null &&
    sourceCash !== null &&
    hasValidEffectiveDate &&
    effectivePortfolioId !== null &&
    effectiveCurrency !== null;
  const hasVisibleBookEvidence = bookPositions !== null || sourceCash !== null;
  const sourcePosture = projectQuerySourcePosture({
    hasData: hasVisibleBookEvidence,
    isLoading: hasSelectedContext && bookQuery.isLoading,
    isFetching: hasSelectedContext && bookQuery.isFetching,
    hasError: Boolean(bookQuery.error),
  });
  const matchesSelectedContext =
    hasCompleteBook &&
    effectivePortfolioId === normalizedPortfolioId &&
    effectiveAsOfDate === normalizedAsOfDate &&
    effectiveCurrency === normalizedCurrency;
  const status = resolveEvidenceStatus({
    hasSelectedContext,
    hasCompleteBook,
    hasVisibleBookEvidence,
    matchesSelectedContext,
    dateIssue,
    sourcePosture,
  });
  const positions = bookPositions ?? [];
  const tradablePositions = positions.filter((position) => !isCashPosition(position));

  return {
    status,
    canEvaluateAndHandoff: status === "ready",
    ...evidenceCopy(status, dateIssue),
    context: {
      requestedAsOfDate: normalizedAsOfDate,
      effectiveAsOfDate,
      dateIssue,
      requestedCurrency: normalizedCurrency,
      effectiveCurrency,
    },
    positions: {
      status: resolvePositionsStatus({
        hasSelectedContext,
        hasBookData: bookPositions !== null,
        hasContextMismatch: hasCompleteBook && !matchesSelectedContext,
        hasIncompleteEvidence: status === "partial",
        hasInvalidDate: dateIssue !== null,
        positionCount: tradablePositions.length,
        posture: sourcePosture,
      }),
      items: tradablePositions,
    },
    cash:
      sourceCash === null
        ? {
            amount: finiteNumberOrNull(manualCashAmount),
            authority: "manual_scenario",
            label:
              manualCashAmount === null
                ? "Additional cash assumption needs correction"
                : "Additional cash assumption",
          }
        : {
            amount: sourceCash,
            authority: "portfolio_book",
            label:
              status === "ready"
                ? "Portfolio book cash confirmed"
                : "Portfolio book cash loaded",
          },
  };
}

function resolveEvidenceStatus({
  hasSelectedContext,
  hasCompleteBook,
  hasVisibleBookEvidence,
  matchesSelectedContext,
  dateIssue,
  sourcePosture,
}: {
  hasSelectedContext: boolean;
  hasCompleteBook: boolean;
  hasVisibleBookEvidence: boolean;
  matchesSelectedContext: boolean;
  dateIssue: ProposalEvidenceDateIssue | null;
  sourcePosture: QuerySourcePosture;
}): ProposalPortfolioEvidenceStatus {
  if (dateIssue) {
    return "unavailable";
  }
  if (sourcePosture.isUnavailable) {
    return "unavailable";
  }
  if (!hasSelectedContext) {
    return "not_selected";
  }

  if (hasVisibleBookEvidence && sourcePosture.hasRefreshFailure) {
    return "refresh_failed";
  }
  if (sourcePosture.isInitialLoading) {
    return "checking";
  }
  if (sourcePosture.isRefreshing) {
    return hasVisibleBookEvidence ? "refreshing" : "checking";
  }
  if (hasCompleteBook) {
    return matchesSelectedContext ? "ready" : "context_mismatch";
  }
  if (hasVisibleBookEvidence) {
    return "partial";
  }
  return "unavailable";
}

function resolvePositionsStatus({
  hasSelectedContext,
  hasBookData,
  hasContextMismatch,
  hasIncompleteEvidence,
  hasInvalidDate,
  positionCount,
  posture,
}: {
  hasSelectedContext: boolean;
  hasBookData: boolean;
  hasContextMismatch: boolean;
  hasIncompleteEvidence: boolean;
  hasInvalidDate: boolean;
  positionCount: number;
  posture: QuerySourcePosture;
}): ProposalPositionsEvidenceStatus {
  if (hasInvalidDate) {
    return "unavailable";
  }
  if (posture.isUnavailable) {
    return "unavailable";
  }
  if (!hasSelectedContext || (!hasBookData && posture.isInitialLoading)) {
    return "loading";
  }
  if (!hasBookData) {
    return "unavailable";
  }
  if (hasContextMismatch) {
    return "context_mismatch";
  }
  if (posture.hasRefreshFailure) {
    return "cached";
  }
  if (posture.isRefreshing) {
    return "refreshing";
  }
  if (hasIncompleteEvidence) {
    return "partial";
  }
  return positionCount > 0 ? "ready" : "empty";
}

function evidenceCopy(
  status: ProposalPortfolioEvidenceStatus,
  dateIssue: ProposalEvidenceDateIssue | null,
): {
  title: string;
  body: string;
  hint: string | null;
} {
  switch (status) {
    case "not_selected":
      return {
        title: "Complete the portfolio context",
        body: "Choose the portfolio, advisory date, and three-letter currency before reviewing its evidence.",
        hint: "Evaluation and draft handoff remain unavailable until the selected context is complete.",
      };
    case "checking":
      return {
        title: "Confirming portfolio evidence",
        body: "Holdings and cash are being retrieved for the selected advisory date.",
        hint: "Proposal evaluation will become available after the combined portfolio book responds.",
      };
    case "refreshing":
      return {
        title: "Refreshing portfolio evidence",
        body: "The previously loaded snapshot remains visible while its combined portfolio book refreshes.",
        hint: "Evaluation is paused until the refresh confirms the selected context.",
      };
    case "ready":
      return {
        title: "Portfolio evidence confirmed",
        body: "Positions and cash match the selected portfolio, advisory date, and currency.",
        hint: null,
      };
    case "partial":
      return {
        title: "Portfolio evidence is incomplete",
        body: "Available positions or cash remain visible, but the combined portfolio snapshot is incomplete.",
        hint: "Refresh the portfolio evidence before evaluating or saving an advisor draft.",
      };
    case "context_mismatch":
      return {
        title: "Portfolio context does not match",
        body: "The source snapshot does not match the selected portfolio, advisory date, or currency.",
        hint: "Refresh the portfolio evidence or restore the matching proposal context before continuing.",
      };
    case "refresh_failed":
      return {
        title: "Latest portfolio evidence is not confirmed",
        body: "The previously loaded snapshot remains visible, but its latest source refresh did not complete.",
        hint: "Refresh again before relying on this draft for an advisory decision.",
      };
    case "unavailable":
      if (dateIssue === "invalid_requested_date") {
        return {
          title: "Advisory date needs correction",
          body: "The advisory date carried into this proposal is not a valid calendar date.",
          hint: "Return to the portfolio review and select a valid advisory date before evaluating or saving this draft.",
        };
      }
      if (dateIssue === "invalid_source_date") {
        return {
          title: "Portfolio evidence date is unavailable",
          body: "The portfolio source returned an advisory date that is not a valid calendar date.",
          hint: "Evaluation and draft handoff remain unavailable until the portfolio source provides a valid date.",
        };
      }
      return {
        title: "Portfolio evidence is unavailable",
        body: "The combined holdings and cash snapshot could not be loaded from the approved portfolio source.",
        hint: "No empty-book or manual-cash fallback is used to authorize evaluation. Refresh after the source recovers.",
      };
  }
}

function resolveDateIssue({
  requestedAsOfDate,
  hasValidRequestedDate,
  effectiveAsOfDate,
  hasValidEffectiveDate,
}: {
  requestedAsOfDate: string;
  hasValidRequestedDate: boolean;
  effectiveAsOfDate: string | null;
  hasValidEffectiveDate: boolean;
}): ProposalEvidenceDateIssue | null {
  if (requestedAsOfDate && !hasValidRequestedDate) {
    return "invalid_requested_date";
  }
  if (effectiveAsOfDate && !hasValidEffectiveDate) {
    return "invalid_source_date";
  }
  return null;
}

function isCashPosition(position: PortfolioPositionView): boolean {
  const assetClass = position.asset_class?.trim().toLowerCase();
  return assetClass === "cash" || position.security_id.toUpperCase().startsWith("CASH_");
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonEmptyStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function currencyCodeOrNull(value: unknown): string | null {
  const currency = nonEmptyStringOrNull(value)?.toUpperCase() ?? null;
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}
