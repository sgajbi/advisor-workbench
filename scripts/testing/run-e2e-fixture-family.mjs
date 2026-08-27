import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

import { loadScenarioRegistry } from "./e2e-scenario-registry.mjs";
import { runFixtureScenario } from "./run-e2e-fixture-scenario.mjs";

const EVIDENCE_BOUNDARY =
  "Deterministic Workbench fixture-browser proof; not canonical live-source, deployment, production, or bank-acceptance evidence.";
const FORWARDED_OPTIONS_WITH_VALUE = new Set([
  "--global-timeout",
  "--max-failures",
  "--project",
  "--retries",
  "--shard",
  "--timeout",
  "--trace",
  "--workers",
  "-j",
]);

export function parseFamilyArguments(arguments_) {
  let familyName = null;
  const forwardedArguments = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--family") {
      const value = arguments_[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--family requires a registered family name.");
      }
      familyName = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--family=")) {
      familyName = argument.slice("--family=".length);
      continue;
    }
    if (FORWARDED_OPTIONS_WITH_VALUE.has(argument)) {
      const value = arguments_[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      forwardedArguments.push(argument, value);
      index += 1;
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(
        `Unexpected positional argument ${argument}; select a family with --family or WORKBENCH_E2E_FIXTURE_FAMILY.`,
      );
    }
    forwardedArguments.push(argument);
  }
  return { familyName, forwardedArguments };
}

export function buildFamilyProof({ familyName, scenarioOutcomes }) {
  const findings = [];
  for (const outcome of scenarioOutcomes) {
    if (outcome.exit_code !== 0) {
      findings.push(
        `${familyName}/${outcome.scenario} exited with ${outcome.exit_code}.`,
      );
    }
    if (!outcome.artifact) {
      findings.push(`${familyName}/${outcome.scenario} produced no result artifact.`);
      continue;
    }
    if (outcome.artifact.result !== "passed") {
      findings.push(`${familyName}/${outcome.scenario} did not pass exact proof.`);
    }
  }

  const counts = scenarioOutcomes.reduce(
    (total, outcome) => {
      const counts = outcome.artifact?.counts;
      total.scenarios += 1;
      total.expected += counts?.expected ?? 0;
      total.executed += counts?.executed ?? 0;
      total.passed += counts?.passed ?? 0;
      total.skipped += counts?.skipped ?? 0;
      total.failed += counts?.failed ?? 0;
      total.timed_out += counts?.timed_out ?? 0;
      total.interrupted += counts?.interrupted ?? 0;
      return total;
    },
    {
      scenarios: 0,
      expected: 0,
      executed: 0,
      passed: 0,
      skipped: 0,
      failed: 0,
      timed_out: 0,
      interrupted: 0,
    },
  );
  if (scenarioOutcomes.length === 0) {
    findings.push(`${familyName} selected zero registered scenarios.`);
  }
  if (counts.expected === 0 || counts.executed === 0) {
    findings.push(`${familyName} executed zero registered tests.`);
  }
  if (counts.skipped > 0) {
    findings.push(`${familyName} skipped ${counts.skipped} registered tests.`);
  }

  return {
    counts,
    findings: [...new Set(findings)],
    result: findings.length === 0 ? "passed" : "failed",
  };
}

export function buildReuseEnvironment(hasValidatedBuild) {
  return {
    PLAYWRIGHT_REUSE_VALIDATED_BUILD: hasValidatedBuild ? "1" : "0",
  };
}

export function provesValidatedBuild({ exitCode, artifact, buildExists }) {
  return exitCode === 0 && artifact?.result === "passed" && buildExists;
}

