export type OperatingRole = "ADVISOR" | "RISK" | "COMPLIANCE";

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

export const advisorPriorityBoard = [
  {
    clientName: "Apex Family Office",
    portfolioId: "PF_1001",
    proposalId: "PP-7721",
    workflowState: "RISK_REVIEW",
    businessAction: "Route to risk officer for same-day clearance",
    urgency: "High",
    assignedRole: "RISK" as OperatingRole,
  },
  {
    clientName: "Northbridge Trust",
    portfolioId: "PF_2007",
    proposalId: "PP-7718",
    workflowState: "COMPLIANCE_REVIEW",
    businessAction: "Resolve compliance exceptions before consent pack",
    urgency: "Medium",
    assignedRole: "COMPLIANCE" as OperatingRole,
  },
  {
    clientName: "Sterling Private Bank Client 014",
    portfolioId: "PF_1015",
    proposalId: "PP-7710",
    workflowState: "AWAITING_CLIENT_CONSENT",
    businessAction: "Capture client sign-off and schedule execution handoff",
    urgency: "Medium",
    assignedRole: "ADVISOR" as OperatingRole,
  },
  {
    clientName: "Cedar Asset Partners",
    portfolioId: "PF_1190",
    proposalId: "PP-7734",
    workflowState: "DRAFT",
    businessAction: "Finalize scenario package and send for risk review",
    urgency: "High",
    assignedRole: "ADVISOR" as OperatingRole,
  },
  {
    clientName: "Lakeside Global Mandate",
    portfolioId: "PF_2104",
    proposalId: "PP-7740",
    workflowState: "RISK_REVIEW",
    businessAction: "Review concentration breach and risk waiver rationale",
    urgency: "High",
    assignedRole: "RISK" as OperatingRole,
  },
  {
    clientName: "Orchid Legacy Account",
    portfolioId: "PF_3042",
    proposalId: "PP-7744",
    workflowState: "COMPLIANCE_REVIEW",
    businessAction: "Complete cross-border compliance attestation",
    urgency: "Medium",
    assignedRole: "COMPLIANCE" as OperatingRole,
  },
];

export const dpmActionPlaybook = [
  {
    role: "ADVISOR" as OperatingRole,
    workflowState: "DRAFT",
    advisorAction: "Review the book and performance context before preparing the next action",
    route: "/performance",
    routeLabel: "Open Performance Workspace",
  },
  {
    role: "ADVISOR" as OperatingRole,
    workflowState: "AWAITING_CLIENT_CONSENT",
    advisorAction: "Review portfolio context and confirm the next client-facing step",
    route: "/portfolio",
    routeLabel: "Open Portfolio Workspace",
  },
  {
    role: "RISK" as OperatingRole,
    workflowState: "RISK_REVIEW",
    advisorAction: "Review portfolio and performance exceptions before risk sign-off",
    route: "/performance",
    routeLabel: "Open Performance Workspace",
  },
  {
    role: "COMPLIANCE" as OperatingRole,
    workflowState: "COMPLIANCE_REVIEW",
    advisorAction: "Review portfolio context and address compliance checks",
    route: "/portfolio",
    routeLabel: "Open Portfolio Workspace",
  },
  {
    role: "ADVISOR" as OperatingRole,
    workflowState: "EXECUTION_READY",
    advisorAction: "Hand off to execution desk with traceable artifacts",
    route: "/workbench",
    routeLabel: "Open Decision Console",
  },
];
