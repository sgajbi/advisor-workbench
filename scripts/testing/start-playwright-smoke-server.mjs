import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

import { cleanNextBuildArtifacts } from "../quality/clean-next-build-artifacts.mjs";

const projectRoot = process.cwd();
const nextCli = resolve(projectRoot, "node_modules", "next", "dist", "bin", "next");
const validatedBuildMarker = resolve(projectRoot, ".next", "BUILD_ID");
const standaloneRoot = resolve(projectRoot, ".next", "standalone");
const standaloneServerPath = resolve(standaloneRoot, "server.js");
const generatedStaticAssets = resolve(projectRoot, ".next", "static");
const standaloneStaticAssets = resolve(standaloneRoot, ".next", "static");
const reuseValidatedBuild = process.env.PLAYWRIGHT_REUSE_VALIDATED_BUILD === "1";
const playwrightPortValue = process.env.PLAYWRIGHT_PORT?.trim() || "3000";

if (!/^\d+$/.test(playwrightPortValue)) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
}

const playwrightPort = Number.parseInt(playwrightPortValue, 10);
if (playwrightPort < 1 || playwrightPort > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
}

function runNext(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [nextCli, ...args], {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
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

function startServer() {
  if (!existsSync(standaloneServerPath)) {
    throw new Error(
      "Playwright smoke requires .next/standalone/server.js from a successful production build.",
    );
  }
  if (!existsSync(generatedStaticAssets)) {
    throw new Error(
      "Playwright smoke requires generated .next/static assets from a successful production build.",
    );
  }

  cpSync(generatedStaticAssets, standaloneStaticAssets, {
    recursive: true,
    force: true,
  });

  const child = spawn(
    process.execPath,
    [standaloneServerPath],
    {
      cwd: standaloneRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        PORT: String(playwrightPort),
      },
      shell: false,
    },
  );

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
  if (reuseValidatedBuild) {
    if (!existsSync(validatedBuildMarker)) {
      throw new Error(
        "PLAYWRIGHT_REUSE_VALIDATED_BUILD=1 requires an existing .next/BUILD_ID from a successful production build.",
      );
    }
    console.log("Reusing caller-validated production build for Playwright smoke.");
  } else {
    console.log("Building Workbench for Playwright smoke from clean production artifacts.");
    cleanNextBuildArtifacts();
    await runNext(["build"]);
  }

  await startServer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
