export type ContributionEvidenceVocabularyEntry = {
  label: string;
  reasonCode: string;
};

export const UNSUPPORTED_ECONOMICS_VOCABULARY: Readonly<
  Record<string, ContributionEvidenceVocabularyEntry>
> = {
  income_pnl: componentPnlEntry("income effects"),
  fee_pnl: componentPnlEntry("fee effects"),
  tax_pnl: componentPnlEntry("tax effects"),
  price_pnl: componentPnlEntry("price effects"),
  fx_pnl: componentPnlEntry("currency effects"),
  realized_pnl: componentPnlEntry("realized gains and losses"),
  realized_capital_pnl: componentPnlEntry("realized capital gains and losses"),
  realized_fx_pnl: componentPnlEntry("realized currency gains and losses"),
  corporate_action_pnl: componentPnlEntry("corporate-action effects"),
  derivative_pnl: componentPnlEntry("derivative effects"),
  cash_pnl: componentPnlEntry("cash effects"),
  loan_pnl: componentPnlEntry("loan effects"),
  liability_pnl: componentPnlEntry("liability effects"),
  residual_pnl: componentPnlEntry("residual effects"),
  local_contribution: {
    label: "local-return contribution",
    reasonCode: "MISSING_LOCAL_ECONOMICS",
  },
  fx_contribution: {
    label: "currency contribution",
    reasonCode: "MISSING_FX",
  },
};

export const DEGRADED_ECONOMICS_VOCABULARY: Readonly<
  Record<string, ContributionEvidenceVocabularyEntry>
> = {
  performance_component_economics_unavailable: {
    label: "Component-level source economics are unavailable for this view.",
    reasonCode: "PERFORMANCE_COMPONENT_ECONOMICS_UNAVAILABLE",
  },
  unsupported_cash_flow_types: {
    label: "Some source cash-flow types are not fully supported.",
    reasonCode: "UNSUPPORTED_SOURCE_CASH_FLOW_TYPES_PRESENT",
  },
  missing_classification: {
    label: "Some holdings do not have a source-owned classification.",
    reasonCode: "UNCLASSIFIED_POSITION_ECONOMICS_PRESENT",
  },
  upstream_snapshot_lineage_not_embedded: {
    label: "Source lineage is available through the calculation execution record.",
    reasonCode: "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE_VIA_EXECUTION_ONLY",
  },
};

function componentPnlEntry(label: string): ContributionEvidenceVocabularyEntry {
  return {
    label,
    reasonCode: "COMPONENT_PNL_NOT_SOURCE_AUTHORED",
  };
}
