import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const nextCli = resolve(projectRoot, "node_modules", "next", "dist", "bin", "next");
const validatedBuildMarker = resolve(projectRoot, ".next", "BUILD_ID");
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
  const child = spawn(
    process.execPath,
    [
      nextCli,
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(playwrightPort),
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
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
          `next start exited with ${
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
    console.log("Building Workbench for Playwright smoke (incremental cache retained).");
    await runNext(["build"]);
  }

  await startServer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
