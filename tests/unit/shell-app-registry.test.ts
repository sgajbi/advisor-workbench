import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveShellDestinationReviewContextPolicy,
  resolveShellRouteContext,
  type ShellRouteContext,
} from "@/shell/app-registry";

type RegisteredRoute = {
  routePattern: string;
};

const EXPECTED_REGISTERED_ROUTE_CONTEXT = new Map<string, ShellRouteContext>([
  ["/", { scope: "home", workspaceId: null }],
  ["/allocation", { scope: "workspace", workspaceId: "portfolio" }],
  ["/book", { scope: "workspace", workspaceId: "portfolio" }],
  ["/cashflow", { scope: "workspace", workspaceId: "portfolio" }],
  ["/data-products", { scope: "platform-utility", workspaceId: null }],
  ["/income", { scope: "workspace", workspaceId: "portfolio" }],
  ["/intake", { scope: "workspace", workspaceId: "portfolio" }],
  ["/manage", { scope: "workspace", workspaceId: "portfolio" }],
  ["/performance", { scope: "workspace", workspaceId: "performance" }],
  ["/portfolio", { scope: "workspace", workspaceId: "portfolio" }],
  ["/portfolios", { scope: "workspace", workspaceId: "portfolio" }],
  ["/positions", { scope: "workspace", workspaceId: "portfolio" }],
  ["/proposals", { scope: "workspace", workspaceId: "proposal" }],
  ["/proposals/{proposalId}", { scope: "workspace", workspaceId: "proposal" }],
  ["/proposals/simulate", { scope: "workspace", workspaceId: "proposal" }],
  ["/recommendations", { scope: "workspace", workspaceId: "advisory" }],
  ["/reports", { scope: "workspace", workspaceId: "portfolio" }],
  ["/suite", { scope: "home", workspaceId: null }],
  ["/transactions", { scope: "workspace", workspaceId: "portfolio" }],
  ["/workbench", { scope: "workspace", workspaceId: "portfolio" }],
  ["/workbench/{portfolioId}", { scope: "workspace", workspaceId: "portfolio" }],
]);

function readRegisteredRoutes(): RegisteredRoute[] {
  const registryPath = resolve(
    process.cwd(),
    "docs/documentation/workbench-screen-registry.v1.json"
  );
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
    routeEntrypoints: RegisteredRoute[];
  };
  return registry.routeEntrypoints;
}

function materializeRoutePattern(routePattern: string): string {
  return routePattern.replaceAll(/\{[^}]+\}/g, "EXAMPLE_ID");
}

describe("resolveShellRouteContext", () => {
  it("classifies every checked-in Workbench route entrypoint explicitly", () => {
    const registeredRoutes = readRegisteredRoutes();

    expect(registeredRoutes.map(({ routePattern }) => routePattern).sort()).toEqual(
      [...EXPECTED_REGISTERED_ROUTE_CONTEXT.keys()].sort()
    );

    for (const { routePattern } of registeredRoutes) {
      expect(resolveShellRouteContext(materializeRoutePattern(routePattern)), routePattern).toEqual(
        EXPECTED_REGISTERED_ROUTE_CONTEXT.get(routePattern)
      );
    }
  });

  it.each([
    ["risk", "risk"],
    ["advisor", "advisory"],
    ["advisor-brief", "advisory"],
    ["analysis", "performance"],
    ["unknown", "performance"],
  ] as const)("maps Performance mode %s to the %s workspace", (mode, workspaceId) => {
    expect(resolveShellRouteContext("/performance", new URLSearchParams({ mode }))).toEqual({
      scope: "workspace",
      workspaceId,
    });
  });

  it.each([
    "/portfolio-old",
    "/performances",
    "/recommendations-old",
    "/proposals-old",
    "/data-products-preview",
    "/suite-old",
    "/workbenchish",
  ])("does not infer a workspace from the sibling path %s", (pathname) => {
    expect(resolveShellRouteContext(pathname)).toEqual({
      scope: "unmatched",
      workspaceId: null,
    });
  });

  it("supports nested paths only beneath a registered route boundary", () => {
    expect(resolveShellRouteContext("/workbench/PORT001/evidence")).toEqual({
      scope: "workspace",
      workspaceId: "portfolio",
    });
    expect(resolveShellRouteContext("/proposals/PROPOSAL001/review")).toEqual({
      scope: "workspace",
      workspaceId: "proposal",
    });
  });

  it("declares destination-specific review periods with the shell routes", () => {
    expect(
      resolveShellDestinationReviewContextPolicy("/reports?mode=history"),
    ).toEqual({
      acceptedPeriods: ["7D", "30D", "MTD", "QTD", "YTD", "1Y", "SI"],
    });
    expect(
      resolveShellDestinationReviewContextPolicy("/performance?mode=risk"),
    ).toBeUndefined();
    expect(
      resolveShellDestinationReviewContextPolicy("/book"),
    ).toBeUndefined();
  });
});
