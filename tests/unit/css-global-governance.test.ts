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
  forbiddenSelectorPrefixes?: string[];
  cssModuleEscapes: {
    root: string;
    defaultMaxGlobalEscapes: number;
    exceptions: Array<{
      path: string;
      maxGlobalEscapes: number;
    }>;
  };
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
    cssModuleEscapes: {
      root: "src",
      defaultMaxGlobalEscapes: 0,
      exceptions: [],
    },
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

  it("parses valid local url and single-quoted imports before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import url("../styles/global/tokens.css");\n@import \'../styles/global/base.css\';\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithAlternateImportSyntax: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import url("../styles/global/tokens.css");',
            "@import '../styles/global/base.css';",
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("base.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithAlternateImportSyntax,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("normalizes CSS comments inside URL imports before resolving module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import url(/**/"../styles/global/tokens.css");\n@import url(../styles/global/base.css/**/);\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithCommentedUrlImports: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import url(/**/"../styles/global/tokens.css");',
            "@import url(../styles/global/base.css/**/);",
          ],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithCommentedUrlImports,
        }),
      ).not.toThrow();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses local imports with whitespace before the semicolon before checking budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import "../styles/global/tokens.css" ;\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithWhitespaceBeforeSemicolon: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import "../styles/global/tokens.css" ;',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithWhitespaceBeforeSemicolon,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses bare relative imports before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText = '@import "tokens.css";\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const bareRelativeBudget = writeFixtureFile(repoRoot, "src/app/tokens.css", ":root {\n  --accent: #123456;\n}\n");
      const baselineWithBareRelativeImport: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: ['@import "tokens.css";', '@import "../styles/global/base.css";'],
        },
        modules: [
          ...baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
          bareRelativeBudget,
        ],
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: {
            ...baselineWithBareRelativeImport,
            modules: baselineWithBareRelativeImport.modules.filter(
              (moduleBudget) => moduleBudget.path !== bareRelativeBudget.path,
            ),
          },
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("does not require module budgets for external imports", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import "https://cdn.example.invalid/reset.css";\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithExternalImport: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import "https://cdn.example.invalid/reset.css";',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithExternalImport,
        }),
      ).not.toThrow();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses local imports with trailing comments before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import "../styles/global/tokens.css"; /* compatibility layer */\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithTrailingComment: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import "../styles/global/tokens.css"; /* compatibility layer */',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithTrailingComment,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses URL imports case-insensitively before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import URL("../styles/global/tokens.css");\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithUppercaseUrlImport: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import URL("../styles/global/tokens.css");',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithUppercaseUrlImport,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects malformed URL imports with multiple target values", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import url("../styles/global/tokens.css", "../styles/global/other.css");\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithMalformedUrlImport: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import url("../styles/global/tokens.css", "../styles/global/other.css");',
            '@import "../styles/global/base.css";',
          ],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithMalformedUrlImport,
        }),
      ).toThrow(/only valid import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects malformed quoted imports with extra target values", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import "../styles/global/tokens.css", "../styles/global/other.css";\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithMalformedQuotedImport: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import "../styles/global/tokens.css", "../styles/global/other.css";',
            '@import "../styles/global/base.css";',
          ],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithMalformedQuotedImport,
        }),
      ).toThrow(/only valid import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses local URL imports with comment-separated conditions before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import url("../styles/global/tokens.css")/**/screen;\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithCommentSeparatedConditions: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import url("../styles/global/tokens.css")/**/screen;',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithCommentSeparatedConditions,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses local URL imports with comma-separated media queries before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import url("../styles/global/tokens.css") screen, print;\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithMediaQueryList: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import url("../styles/global/tokens.css") screen, print;',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter(
          (moduleBudget) => !moduleBudget.path.endsWith("tokens.css"),
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithMediaQueryList,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects URL imports with empty conditional media entries", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import/**/url("../styles/global/tokens.css"),;\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithTrailingMediaComma: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import/**/url("../styles/global/tokens.css"),;',
            '@import "../styles/global/base.css";',
          ],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithTrailingMediaComma,
        }),
      ).toThrow(/only valid import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("parses local URL imports with layer, supports, and media conditions before checking module budgets", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import url("../styles/global/tokens.css") layer(tokens) supports(display: grid) screen;\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithConditionalImport: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import url("../styles/global/tokens.css") layer(tokens) supports(display: grid) screen;',
            '@import "../styles/global/base.css";',
          ],
        },
        modules: baseline.modules.filter((moduleBudget) => !moduleBudget.path.endsWith("tokens.css")),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithConditionalImport,
        }),
      ).toThrow(/imports local global CSS files without module budgets/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects same-line declarations after import statements in the entrypoint", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const globalsText =
        '@import "../styles/global/tokens.css"; body { display: none; }\n@import "../styles/global/base.css";\n';
      const entrypointBudget = writeFixtureFile(repoRoot, "src/app/globals.css", globalsText);
      const baselineWithSameLineDeclaration: CssBaseline = {
        ...baseline,
        entrypoint: {
          ...baseline.entrypoint,
          ...entrypointBudget,
          imports: [
            '@import "../styles/global/tokens.css"; body { display: none; }',
            '@import "../styles/global/base.css";',
          ],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithSameLineDeclaration,
        }),
      ).toThrow(/only valid import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects nested imports inside governed CSS modules", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithNestedImport = '@import "./unbudgeted.css";\nbody {\n  margin: 0;\n}\n';
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithNestedImport,
      );
      writeFixtureFile(repoRoot, "src/styles/global/unbudgeted.css", ".unsafe {\n  color: red;\n}\n");
      const baselineWithNestedModuleImport: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithNestedModuleImport,
        }),
      ).toThrow(/must not contain CSS @import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("accepts CSS module strings and comments that mention import text without real at-rules", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithImportTextOnly =
        '.before { content: "@import \\"./not-a-real-import.css\\""; }\n/* @import "./also-not-real.css"; */\nbody {\n  margin: 0;\n}\n';
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithImportTextOnly,
      );
      const baselineWithImportTextOnly: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithImportTextOnly,
        }),
      ).not.toThrow();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects nested imports without whitespace inside governed CSS modules", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithWhitespaceFreeNestedImport = '@import"./unbudgeted.css";\nbody {\n  margin: 0;\n}\n';
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithWhitespaceFreeNestedImport,
      );
      writeFixtureFile(repoRoot, "src/styles/global/unbudgeted.css", ".unsafe {\n  color: red;\n}\n");
      const baselineWithWhitespaceFreeNestedModuleImport: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithWhitespaceFreeNestedModuleImport,
        }),
      ).toThrow(/must not contain CSS @import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects comment-separated nested URL imports inside governed CSS modules", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithCommentSeparatedNestedImport =
        '@import/**/url("./unbudgeted.css");\nbody {\n  margin: 0;\n}\n';
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithCommentSeparatedNestedImport,
      );
      writeFixtureFile(repoRoot, "src/styles/global/unbudgeted.css", ".unsafe {\n  color: red;\n}\n");
      const baselineWithCommentSeparatedNestedModuleImport: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithCommentSeparatedNestedModuleImport,
        }),
      ).toThrow(/must not contain CSS @import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("preserves CSS strings while detecting nested imports inside governed CSS modules", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithStringCommentDelimitersAroundNestedImport =
        '.before { content: "/*"; }\n@import "./unbudgeted.css";\n.after { content: "*/"; }\nbody {\n  margin: 0;\n}\n';
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithStringCommentDelimitersAroundNestedImport,
      );
      writeFixtureFile(repoRoot, "src/styles/global/unbudgeted.css", ".unsafe {\n  color: red;\n}\n");
      const baselineWithStringDelimitedNestedImport: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithStringDelimitedNestedImport,
        }),
      ).toThrow(/must not contain CSS @import statements/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("counts escape parity before closing CSS strings while detecting nested imports", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithEvenBackslashStringBeforeNestedImport =
        [
          String.raw`.before { content: "\\\\"; }`,
          '@import "./unbudgeted.css";',
          "body {",
          "  margin: 0;",
          "}",
        ].join("\n") + "\n";
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithEvenBackslashStringBeforeNestedImport,
      );
      writeFixtureFile(repoRoot, "src/styles/global/unbudgeted.css", ".unsafe {\n  color: red;\n}\n");
      const baselineWithBackslashStringImport: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithBackslashStringImport,
        }),
      ).toThrow(/must not contain CSS @import statements/);
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

  it("rejects imported module budgets without finite numeric limits", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const malformedBaseline: CssBaseline = {
        ...baseline,
        modules: baseline.modules.map((moduleBudget) => {
          if (!moduleBudget.path.endsWith("tokens.css")) {
            return moduleBudget;
          }

          const { maxLines: _maxLines, ...moduleBudgetWithoutLineLimit } = moduleBudget;
          return moduleBudgetWithoutLineLimit as CssBudget;
        }),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: malformedBaseline,
        }),
      ).toThrow(/finite non-negative integer maxLines/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects migrated component selector families when they return to global CSS", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const baseWithMigratedSelector =
        "body {\n  margin: 0;\n}\n.portfolio-screen-rail-link {\n  color: white;\n}\n";
      const updatedBaseBudget = writeFixtureFile(
        repoRoot,
        "src/styles/global/base.css",
        baseWithMigratedSelector,
      );
      const baselineWithForbiddenSelector: CssBaseline = {
        ...baseline,
        forbiddenSelectorPrefixes: ["portfolio-screen-rail"],
        modules: baseline.modules.map((moduleBudget) =>
          moduleBudget.path.endsWith("base.css") ? updatedBaseBudget : moduleBudget,
        ),
      };

      expect(() =>
        validateCssGlobalGovernance({
          repoRoot,
          baseline: baselineWithForbiddenSelector,
        }),
      ).toThrow(/Migrated component selectors must not return/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects malformed migrated selector prefix configuration", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      const malformedBaseline = {
        ...baseline,
        forbiddenSelectorPrefixes: [""],
      };

      expect(() =>
        validateCssGlobalGovernance({ repoRoot, baseline: malformedBaseline }),
      ).toThrow(/array of non-empty strings/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a new global escape in an otherwise scoped CSS module", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;

    try {
      writeFixtureFile(
        repoRoot,
        "src/features/example/example.module.css",
        ".root :global(.unsafe) {\n  color: red;\n}\n",
      );

      expect(() => validateCssGlobalGovernance({ repoRoot, baseline })).toThrow(
        /has 1 :global\(\.\.\.\) escapes; budget is 0/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("accepts an exact reviewed CSS module escape exception", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;
    const modulePath = "src/features/example/example.module.css";

    try {
      writeFixtureFile(
        repoRoot,
        modulePath,
        ".root :global(.interop) {\n  color: inherit;\n}\n",
      );
      const baselineWithException: CssBaseline = {
        ...baseline,
        cssModuleEscapes: {
          ...baseline.cssModuleEscapes,
          exceptions: [{ path: modulePath, maxGlobalEscapes: 1 }],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({ repoRoot, baseline: baselineWithException }),
      ).not.toThrow();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects stale CSS module escape headroom after selectors are scoped", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;
    const modulePath = "src/features/example/example.module.css";

    try {
      writeFixtureFile(repoRoot, modulePath, ".root {\n  color: inherit;\n}\n");
      const staleBaseline: CssBaseline = {
        ...baseline,
        cssModuleEscapes: {
          ...baseline.cssModuleEscapes,
          exceptions: [{ path: modulePath, maxGlobalEscapes: 1 }],
        },
      };

      expect(() =>
        validateCssGlobalGovernance({ repoRoot, baseline: staleBaseline }),
      ).toThrow(/baseline still allows 1/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects CSS module escape exceptions for missing modules", async () => {
    const { repoRoot, baseline } = createFixture();
    const { validateCssGlobalGovernance } = await governanceModulePromise;
    const baselineWithOrphanException: CssBaseline = {
      ...baseline,
      cssModuleEscapes: {
        ...baseline.cssModuleEscapes,
        exceptions: [
          {
            path: "src/features/retired/retired.module.css",
            maxGlobalEscapes: 1,
          },
        ],
      },
    };

    try {
      expect(() =>
        validateCssGlobalGovernance({ repoRoot, baseline: baselineWithOrphanException }),
      ).toThrow(/references missing modules/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
