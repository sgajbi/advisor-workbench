export const FALLBACK_WORK_AREAS = [
  { href: "/recommendations", title: "Recommendations", value: "Available", note: "Workflow" },
  { href: "/performance", title: "Performance", value: "Available", note: "Review" },
  { href: "/workbench", title: "Operations", value: "Available", note: "Console" },
] as const;

export function mapWorkflowHref(key: string, portfolioId: string): string {
  switch (key) {
    case "performance":
      return `/performance?portfolioId=${encodeURIComponent(portfolioId)}`;
    case "risk":
      return `/risk-and-suitability?portfolioId=${encodeURIComponent(portfolioId)}`;
    case "proposal":
      return `/recommendations?portfolioId=${encodeURIComponent(portfolioId)}`;
    default:
      return `/portfolio?portfolioId=${encodeURIComponent(portfolioId)}`;
  }
}

export function getWorkflowActionLabel(key: string): string {
  switch (key) {
    case "proposal":
      return "Prepare Recommendation";
    case "risk":
      return "Review Suitability";
    default:
      return "Open Performance";
  }
}
