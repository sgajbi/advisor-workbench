import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  scanRuntimeStateHolders,
  validateRuntimeStateInventory,
} from "../../scripts/quality/check-runtime-state-inventory.mjs";

const root = join(__dirname, "..", "..");

function loadEvidence() {
  const sourceFiles = Object.fromEntries(
    scanRuntimeStateHolders({ root })
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
    discoveredStateHolders: scanRuntimeStateHolders({ root }),
    today: "2026-08-10",
  };
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

  it("rejects expired state review and remediation exceptions", () => {
    const evidence = loadEvidence();
    evidence.today = "2026-10-01";

    expect(validateRuntimeStateInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("inventory review expired"),
        expect.stringContaining("analytics-instance-telemetry expired"),
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
