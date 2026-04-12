export type ShellAppId =
  | "home"
  | "portfolio"
  | "performance"
  | "risk"
  | "proposal"
  | "advisory";

export type ShellApp = {
  id: ShellAppId;
  label: string;
  href: string;
  description: string;
  matchers: string[];
  capabilityKey?: string;
  available: boolean;
  visible?: boolean;
};

export const SHELL_APPS: ShellApp[] = [
  {
    id: "home",
    label: "Overview",
    href: "/portfolio",
    description: "Portfolio overview.",
    matchers: ["/"],
    available: true,
    visible: false,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/portfolio",
    description: "Holdings and portfolio position.",
    matchers: ["/portfolio", "/portfolios", "/intake"],
    capabilityKey: "portfolio_workspace",
    available: true,
  },
  {
    id: "performance",
    label: "Performance",
    href: "/performance",
    description: "Performance review.",
    matchers: ["/performance"],
    capabilityKey: "performance_workspace",
    available: true,
  },
  {
    id: "risk",
    label: "Risk",
    href: "/performance?mode=risk",
    description: "Risk review.",
    matchers: ["/performance"],
    capabilityKey: "risk_workspace",
    available: true,
  },
  {
    id: "proposal",
    label: "Proposal",
    href: "/proposals",
    description: "Proposal lifecycle.",
    matchers: ["/proposals"],
    capabilityKey: "proposal_workspace",
    available: false,
  },
  {
    id: "advisory",
    label: "Advisory",
    href: "/recommendations",
    description: "Advisory workflow.",
    matchers: ["/recommendations"],
    capabilityKey: "advisory_workspace",
    available: false,
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
