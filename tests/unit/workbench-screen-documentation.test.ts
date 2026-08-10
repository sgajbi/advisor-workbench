import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// @ts-expect-error The documentation gate is a Node .mjs script without a TypeScript declaration.
import { hasExactMarkdownHeading, validateScreenDocumentation } from "../../scripts/quality/check-workbench-screen-documentation.mjs";

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
  });

  it("covers every route and records the governed guide backlog", () => {
    const result = validate(loadRegistry());

    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual({
      routeEntrypoints: 21,
      activeSurfaces: 36,
      aliases: 2,
      mappedGuides: 1,
      coverageExceptions: 36,
      unmappedGuides: 35,
    });
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
      (candidate: { id: string }) => candidate.id === "proposal-simulation",
    );
    surface.fragment = "simulation";

    expect(validate(registry).errors).toContain(
      "Surface proposal-simulation fragment target does not exist: #simulation.",
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
