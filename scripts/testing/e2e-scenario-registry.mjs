import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_REGISTRY_PATH = "scripts/testing/e2e-scenario-registry.json";

export function loadScenarioRegistry({
  root = process.cwd(),
  registryPath = DEFAULT_REGISTRY_PATH,
} = {}) {
  return JSON.parse(readFileSync(resolve(root, registryPath), "utf8"));
}

export function getScenarioDefinition(registry, familyName, scenarioName) {
  const family = registry.families?.[familyName];
  if (!family) {
    throw new Error(
      `Unknown fixture family ${familyName}. Expected one of: ${Object.keys(registry.families ?? {}).join(", ")}.`,
    );
  }
  const scenario = family.scenarios?.[scenarioName];
  if (!scenario) {
    throw new Error(
      `Unknown ${familyName} fixture scenario ${scenarioName}. Expected one of: ${Object.keys(family.scenarios ?? {}).join(", ")}.`,
    );
  }
  return { family, scenario };
}

export function getExpectedScenarioTests(scenario, focusName) {
  if (!focusName) {
    return scenario.expected_tests;
  }
  const focusedTests = scenario.focuses?.[focusName];
  if (!focusedTests) {
    throw new Error(
      `Unknown scenario focus ${focusName}. Expected one of: ${Object.keys(scenario.focuses ?? {}).join(", ") || "none"}.`,
    );
  }
  return focusedTests;
}

export function buildExpectedTestGrep(expectedTests) {
  return expectedTests.map(escapeRegExp).join("|");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
