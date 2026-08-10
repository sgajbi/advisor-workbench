import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const POLICY_PATH = "docs/architecture/workbench-runtime-support-policy.v1.json";
const WORKFLOW_PATHS = [
  ".github/workflows/feature-lane.yml",
  ".github/workflows/pr-merge-gate.yml",
  ".github/workflows/main-releasability.yml",
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
    const declaredLines = [...source.matchAll(/node-version:\s*["']?(?<version>\d+\.\d+\.\d+)["']?/g)].map(
      (match) => match.groups?.version
    );
    if (declaredLines.length === 0 || declaredLines.some((version) => version !== policy.productionContainer?.version)) {
      failures.push(`${path} must use Node ${policy.productionContainer?.version} for every setup-node step.`);
    }
  }

  for (const path of [".github/workflows/pr-merge-gate.yml", ".github/workflows/main-releasability.yml"]) {
    if (!workflowSources[path]?.includes("node node_modules/playwright/cli.js install chromium")) {
      failures.push(`${path} must install Chromium through the repository-locked Playwright CLI.`);
    }
  }

  if (policy.nextReviewBy < today) {
    failures.push(`Runtime support policy review expired on ${policy.nextReviewBy}.`);
  }
  if (policy.browserPolicy?.certificationStatus !== "partial-chromium-proof-only") {
    failures.push("Browser certification must remain explicit until a wider governed matrix passes.");
  }
  if (policy.scalingPolicy?.certificationStatus !== "not-capacity-certified") {
    failures.push("Scaling certification must remain explicit until measured load and capacity proof passes.");
  }
  if (!policy.explicitNonClaims?.includes("load-or-soak-certification")) {
    failures.push("The policy must not imply load or soak certification before measured proof exists.");
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
