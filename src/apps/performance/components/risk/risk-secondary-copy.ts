export const riskSecondaryGroupCopy = {
  eyebrow: "Analytical follow-through",
  subtitle:
    "Rolling behaviour and attribution stay available as drill-down review after the current book, path, and concentration posture are understood.",
} as const;

export const riskRollingPanelCopy = {
  title: "Rolling Risk",
  subtitle: "Selected-window behaviour, relative reliability, and next-horizon review.",
  methodologyPanelTitle: "Rolling Risk",
  drilldownLabel: "View rolling series",
  detailTitle: "Window detail",
  reviewWindowLabel: "Review window",
  reviewWindowSupport: "Short to long horizon",
  supportabilityLabel: "Rolling review notes",
  detailTableAriaLabel: "Rolling risk summary table",
  detailTableEmptyState: {
    title: "No rolling risk metrics",
    body: "Rolling risk windows are not available for this portfolio context.",
  },
} as const;

export const riskAttributionPanelCopy = {
  title: "Historical Risk Attribution",
  subtitle: "Analytical decomposition of total and active risk across supported business dimensions.",
  methodologyPanelTitle: "Historical Risk Attribution",
  detailTitle: "Contributor review",
  detailAriaLabel: "Risk attribution detail",
  attributionTypeAriaLabel: "Risk attribution type",
  groupingAriaLabel: "Risk attribution grouping",
  warningsLabel: "Attribution notes",
  loadingTitle: "Loading historical risk attribution",
  loadingBody: "Fetching stateful attribution contributors for the selected controls.",
  blockedTitle: "Attribution selection blocked",
  blockedBody: "The selected attribution combination is blocked by the current stateful support matrix.",
  blockedHint: "Choose a supported attribution type and grouping combination to continue.",
  unavailableTitle: "Historical risk attribution unavailable",
  unavailableBody: "Historical risk attribution is not available for the selected portfolio context.",
  tableAriaLabel: "Historical risk attribution table",
  tableEmptyState: {
    title: "No attribution contributors",
    body: "Historical risk attribution did not return contributor rows for the selected controls.",
  },
} as const;
