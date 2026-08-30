import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

type FeatureTransportViolation = {
  file: string;
  expected: number;
  actual: number;
};

type FeatureTransportBoundaryModule = {
  findFeatureTransportBoundaryViolations: (options: {
    repoRoot: string;
    baseline: Record<string, number>;
  }) => FeatureTransportViolation[];
  validateFeatureTransportBoundary: (options: {
    repoRoot: string;
    baseline: Record<string, number>;
  }) => void;
};

const boundaryModulePromise =
  // @ts-expect-error The repository quality gate is a Node .mjs script without a TypeScript declaration.
  import("../../scripts/quality/check-feature-transport-boundary.mjs") as Promise<FeatureTransportBoundaryModule>;

function fixtureRepo(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "lotus-feature-transport-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(root, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
  }
  return root;
}

describe("feature transport boundary gate", () => {
  it("rejects a new raw feature fetch outside the exact baseline", async () => {
    const { validateFeatureTransportBoundary } = await boundaryModulePromise;
    const repoRoot = fixtureRepo({
      "src/features/proposals/api.ts": "export const load = () => fetch('/raw');",
    });

    try {
      expect(() =>
        validateFeatureTransportBoundary({ repoRoot, baseline: {} }),
      ).toThrow(/src\/features\/proposals\/api\.ts: expected 0.*observed 1/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects growth in a bounded legacy transport owner", async () => {
    const { findFeatureTransportBoundaryViolations } = await boundaryModulePromise;
    const repoRoot = fixtureRepo({
      "src/features/intake/api.ts": "fetch('/one'); fetch('/two');",
    });

    try {
      expect(
        findFeatureTransportBoundaryViolations({
          repoRoot,
          baseline: { "src/features/intake/api.ts": 1 },
        }),
      ).toEqual([
        { file: "src/features/intake/api.ts", expected: 1, actual: 2 },
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("requires the baseline to ratchet when an exception is removed", async () => {
    const { findFeatureTransportBoundaryViolations } = await boundaryModulePromise;
    const repoRoot = fixtureRepo({
      "src/features/intake/api.ts": "export const value = 1;",
    });

    try {
      expect(
        findFeatureTransportBoundaryViolations({
          repoRoot,
          baseline: { "src/features/intake/api.ts": 1 },
        }),
      ).toEqual([
        { file: "src/features/intake/api.ts", expected: 1, actual: 0 },
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
