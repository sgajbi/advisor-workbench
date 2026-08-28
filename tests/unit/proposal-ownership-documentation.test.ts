import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const proposalDocs = [
  "README.md",
  "docs/demo/README.md",
  "docs/rfcs/README.md",
  "docs/rfcs/RFC-0001-dpm-first-proposal-simulation-screen.md",
  "docs/rfcs/RFC-0002-ui-proposal-workspace-v1.md",
  "docs/rfcs/RFC-0008-advisory-iterative-intent-builder-for-proposal-simulation.md",
  "wiki/Proposal-Builder-Screen-Guide.md",
  "wiki/API-Surface.md",
  "wiki/Architecture.md",
];

describe("proposal ownership documentation", () => {
  it("keeps proposal simulation documented as Gateway-backed advisory flow", () => {
    const text = proposalDocs
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(text).toContain("`lotus-advise` advisory proposal contract");
    expect(text).toContain("Gateway-backed advisory proposal draft entry");
    expect(text).toContain("/api/v1/advisory-workspaces*");
    expect(text).not.toContain("lotus-gateway + lotus-manage");
    expect(text).not.toContain("lotus-manage-compatible");
    expect(text).not.toContain("lotus-manage-First Proposal Simulation Screen");
    expect(text).not.toContain("lotus-manage running at `http://manage.dev.lotus`");
    expect(text).not.toContain("POST /api/v1/proposals/simulate");
    expect(text).not.toContain("compatibility draft entry");
    expect(text).not.toContain("integrated through lotus-gateway to lotus-manage only");
  });

  it("keeps Workbench proposal construction on the stateful advisory workspace", () => {
    const proposalApi = readFileSync("src/features/proposals/api.ts", "utf8");

    expect(proposalApi).toContain("/advisory-workspaces");
    expect(proposalApi).not.toContain("/proposals/simulate");
    expect(proposalApi).not.toContain("simulateProposal");
    expect(
      existsSync("src/features/proposals/simulation-payload.ts"),
    ).toBe(false);
  });
});
