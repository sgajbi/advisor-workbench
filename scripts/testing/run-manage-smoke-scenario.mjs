import { resolve } from "node:path";
import { spawn } from "node:child_process";

const scenario = process.argv[2];
const forwardedArguments = process.argv.slice(3);
const fixturePort = Number.parseInt(
  process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150",
  10,
);
const workbenchPort = Number.parseInt(
  process.env.MANAGE_E2E_WORKBENCH_PORT ??
    process.env.PLAYWRIGHT_PORT ??
    "31050",
  10,
);

if (scenario !== "rebalance-waves") {
  throw new Error("Manage smoke scenario must be rebalance-waves.");
}
for (const [name, port] of [
  ["MANAGE_E2E_FIXTURE_PORT", fixturePort],
  ["MANAGE_E2E_WORKBENCH_PORT", workbenchPort],
]) {
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
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
    "tests/e2e/manage-rebalance-workspace.spec.ts",
    ...forwardedArguments,
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
      MANAGE_E2E_FIXTURE: scenario,
      MANAGE_E2E_FIXTURE_PORT: String(fixturePort),
      PLAYWRIGHT_PORT: String(workbenchPort),
      WORKBENCH_E2E_FIXTURE_GATEWAY: "manage",
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
