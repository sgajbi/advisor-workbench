import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  scanRuntimeStateHolders,
  scanRuntimeStateSource,
  validateRuntimeStateInventory,
} from "../../scripts/quality/check-runtime-state-inventory.mjs";

const root = join(__dirname, "..", "..");

function loadBaselineEvidence() {
  const discoveredStateHolders = scanRuntimeStateHolders({ root });
  const sourceFiles = Object.fromEntries(
    discoveredStateHolders
      .map(({ file }) => file)
      .filter((file, index, files) => files.indexOf(file) === index)
      .map((file) => [file, readFileSync(join(root, file), "utf8")]),
  );
  return {
    inventory: JSON.parse(
      readFileSync(
        join(root, "docs/architecture/workbench-runtime-state-inventory.v1.json"),
        "utf8",
      ),
    ),
    schema: JSON.parse(
      readFileSync(
        join(root, "docs/architecture/workbench-runtime-state-inventory.v1.schema.json"),
        "utf8",
      ),
    ),
    sourceFiles,
    nextConfig: readFileSync(join(root, "next.config.mjs"), "utf8"),
    discoveredStateHolders,
    today: "2026-08-10",
  };
}

let baselineEvidence: ReturnType<typeof loadBaselineEvidence>;

beforeAll(() => {
  baselineEvidence = loadBaselineEvidence();
}, 30_000);

function loadEvidence() {
  return structuredClone(baselineEvidence);
}

