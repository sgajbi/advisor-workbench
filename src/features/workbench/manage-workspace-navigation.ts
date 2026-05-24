import type { PortfolioScreenRailModeItem } from "@/apps/portfolio/components/portfolio-screen-rail";

export type ManageMode =
  | "overview"
  | "mandate"
  | "waves"
  | "construction"
  | "memory"
  | "copilot"
  | "quality"
  | "reviews"
  | "proof";

export type ManageModeDefinition = {
  key: ManageMode;
  label: string;
  detail: string;
  title: string;
  description: string;
};

export const MANAGE_MODE_DEFINITIONS: ManageModeDefinition[] = [
  {
    key: "overview",
    label: "Overview",
    detail: "Mandate posture",
    title: "Manage Overview",
    description: "Discretionary mandate readiness and rebalance posture.",
  },
  {
    key: "mandate",
    label: "Mandate",
    detail: "Health and exceptions",
    title: "Mandate Health",
    description: "Mandate readiness, attention items, and recommended actions.",
  },
  {
    key: "waves",
    label: "Rebalance",
    detail: "Rebalance lifecycle",
    title: "Rebalance Waves",
    description: "Rebalance simulation, approval readiness, and execution handoff.",
  },
  {
    key: "construction",
    label: "Construction",
    detail: "Alternatives",
    title: "Construction Alternatives",
    description: "Supported construction alternatives for advisor and PM review.",
  },
  {
    key: "memory",
    label: "Memory",
    detail: "Portfolio memory",
    title: "Portfolio Memory",
    description: "Portfolio decision memory and operating history.",
  },
  {
    key: "copilot",
    label: "Copilot",
    detail: "AI workflow packs",
    title: "PM Copilot Workspace",
    description: "Governed PM workflow-pack requests backed by Gateway, Manage, and lotus-ai.",
  },
  {
    key: "quality",
    label: "PM Quality",
    detail: "Operating quality",
    title: "PM Operating Quality",
    description: "Governance review of Manage-owned PM quality policy and evidence.",
  },
  {
    key: "reviews",
    label: "Reviews",
    detail: "Outcome review",
    title: "Outcome Reviews",
    description: "Post-trade review and realized-versus-expected variance.",
  },
  {
    key: "proof",
    label: "Evidence",
    detail: "Decision evidence",
    title: "Evidence Pack",
    description: "Mandate evidence, approval readiness, and client handoff support.",
  },
];

export function buildManageModeItems(
  portfolioId: string,
  activeMode: ManageMode
): PortfolioScreenRailModeItem[] {
  return MANAGE_MODE_DEFINITIONS.map((mode) => ({
    key: mode.key,
    label: mode.label,
    detail: mode.detail,
    active: activeMode === mode.key,
    href: buildManageModeHref(portfolioId, mode.key),
    title: mode.description,
  }));
}

export function buildManageModeHref(portfolioId: string, mode: ManageMode) {
  const encoded = encodeURIComponent(portfolioId);
  return mode === "overview" ? `/workbench/${encoded}` : `/workbench/${encoded}?mode=${mode}`;
}

export function normalizeManageMode(value: string | undefined): ManageMode {
  const requested = value?.trim().toLowerCase();
  return MANAGE_MODE_DEFINITIONS.some((mode) => mode.key === requested)
    ? (requested as ManageMode)
    : "overview";
}

export function getManageModeDefinition(mode: ManageMode) {
  return (
    MANAGE_MODE_DEFINITIONS.find((definition) => definition.key === mode) ??
    MANAGE_MODE_DEFINITIONS[0]
  );
}
