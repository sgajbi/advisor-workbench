import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizePlaywrightChildEnvironment,
  parseRunnerArguments,
} from "../../scripts/testing/run-e2e-fixture-scenario.mjs";

describe("governed E2E fixture scenario runner", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/run-e2e-fixture-scenario.mjs"),
    "utf8",
  );

  it("binds selection, exact reporting, ports, and evidence to the registry", () => {
    expect(source).toContain("getScenarioDefinition(");
    expect(source).toContain("getExpectedScenarioTests(");
    expect(source).toContain("buildExpectedTestGrep(expectedTests)");
    expect(source).toContain("e2e-scenario-reporter.mjs");
    expect(source).toContain("WORKBENCH_E2E_SCENARIO_EXPECTED_TESTS");
    expect(source).toContain("WORKBENCH_E2E_SCENARIO_RESULT_PATH");
    expect(source).toContain("rmSync(resultPath, { force: true })");
    expect(source).toContain("...environmentOverrides");
    expect(source).toContain("WORKBENCH_E2E_FIXTURE_GATEWAY: family.fixture_owner");
    expect(source).toContain("shell: false");
    expect(source).toContain("child.kill(signal)");
  });

  it("allows safe Playwright controls and one registered focus", () => {
    expect(
      parseRunnerArguments(["--focus", "risk-review", "--workers", "1"]),
    ).toEqual({
      focusName: "risk-review",
      forwardedArguments: ["--workers", "1"],
    });
  });

  it("removes the inherited no-colour conflict without dropping proof variables", () => {
    expect(
      normalizePlaywrightChildEnvironment({
        NO_COLOR: "1",
        FORCE_COLOR: "1",
        WORKBENCH_E2E_SCENARIO_ID: "mandate-health",
      }),
    ).toEqual({
      FORCE_COLOR: "1",
      WORKBENCH_E2E_SCENARIO_ID: "mandate-health",
    });
  });

  it.each(["--grep", "--grep-invert", "--reporter", "--list"])(
    "rejects the %s proof-bypass control",
    (argument) => {
      expect(() => parseRunnerArguments([argument, "anything"])).toThrow(
        /cannot override governed scenario selection or reporting/,
      );
    },
  );

  it("rejects an empty focus instead of widening execution", () => {
    expect(() => parseRunnerArguments(["--focus"])).toThrow(
      /requires a registered focus name/,
    );
  });
});
