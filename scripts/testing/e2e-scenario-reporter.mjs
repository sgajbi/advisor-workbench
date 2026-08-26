import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export default class GovernedScenarioReporter {
  constructor() {
    this.family = process.env.WORKBENCH_E2E_SCENARIO_FAMILY ?? null;
    this.scenario = process.env.WORKBENCH_E2E_SCENARIO_ID ?? null;
    this.focus = process.env.WORKBENCH_E2E_SCENARIO_FOCUS ?? null;
    this.outputPath = process.env.WORKBENCH_E2E_SCENARIO_RESULT_PATH ?? null;
    this.expectedTests = parseExpectedTests(
      process.env.WORKBENCH_E2E_SCENARIO_EXPECTED_TESTS,
    );
    this.bootstrapFindings = [];
    this.plannedTests = [];
    this.attempts = [];
    this.startedAt = new Date().toISOString();

    if (!this.family) {
      this.bootstrapFindings.push("Scenario family is missing.");
    }
    if (!this.scenario) {
      this.bootstrapFindings.push("Scenario id is missing.");
    }
    if (!this.outputPath) {
      this.bootstrapFindings.push("Scenario result path is missing.");
    }
    if (this.expectedTests.length === 0) {
      this.bootstrapFindings.push("Expected test set is empty or invalid.");
    }
  }

  onBegin(_config, suite) {
    this.plannedTests = suite.allTests().map((testCase) => testCase.title);
  }

  onTestEnd(testCase, result) {
    this.attempts.push({
      title: testCase.title,
      retry: result.retry,
      status: result.status,
      duration_ms: result.duration,
      errors: result.errors.map((error) => error.message ?? String(error)),
    });
  }

  async onEnd(fullResult) {
    const finalAttempts = finalAttemptByTitle(this.attempts);
    const proof = evaluateScenarioProof({
      expectedTests: this.expectedTests,
      plannedTests: this.plannedTests,
      results: finalAttempts,
      initialFindings: this.bootstrapFindings,
    });
    const artifact = {
      schema_version: "1.0.0",
      proof_type: "workbench_e2e_fixture_scenario",
      family: this.family,
      scenario: this.scenario,
      focus: this.focus,
      source_revision:
        process.env.WORKBENCH_DEPLOYMENT_ID ??
        process.env.GITHUB_SHA ??
        null,
      generated_at: new Date().toISOString(),
      started_at: this.startedAt,
      duration_ms: fullResult.duration,
      expected_tests: this.expectedTests,
      planned_tests: this.plannedTests,
      attempts: this.attempts,
      counts: proof.counts,
      findings: proof.findings,
      result: proof.result,
      evidence_boundary:
        "Deterministic Workbench fixture-browser proof; not canonical live-source, deployment, production, or bank-acceptance evidence.",
    };

    if (this.outputPath) {
      const absoluteOutputPath = resolve(process.cwd(), this.outputPath);
      mkdirSync(dirname(absoluteOutputPath), { recursive: true });
      writeFileSync(
        absoluteOutputPath,
        `${JSON.stringify(artifact, null, 2)}\n`,
        "utf8",
      );
    }

    if (proof.findings.length > 0) {
      console.error(
        `Fixture scenario proof failed for ${this.family ?? "<missing>"}/${this.scenario ?? "<missing>"}:`,
      );
      for (const finding of proof.findings) {
        console.error(`- ${finding}`);
      }
      return { status: "failed" };
    }

    console.log(
      `Fixture scenario proof passed for ${this.family}/${this.scenario}: ${proof.counts.passed} executed, 0 skipped.`,
    );
    return { status: fullResult.status };
  }

  printsToStdio() {
    return true;
  }
}

export function evaluateScenarioProof({
  expectedTests,
  plannedTests,
  results,
  initialFindings = [],
}) {
  const findings = [...initialFindings];
  const duplicateExpected = duplicates(expectedTests);
  const duplicatePlanned = duplicates(plannedTests);
  const expected = new Set(expectedTests);
  const planned = new Set(plannedTests);
  const resultsByTitle = new Map(results.map((result) => [result.title, result]));

  for (const title of duplicateExpected) {
    findings.push(`Expected test identity is duplicated: ${JSON.stringify(title)}.`);
  }
  for (const title of duplicatePlanned) {
    findings.push(`Selected test identity is duplicated: ${JSON.stringify(title)}.`);
  }
  for (const title of expected) {
    if (!planned.has(title)) {
      findings.push(`Expected test was not selected: ${JSON.stringify(title)}.`);
      continue;
    }
    const result = resultsByTitle.get(title);
    if (!result) {
      findings.push(`Expected test did not complete: ${JSON.stringify(title)}.`);
      continue;
    }
    if (result.status !== "passed") {
      findings.push(
        `Expected test ${JSON.stringify(title)} finished with ${result.status}.`,
      );
    }
  }
  for (const title of planned) {
    if (!expected.has(title)) {
      findings.push(`Unexpected test was selected: ${JSON.stringify(title)}.`);
    }
  }
  if (expected.size === 0 || planned.size === 0) {
    findings.push("Scenario proof selected zero expected or zero planned tests.");
  }

  const counts = {
    expected: expectedTests.length,
    planned: plannedTests.length,
    executed: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    timed_out: results.filter((result) => result.status === "timedOut").length,
    interrupted: results.filter((result) => result.status === "interrupted").length,
  };

  return {
    counts,
    findings: [...new Set(findings)],
    result: findings.length === 0 ? "passed" : "failed",
  };
}

function parseExpectedTests(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function finalAttemptByTitle(attempts) {
  const final = new Map();
  for (const attempt of attempts) {
    const current = final.get(attempt.title);
    if (!current || attempt.retry >= current.retry) {
      final.set(attempt.title, attempt);
    }
  }
  return [...final.values()];
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
}
