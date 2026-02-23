export const intakeBatches = [
  { batchId: "BATCH-9021", source: "CSV Upload", portfolioId: "PF_1001", status: "VALIDATION_PENDING", records: 1423 },
  { batchId: "BATCH-9018", source: "Manual Form", portfolioId: "PF_2007", status: "READY_TO_COMMIT", records: 26 },
  { batchId: "BATCH-9015", source: "Excel Upload", portfolioId: "PF_1015", status: "REJECTED", records: 843 },
];

export const analyticsHighlights = [
  { label: "1Y Portfolio Return", value: "8.42%", direction: "up" },
  { label: "Tracking Error", value: "2.16%", direction: "flat" },
  { label: "Top Risk Contributor", value: "US Tech Equity", direction: "warn" },
  { label: "Attribution Alpha", value: "+121 bps", direction: "up" },
];

export const advisoryQueue = [
  { proposalId: "PP-7721", portfolioId: "PF_1001", state: "RISK_REVIEW", owner: "risk_officer_1" },
  { proposalId: "PP-7718", portfolioId: "PF_2007", state: "COMPLIANCE_REVIEW", owner: "compliance_officer_1" },
  { proposalId: "PP-7710", portfolioId: "PF_1015", state: "AWAITING_CLIENT_CONSENT", owner: "advisor_2" },
];
