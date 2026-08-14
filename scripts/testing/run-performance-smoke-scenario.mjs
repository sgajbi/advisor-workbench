import { resolve } from "node:path";
import { spawn } from "node:child_process";

const scenario = process.argv[2];
const forwardedArguments = process.argv.slice(3);
const supportedScenarios = new Set([
  "populated",
  "unavailable",
  "refresh-integrity",
  "trend-integrity",
  "horizon-integrity",
  "analysis-controls",
  "unknown-period",
]);
const fixturePort = Number.parseInt(process.env.PERFORMANCE_E2E_FIXTURE_PORT ?? "18100", 10);
const workbenchPort = Number.parseInt(
  process.env.PERFORMANCE_E2E_WORKBENCH_PORT ?? process.env.PLAYWRIGHT_PORT ?? "31030",
  10,
);

if (!supportedScenarios.has(scenario)) {
  throw new Error(
    "Performance smoke scenario must be populated, unavailable, refresh-integrity, trend-integrity, horizon-integrity, analysis-controls, or unknown-period.",
  );
}
if (!Number.isInteger(fixturePort) || fixturePort < 1024 || fixturePort > 65535) {
  throw new Error("PERFORMANCE_E2E_FIXTURE_PORT must be an unprivileged TCP port.");
}
if (!Number.isInteger(workbenchPort) || workbenchPort < 1024 || workbenchPort > 65535) {
  throw new Error("PERFORMANCE_E2E_WORKBENCH_PORT must be an unprivileged TCP port.");
}

const projectRoot = process.cwd();
const playwrightCli = resolve(
  projectRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
const child = spawn(
  process.execPath,
  [
    playwrightCli,
    "test",
    "tests/e2e/performance-workbench.smoke.spec.ts",
    ...forwardedArguments,
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
      PERFORMANCE_E2E_FIXTURE: scenario,
      PERFORMANCE_E2E_FIXTURE_PORT: String(fixturePort),
      PLAYWRIGHT_PORT: String(workbenchPort),
      WORKBENCH_E2E_FIXTURE_GATEWAY: "performance",
    },
  },
);

const stop = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};
process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