describe("runtime state inventory", () => {
  it("reconciles every module-scope state holder and current framework posture", () => {
    expect(validateRuntimeStateInventory(loadEvidence())).toEqual([]);
  });

  it("rejects an unreviewed process-local cache", () => {
    const evidence = loadEvidence();
    evidence.discoveredStateHolders.push({
      file: "src/features/example.ts",
      symbol: "businessCache",
    });

    expect(validateRuntimeStateInventory(evidence)).toContain(
      "unreviewed module-scope runtime state src/features/example.ts:businessCache",
    );
  });

  it.each([
    ["property assignment", "const cache = {}; cache.portfolio = result;", "cache"],
    ["element assignment", "const cache = {}; cache[key] = result;", "cache"],
    ["array mutation", "const entries = []; entries.push(result);", "entries"],
    ["custom cache mutation", "const cache = createCache(); cache.set(key, result);", "cache"],
    ["Object mutation", "const cache = {}; Object.assign(cache, result);", "cache"],
    ["nested property increment", "const metrics = { counts: {} }; metrics.counts[key]++;", "metrics"],
  ])("discovers const-backed runtime state through %s", (_name, source, symbol) => {
    expect(
      scanRuntimeStateSource({ source, file: "src/features/example.ts" }),
    ).toContainEqual({ file: "src/features/example.ts", symbol });
  });

  it("does not classify read-only const objects and arrays as mutable state", () => {
    expect(
      scanRuntimeStateSource({
        source: "const labels = ['Ready']; const copy = labels.map((label) => label);",
        file: "src/features/example.ts",
      }),
    ).toEqual([]);
  });

  it.each([
    [
      "function-local variable",
      "const cache = Object.freeze({}); function update() { const cache = []; cache.push('local'); }",
    ],
    [
      "function parameter",
      "const cache = Object.freeze({}); function update(cache) { cache.push('local'); }",
    ],
    [
      "catch binding",
      "const cache = Object.freeze({}); try { update(); } catch (cache) { cache.push('local'); }",
    ],
    [
      "block-local function declaration",
      "const cache = Object.freeze({}); { function cache() {} cache.entries = []; }",
    ],
  ])("does not attribute a shadowed %s mutation to module state", (_name, source) => {
    expect(
      scanRuntimeStateSource({ source, file: "src/features/example.ts" }),
    ).toEqual([]);
  });

  it("still detects a module mutation from inside a nested lexical scope", () => {
    expect(
      scanRuntimeStateSource({
        source:
          "const cache = Object.freeze({ entries: [] }); function update() { cache.entries.push('module'); }",
        file: "src/features/example.ts",
      }),
    ).toContainEqual({ file: "src/features/example.ts", symbol: "cache" });
  });

  it.each([
    [
      "direct local alias",
      "const cache = Object.freeze({}); function update() { const ref = cache; ref.value = 1; }",
    ],
    [
      "chained property alias",
      "const cache = Object.freeze({ entries: [] }); function update() { const entries = cache.entries; const ref = entries; ref.push('module'); }",
    ],
  ])("detects a module mutation through a %s", (_name, source) => {
    expect(
      scanRuntimeStateSource({ source, file: "src/features/example.ts" }),
    ).toContainEqual({ file: "src/features/example.ts", symbol: "cache" });
  });

  it("does not follow a shadowed local alias to a same-named module binding", () => {
    expect(
      scanRuntimeStateSource({
        source:
          "const cache = Object.freeze({}); function update() { const cache = {}; const ref = cache; ref.value = 1; }",
        file: "src/features/example.ts",
      }),
    ).toEqual([]);
  });

  it("rejects a stale declaration that could hide dead state guidance", () => {
    const evidence = loadEvidence();
    evidence.discoveredStateHolders = evidence.discoveredStateHolders.filter(
      ({ symbol }) => symbol !== "rowSequence",
    );

    expect(validateRuntimeStateInventory(evidence)).toContain(
      "stale runtime state declaration src/features/intake/draft.ts:rowSequence",
    );
  });

  it.each([
    ["Server Actions", '"use server";'],
    ["Next data cache", "unstable_cache(() => sourceRead())"],
    ["on-demand revalidation", 'revalidateTag("portfolio")'],
    ["explicit fetch cache", 'fetch(url, { cache: "force-cache" })'],
  ])("rejects unreviewed %s", (_name, addition) => {
    const evidence = loadEvidence();
    evidence.sourceFiles["src/apps/portfolio/api.ts"] += `\n${addition}\n`;

    expect(validateRuntimeStateInventory(evidence)).toEqual(
      expect.arrayContaining([expect.stringContaining("unreviewed")]),
    );
  });

  it("rejects server use of the browser response cache", () => {
    const evidence = loadEvidence();
    evidence.sourceFiles["src/apps/portfolio/api.ts"] = evidence.sourceFiles[
      "src/apps/portfolio/api.ts"
    ].replace('target === "client" &&', "");

    expect(validateRuntimeStateInventory(evidence)).toContain(
      "browser-guarded cache portfolio-browser-request-cache must fail closed outside the client target",
    );
  });

  it("rejects removal of rolling deployment identity protection", () => {
    const evidence = loadEvidence();
    evidence.nextConfig = evidence.nextConfig
      .replace(/const deploymentId =[\s\S]*?;\r?\n\r?\n/, "")
      .replace(/^\s*deploymentId,\r?\n/m, "");

    expect(validateRuntimeStateInventory(evidence)).toContain(
      "Next configuration must bind deploymentId and embedded build identity to WORKBENCH_DEPLOYMENT_ID for rolling-version protection",
    );
  });

  it("rejects expired state review and remediation exceptions", () => {
    const evidence = loadEvidence();
    evidence.inventory.stateHolders[0].temporaryException = {
      issue: 619,
      expiresOn: "2026-09-15",
      requiredRemediation: "Remove the test exception.",
    };
    evidence.today = "2026-10-01";

    expect(validateRuntimeStateInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("inventory review expired"),
        expect.stringContaining("performance-rolling-measure-lookup expired"),
      ]),
    );
  });

  it("executes the complete schema before semantic checks", () => {
    const evidence = loadEvidence();
    evidence.inventory.stateHolders[0].businessAuthority = true;

    expect(validateRuntimeStateInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("runtime state schema"),
        expect.stringContaining("must be equal to constant"),
      ]),
    );
  });
});
