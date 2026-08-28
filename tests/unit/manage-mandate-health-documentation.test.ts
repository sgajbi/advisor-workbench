import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

describe("mandate health documentation truth", () => {
  it("keeps repository context aligned to the source-owned selected-item workflow", () => {
    const context = readRepositoryFile("REPOSITORY-ENGINEERING-CONTEXT.md");
    const normalizedContext = context.replace(/\s+/g, " ");

    expect(normalizedContext).toContain("as one selected review-item workflow");
    expect(normalizedContext).toContain(
      "Summary meters render only when Manage publishes a usable score",
    );
    expect(normalizedContext).toContain("does not calculate mandate health");
    expect(normalizedContext).toContain("infer readiness or priority from exception count");
  });

  it("publishes the implementation boundary and canonical evidence standard", () => {
    const supportedFeatures = readRepositoryFile("wiki/Supported-Features.md");
    const screenGuide = readRepositoryFile("wiki/Mandate-Health-Screen-Guide.md");
    const apiSurface = readRepositoryFile("wiki/API-Surface.md");
    const integrations = readRepositoryFile("wiki/Integrations.md");
    const runbook = readRepositoryFile(
      "docs/operations/canonical-front-office-local-runtime.md",
    );

    expect(supportedFeatures).toContain("Manage overview and mandate health");
    expect(supportedFeatures).toContain("[Mandate Health](Mandate-Health-Screen-Guide)");
    expect(screenGuide).toContain("selected-item accountability and next step");
    expect(apiSurface).toContain("exception-specific owners and next steps");
    expect(integrations).toContain("Missing scores, owners, actions, and evidence remain");
    expect(runbook).toContain("selects a source-owned attention item with the keyboard");
    expect(runbook).toContain("effective 200% zoom");
    expect(runbook).toContain("must not introduce horizontal scrolling");
  });

  it("records the adopted and rejected workflow patterns durably", () => {
    const ledger = readRepositoryFile(
      "docs/product/WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md",
    );
    const section = ledger.split("### DPM mandate review workflow — 2026-08-09")[1];

    expect(section).toContain("#### Adopted decisions");
    expect(section).toContain("#### Rejected decisions");
    expect(section).toContain("Inferring mandate readiness from the number of active exceptions");
    expect(section).toContain("Render a summary meter only when Manage publishes a usable score");
  });
});
