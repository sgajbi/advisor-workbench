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
  | "manage";

export type PortfolioScreenNavigationItem = {
  key: PortfolioScreenNavigationKey;
  label: string;
  detail: string;
  href: string;
};

const PORTFOLIO_SCREEN_NAVIGATION_ITEMS: PortfolioScreenNavigationItem[] = [
  { key: "portfolio", label: "Portfolio", detail: "Review and decision context", href: "/portfolio" },
  { key: "allocation", label: "Allocation", detail: "Composition, exposure, and concentration", href: "/allocation" },
  { key: "positions", label: "Positions", detail: "Holdings, valuation, and P&L", href: "/positions" },
  { key: "transactions", label: "Transactions", detail: "Booked activity and settlement", href: "/transactions" },
  { key: "income", label: "Income", detail: "Income and activity", href: "/income" },
  { key: "cashflow", label: "Cashflow", detail: "Forward liquidity path", href: "/cashflow" },
  { key: "performance", label: "Performance", detail: "Return and attribution workspace", href: "/performance" },
  { key: "risk", label: "Risk", detail: "Risk review workspace", href: "/performance?mode=risk" },
  { key: "proposal", label: "Proposal", detail: "Proposal lifecycle", href: "/proposals" },
  {
    key: "advisory",
    label: "Advisory",
    detail: "Advisor brief and recommendations",
    href: "/performance?mode=advisor",
  },
];

export function buildPortfolioScreenNavigationItems(
  portfolioId: string
): PortfolioScreenNavigationItem[] {
  return [
    ...PORTFOLIO_SCREEN_NAVIGATION_ITEMS.map((item) => ({
      ...item,
      href: buildPortfolioScreenHref(item.href, portfolioId),
    })),
    {
      key: "manage",
      label: "Manage",
      detail: "Mandates and advisor workflow",
      href: `/workbench/${encodeURIComponent(portfolioId)}`,
    },
  ];
}

export function buildPortfolioScreenHref(href: string, portfolioId: string) {
  if (href.startsWith("/workbench/")) {
    return href;
  }
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}portfolioId=${encodeURIComponent(portfolioId)}`;
}
