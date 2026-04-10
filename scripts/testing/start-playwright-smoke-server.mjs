import { rmSync } from "node:fs";
import { spawn } from "node:child_process";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const projectRoot = process.cwd();

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  rmSync(".next", { recursive: true, force: true });
  await run(npmExecutable, ["run", "build"]);
  await run(npmExecutable, ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3000"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
