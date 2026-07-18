export type ShellAppId =
  | "home"
  | "portfolio"
  | "performance"
  | "risk"
  | "proposal"
  | "advisory";

const SHELL_APP_MATCHERS: Record<ShellAppId, string[]> = {
  home: ["/", "/suite"],
  portfolio: [
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

export function resolveShellApp(
  pathname: string | null | undefined,
  searchParams?: URLSearchParams | null
): { id: ShellAppId } {
  const normalizedPath = pathname?.trim() || "/";

  if (normalizedPath.startsWith("/performance")) {
    if (searchParams?.get("mode") === "advisor") {
      return { id: "advisory" };
    }
    return {
      id: searchParams?.get("mode") === "risk" ? "risk" : "performance",
    };
  }

  const matched = (Object.entries(SHELL_APP_MATCHERS) as Array<[ShellAppId, string[]]>).find(
    ([id, matchers]) =>
      id !== "risk" &&
      matchers.some((matcher) =>
        matcher === "/" ? normalizedPath === "/" : normalizedPath.startsWith(matcher)
      )
  );

  return { id: matched?.[0] ?? "home" };
}
