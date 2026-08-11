import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// @ts-expect-error The documentation gate is a Node .mjs script without a TypeScript declaration.
import { hasExactMarkdownHeading, isNextPageEntrypoint, validateModeAuthority, validateScreenDocumentation } from "../../scripts/quality/check-workbench-screen-documentation.mjs";

const rootDirectory = process.cwd();
const registryPath = path.join(
  rootDirectory,
  "docs/documentation/workbench-screen-registry.v1.json",
);

function loadRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function validate(registryData: ReturnType<typeof loadRegistry>) {
  return validateScreenDocumentation({ rootDirectory, registryData });
}

describe("Workbench screen documentation governance", () => {
  it("recognizes only complete Markdown heading lines outside code fences", () => {
    expect(hasExactMarkdownHeading("## Current Scope\n", "## Current Scope")).toBe(true);
    expect(hasExactMarkdownHeading("See ## Current Scope.\n", "## Current Scope")).toBe(false);
    expect(hasExactMarkdownHeading("## Current Scope And Limits\n", "## Current Scope")).toBe(false);
    expect(hasExactMarkdownHeading("    ## Current Scope\n", "## Current Scope")).toBe(false);
    expect(hasExactMarkdownHeading("```md\n## Current Scope\n```\n", "## Current Scope")).toBe(
      false,
    );
    expect(
      hasExactMarkdownHeading("````md\n```\n## Current Scope\n````\n", "## Current Scope"),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading("~~~md\n~~~js\n## Current Scope\n~~~\n", "## Current Scope"),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading("~~~md\nexample\n~~~   \n## Current Scope\n", "## Current Scope"),
    ).toBe(true);
  });

  it("discovers every default Next.js page extension", () => {
    expect(
      ["page.tsx", "page.ts", "page.jsx", "page.js"].every((filename) =>
        isNextPageEntrypoint(filename),
      ),
    ).toBe(true);
    expect(isNextPageEntrypoint("layout.tsx")).toBe(false);
  });

  it("covers every route and records the governed guide backlog", () => {
    const result = validate(loadRegistry());

    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual({
      routeEntrypoints: 21,
      activeSurfaces: 36,
      aliases: 2,
      mappedGuides: 2,
      coverageExceptions: 34,
      unmappedGuides: 34,
    });
  });

  it("maps Portfolio Review and its compatibility paths to one complete canonical guide", () => {
    const registry = loadRegistry();
    const portfolioReview = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-review",
    );
    const portfolioAliases = registry.routeEntrypoints.filter(
      (route: { canonicalSurfaceIds: string[] }) =>
        route.canonicalSurfaceIds.includes("portfolio-review"),
    );

    expect(portfolioReview).toMatchObject({
      routePattern: "/portfolio",
      wikiSlug: "Portfolio-Review-Screen-Guide",
      coverageException: null,
    });
    expect(portfolioAliases.map((route: { routePattern: string }) => route.routePattern)).toEqual(
      expect.arrayContaining(["/", "/portfolio", "/portfolios", "/suite"]),
    );
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Portfolio-Review-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("Workbench presentation classification");
    expect(guide).toContain("not source-owned readiness, approval, or suitability authority");
    expect(guide).toContain("it does not request detailed workflow or insight endpoints");
    expect(guide).toContain("not a persisted approval or browser-invented action");
    expect(guide).toContain("source-owned performance warnings and partial failures");
    expect(guide).toContain("supporting-request outages visible");
    expect(guide).toContain("retained but unrendered payload fields do not\nbecome visible evidence");
    expect(guide).toContain("Manage failures carried in `partial_failures` are rendered");
    expect(guide).toContain("the affected analytical scope is named");
    expect(guide).toContain("Reporting `READY` and `COMPLETE` use one canonical resolved-state mapping");
    expect(guide).toContain("a terminal unavailable response is not re-requested");
    expect(guide).toContain("only the Performance, Cashflow, or Reporting evidence actually present");
    expect(guide).toContain("not calculation lineage or supportability certification");
    expect(guide).toContain("Portfolio Review deliberately excludes record-oriented filters");
    expect(guide).toContain(
      "a complete dated book summary replaces totals, valuation date, and position-coverage readiness together",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("rejects a source route that disappears from the registry", () => {
    const registry = loadRegistry();
    registry.routeEntrypoints = registry.routeEntrypoints.filter(
      (route: { entrypoint: string }) => route.entrypoint !== "src/app/reports/page.tsx",
    );

    expect(validate(registry).errors).toContain(
      "Unregistered route entrypoint: src/app/reports/page.tsx.",
    );
  });

  it("executes the registry schema instead of accepting unknown fields", () => {
    const registry = loadRegistry();
    registry.unexpectedField = true;

    expect(validate(registry).errors).toContain(
      "Schema $: unexpected property unexpectedField.",
    );
  });

  it("rejects route patterns that drift from their Next.js entrypoint", () => {
    const registry = loadRegistry();
    registry.routeEntrypoints.find(
      (route: { entrypoint: string }) => route.entrypoint === "src/app/proposals/[proposalId]/page.tsx",
    ).routePattern = "/proposals/:proposalId";

    expect(validate(registry).errors).toContain(
      "Route src/app/proposals/[proposalId]/page.tsx must use derived pattern /proposals/{proposalId}, not /proposals/:proposalId.",
    );
  });

  it("rejects an active mode removed from its canonical route mapping", () => {
    const registry = loadRegistry();
    const route = registry.routeEntrypoints.find(
      (candidate: { routePattern: string }) => candidate.routePattern === "/performance",
    );
    route.canonicalSurfaceIds = route.canonicalSurfaceIds.filter(
      (surfaceId: string) => surfaceId !== "risk-review",
    );

    expect(validate(registry).errors).toContain(
      "Active surface risk-review is not mapped by its canonical route /performance.",
    );
  });

  it("rejects catalogue source-owner drift from the canonical registry", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "construction-alternatives",
    );
    surface.sourceOwners.push("lotus-risk");

    expect(validate(registry).errors).toContain(
      "Screen guide catalogue owners for construction-alternatives must be Gateway, Manage, and Risk, not Gateway and Manage.",
    );
  });

  it("rejects catalogue business-name drift from the canonical registry", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "construction-alternatives",
    );
    surface.businessName = "Construction Scenario";

    expect(validate(registry).errors).toContain(
      "Screen guide catalogue name for construction-alternatives must be Construction Scenario, not Construction Alternatives.",
    );
  });

  it("rejects catalogue guide status that contradicts coverage truth", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "advisor-book",
    );
    surface.coverageException = {
      issue: 605,
      plannedSlice: "book-and-portfolio-entry-guides",
      reason: "The guide is intentionally marked incomplete for this regression test.",
    };

    expect(validate(registry).errors).toContain(
      "Screen guide catalogue guide status for advisor-book must be Existing guide; complete-standard alignment planned, not Guide available.",
    );
  });

  it("rejects cyclic alias ownership", () => {
    const registry = loadRegistry();
    const alias = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "client-context-alias",
    );
    alias.canonicalSurfaceId = "client-context-alias";

    expect(validate(registry).errors).toContain(
      "Alias client-context-alias must terminate at a non-alias canonical surface; cycle detected at client-context-alias.",
    );
  });

  it("rejects fragment navigation without an implementation-owned target", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "client-context-alias",
    );
    surface.fragment = "simulation";

    expect(validate(registry).errors).toContain(
      "Surface client-context-alias fragment target does not exist: #simulation.",
    );
  });

  it("rejects an active screen without a guide or governed exception", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "report-centre",
    );
    surface.coverageException = null;

    expect(validate(registry).errors).toContain(
      "Active surface report-centre has neither a wiki guide nor a coverage exception.",
    );
  });

  it("rejects duplicate guide ownership", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-review",
    );
    surface.wikiSlug = "Advisor-Book-Workflow";

    expect(validate(registry).errors).toContain(
      "Duplicate active wiki slug: Advisor-Book-Workflow.",
    );
  });

  it("rejects drift from source-owned mode definitions", () => {
    const registry = loadRegistry();
    delete registry.modeAuthorities.find(
      (authority: { family: string }) => authority.family === "performance",
    ).surfaceMappings.risk;

    expect(validate(registry).errors).toContain(
      "Mode authority performance has unmapped source mode: risk.",
    );
  });

  it("keeps PM Operating Quality ownership aligned to its AI workflow evidence", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "pm-operating-quality",
    );

    expect(surface.sourceOwners).toEqual(["lotus-gateway", "lotus-manage", "lotus-ai"]);
    expect(surface.implementationEvidence).toEqual(
      expect.arrayContaining([
        "src/features/workbench/pm-operating-quality-api.ts",
        "src/features/workbench/components/pm-operating-quality-summary-invocations-card.tsx",
      ]),
    );
  });

  it.each([
    "performance",
    "performance-aliases",
    "manage",
    "advisory-journey",
    "proposal-lifecycle",
  ])("rejects removal of the required %s mode authority", (family) => {
    const registry = loadRegistry();
    registry.modeAuthorities = registry.modeAuthorities.filter(
      (authority: { family: string }) => authority.family !== family,
    );

    expect(validate(registry).errors).toContain(`Required mode authority is missing: ${family}.`);
  });

  it("rejects duplicate mode-authority families", () => {
    const registry = loadRegistry();
    registry.modeAuthorities.push(structuredClone(registry.modeAuthorities[0]));

    expect(validate(registry).errors).toContain(
      "Duplicate mode authority family: performance.",
    );
  });

  it("rejects unexpected mode-authority families", () => {
    const registry = loadRegistry();
    registry.modeAuthorities[0].family = "performance-copy";

    expect(validate(registry).errors).toContain(
      "Unexpected mode authority family: performance-copy.",
    );
  });

  it("rejects drift from supported mode aliases", () => {
    const registry = loadRegistry();
    delete registry.modeAuthorities.find(
      (authority: { family: string }) => authority.family === "performance-aliases",
    ).surfaceMappings["advisor-brief"];

    expect(validate(registry).errors).toContain(
      "Mode authority performance-aliases has unmapped source mode: advisor-brief.",
    );
  });

  it("rejects a source alias target that differs from its canonical registry target", () => {
    const registry = loadRegistry();
    const authority = registry.modeAuthorities.find(
      (candidate: { family: string }) => candidate.family === "performance-aliases",
    );
    const source = fs
      .readFileSync(path.join(rootDirectory, authority.source), "utf8")
      .replace('"advisor-brief": "advisor"', '"advisor-brief": "risk"');

    expect(validateModeAuthority(authority, source, registry.surfaces)).toContain(
      "Mode authority performance-aliases source alias advisor-brief targets risk, but performance-advisor-brief-alias resolves to canonical mode advisor.",
    );
  });

  it("rejects evidence paths that cannot be inspected", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-review",
    );
    surface.implementationEvidence = ["src/features/portfolio/missing-screen.tsx"];

    expect(validate(registry).errors).toContain(
      "Surface portfolio-review evidence does not exist: src/features/portfolio/missing-screen.tsx.",
    );
  });
});
