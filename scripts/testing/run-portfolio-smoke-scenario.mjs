import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const scenario = process.argv[2];
const forwardedArguments = process.argv.slice(3);
const fixturePort = Number.parseInt(process.env.PORTFOLIO_E2E_FIXTURE_PORT ?? '18120', 10);

if (scenario !== 'cashflow') {
  throw new Error('Portfolio smoke scenario must be cashflow.');
}
if (!Number.isInteger(fixturePort) || fixturePort < 1024 || fixturePort > 65535) {
  throw new Error('PORTFOLIO_E2E_FIXTURE_PORT must be an unprivileged TCP port.');
}

const projectRoot = process.cwd();
const evidenceDirectory = resolve(
  projectRoot,
  process.env.PORTFOLIO_E2E_EVIDENCE_DIR ?? 'output/playwright/issue-492-cashflow',
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
    'cashflow route keeps projection identity and movement semantics explicit',
    ...forwardedArguments,
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
      PORTFOLIO_E2E_FIXTURE: scenario,
      PORTFOLIO_E2E_FIXTURE_PORT: String(fixturePort),
      PORTFOLIO_E2E_EVIDENCE_DIR: evidenceDirectory,
      WORKBENCH_E2E_FIXTURE_GATEWAY: 'portfolio',
    },
  },
);

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