export async function runFixtureFamilies(arguments_ = process.argv.slice(2)) {
  const projectRoot = process.cwd();
  const registry = loadScenarioRegistry({ root: projectRoot });
  const parsedArguments = parseFamilyArguments(arguments_);
  const familyName =
    parsedArguments.familyName ?? process.env.WORKBENCH_E2E_FIXTURE_FAMILY ?? null;
  const { forwardedArguments } = parsedArguments;
  const familyNames = familyName ? [familyName] : Object.keys(registry.families);

  for (const selectedFamily of familyNames) {
    if (!registry.families[selectedFamily]) {
      throw new Error(`Unknown fixture scenario family: ${selectedFamily}`);
    }
  }

  let failed = false;
  let hasValidatedBuild = false;
  for (const selectedFamily of familyNames) {
    const outputDirectory = resolve(
      projectRoot,
      "output/e2e-scenario-results",
      selectedFamily,
    );
    mkdirSync(outputDirectory, { recursive: true });
    const scenarioOutcomes = [];

    for (const scenarioName of Object.keys(
      registry.families[selectedFamily].scenarios,
    )) {
      const artifactPath = resolve(
        outputDirectory,
        `${selectedFamily}-${scenarioName}.json`,
      );
      rmSync(artifactPath, { force: true });
      let exitCode = 1;
      let runnerError = null;
      try {
        exitCode = await runFixtureScenario({
          familyName: selectedFamily,
          scenarioName,
          arguments_: forwardedArguments,
          resultDirectory: outputDirectory,
          environmentOverrides: buildReuseEnvironment(hasValidatedBuild),
        });
      } catch (error) {
        runnerError = error instanceof Error ? error.message : String(error);
      }

      const artifact = existsSync(artifactPath)
        ? JSON.parse(readFileSync(artifactPath, "utf8"))
        : null;
      hasValidatedBuild ||= provesValidatedBuild({
        exitCode,
        artifact,
        buildExists: existsSync(resolve(projectRoot, ".next-build", "BUILD_ID")),
      });
      scenarioOutcomes.push({
        scenario: scenarioName,
        exit_code: exitCode,
        runner_error: runnerError,
        artifact_path: relative(projectRoot, artifactPath).replaceAll("\\", "/"),
        artifact,
      });
    }

    const proof = buildFamilyProof({
      familyName: selectedFamily,
      scenarioOutcomes,
    });
    const familyArtifact = {
      schema_version: "1.0.0",
      proof_type: "workbench_e2e_fixture_family",
      family: selectedFamily,
      source_revision:
        process.env.WORKBENCH_DEPLOYMENT_ID ?? process.env.GITHUB_SHA ?? null,
      generated_at: new Date().toISOString(),
      ...proof,
      scenarios: scenarioOutcomes.map((outcome) => ({
        scenario: outcome.scenario,
        exit_code: outcome.exit_code,
        runner_error: outcome.runner_error,
        artifact_path: outcome.artifact_path,
        result: outcome.artifact?.result ?? "missing",
        counts: outcome.artifact?.counts ?? null,
        findings: outcome.artifact?.findings ?? [],
      })),
      evidence_boundary: EVIDENCE_BOUNDARY,
    };
    writeFileSync(
      resolve(outputDirectory, "family-summary.json"),
      `${JSON.stringify(familyArtifact, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(
      resolve(outputDirectory, "family-summary.md"),
      renderFamilySummary(familyArtifact),
      "utf8",
    );

    if (proof.result !== "passed") {
      failed = true;
      console.error(
        `Fixture family proof failed for ${selectedFamily}: ${proof.findings.join(" ")}`,
      );
    } else {
      console.log(
        `Fixture family proof passed for ${selectedFamily}: ${proof.counts.scenarios} scenarios, ${proof.counts.executed} tests, 0 skipped.`,
      );
    }
  }

  return failed ? 1 : 0;
}

export function renderFamilySummary(artifact) {
  const lines = [
    `# ${artifact.family} fixture scenario proof`,
    "",
    `- Result: **${artifact.result}**`,
    `- Source revision: \`${artifact.source_revision ?? "local-unrecorded"}\``,
    `- Scenarios: ${artifact.counts.scenarios}`,
    `- Registered tests executed: ${artifact.counts.executed}/${artifact.counts.expected}`,
    `- Skipped: ${artifact.counts.skipped}`,
    "",
    "| Scenario | Result | Executed | Skipped |",
    "|---|---:|---:|---:|",
    ...artifact.scenarios.map(
      (scenario) =>
        `| ${scenario.scenario} | ${scenario.result} | ${scenario.counts?.executed ?? 0} | ${scenario.counts?.skipped ?? 0} |`,
    ),
    "",
    `> ${artifact.evidence_boundary}`,
    "",
  ];
  if (artifact.findings.length > 0) {
    lines.splice(7, 0, ...artifact.findings.map((finding) => `- Finding: ${finding}`), "");
  }
  return `${lines.join("\n")}\n`;
}

if (process.argv[1]?.endsWith("run-e2e-fixture-family.mjs")) {
  process.exitCode = await runFixtureFamilies();
}
