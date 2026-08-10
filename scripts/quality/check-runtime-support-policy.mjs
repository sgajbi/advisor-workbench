import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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
  const declaredImage = dockerfile.match(/ARG NODE_BASE_IMAGE=(?<image>[^\r\n]+)/)?.groups?.image;
  expectEqual(failures, "container base image", declaredImage, expectedImage);
  if (!dockerfile.includes(`USER ${policy.productionContainer?.executionUser}`)) {
    failures.push(`Container runtime must execute as ${policy.productionContainer?.executionUser}.`);
  }
  if (!dockerfile.includes("RUN npm ci --no-audit --no-fund")) {
    failures.push("The container dependency stage must use immutable npm ci without implicit audit traffic.");
  }

  for (const [path, source] of Object.entries({
    "playwright.config.ts": playwrightConfig,
    "playwright.live.config.ts": livePlaywrightConfig,
  })) {
    if (!source.includes('projects: [{ name: "chromium", use: { browserName: "chromium" } }]')) {
      failures.push(`${path} must declare the governed Chromium browser project explicitly.`);
    }
  }

  for (const [path, source] of Object.entries(workflowSources)) {
    const setupNodeSteps = collectSetupNodeSteps(source);
    if (
      setupNodeSteps.length === 0 ||
      setupNodeSteps.some(
        ({ versions }) =>
          versions.length !== 1 || versions[0] !== policy.productionContainer?.version
      )
    ) {
      failures.push(`${path} must use Node ${policy.productionContainer?.version} for every setup-node step.`);
    }
  }

  for (const path of [".github/workflows/pr-merge-gate.yml", ".github/workflows/main-releasability.yml"]) {
    if (!workflowSources[path]?.includes("node node_modules/playwright/cli.js install chromium")) {
      failures.push(`${path} must install Chromium through the repository-locked Playwright CLI.`);
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

function collectSetupNodeSteps(source) {
  const lines = source.split(/\r?\n/);
  const steps = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (!/^\s*(?:-\s*)?uses:\s*actions\/setup-node@/.test(lines[lineIndex])) {
      continue;
    }

    const directStepMatch = lines[lineIndex].match(/^(?<indent>\s*)-\s*uses:/);
    let stepIndent = directStepMatch?.groups?.indent.length;
    if (stepIndent === undefined) {
      for (let candidate = lineIndex - 1; candidate >= 0; candidate -= 1) {
        const stepMatch = lines[candidate].match(/^(?<indent>\s*)-\s+/);
        if (stepMatch && stepMatch.groups.indent.length < lines[lineIndex].search(/\S/)) {
          stepIndent = stepMatch.groups.indent.length;
          break;
        }
      }
    }

    const block = [lines[lineIndex]];
    for (let candidate = lineIndex + 1; candidate < lines.length; candidate += 1) {
      const nextStepMatch = lines[candidate].match(/^(?<indent>\s*)-\s+/);
      if (nextStepMatch && nextStepMatch.groups.indent.length === stepIndent) {
        break;
      }
      block.push(lines[candidate]);
    }
    const versions = [...block.join("\n").matchAll(/node-version:\s*(?<version>[^\r\n,}#]+)/g)].map(
      (match) => match.groups?.version.trim().replace(/^(?<quote>["'])(?<value>.*)\k<quote>$/, "$<value>")
    );
    steps.push({ versions });
  }

  return steps;
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
