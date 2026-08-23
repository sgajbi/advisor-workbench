import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const IBM_PLEX_COMMIT = "bf260093582f04622aacc1e9f9ca604d7ccd0c42";
const IBM_PLEX_BASE_URL = `https://raw.githubusercontent.com/IBM/plex/${IBM_PLEX_COMMIT}/packages/plex-sans/fonts/complete/woff2`;
const CANDIDATE_ASSETS = [
  {
    file: "IBMPlexSans-Regular.woff2",
    sha256: "ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a",
  },
  {
    file: "IBMPlexSans-Medium.woff2",
    sha256: "5660f8a658f8bb50dbc005232f885eadffd2bc1c235c4f6fbb63469d1f9cde6d",
  },
  {
    file: "IBMPlexSans-SemiBold.woff2",
    sha256: "f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205",
  },
  {
    file: "LICENSE.txt",
    sha256: "91c25c350d3cac39da2736d74f7ba37ef648f5237a4e330a240615bc8d8c4360",
  },
];

const projectRoot = process.cwd();
const evidenceDirectory = resolve(
  projectRoot,
  process.env.TYPOGRAPHY_COMPARISON_EVIDENCE_DIR ??
    "output/playwright/issue-829-productive-typography/comparison"
);
const candidateDirectory = resolve(evidenceDirectory, "candidate-assets", IBM_PLEX_COMMIT);
const fixturePort = parsePort(
  "TYPOGRAPHY_COMPARISON_FIXTURE_PORT",
  process.env.TYPOGRAPHY_COMPARISON_FIXTURE_PORT ?? "18139"
);
const workbenchPort = parsePort(
  "TYPOGRAPHY_COMPARISON_WORKBENCH_PORT",
  process.env.TYPOGRAPHY_COMPARISON_WORKBENCH_PORT ?? "31039"
);

if (fixturePort === workbenchPort) {
  throw new Error("Typography comparison fixture and Workbench ports must differ.");
}

await mkdir(candidateDirectory, { recursive: true });
for (const asset of CANDIDATE_ASSETS) {
  await ensureVerifiedAsset(asset);
}

const playwrightCli = resolve(projectRoot, "node_modules", "@playwright", "test", "cli.js");
const child = spawn(
  process.execPath,
  [playwrightCli, "test", "tests/e2e/typography-comparison.spec.ts"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`,
      PLAYWRIGHT_PORT: String(workbenchPort),
      PORTFOLIO_E2E_FIXTURE: "cashflow",
      PORTFOLIO_E2E_FIXTURE_PORT: String(fixturePort),
      WORKBENCH_E2E_FIXTURE_GATEWAY: "portfolio",
      TYPOGRAPHY_COMPARISON_ASSET_DIR: candidateDirectory,
      TYPOGRAPHY_COMPARISON_EVIDENCE_DIR: evidenceDirectory,
      TYPOGRAPHY_COMPARISON_SOURCE_COMMIT: IBM_PLEX_COMMIT,
    },
  }
);

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

async function ensureVerifiedAsset({ file, sha256 }) {
  const assetPath = resolve(candidateDirectory, file);
  let bytes = await readFile(assetPath).catch(() => null);

  if (!bytes || digest(bytes) !== sha256) {
    const response = await fetch(`${IBM_PLEX_BASE_URL}/${file === "LICENSE.txt" ? "license.txt" : file}`);
    if (!response.ok) {
      throw new Error(`IBM Plex candidate download failed for ${file}: HTTP ${response.status}.`);
    }
    bytes = Buffer.from(await response.arrayBuffer());
    if (digest(bytes) !== sha256) {
      throw new Error(`IBM Plex candidate checksum mismatch for ${file}.`);
    }
    await writeFile(assetPath, bytes);
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parsePort(name, rawValue) {
  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  const port = Number.parseInt(rawValue, 10);
  if (port < 1024 || port > 65_535) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  return port;
}
