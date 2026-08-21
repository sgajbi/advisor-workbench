import type {
  ProposalDraftCashFlowIntent,
  ProposalDraftTradeIntent,
} from "./proposal-draft-preview";

type ProposalDraftEvaluationValues = {
  proposalTitle: string;
  portfolioId: string;
  asOfDate: string;
  mandateId?: string;
  baseCurrency: string;
  cashAmount: string;
};

export function buildProposalDraftFingerprint({
  values,
  cashFlows,
  trades,
}: {
  values: ProposalDraftEvaluationValues;
  cashFlows: ProposalDraftCashFlowIntent[];
  trades: ProposalDraftTradeIntent[];
}): string {
  return JSON.stringify({
    values: {
      proposalTitle: values.proposalTitle.trim(),
      portfolioId: values.portfolioId.trim(),
      asOfDate: values.asOfDate.trim(),
      mandateId: values.mandateId?.trim() ?? "",
      baseCurrency: values.baseCurrency.trim().toUpperCase(),
      cashAmount: values.cashAmount,
    },
    cashFlows,
    trades,
  });
}
