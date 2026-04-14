"use client";

import { formatDate } from "../formatters";
import type { PortfolioWorkspaceContext } from "../view-model";
import type { PortfolioCollapsibleSectionKey } from "./portfolio-analytical-section-types";

export const PORTFOLIO_COLLAPSIBLE_SECTION_KEYS: PortfolioCollapsibleSectionKey[] = [
  "allocation",
  "top-holdings",
  "performance-snapshot",
  "income",
  "activity",
  "holdings",
  "transactions",
  "projected-cashflow",
];

export function getPortfolioSectionStorageKey(
  sectionKey: PortfolioCollapsibleSectionKey
): string {
  return `lotus:portfolio:section:${sectionKey}`;
}

export function getDefaultSectionExpanded(
  sectionKey: PortfolioCollapsibleSectionKey,
  viewMode: PortfolioWorkspaceContext["viewMode"]
): boolean {
  if (viewMode === "detailed") {
    return true;
  }

  switch (sectionKey) {
    case "allocation":
    case "top-holdings":
    case "income":
    case "activity":
      return true;
    default:
      return false;
  }
}

export function formatPortfolioPeriodContext(
  context: PortfolioWorkspaceContext
): string {
  return `${context.periodLabel} period from ${formatDate(
    context.effectivePeriodStartDate
  )} to ${formatDate(context.effectivePeriodEndDate)}`;
}
