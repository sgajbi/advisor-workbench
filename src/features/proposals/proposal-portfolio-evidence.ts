import type { PortfolioBookResponse } from "@/apps/portfolio/api";
import type { PortfolioPositionView } from "@/apps/portfolio/types";
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
  | "refreshing"
  | "cached"
  | "context_mismatch"
  | "unavailable";

export type ProposalCashAuthority = "portfolio_book" | "manual_scenario";

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
    requestedCurrency: string;
    effectiveCurrency: string | null;
  };
  positions: {
    status: ProposalPositionsEvidenceStatus;
    items: PortfolioPositionView[];
  };
  cash: {
    amount: number;
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
  manualCashAmount: number;
}): ProposalPortfolioEvidenceModel {
  const normalizedPortfolioId = portfolioId.trim();
  const normalizedAsOfDate = asOfDate.trim();
  const normalizedCurrency = reportingCurrency.trim().toUpperCase();
  const hasSelectedContext =
    normalizedPortfolioId.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(normalizedAsOfDate) &&
    /^[A-Z]{3}$/.test(normalizedCurrency);
  const bookPositions = Array.isArray(bookQuery.data?.positions)
    ? bookQuery.data.positions
    : null;
  const sourceCash = finiteNumberOrNull(bookQuery.data?.summary?.cash_market_value_base);
  const effectiveAsOfDate = nonEmptyStringOrNull(bookQuery.data?.as_of_date);
  const effectivePortfolioId = nonEmptyStringOrNull(bookQuery.data?.portfolio?.portfolio_id);
  const effectiveCurrency = upperCaseStringOrNull(bookQuery.data?.portfolio?.base_currency);
  const hasCompleteBook =
    bookPositions !== null &&
    sourceCash !== null &&
    effectiveAsOfDate !== null &&
    effectivePortfolioId !== null &&
    effectiveCurrency !== null;
  const hasVisibleBookEvidence = bookPositions !== null || sourceCash !== null;
  const hasContractFailure = bookQuery.data !== undefined && !hasCompleteBook;
  const sourcePosture = projectQuerySourcePosture({
    hasData: hasCompleteBook,
    isLoading: hasSelectedContext && bookQuery.isLoading,
    isFetching: hasSelectedContext && bookQuery.isFetching,
    hasError: Boolean(bookQuery.error) || hasContractFailure,
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
    sourcePosture,
  });
  const positions = bookPositions ?? [];
  const tradablePositions = positions.filter((position) => !isCashPosition(position));

  return {
    status,
    canEvaluateAndHandoff: status === "ready",
    ...evidenceCopy(status),
    context: {
      requestedAsOfDate: normalizedAsOfDate,
      effectiveAsOfDate,
      requestedCurrency: normalizedCurrency,
      effectiveCurrency,
    },
    positions: {
      status: resolvePositionsStatus({
        hasSelectedContext,
        hasBookData: bookPositions !== null,
        hasContextMismatch: hasCompleteBook && !matchesSelectedContext,
        positionCount: tradablePositions.length,
        posture: sourcePosture,
      }),
      items: tradablePositions,
    },
    cash:
      sourceCash === null
        ? {
            amount: finiteNumberOrFallback(manualCashAmount, 0),
            authority: "manual_scenario",
            label: "Manual scenario cash",
          }
        : {
            amount: sourceCash,
            authority: "portfolio_book",
            label: "Portfolio book cash confirmed",
          },
  };
}

function resolveEvidenceStatus({
  hasSelectedContext,
  hasCompleteBook,
  hasVisibleBookEvidence,
  matchesSelectedContext,
  sourcePosture,
}: {
  hasSelectedContext: boolean;
  hasCompleteBook: boolean;
  hasVisibleBookEvidence: boolean;
  matchesSelectedContext: boolean;
  sourcePosture: QuerySourcePosture;
}): ProposalPortfolioEvidenceStatus {
  if (!hasSelectedContext) {
    return "not_selected";
  }

  if (hasCompleteBook && !matchesSelectedContext) {
    return "context_mismatch";
  }

  if (hasCompleteBook) {
    if (sourcePosture.hasRefreshFailure) {
      return "refresh_failed";
    }
    if (sourcePosture.isInitialLoading) {
      return "checking";
    }
    if (sourcePosture.isRefreshing) {
      return "refreshing";
    }
    return "ready";
  }

  if (hasVisibleBookEvidence) {
    return sourcePosture.isInitialLoading ? "checking" : "partial";
  }

  if (sourcePosture.isInitialLoading || sourcePosture.isRefreshing) {
    return "checking";
  }
  return "unavailable";
}

function resolvePositionsStatus({
  hasSelectedContext,
  hasBookData,
  hasContextMismatch,
  positionCount,
  posture,
}: {
  hasSelectedContext: boolean;
  hasBookData: boolean;
  hasContextMismatch: boolean;
  positionCount: number;
  posture: QuerySourcePosture;
}): ProposalPositionsEvidenceStatus {
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
  return positionCount > 0 ? "ready" : "empty";
}

function evidenceCopy(status: ProposalPortfolioEvidenceStatus): {
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
        body: "The previously confirmed snapshot remains visible while its combined portfolio book refreshes.",
        hint: "Evaluation is paused until the refresh confirms the selected context.",
      };
    case "ready":
      return {
        title: "Portfolio evidence confirmed",
        body: "Holdings and cash match the selected portfolio, advisory date, and currency.",
        hint: null,
      };
    case "partial":
      return {
        title: "Portfolio evidence is incomplete",
        body: "Available holdings or cash remain visible, but the combined portfolio snapshot is incomplete.",
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
        body: "The previously confirmed snapshot remains visible, but its latest source refresh did not complete.",
        hint: "Refresh again before relying on this draft for an advisory decision.",
      };
    case "unavailable":
      return {
        title: "Portfolio evidence is unavailable",
        body: "The combined holdings and cash snapshot could not be loaded from the approved portfolio source.",
        hint: "No empty-book or manual-cash fallback is used to authorize evaluation. Refresh after the source recovers.",
      };
  }
}

function isCashPosition(position: PortfolioPositionView): boolean {
  const assetClass = position.asset_class?.trim().toLowerCase();
  return assetClass === "cash" || position.security_id.toUpperCase().startsWith("CASH_");
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finiteNumberOrFallback(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonEmptyStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function upperCaseStringOrNull(value: unknown): string | null {
  return nonEmptyStringOrNull(value)?.toUpperCase() ?? null;
}
