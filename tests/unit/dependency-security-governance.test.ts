import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = join(__dirname, "..", "..");

function readRepositoryFile(...segments: string[]): string {
  return readFileSync(join(repositoryRoot, ...segments), "utf8");
}

describe("dependency security governance", () => {
  it("enforces high-risk toolchain and moderate-risk production audit thresholds", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["security:audit"]).toBe(
      "npm audit --audit-level=high && npm audit --omit=dev --audit-level=moderate",
    );
  });

  it("keeps the security gate in local check and protected CI lanes", () => {
    const makefile = readRepositoryFile("Makefile");

    expect(makefile).toMatch(/security:\r?\n\tnpm run security:audit/);
    expect(makefile).toMatch(/check: security lint typecheck test-coverage build/);

    for (const workflowName of [
      "feature-lane.yml",
      "pr-merge-gate.yml",
      "main-releasability.yml",
    ]) {
      const workflow = readRepositoryFile(".github", "workflows", workflowName);

      expect(workflow).toContain("name: Dependency Security Gate");
      expect(workflow).toContain("run: make security");
    }
  });
});
