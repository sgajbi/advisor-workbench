import type { PortfolioPositionView } from "@/apps/portfolio/types";
import {
  combineQuerySourcePostures,
  projectQuerySourcePosture,
  type QuerySourcePosture,
} from "@/features/platform-runtime/query-source-posture";

export type ProposalPortfolioEvidenceStatus =
  | "not_selected"
  | "checking"
  | "refreshing"
  | "ready"
  | "partial"
  | "unavailable"
  | "refresh_failed";

export type ProposalPositionsEvidenceStatus =
  | "loading"
  | "ready"
  | "empty"
  | "refreshing"
  | "cached"
  | "unavailable";

export type ProposalCashAuthority = "workspace" | "portfolio_book" | "manual_scenario";

type QueryEvidence<TData> = {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

type ProposalBookEvidence = {
  positions?: PortfolioPositionView[];
};

type ProposalWorkspaceEvidence = {
  summary?: {
    total_cash_base?: unknown;
  };
};

export type ProposalPortfolioEvidenceModel = {
  status: ProposalPortfolioEvidenceStatus;
  canEvaluate: boolean;
  title: string;
  body: string;
  hint: string | null;
  bookSourcePosture: QuerySourcePosture;
  workspaceSourcePosture: QuerySourcePosture;
  combinedSourcePosture: QuerySourcePosture;
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
  bookQuery,
  workspaceQuery,
  manualCashAmount,
}: {
  portfolioId: string;
  bookQuery: QueryEvidence<ProposalBookEvidence>;
  workspaceQuery: QueryEvidence<ProposalWorkspaceEvidence>;
  manualCashAmount: number;
}): ProposalPortfolioEvidenceModel {
  const hasPortfolio = portfolioId.trim().length > 0;
  const bookPositions = Array.isArray(bookQuery.data?.positions)
    ? bookQuery.data.positions
    : null;
  const workspaceCash = finiteNumberOrNull(workspaceQuery.data?.summary?.total_cash_base);
  const hasBookContractFailure = bookQuery.data !== undefined && bookPositions === null;
  const hasWorkspaceContractFailure =
    workspaceQuery.data !== undefined && workspaceCash === null;
  const bookSourcePosture = projectQuerySourcePosture({
    hasData: bookPositions !== null,
    isLoading: hasPortfolio && bookQuery.isLoading,
    isFetching: hasPortfolio && bookQuery.isFetching,
    hasError: Boolean(bookQuery.error) || hasBookContractFailure,
  });
  const workspaceSourcePosture = projectQuerySourcePosture({
    hasData: workspaceCash !== null,
    isLoading: hasPortfolio && workspaceQuery.isLoading,
    isFetching: hasPortfolio && workspaceQuery.isFetching,
    hasError: Boolean(workspaceQuery.error) || hasWorkspaceContractFailure,
  });
  const combinedSourcePosture = combineQuerySourcePostures([
    bookSourcePosture,
    workspaceSourcePosture,
  ]);
  const status = resolveEvidenceStatus({
    hasPortfolio,
    hasBookData: bookPositions !== null,
    hasWorkspaceData: workspaceCash !== null,
    bookSourcePosture,
    workspaceSourcePosture,
  });
  const positions = bookPositions ?? [];
  const tradablePositions = positions.filter((position) => !isCashPosition(position));
  const bookCashPositions = positions.filter(isCashPosition);
  const bookCashAmount = bookCashPositions.reduce(
    (sum, position) => sum + finiteNumberOrFallback(position.market_value_base, 0),
    0
  );
  const cash = resolveCashEvidence({
    workspaceCash,
    bookCashAmount,
    hasBookCash: bookCashPositions.length > 0,
    manualCashAmount,
  });

  return {
    status,
    canEvaluate: status === "ready",
    ...evidenceCopy(status),
    bookSourcePosture,
    workspaceSourcePosture,
    combinedSourcePosture,
    positions: {
      status: resolvePositionsStatus({
        hasPortfolio,
        hasBookData: bookPositions !== null,
        positionCount: tradablePositions.length,
        posture: bookSourcePosture,
      }),
      items: tradablePositions,
    },
    cash,
  };
}

