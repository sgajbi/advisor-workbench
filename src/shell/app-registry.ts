import { normalizePerformanceWorkspaceMode } from "@/apps/performance/performance-workspace-modes";
import type { ReviewPeriod } from "./review-context";

export type ShellWorkspaceId =
  | "portfolio"
  | "performance"
  | "risk"
  | "proposal"
  | "advisory";

export type ShellRouteScope = "home" | "workspace" | "platform-utility" | "unmatched";

export type ShellRouteContext = {
  scope: ShellRouteScope;
  workspaceId: ShellWorkspaceId | null;
};

export type ShellDestinationReviewContextPolicy = Readonly<{
  acceptedPeriods?: readonly ReviewPeriod[];
}>;

type ShellWorkspaceDefinition = Readonly<{
  matchers: readonly string[];
  destinationPolicies?: readonly Readonly<{
    matchers: readonly string[];
    reviewContext: ShellDestinationReviewContextPolicy;
  }>[];
}>;

const SHELL_WORKSPACE_DEFINITIONS: Record<ShellWorkspaceId, ShellWorkspaceDefinition> = {
  portfolio: {
    matchers: [
      "/allocation",
      "/book",
      "/portfolio",
      "/portfolios",
      "/positions",
      "/transactions",
      "/income",
      "/cashflow",
      "/manage",
      "/workbench",
      "/intake",
      "/reports",
    ],
    destinationPolicies: [
      {
        matchers: [
          "/allocation",
          "/portfolio",
          "/positions",
          "/transactions",
          "/income",
          "/cashflow",
          "/reports",
        ],
        reviewContext: {
          acceptedPeriods: ["7D", "30D", "MTD", "QTD", "YTD", "1Y", "SI"],
        },
      },
    ],
  },
  performance: { matchers: ["/performance"] },
  risk: { matchers: ["/performance"] },
  proposal: { matchers: ["/proposals"] },
  advisory: { matchers: ["/recommendations"] },
};

export function resolveShellRouteContext(
  pathname: string | null | undefined,
  searchParams?: URLSearchParams | null
): ShellRouteContext {
  const normalizedPath = pathname?.trim() || "/";

  if (normalizedPath === "/" || matchesRouteBoundary(normalizedPath, "/suite")) {
    return { scope: "home", workspaceId: null };
  }

  if (matchesRouteBoundary(normalizedPath, "/data-products")) {
    return { scope: "platform-utility", workspaceId: null };
  }

  if (matchesRouteBoundary(normalizedPath, "/performance")) {
    const mode = normalizePerformanceWorkspaceMode(searchParams?.get("mode"));
    if (mode === "advisor") {
      return { scope: "workspace", workspaceId: "advisory" };
    }
    return {
      scope: "workspace",
      workspaceId: mode === "risk" ? "risk" : "performance",
    };
  }

  const matched = (
    Object.entries(SHELL_WORKSPACE_DEFINITIONS) as Array<[
      ShellWorkspaceId,
      ShellWorkspaceDefinition,
    ]>
  ).find(([, definition]) =>
    definition.matchers.some((matcher) => matchesRouteBoundary(normalizedPath, matcher))
  );

  return matched
    ? { scope: "workspace", workspaceId: matched[0] }
    : { scope: "unmatched", workspaceId: null };
}

export function resolveShellDestinationReviewContextPolicy(
  destinationHref: string,
): ShellDestinationReviewContextPolicy | undefined {
  const destinationPathname = destinationHref.split(/[?#]/, 1)[0] || "/";
  for (const definition of Object.values(SHELL_WORKSPACE_DEFINITIONS)) {
    const policy = definition.destinationPolicies?.find(({ matchers }) =>
      matchers.some((matcher) => matchesRouteBoundary(destinationPathname, matcher)),
    );
    if (policy) {
      return policy.reviewContext;
    }
  }
  return undefined;
}

function matchesRouteBoundary(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}
