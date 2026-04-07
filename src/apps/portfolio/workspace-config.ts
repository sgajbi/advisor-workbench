export const FALLBACK_WORK_AREAS = [
  { href: "/performance", title: "Performance", value: "Available", note: "Review" },
  { href: "/workbench", title: "Operations", value: "Available", note: "Console" },
] as const;

export const WORKFLOW_DISPLAY_ORDER = ["performance", "risk"] as const;

export function mapWorkflowHref(key: string, portfolioId: string): string {
  switch (key) {
    case "performance":
      return `/performance?portfolioId=${encodeURIComponent(portfolioId)}`;
    case "risk":
      return `/performance?portfolioId=${encodeURIComponent(portfolioId)}&mode=risk`;
    default:
      return `/portfolio?portfolioId=${encodeURIComponent(portfolioId)}`;
  }
}

export function getWorkflowActionLabel(key: string): string {
  switch (key) {
    case "risk":
      return "Open Risk";
    default:
      return "Performance";
  }
}

export function getWorkflowTaskLabel(key: string): string {
  switch (key) {
    case "risk":
      return "Review risk";
    default:
      return "Review performance";
  }
}

export function getCoverageWarningLabel(warning: string): string {
  switch (warning) {
    case "PORTFOLIO_AUM_UNAVAILABLE":
      return "Assets under management temporarily unavailable";
    case "PORTFOLIO_CASH_BALANCES_UNAVAILABLE":
      return "Cash balances temporarily unavailable";
    case "PORTFOLIO_CASHFLOW_UNAVAILABLE":
      return "Cashflow outlook temporarily unavailable";
    case "PORTFOLIO_SUPPORT_OVERVIEW_UNAVAILABLE":
      return "Operational readiness temporarily unavailable";
    case "FOUNDATION_PERFORMANCE_UNAVAILABLE":
      return "Performance temporarily unavailable";
    case "FOUNDATION_REBALANCE_UNAVAILABLE":
      return "Monitoring temporarily unavailable";
    case "FOUNDATION_REPORTING_UNAVAILABLE":
      return "Reporting temporarily unavailable";
    case "FOUNDATION_TRANSACTIONS_UNAVAILABLE":
      return "Transaction ledger temporarily unavailable";
    case "FOUNDATION_CASHFLOW_UNAVAILABLE":
      return "Cashflow outlook temporarily unavailable";
    case "FOUNDATION_PERFORMANCE_INVALID":
      return "Performance data needs review";
    default:
      return warning
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function getEvidenceServiceLabel(sourceService: string): string {
  switch (sourceService) {
    case "lotus-core":
      return "Portfolio data";
    case "lotus-performance":
      return "Performance";
    case "lotus-report":
      return "Reporting";
    case "lotus-manage":
      return "Monitoring";
    default:
      return sourceService
        .replace(/^lotus-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