function resolveEvidenceStatus({
  hasPortfolio,
  hasBookData,
  hasWorkspaceData,
  bookSourcePosture,
  workspaceSourcePosture,
}: {
  hasPortfolio: boolean;
  hasBookData: boolean;
  hasWorkspaceData: boolean;
  bookSourcePosture: QuerySourcePosture;
  workspaceSourcePosture: QuerySourcePosture;
}): ProposalPortfolioEvidenceStatus {
  if (!hasPortfolio) {
    return "not_selected";
  }

  if (hasBookData && hasWorkspaceData) {
    if (bookSourcePosture.hasRefreshFailure || workspaceSourcePosture.hasRefreshFailure) {
      return "refresh_failed";
    }
    if (bookSourcePosture.isRefreshing || workspaceSourcePosture.isRefreshing) {
      return "refreshing";
    }
    return "ready";
  }

  if (hasBookData || hasWorkspaceData) {
    if (bookSourcePosture.isInitialLoading || workspaceSourcePosture.isInitialLoading) {
      return "checking";
    }
    return "partial";
  }

  if (
    bookSourcePosture.isInitialLoading ||
    workspaceSourcePosture.isInitialLoading ||
    bookSourcePosture.isRefreshing ||
    workspaceSourcePosture.isRefreshing
  ) {
    return "checking";
  }
  return "unavailable";
}

function resolvePositionsStatus({
  hasPortfolio,
  hasBookData,
  positionCount,
  posture,
}: {
  hasPortfolio: boolean;
  hasBookData: boolean;
  positionCount: number;
  posture: QuerySourcePosture;
}): ProposalPositionsEvidenceStatus {
  if (!hasPortfolio || (!hasBookData && posture.isInitialLoading)) {
    return "loading";
  }
  if (!hasBookData) {
    return "unavailable";
  }
  if (posture.hasRefreshFailure) {
    return "cached";
  }
  if (posture.isRefreshing) {
    return "refreshing";
  }
  return positionCount > 0 ? "ready" : "empty";
}

function resolveCashEvidence({
  workspaceCash,
  bookCashAmount,
  hasBookCash,
  manualCashAmount,
}: {
  workspaceCash: number | null;
  bookCashAmount: number;
  hasBookCash: boolean;
  manualCashAmount: number;
}): ProposalPortfolioEvidenceModel["cash"] {
  if (workspaceCash !== null) {
    return {
      amount: workspaceCash,
      authority: "workspace",
      label: "Portfolio cash confirmed",
    };
  }
  if (hasBookCash) {
    return {
      amount: bookCashAmount,
      authority: "portfolio_book",
      label: "Cash derived from the available book",
    };
  }
  return {
    amount: finiteNumberOrFallback(manualCashAmount, 0),
    authority: "manual_scenario",
    label: "Manual scenario cash",
  };
}

function evidenceCopy(status: ProposalPortfolioEvidenceStatus): {
  title: string;
  body: string;
  hint: string | null;
} {
  switch (status) {
    case "not_selected":
      return {
        title: "Select a portfolio",
        body: "Choose the client portfolio before reviewing holdings and available cash.",
        hint: "Evaluation and draft handoff remain unavailable until portfolio evidence is confirmed.",
      };
    case "checking":
      return {
        title: "Confirming portfolio evidence",
        body: "Current holdings and cash are being retrieved from the approved portfolio sources.",
        hint: "Proposal evaluation will become available after both sources respond.",
      };
    case "refreshing":
      return {
        title: "Refreshing portfolio evidence",
        body: "The previously retrieved holdings and cash remain visible while the sources refresh.",
        hint: "Evaluation is paused until the refresh confirms the latest evidence.",
      };
    case "ready":
      return {
        title: "Portfolio evidence confirmed",
        body: "Current holdings and cash are available for proposal construction and evaluation.",
        hint: null,
      };
    case "partial":
      return {
        title: "Portfolio evidence is incomplete",
        body: "Available holdings or cash remain visible, but the complete portfolio posture could not be confirmed.",
        hint: "Refresh the portfolio evidence before evaluating or saving an advisor draft.",
      };
    case "refresh_failed":
      return {
        title: "Latest portfolio evidence is not confirmed",
        body: "Previously retrieved holdings and cash remain visible, but the latest source refresh did not complete.",
        hint: "Refresh again before relying on this draft for an advisory decision.",
      };
    case "unavailable":
      return {
        title: "Portfolio evidence is unavailable",
        body: "Current holdings and cash could not be loaded from the approved portfolio sources.",
        hint: "No empty-book or manual-cash fallback is used to authorize evaluation. Refresh after the sources recover.",
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
