export type ShellAppId =
  | "home"
  | "clients"
  | "portfolio"
  | "performance"
  | "risk"
  | "recommendations"
  | "reporting"
  | "operations";

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
    id: "clients",
    label: "Relationship Book",
    href: "/clients",
    description: "Client relationships.",
    matchers: ["/clients"],
    available: false,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/portfolio",
    description: "Holdings and portfolio position.",
    matchers: ["/portfolio", "/portfolios", "/pas/intake"],
    capabilityKey: "command_center",
    available: true,
  },
  {
    id: "performance",
    label: "Performance",
    href: "/performance",
    description: "Performance review.",
    matchers: ["/performance", "/pa/analytics"],
    capabilityKey: "analytics_studio",
    available: true,
  },
  {
    id: "risk",
    label: "Suitability",
    href: "/risk-and-suitability",
    description: "Suitability review.",
    matchers: ["/risk-and-suitability", "/risk"],
    capabilityKey: "analytics_studio",
    available: false,
  },
  {
    id: "recommendations",
    label: "Recommendations",
    href: "/recommendations",
    description: "Recommendations workflow.",
    matchers: ["/recommendations", "/proposals"],
    capabilityKey: "advisory_pipeline",
    available: true,
  },
  {
    id: "reporting",
    label: "Reporting",
    href: "/reporting",
    description: "Client reporting.",
    matchers: ["/reporting"],
    capabilityKey: "reporting_hub",
    available: false,
  },
  {
    id: "operations",
    label: "Operations",
    href: "/workbench",
    description: "Operational workflows.",
    matchers: ["/workbench", "/suite"],
    capabilityKey: "decision_console",
    available: true,
    visible: false,
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
