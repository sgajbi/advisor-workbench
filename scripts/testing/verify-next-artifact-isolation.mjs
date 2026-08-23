import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NEXT_DEVELOPMENT_DIRECTORY,
  NEXT_PRODUCTION_DIRECTORY,
} from "../config/next-artifact-layout.mjs";

const projectRoot = process.cwd();
const nextCli = resolve(projectRoot, "node_modules", "next", "dist", "bin", "next");
const cleanerScript = resolve(
  projectRoot,
  "scripts",
  "quality",
  "clean-next-build-artifacts.mjs",
);
const bundleGateScript = resolve(
  projectRoot,
  "scripts",
  "quality",
  "check-portfolio-record-bundles.mjs",
);
const evidencePath = resolve(projectRoot, "output", "next-artifact-isolation.json");
const probeRoute = "/intake";

export function collectNextAssetPaths(html) {
  return [
    ...new Set(
      [...html.matchAll(/(?:src|href)=["'](?<path>\/_next\/static\/[^"']+)["']/g)]
        .map((match) => match.groups?.path)
        .filter(Boolean),
    ),
  ].sort();
}

export async function probeWorkbenchAssets({ origin, fetchImpl = fetch }) {
  const pageResponse = await fetchImpl(`${origin}${probeRoute}`, {
    signal: globalThis.AbortSignal.timeout(10_000),
  });
  if (!pageResponse.ok) {
    throw new Error(`${probeRoute} returned HTTP ${pageResponse.status}.`);
  }

  const html = await pageResponse.text();
  const assetPaths = collectNextAssetPaths(html);
  if (assetPaths.length === 0) {
    throw new Error(`${probeRoute} did not publish any Next.js static asset references.`);
  }

  for (const assetPath of assetPaths) {
    const assetResponse = await fetchImpl(`${origin}${assetPath}`, {
      signal: globalThis.AbortSignal.timeout(10_000),
    });
    if (!assetResponse.ok) {
      throw new Error(`${assetPath} returned HTTP ${assetResponse.status}.`);
    }
  }

  return assetPaths;
}

async function run() {
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  const worktreeChanges = execFileSync("git", ["status", "--porcelain"], {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  if (worktreeChanges) {
    throw new Error(
      "Next.js artifact isolation evidence requires a clean committed worktree.",
    );
  }

  const packageJson = JSON.parse(
    readFileSync(resolve(projectRoot, "package.json"), "utf8"),
  );
  const port = parsePort(process.env.NEXT_ARTIFACT_ISOLATION_PORT?.trim() || "31983");
  const origin = `http://127.0.0.1:${port}`;
  const startedAt = new Date();
  const devLogs = [];
  const environment = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  const devServer = spawn(
    process.execPath,
    [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: projectRoot,
      env: environment,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  captureLogs(devServer.stdout, devLogs, process.stdout);
  captureLogs(devServer.stderr, devLogs, process.stderr);

  let probeCount = 0;
  let assetProbeCount = 0;
  let assetReferenceCount = 0;
  let activeBuildProcess = null;
  try {
    const initialAssets = await waitForReady({ origin, devServer, devLogs });
    probeCount += 1;
    assetProbeCount += initialAssets.length;
    assetReferenceCount = initialAssets.length;
    console.log(
      `Development artifact owner is ready with ${assetReferenceCount} static assets; starting production build.`,
    );

    let buildComplete = false;
    let buildFailure = null;
    const buildPromise = runProductionBuild({
      environment,
      onProcess: (child) => {
        activeBuildProcess = child;
      },
    })
      .then(() => {
        buildComplete = true;
      })
      .catch((error) => {
        buildFailure = error;
        buildComplete = true;
      });

    while (!buildComplete) {
      await delay(1_000);
      const assets = await probeWorkbenchAssets({ origin });
      probeCount += 1;
      assetProbeCount += assets.length;
      assetReferenceCount = Math.max(assetReferenceCount, assets.length);
    }

    await buildPromise;
    if (buildFailure) throw buildFailure;

    const finalAssets = await probeWorkbenchAssets({ origin });
    probeCount += 1;
    assetProbeCount += finalAssets.length;
    assetReferenceCount = Math.max(assetReferenceCount, finalAssets.length);

    const buildId = readFileSync(
      resolve(projectRoot, NEXT_PRODUCTION_DIRECTORY, "BUILD_ID"),
      "utf8",
    ).trim();
    const evidence = {
      schema_version: "1.0.0",
      outcome: "passed",
      source_commit: sourceCommit,
      node_version: process.version,
      next_version: packageJson.dependencies?.next ?? "not-reported",
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      development_directory: NEXT_DEVELOPMENT_DIRECTORY,
      production_directory: NEXT_PRODUCTION_DIRECTORY,
      route: probeRoute,
      page_probe_count: probeCount,
      asset_probe_count: assetProbeCount,
      total_http_probe_count: probeCount + assetProbeCount,
      maximum_assets_per_page: assetReferenceCount,
      production_build_id: buildId,
    };
    mkdirSync(dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(
      `Next.js artifact isolation passed across ${probeCount + assetProbeCount} page-and-asset HTTP probes. Evidence: ${evidencePath}`,
    );
  } finally {
    if (activeBuildProcess) await stopProcess(activeBuildProcess);
    await stopProcess(devServer);
  }
}

async function runProductionBuild({ environment, onProcess }) {
  for (const args of [
    [cleanerScript],
    [nextCli, "build"],
    [bundleGateScript],
  ]) {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env: environment,
      shell: false,
      stdio: "inherit",
    });
    onProcess(child);
    await waitForSuccessfulExit(child, args);
  }
  onProcess(null);
}

function waitForSuccessfulExit(child, args) {
  return new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveExit();
        return;
      }
      rejectExit(
        new Error(
          `${args.join(" ")} exited with ${
            signal ? `signal ${signal}` : `code ${code ?? "unknown"}`
          } while the development server was active.`,
        ),
      );
    });
  });
}

async function waitForReady({ origin, devServer, devLogs }) {
  const deadline = Date.now() + 120_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (devServer.exitCode !== null) {
      throw new Error(
        `Development server exited with code ${devServer.exitCode}.\n${devLogs.join("")}`,
      );
    }
    try {
      return await probeWorkbenchAssets({ origin });
    } catch (error) {
      lastError = error;
      await delay(500);
    }
  }

  throw new Error(
    `Development server did not become ready: ${lastError instanceof Error ? lastError.message : "unknown error"}.`,
  );
}

function captureLogs(stream, buffer, destination) {
  stream?.on("data", (chunk) => {
    const line = chunk.toString();
    buffer.push(line);
    if (buffer.length > 100) buffer.shift();
    if (!line.includes(`GET ${probeRoute} `)) destination.write(chunk);
  });
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    new Promise((resolveStopped) => child.once("exit", () => resolveStopped(true))),
    delay(5_000).then(() => false),
  ]);
  if (!stopped && child.exitCode === null) child.kill("SIGKILL");
}

function parsePort(value) {
  if (!/^\d+$/.test(value)) {
    throw new Error("NEXT_ARTIFACT_ISOLATION_PORT must be an unprivileged TCP port.");
  }
  const port = Number.parseInt(value, 10);
  if (port < 1024 || port > 65_535) {
    throw new Error("NEXT_ARTIFACT_ISOLATION_PORT must be an unprivileged TCP port.");
  }
  return port;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
