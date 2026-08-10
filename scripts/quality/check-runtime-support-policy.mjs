import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  collectWorkflowStepEntries,
  declaresGovernedChromiumProject,
  isRecord,
  isUnconditionalWorkflowStep,
  normalizeInstruction,
  parseDockerfile,
  parseWorkflow,
} from "./runtime-support-source-evidence.mjs";

const POLICY_PATH = "docs/architecture/workbench-runtime-support-policy.v1.json";
const WORKFLOW_PATHS = [
  ".github/workflows/feature-lane.yml",
  ".github/workflows/pr-merge-gate.yml",
  ".github/workflows/main-releasability.yml",
];
const REQUIRED_NON_CLAIMS = [
  "cross-browser-bank-certification",
  "load-or-soak-certification",
  "horizontal-scale-certification",
  "production-identity-certification",
];

export function validateRuntimeSupportPolicy({
  packageJson,
  packageLock,
  policy,
  dockerfile,
  makefile,
  playwrightConfig,
  livePlaywrightConfig,
  workflowSources,
  execution = {},
  today = new Date().toISOString().slice(0, 10),
}) {
  const failures = [];
  const nodePolicy = policy.developerRuntime?.node;
  const npmPolicy = policy.developerRuntime?.packageManager;

  expectEqual(failures, "contract", policy.contract, "workbench-runtime-support-policy.v1");
  expectEqual(failures, "governed issue", policy.governedByIssue, 612);
  expectEqual(failures, "packageManager", packageJson.packageManager, `npm@${npmPolicy?.declaredVersion}`);
  expectEqual(failures, "Node engines range", packageJson.engines?.node, nodePolicy?.supportedRange);
  expectEqual(failures, "npm engines range", packageJson.engines?.npm, npmPolicy?.supportedRange);
  expectEqual(failures, "lockfile Node engines range", packageLock.packages?.[""]?.engines?.node, nodePolicy?.supportedRange);
  expectEqual(failures, "lockfile npm engines range", packageLock.packages?.[""]?.engines?.npm, npmPolicy?.supportedRange);
  expectEqual(failures, "Node devEngines range", packageJson.devEngines?.runtime?.version, nodePolicy?.supportedRange);
  expectEqual(failures, "Node devEngines failure policy", packageJson.devEngines?.runtime?.onFail, "error");
  expectEqual(failures, "npm devEngines range", packageJson.devEngines?.packageManager?.version, npmPolicy?.supportedRange);
  expectEqual(failures, "npm devEngines failure policy", packageJson.devEngines?.packageManager?.onFail, "error");
  expectEqual(failures, "Next version", packageJson.dependencies?.next, policy.applicationStack?.next?.version);
  expectEqual(failures, "React version", packageJson.dependencies?.react, policy.applicationStack?.react?.version);
  expectEqual(failures, "TypeScript version", packageJson.devDependencies?.typescript, policy.applicationStack?.typescript?.version);
  expectEqual(failures, "Playwright version", packageJson.devDependencies?.["@playwright/test"], policy.validationTooling?.playwright?.version);
  expectEqual(
    failures,
    "workflow YAML parser version",
    packageJson.devDependencies?.yaml,
    policy.validationTooling?.workflowYamlParser?.version
  );
  expectEqual(
    failures,
    "lockfile workflow YAML parser version",
    packageLock.packages?.[""]?.devDependencies?.yaml,
    policy.validationTooling?.workflowYamlParser?.version
  );

  if (execution.enforceExact) {
    expectEqual(failures, "executing Node version", execution.nodeVersion, policy.productionContainer?.version);
    expectEqual(failures, "executing npm version", execution.npmVersion, npmPolicy?.declaredVersion);
  }

  if (!/(?:^|\r?\n)install:\r?\n\tnpm ci --no-audit --no-fund(?:\r?\n|$)/.test(makefile)) {
    failures.push("The canonical Make install target must use immutable npm ci without implicit audit traffic.");
  }

  const expectedImage = [
    `node:${policy.productionContainer?.version}`,
    policy.productionContainer?.distribution,
    `@${policy.productionContainer?.digest}`,
  ].join("-").replace("-@", "@");
  const dockerModel = parseDockerfile(dockerfile);
  const baseImageArguments = dockerModel.globalInstructions.filter(
    ({ keyword, argument }) =>
      keyword === "ARG" && argument.startsWith("NODE_BASE_IMAGE=")
  );
  const declaredImage =
    baseImageArguments.length === 1
      ? baseImageArguments[0].argument.slice("NODE_BASE_IMAGE=".length)
      : undefined;
  expectEqual(failures, "container base image", declaredImage, expectedImage);

  const dependencyStages = dockerModel.stages.filter(({ name }) => name === "deps");
  if (dependencyStages.length !== 1) {
    failures.push('Dockerfile must declare exactly one Docker stage named "deps".');
  } else {
    const dependencyInstallCommands = dockerModel.stages.flatMap((stage) =>
      stage.instructions
        .filter(
          ({ keyword, argument }) =>
            keyword === "RUN" && containsNpmDependencyInstall(argument)
        )
        .map((instruction) => ({ instruction, stage }))
    );
    if (
      dependencyInstallCommands.length !== 1 ||
      dependencyInstallCommands[0].stage !== dependencyStages[0] ||
      normalizeInstruction(dependencyInstallCommands[0].instruction.argument) !==
        "npm ci --no-audit --no-fund"
    ) {
      failures.push(
        "Dockerfile must contain exactly one dependency install across all stages, owned by deps as: RUN npm ci --no-audit --no-fund."
      );
    }
  }

  const builderStages = dockerModel.stages.filter(({ name }) => name === "builder");
  if (builderStages.length !== 1) {
    failures.push('Dockerfile must declare exactly one Docker stage named "builder".');
  } else {
    const dependencyCopies = builderStages[0].instructions.filter(
      ({ keyword, argument }) =>
        keyword === "COPY" &&
        normalizeInstruction(argument) === "--from=deps /app/node_modules ./node_modules"
    );
    if (dependencyCopies.length !== 1) {
      failures.push(
        "The named builder stage must consume the governed deps node_modules exactly once."
      );
    }
  }

  const runnerStages = dockerModel.stages.filter(({ name }) => name === "runner");
  if (runnerStages.length !== 1) {
    failures.push('Dockerfile must declare exactly one Docker stage named "runner".');
  } else {
    if (dockerModel.stages.at(-1) !== runnerStages[0]) {
      failures.push(
        'The named runner stage must be the final Docker stage because protected builds publish the default final stage.'
      );
    }
    const standaloneCopies = runnerStages[0].instructions.filter(
      ({ keyword, argument }) =>
        keyword === "COPY" &&
        normalizeInstruction(argument) ===
          "--chown=node:node --from=builder /app/.next/standalone ./"
    );
    if (standaloneCopies.length !== 1) {
      failures.push(
        "The final runner stage must consume the builder standalone output exactly once."
      );
    }
    const userInstructions = runnerStages[0].instructions.filter(
      ({ keyword }) => keyword === "USER"
    );
    const finalUser = userInstructions.at(-1)?.argument;
    const expectedUser = policy.productionContainer?.executionUser;
    if (
      typeof finalUser !== "string" ||
      !new RegExp(`^${escapeRegExp(expectedUser)}(?::[^\\s]+)?$`).test(finalUser)
    ) {
      failures.push(
        `The runner stage final effective user must execute as ${expectedUser}; received ${JSON.stringify(finalUser)}.`
      );
    }
  }

  for (const [path, source] of Object.entries({
    "playwright.config.ts": playwrightConfig,
    "playwright.live.config.ts": livePlaywrightConfig,
  })) {
    if (!declaresGovernedChromiumProject(source)) {
      failures.push(`${path} must declare the governed Chromium browser project explicitly.`);
    }
  }

  const parsedWorkflows = new Map();
  for (const [path, source] of Object.entries(workflowSources)) {
    let workflow;
    try {
      workflow = parseWorkflow(source);
      parsedWorkflows.set(path, workflow);
    } catch {
      failures.push(`${path} must be valid YAML before runtime support can be verified.`);
      continue;
    }
    const setupNodeSteps = collectWorkflowStepEntries(workflow).filter(
      ({ step }) =>
        typeof step.uses === "string" &&
        step.uses.startsWith("actions/setup-node@")
    );
    if (
      setupNodeSteps.length === 0 ||
      setupNodeSteps.some(
        ({ step }) =>
          !isRecord(step.with) ||
          step.with["node-version"] !== policy.productionContainer?.version
      )
    ) {
      failures.push(`${path} must use Node ${policy.productionContainer?.version} for every setup-node step.`);
    }
  }

  for (const path of [".github/workflows/pr-merge-gate.yml", ".github/workflows/main-releasability.yml"]) {
    const workflow = parsedWorkflows.get(path);
    if (!workflow) {
      continue;
    }
    const browserInstallSteps = collectWorkflowStepEntries(workflow).filter(
      ({ step }) =>
        typeof step.run === "string" &&
        /\bplaywright(?:\/cli\.js)?\b.*\binstall\b.*\bchromium\b/i.test(
          normalizeInstruction(step.run)
        )
    );
    const browserSmokeSteps = collectWorkflowStepEntries(workflow).filter(
      ({ step }) =>
        typeof step.run === "string" &&
        normalizeInstruction(step.run) === "make test-e2e"
    );
    if (
      browserInstallSteps.length !== 1 ||
      browserSmokeSteps.length !== 1 ||
      normalizeInstruction(browserInstallSteps[0]?.step.run ?? "") !==
        "node node_modules/playwright/cli.js install chromium" ||
      !isUnconditionalWorkflowStep(browserInstallSteps[0]) ||
      !isUnconditionalWorkflowStep(browserSmokeSteps[0]) ||
      browserInstallSteps[0].job !== browserSmokeSteps[0].job ||
      browserInstallSteps[0].stepIndex >= browserSmokeSteps[0].stepIndex
    ) {
      failures.push(
        `${path} must install Chromium exactly once through the repository-locked CLI before smoke runs in the same unconditional job.`
      );
    }
  }

  const reviewedOnIsValid = isIsoDate(policy.reviewedOn);
  const nextReviewByIsValid = isIsoDate(policy.nextReviewBy);
  if (!reviewedOnIsValid) {
    failures.push("Runtime support policy reviewedOn must be a real ISO YYYY-MM-DD date.");
  } else if (policy.reviewedOn > today) {
    failures.push(`Runtime support policy reviewedOn cannot be in the future (${policy.reviewedOn}).`);
  }
  if (!nextReviewByIsValid) {
    failures.push("Runtime support policy nextReviewBy must be a real ISO YYYY-MM-DD date.");
  } else if (policy.nextReviewBy < today) {
    failures.push(`Runtime support policy review expired on ${policy.nextReviewBy}.`);
  }
  if (reviewedOnIsValid && nextReviewByIsValid && policy.reviewedOn > policy.nextReviewBy) {
    failures.push("Runtime support policy reviewedOn must not be later than nextReviewBy.");
  }
  if (policy.browserPolicy?.certificationStatus !== "partial-chromium-proof-only") {
    failures.push("Browser certification must remain explicit until a wider governed matrix passes.");
  }
  if (policy.scalingPolicy?.certificationStatus !== "not-capacity-certified") {
    failures.push("Scaling certification must remain explicit until measured load and capacity proof passes.");
  }
  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!policy.explicitNonClaims?.includes(nonClaim)) {
      failures.push(`Runtime support policy must retain explicit non-claim ${nonClaim}.`);
    }
  }

  return failures;
}

