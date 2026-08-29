import { execFile, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  evaluateProductCopyRepository,
  evaluateProductCopySource,
  productCopyUnresolvedDigest,
  scanProductCopySource,
} from "../../scripts/quality/check-product-copy-governance.mjs";

// The exact repository scan parses every productive TypeScript source file. Run
// it asynchronously outside the Vitest worker so the CPU-bound census cannot
// starve Vitest's control channel under whole-suite coverage. The child and test
// retain finite ceilings without relaxing inventory or zero-headroom semantics.
const REPOSITORY_SCAN_TIMEOUT_MS = 180_000;
const STATIC_CLI_TEST_TIMEOUT_MS = 15_000;
const execFileAsync = promisify(execFile);
const productCopyChecker = join(
  process.cwd(),
  "scripts",
  "quality",
  "check-product-copy-governance.mjs",
);

function scan(sourceText: string) {
  return scanProductCopySource({ filePath: "src/example.tsx", sourceText });
}

function evaluateRepository(files: Record<string, string>) {
  const temporaryRepository = mkdtempSync(
    join(tmpdir(), "lotus-product-copy-repository-"),
  );
  try {
    for (const [filePath, sourceText] of Object.entries(files)) {
      const absolutePath = join(temporaryRepository, filePath);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, sourceText, "utf8");
    }
    const configDirectory = join(temporaryRepository, "config");
    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(
      join(configDirectory, "product-copy-exceptions.v1.json"),
      JSON.stringify({
        entries: [],
        governingIssue:
          "https://github.com/sgajbi/lotus-workbench/issues/798",
        schemaVersion: "product-copy-exceptions.v1",
      }),
      "utf8",
    );
    return evaluateProductCopyRepository(temporaryRepository);
  } finally {
    rmSync(temporaryRepository, { recursive: true, force: true });
  }
}

function scanRepository(files: Record<string, string>) {
  return evaluateRepository(files).findings;
}

type ProductCopyException = {
  id: string;
  filePath: string;
  ruleId: string;
  context: string;
  exactText: string;
  expectedMatches: number;
  reason: string;
  reviewUrl: string;
};

function runCliWithBaseline(
  sourceText: string,
  baseline: number,
  entries: ProductCopyException[] = [],
  unresolvedBaseline = 0,
  expectedUnresolvedDigest?: string,
) {
  const temporaryRepository = mkdtempSync(
    join(tmpdir(), "lotus-product-copy-"),
  );
  const sourceDirectory = join(temporaryRepository, "src");
  const configDirectory = join(temporaryRepository, "config");
  mkdirSync(sourceDirectory);
  mkdirSync(configDirectory);
  writeFileSync(join(sourceDirectory, "example.tsx"), sourceText, "utf8");
  writeFileSync(
    join(configDirectory, "product-copy-exceptions.v1.json"),
    JSON.stringify({
      schemaVersion: "product-copy-exceptions.v1",
      governingIssue: "https://github.com/sgajbi/lotus-workbench/issues/798",
      entries,
    }),
    "utf8",
  );

  try {
    const unresolvedDigest = expectedUnresolvedDigest
      ?? productCopyUnresolvedDigest(
        evaluateProductCopyRepository(temporaryRepository).unresolvedExpressions,
      );
    return spawnSync(
      process.execPath,
      [
        productCopyChecker,
        `--max=${baseline}`,
        `--max-unresolved=${unresolvedBaseline}`,
        `--unresolved-digest=${unresolvedDigest}`,
      ],
      { cwd: temporaryRepository, encoding: "utf8" },
    );
  } finally {
    rmSync(temporaryRepository, { recursive: true, force: true });
  }
}

