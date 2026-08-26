import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";

import {
  DEFAULT_REGISTRY_PATH,
  loadScenarioRegistry,
} from "../testing/e2e-scenario-registry.mjs";

const argumentsByName = parseArguments(process.argv.slice(2));
const root = resolve(argumentsByName.root ?? process.cwd());
const registryPath = argumentsByName.registry ?? DEFAULT_REGISTRY_PATH;

const result = validateScenarioGovernance({ root, registryPath });
if (argumentsByName.json === "true") {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else if (result.findings.length === 0) {
  console.log(
    `E2E scenario governance passed: ${result.inspectedFamilies} families, ${result.inspectedScenarios} scenarios, ${result.inspectedExpectedTests} registered executions, ${result.inspectedFixtureGuards} fixture guards.`,
  );
} else {
  console.error("E2E scenario governance failed:");
  for (const finding of result.findings) {
    console.error(`- ${finding}`);
  }
}
if (result.findings.length > 0) {
  process.exitCode = 1;
}

export function validateScenarioGovernance({ root, registryPath }) {
  const findings = [];
  const absoluteRegistryPath = resolve(root, registryPath);
  if (!existsSync(absoluteRegistryPath)) {
    return emptyResult([`Registry does not exist: ${absoluteRegistryPath}`]);
  }

  let registry;
  try {
    registry = loadScenarioRegistry({ root, registryPath });
  } catch (error) {
    return emptyResult([`Registry cannot be parsed: ${error.message}`]);
  }

  const families = Object.entries(registry.families ?? {});
  if (families.length === 0) {
    return emptyResult(["Registry contains zero scenario families."]);
  }

  let inspectedScenarios = 0;
  let inspectedExpectedTests = 0;
  let inspectedFixtureGuards = 0;
  const sourceBySpec = new Map();
  const fixtureGuards = [];

  for (const [familyName, family] of families) {
    const scenarios = Object.entries(family.scenarios ?? {});
    if (scenarios.length === 0) {
      findings.push(`${familyName}: family contains zero scenarios.`);
      continue;
    }
    if (family.default_fixture_port === family.default_workbench_port) {
      findings.push(`${familyName}: fixture and Workbench ports must be different.`);
    }

    for (const [scenarioName, scenario] of scenarios) {
      inspectedScenarios += 1;
      const context = `${familyName}/${scenarioName}`;
      const expectedTests = scenario.expected_tests ?? [];
      inspectedExpectedTests += expectedTests.length;
      if (expectedTests.length === 0) {
        findings.push(`${context}: expected_tests must not be empty.`);
      }
      if (new Set(expectedTests).size !== expectedTests.length) {
        findings.push(`${context}: expected_tests contains duplicate titles.`);
      }
      for (const [focusName, focusedTests] of Object.entries(scenario.focuses ?? {})) {
        if (focusedTests.length === 0) {
          findings.push(`${context}/${focusName}: focus must not be empty.`);
        }
        for (const title of focusedTests) {
          if (!expectedTests.includes(title)) {
            findings.push(`${context}/${focusName}: focus references unregistered test ${JSON.stringify(title)}.`);
          }
        }
      }

      const absoluteSpecPath = resolve(root, scenario.spec ?? "");
      if (!scenario.spec || !existsSync(absoluteSpecPath)) {
        findings.push(`${context}: spec does not exist: ${scenario.spec ?? "<missing>"}.`);
        continue;
      }
      if (!sourceBySpec.has(scenario.spec)) {
        const sourceText = readFileSync(absoluteSpecPath, "utf8");
        sourceBySpec.set(scenario.spec, sourceText);
        fixtureGuards.push(
          ...extractFixtureGuards({
            sourceText,
            spec: scenario.spec,
            fixtureEnvironments: families.flatMap(([, candidateFamily]) => [
              candidateFamily.fixture_environment,
              candidateFamily.proof_environment,
            ]).filter(Boolean),
          }),
        );
      }
      const sourceText = sourceBySpec.get(scenario.spec);
      for (const title of expectedTests) {
        if (
          !sourceText.includes(title) &&
          !(
            scenario.generated_test_title_prefix &&
            title.startsWith(scenario.generated_test_title_prefix) &&
            sourceText.includes(scenario.generated_test_title_prefix)
          )
        ) {
          findings.push(`${context}: registered test is absent from ${scenario.spec}: ${JSON.stringify(title)}.`);
        }
      }
    }
  }

  const uniqueFixtureGuards = uniqueBy(
    fixtureGuards,
    (guard) => `${guard.spec}:${guard.line}:${guard.title}:${guard.environment}:${guard.value}`,
  );
  inspectedFixtureGuards = uniqueFixtureGuards.length;
  for (const guard of uniqueFixtureGuards) {
    const owners = [];
    for (const [familyName, family] of families) {
      for (const [scenarioName, scenario] of Object.entries(family.scenarios ?? {})) {
        const environmentMatches =
          guard.environment === family.fixture_environment ||
          guard.environment === family.proof_environment;
        const valueMatches =
          guard.environment === family.proof_environment
            ? guard.value === scenarioName
            : guard.value === scenario.fixture_value;
        if (
          environmentMatches &&
          valueMatches &&
          scenario.spec === guard.spec &&
          scenario.expected_tests?.includes(guard.title)
        ) {
          owners.push(`${familyName}/${scenarioName}`);
        }
      }
    }
    if (owners.length === 0) {
      findings.push(
        `${guard.spec}:${guard.line}: fixture-gated test ${JSON.stringify(guard.title)} (${guard.environment}=${guard.value}) is not registered.`,
      );
    }
    if (owners.length > 1) {
      findings.push(
        `${guard.spec}:${guard.line}: fixture-gated test ${JSON.stringify(guard.title)} has multiple owners: ${owners.join(", ")}.`,
      );
    }
  }

  if (inspectedScenarios === 0 || inspectedExpectedTests === 0) {
    findings.push("Scenario governance inspected zero scenarios or zero expected tests.");
  }

  return {
    schemaVersion: registry.schema_version ?? null,
    inspectedFamilies: families.length,
    inspectedScenarios,
    inspectedExpectedTests,
    inspectedFixtureGuards,
    findings,
  };
}

function extractFixtureGuards({ sourceText, spec, fixtureEnvironments }) {
  const sourceFile = ts.createSourceFile(
    spec,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const guards = [];

  function visit(node, currentTestTitle = null) {
    let nextTestTitle = currentTestTitle;
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "test" &&
      node.arguments.length >= 2 &&
      (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
    ) {
      nextTestTitle = node.arguments[0].text;
    }
    if (
      nextTestTitle &&
      ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(
        node.operatorToken.kind,
      )
    ) {
      const left = node.left.getText(sourceFile);
      const match = /^process\.env\.([A-Z0-9_]+)$/.exec(left);
      if (
        match &&
        fixtureEnvironments.includes(match[1]) &&
        (ts.isStringLiteral(node.right) || ts.isNoSubstitutionTemplateLiteral(node.right))
      ) {
        guards.push({
          spec,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          title: nextTestTitle,
          environment: match[1],
          value: node.right.text,
        });
      }
    }
    ts.forEachChild(node, (child) => visit(child, nextTestTitle));
  }

  visit(sourceFile);
  return guards;
}

function parseArguments(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument ${value}.`);
    }
    const name = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[name] = "true";
      continue;
    }
    parsed[name] = next;
    index += 1;
  }
  return parsed;
}

function emptyResult(findings) {
  return {
    schemaVersion: null,
    inspectedFamilies: 0,
    inspectedScenarios: 0,
    inspectedExpectedTests: 0,
    inspectedFixtureGuards: 0,
    findings,
  };
}

function uniqueBy(values, key) {
  const seen = new Set();
  return values.filter((value) => {
    const identity = key(value);
    if (seen.has(identity)) {
      return false;
    }
    seen.add(identity);
    return true;
  });
}
