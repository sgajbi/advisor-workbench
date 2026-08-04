export type PerformanceWorkspaceMode =
  | "summary"
  | "analysis"
  | "advisor"
  | "risk"
  | "evidence";

export type PerformanceWorkspaceModeIntro = {
  ariaLabel: string;
  kicker: string;
  title: string;
  description: string;
};

export type PerformanceWorkspaceModeDefinition = {
  key: PerformanceWorkspaceMode;
  label: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  intro: PerformanceWorkspaceModeIntro | null;
};

export const PERFORMANCE_WORKSPACE_MODE_DEFINITIONS: PerformanceWorkspaceModeDefinition[] = [
  {
    key: "summary",
    label: "Summary",
    workspaceTitle: "Performance",
    workspaceSubtitle: "Benchmark-aware return, attribution, contribution, and evidence review.",
    intro: {
      ariaLabel: "Performance summary mode intro",
      kicker: "Decision workspace",
      title: "Return path, horizon comparison, and performance drivers",
      description:
        "Review benchmark-aware outcome, horizon comparisons, and contributor leadership in one governed performance surface before moving into deeper analysis.",
    },
  },
  {
    key: "analysis",
    label: "Analysis",
    workspaceTitle: "Performance Analysis",
    workspaceSubtitle: "Benchmark-aware return, attribution, contribution, and evidence review.",
    intro: {
      ariaLabel: "Performance analysis mode intro",
      kicker: "Analytical follow-through",
      title: "Attribution, contribution, and benchmark-relative diagnostics",
      description:
        "Use the detailed modules to separate return path, allocation effects, and contribution concentration without leaving the governed performance workspace.",
    },
  },
  {
    key: "advisor",
    label: "Advisor Brief",
    workspaceTitle: "Performance",
    workspaceSubtitle: "Benchmark-aware return, attribution, contribution, and evidence review.",
    intro: {
      ariaLabel: "Advisor brief mode intro",
      kicker: "Internal working narrative",
      title: "Source-grounded brief, drilldowns, and supportability",
      description:
        "Keep the advisory summary anchored to the same benchmark-aware performance contract, with direct paths back to analysis when the narrative needs proof.",
    },
  },
  {
    key: "risk",
    label: "Risk",
    workspaceTitle: "Risk",
    workspaceSubtitle: "Benchmark-aware concentration, drawdown, rolling, and attribution review.",
    intro: {
      ariaLabel: "Risk mode intro",
      kicker: "Risk review",
      title: "Downside, concentration, and rolling stability posture",
      description:
        "Compare current mandate risk posture with drawdown path, concentration, and rolling stability before moving into historical attribution detail.",
    },
  },
  {
    key: "evidence",
    label: "Evidence",
    workspaceTitle: "Performance",
    workspaceSubtitle: "Benchmark-aware return, attribution, contribution, and evidence review.",
    intro: null,
  },
];

const PERFORMANCE_WORKSPACE_MODE_MAP = new Map(
  PERFORMANCE_WORKSPACE_MODE_DEFINITIONS.map((definition) => [definition.key, definition])
);

export const PERFORMANCE_WORKSPACE_MODE_SET = new Set<PerformanceWorkspaceMode>(
  PERFORMANCE_WORKSPACE_MODE_DEFINITIONS.map((definition) => definition.key)
);

const PERFORMANCE_WORKSPACE_MODE_ALIASES: Record<string, PerformanceWorkspaceMode> = {
  "advisor-brief": "advisor",
};

export function isPerformanceWorkspaceMode(value: string): value is PerformanceWorkspaceMode {
  return PERFORMANCE_WORKSPACE_MODE_SET.has(value as PerformanceWorkspaceMode);
}

export function normalizePerformanceWorkspaceMode(
  value?: string | null
): PerformanceWorkspaceMode | null {
  if (!value) {
    return null;
  }
  const normalizedValue = value.trim();
  if (isPerformanceWorkspaceMode(normalizedValue)) {
    return normalizedValue;
  }
  return PERFORMANCE_WORKSPACE_MODE_ALIASES[normalizedValue] ?? null;
}

export function getPerformanceWorkspaceModeDefinition(
  mode: PerformanceWorkspaceMode
): PerformanceWorkspaceModeDefinition {
  return PERFORMANCE_WORKSPACE_MODE_MAP.get(mode) ?? PERFORMANCE_WORKSPACE_MODE_MAP.get("summary")!;
}

export function getPerformanceWorkspaceModeLabel(mode: PerformanceWorkspaceMode): string {
  return getPerformanceWorkspaceModeDefinition(mode).label;
}
