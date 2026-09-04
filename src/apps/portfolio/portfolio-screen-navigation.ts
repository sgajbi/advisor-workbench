import {
  buildReviewContextHref,
  scopeReviewContextForWorkspace,
  type ReviewContext,
} from "@/shell/review-context";
import { resolveShellDestinationReviewContextPolicy } from "@/shell/app-registry";
import { PORTFOLIO_SCREEN_LABELS } from "./portfolio-terminology";

export type PortfolioScreenNavigationKey =
  | "portfolio"
  | "allocation"
  | "positions"
  | "transactions"
  | "income"
  | "cashflow"
  | "performance"
  | "risk"
  | "proposal"
  | "advisory"
  | "reports"
  | "manage";

export type PortfolioScreenNavigationItem = {
  key: PortfolioScreenNavigationKey;
  label: string;
  detail: string;
  href: string;
  group: PortfolioScreenNavigationGroupKey;
  primary: boolean;
};

export type PortfolioScreenNavigationGroupKey =
  | "portfolio-records"
  | "analytics"
  | "advice"
  | "operations";

export type PortfolioScreenNavigationGroup = {
  key: PortfolioScreenNavigationGroupKey;
  label: string;
  items: PortfolioScreenNavigationItem[];
};

export type PortfolioScreenNavigationModel = {
  primaryItems: PortfolioScreenNavigationItem[];
  currentTask: PortfolioScreenNavigationItem | null;
  directoryGroups: PortfolioScreenNavigationGroup[];
};

export type PortfolioReviewContext = ReviewContext & Readonly<{ portfolioId: string }>;

export type PortfolioScreenRailModeItem = {
  key: string;
  label: string;
  detail: string;
  active: boolean;
  disabled?: boolean;
  status?: string;
  title?: string;
  href?: string;
  prefetch?: boolean;
  onSelect?: () => void;
};

const PORTFOLIO_SCREEN_NAVIGATION_GROUPS: ReadonlyArray<{
  key: PortfolioScreenNavigationGroupKey;
  label: string;
}> = [
  { key: "portfolio-records", label: "Portfolio records" },
  { key: "analytics", label: "Analysis" },
  { key: "advice", label: "Advice and proposals" },
  { key: "operations", label: "Client service" },
];

const PORTFOLIO_SCREEN_NAVIGATION_ITEMS: PortfolioScreenNavigationItem[] = [
  {
    key: "portfolio",
    label: PORTFOLIO_SCREEN_LABELS.portfolioReview,
    detail: "Mandate and decision context",
    href: "/portfolio",
    group: "portfolio-records",
    primary: true,
  },
  {
    key: "allocation",
    label: PORTFOLIO_SCREEN_LABELS.allocation,
    detail: "Composition and concentration",
    href: "/allocation",
    group: "portfolio-records",
    primary: false,
  },
  {
    key: "positions",
    label: PORTFOLIO_SCREEN_LABELS.positions,
    detail: "Valuation and profit or loss",
    href: "/positions",
    group: "portfolio-records",
    primary: false,
  },
  {
    key: "transactions",
    label: PORTFOLIO_SCREEN_LABELS.transactions,
    detail: "Booked activity and settlement",
    href: "/transactions",
    group: "portfolio-records",
    primary: false,
  },
  {
    key: "income",
    label: PORTFOLIO_SCREEN_LABELS.incomeAndActivity,
    detail: "Booked income, fees, and taxes",
    href: "/income",
    group: "portfolio-records",
    primary: false,
  },
  {
    key: "cashflow",
    label: PORTFOLIO_SCREEN_LABELS.projectedCashFlow,
    detail: "Expected portfolio inflows and outflows",
    href: "/cashflow",
    group: "portfolio-records",
    primary: false,
  },
  {
    key: "performance",
    label: "Performance",
    detail: "Returns and attribution",
    href: "/performance",
    group: "analytics",
    primary: true,
  },
  {
    key: "risk",
    label: "Risk",
    detail: "Exposure and risk review",
    href: "/performance?mode=risk",
    group: "analytics",
    primary: false,
  },
  {
    key: "proposal",
    label: "Proposals",
    detail: "Advice lifecycle and approvals",
    href: "/proposals",
    group: "advice",
    primary: false,
  },
  {
    key: "advisory",
    label: "Advice",
    detail: "Priorities and recommendations",
    href: "/recommendations",
    group: "advice",
    primary: true,
  },
  {
    key: "reports",
    label: PORTFOLIO_SCREEN_LABELS.reportCentre,
    detail: "Order and monitor reports",
    href: "/reports",
    group: "operations",
    primary: true,
  },
];

export function buildPortfolioScreenNavigationItems(
  reviewContext: PortfolioReviewContext,
): PortfolioScreenNavigationItem[] {
  return [
    ...PORTFOLIO_SCREEN_NAVIGATION_ITEMS.map((item) => ({
      ...item,
      href: buildPortfolioScreenHref(item.href, reviewContext),
    })),
    {
      key: "manage",
      label: "Mandate management",
      detail: "Mandate and operating workflow",
      href: buildPortfolioScreenHref(
        `/workbench/${encodeURIComponent(reviewContext.portfolioId)}`,
        reviewContext,
      ),
      group: "operations",
      primary: true,
    },
  ];
}

export function buildPortfolioScreenNavigationModel(
  reviewContext: PortfolioReviewContext,
  activeScreen: PortfolioScreenNavigationKey,
): PortfolioScreenNavigationModel {
  const items = buildPortfolioScreenNavigationItems(reviewContext);
  const primaryItems = items.filter((item) => item.primary);
  const activeItem = items.find((item) => item.key === activeScreen) ?? null;

  return {
    primaryItems,
    currentTask: activeItem?.primary ? null : activeItem,
    directoryGroups: PORTFOLIO_SCREEN_NAVIGATION_GROUPS.map((group) => ({
      ...group,
      items: items.filter(
        (item) =>
          !item.primary &&
          item.group === group.key &&
          item.key !== activeItem?.key,
      ),
    })).filter((group) => group.items.length > 0),
  };
}

export function buildPortfolioScreenHref(
  href: string,
  reviewContext: PortfolioReviewContext,
) {
  return buildReviewContextHref(
    href,
    scopeReviewContextForWorkspace(
      reviewContext,
      resolveShellDestinationReviewContextPolicy(href),
    ),
  );
}
