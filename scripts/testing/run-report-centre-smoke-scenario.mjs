import { resolve } from "node:path";
import { spawn } from "node:child_process";

const forwardedArguments = process.argv.slice(2);
const fixturePort = Number.parseInt(process.env.REPORT_CENTRE_E2E_FIXTURE_PORT ?? "18101", 10);

if (!Number.isInteger(fixturePort) || fixturePort < 1024 || fixturePort > 65535) {
  throw new Error("REPORT_CENTRE_E2E_FIXTURE_PORT must be an unprivileged TCP port.");
}

const projectRoot = process.cwd();
const playwrightCli = resolve(projectRoot, "node_modules", "@playwright", "test", "cli.js");
const child = spawn(
  process.execPath,
  [playwrightCli, "test", "tests/e2e/report-centre-state.smoke.spec.ts", ...forwardedArguments],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
      LOTUS_ENVIRONMENT: "dev",
      REPORT_CENTRE_E2E_FIXTURE: "state-matrix",
      REPORT_CENTRE_E2E_FIXTURE_PORT: String(fixturePort),
      WORKBENCH_E2E_FIXTURE_GATEWAY: "report-centre",
      WORKBENCH_REPORTING_AUTH_MODE: "development_configured",
      WORKBENCH_REPORTING_CALLER_ROLE: "client_advisor",
      WORKBENCH_REPORTING_CALLER_PORTFOLIO_IDS: [
        "PB_REPORT_READY_001",
        "PB_REPORT_RECOVERY_001",
        "PB_REPORT_RESTRICTED_001",
        "PB_REPORT_EMPTY_001",
      ].join(","),
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
