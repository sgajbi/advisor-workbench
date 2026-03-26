export type ShellAppId =
  | "home"
  | "foundation"
  | "performance"
  | "risk"
  | "proposal"
  | "manage"
  | "reporting"
  | "platform";

export type ShellApp = {
  id: ShellAppId;
  label: string;
  href: string;
  description: string;
  matchers: string[];
  capabilityKey?: string;
  available: boolean;
};

export const SHELL_APPS: ShellApp[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    description: "Launch point for the Lotus operating workspace.",
    matchers: ["/"],
    available: true,
  },
  {
    id: "foundation",
    label: "Foundation",
    href: "/portfolios",
    description: "Portfolio-first entry point for holdings, readiness, and workflow launch.",
    matchers: ["/portfolios", "/pas/intake"],
    capabilityKey: "command_center",
    available: true,
  },
  {
    id: "performance",
    label: "Performance",
    href: "/pa/analytics",
    description: "Benchmark-aware analytics and comparative performance review.",
    matchers: ["/pa/analytics"],
    capabilityKey: "analytics_studio",
    available: true,
  },
  {
    id: "risk",
    label: "Risk",
    href: "/risk",
    description: "Risk posture, concentration, drawdown, and scenario review.",
    matchers: ["/risk"],
    available: false,
  },
  {
    id: "proposal",
    label: "Proposal",
    href: "/proposals",
    description: "Advisory drafting, workflow, approvals, and consent readiness.",
    matchers: ["/proposals"],
    capabilityKey: "advisory_pipeline",
    available: true,
  },
  {
    id: "manage",
    label: "Manage",
    href: "/workbench",
    description: "Discretionary decision console and management workflow entry.",
    matchers: ["/workbench"],
    capabilityKey: "decision_console",
    available: true,
  },
  {
    id: "reporting",
    label: "Reporting",
    href: "/reporting",
    description: "Report-ready portfolio outputs and evidence-rich summary views.",
    matchers: ["/reporting"],
    capabilityKey: "reporting_hub",
    available: false,
  },
  {
    id: "platform",
    label: "Platform",
    href: "/suite",
    description: "Platform posture, capability policy, and workflow launch context.",
    matchers: ["/suite"],
    capabilityKey: "command_center",
    available: true,
  },
];

export function resolveShellApp(pathname: string | null | undefined): ShellApp {
  const normalizedPath = pathname?.trim() || "/";
  const matched = SHELL_APPS.find((app) =>
    app.matchers.some((matcher) =>
      matcher === "/" ? normalizedPath === "/" : normalizedPath.startsWith(matcher)
    )
  );
  return matched ?? SHELL_APPS[0];
}
