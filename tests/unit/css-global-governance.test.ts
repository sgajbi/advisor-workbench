import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface CssBudget {
  path: string;
  maxLines: number;
  maxBytes: number;
  owner?: string;
}

interface CssBaseline {
  entrypoint: CssBudget & {
    imports: string[];
  };
  modules: CssBudget[];
}

interface CssGovernanceModule {
  validateCssGlobalGovernance(input: { repoRoot: string; baseline: CssBaseline }): void;
}

// @ts-expect-error The governance gate is a Node .mjs script without a TypeScript declaration.
const governanceModulePromise = import("../../scripts/quality/check-css-global-governance.mjs") as Promise<CssGovernanceModule>;

function lineCountForBaseline(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return text.endsWith("\n") ? text.split(/\r?\n/).length - 1 : text.split(/\r?\n/).length;
}

function normalizedBytesForBaseline(text: string): number {
  return Buffer.byteLength(text.replace(/\r\n/g, "\n"), "utf8");
}

function writeFixtureFile(repoRoot: string, relativePath: string, text: string): CssBudget {
  const filePath = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text, "utf8");

  return {
    path: relativePath.replaceAll("\\", "/"),
    maxLines: lineCountForBaseline(text),
    maxBytes: normalizedBytesForBaseline(text),
  };
}

function createFixture() {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "lotus-workbench-css-governance-"));
  const globalsText =
    '@import "../styles/global/tokens.css";\n@import "../styles/global/base.css";\n';
  const tokensText = ":root {\r\n  --bg: #fff;\r\n}\r\n";
  const baseText = "body {\n  margin: 0;\n}\n";

  const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
  const tokenBudget = writeFixtureFile(repoRoot, "src/styles/global/tokens.css", tokensText);
  const baseBudget = writeFixtureFile(repoRoot, "src/styles/global/base.css", baseText);

  const baseline: CssBaseline = {
    entrypoint: {
      ...entrypointBudget,
      imports: [
        '@import "../styles/global/tokens.css";',
        '@import "../styles/global/base.css";',
      ],
    },
    modules: [
      { ...tokenBudget, owner: "fixture tokens" },
      { ...baseBudget, owner: "fixture base" },
    ],
  };

  return { repoRoot, baseline };
}

describe("CSS global governance gate", () => {
  it("accepts exact ratchet baselines and local imports with module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      expect(() => validateCssGlobalGovernance({ repoRoot, baseline })).not.toThrow();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects local global imports that do not have module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baselineWithMissingImportBudget: CssBaseline = {
        ...baseline,
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("base.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithMissingImportBudget,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects stale max-line headroom when a CSS layer has been reduced", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const staleBaseline: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("tokens.css")
            ? { ...moduleBudget, maxLines: moduleBudget.maxLines + 1 }
            : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: staleBaseline,
        }),
      ).toThrow(/baseline still allows/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
