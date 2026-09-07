import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildExpectedTestGrep,
  getExpectedScenarioTests,
  getScenarioDefinition,
  loadScenarioRegistry,
} from "./e2e-scenario-registry.mjs";

export async function runFixtureScenario({
  familyName,
  scenarioName,
  arguments_ = [],
  resultDirectory: configuredResultDirectory,
  environmentOverrides = {},
}) {
  const projectRoot = process.cwd();
  const registry = loadScenarioRegistry({ root: projectRoot });
  const { family, scenario } = getScenarioDefinition(
    registry,
    familyName,
    scenarioName,
  );
  const { focusName, forwardedArguments } = parseRunnerArguments(arguments_);
  const expectedTests = getExpectedScenarioTests(scenario, focusName);
  const fixturePort = parseUnprivilegedPort(
    family.fixture_port_environment,
    process.env[family.fixture_port_environment] ??
      String(family.default_fixture_port),
  );
  const workbenchPort = parseUnprivilegedPort(
    family.workbench_port_environment,
    process.env[family.workbench_port_environment] ??
      process.env.PLAYWRIGHT_PORT ??
      String(family.default_workbench_port),
  );
  if (fixturePort === workbenchPort) {
    throw new Error(
      `${familyName} fixture and Workbench proof ports must be different.`,
    );
  }

  const resultDirectory = resolve(
    projectRoot,
    configuredResultDirectory ??
      process.env.WORKBENCH_E2E_SCENARIO_RESULT_DIR ??
      "output/e2e-scenario-results",
  );
  const resultFileName = `${familyName}-${scenarioName}${focusName ? `-${focusName}` : ""}.json`;
  const resultPath = resolve(resultDirectory, resultFileName);
  const evidenceDirectory = resolve(
    projectRoot,
    process.env[family.evidence_directory_environment] ??
      `output/playwright/fixture-scenarios/${familyName}/${scenarioName}`,
  );
  mkdirSync(resultDirectory, { recursive: true });
  mkdirSync(evidenceDirectory, { recursive: true });
  rmSync(resultPath, { force: true });

  const environment = normalizePlaywrightChildEnvironment({
    ...process.env,
    ...family.additional_environment,
    BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
    PLAYWRIGHT_PORT: String(workbenchPort),
    WORKBENCH_E2E_FIXTURE_GATEWAY: family.fixture_owner,
    WORKBENCH_E2E_SCENARIO_EXPECTED_TESTS: JSON.stringify(expectedTests),
    WORKBENCH_E2E_SCENARIO_FAMILY: familyName,
    WORKBENCH_E2E_SCENARIO_FOCUS: focusName ?? "",
    WORKBENCH_E2E_SCENARIO_ID: scenarioName,
    WORKBENCH_E2E_SCENARIO_RESULT_PATH: resultPath,
    [family.fixture_environment]: scenario.fixture_value,
    [family.fixture_port_environment]: String(fixturePort),
    [family.workbench_port_environment]: String(workbenchPort),
    ...environmentOverrides,
  });
  if (family.proof_environment) {
    environment[family.proof_environment] = scenarioName;
  }
  if (family.evidence_directory_environment) {
    environment[family.evidence_directory_environment] = evidenceDirectory;
  }

  const playwrightCli = resolve(
    projectRoot,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  const reporter = resolve(
    projectRoot,
    "scripts/testing/e2e-scenario-reporter.mjs",
  );
  const child = spawn(
    process.execPath,
    [
      playwrightCli,
      "test",
      scenario.spec,
      "--grep",
      buildExpectedTestGrep(expectedTests),
      "--reporter",
      `line,${reporter}`,
      ...forwardedArguments,
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
      env: environment,
    },
  );

  const stop = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };
  const stopForInterrupt = () => stop("SIGINT");
  const stopForTermination = () => stop("SIGTERM");
  process.once("SIGINT", stopForInterrupt);
  process.once("SIGTERM", stopForTermination);

  try {
    return await new Promise((resolveChild, rejectChild) => {
      child.once("error", rejectChild);
      child.once("exit", (code, signal) => {
        if (signal === "SIGINT") {
          resolveChild(130);
          return;
        }
        if (signal === "SIGTERM") {
          resolveChild(143);
          return;
        }
        resolveChild(code ?? 1);
      });
    });
  } finally {
    process.removeListener("SIGINT", stopForInterrupt);
    process.removeListener("SIGTERM", stopForTermination);
  }
}

export function normalizePlaywrightChildEnvironment(environment) {
  const childEnvironment = { ...environment };
  childEnvironment.LOTUS_ENVIRONMENT =
    childEnvironment.LOTUS_ENVIRONMENT?.trim() || "dev";
  delete childEnvironment.NO_COLOR;
  return childEnvironment;
}

export function parseRunnerArguments(arguments_) {
  let focusName = null;
  const forwardedArguments = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--focus") {
      const value = arguments_[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--focus requires a registered focus name.");
      }
      focusName = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--focus=")) {
      focusName = argument.slice("--focus=".length);
      continue;
    }
    if (
      argument === "--grep" ||
      argument.startsWith("--grep=") ||
      argument === "--grep-invert" ||
      argument.startsWith("--grep-invert=") ||
      argument === "--reporter" ||
      argument.startsWith("--reporter=") ||
      argument === "--list"
    ) {
      throw new Error(
        `${argument} cannot override governed scenario selection or reporting; use a registered --focus.`,
      );
    }
    forwardedArguments.push(argument);
  }
  return { focusName, forwardedArguments };
}

function parseUnprivilegedPort(name, value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  const port = Number.parseInt(value, 10);
  if (port < 1024 || port > 65_535) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  return port;
}