describe("product-copy governance", () => {
  it("rejects transport and auditor language in productive JSX", () => {
    const findings = scan(`
      export function Example() {
        return <Panel title="Gateway supportability posture" />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "engineering-supportability",
    ]);
  });

  it("rejects technical copy in JSX expressions and copy properties", () => {
    const findings = scan(`
      const copy = {
        title: "Review unavailable",
        body: "RFC-0028 evidence was not source-confirmed",
      };
      export function Example() {
        return <p>{false ? "HTTP status unavailable" : "READY_FOR_REVIEW"}</p>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "engineering-rfc",
      "source-confirmed",
      "raw-enum",
    ]);
  });

  it("resolves local constant copy rendered through JSX", () => {
    const findings = scan(`
      const panelTitle = "Gateway posture";
      export function Example() {
        return <Panel title={panelTitle} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) => finding.context === "JSX title")).toBe(
      true,
    );
  });

  it("counts every rendered use of the same resolved copy literal", () => {
    const findings = scan(`
      const COPY = { panelTitle: "Gateway posture" } as const;
      export function Example() {
        return <Panel
          title={COPY.panelTitle}
          description={COPY.panelTitle}
        />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(new Set(findings.map((finding) => finding.line)).size).toBe(2);
  });

  it("counts every rendered use of composite scalar copy aliases", () => {
    const expressions = [
      "suppliedTitle ?? technicalTitle",
      "suppliedTitle || technicalTitle",
      "ready && technicalTitle",
    ];

    for (const expression of expressions) {
      const findings = scan(`
        const technicalTitle = "Gateway posture";
        const title = ${expression};
        export function Example({ ready, suppliedTitle }) {
          return <>
            <Panel title={title} />
            <Panel description={title} />
          </>;
        }
      `);

      expect(findings.map((finding) => finding.ruleId)).toEqual([
        "transport-gateway",
        "auditor-posture",
        "transport-gateway",
        "auditor-posture",
      ]);
      expect(new Set(findings.map((finding) => finding.line)).size).toBe(2);
    }
  });

  it("inspects only the rendered side of logical-AND JSX copy", () => {
    const findings = scan(`
      const directCopy = "Gateway posture";
      const aliasedCopy = ready && "HTTP status unavailable";
      export function Example({ ready }) {
        return <>
          {ready && directCopy}
          {aliasedCopy}
        </>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("inspects only the reachable branch of statically resolved scalar conditionals", () => {
    const hidden = scan(`
      const ready = false;
      const technicalTitle = "Gateway posture";
      const title = ready ? technicalTitle : "Client review status";
      export const Example = () => <Panel title={title} />;
    `);
    const reachable = scan(`
      const ready = true;
      const technicalTitle = "Gateway posture";
      const title = ready ? technicalTitle : "Client review status";
      export const Example = () => <Panel title={title} />;
    `);

    expect(hidden).toEqual([]);
    expect(reachable.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("inspects scalar candidates of unresolved conditional aliases", () => {
    const findings = scan(`
      export function Example({ ready }) {
        const title = ready ? "Gateway posture" : "Client review";
        return <Panel title={title} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("measures user-facing expressions whose productive copy cannot be resolved", () => {
    const evaluation = evaluateProductCopySource({
      filePath: "src/example.tsx",
      sourceText: `
        declare const suppliedTitle: string;
        export const Example = () => <Panel title={suppliedTitle} />;
      `,
    });

    expect(evaluation.findings).toEqual([]);
    expect(evaluation.unresolvedExpressions).toEqual([
      expect.objectContaining({
        context: "JSX title",
        filePath: "src/example.tsx",
      }),
    ]);
  });

  it("governs native accessibility labels as user-facing copy", () => {
    const evaluation = evaluateProductCopySource({
      filePath: "src/example.tsx",
      sourceText: `
        declare const suppliedLabel: string;
        export const Example = () => <>
          <button aria-label="Gateway posture" />
          <button aria-label={suppliedLabel} />
        </>;
      `,
    });

    expect(evaluation.findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(evaluation.unresolvedExpressions).toHaveLength(1);
    expect(evaluation.unresolvedExpressions[0]?.context).toBe("JSX aria-label");
  });

  it("does not classify statically inspected business copy as unresolved", () => {
    const evaluation = evaluateProductCopySource({
      filePath: "src/example.tsx",
      sourceText: `
        const title = "Client review";
        export const Example = () => <Panel title={title} />;
      `,
    });

    expect(evaluation.findings).toEqual([]);
    expect(evaluation.unresolvedExpressions).toEqual([]);
  });

  it("inspects only the reachable branch of inline scalar conditionals", () => {
    const hidden = scan(`
      export const Example = () => (
        <Panel title={false ? "Gateway posture" : "Client review"} />
      );
    `);
    const reachable = scan(`
      export const Example = () => (
        <Panel title={true ? "Gateway posture" : "Client review"} />
      );
    `);

    expect(hidden).toEqual([]);
    expect(reachable.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("inspects only reachable branches of rendered coalescing expressions", () => {
    const hiddenNullishFallback = scan(`
      const businessTitle = "Client review status";
      const technicalTitle = "Gateway posture";
      export const Example = () => <>{businessTitle ?? technicalTitle}</>;
    `);
    const hiddenLogicalFallback = scan(`
      const businessTitle = "Client review status";
      const technicalTitle = "Gateway posture";
      export const Example = () => <>{businessTitle || technicalTitle}</>;
    `);
    const hiddenLogicalAnd = scan(`
      const technicalTitle = "Gateway posture";
      export const Example = () => <>{false && technicalTitle}</>;
    `);
    const reachable = [
      scan(`
        const technicalTitle = "Gateway posture";
        export const Example = () => <>{null ?? technicalTitle}</>;
      `),
      scan(`
        const technicalTitle = "Gateway posture";
        export const Example = () => <>{false || technicalTitle}</>;
      `),
      scan(`
        const technicalTitle = "Gateway posture";
        export const Example = ({ suppliedTitle }) => (
          <>{suppliedTitle ?? technicalTitle}</>
        );
      `),
    ];

    expect(hiddenNullishFallback).toEqual([]);
    expect(hiddenLogicalFallback).toEqual([]);
    expect(hiddenLogicalAnd).toEqual([]);
    for (const findings of reachable) {
      expect(findings.map((finding) => finding.ruleId)).toEqual([
        "transport-gateway",
        "auditor-posture",
      ]);
    }
  });

  it("treats templates with nonempty static copy as truthy", () => {
    const findings = scan(`
      const technicalTitle = "Gateway posture";
      export function Example({ name }) {
        return <Panel title={\`Client \${name}\` || technicalTitle} />;
      }
    `);

    expect(findings).toEqual([]);
  });

  it("proves only statically nonempty template interpolations truthy", () => {
    const nonemptyFindings = scan(`
      const numericIdentity = 1;
      const absentIdentity = undefined;
      const technicalTitle = "Gateway posture";
      export function Example() {
        return <>
          <Panel title={\`\${"Client"}\` || technicalTitle} />
          <Panel title={\`\${numericIdentity}\` || technicalTitle} />
          <Panel title={\`\${undefined}\` || technicalTitle} />
          <Panel title={\`\${absentIdentity}\` || technicalTitle} />
        </>;
      }
    `);
    const emptyFindings = scan(`
      const technicalTitle = "Gateway posture";
      export function Example() {
        return <Panel title={\`\${""}\` || technicalTitle} />;
      }
    `);
    const shadowedFindings = scan(`
      const technicalTitle = "Gateway posture";
      export function Example(undefined) {
        return <Panel title={\`\${undefined}\` || technicalTitle} />;
      }
    `);
    const localNamedFindings = scan(`
      const undefined = "Client";
      const technicalTitle = "Gateway posture";
      export function Example() {
        return <Panel title={\`\${undefined}\` || technicalTitle} />;
      }
    `);
    const namedImportFindings = scan(`
      import { value as undefined } from "./runtime-copy";
      const technicalTitle = "Gateway posture";
      export const Example = () => (
        <Panel title={\`\${undefined}\` || technicalTitle} />
      );
    `);
    const defaultImportFindings = scan(`
      import undefined from "./runtime-copy";
      const technicalTitle = "Gateway posture";
      export const Example = () => (
        <Panel title={\`\${undefined}\` || technicalTitle} />
      );
    `);

    expect(nonemptyFindings).toEqual([]);
    expect(localNamedFindings).toEqual([]);
    expect(emptyFindings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(shadowedFindings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    for (const findings of [namedImportFindings, defaultImportFindings]) {
      expect(findings.map((finding) => finding.ruleId)).toEqual([
        "transport-gateway",
        "auditor-posture",
      ]);
    }
  });

  it("keeps shadowed undefined dynamic in reachability proofs", () => {
    const builtInFindings = scan(`
      const technicalTitle = "Gateway posture";
      export function Example() {
        return <>{undefined && technicalTitle}</>;
      }
    `);
    const shadowedFindings = scan(`
      const technicalTitle = "Gateway posture";
      export function Example(undefined) {
        return <>{undefined && technicalTitle}</>;
      }
    `);

    expect(builtInFindings).toEqual([]);
    expect(shadowedFindings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("resolves statically inspectable object property copy rendered through JSX", () => {
    const findings = scan(`
      const copy = {
        panelTitle: "Gateway posture",
        panelBody: "HTTP status unavailable",
      } as const;
      export function Example() {
        return <Panel title={copy.panelTitle} body={copy["panelBody"]} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
    expect(findings.map((finding) => finding.context)).toEqual([
      "JSX title",
      "JSX title",
      "JSX body",
    ]);
  });

  it("inspects reachable candidates of optional static object properties", () => {
    const findings = scan(`
      export function Example({ ready }) {
        const copy = ready
          ? { panelTitle: "Gateway posture" }
          : {};
        return <Panel title={copy.panelTitle} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("follows repository-local imported copy constants into rendered props", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Gateway posture" } as const;
      `,
      "src/screen.tsx": `
        import { COPY } from "./copy";
        export function Example() {
          return <Panel title={COPY.panelTitle} />;
        }
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) =>
      finding.filePath === "src/screen.tsx"
      && finding.context === "JSX title"
    )).toBe(true);
  });

  it("includes repository object writes in imported productive copy", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const DIRECT = { panelTitle: "Client review" };
        DIRECT.panelTitle = "Gateway posture";

        export const BRACKET = { panelTitle: "Client review" };
        BRACKET["panelTitle"] = "Gateway posture";

        export const ASSIGNED = { panelTitle: "Client review" };
        Object.assign(ASSIGNED, { panelTitle: "Gateway posture" });

        export const ALIASED = { panelTitle: "Client review" };
        const alias = ALIASED;
        alias.panelTitle = "Gateway posture";

        export const DEFINED = { panelTitle: "Client review" };
        Object.defineProperty(DEFINED, "panelTitle", {
          value: "Gateway posture",
        });

        export const REFLECTED = { panelTitle: "Client review" };
        Reflect.set(REFLECTED, "panelTitle", "Gateway posture");
      `,
      "src/screen.tsx": `
        import {
          ALIASED,
          ASSIGNED,
          BRACKET,
          DEFINED,
          DIRECT,
          REFLECTED,
        } from "./copy";
        export const Example = () => <>
          <Panel title={DIRECT.panelTitle} />
          <Panel title={BRACKET.panelTitle} />
          <Panel title={ASSIGNED.panelTitle} />
          <Panel title={ALIASED.panelTitle} />
          <Panel title={DEFINED.panelTitle} />
          <Panel title={REFLECTED.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) =>
      finding.filePath === "src/screen.tsx"
      && finding.context === "JSX title"
    )).toBe(true);
  });

  it("retains dynamic nested namespace and inserted repository write candidates", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const DYNAMIC = { panelTitle: "Client review" };
        const key = getRuntimeKey();
        DYNAMIC[key] = "Gateway posture";

        export const ARRAY = ["Client review"];
        ARRAY.push("Gateway posture");

        export const NESTED = { panel: { title: "Client review" } };
        NESTED.panel.title = "Gateway posture";

        export const NESTED_ALIAS = { panel: { title: "Client review" } };
        const panel = NESTED_ALIAS.panel;
        panel.title = "Gateway posture";

        export const NAMESPACE = { panelTitle: "Client review" };
      `,
      "src/mutate.ts": `
        import * as copy from "./copy";
        copy.NAMESPACE.panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import {
          ARRAY,
          DYNAMIC,
          NAMESPACE,
          NESTED,
          NESTED_ALIAS,
        } from "./copy";
        import "./mutate";
        export const Example = () => <>
          <Panel title={DYNAMIC.panelTitle} />
          <Panel title={ARRAY[1]} />
          <Panel title={NESTED.panel.title} />
          <Panel title={NESTED_ALIAS.panel.title} />
          <Panel title={NAMESPACE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("excludes proven unreachable repository property writes", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const LOGICAL_OR = { panelTitle: "Client review" };
        LOGICAL_OR.panelTitle ||= "Gateway posture";

        export const NULLISH = { panelTitle: "Client review" };
        NULLISH.panelTitle ??= "Gateway posture";

        export const LOGICAL_AND = { panelTitle: "" };
        LOGICAL_AND.panelTitle &&= "Gateway posture";

        export const CONDITIONAL = { panelTitle: "Client review" };
        if (false) {
          CONDITIONAL.panelTitle = "Gateway posture";
        }
      `,
      "src/screen.tsx": `
        import {
          CONDITIONAL,
          LOGICAL_AND,
          LOGICAL_OR,
          NULLISH,
        } from "./copy";
        export const Example = () => <>
          <Panel title={LOGICAL_OR.panelTitle} />
          <Panel title={NULLISH.panelTitle} />
          <Panel title={LOGICAL_AND.panelTitle} />
          <Panel title={CONDITIONAL.panelTitle} />
        </>;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("applies logical assignments to the current ordered property state", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const LOGICAL_OR = { panelTitle: "" };
        LOGICAL_OR.panelTitle ||= "Gateway posture";

        export const NULLISH = { panelTitle: null };
        NULLISH.panelTitle ??= "Gateway posture";

        export const LOGICAL_AND = { panelTitle: "Client review" };
        LOGICAL_AND.panelTitle &&= "Gateway posture";
      `,
      "src/screen.tsx": `
        import { LOGICAL_AND, LOGICAL_OR, NULLISH } from "./copy";
        export const Example = () => <>
          <Panel title={LOGICAL_OR.panelTitle} />
          <Panel title={NULLISH.panelTitle} />
          <Panel title={LOGICAL_AND.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("discards superseded technical copy after a deterministic business write", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Client review" };
        COPY.panelTitle = "Gateway posture";
        COPY.panelTitle = "Client priorities";
      `,
      "src/screen.tsx": `
        import { COPY } from "./copy";
        export const Example = () => <Panel title={COPY.panelTitle} />;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("excludes writes behind statically unreachable logical and loop control flow", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const LOGICAL = { panelTitle: "Client review" };
        false && (LOGICAL.panelTitle = "Gateway posture");

        export const LOOP = { panelTitle: "Client review" };
        while (false) {
          LOOP.panelTitle = "Gateway posture";
        }
      `,
      "src/screen.tsx": `
        import { LOGICAL, LOOP } from "./copy";
        export const Example = () => <>
          <Panel title={LOGICAL.panelTitle} />
          <Panel title={LOOP.panelTitle} />
        </>;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("attributes array mutations only to their affected indices", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const PUSHED = ["Client review"];
        PUSHED.push("Gateway posture");

        export const SPLICED = ["Client review", "Portfolio review"];
        SPLICED.splice(1, 0, "Gateway posture");

        export const FILLED = ["Client review", "Portfolio review"];
        FILLED.fill("Gateway posture", 1);
      `,
      "src/screen.tsx": `
        import { FILLED, PUSHED, SPLICED } from "./copy";
        export const Example = () => <>
          <Panel title={PUSHED[0]} />
          <Panel title={SPLICED[0]} />
          <Panel title={FILLED[0]} />
        </>;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("tracks array values moved into rendered indices", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const SHIFTED = ["Client review", "Gateway posture"];
        SHIFTED.shift();

        export const SPLICED = ["Client review", "Gateway posture"];
        SPLICED.splice(0, 1);

        export const REVERSED = ["Client review", "Gateway posture"];
        REVERSED.reverse();
      `,
      "src/screen.tsx": `
        import { REVERSED, SHIFTED, SPLICED } from "./copy";
        export const Example = () => <>
          <Panel title={SHIFTED[0]} />
          <Panel title={SPLICED[0]} />
          <Panel title={REVERSED[0]} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("removes stale array candidates without contaminating unaffected indices", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const POPPED = ["Client review", "Gateway posture"];
        POPPED.pop();

        export const SPLICED = ["Client review", "Gateway posture"];
        SPLICED.splice(1, 1);

        export const UNSHIFTED = ["Client review", "Portfolio review"];
        UNSHIFTED.unshift("Gateway posture");
      `,
      "src/screen.tsx": `
        import { POPPED, SPLICED, UNSHIFTED } from "./copy";
        export const Example = () => <>
          <Panel title={POPPED[1]} />
          <Panel title={SPLICED[1]} />
          <Panel title={UNSHIFTED[2]} />
        </>;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("treats reassigned mutable aliases as mutation-analysis barriers", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const ORIGINAL = { panelTitle: "Client review" };
        const OTHER = { panelTitle: "Portfolio review" };
        let alias = ORIGINAL;
        alias = OTHER;
        alias.panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import { ORIGINAL } from "./copy";
        export const Example = () => <Panel title={ORIGINAL.panelTitle} />;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("tracks mutable aliases only before their first reassignment", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const STABLE = { panelTitle: "Client review" };
        let stableAlias = STABLE;
        stableAlias.panelTitle = "Gateway posture";

        export const BEFORE = { panelTitle: "Client review" };
        const OTHER = { panelTitle: "Portfolio review" };
        let reassignedAlias = BEFORE;
        reassignedAlias.panelTitle = "Gateway posture";
        reassignedAlias = OTHER;
      `,
      "src/screen.tsx": `
        import { BEFORE, STABLE } from "./copy";
        export const Example = () => <>
          <Panel title={STABLE.panelTitle} />
          <Panel title={BEFORE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("maintains ordered and conditional mutable-alias targets", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const OTHER = { panelTitle: "Portfolio review" };

        export const CONDITIONAL = { panelTitle: "Client review" };
        let conditionalAlias = CONDITIONAL;
        if (getFlag()) {
          conditionalAlias = OTHER;
        }
        conditionalAlias.panelTitle = "Gateway posture";

        export const RESTORED = { panelTitle: "Client review" };
        let restoredAlias = RESTORED;
        restoredAlias = OTHER;
        restoredAlias = RESTORED;
        restoredAlias.panelTitle = "Gateway posture";

        export const RETARGETED = { panelTitle: "Client review" };
        let retargetedAlias = OTHER;
        retargetedAlias = RETARGETED;
        retargetedAlias.panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import { CONDITIONAL, RESTORED, RETARGETED } from "./copy";
        export const Example = () => <>
          <Panel title={CONDITIONAL.panelTitle} />
          <Panel title={RESTORED.panelTitle} />
          <Panel title={RETARGETED.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("captures multi-hop alias targets at each binding position", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const OTHER = { panelTitle: "Portfolio review" };

        export const CAPTURED = { panelTitle: "Client review" };
        let capturedSource = CAPTURED;
        const capturedAlias = capturedSource;
        capturedSource = OTHER;
        capturedAlias.panelTitle = "Gateway posture";

        export const NOT_CAPTURED = { panelTitle: "Client review" };
        let otherSource = NOT_CAPTURED;
        otherSource = OTHER;
        const otherAlias = otherSource;
        otherSource = NOT_CAPTURED;
        otherAlias.panelTitle = "Gateway posture";

        export const CHAINED = { panelTitle: "Client review" };
        let first = CHAINED;
        const second = first;
        const third = second;
        first = OTHER;
        third.panelTitle = "Gateway posture";

        export const CONDITIONAL = { panelTitle: "Client review" };
        let conditionalSource = CONDITIONAL;
        if (getFlag()) {
          conditionalSource = OTHER;
        }
        const conditionalCapture = conditionalSource;
        conditionalCapture.panelTitle = "Gateway posture";

        export const NESTED = { panel: { panelTitle: "Client review" } };
        const OTHER_NESTED = { panel: { panelTitle: "Portfolio review" } };
        let panelSource = NESTED.panel;
        const panelCapture = panelSource;
        panelSource = OTHER_NESTED.panel;
        panelCapture.panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import { CAPTURED, CHAINED, CONDITIONAL, NESTED, NOT_CAPTURED } from "./copy";
        export const Example = () => <>
          <Panel title={CAPTURED.panelTitle} />
          <Panel title={NOT_CAPTURED.panelTitle} />
          <Panel title={CHAINED.panelTitle} />
          <Panel title={CONDITIONAL.panelTitle} />
          <Panel title={NESTED.panel.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("tracks object nested renamed and tuple destructuring mutation paths", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const OBJECT = { nested: { panelTitle: "Client review" } };
        const { nested } = OBJECT;
        nested.panelTitle = "Gateway posture";

        export const RENAMED = { panel: { panelTitle: "Client review" } };
        const { panel: renamedPanel } = RENAMED;
        renamedPanel.panelTitle = "Gateway posture";

        export const DEEP = {
          panel: { detail: { panelTitle: "Client review" } },
        };
        const { panel: { detail } } = DEEP;
        detail.panelTitle = "Gateway posture";

        export const TUPLE = [{ panelTitle: "Client review" }];
        const [tuplePanel] = TUPLE;
        tuplePanel.panelTitle = "Gateway posture";

        const DEFAULT_SOURCE = {};
        export const DEFAULT_TARGET = { panelTitle: "Client review" };
        const { panel = DEFAULT_TARGET } = DEFAULT_SOURCE;
        panel.panelTitle = "Gateway posture";

        export const ASSIGNED = { nested: { panelTitle: "Client review" } };
        let assignedNested;
        ({ nested: assignedNested } = ASSIGNED);
        assignedNested.panelTitle = "Gateway posture";

        export const ASSIGNED_RENAMED = {
          panel: { panelTitle: "Client review" },
        };
        let assignedPanel;
        ({ panel: assignedPanel } = ASSIGNED_RENAMED);
        assignedPanel.panelTitle = "Gateway posture";

        export const ASSIGNED_SHORTHAND = {
          nested: { panelTitle: "Client review" },
        };
        {
          let nested;
          ({ nested } = ASSIGNED_SHORTHAND);
          nested.panelTitle = "Gateway posture";
        }
      `,
      "src/screen.tsx": `
        import {
          ASSIGNED,
          ASSIGNED_RENAMED,
          ASSIGNED_SHORTHAND,
          DEFAULT_TARGET,
          DEEP,
          OBJECT,
          RENAMED,
          TUPLE,
        } from "./copy";
        export const Example = () => <>
          <Panel title={OBJECT.nested.panelTitle} />
          <Panel title={RENAMED.panel.panelTitle} />
          <Panel title={DEEP.panel.detail.panelTitle} />
          <Panel title={TUPLE[0].panelTitle} />
          <Panel title={DEFAULT_TARGET.panelTitle} />
          <Panel title={ASSIGNED.nested.panelTitle} />
          <Panel title={ASSIGNED_RENAMED.panel.panelTitle} />
          <Panel title={ASSIGNED_SHORTHAND.nested.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from({ length: 8 }, () => [
        "transport-gateway",
        "auditor-posture",
      ]).flat(),
    );
  });

  it("distinguishes direct rest-copy writes from nested shared-reference writes", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const OBJECT = {
          panelTitle: "Client review",
          nested: { panelTitle: "Client review" },
        };
        const { ...objectRest } = OBJECT;
        objectRest.panelTitle = "Gateway posture";
        objectRest.nested.panelTitle = "Gateway posture";

        export const TUPLE = [
          { panelTitle: "Client review" },
          { panelTitle: "Client review" },
        ];
        const [, ...tupleRest] = TUPLE;
        tupleRest[0].panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import { OBJECT, TUPLE } from "./copy";
        export const Example = () => <>
          <Panel title={OBJECT.panelTitle} />
          <Panel title={OBJECT.nested.panelTitle} />
          <Panel title={TUPLE[1].panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("preserves alias lineage through logical conditional and cyclic assignments", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const OTHER = { panelTitle: "Portfolio review" };

        export const SELF = { panelTitle: "Client review" };
        let selfAlias = SELF;
        selfAlias = selfAlias;
        selfAlias.panelTitle = "Gateway posture";

        export const LOGICAL_OR = { panelTitle: "Client review" };
        let orAlias = LOGICAL_OR;
        orAlias ||= OTHER;
        orAlias.panelTitle = "Gateway posture";

        export const NULLISH = { panelTitle: "Client review" };
        let nullishAlias = NULLISH;
        nullishAlias ??= OTHER;
        nullishAlias.panelTitle = "Gateway posture";

        export const LOGICAL_AND = { panelTitle: "Client review" };
        export const AND_OTHER = { panelTitle: "Portfolio review" };
        let andAlias = LOGICAL_AND;
        andAlias &&= AND_OTHER;
        andAlias.panelTitle = "Gateway posture";

        export const CONDITIONAL = { panelTitle: "Client review" };
        export const CONDITIONAL_OTHER = { panelTitle: "Portfolio review" };
        let conditionalAlias = CONDITIONAL;
        conditionalAlias = getFlag() ? CONDITIONAL : CONDITIONAL_OTHER;
        conditionalAlias.panelTitle = "Gateway posture";

        export const LOGICAL = { panelTitle: "Client review" };
        let logicalAlias = LOGICAL;
        logicalAlias = logicalAlias || OTHER;
        logicalAlias.panelTitle = "Gateway posture";

        export const CYCLE = { panelTitle: "Client review" };
        let cycleSource = CYCLE;
        const cycleCapture = cycleSource;
        cycleSource = cycleCapture;
        cycleSource.panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import {
          AND_OTHER,
          CONDITIONAL,
          CONDITIONAL_OTHER,
          CYCLE,
          LOGICAL,
          LOGICAL_OR,
          NULLISH,
          SELF,
        } from "./copy";
        export const Example = () => <>
          <Panel title={SELF.panelTitle} />
          <Panel title={LOGICAL_OR.panelTitle} />
          <Panel title={NULLISH.panelTitle} />
          <Panel title={AND_OTHER.panelTitle} />
          <Panel title={CONDITIONAL.panelTitle} />
          <Panel title={CONDITIONAL_OTHER.panelTitle} />
          <Panel title={LOGICAL.panelTitle} />
          <Panel title={CYCLE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from({ length: 8 }, () => [
        "transport-gateway",
        "auditor-posture",
      ]).flat(),
    );
  });

  it("correlates sequential alias assignments within the same conditional branch", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Client review" };
        export const OTHER = { panelTitle: "Portfolio review" };
        let first = COPY;
        let second = OTHER;
        if (getFlag()) {
          first = second;
          second = first;
        }
        second.panelTitle = "Gateway posture";
      `,
      "src/screen.tsx": `
        import { COPY, OTHER } from "./copy";
        export const Example = () => <>
          <Panel title={COPY.panelTitle} />
          <Panel title={OTHER.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("keeps mutually exclusive branch targets out of sibling mutations", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const CONDITIONAL = { panelTitle: "Client review" };
        export const CONDITIONAL_OTHER = { panelTitle: "Portfolio review" };
        let conditionalAlias = CONDITIONAL;
        if (getFlag()) {
          conditionalAlias = CONDITIONAL_OTHER;
        } else {
          conditionalAlias.panelTitle = "Gateway posture";
        }

        export const SWITCHED = { panelTitle: "Client review" };
        export const SWITCHED_OTHER = { panelTitle: "Portfolio review" };
        let switchedAlias = SWITCHED;
        switch (getCase()) {
          case 1:
            switchedAlias = SWITCHED_OTHER;
            break;
          case 2:
            switchedAlias.panelTitle = "Gateway posture";
            break;
        }
      `,
      "src/screen.tsx": `
        import {
          CONDITIONAL,
          CONDITIONAL_OTHER,
          SWITCHED,
          SWITCHED_OTHER,
        } from "./copy";
        export const Example = () => <>
          <Panel title={CONDITIONAL.panelTitle} />
          <Panel title={CONDITIONAL_OTHER.panelTitle} />
          <Panel title={SWITCHED.panelTitle} />
          <Panel title={SWITCHED_OTHER.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("tracks const aliases of standard object mutation APIs", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const ASSIGNED = { panelTitle: "Client review" };
        const assign = Object.assign;
        assign(ASSIGNED, { panelTitle: "Gateway posture" });

        export const REFLECTED = { panelTitle: "Client review" };
        const set = Reflect.set;
        set(REFLECTED, "panelTitle", "Gateway posture");
      `,
      "src/screen.tsx": `
        import { ASSIGNED, REFLECTED } from "./copy";
        export const Example = () => <>
          <Panel title={ASSIGNED.panelTitle} />
          <Panel title={REFLECTED.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("tracks bounded owner, tuple assignment, and const-object mutation API aliases", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const noop = () => undefined;
        declare const flag: boolean;

        export const CONDITIONAL_OWNER = { panelTitle: "Client review" };
        const owner = flag ? [Object.assign] : [noop];
        const [conditionalAssign] = owner;
        conditionalAssign(CONDITIONAL_OWNER, { panelTitle: "Gateway posture" });

        export const MUTABLE_CONDITIONAL_OWNER = { panelTitle: "Client review" };
        let assignCandidate = Object.assign;
        const mutableOwner = flag ? [assignCandidate] : [noop];
        const [mutableConditionalAssign] = mutableOwner;
        assignCandidate = noop;
        mutableConditionalAssign(MUTABLE_CONDITIONAL_OWNER, {
          panelTitle: "Gateway posture",
        });

        export const TUPLE_ASSIGNMENT = { panelTitle: "Client review" };
        let tupleAssign;
        [tupleAssign] = [Object.assign];
        tupleAssign(TUPLE_ASSIGNMENT, { panelTitle: "Gateway posture" });

        export const NESTED_TUPLE_ASSIGNMENT = { panelTitle: "Client review" };
        let nestedTupleAssign;
        [[nestedTupleAssign]] = [[Object.assign]];
        nestedTupleAssign(NESTED_TUPLE_ASSIGNMENT, {
          panelTitle: "Gateway posture",
        });

        export const DEFAULT_TUPLE_ASSIGNMENT = { panelTitle: "Client review" };
        let defaultTupleAssign;
        [defaultTupleAssign = Object.assign] = [];
        defaultTupleAssign(DEFAULT_TUPLE_ASSIGNMENT, {
          panelTitle: "Gateway posture",
        });

        export const DEFAULT_OBJECT_ASSIGNMENT = { panelTitle: "Client review" };
        let defaultObjectAssign;
        ({ assign: defaultObjectAssign = Object.assign } = {});
        defaultObjectAssign(DEFAULT_OBJECT_ASSIGNMENT, {
          panelTitle: "Gateway posture",
        });

        export const CONST_OBJECT = { panelTitle: "Client review" };
        const APIs = { assign: Object.assign } as const;
        const objectAssign = APIs.assign;
        objectAssign(CONST_OBJECT, { panelTitle: "Gateway posture" });

        export const DIRECT_CONST_OBJECT = { panelTitle: "Client review" };
        APIs.assign(DIRECT_CONST_OBJECT, { panelTitle: "Gateway posture" });

        export const COMPUTED_CONST_OBJECT = { panelTitle: "Client review" };
        APIs["assign"](COMPUTED_CONST_OBJECT, {
          panelTitle: "Gateway posture",
        });

        export const GETTER_CONST_OBJECT = { panelTitle: "Client review" };
        const getterAPIs = {
          get assign() { return Object.assign; },
        };
        getterAPIs.assign(GETTER_CONST_OBJECT, {
          panelTitle: "Gateway posture",
        });

        export const RENAMED_MEMBER = { panelTitle: "Client review" };
        const renamedMemberAPIs = { run: objectAssign };
        renamedMemberAPIs.run(RENAMED_MEMBER, {
          panelTitle: "Gateway posture",
        });

        export const SHORTHAND_WRAPPER = { panelTitle: "Client review" };
        const wrapper = { getterAPIs };
        const { getterAPIs: { assign: shorthandAssign } } = wrapper;
        shorthandAssign(SHORTHAND_WRAPPER, { panelTitle: "Gateway posture" });

        export const SHORTHAND_MEMBER_WRAPPER = { panelTitle: "Client review" };
        const assign = APIs.assign;
        const memberWrapper = { assign };
        const { assign: shorthandMemberAssign } = memberWrapper;
        shorthandMemberAssign(SHORTHAND_MEMBER_WRAPPER, {
          panelTitle: "Gateway posture",
        });

        export const SHORTHAND_CAPTURE = { panelTitle: "Client review" };
        let run = Object.assign;
        const mutableMemberWrapper = { run };
        run = noop;
        mutableMemberWrapper.run(SHORTHAND_CAPTURE, {
          panelTitle: "Gateway posture",
        });

        export const INTERMEDIATE_ALIAS = { panelTitle: "Client review" };
        const nestedWrapper = { getterAPIs };
        const { getterAPIs: selectedAPIs } = nestedWrapper;
        const { assign: intermediateAssign } = selectedAPIs;
        intermediateAssign(INTERMEDIATE_ALIAS, {
          panelTitle: "Gateway posture",
        });

        export const PROPERTY_ALIAS = { panelTitle: "Client review" };
        const propertySelectedAPIs = nestedWrapper.getterAPIs;
        const { assign: propertyAssign } = propertySelectedAPIs;
        propertyAssign(PROPERTY_ALIAS, { panelTitle: "Gateway posture" });

        export const COMPUTED_PROPERTY_ALIAS = { panelTitle: "Client review" };
        const computedSelectedAPIs = nestedWrapper["getterAPIs"];
        const { assign: computedPropertyAssign } = computedSelectedAPIs;
        computedPropertyAssign(COMPUTED_PROPERTY_ALIAS, {
          panelTitle: "Gateway posture",
        });

        export const MEMBER_ALIAS = { panelTitle: "Client review" };
        const { getterAPIs: memberSelectedAPIs } = nestedWrapper;
        const memberAssign = memberSelectedAPIs.assign;
        memberAssign(MEMBER_ALIAS, { panelTitle: "Gateway posture" });

        export const ASSIGNMENT_FORM_ALIAS = { panelTitle: "Client review" };
        let assignmentSelectedAPIs;
        ({ getterAPIs: assignmentSelectedAPIs } = nestedWrapper);
        const { assign: assignmentFormAssign } = assignmentSelectedAPIs;
        assignmentFormAssign(ASSIGNMENT_FORM_ALIAS, {
          panelTitle: "Gateway posture",
        });

        export const REPLACED_CONST_OBJECT = { panelTitle: "Client review" };
        const replacedAPIs = { assign: Object.assign };
        replacedAPIs.assign = noop;
        const replacedObjectAssign = replacedAPIs.assign;
        replacedObjectAssign(REPLACED_CONST_OBJECT, {
          panelTitle: "Gateway posture",
        });
      `,
      "src/screen.tsx": `
        import {
          CONDITIONAL_OWNER,
          COMPUTED_CONST_OBJECT,
          COMPUTED_PROPERTY_ALIAS,
          CONST_OBJECT,
          DEFAULT_OBJECT_ASSIGNMENT,
          DEFAULT_TUPLE_ASSIGNMENT,
          DIRECT_CONST_OBJECT,
          GETTER_CONST_OBJECT,
          ASSIGNMENT_FORM_ALIAS,
          MUTABLE_CONDITIONAL_OWNER,
          MEMBER_ALIAS,
          NESTED_TUPLE_ASSIGNMENT,
          RENAMED_MEMBER,
          REPLACED_CONST_OBJECT,
          INTERMEDIATE_ALIAS,
          PROPERTY_ALIAS,
          SHORTHAND_CAPTURE,
          SHORTHAND_MEMBER_WRAPPER,
          SHORTHAND_WRAPPER,
          TUPLE_ASSIGNMENT,
        } from "./copy";
        export const Example = () => <>
          <Panel title={CONDITIONAL_OWNER.panelTitle} />
          <Panel title={MUTABLE_CONDITIONAL_OWNER.panelTitle} />
          <Panel title={TUPLE_ASSIGNMENT.panelTitle} />
          <Panel title={NESTED_TUPLE_ASSIGNMENT.panelTitle} />
          <Panel title={DEFAULT_TUPLE_ASSIGNMENT.panelTitle} />
          <Panel title={DEFAULT_OBJECT_ASSIGNMENT.panelTitle} />
          <Panel title={CONST_OBJECT.panelTitle} />
          <Panel title={DIRECT_CONST_OBJECT.panelTitle} />
          <Panel title={COMPUTED_CONST_OBJECT.panelTitle} />
          <Panel title={COMPUTED_PROPERTY_ALIAS.panelTitle} />
          <Panel title={GETTER_CONST_OBJECT.panelTitle} />
          <Panel title={ASSIGNMENT_FORM_ALIAS.panelTitle} />
          <Panel title={MEMBER_ALIAS.panelTitle} />
          <Panel title={RENAMED_MEMBER.panelTitle} />
          <Panel title={REPLACED_CONST_OBJECT.panelTitle} />
          <Panel title={INTERMEDIATE_ALIAS.panelTitle} />
          <Panel title={PROPERTY_ALIAS.panelTitle} />
          <Panel title={SHORTHAND_CAPTURE.panelTitle} />
          <Panel title={SHORTHAND_MEMBER_WRAPPER.panelTitle} />
          <Panel title={SHORTHAND_WRAPPER.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from({ length: 19 }, () => [
        "transport-gateway",
        "auditor-posture",
      ]).flat(),
    );
  });

  it("marks dynamic getter-backed mutation API calls as unresolved", () => {
    const evaluation = evaluateRepository({
      "src/copy.ts": `
        declare function getAssign(): typeof Object.assign;
        export const COPY = { panelTitle: "Client review" };
        export const ALIASED_COPY = { panelTitle: "Portfolio review" };
        export const NESTED_ALIAS_COPY = { panelTitle: "Mandate review" };
        export const DESTRUCTURED_COPY = { panelTitle: "Risk review" };
        export const RENAMED_COPY = { panelTitle: "Suitability review" };
        export const ASSIGNED_COPY = { panelTitle: "Client mandate" };
        export const NESTED_DESTRUCTURED_COPY = { panelTitle: "Portfolio mandate" };
        export const RENAMED_MEMBER_COPY = { panelTitle: "Mandate exception" };
        export const SHORTHAND_WRAPPER_COPY = { panelTitle: "Restriction review" };
        export const SHORTHAND_MEMBER_WRAPPER_COPY = { panelTitle: "Evidence review" };
        export const SHORTHAND_CAPTURE_COPY = { panelTitle: "Constraint review" };
        export const INTERMEDIATE_ALIAS_COPY = { panelTitle: "Portfolio evidence" };
        export const PROPERTY_ALIAS_COPY = { panelTitle: "Review evidence" };
        export const COMPUTED_PROPERTY_ALIAS_COPY = { panelTitle: "Mandate evidence" };
        export const MEMBER_ALIAS_COPY = { panelTitle: "Suitability evidence" };
        export const ASSIGNMENT_FORM_ALIAS_COPY = { panelTitle: "Allocation evidence" };
        const APIs = {
          get assign() { return getAssign(); },
        };
        APIs.assign(COPY, { panelTitle: "Gateway posture" });
        const assign = APIs.assign;
        assign(ALIASED_COPY, { panelTitle: "Gateway posture" });
        const dynamicAssign = getAssign();
        const nestedAPIs = {
          get assign() { return dynamicAssign; },
        };
        const nestedAssign = nestedAPIs.assign;
        nestedAssign(NESTED_ALIAS_COPY, { panelTitle: "Gateway posture" });
        const { assign: destructuredAssign } = APIs;
        destructuredAssign(DESTRUCTURED_COPY, { panelTitle: "Gateway posture" });
        const { assign: renamedAssign } = APIs;
        renamedAssign(RENAMED_COPY, { panelTitle: "Gateway posture" });
        let assignedAssign;
        ({ assign: assignedAssign } = APIs);
        assignedAssign(ASSIGNED_COPY, { panelTitle: "Gateway posture" });
        const { nested: { assign: nestedDestructuredAssign } } = { nested: APIs };
        nestedDestructuredAssign(NESTED_DESTRUCTURED_COPY, {
          panelTitle: "Gateway posture",
        });
        const holder = { run: assign };
        holder.run(RENAMED_MEMBER_COPY, { panelTitle: "Gateway posture" });
        const wrapper = { APIs };
        const { APIs: { assign: wrappedAssign } } = wrapper;
        wrappedAssign(SHORTHAND_WRAPPER_COPY, { panelTitle: "Gateway posture" });
        const memberWrapper = { assign };
        const { assign: wrappedMemberAssign } = memberWrapper;
        wrappedMemberAssign(SHORTHAND_MEMBER_WRAPPER_COPY, {
          panelTitle: "Gateway posture",
        });
        let run = APIs.assign;
        const mutableMemberWrapper = { run };
        run = () => undefined;
        mutableMemberWrapper.run(SHORTHAND_CAPTURE_COPY, {
          panelTitle: "Gateway posture",
        });
        const intermediateWrapper = { APIs };
        const { APIs: selectedAPIs } = intermediateWrapper;
        const { assign: intermediateAssign } = selectedAPIs;
        intermediateAssign(INTERMEDIATE_ALIAS_COPY, {
          panelTitle: "Gateway posture",
        });
        const propertySelectedAPIs = intermediateWrapper.APIs;
        const { assign: propertyAssign } = propertySelectedAPIs;
        propertyAssign(PROPERTY_ALIAS_COPY, { panelTitle: "Gateway posture" });
        const computedSelectedAPIs = intermediateWrapper["APIs"];
        const { assign: computedPropertyAssign } = computedSelectedAPIs;
        computedPropertyAssign(COMPUTED_PROPERTY_ALIAS_COPY, {
          panelTitle: "Gateway posture",
        });
        const { APIs: memberSelectedAPIs } = intermediateWrapper;
        const memberAssign = memberSelectedAPIs.assign;
        memberAssign(MEMBER_ALIAS_COPY, { panelTitle: "Gateway posture" });
        let assignmentSelectedAPIs;
        ({ APIs: assignmentSelectedAPIs } = intermediateWrapper);
        const { assign: assignmentFormAssign } = assignmentSelectedAPIs;
        assignmentFormAssign(ASSIGNMENT_FORM_ALIAS_COPY, {
          panelTitle: "Gateway posture",
        });
      `,
      "src/screen.tsx": `
        import {
          ALIASED_COPY,
          ASSIGNED_COPY,
          ASSIGNMENT_FORM_ALIAS_COPY,
          COMPUTED_PROPERTY_ALIAS_COPY,
          COPY,
          DESTRUCTURED_COPY,
          NESTED_ALIAS_COPY,
          NESTED_DESTRUCTURED_COPY,
          INTERMEDIATE_ALIAS_COPY,
          MEMBER_ALIAS_COPY,
          RENAMED_COPY,
          RENAMED_MEMBER_COPY,
          PROPERTY_ALIAS_COPY,
          SHORTHAND_CAPTURE_COPY,
          SHORTHAND_MEMBER_WRAPPER_COPY,
          SHORTHAND_WRAPPER_COPY,
        } from "./copy";
        export const Example = () => <>
          <Panel title={COPY.panelTitle} />
          <Panel title={ALIASED_COPY.panelTitle} />
          <Panel title={NESTED_ALIAS_COPY.panelTitle} />
          <Panel title={DESTRUCTURED_COPY.panelTitle} />
          <Panel title={RENAMED_COPY.panelTitle} />
          <Panel title={ASSIGNED_COPY.panelTitle} />
          <Panel title={ASSIGNMENT_FORM_ALIAS_COPY.panelTitle} />
          <Panel title={COMPUTED_PROPERTY_ALIAS_COPY.panelTitle} />
          <Panel title={NESTED_DESTRUCTURED_COPY.panelTitle} />
          <Panel title={INTERMEDIATE_ALIAS_COPY.panelTitle} />
          <Panel title={MEMBER_ALIAS_COPY.panelTitle} />
          <Panel title={RENAMED_MEMBER_COPY.panelTitle} />
          <Panel title={PROPERTY_ALIAS_COPY.panelTitle} />
          <Panel title={SHORTHAND_CAPTURE_COPY.panelTitle} />
          <Panel title={SHORTHAND_MEMBER_WRAPPER_COPY.panelTitle} />
          <Panel title={SHORTHAND_WRAPPER_COPY.panelTitle} />
        </>;
      `,
    });

    expect(evaluation.findings).toEqual([]);
    expect(evaluation.unresolvedExpressions).toHaveLength(16);
    expect(evaluation.unresolvedExpressions.map(({ context }) => context)).toEqual([
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
      "JSX title",
    ]);
  });

  it("retains mutation authority across a definite alias round trip", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Client review" };
        let assign = Object.assign;
        const captured = assign;
        assign = captured;
        assign(COPY, { panelTitle: "Gateway posture" });

        export const RESTORED_COPY = { panelTitle: "Client review" };
        let restoredAssign = Object.assign;
        const restoredCapture = restoredAssign;
        restoredAssign = () => undefined;
        restoredAssign = restoredCapture;
        restoredAssign(RESTORED_COPY, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import { COPY, RESTORED_COPY } from "./copy";
        export const Example = () => <>
          <Panel title={COPY.panelTitle} />
          <Panel title={RESTORED_COPY.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("snapshots renamed property values when their wrapper is created", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const noop = () => undefined;
        export const PROPERTY_CAPTURE = { panelTitle: "Client review" };
        export const COMPUTED_CAPTURE = { panelTitle: "Portfolio review" };
        export const NESTED_CAPTURE = { panelTitle: "Mandate review" };
        export const ALIASED_CAPTURE = { panelTitle: "Suitability review" };
        let assign = Object.assign;
        const holder = { run: assign };
        const nested = { holder };
        const capturedRun = holder.run;
        assign = noop;
        holder.run(PROPERTY_CAPTURE, { panelTitle: "Gateway posture" });
        holder["run"](COMPUTED_CAPTURE, { panelTitle: "Gateway posture" });
        nested.holder.run(NESTED_CAPTURE, { panelTitle: "Gateway posture" });
        capturedRun(ALIASED_CAPTURE, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import {
          ALIASED_CAPTURE,
          COMPUTED_CAPTURE,
          NESTED_CAPTURE,
          PROPERTY_CAPTURE,
        } from "./copy";
        export const Example = () => <>
          <Panel title={PROPERTY_CAPTURE.panelTitle} />
          <Panel title={COMPUTED_CAPTURE.panelTitle} />
          <Panel title={NESTED_CAPTURE.panelTitle} />
          <Panel title={ALIASED_CAPTURE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("snapshots bounded property values and statically named computed members", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        declare const flag: boolean;
        declare const maybe: boolean | null;
        const noop = () => undefined;
        export const CONDITIONAL = { panelTitle: "Client review" };
        export const LOGICAL_AND = { panelTitle: "Portfolio review" };
        export const LOGICAL_OR = { panelTitle: "Mandate review" };
        export const NULLISH = { panelTitle: "Suitability review" };
        export const PARENTHESIZED = { panelTitle: "Constraint review" };
        export const ASSERTED = { panelTitle: "Evidence review" };
        export const COMPUTED = { panelTitle: "Allocation review" };
        export const NESTED_COMPUTED = { panelTitle: "Restriction review" };
        export const SEQUENCE = { panelTitle: "Implementation review" };
        export const NOOP_SEQUENCE = { panelTitle: "Outcome review" };
        export const NESTED_SEQUENCE = { panelTitle: "Proposal review" };
        export const ASSERTED_SEQUENCE = { panelTitle: "Decision review" };
        export const CONDITIONAL_SEQUENCE_TRUE = { panelTitle: "Action review" };
        export const CONDITIONAL_SEQUENCE_FALSE = { panelTitle: "Readiness review" };
        export const CONTROL_SEQUENCE = { panelTitle: "Client review" };
        export const ASSIGNMENT_SEQUENCE = { panelTitle: "Mandate decision" };
        export const NESTED_ASSIGNMENT_SEQUENCE = { panelTitle: "Portfolio decision" };
        export const ASSERTED_ASSIGNMENT_SEQUENCE = { panelTitle: "Advice decision" };
        export const ALIASED_ASSIGNMENT_SEQUENCE = { panelTitle: "Constraint decision" };
        export const DISABLED_ASSIGNMENT_SEQUENCE = { panelTitle: "Client review" };
        export const NESTED_ENABLE_SEQUENCE = { panelTitle: "Mandate action" };
        export const DEPTH_TWO_ENABLE_SEQUENCE = { panelTitle: "Portfolio action" };
        export const NESTED_DISABLE_SEQUENCE = { panelTitle: "Client review" };
        export const DEPTH_TWO_DISABLE_SEQUENCE = { panelTitle: "Portfolio review" };
        let assign = Object.assign;
        const conditionalHolder = { run: flag ? assign : noop };
        const andHolder = { run: flag && assign };
        const orHolder = { run: flag || assign };
        const nullishHolder = { run: maybe ?? assign };
        const parenthesizedHolder = { run: (assign) };
        const assertedHolder = { run: assign as typeof Object.assign };
        const key = "run";
        const computedHolder = { [key]: assign };
        const aliasedKey = key;
        const nestedComputedHolder = { inner: { [aliasedKey]: assign } };
        const sequenceHolder = { run: (0, assign) };
        const noopSequenceHolder = { run: (noop, assign) };
        const nestedSequenceHolder = { run: (0, 1, assign) };
        const assertedSequenceHolder = {
          run: ((0, assign) as typeof Object.assign),
        };
        const conditionalSequenceTrueHolder = {
          run: flag ? (0, assign) : noop,
        };
        const conditionalSequenceFalseHolder = {
          run: flag ? noop : (0, assign),
        };
        const controlSequenceHolder = { run: (assign, noop) };
        let lateAssign = noop;
        const assignmentSequenceHolder = {
          run: (lateAssign = Object.assign, lateAssign),
        };
        let nestedLateAssign = noop;
        const nestedAssignmentSequenceHolder = {
          run: (0, nestedLateAssign = Object.assign, nestedLateAssign),
        };
        let assertedLateAssign = noop;
        const assertedAssignmentSequenceHolder = {
          run: ((assertedLateAssign = Object.assign, assertedLateAssign)
            as typeof Object.assign),
        };
        const assignmentSource = Object.assign;
        let aliasedLateAssign = noop;
        const aliasedAssignmentSequenceHolder = {
          run: (aliasedLateAssign = assignmentSource, aliasedLateAssign),
        };
        let disabledAssign = Object.assign;
        const disabledAssignmentSequenceHolder = {
          run: (
            disabledAssign = Object.assign,
            disabledAssign = noop,
            disabledAssign
          ),
        };
        let nestedEnable = noop;
        const nestedEnableSequenceHolder = {
          run: (
            nestedEnable = (nestedEnable = noop, Object.assign),
            nestedEnable
          ),
        };
        let depthTwoEnable = noop;
        const depthTwoEnableSequenceHolder = {
          run: (
            depthTwoEnable = (
              depthTwoEnable = (depthTwoEnable = noop, Object.assign),
              Object.assign
            ),
            depthTwoEnable
          ),
        };
        let nestedDisable = Object.assign;
        const nestedDisableSequenceHolder = {
          run: (
            nestedDisable = (nestedDisable = Object.assign, noop),
            nestedDisable
          ),
        };
        let depthTwoDisable = Object.assign;
        const depthTwoDisableSequenceHolder = {
          run: (
            depthTwoDisable = (
              depthTwoDisable = (depthTwoDisable = Object.assign, noop),
              noop
            ),
            depthTwoDisable
          ),
        };
        assign = noop;
        conditionalHolder.run(CONDITIONAL, { panelTitle: "Gateway posture" });
        andHolder.run(LOGICAL_AND, { panelTitle: "Gateway posture" });
        orHolder.run(LOGICAL_OR, { panelTitle: "Gateway posture" });
        nullishHolder.run(NULLISH, { panelTitle: "Gateway posture" });
        parenthesizedHolder.run(PARENTHESIZED, { panelTitle: "Gateway posture" });
        assertedHolder.run(ASSERTED, { panelTitle: "Gateway posture" });
        computedHolder.run(COMPUTED, { panelTitle: "Gateway posture" });
        nestedComputedHolder.inner.run(NESTED_COMPUTED, {
          panelTitle: "Gateway posture",
        });
        sequenceHolder.run(SEQUENCE, { panelTitle: "Gateway posture" });
        noopSequenceHolder.run(NOOP_SEQUENCE, { panelTitle: "Gateway posture" });
        nestedSequenceHolder.run(NESTED_SEQUENCE, { panelTitle: "Gateway posture" });
        assertedSequenceHolder.run(ASSERTED_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        conditionalSequenceTrueHolder.run(CONDITIONAL_SEQUENCE_TRUE, {
          panelTitle: "Gateway posture",
        });
        conditionalSequenceFalseHolder.run(CONDITIONAL_SEQUENCE_FALSE, {
          panelTitle: "Gateway posture",
        });
        controlSequenceHolder.run(CONTROL_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        assignmentSequenceHolder.run(ASSIGNMENT_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        nestedAssignmentSequenceHolder.run(NESTED_ASSIGNMENT_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        assertedAssignmentSequenceHolder.run(ASSERTED_ASSIGNMENT_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        aliasedAssignmentSequenceHolder.run(ALIASED_ASSIGNMENT_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        disabledAssignmentSequenceHolder.run(DISABLED_ASSIGNMENT_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        nestedEnableSequenceHolder.run(NESTED_ENABLE_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        depthTwoEnableSequenceHolder.run(DEPTH_TWO_ENABLE_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        nestedDisableSequenceHolder.run(NESTED_DISABLE_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
        depthTwoDisableSequenceHolder.run(DEPTH_TWO_DISABLE_SEQUENCE, {
          panelTitle: "Gateway posture",
        });
      `,
      "src/screen.tsx": `
        import {
          ASSERTED,
          ALIASED_ASSIGNMENT_SEQUENCE,
          ASSERTED_ASSIGNMENT_SEQUENCE,
          ASSIGNMENT_SEQUENCE,
          COMPUTED,
          CONDITIONAL_SEQUENCE_FALSE,
          CONDITIONAL_SEQUENCE_TRUE,
          CONDITIONAL,
          CONTROL_SEQUENCE,
          DISABLED_ASSIGNMENT_SEQUENCE,
          DEPTH_TWO_DISABLE_SEQUENCE,
          DEPTH_TWO_ENABLE_SEQUENCE,
          LOGICAL_AND,
          LOGICAL_OR,
          NESTED_COMPUTED,
          NESTED_ASSIGNMENT_SEQUENCE,
          NESTED_DISABLE_SEQUENCE,
          NESTED_ENABLE_SEQUENCE,
          NESTED_SEQUENCE,
          NOOP_SEQUENCE,
          NULLISH,
          PARENTHESIZED,
          ASSERTED_SEQUENCE,
          SEQUENCE,
        } from "./copy";
        export const Example = () => <>
          <Panel title={CONDITIONAL.panelTitle} />
          <Panel title={LOGICAL_AND.panelTitle} />
          <Panel title={LOGICAL_OR.panelTitle} />
          <Panel title={NULLISH.panelTitle} />
          <Panel title={PARENTHESIZED.panelTitle} />
          <Panel title={ASSERTED.panelTitle} />
          <Panel title={COMPUTED.panelTitle} />
          <Panel title={NESTED_COMPUTED.panelTitle} />
          <Panel title={SEQUENCE.panelTitle} />
          <Panel title={NOOP_SEQUENCE.panelTitle} />
          <Panel title={NESTED_SEQUENCE.panelTitle} />
          <Panel title={ASSERTED_SEQUENCE.panelTitle} />
          <Panel title={CONDITIONAL_SEQUENCE_TRUE.panelTitle} />
          <Panel title={CONDITIONAL_SEQUENCE_FALSE.panelTitle} />
          <Panel title={CONTROL_SEQUENCE.panelTitle} />
          <Panel title={ASSIGNMENT_SEQUENCE.panelTitle} />
          <Panel title={NESTED_ASSIGNMENT_SEQUENCE.panelTitle} />
          <Panel title={ASSERTED_ASSIGNMENT_SEQUENCE.panelTitle} />
          <Panel title={ALIASED_ASSIGNMENT_SEQUENCE.panelTitle} />
          <Panel title={DISABLED_ASSIGNMENT_SEQUENCE.panelTitle} />
          <Panel title={NESTED_ENABLE_SEQUENCE.panelTitle} />
          <Panel title={DEPTH_TWO_ENABLE_SEQUENCE.panelTitle} />
          <Panel title={NESTED_DISABLE_SEQUENCE.panelTitle} />
          <Panel title={DEPTH_TWO_DISABLE_SEQUENCE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from(
        { length: 20 },
        () => ["transport-gateway", "auditor-posture"],
      ).flat(),
    );
  });

  it("preserves assignment values and logical-assignment execution order", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const noop = () => undefined;
        export const NESTED_ASSIGNMENT = { panelTitle: "Client review" };
        export const OR_SKIP = { panelTitle: "Portfolio review" };
        export const OR_EXECUTE = { panelTitle: "Mandate review" };
        export const AND_EXECUTE = { panelTitle: "Suitability review" };
        export const NULLISH_SKIP = { panelTitle: "Constraint review" };
        export const NULLISH_EXECUTE = { panelTitle: "Evidence review" };
        export const ASSIGNMENT_CAPTURE = { panelTitle: "Allocation review" };
        export const DECLARATION_CAPTURE = { panelTitle: "Restriction review" };

        let nestedAssign;
        nestedAssign = (nestedAssign = Object.assign);
        nestedAssign(NESTED_ASSIGNMENT, { panelTitle: "Gateway posture" });

        let orSkipAssign = Object.assign;
        orSkipAssign ||= (orSkipAssign = noop, Object.assign);
        orSkipAssign(OR_SKIP, { panelTitle: "Gateway posture" });

        let orExecuteAssign;
        orExecuteAssign ||= (orExecuteAssign = noop, Object.assign);
        orExecuteAssign(OR_EXECUTE, { panelTitle: "Gateway posture" });

        let andExecuteAssign = Object.assign;
        andExecuteAssign &&= (andExecuteAssign = noop, Object.assign);
        andExecuteAssign(AND_EXECUTE, { panelTitle: "Gateway posture" });

        let nullishSkipAssign = Object.assign;
        nullishSkipAssign ??= (nullishSkipAssign = noop, Object.assign);
        nullishSkipAssign(NULLISH_SKIP, { panelTitle: "Gateway posture" });

        let nullishExecuteAssign;
        nullishExecuteAssign ??= (nullishExecuteAssign = noop, Object.assign);
        nullishExecuteAssign(NULLISH_EXECUTE, { panelTitle: "Gateway posture" });

        let assignmentSource = noop;
        let assignmentCapture;
        assignmentCapture = (assignmentSource = Object.assign, assignmentSource);
        assignmentSource = noop;
        assignmentCapture(ASSIGNMENT_CAPTURE, { panelTitle: "Gateway posture" });

        let declarationSource = noop;
        const declarationCapture = (
          declarationSource = Object.assign,
          declarationSource
        );
        declarationSource = noop;
        declarationCapture(DECLARATION_CAPTURE, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import {
          AND_EXECUTE,
          ASSIGNMENT_CAPTURE,
          DECLARATION_CAPTURE,
          NESTED_ASSIGNMENT,
          NULLISH_EXECUTE,
          NULLISH_SKIP,
          OR_EXECUTE,
          OR_SKIP,
        } from "./copy";
        export const Example = () => <>
          <Panel title={NESTED_ASSIGNMENT.panelTitle} />
          <Panel title={OR_SKIP.panelTitle} />
          <Panel title={OR_EXECUTE.panelTitle} />
          <Panel title={AND_EXECUTE.panelTitle} />
          <Panel title={NULLISH_SKIP.panelTitle} />
          <Panel title={NULLISH_EXECUTE.panelTitle} />
          <Panel title={ASSIGNMENT_CAPTURE.panelTitle} />
          <Panel title={DECLARATION_CAPTURE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from(
        { length: 8 },
        () => ["transport-gateway", "auditor-posture"],
      ).flat(),
    );
  });

  it("preserves static and dynamic authority through nested member captures", () => {
    const evaluation = evaluateRepository({
      "src/copy.ts": `
        declare function getAssign(): typeof Object.assign;
        export const STATIC_MEMBER = { panelTitle: "Client review" };
        export const COMPUTED_MEMBER = { panelTitle: "Portfolio review" };
        export const RENAMED_MEMBER = { panelTitle: "Mandate review" };
        export const DYNAMIC_MEMBER = { panelTitle: "Suitability review" };
        const API = { assign: Object.assign };
        const wrapper = { API };
        const staticRun = wrapper.API.assign;
        const computedRun = wrapper["API"]["assign"];
        const { API: { assign: renamedRun } } = wrapper;
        staticRun(STATIC_MEMBER, { panelTitle: "Gateway posture" });
        computedRun(COMPUTED_MEMBER, { panelTitle: "Gateway posture" });
        renamedRun(RENAMED_MEMBER, { panelTitle: "Gateway posture" });
        const dynamicAPI = { get assign() { return getAssign(); } };
        const dynamicWrapper = { dynamicAPI };
        const dynamicRun = dynamicWrapper.dynamicAPI.assign;
        dynamicRun(DYNAMIC_MEMBER, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import {
          COMPUTED_MEMBER,
          DYNAMIC_MEMBER,
          RENAMED_MEMBER,
          STATIC_MEMBER,
        } from "./copy";
        export const Example = () => <>
          <Panel title={STATIC_MEMBER.panelTitle} />
          <Panel title={COMPUTED_MEMBER.panelTitle} />
          <Panel title={RENAMED_MEMBER.panelTitle} />
          <Panel title={DYNAMIC_MEMBER.panelTitle} />
        </>;
      `,
    });

    expect(evaluation.findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(evaluation.unresolvedExpressions).toHaveLength(1);
    expect(evaluation.unresolvedExpressions[0]?.context).toBe("JSX title");
  });

  it("retains proven authority through repeated temporal alias cycles", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Client review" };
        let a = Object.assign;
        let b = a;
        a = b;
        b = a;
        a = b;
        a(COPY, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import { COPY } from "./copy";
        export const Example = () => <Panel title={COPY.panelTitle} />;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("resolves static Object.assign sources, spreads, and prior writes", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const ASSIGNED = { panelTitle: "Client review" };
        const BASE_PATCH = { panelTitle: "Portfolio review" } as const;
        const PATCH = { ...BASE_PATCH, panelTitle: "Gateway posture" } as const;
        Object.assign(ASSIGNED, PATCH);

        export const OVERRIDDEN = { panelTitle: "Client review" };
        const TECHNICAL_BASE = { panelTitle: "Gateway posture" } as const;
        const BUSINESS_PATCH = {
          ...TECHNICAL_BASE,
          panelTitle: "Portfolio review",
        } as const;
        Object.assign(OVERRIDDEN, BUSINESS_PATCH);

        export const MUTATED = { panelTitle: "Client review" };
        const MUTATED_PATCH = { panelTitle: "Portfolio review" };
        MUTATED_PATCH.panelTitle = "Gateway posture";
        Object.assign(MUTATED, MUTATED_PATCH);
      `,
      "src/screen.tsx": `
        import { ASSIGNED, MUTATED, OVERRIDDEN } from "./copy";
        export const Example = () => <>
          <Panel title={ASSIGNED.panelTitle} />
          <Panel title={OVERRIDDEN.panelTitle} />
          <Panel title={MUTATED.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) =>
      finding.filePath === "src/screen.tsx"
      && finding.context === "JSX title"
    )).toBe(true);
  });

  it("preserves values returned by enumerable assignment-source getters", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const LITERAL_GETTER = { panelTitle: "Client review" };
        const LITERAL_SOURCE = {
          get panelTitle() { return "Gateway posture"; },
        };
        Object.assign(LITERAL_GETTER, LITERAL_SOURCE);

        export const DESCRIPTOR_GETTER = { panelTitle: "Client review" };
        const DESCRIPTOR_SOURCE = {};
        Object.defineProperty(DESCRIPTOR_SOURCE, "panelTitle", {
          enumerable: true,
          get() { return "Gateway posture"; },
        });
        Object.assign(DESCRIPTOR_GETTER, DESCRIPTOR_SOURCE);
      `,
      "src/screen.tsx": `
        import { DESCRIPTOR_GETTER, LITERAL_GETTER } from "./copy";
        export const Example = () => <>
          <Panel title={LITERAL_GETTER.panelTitle} />
          <Panel title={DESCRIPTOR_GETTER.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("marks non-static assignment-source getters as unresolved", () => {
    const evaluation = evaluateRepository({
      "src/copy.ts": `
        declare function getPanelTitle(): string;
        export const COPY = { panelTitle: "Client review" };
        const SOURCE = {
          get panelTitle() { return getPanelTitle(); },
        };
        Object.assign(COPY, SOURCE);
      `,
      "src/screen.tsx": `
        import { COPY } from "./copy";
        export const Example = () => <Panel title={COPY.panelTitle} />;
      `,
    });

    expect(evaluation.findings).toEqual([]);
    expect(evaluation.unresolvedExpressions).toHaveLength(1);
    expect(evaluation.unresolvedExpressions[0]?.context).toBe("JSX title");
  });

  it("resolves referenced property descriptors and descriptor maps", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const DEFINED = { panelTitle: "Client review" };
        const DESCRIPTOR_BASE = { value: "Portfolio review" } as const;
        const DESCRIPTOR = { ...DESCRIPTOR_BASE, value: "Client review" };
        DESCRIPTOR.value = "Gateway posture";
        Object.defineProperty(DEFINED, "panelTitle", DESCRIPTOR);

        export const MANY = { panelTitle: "Client review" };
        const TITLE_DESCRIPTOR = { value: "Gateway posture" } as const;
        const DESCRIPTOR_MAP_BASE = { panelTitle: TITLE_DESCRIPTOR } as const;
        const DESCRIPTOR_MAP = { ...DESCRIPTOR_MAP_BASE } as const;
        Object.defineProperties(MANY, DESCRIPTOR_MAP);

        export const OVERRIDDEN = { panelTitle: "Client review" };
        const TECHNICAL_DESCRIPTOR = { value: "Gateway posture" } as const;
        const BUSINESS_DESCRIPTOR = {
          ...TECHNICAL_DESCRIPTOR,
          value: "Portfolio review",
        } as const;
        Reflect.defineProperty(OVERRIDDEN, "panelTitle", BUSINESS_DESCRIPTOR);
      `,
      "src/screen.tsx": `
        import { DEFINED, MANY, OVERRIDDEN } from "./copy";
        export const Example = () => <>
          <Panel title={DEFINED.panelTitle} />
          <Panel title={MANY.panelTitle} />
          <Panel title={OVERRIDDEN.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) =>
      finding.filePath === "src/screen.tsx"
      && finding.context === "JSX title"
    )).toBe(true);
  });

  it("retains dynamic computed mutation values as conservative candidates", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        declare function getKey(): string;
        const key = getKey();

        export const ASSIGNED = { panelTitle: "Client review" };
        const SOURCE = { [key]: "Gateway posture" };
        Object.assign(ASSIGNED, SOURCE);

        export const DEFINED = { panelTitle: "Client review" };
        const DESCRIPTOR = { [key]: "Gateway posture" };
        Object.defineProperty(DEFINED, "panelTitle", DESCRIPTOR);

        export const DYNAMIC_PROPERTY = { panelTitle: "Client review" };
        Object.defineProperty(DYNAMIC_PROPERTY, key, {
          value: "Gateway posture",
        });

        export const MANY = { panelTitle: "Client review" };
        const DESCRIPTOR_MAP = { [key]: { value: "Gateway posture" } };
        Object.defineProperties(MANY, DESCRIPTOR_MAP);
      `,
      "src/screen.tsx": `
        import { ASSIGNED, DEFINED, DYNAMIC_PROPERTY, MANY } from "./copy";
        export const Example = () => <>
          <Panel title={ASSIGNED.panelTitle} />
          <Panel title={DEFINED.panelTitle} />
          <Panel title={DYNAMIC_PROPERTY.panelTitle} />
          <Panel title={MANY.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("tracks executable namespace, computed, and assignment-form API aliases", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const NAMESPACE = { panelTitle: "Client review" };
        const ObjectNamespace = Object;
        ObjectNamespace.assign(NAMESPACE, { panelTitle: "Gateway posture" });

        export const TRANSITIVE = { panelTitle: "Client review" };
        const TransitiveNamespace = ObjectNamespace;
        const transitiveAssign = TransitiveNamespace.assign;
        transitiveAssign(TRANSITIVE, { panelTitle: "Gateway posture" });

        export const COMPUTED_CALL = { panelTitle: "Client review" };
        const method = "assign";
        Object[method](COMPUTED_CALL, { panelTitle: "Gateway posture" });

        export const COMPUTED_BINDING = { panelTitle: "Client review" };
        const { [method]: computedAssign } = Object;
        computedAssign(COMPUTED_BINDING, { panelTitle: "Gateway posture" });

        export const RENAMED_ASSIGNMENT = { panelTitle: "Client review" };
        let renamedAssign;
        ({ assign: renamedAssign } = Object);
        renamedAssign(RENAMED_ASSIGNMENT, { panelTitle: "Gateway posture" });

        export const SHORTHAND_ASSIGNMENT = { panelTitle: "Client review" };
        let assign;
        ({ assign } = Object);
        assign(SHORTHAND_ASSIGNMENT, { panelTitle: "Gateway posture" });

        export const REASSIGNED = { panelTitle: "Client review" };
        let replacedAssign;
        ({ assign: replacedAssign } = Object);
        replacedAssign = () => undefined;
        replacedAssign(REASSIGNED, { panelTitle: "Gateway posture" });

        export const REST_COPY = { panelTitle: "Client review" };
        const { ...apis } = Object;
        apis.assign(REST_COPY, { panelTitle: "Gateway posture" });

        export const MUTABLE_INITIALIZER = { panelTitle: "Client review" };
        let mutableAssign = Object.assign;
        mutableAssign(MUTABLE_INITIALIZER, { panelTitle: "Gateway posture" });

        export const REASSIGNED_INITIALIZER = { panelTitle: "Client review" };
        let reassignedInitializer = Object.assign;
        reassignedInitializer = () => undefined;
        reassignedInitializer(REASSIGNED_INITIALIZER, {
          panelTitle: "Gateway posture",
        });

        export const CONDITIONAL_REASSIGNMENT = { panelTitle: "Client review" };
        let conditionalAssign = Object.assign;
        if (getFlag()) conditionalAssign = () => undefined;
        conditionalAssign(CONDITIONAL_REASSIGNMENT, {
          panelTitle: "Gateway posture",
        });

        export const CAPTURED_INITIALIZER = { panelTitle: "Client review" };
        let assignBeforeCapture = Object.assign;
        const capturedAssign = assignBeforeCapture;
        assignBeforeCapture = () => undefined;
        capturedAssign(CAPTURED_INITIALIZER, { panelTitle: "Gateway posture" });

        export const CAPTURED_AFTER_BARRIER = { panelTitle: "Client review" };
        let replacedBeforeCapture = Object.assign;
        replacedBeforeCapture = () => undefined;
        const capturedReplacement = replacedBeforeCapture;
        capturedReplacement(CAPTURED_AFTER_BARRIER, {
          panelTitle: "Gateway posture",
        });
      `,
      "src/screen.tsx": `
        import {
          CAPTURED_AFTER_BARRIER,
          CAPTURED_INITIALIZER,
          COMPUTED_BINDING,
          COMPUTED_CALL,
          CONDITIONAL_REASSIGNMENT,
          NAMESPACE,
          REASSIGNED,
          REASSIGNED_INITIALIZER,
          RENAMED_ASSIGNMENT,
          REST_COPY,
          SHORTHAND_ASSIGNMENT,
          TRANSITIVE,
          MUTABLE_INITIALIZER,
        } from "./copy";
        export const Example = () => <>
          <Panel title={NAMESPACE.panelTitle} />
          <Panel title={TRANSITIVE.panelTitle} />
          <Panel title={COMPUTED_CALL.panelTitle} />
          <Panel title={COMPUTED_BINDING.panelTitle} />
          <Panel title={RENAMED_ASSIGNMENT.panelTitle} />
          <Panel title={SHORTHAND_ASSIGNMENT.panelTitle} />
          <Panel title={REASSIGNED.panelTitle} />
          <Panel title={REST_COPY.panelTitle} />
          <Panel title={MUTABLE_INITIALIZER.panelTitle} />
          <Panel title={REASSIGNED_INITIALIZER.panelTitle} />
          <Panel title={CONDITIONAL_REASSIGNMENT.panelTitle} />
          <Panel title={CAPTURED_INITIALIZER.panelTitle} />
          <Panel title={CAPTURED_AFTER_BARRIER.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from({ length: 9 }, () => [
        "transport-gateway",
        "auditor-posture",
      ]).flat(),
    );
  });

  it("preserves ordered removal, update, and descriptor enumerability semantics", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const DELETED = { panelTitle: "Client review" };
        const DELETED_SOURCE = { panelTitle: "Gateway posture" };
        delete DELETED_SOURCE.panelTitle;
        Object.assign(DELETED, DELETED_SOURCE);

        export const WRITTEN_DELETED = { panelTitle: "Client review" };
        const WRITTEN_DELETED_SOURCE = { panelTitle: "Portfolio review" };
        WRITTEN_DELETED_SOURCE.panelTitle = "Gateway posture";
        delete WRITTEN_DELETED_SOURCE.panelTitle;
        Object.assign(WRITTEN_DELETED, WRITTEN_DELETED_SOURCE);

        export const CONDITIONAL = { panelTitle: "Client review" };
        const CONDITIONAL_SOURCE = { panelTitle: "Gateway posture" };
        if (getFlag()) delete CONDITIONAL_SOURCE.panelTitle;
        Object.assign(CONDITIONAL, CONDITIONAL_SOURCE);

        export const UPDATED = { panelTitle: "Gateway posture" };
        const UPDATED_SOURCE = { panelTitle: "Gateway posture" };
        UPDATED_SOURCE.panelTitle++;
        Object.assign(UPDATED, UPDATED_SOURCE);

        export const DELETED_DESCRIPTOR = { panelTitle: "Client review" };
        const DESCRIPTOR = { value: "Gateway posture" };
        delete DESCRIPTOR.value;
        Object.defineProperty(DELETED_DESCRIPTOR, "panelTitle", DESCRIPTOR);

        export const DELETED_MAP = { panelTitle: "Client review" };
        const MAP = { panelTitle: { value: "Gateway posture" } };
        delete MAP.panelTitle;
        Object.defineProperties(DELETED_MAP, MAP);

        export const DELETED_NESTED = { panelTitle: "Client review" };
        const NESTED_DESCRIPTOR = { value: "Gateway posture" };
        const NESTED_MAP = { panelTitle: NESTED_DESCRIPTOR };
        delete NESTED_DESCRIPTOR.value;
        Object.defineProperties(DELETED_NESTED, NESTED_MAP);

        export const NON_ENUMERABLE = { panelTitle: "Client review" };
        const NON_ENUMERABLE_SOURCE = {};
        Object.defineProperty(NON_ENUMERABLE_SOURCE, "panelTitle", {
          value: "Gateway posture",
        });
        Object.assign(NON_ENUMERABLE, NON_ENUMERABLE_SOURCE);

        export const ENUMERABLE = { panelTitle: "Client review" };
        const ENUMERABLE_SOURCE = {};
        Object.defineProperty(ENUMERABLE_SOURCE, "panelTitle", {
          enumerable: true,
          value: "Gateway posture",
        });
        Object.assign(ENUMERABLE, ENUMERABLE_SOURCE);

        export const ALIASED_HIDDEN = { panelTitle: "Client review" };
        const ALIASED_HIDDEN_SOURCE = {};
        const hidden = false;
        const hiddenAlias = hidden;
        Object.defineProperty(ALIASED_HIDDEN_SOURCE, "panelTitle", {
          enumerable: hiddenAlias,
          value: "Gateway posture",
        });
        Object.assign(ALIASED_HIDDEN, ALIASED_HIDDEN_SOURCE);

        export const ALIASED_VISIBLE = { panelTitle: "Client review" };
        const ALIASED_VISIBLE_SOURCE = {};
        const visible = true;
        Object.defineProperty(ALIASED_VISIBLE_SOURCE, "panelTitle", {
          enumerable: visible,
          value: "Gateway posture",
        });
        Object.assign(ALIASED_VISIBLE, ALIASED_VISIBLE_SOURCE);

        export const BIGINT_HIDDEN = { panelTitle: "Client review" };
        const BIGINT_HIDDEN_SOURCE = {};
        const bigintHidden = 0n;
        Object.defineProperty(BIGINT_HIDDEN_SOURCE, "panelTitle", {
          enumerable: bigintHidden,
          value: "Gateway posture",
        });
        Object.assign(BIGINT_HIDDEN, BIGINT_HIDDEN_SOURCE);

        export const BIGINT_VISIBLE = { panelTitle: "Client review" };
        const BIGINT_VISIBLE_SOURCE = {};
        const bigintVisible = 1n;
        Object.defineProperty(BIGINT_VISIBLE_SOURCE, "panelTitle", {
          enumerable: bigintVisible,
          value: "Gateway posture",
        });
        Object.assign(BIGINT_VISIBLE, BIGINT_VISIBLE_SOURCE);
      `,
      "src/screen.tsx": `
        import {
          CONDITIONAL,
          ALIASED_HIDDEN,
          ALIASED_VISIBLE,
          BIGINT_HIDDEN,
          BIGINT_VISIBLE,
          DELETED,
          DELETED_DESCRIPTOR,
          DELETED_MAP,
          DELETED_NESTED,
          ENUMERABLE,
          NON_ENUMERABLE,
          UPDATED,
          WRITTEN_DELETED,
        } from "./copy";
        export const Example = () => <>
          <Panel title={DELETED.panelTitle} />
          <Panel title={WRITTEN_DELETED.panelTitle} />
          <Panel title={CONDITIONAL.panelTitle} />
          <Panel title={UPDATED.panelTitle} />
          <Panel title={DELETED_DESCRIPTOR.panelTitle} />
          <Panel title={DELETED_MAP.panelTitle} />
          <Panel title={DELETED_NESTED.panelTitle} />
          <Panel title={NON_ENUMERABLE.panelTitle} />
          <Panel title={ENUMERABLE.panelTitle} />
          <Panel title={ALIASED_HIDDEN.panelTitle} />
          <Panel title={ALIASED_VISIBLE.panelTitle} />
          <Panel title={BIGINT_HIDDEN.panelTitle} />
          <Panel title={BIGINT_VISIBLE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("tracks mutable destructuring and logical mutation API assignments", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const DESTRUCTURED_CAPTURE = { panelTitle: "Client review" };
        let { assign: mutableAssign } = Object;
        const capturedAssign = mutableAssign;
        mutableAssign = () => undefined;
        capturedAssign(DESTRUCTURED_CAPTURE, { panelTitle: "Gateway posture" });

        export const OR_INITIALIZED = { panelTitle: "Client review" };
        let orAssign;
        orAssign ||= Object.assign;
        orAssign(OR_INITIALIZED, { panelTitle: "Gateway posture" });

        export const NULLISH_INITIALIZED = { panelTitle: "Client review" };
        let nullishAssign;
        nullishAssign ??= Object.assign;
        nullishAssign(NULLISH_INITIALIZED, { panelTitle: "Gateway posture" });

        export const CONDITIONAL_AND = { panelTitle: "Client review" };
        let conditionalAnd = getFlag() ? () => undefined : undefined;
        conditionalAnd &&= Object.assign;
        conditionalAnd(CONDITIONAL_AND, { panelTitle: "Gateway posture" });

        export const AND_REPLACED = { panelTitle: "Client review" };
        let andReplaced = Object.assign;
        andReplaced &&= () => undefined;
        andReplaced(AND_REPLACED, { panelTitle: "Gateway posture" });

        export const OR_PRESERVED = { panelTitle: "Client review" };
        let orPreserved = Object.assign;
        orPreserved ||= () => undefined;
        orPreserved(OR_PRESERVED, { panelTitle: "Gateway posture" });

        export const NULLISH_PRESERVED = { panelTitle: "Client review" };
        let nullishPreserved = Object.assign;
        nullishPreserved ??= () => undefined;
        nullishPreserved(NULLISH_PRESERVED, { panelTitle: "Gateway posture" });

        export const TRUTHY_NON_API = { panelTitle: "Client review" };
        let truthyNonApi = () => undefined;
        truthyNonApi ||= Object.assign;
        truthyNonApi(TRUTHY_NON_API, { panelTitle: "Gateway posture" });

        export const FALSY_AND = { panelTitle: "Client review" };
        let falsyAnd;
        falsyAnd &&= Object.assign;
        falsyAnd(FALSY_AND, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import {
          AND_REPLACED,
          CONDITIONAL_AND,
          DESTRUCTURED_CAPTURE,
          FALSY_AND,
          NULLISH_INITIALIZED,
          NULLISH_PRESERVED,
          OR_INITIALIZED,
          OR_PRESERVED,
          TRUTHY_NON_API,
        } from "./copy";
        export const Example = () => <>
          <Panel title={DESTRUCTURED_CAPTURE.panelTitle} />
          <Panel title={OR_INITIALIZED.panelTitle} />
          <Panel title={NULLISH_INITIALIZED.panelTitle} />
          <Panel title={CONDITIONAL_AND.panelTitle} />
          <Panel title={AND_REPLACED.panelTitle} />
          <Panel title={OR_PRESERVED.panelTitle} />
          <Panel title={NULLISH_PRESERVED.panelTitle} />
          <Panel title={TRUTHY_NON_API.panelTitle} />
          <Panel title={FALSY_AND.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from({ length: 6 }, () => [
        "transport-gateway",
        "auditor-posture",
      ]).flat(),
    );
  });

  it("tracks reachable mutation authorities, tuple captures, and signed BigInt flags", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        const noop = () => undefined;

        export const CONDITIONAL_OR = { panelTitle: "Client review" };
        let conditionalOr;
        conditionalOr ||= getFlag() ? Object.assign : noop;
        conditionalOr(CONDITIONAL_OR, { panelTitle: "Gateway posture" });

        export const STATIC_OR = { panelTitle: "Client review" };
        let staticOr;
        staticOr ||= false ? Object.assign : noop;
        staticOr(STATIC_OR, { panelTitle: "Gateway posture" });

        export const CONDITIONAL_NULLISH = { panelTitle: "Client review" };
        let conditionalNullish;
        conditionalNullish ??= getFlag() ? Object.assign : noop;
        conditionalNullish(CONDITIONAL_NULLISH, { panelTitle: "Gateway posture" });

        export const CONDITIONAL_AND = { panelTitle: "Client review" };
        let conditionalAnd = noop;
        conditionalAnd &&= getFlag() ? Object.assign : noop;
        conditionalAnd(CONDITIONAL_AND, { panelTitle: "Gateway posture" });

        export const NESTED_LOGICAL = { panelTitle: "Client review" };
        let nestedLogical;
        nestedLogical ||= getCandidate() || Object.assign;
        nestedLogical(NESTED_LOGICAL, { panelTitle: "Gateway posture" });

        export const CONDITIONAL_CAPTURE = { panelTitle: "Client review" };
        let assignBeforeConditionalCapture = Object.assign;
        const conditionalCapture = getFlag()
          ? assignBeforeConditionalCapture
          : noop;
        assignBeforeConditionalCapture = noop;
        conditionalCapture(CONDITIONAL_CAPTURE, { panelTitle: "Gateway posture" });

        export const STATIC_CAPTURE = { panelTitle: "Client review" };
        let assignBeforeStaticCapture = Object.assign;
        const staticCapture = false ? assignBeforeStaticCapture : noop;
        assignBeforeStaticCapture = noop;
        staticCapture(STATIC_CAPTURE, { panelTitle: "Gateway posture" });

        export const TUPLE_CAPTURE = { panelTitle: "Client review" };
        let [tupleAssign] = [Object.assign];
        const capturedTupleAssign = tupleAssign;
        tupleAssign = noop;
        capturedTupleAssign(TUPLE_CAPTURE, { panelTitle: "Gateway posture" });

        export const TUPLE_AFTER_BARRIER = { panelTitle: "Client review" };
        let [tupleAfterBarrier] = [Object.assign];
        tupleAfterBarrier = noop;
        const capturedAfterBarrier = tupleAfterBarrier;
        capturedAfterBarrier(TUPLE_AFTER_BARRIER, {
          panelTitle: "Gateway posture",
        });

        export const TUPLE_REFLECT = { panelTitle: "Client review" };
        let [tupleReflectSet] = [Reflect.set];
        tupleReflectSet(TUPLE_REFLECT, "panelTitle", "Gateway posture");

        export const NESTED_TUPLE = { panelTitle: "Client review" };
        let [[nestedTupleAssign]] = [[Object.assign]];
        nestedTupleAssign(NESTED_TUPLE, { panelTitle: "Gateway posture" });

        export const NESTED_TUPLE_REFLECT = { panelTitle: "Client review" };
        let [[nestedTupleReflectSet]] = [[Reflect.set]];
        nestedTupleReflectSet(
          NESTED_TUPLE_REFLECT,
          "panelTitle",
          "Gateway posture",
        );

        export const ARRAY_OBJECT = { panelTitle: "Client review" };
        let [{ assign: arrayObjectAssign }] = [Object];
        arrayObjectAssign(ARRAY_OBJECT, { panelTitle: "Gateway posture" });

        export const ARRAY_OBJECT_REFLECT = { panelTitle: "Client review" };
        let [{ set: arrayObjectReflectSet }] = [Reflect];
        arrayObjectReflectSet(
          ARRAY_OBJECT_REFLECT,
          "panelTitle",
          "Gateway posture",
        );

        export const OBJECT_ARRAY = { panelTitle: "Client review" };
        let { api: [objectArrayAssign] } = { api: [Object.assign] };
        objectArrayAssign(OBJECT_ARRAY, { panelTitle: "Gateway posture" });

        export const OBJECT_ARRAY_REFLECT = { panelTitle: "Client review" };
        let { api: [objectArrayReflectSet] } = { api: [Reflect.set] };
        objectArrayReflectSet(
          OBJECT_ARRAY_REFLECT,
          "panelTitle",
          "Gateway posture",
        );

        export const ARRAY_DEFAULT = { panelTitle: "Client review" };
        let [arrayDefaultAssign = Object.assign] = [];
        arrayDefaultAssign(ARRAY_DEFAULT, { panelTitle: "Gateway posture" });

        export const ARRAY_UNDEFINED_DEFAULT = { panelTitle: "Client review" };
        let [arrayDefaultReflectSet = Reflect.set] = [undefined];
        arrayDefaultReflectSet(
          ARRAY_UNDEFINED_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const OBJECT_NESTED_DEFAULT = { panelTitle: "Client review" };
        let { api: [objectDefaultAssign] = [Object.assign] } = {};
        objectDefaultAssign(OBJECT_NESTED_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const OBJECT_DEFAULT = { panelTitle: "Client review" };
        let { set: objectDefaultReflectSet = Reflect.set } = {};
        objectDefaultReflectSet(
          OBJECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const DEFAULT_OVERRIDDEN = { panelTitle: "Client review" };
        let [defaultOverride = Object.assign] = [noop];
        defaultOverride(DEFAULT_OVERRIDDEN, { panelTitle: "Gateway posture" });

        export const NULL_DEFAULT = { panelTitle: "Client review" };
        let [nullDefault = Object.assign] = [null];
        nullDefault(NULL_DEFAULT, { panelTitle: "Gateway posture" });

        const undefinedAlias = undefined;
        export const ALIASED_DEFAULT = { panelTitle: "Client review" };
        let [aliasedDefaultAssign = Object.assign] = [undefinedAlias];
        aliasedDefaultAssign(ALIASED_DEFAULT, { panelTitle: "Gateway posture" });

        export const ALIASED_DEFAULT_REFLECT = { panelTitle: "Client review" };
        let [aliasedDefaultReflectSet = Reflect.set] = [undefinedAlias];
        aliasedDefaultReflectSet(
          ALIASED_DEFAULT_REFLECT,
          "panelTitle",
          "Gateway posture",
        );

        export const SHADOWED_DEFAULT = { panelTitle: "Client review" };
        function applyShadowedDefault(undefined) {
          let [shadowedDefaultAssign = Object.assign] = [undefined];
          shadowedDefaultAssign(SHADOWED_DEFAULT, {
            panelTitle: "Gateway posture",
          });
        }

        export const SHADOWED_DEFAULT_REFLECT = { panelTitle: "Client review" };
        function applyShadowedDefaultReflect(undefined) {
          let [shadowedDefaultReflectSet = Reflect.set] = [undefined];
          shadowedDefaultReflectSet(
            SHADOWED_DEFAULT_REFLECT,
            "panelTitle",
            "Gateway posture",
          );
        }

        export const VOID_DEFAULT = { panelTitle: "Client review" };
        let [voidDefaultAssign = Object.assign] = [void 0];
        voidDefaultAssign(VOID_DEFAULT, { panelTitle: "Gateway posture" });

        const definedAlias = noop;
        export const DEFINED_ALIAS_DEFAULT = { panelTitle: "Client review" };
        let [definedAliasDefault = Object.assign] = [definedAlias];
        definedAliasDefault(DEFINED_ALIAS_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        const emptyTuple = [] as const;
        export const ALIASED_TUPLE_DEFAULT = { panelTitle: "Client review" };
        let [aliasedTupleAssign = Object.assign] = emptyTuple;
        aliasedTupleAssign(ALIASED_TUPLE_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        const emptyTupleAlias = emptyTuple;
        export const MULTI_ALIAS_TUPLE_DEFAULT = { panelTitle: "Client review" };
        let [aliasedTupleReflectSet = Reflect.set] = emptyTupleAlias;
        aliasedTupleReflectSet(
          MULTI_ALIAS_TUPLE_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        const populatedTuple = [noop] as const;
        export const POPULATED_TUPLE_DEFAULT = { panelTitle: "Client review" };
        let [populatedTupleAssign = Object.assign] = populatedTuple;
        populatedTupleAssign(POPULATED_TUPLE_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        const emptyObject = {} as const;
        export const ALIASED_OBJECT_DEFAULT = { panelTitle: "Client review" };
        let { assign: aliasedObjectAssign = Object.assign } = emptyObject;
        aliasedObjectAssign(ALIASED_OBJECT_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        const nestedEmptyObject = { api: [] } as const;
        export const ALIASED_NESTED_DEFAULT = { panelTitle: "Client review" };
        let { api: [aliasedNestedReflectSet = Reflect.set] } = nestedEmptyObject;
        aliasedNestedReflectSet(
          ALIASED_NESTED_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const DYNAMIC_TUPLE_DEFAULT = { panelTitle: "Client review" };
        function applyDynamicTupleDefault(values) {
          let [dynamicTupleAssign = Object.assign] = values;
          dynamicTupleAssign(DYNAMIC_TUPLE_DEFAULT, {
            panelTitle: "Gateway posture",
          });
        }

        export const MUTABLE_OWNER_DEFAULT = { panelTitle: "Client review" };
        let mutableOwner = [];
        let [mutableOwnerAssign = Object.assign] = mutableOwner;
        mutableOwnerAssign(MUTABLE_OWNER_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const REASSIGNED_OWNER_DEFAULT = { panelTitle: "Client review" };
        let reassignedOwner = [];
        reassignedOwner = [noop];
        let [reassignedOwnerAssign = Object.assign] = reassignedOwner;
        reassignedOwnerAssign(REASSIGNED_OWNER_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const CONDITIONAL_OWNER_DEFAULT = { panelTitle: "Client review" };
        let conditionalOwner = [];
        if (getFlag()) conditionalOwner = [noop];
        let [conditionalOwnerAssign = Object.assign] = conditionalOwner;
        conditionalOwnerAssign(CONDITIONAL_OWNER_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const OWNER_CAPTURE_BEFORE_WRITE = { panelTitle: "Client review" };
        let ownerBeforeWrite = [];
        const capturedBeforeWrite = ownerBeforeWrite;
        ownerBeforeWrite = [noop];
        let [capturedBeforeWriteAssign = Object.assign] = capturedBeforeWrite;
        capturedBeforeWriteAssign(OWNER_CAPTURE_BEFORE_WRITE, {
          panelTitle: "Gateway posture",
        });

        export const OWNER_CAPTURE_AFTER_WRITE = { panelTitle: "Client review" };
        let ownerAfterWrite = [];
        ownerAfterWrite = [noop];
        const capturedAfterWrite = ownerAfterWrite;
        let [capturedAfterWriteAssign = Object.assign] = capturedAfterWrite;
        capturedAfterWriteAssign(OWNER_CAPTURE_AFTER_WRITE, {
          panelTitle: "Gateway posture",
        });

        export const MUTABLE_OWNER_REFLECT_DEFAULT = { panelTitle: "Client review" };
        let mutableReflectOwner = [];
        let [mutableOwnerReflectSet = Reflect.set] = mutableReflectOwner;
        mutableOwnerReflectSet(
          MUTABLE_OWNER_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const REASSIGNED_OWNER_REFLECT_DEFAULT = { panelTitle: "Client review" };
        let reassignedReflectOwner = [];
        reassignedReflectOwner = [noop];
        let [reassignedOwnerReflectSet = Reflect.set] = reassignedReflectOwner;
        reassignedOwnerReflectSet(
          REASSIGNED_OWNER_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const CONDITIONAL_OWNER_REFLECT_DEFAULT = { panelTitle: "Client review" };
        let conditionalReflectOwner = [];
        if (getFlag()) conditionalReflectOwner = [noop];
        let [conditionalOwnerReflectSet = Reflect.set] = conditionalReflectOwner;
        conditionalOwnerReflectSet(
          CONDITIONAL_OWNER_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const REFLECT_CAPTURE_BEFORE_WRITE = { panelTitle: "Client review" };
        let reflectOwnerBeforeWrite = [];
        const capturedReflectBeforeWrite = reflectOwnerBeforeWrite;
        reflectOwnerBeforeWrite = [noop];
        let [capturedBeforeWriteReflectSet = Reflect.set] = capturedReflectBeforeWrite;
        capturedBeforeWriteReflectSet(
          REFLECT_CAPTURE_BEFORE_WRITE,
          "panelTitle",
          "Gateway posture",
        );

        export const REFLECT_CAPTURE_AFTER_WRITE = { panelTitle: "Client review" };
        let reflectOwnerAfterWrite = [];
        reflectOwnerAfterWrite = [noop];
        const capturedReflectAfterWrite = reflectOwnerAfterWrite;
        let [capturedAfterWriteReflectSet = Reflect.set] = capturedReflectAfterWrite;
        capturedAfterWriteReflectSet(
          REFLECT_CAPTURE_AFTER_WRITE,
          "panelTitle",
          "Gateway posture",
        );

        export const LOGICAL_OWNER_DEFAULT = { panelTitle: "Client review" };
        let logicalOwner;
        logicalOwner ||= [noop];
        let [logicalOwnerAssign = Object.assign] = logicalOwner;
        logicalOwnerAssign(LOGICAL_OWNER_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const INDEX_WRITE_OWNER_DEFAULT = { panelTitle: "Client review" };
        const indexWriteOwner = [];
        indexWriteOwner[0] = noop;
        let [indexWriteOwnerAssign = Object.assign] = indexWriteOwner;
        indexWriteOwnerAssign(INDEX_WRITE_OWNER_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const CAPTURED_INDEX_WRITE_DEFAULT = { panelTitle: "Client review" };
        const capturedIndexOwner = [];
        const capturedIndexAlias = capturedIndexOwner;
        capturedIndexOwner[0] = noop;
        let [capturedIndexAssign = Object.assign] = capturedIndexAlias;
        capturedIndexAssign(CAPTURED_INDEX_WRITE_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const CONDITIONAL_INDEX_WRITE_DEFAULT = { panelTitle: "Client review" };
        const conditionalIndexOwner = [];
        if (getFlag()) conditionalIndexOwner[0] = noop;
        let [conditionalIndexAssign = Object.assign] = conditionalIndexOwner;
        conditionalIndexAssign(CONDITIONAL_INDEX_WRITE_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const PROPERTY_WRITE_OWNER_DEFAULT = { panelTitle: "Client review" };
        const propertyWriteOwner = {};
        propertyWriteOwner.assign = noop;
        let { assign: propertyWriteAssign = Object.assign } = propertyWriteOwner;
        propertyWriteAssign(PROPERTY_WRITE_OWNER_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const CONDITIONAL_PROPERTY_WRITE_DEFAULT = { panelTitle: "Client review" };
        const conditionalPropertyOwner = {};
        if (getFlag()) conditionalPropertyOwner.assign = noop;
        let { assign: conditionalPropertyAssign = Object.assign } = conditionalPropertyOwner;
        conditionalPropertyAssign(CONDITIONAL_PROPERTY_WRITE_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const LOGICAL_REFLECT_OWNER_DEFAULT = { panelTitle: "Client review" };
        let logicalReflectOwner;
        logicalReflectOwner ||= [noop];
        let [logicalOwnerReflectSet = Reflect.set] = logicalReflectOwner;
        logicalOwnerReflectSet(
          LOGICAL_REFLECT_OWNER_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const INDEX_WRITE_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const indexWriteReflectOwner = [];
        indexWriteReflectOwner[0] = noop;
        let [indexWriteReflectSet = Reflect.set] = indexWriteReflectOwner;
        indexWriteReflectSet(
          INDEX_WRITE_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const CAPTURED_INDEX_WRITE_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const capturedIndexReflectOwner = [];
        const capturedIndexReflectAlias = capturedIndexReflectOwner;
        capturedIndexReflectOwner[0] = noop;
        let [capturedIndexReflectSet = Reflect.set] = capturedIndexReflectAlias;
        capturedIndexReflectSet(
          CAPTURED_INDEX_WRITE_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const CONDITIONAL_INDEX_WRITE_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const conditionalIndexReflectOwner = [];
        if (getFlag()) conditionalIndexReflectOwner[0] = noop;
        let [conditionalIndexReflectSet = Reflect.set] = conditionalIndexReflectOwner;
        conditionalIndexReflectSet(
          CONDITIONAL_INDEX_WRITE_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const PROPERTY_WRITE_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const propertyWriteReflectOwner = {};
        propertyWriteReflectOwner.set = noop;
        let { set: propertyWriteReflectSet = Reflect.set } = propertyWriteReflectOwner;
        propertyWriteReflectSet(
          PROPERTY_WRITE_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const CONDITIONAL_PROPERTY_WRITE_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const conditionalPropertyReflectOwner = {};
        if (getFlag()) conditionalPropertyReflectOwner.set = noop;
        let { set: conditionalPropertyReflectSet = Reflect.set } = conditionalPropertyReflectOwner;
        conditionalPropertyReflectSet(
          CONDITIONAL_PROPERTY_WRITE_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const LOGICAL_INDEX_OR_DEFAULT = { panelTitle: "Client review" };
        const logicalIndexOrOwner = [getFlag() ? undefined : noop];
        logicalIndexOrOwner[0] ||= noop;
        let [logicalIndexOrAssign = Object.assign] = logicalIndexOrOwner;
        logicalIndexOrAssign(LOGICAL_INDEX_OR_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const LOGICAL_INDEX_NULLISH_DEFAULT = { panelTitle: "Client review" };
        const logicalIndexNullishOwner = [getFlag() ? null : noop];
        logicalIndexNullishOwner[0] ??= noop;
        let [logicalIndexNullishAssign = Object.assign] = logicalIndexNullishOwner;
        logicalIndexNullishAssign(LOGICAL_INDEX_NULLISH_DEFAULT, {
          panelTitle: "Gateway posture",
        });

        export const LOGICAL_INDEX_OR_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const logicalIndexOrReflectOwner = [getFlag() ? undefined : noop];
        logicalIndexOrReflectOwner[0] ||= noop;
        let [logicalIndexOrReflectSet = Reflect.set] = logicalIndexOrReflectOwner;
        logicalIndexOrReflectSet(
          LOGICAL_INDEX_OR_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const LOGICAL_INDEX_NULLISH_REFLECT_DEFAULT = { panelTitle: "Client review" };
        const logicalIndexNullishReflectOwner = [getFlag() ? null : noop];
        logicalIndexNullishReflectOwner[0] ??= noop;
        let [logicalIndexNullishReflectSet = Reflect.set] = logicalIndexNullishReflectOwner;
        logicalIndexNullishReflectSet(
          LOGICAL_INDEX_NULLISH_REFLECT_DEFAULT,
          "panelTitle",
          "Gateway posture",
        );

        export const SIGNED_ZERO = { panelTitle: "Client review" };
        const SIGNED_ZERO_SOURCE = {};
        Object.defineProperty(SIGNED_ZERO_SOURCE, "panelTitle", {
          enumerable: -0n,
          value: "Gateway posture",
        });
        Object.assign(SIGNED_ZERO, SIGNED_ZERO_SOURCE);

        export const ALIASED_SIGNED_ZERO = { panelTitle: "Client review" };
        const ALIASED_SIGNED_ZERO_SOURCE = {};
        const signedZero = -0n;
        const signedZeroAlias = signedZero;
        Object.defineProperty(ALIASED_SIGNED_ZERO_SOURCE, "panelTitle", {
          enumerable: signedZeroAlias,
          value: "Gateway posture",
        });
        Object.assign(ALIASED_SIGNED_ZERO, ALIASED_SIGNED_ZERO_SOURCE);

        export const SIGNED_VISIBLE = { panelTitle: "Client review" };
        const SIGNED_VISIBLE_SOURCE = {};
        Object.defineProperty(SIGNED_VISIBLE_SOURCE, "panelTitle", {
          enumerable: -1n,
          value: "Gateway posture",
        });
        Object.assign(SIGNED_VISIBLE, SIGNED_VISIBLE_SOURCE);
      `,
      "src/screen.tsx": `
        import {
          ALIASED_NESTED_DEFAULT,
          ALIASED_OBJECT_DEFAULT,
          ALIASED_SIGNED_ZERO,
          ALIASED_DEFAULT,
          ALIASED_DEFAULT_REFLECT,
          ALIASED_TUPLE_DEFAULT,
          ARRAY_DEFAULT,
          ARRAY_OBJECT,
          ARRAY_OBJECT_REFLECT,
          ARRAY_UNDEFINED_DEFAULT,
          CONDITIONAL_AND,
          CONDITIONAL_CAPTURE,
          CONDITIONAL_NULLISH,
          CONDITIONAL_OR,
          NESTED_TUPLE,
          NESTED_TUPLE_REFLECT,
          NESTED_LOGICAL,
          MULTI_ALIAS_TUPLE_DEFAULT,
          OBJECT_ARRAY,
          OBJECT_ARRAY_REFLECT,
          OBJECT_DEFAULT,
          OBJECT_NESTED_DEFAULT,
          POPULATED_TUPLE_DEFAULT,
          SIGNED_VISIBLE,
          SIGNED_ZERO,
          STATIC_CAPTURE,
          STATIC_OR,
          DEFAULT_OVERRIDDEN,
          DEFINED_ALIAS_DEFAULT,
          DYNAMIC_TUPLE_DEFAULT,
          MUTABLE_OWNER_DEFAULT,
          REASSIGNED_OWNER_DEFAULT,
          CONDITIONAL_OWNER_DEFAULT,
          OWNER_CAPTURE_BEFORE_WRITE,
          OWNER_CAPTURE_AFTER_WRITE,
          MUTABLE_OWNER_REFLECT_DEFAULT,
          REASSIGNED_OWNER_REFLECT_DEFAULT,
          CONDITIONAL_OWNER_REFLECT_DEFAULT,
          REFLECT_CAPTURE_BEFORE_WRITE,
          REFLECT_CAPTURE_AFTER_WRITE,
          LOGICAL_OWNER_DEFAULT,
          INDEX_WRITE_OWNER_DEFAULT,
          CAPTURED_INDEX_WRITE_DEFAULT,
          CONDITIONAL_INDEX_WRITE_DEFAULT,
          PROPERTY_WRITE_OWNER_DEFAULT,
          CONDITIONAL_PROPERTY_WRITE_DEFAULT,
          LOGICAL_REFLECT_OWNER_DEFAULT,
          INDEX_WRITE_REFLECT_DEFAULT,
          CAPTURED_INDEX_WRITE_REFLECT_DEFAULT,
          CONDITIONAL_INDEX_WRITE_REFLECT_DEFAULT,
          PROPERTY_WRITE_REFLECT_DEFAULT,
          CONDITIONAL_PROPERTY_WRITE_REFLECT_DEFAULT,
          LOGICAL_INDEX_OR_DEFAULT,
          LOGICAL_INDEX_NULLISH_DEFAULT,
          LOGICAL_INDEX_OR_REFLECT_DEFAULT,
          LOGICAL_INDEX_NULLISH_REFLECT_DEFAULT,
          NULL_DEFAULT,
          SHADOWED_DEFAULT,
          SHADOWED_DEFAULT_REFLECT,
          TUPLE_AFTER_BARRIER,
          TUPLE_CAPTURE,
          TUPLE_REFLECT,
          VOID_DEFAULT,
        } from "./copy";
        export const Example = () => <>
          <Panel title={CONDITIONAL_OR.panelTitle} />
          <Panel title={STATIC_OR.panelTitle} />
          <Panel title={CONDITIONAL_NULLISH.panelTitle} />
          <Panel title={CONDITIONAL_AND.panelTitle} />
          <Panel title={NESTED_LOGICAL.panelTitle} />
          <Panel title={CONDITIONAL_CAPTURE.panelTitle} />
          <Panel title={STATIC_CAPTURE.panelTitle} />
          <Panel title={TUPLE_CAPTURE.panelTitle} />
          <Panel title={TUPLE_AFTER_BARRIER.panelTitle} />
          <Panel title={TUPLE_REFLECT.panelTitle} />
          <Panel title={NESTED_TUPLE.panelTitle} />
          <Panel title={NESTED_TUPLE_REFLECT.panelTitle} />
          <Panel title={ARRAY_OBJECT.panelTitle} />
          <Panel title={ARRAY_OBJECT_REFLECT.panelTitle} />
          <Panel title={OBJECT_ARRAY.panelTitle} />
          <Panel title={OBJECT_ARRAY_REFLECT.panelTitle} />
          <Panel title={ARRAY_DEFAULT.panelTitle} />
          <Panel title={ARRAY_UNDEFINED_DEFAULT.panelTitle} />
          <Panel title={OBJECT_NESTED_DEFAULT.panelTitle} />
          <Panel title={OBJECT_DEFAULT.panelTitle} />
          <Panel title={DEFAULT_OVERRIDDEN.panelTitle} />
          <Panel title={NULL_DEFAULT.panelTitle} />
          <Panel title={ALIASED_DEFAULT.panelTitle} />
          <Panel title={ALIASED_DEFAULT_REFLECT.panelTitle} />
          <Panel title={SHADOWED_DEFAULT.panelTitle} />
          <Panel title={SHADOWED_DEFAULT_REFLECT.panelTitle} />
          <Panel title={VOID_DEFAULT.panelTitle} />
          <Panel title={DEFINED_ALIAS_DEFAULT.panelTitle} />
          <Panel title={ALIASED_TUPLE_DEFAULT.panelTitle} />
          <Panel title={MULTI_ALIAS_TUPLE_DEFAULT.panelTitle} />
          <Panel title={POPULATED_TUPLE_DEFAULT.panelTitle} />
          <Panel title={ALIASED_OBJECT_DEFAULT.panelTitle} />
          <Panel title={ALIASED_NESTED_DEFAULT.panelTitle} />
          <Panel title={DYNAMIC_TUPLE_DEFAULT.panelTitle} />
          <Panel title={MUTABLE_OWNER_DEFAULT.panelTitle} />
          <Panel title={REASSIGNED_OWNER_DEFAULT.panelTitle} />
          <Panel title={CONDITIONAL_OWNER_DEFAULT.panelTitle} />
          <Panel title={OWNER_CAPTURE_BEFORE_WRITE.panelTitle} />
          <Panel title={OWNER_CAPTURE_AFTER_WRITE.panelTitle} />
          <Panel title={MUTABLE_OWNER_REFLECT_DEFAULT.panelTitle} />
          <Panel title={REASSIGNED_OWNER_REFLECT_DEFAULT.panelTitle} />
          <Panel title={CONDITIONAL_OWNER_REFLECT_DEFAULT.panelTitle} />
          <Panel title={REFLECT_CAPTURE_BEFORE_WRITE.panelTitle} />
          <Panel title={REFLECT_CAPTURE_AFTER_WRITE.panelTitle} />
          <Panel title={LOGICAL_OWNER_DEFAULT.panelTitle} />
          <Panel title={INDEX_WRITE_OWNER_DEFAULT.panelTitle} />
          <Panel title={CAPTURED_INDEX_WRITE_DEFAULT.panelTitle} />
          <Panel title={CONDITIONAL_INDEX_WRITE_DEFAULT.panelTitle} />
          <Panel title={PROPERTY_WRITE_OWNER_DEFAULT.panelTitle} />
          <Panel title={CONDITIONAL_PROPERTY_WRITE_DEFAULT.panelTitle} />
          <Panel title={LOGICAL_REFLECT_OWNER_DEFAULT.panelTitle} />
          <Panel title={INDEX_WRITE_REFLECT_DEFAULT.panelTitle} />
          <Panel title={CAPTURED_INDEX_WRITE_REFLECT_DEFAULT.panelTitle} />
          <Panel title={CONDITIONAL_INDEX_WRITE_REFLECT_DEFAULT.panelTitle} />
          <Panel title={PROPERTY_WRITE_REFLECT_DEFAULT.panelTitle} />
          <Panel title={CONDITIONAL_PROPERTY_WRITE_REFLECT_DEFAULT.panelTitle} />
          <Panel title={LOGICAL_INDEX_OR_DEFAULT.panelTitle} />
          <Panel title={LOGICAL_INDEX_NULLISH_DEFAULT.panelTitle} />
          <Panel title={LOGICAL_INDEX_OR_REFLECT_DEFAULT.panelTitle} />
          <Panel title={LOGICAL_INDEX_NULLISH_REFLECT_DEFAULT.panelTitle} />
          <Panel title={SIGNED_ZERO.panelTitle} />
          <Panel title={ALIASED_SIGNED_ZERO.panelTitle} />
          <Panel title={SIGNED_VISIBLE.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      Array.from({ length: 38 }, () => [
        "transport-gateway",
        "auditor-posture",
      ]).flat(),
    );
  });

  it("tracks destructured aliases of standard mutation APIs", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const ASSIGNED = { panelTitle: "Client review" };
        const { assign } = Object;
        assign(ASSIGNED, { panelTitle: "Gateway posture" });

        export const REFLECTED = { panelTitle: "Client review" };
        const { ["set"]: reflectSet } = Reflect;
        reflectSet(REFLECTED, "panelTitle", "Gateway posture");

        export const TRANSITIVE = { panelTitle: "Client review" };
        const apply = assign;
        apply(TRANSITIVE, { panelTitle: "Gateway posture" });

        export const COMPUTED = { panelTitle: "Client review" };
        Object["assign"](COMPUTED, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import { ASSIGNED, COMPUTED, REFLECTED, TRANSITIVE } from "./copy";
        export const Example = () => <>
          <Panel title={ASSIGNED.panelTitle} />
          <Panel title={REFLECTED.panelTitle} />
          <Panel title={TRANSITIVE.panelTitle} />
          <Panel title={COMPUTED.panelTitle} />
        </>;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("does not treat shadowed standard-object names as mutation APIs", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Client review" };
        const Object = {
          assign(_target: unknown, _source: unknown) {},
        };
        Object.assign(COPY, { panelTitle: "Gateway posture" });

        export const DESTRUCTURED = { panelTitle: "Client review" };
        const { assign } = Object;
        assign(DESTRUCTURED, { panelTitle: "Gateway posture" });
      `,
      "src/screen.tsx": `
        import { COPY, DESTRUCTURED } from "./copy";
        export const Example = () => <>
          <Panel title={COPY.panelTitle} />
          <Panel title={DESTRUCTURED.panelTitle} />
        </>;
      `,
    });

    expect(findings).toEqual([]);
  });

  it("follows aliased path imports through a repository-local barrel", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Gateway posture" } as const;
      `,
      "src/index.ts": `export { COPY } from "./copy";`,
      "src/screen.tsx": `
        import { COPY as SCREEN_COPY } from "@/index";
        export const Example = () => <Panel title={SCREEN_COPY.panelTitle} />;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("follows immutable copy through repository-local namespace imports", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Gateway posture" } as const;
      `,
      "src/screen.tsx": `
        import * as copy from "./copy";
        export const Example = () => <Panel title={copy.COPY.panelTitle} />;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("follows copy destructured from repository-local namespace imports", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = { panelTitle: "Gateway posture" } as const;
      `,
      "src/screen.tsx": `
        import * as copy from "./copy";
        const { COPY: { panelTitle } } = copy;
        export const Example = () => <Panel title={panelTitle} />;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("resolves statically indexed local and imported copy tuples", () => {
    const findings = scanRepository({
      "src/copy.ts": `
        export const COPY = ["HTTP status unavailable"] as const;
      `,
      "src/screen.tsx": `
        import { COPY } from "./copy";
        const localCopy = ["Gateway posture"] as const;
        export const Example = () => <Panel
          title={localCopy[0]}
          body={COPY[0]}
        />;
      `,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("keeps local shadowing as a barrier to imported copy resolution", () => {
    expect(
      scanRepository({
        "src/copy.ts": `
          export const COPY = { panelTitle: "Gateway posture" } as const;
        `,
        "src/screen.tsx": `
          import { COPY } from "./copy";
          export function Example(COPY) {
            return <Panel title={COPY.panelTitle} />;
          }
        `,
      }),
    ).toEqual([]);
  });

  it("resolves productive copy inside template interpolations", () => {
    const findings = scan(`
      const transport = "Gateway";
      const copy = { support: "HTTP status unavailable" } as const;
      export function Example() {
        return <Panel
          title={\`Status from \${transport}\`}
          body={\`Evidence: \${copy.support}\`}
        />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "transport-http-status",
    ]);
  });

  it("reconstructs fully static template copy before vocabulary matching", () => {
    const findings = scan(`
      const suffix = "way";
      export const Example = () => <Panel title={\`Gate\${suffix} posture\`} />;
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) => finding.text === "Gateway posture")).toBe(true);
  });

  it("fails safely for dynamic template interpolations", () => {
    expect(
      scan(`
        const runtimeCopy = getRuntimeCopy();
        export function Example() {
          return <Panel title={\`Client review: \${runtimeCopy}\`} />;
        }
      `),
    ).toEqual([]);
  });

  it("resolves shorthand props through JSX spreads with final override order", () => {
    const findings = scan(`
      const title = "Gateway posture";
      const technicalProps = { title } as const;
      const businessProps = { title: "Client review status" } as const;
      export function Example() {
        return <>
          <Panel {...technicalProps} {...businessProps} />
          <Panel {...businessProps} {...technicalProps} />
          <Panel {...technicalProps} title="Client review status" />
          <Panel {...technicalProps} {...getRuntimeProps()} />
        </>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) => finding.context === "JSX spread")).toBe(
      true,
    );
  });

  it("counts each governed property rendered by the same JSX spread", () => {
    const findings = scan(`
      const copy = "Gateway posture";
      const props = { title: copy, description: copy } as const;
      export const Example = () => <Panel {...props} />;
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) => finding.context === "JSX spread")).toBe(
      true,
    );
  });

  it("inspects productive copy in every bounded conditional JSX spread", () => {
    const findings = scan(`
      const title = "Gateway posture";
      const technicalProps = { title } as const;
      const businessProps = { title: "Client review status" } as const;
      export function Example({ ready }) {
        return <>
          <Panel {...(ready ? technicalProps : {})} />
          <Panel {...(ready ? businessProps : technicalProps)} />
        </>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("selects the reachable JSX spread branch when a condition is statically known", () => {
    const hidden = scan(`
      const ready = false;
      const technicalProps = { title: "Gateway posture" } as const;
      export const Example = () => (
        <Panel {...(ready ? technicalProps : {})} />
      );
    `);
    const reachable = scan(`
      const ready = true;
      const technicalProps = { title: "Gateway posture" } as const;
      export const Example = () => (
        <Panel {...(ready ? technicalProps : {})} />
      );
    `);

    expect(hidden).toEqual([]);
    expect(reachable.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("retains known JSX spread candidates beside an opaque conditional branch", () => {
    const findings = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ ready, suppliedProps }) {
        return <>
          <Panel {...(ready ? technicalProps : suppliedProps)} />
          <Panel {...(ready ? getRuntimeProps() : technicalProps)} />
        </>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("treats boolean JSX spreads as statically bounded optional props", () => {
    const findings = scan(`
      const title = "Gateway posture";
      const technicalProps = { title } as const;
      const businessProps = { title: "Client review status" } as const;
      export function Example({ ready }) {
        return <>
          <Panel {...(ready && technicalProps)} />
          <Panel title="HTTP status unavailable" {...(ready && businessProps)} />
          <Panel {...(ready && technicalProps)} title="Client review status" />
        </>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("does not inspect an unreachable statically false JSX spread", () => {
    const hidden = scan(`
      const ready = false;
      const technicalProps = { title: "Gateway posture" } as const;
      export const Example = () => <Panel {...(ready && technicalProps)} />;
    `);
    const reachable = scan(`
      const ready = true;
      const technicalProps = { title: "Gateway posture" } as const;
      export const Example = () => <Panel {...(ready && technicalProps)} />;
    `);

    expect(hidden).toEqual([]);
    expect(reachable.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("inspects statically reachable nullish-fallback JSX spread copy", () => {
    const findings = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ suppliedProps }) {
        const resolvedProps = suppliedProps ?? technicalProps;
        return <Panel {...resolvedProps} />;
      }
    `);
    const hiddenFallback = scan(`
      const businessProps = { title: "Client review status" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example() {
        const resolvedProps = businessProps ?? technicalProps;
        return <Panel {...resolvedProps} />;
      }
    `);
    const falsePrimary = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example() {
        const resolvedProps = false ?? technicalProps;
        return <Panel {...resolvedProps} />;
      }
    `);
    const nullPrimary = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example() {
        const resolvedProps = null ?? technicalProps;
        return <Panel title="HTTP status unavailable" {...resolvedProps} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(hiddenFallback).toEqual([]);
    expect(falsePrimary).toEqual([]);
    expect(nullPrimary.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("preserves bounded non-object values through nullish spread composition", () => {
    const falseAndPrimary = scan(`
      const businessProps = { title: "Client review" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export const Example = () => (
        <Panel {...((false && businessProps) ?? technicalProps)} />
      );
    `);
    const nonNullishConditionalPrimary = scan(`
      const businessProps = { title: "Client review" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ ready }) {
        const primary = ready ? businessProps : false;
        return <Panel {...(primary ?? technicalProps)} />;
      }
    `);
    const nullishConditionalPrimary = scan(`
      const businessProps = { title: "Client review" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ ready }) {
        const primary = ready ? businessProps : null;
        return <Panel {...(primary ?? technicalProps)} />;
      }
    `);

    expect(falseAndPrimary).toEqual([]);
    expect(nonNullishConditionalPrimary).toEqual([]);
    expect(nullishConditionalPrimary.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("preserves bounded falsy AND outcomes through nullish composition", () => {
    const falseAlternative = scan(`
      const businessProps = { title: "Client review" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ flag }) {
        const ready = flag ? true : false;
        return <Panel {...((ready && businessProps) ?? technicalProps)} />;
      }
    `);
    const nullAlternative = scan(`
      const businessProps = { title: "Client review" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ flag }) {
        const ready = flag ? true : null;
        return <Panel {...((ready && businessProps) ?? technicalProps)} />;
      }
    `);

    expect(falseAlternative).toEqual([]);
    expect(nullAlternative.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("preserves bounded scalar AND outcomes through nullish composition", () => {
    const hiddenFallback = scan(`
      const businessTitle = "Client review";
      const technicalTitle = "Gateway posture";
      export function Example({ flag }) {
        const ready = flag ? true : false;
        return <Panel title={(ready && businessTitle) ?? technicalTitle} />;
      }
    `);

    expect(hiddenFallback).toEqual([]);
  });

  it("inspects only reachable logical-OR fallback JSX spread copy", () => {
    const dynamicPrimary = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ suppliedProps }) {
        const resolvedProps = suppliedProps || technicalProps;
        return <Panel {...resolvedProps} />;
      }
    `);
    const falsePrimary = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example() {
        const resolvedProps = false || technicalProps;
        return <Panel title="HTTP status unavailable" {...resolvedProps} />;
      }
    `);
    const businessPrimary = scan(`
      const businessProps = { title: "Client review status" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example() {
        const resolvedProps = businessProps || technicalProps;
        return <Panel {...resolvedProps} />;
      }
    `);
    const truePrimary = scan(`
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example() {
        const resolvedProps = true || technicalProps;
        return <Panel {...resolvedProps} />;
      }
    `);

    for (const findings of [dynamicPrimary, falsePrimary]) {
      expect(findings.map((finding) => finding.ruleId)).toEqual([
        "transport-gateway",
        "auditor-posture",
      ]);
    }
    expect(businessPrimary).toEqual([]);
    expect(truePrimary).toEqual([]);
  });

  it("keeps logical-OR fallbacks reachable behind optional spread alternatives", () => {
    const findings = scan(`
      const businessProps = { title: "Client review" } as const;
      const technicalProps = { title: "Gateway posture" } as const;
      export function Example({ ready }) {
        return <Panel {...((ready && businessProps) || technicalProps)} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("does not suppress a shared copy object rendered through another component", () => {
    const findings = scan(`
      const copy = { title: "Gateway posture" } as const;
      function ConfiguredPanel({ copy }) {
        return <Panel title={copy.title} />;
      }
      export function Example() {
        return <>
          <Panel {...copy} title="Client review status" />
          <ConfiguredPanel copy={copy} />
        </>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("does not report JSX spread copy hidden by a later final value", () => {
    const hiddenCopyExamples = [
      `
        const technicalProps = { title: "Gateway posture" } as const;
        const businessProps = { title: "Client review status" } as const;
        export function Example() {
          return <Panel {...technicalProps} {...businessProps} />;
        }
      `,
      `
        const technicalProps = { title: "Gateway posture" } as const;
        export function Example() {
          return <Panel {...technicalProps} title="Client review status" />;
        }
      `,
      `
        const technicalProps = { title: "Gateway posture" } as const;
        const businessProps = {
          ...technicalProps,
          title: "Client review status",
        } as const;
        export function Example() {
          return <Panel {...businessProps} />;
        }
      `,
      `
        const technicalProps = { title: "Gateway posture" } as const;
        export function Example() {
          return <Panel {...technicalProps} {...getRuntimeProps()} />;
        }
      `,
      `
        const dynamicKey = getRuntimeKey();
        const props = {
          title: "Gateway posture",
          [dynamicKey]: "Client review status",
        };
        export function Example() {
          return <Panel {...props} />;
        }
      `,
    ];

    for (const source of hiddenCopyExamples) {
      expect(scan(source)).toEqual([]);
    }
  });

  it("resolves copy inherited through statically inspectable object spreads", () => {
    const findings = scan(`
      const baseCopy = { panelTitle: "Gateway posture" } as const;
      const sharedCopy = { ...baseCopy } as const;
      const screenCopy = { ...sharedCopy } as const;
      export function Example() {
        return <Panel title={screenCopy.panelTitle} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("honours static spread override order and fails safely for cyclic spreads", () => {
    expect(
      scan(`
        const technicalCopy = { panelTitle: "Gateway posture" } as const;
        const businessCopy = { panelTitle: "Client review status" } as const;
        const screenCopy = { ...technicalCopy, ...businessCopy } as const;
        const first = { ...second };
        const second = { ...first };
        export function Example() {
          return <><Panel title={screenCopy.panelTitle} /><Panel title={first.panelTitle} /></>;
        }
      `),
    ).toEqual([]);
  });

  it("resolves direct and aliased destructured copy constants", () => {
    const findings = scan(`
      const copy = {
        panelTitle: "Gateway posture",
        panelBody: "HTTP status unavailable",
      } as const;
      const { panelTitle, panelBody: bodyCopy } = copy;
      export function Example() {
        return <Panel title={panelTitle} body={bodyCopy} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("resolves tuple destructuring positions, holes, nesting, and defaults", () => {
    const findings = scan(`
      const copy = [
        "Gateway posture",
        "unused",
        { body: "HTTP status unavailable" },
      ] as const;
      const [title, , { body }, fallback = "BFF unavailable"] = copy;
      export function Example() {
        return <Panel title={title} body={body} description={fallback} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
      "transport-bff",
    ]);
  });

  it("treats parameters and mutable bindings as outer-scope barriers", () => {
    expect(
      scan(`
        const inheritedCopy = { panelTitle: "Gateway posture" } as const;
        function ParameterShadow(inheritedCopy) {
          const copy = { ...inheritedCopy };
          return <Panel title={copy.panelTitle} />;
        }
        function MutableShadow() {
          let inheritedCopy = getRuntimeCopy();
          const copy = { ...inheritedCopy };
          return <Panel title={copy.panelTitle} />;
        }
      `),
    ).toEqual([]);
  });

  it("resolves destructured copy inherited through static spreads", () => {
    const findings = scan(`
      const baseCopy = { panelTitle: "Gateway posture" } as const;
      const composedCopy = { ...baseCopy } as const;
      const { panelTitle: title } = composedCopy;
      export function Example() {
        return <Panel title={title} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("treats block constants and catch bindings as outer-scope barriers", () => {
    expect(
      scan(`
        const copy = { panelTitle: "Gateway posture" } as const;
        export function Example() {
          {
            const copy = getRuntimeCopy();
            return <Panel title={copy.panelTitle} />;
          }
        }
        export function CatchExample() {
          try {
            return null;
          } catch (copy) {
            return <Panel title={copy.panelTitle} />;
          }
        }
      `),
    ).toEqual([]);
  });

  it("treats named function and class expressions as self-binding barriers", () => {
    expect(
      scan(`
        const copy = { panelTitle: "Gateway posture" } as const;
        export const FunctionExample = function copy() {
          return <Panel title={copy.panelTitle} />;
        };
        export const ClassExample = class copy {
          render() {
            return <Panel title={copy.panelTitle} />;
          }
        };
      `),
    ).toEqual([]);
  });

  it("resolves direct and aliased destructuring defaults", () => {
    const findings = scan(`
      const runtimeCopy = {} as const;
      const {
        panelTitle = "Gateway posture",
        panelBody: body = "HTTP status unavailable",
      } = runtimeCopy;
      export function Example() {
        return <Panel title={panelTitle} body={body} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("prefers a statically present property over its destructuring default", () => {
    expect(
      scan(`
        const copy = { panelTitle: "Client review status" } as const;
        const { panelTitle = "Gateway posture" } = copy;
        export function Example() {
          return <Panel title={panelTitle} />;
        }
      `),
    ).toEqual([]);
  });

  it("inspects defaults when a present property may evaluate to undefined", () => {
    const findings = scan(`
      const copy = {
        panelTitle: getMaybeTitle(),
        panelBody: ready ? "Client review status" : undefined,
      };
      const {
        panelTitle = "Gateway posture",
        panelBody = "HTTP status unavailable",
      } = copy;
      export function Example() {
        return <Panel title={panelTitle} body={panelBody} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("does not duplicate a default when a referenced property is statically defined", () => {
    expect(
      scan(`
        const reviewedTitle = "Client review status";
        const copy = { panelTitle: reviewedTitle } as const;
        const { panelTitle = "Gateway posture" } = copy;
        export function Example() {
          return <Panel title={panelTitle} />;
        }
      `),
    ).toEqual([]);
  });

  it("does not inspect defaults behind guaranteed-defined composite values", () => {
    expect(
      scan(`
        const copy = {
          panelTitle: ready ? "Client review status" : "Portfolio review status",
          panelBody: "Client " + "review status",
          summary: preferredTitle ?? "Client review status",
          label: preferredTitle || "Client review status",
        };
        const {
          panelTitle = "Gateway posture",
          panelBody = "HTTP status unavailable",
          summary = "Gateway status",
          label = "Gateway response",
        } = copy;
        export function Example() {
          return <Panel title={panelTitle} body={panelBody} summary={summary} label={label} />;
        }
      `),
    ).toEqual([]);
  });

  it("inspects defaults behind undefined nullish and logical results", () => {
    const findings = scan(`
      const copy = {
        panelTitle: null ?? undefined,
        panelBody: false || undefined,
      };
      const {
        panelTitle = "Gateway posture",
        panelBody = "HTTP status unavailable",
      } = copy;
      export function Example() {
        return <Panel title={panelTitle} body={panelBody} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("resolves local aliases while proving composite values defined", () => {
    expect(
      scan(`
        const clientLabel = "Client review status";
        const portfolioLabel = "Portfolio review status";
        const businessLabel = "Client review status";
        const zero = 0;
        const copy = {
          panelTitle: ready ? clientLabel : portfolioLabel,
          panelBody: maybeTitle ?? businessLabel,
          summary: maybeTitle || businessLabel,
          label: zero ?? undefined,
        };
        const {
          panelTitle = "Gateway posture",
          panelBody = "HTTP status unavailable",
          summary = "Gateway status",
          label = "Gateway response",
        } = copy;
        export function Example() {
          return <Panel title={panelTitle} body={panelBody} summary={summary} label={label} />;
        }
      `),
    ).toEqual([]);
  });

  it("keeps defaults reachable through explicitly undefined aliases", () => {
    const findings = scan(`
      const absent = undefined;
      const copy = {
        panelTitle: ready ? "Client review status" : absent,
        panelBody: absent ?? absent,
      };
      const {
        panelTitle = "Gateway posture",
        panelBody = "HTTP status unavailable",
      } = copy;
      export function Example() {
        return <Panel title={panelTitle} body={panelBody} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("terminates conservatively without crashing on composite alias cycles", () => {
    const cases = [
      {
        expression: 'ready ? nextTitle : "Client review status"',
        expectedRuleIds: ["transport-gateway", "auditor-posture"],
      },
      {
        expression: 'nextTitle ?? "Client review status"',
        expectedRuleIds: [],
      },
      {
        expression: 'nextTitle || "Client review status"',
        expectedRuleIds: [],
      },
    ];

    for (const { expression, expectedRuleIds } of cases) {
      const findings = scan(`
        const panelTitle = ${expression};
        const nextTitle = panelTitle;
        const copy = { panelTitle };
        const { panelTitle: title = "Gateway posture" } = copy;
        export function Example() {
          return <Panel title={title} />;
        }
      `);

      expect(findings.map((finding) => finding.ruleId)).toEqual(expectedRuleIds);
    }
  });

  it("resolves nested and object-rest destructured copy", () => {
    const findings = scan(`
      const copy = {
        heading: { panelTitle: "Gateway posture" },
        panelBody: "HTTP status unavailable",
      } as const;
      const { heading: { panelTitle }, ...remainingCopy } = copy;
      export function Example() {
        return <Panel title={panelTitle} body={remainingCopy.panelBody} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
  });

  it("terminates safely when destructured bindings form a static cycle", () => {
    expect(
      scan(`
        const { panelTitle } = copy;
        const copy = { panelTitle } as const;
        export function Example() {
          return <Panel title={panelTitle} />;
        }
      `),
    ).toEqual([]);
  });

  it("resolves chains of local constants without evaluating executable code", () => {
    const findings = scan(`
      const technicalCopy = "HTTP status unavailable";
      const panelTitle = technicalCopy;
      const dynamicCopy = getRuntimeCopy();
      const canReview = state === "AWAITING_REVIEW";
      const sourceState = "PENDING_SOURCE_REVIEW";
      export function Example() {
        return <>{canReview && state === sourceState ? <Panel title={panelTitle} /> : <Panel title={dynamicCopy} />}</>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-http-status",
    ]);
  });

  it("resolves shadowed constants by lexical scope and fails safely for cycles", () => {
    const findings = scan(`
        const first = second;
        const second = first;
        function First() {
          const copy = "Gateway status";
          return <Panel title={copy} />;
        }
        function Second() {
          const copy = "Client review status";
          return <Panel title={copy} />;
        }
        export const Example = () => <Panel title={first} />;
      `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
    ]);
  });

  it("does not confuse internal contracts with productive copy", () => {
    expect(
      scan(`
        const BFF_PROXY_BASE = "/api/bff";
        type GatewayEnvelope = { supportability_state: string };
        const request = { body: JSON.stringify({ reason: "READY_FOR_REVIEW" }) };
        export const copy = {
          title: "Portfolio information unavailable",
          body: "Existing holdings remain visible. Refresh before advising the client.",
        };
      `),
    ).toEqual([]);
  });

  it("does not inspect implementation attributes inside rendered collections", () => {
    expect(
      scan(`
        export function Example({ items }) {
          return <div>{items.map((item) => <span className="supportability-row">{item.label}</span>)}</div>;
        }
      `),
    ).toEqual([]);
  });

  it("accepts one exact reviewed use of legitimate wealth-management language", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Defensive posture reduces equity exposure to 30%." />;',
      0,
      [
        {
          id: "copy-exception-defensive-posture",
          filePath: "src/example.tsx",
          ruleId: "auditor-posture",
          context: "JSX title",
          exactText: "Defensive posture reduces equity exposure to 30%.",
          expectedMatches: 1,
          reason:
            "Posture is the precise portfolio-construction term in this reviewed advisor context.",
          reviewUrl: "https://github.com/sgajbi/lotus-workbench/pull/867",
        },
      ],
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 reviewed exact exception(s)");
  });

  it("rejects a stale exception when the reviewed copy is no longer present", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Defensive allocation" />;',
      0,
      [
        {
          id: "copy-exception-defensive-posture",
          filePath: "src/example.tsx",
          ruleId: "auditor-posture",
          context: "JSX title",
          exactText: "Defensive posture reduces equity exposure to 30%.",
          expectedMatches: 1,
          reason:
            "Posture is the precise portfolio-construction term in this reviewed advisor context.",
          reviewUrl: "https://github.com/sgajbi/lotus-workbench/pull/867",
        },
      ],
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected 1 exact match(es) but found 0");
  });

  it("rejects an exception when duplicate copy broadens its approved scope", () => {
    const result = runCliWithBaseline(
      `
        export const First = () => <Panel title="Structured note XS_2043 matured on 12 March." />;
        export const Second = () => <Panel title="Structured note XS_2043 matured on 12 March." />;
      `,
      0,
      [
        {
          id: "copy-exception-structured-note-identifier",
          filePath: "src/example.tsx",
          ruleId: "raw-enum",
          context: "JSX title",
          exactText: "Structured note XS_2043 matured on 12 March.",
          expectedMatches: 1,
          reason:
            "XS_2043 is the reviewed instrument identifier required to distinguish the holding.",
          reviewUrl: "https://github.com/sgajbi/lotus-workbench/pull/867",
        },
      ],
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected 1 exact match(es) but found 2");
  });

  it("rejects exception metadata without durable Workbench review evidence", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="This account is governed by a discretionary mandate." />;',
      0,
      [
        {
          id: "copy-exception-discretionary-mandate",
          filePath: "src/example.tsx",
          ruleId: "engineering-governed",
          context: "JSX title",
          exactText: "This account is governed by a discretionary mandate.",
          expectedMatches: 1,
          reason:
            "Governed describes the legal relationship between the account and its mandate.",
          reviewUrl: "https://example.com/not-durable-review",
        },
      ],
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "reviewUrl must be a Workbench GitHub issue or PR URL",
    );
  });

  it(
    "keeps the checked-in productive-copy and unresolved inventories exact",
    async () => {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [
          productCopyChecker,
          "--max=263",
          "--max-unresolved=1721",
          "--unresolved-digest=82e6836d6c9dd8d52bc697e08a856fb831734f9d717d3751ed3caf2f11c93c2d",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: REPOSITORY_SCAN_TIMEOUT_MS - 5_000,
        },
      );

      expect(stderr).toBe("");
      expect(stdout).toContain(
        "measured inventory matches the checked-in baselines at 263 finding(s) and 1721 unresolved expression(s)",
      );
      expect(stdout).toContain(
        "82e6836d6c9dd8d52bc697e08a856fb831734f9d717d3751ed3caf2f11c93c2d",
      );
    },
    REPOSITORY_SCAN_TIMEOUT_MS,
  );

  it("exits non-zero when the CLI ratchet is exceeded", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Gateway posture" />;',
      0,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exceeds the checked-in baseline of 0");
  });

  it("exits non-zero when the CLI baseline leaves regression headroom", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Gateway status" />;',
      2,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Ratchet --max down to 1 in package.json");
  });

  it("passes only when the CLI baseline matches the measured inventory", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Gateway status" />;',
      1,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "measured inventory matches the checked-in baselines at 1 finding(s) and 0 unresolved expression(s)",
    );
  });

  it("rejects a new unresolved user-facing copy expression", () => {
    const result = runCliWithBaseline(
      "declare const suppliedTitle: string; export const Example = () => <Panel title={suppliedTitle} />;",
      0,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "1 unresolved expression(s) exceed the checked-in baseline of 0",
    );
  });

  it("rejects stale unresolved-expression headroom", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Client review" />;',
      0,
      [],
      1,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Ratchet --max-unresolved down to 0 in package.json",
    );
  });

  it("rejects unresolved-expression identity substitution at the same count", () => {
    const baselineSource = `
      declare const suppliedTitle: string;
      export const Example = () => <Panel title={suppliedTitle} />;
    `;
    const baselineDigest = productCopyUnresolvedDigest(
      evaluateProductCopySource({
        filePath: "src/example.tsx",
        sourceText: baselineSource,
      }).unresolvedExpressions,
    );
    const result = runCliWithBaseline(
      `
        declare const suppliedBody: string;
        export const Example = () => <Panel body={suppliedBody} />;
      `,
      0,
      [],
      1,
      baselineDigest,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "unresolved-expression identity set changed while the count remained 1",
    );
  });

  it("distinguishes identical unresolved expressions across structural and named scopes", () => {
    const baselineSource = `
      declare const copy: string;
      const First = () => <Panel title={copy} />;
      const Second = () => <Panel title="Client review" />;
    `;
    const baselineDigest = productCopyUnresolvedDigest(
      evaluateProductCopySource({
        filePath: "src/example.tsx",
        sourceText: baselineSource,
      }).unresolvedExpressions,
    );
    const structuralMove = runCliWithBaseline(
      `
        declare const copy: string;
        const First = () => <Panel title="Client review" />;
        const Second = () => <Panel title={copy} />;
      `,
      0,
      [],
      1,
      baselineDigest,
    );

    expect(structuralMove.status).toBe(1);
    expect(structuralMove.stderr).toContain(
      "unresolved-expression identity set changed while the count remained 1",
    );

    const namedScopeMove = runCliWithBaseline(
      `
        declare const copy: string;
        const Second = () => <Panel title={copy} />;
        const First = () => <Panel title="Client review" />;
      `,
      0,
      [],
      1,
      baselineDigest,
    );

    expect(namedScopeMove.status).toBe(1);
    expect(namedScopeMove.stderr).toContain(
      "unresolved-expression identity set changed while the count remained 1",
    );
  }, STATIC_CLI_TEST_TIMEOUT_MS);

  it("passes only when both measured baselines match", () => {
    const result = runCliWithBaseline(
      "declare const suppliedTitle: string; export const Example = () => <Panel title={suppliedTitle} />;",
      0,
      [],
      1,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("0 finding(s) and 1 unresolved expression(s)");
  });
});
