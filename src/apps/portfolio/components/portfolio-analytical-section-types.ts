"use client";

import type { ComponentType, Dispatch, SetStateAction } from "react";

import type { PortfolioWorkspaceCapabilities } from "../capabilities";
import type {
  PortfolioAllocationSelection,
  PortfolioHoldingsDrilldownFilter,
  PortfolioInsight,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import type { HoldingsRow } from "./portfolio-holdings-grid";
import type { TransactionRow } from "./portfolio-transactions-grid";

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
  allocationViews: NonNullable<PortfolioWorkspace["allocation_views"]>;
  baseCurrency: string;
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

export type HoldingsGridComponentProps = {
  portfolioId: string;
  positions: PortfolioWorkspace["positions"];
  baseCurrency: string;
  asOfDate: string;
  columnMode: PortfolioWorkspaceContext["columnMode"];
  filterLabel?: string | null;
  onClearFilter?: () => void;
  onRowSelect?: (row: HoldingsRow) => void;
};

export type TransactionsGridComponentProps = {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialTransactions: PortfolioWorkspace["recent_transactions"];
  suspendInitialFetch?: boolean;
  externalFilter?: PortfolioTransactionDrilldownFilter | null;
  onClearExternalFilter?: () => void;
  onRowSelect?: (row: TransactionRow) => void;
};

export type ProjectedCashflowModuleComponentProps = {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  initialCashflowOutlook: PortfolioWorkspace["cashflow_outlook"];
  defaultExpanded: boolean;
  suspendInitialFetch?: boolean;
};

export type PortfolioInsightsSectionProps = {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showInsights: boolean;
  showLiquidityModule: boolean;
  showChangeHighlights: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  visibleInsights: PortfolioInsight[];
  holdingsDrilldown: PortfolioHoldingsDrilldownFilter | null;
  filteredPositions: PortfolioWorkspace["positions"];
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onDismissInsight: (key: string) => void;
  onSelectAllocation: (selection: PortfolioAllocationSelection | null) => void;
  onSelectTopHolding: (securityId: string | null) => void;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
  DeferredPortfolioAllocationPanel: ComponentType<AllocationPanelComponentProps>;
  DeferredPortfolioTopHoldingsPanel: ComponentType<TopHoldingsPanelComponentProps>;
};

export type PortfolioChangesSectionProps = {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  showChanges: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  isDetailedView: boolean;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
};

export type PortfolioDrilldownSectionProps = {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showDrilldown: boolean;
  isDetailedView: boolean;
  filteredPositions: PortfolioWorkspace["positions"];
  holdingsFilterCopy: string | null;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onClearHoldingsDrilldown: () => void;
  onClearTransactionDrilldown: () => void;
  onSelectHoldingRow: (row: HoldingsRow) => void;
  onSelectTransactionRow: (row: TransactionRow) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  setSectionPreferences: Dispatch<SetStateAction<Record<string, boolean>>>;
  DeferredPortfolioHoldingsGrid: ComponentType<HoldingsGridComponentProps>;
  DeferredPortfolioTransactionsGrid: ComponentType<TransactionsGridComponentProps>;
  DeferredPortfolioProjectedCashflowModule: ComponentType<ProjectedCashflowModuleComponentProps>;
};
