import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const checker = resolve(
  process.cwd(),
  "scripts/quality/check-e2e-scenario-governance.mjs",
);
const registryPath = resolve(
  process.cwd(),
  "scripts/testing/e2e-scenario-registry.json",
);
const temporaryDirectories: string[] = [];

interface MutableRegistry {
  families: {
    portfolio: {
      scenarios: {
        cashflow: {
          expected_tests: string[];
        };
      };
    };
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("E2E scenario governance gate", () => {
  it("accepts the complete repository registry", () => {
    const result = runChecker();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("20 scenarios");
    expect(result.stdout).toContain("59 registered executions");
  });

  it("fails when a registered test no longer exists", () => {
    const registry = readRegistry();
    registry.families.portfolio.scenarios.cashflow.expected_tests[0] =
      "deleted cashflow proof";
    const result = runChecker({ registry: writeTemporaryRegistry(registry) });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("registered test is absent");
    expect(result.stderr).toContain("deleted cashflow proof");
  });

  it("fails when a fixture-gated test falls outside every registered scenario", () => {
    const registry = readRegistry();
    registry.families.portfolio.scenarios.cashflow.expected_tests =
      registry.families.portfolio.scenarios.cashflow.expected_tests.filter(
        (title: string) =>
          title !==
          "source-confirmed historical review replaces dated evidence atomically",
      );
    const result = runChecker({ registry: writeTemporaryRegistry(registry) });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("fixture-gated test");
    expect(result.stderr).toContain(
      "source-confirmed historical review replaces dated evidence atomically",
    );
  });

  it("fails closed when the source root has no registry", () => {
    const emptyRoot = mkdtempSync(resolve(tmpdir(), "workbench-empty-scenario-root-"));
    temporaryDirectories.push(emptyRoot);
    const result = runChecker({ root: emptyRoot });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Registry does not exist");
  });
});

function readRegistry(): MutableRegistry {
  return JSON.parse(readFileSync(registryPath, "utf8")) as MutableRegistry;
}

function writeTemporaryRegistry(registry: unknown): string {
  const directory = mkdtempSync(resolve(tmpdir(), "workbench-scenario-registry-"));
  temporaryDirectories.push(directory);
  const path = resolve(directory, "registry.json");
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return path;
}

function runChecker({
  root = process.cwd(),
  registry,
}: { root?: string; registry?: string } = {}) {
  const arguments_ = [checker, "--root", root];
  if (registry) {
    arguments_.push("--registry", registry);
  }
  return spawnSync(process.execPath, arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}