export function collectRuntimeSupportPolicyFailures(root = process.cwd()) {
  const packageJson = readJson(root, "package.json");
  const packageLock = readJson(root, "package-lock.json");
  const policy = readJson(root, POLICY_PATH);
  const workflowSources = Object.fromEntries(
    WORKFLOW_PATHS.map((path) => [path, readFileSync(join(root, path), "utf8")])
  );
  return validateRuntimeSupportPolicy({
    packageJson,
    packageLock,
    policy,
    dockerfile: readFileSync(join(root, "Dockerfile"), "utf8"),
    makefile: readFileSync(join(root, "Makefile"), "utf8"),
    playwrightConfig: readFileSync(join(root, "playwright.config.ts"), "utf8"),
    livePlaywrightConfig: readFileSync(join(root, "playwright.live.config.ts"), "utf8"),
    workflowSources,
    execution: {
      enforceExact: process.env.CI === "true",
      nodeVersion: process.versions.node,
      npmVersion: process.env.npm_config_user_agent?.match(/npm\/(?<version>\d+\.\d+\.\d+)/)?.groups?.version,
    },
  });
}

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function expectEqual(failures, label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNpmDependencyInstall(value) {
  return /(?:^|[\s;&|("'\/])npm\b(?=[^;&|\r\n]{0,200}\b(?:ci|install)\b)/i.test(
    normalizeInstruction(value)
  );
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = collectRuntimeSupportPolicyFailures();
  if (failures.length > 0) {
    console.error(["Runtime support policy validation failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
    process.exitCode = 1;
  } else {
    const npmVersion = process.env.npm_config_user_agent?.match(/npm\/(?<version>\d+\.\d+\.\d+)/)?.groups?.version;
    console.log(`Runtime support policy validation passed (Node ${process.versions.node}, npm ${npmVersion ?? "unknown"}).`);
  }
}
