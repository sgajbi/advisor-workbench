import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const proposalDocs = [
  "README.md",
  "docs/rfcs/RFC-0001-dpm-first-proposal-simulation-screen.md",
  "docs/rfcs/RFC-0002-ui-proposal-workspace-v1.md",
];

describe("proposal ownership documentation", () => {
  it("keeps proposal simulation documented as Gateway-backed advisory flow", () => {
    const text = proposalDocs
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(text).toContain("`lotus-advise` advisory proposal contract");
    expect(text).toContain("Gateway-backed advisory proposal draft entry");
    expect(text).toContain("POST /api/v1/proposals/simulate");
    expect(text).not.toContain("lotus-gateway + lotus-manage");
    expect(text).not.toContain("lotus-manage-compatible");
    expect(text).not.toContain("integrated through lotus-gateway to lotus-manage only");
  });
});
