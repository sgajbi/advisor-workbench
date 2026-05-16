"use client";

import type { ComponentType } from "react";

import type { PortfolioWorkspaceCapabilities } from "../capabilities";
import type {
  PortfolioAllocationSelection,
  PortfolioHoldingsDrilldownFilter,
  PortfolioInsight,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";

export type PortfolioCollapsibleSectionKey =
  | "allocation"
  | "top-holdings"
  | "performance-snapshot"
  | "income"
  | "activity"
  | "holdings"
  | "transactions"
  | "projected-cashflow";

export type AllocationPanelComponentProps = {
  portfolioId: string;
  allocationViews: NonNullable<PortfolioWorkspace["allocation_views"]>;
  baseCurrency: string;
  asOfDate: string;
  reportingCurrency: string;
  compact?: boolean;
  selectedAllocation: PortfolioAllocationSelection | null;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
};

export type TopHoldingsPanelComponentProps = {
  positions: PortfolioWorkspace["top_positions"];
  baseCurrency: string;
  selectedSecurityId: string | null;
  onSelectionChange: (securityId: string | null) => void;
};

export type PortfolioInsightsSectionProps = {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showInsights: boolean;
  showLiquidityModule: boolean;
  visibleInsights: PortfolioInsight[];
  holdingsDrilldown: PortfolioHoldingsDrilldownFilter | null;
  filteredPositions: PortfolioWorkspace["positions"];
  onDismissInsight: (key: string) => void;
  onSelectAllocation: (selection: PortfolioAllocationSelection | null) => void;
  onSelectTopHolding: (securityId: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
  DeferredPortfolioAllocationPanel: ComponentType<AllocationPanelComponentProps>;
  DeferredPortfolioTopHoldingsPanel: ComponentType<TopHoldingsPanelComponentProps>;
};

