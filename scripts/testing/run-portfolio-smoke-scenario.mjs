import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const scenario = process.argv[2];
const forwardedArguments = process.argv.slice(3);
const fixturePort = parseUnprivilegedPort(
  'PORTFOLIO_E2E_FIXTURE_PORT',
  process.env.PORTFOLIO_E2E_FIXTURE_PORT ?? '18120',
);
const workbenchPort = parseUnprivilegedPort(
  'PORTFOLIO_E2E_WORKBENCH_PORT',
  process.env.PORTFOLIO_E2E_WORKBENCH_PORT ?? process.env.PLAYWRIGHT_PORT ?? '31020',
);

if (scenario !== 'cashflow' && scenario !== 'shell-unavailable') {
  throw new Error('Portfolio smoke scenario must be cashflow or shell-unavailable.');
}
if (fixturePort === workbenchPort) {
  throw new Error('Portfolio fixture and Workbench proof ports must be different.');
}

const projectRoot = process.cwd();
const evidenceDirectory = resolve(
  projectRoot,
  process.env.PORTFOLIO_E2E_EVIDENCE_DIR ??
    (scenario === 'shell-unavailable'
      ? 'output/playwright/issue-651-shell-recovery'
      : 'output/playwright/issue-492-cashflow'),
);
mkdirSync(evidenceDirectory, { recursive: true });
const playwrightCli = resolve(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const child = spawn(
  process.execPath,
  [
    playwrightCli,
    'test',
    'tests/e2e/portfolio-workbench.smoke.spec.ts',
    '--grep',
    scenario === 'shell-unavailable'
      ? 'selected shell failure reaches one truthful terminal recovery state'
      : 'cashflow route keeps projection identity and movement semantics explicit',
    ...forwardedArguments,
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
      PLAYWRIGHT_PORT: String(workbenchPort),
      PORTFOLIO_E2E_FIXTURE: scenario,
      PORTFOLIO_E2E_FIXTURE_PORT: String(fixturePort),
      PORTFOLIO_E2E_EVIDENCE_DIR: evidenceDirectory,
      WORKBENCH_E2E_FIXTURE_GATEWAY: 'portfolio',
    },
  },
);

function parseUnprivilegedPort(name, value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  const port = Number.parseInt(value, 10);
  if (port < 1024 || port > 65535) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  return port;
}

const stop = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};
process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

child.once('error', (error) => {
  throw error;
});
child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
