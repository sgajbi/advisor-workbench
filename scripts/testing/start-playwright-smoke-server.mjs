import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

import { NEXT_PRODUCTION_DIRECTORY } from "../config/next-artifact-layout.mjs";
import { cleanNextBuildArtifacts } from "../quality/clean-next-build-artifacts.mjs";
import { startPlaywrightSourceFixtureGateway } from "./playwright-source-fixture-gateway.mjs";

const projectRoot = process.cwd();
const nextCli = resolve(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const validatedBuildMarker = resolve(projectRoot, NEXT_PRODUCTION_DIRECTORY, "BUILD_ID");
const standaloneRoot = resolve(projectRoot, NEXT_PRODUCTION_DIRECTORY, "standalone");
const standaloneServerPath = resolve(standaloneRoot, "server.js");
const generatedStaticAssets = resolve(projectRoot, NEXT_PRODUCTION_DIRECTORY, "static");
const standaloneStaticAssets = resolve(
  standaloneRoot,
  NEXT_PRODUCTION_DIRECTORY,
  "static",
);
const reuseValidatedBuild =
  process.env.PLAYWRIGHT_REUSE_VALIDATED_BUILD === "1";
const playwrightPortValue = process.env.PLAYWRIGHT_PORT?.trim() || "3000";

if (!/^\d+$/.test(playwrightPortValue)) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
}

const playwrightPort = Number.parseInt(playwrightPortValue, 10);
if (playwrightPort < 1 || playwrightPort > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
}

const sourceFixturePortValue =
  process.env.PLAYWRIGHT_E2E_FIXTURE_PORT?.trim() || "18160";
const sourceFixturePort = parseUnprivilegedPort(
  "PLAYWRIGHT_E2E_FIXTURE_PORT",
  sourceFixturePortValue,
);
if (sourceFixturePort === playwrightPort) {
  throw new Error(
    "PLAYWRIGHT_E2E_FIXTURE_PORT must differ from PLAYWRIGHT_PORT.",
  );
}

function runNext(args, environment) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [nextCli, ...args], {
      cwd: projectRoot,
      stdio: "inherit",
      env: environment,
      shell: false,
    });

    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(
          `next ${args.join(" ")} exited with ${
            signal ? `signal ${signal}` : `code ${code ?? "unknown"}`
          }`,
        ),
      );
    });
  });
}

function startServer(environment) {
  if (!existsSync(standaloneServerPath)) {
    throw new Error(
      `Playwright smoke requires ${NEXT_PRODUCTION_DIRECTORY}/standalone/server.js from a successful production build.`,
    );
  }
  if (!existsSync(generatedStaticAssets)) {
    throw new Error(
      `Playwright smoke requires generated ${NEXT_PRODUCTION_DIRECTORY}/static assets from a successful production build.`,
    );
  }

  cpSync(generatedStaticAssets, standaloneStaticAssets, {
    recursive: true,
    force: true,
  });

  const child = spawn(process.execPath, [standaloneServerPath], {
    cwd: standaloneRoot,
    stdio: "inherit",
    env: {
      ...environment,
      HOSTNAME: "127.0.0.1",
      PORT: String(playwrightPort),
    },
    shell: false,
  });

  const stop = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  return new Promise((resolveServer, rejectServer) => {
    child.once("error", rejectServer);
    child.once("exit", (code, signal) => {
      if (code === 0 || signal === "SIGINT" || signal === "SIGTERM") {
        resolveServer();
        return;
      }
      rejectServer(
        new Error(
          `standalone Workbench server exited with ${
            signal ? `signal ${signal}` : `code ${code ?? "unknown"}`
          }`,
        ),
      );
    });
  });
}

async function main() {
  const environment = { ...process.env };
  environment.LOTUS_ENVIRONMENT =
    environment.LOTUS_ENVIRONMENT?.trim() || "dev";
  let sourceFixture = null;
  try {
    if (!environment.BFF_BASE_URL?.trim()) {
      sourceFixture = await startPlaywrightSourceFixtureGateway({
        port: sourceFixturePort,
      });
      environment.BFF_BASE_URL = `http://127.0.0.1:${sourceFixture.port}`;
      environment.WORKBENCH_E2E_FIXTURE_GATEWAY = "playwright-smoke";
      environment.PLAYWRIGHT_E2E_FIXTURE = "source-context";
      environment.PLAYWRIGHT_E2E_FIXTURE_PORT = String(sourceFixture.port);
    }

    if (reuseValidatedBuild) {
      if (!existsSync(validatedBuildMarker)) {
        throw new Error(
          `PLAYWRIGHT_REUSE_VALIDATED_BUILD=1 requires an existing ${NEXT_PRODUCTION_DIRECTORY}/BUILD_ID from a successful production build.`,
        );
      }
      console.log(
        "Reusing caller-validated production build for Playwright smoke.",
      );
    } else {
      console.log(
        "Building Workbench for Playwright smoke from clean production artifacts.",
      );
      cleanNextBuildArtifacts();
      await runNext(["build"], environment);
    }

    await startServer(environment);
  } finally {
    await sourceFixture?.close();
  }
}

function parseUnprivilegedPort(name, value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  const port = Number.parseInt(value, 10);
  if (port < 1024 || port > 65_535) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  return port;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
