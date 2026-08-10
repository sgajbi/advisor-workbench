import { normalizePerformanceWorkspaceMode } from "@/apps/performance/performance-workspace-modes";

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

const SHELL_WORKSPACE_MATCHERS: Record<ShellWorkspaceId, string[]> = {
  portfolio: [
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
  performance: ["/performance"],
  risk: ["/performance"],
  proposal: ["/proposals"],
  advisory: ["/recommendations"],
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
    Object.entries(SHELL_WORKSPACE_MATCHERS) as Array<[ShellWorkspaceId, string[]]>
  ).find(([, matchers]) =>
    matchers.some((matcher) => matchesRouteBoundary(normalizedPath, matcher))
  );

  return matched
    ? { scope: "workspace", workspaceId: matched[0] }
    : { scope: "unmatched", workspaceId: null };
}

function matchesRouteBoundary(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}
