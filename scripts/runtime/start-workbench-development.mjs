import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveDevelopmentEnvironment(environment = process.env) {
  const configuredEnvironment = environment.LOTUS_ENVIRONMENT?.trim();
  return {
    ...environment,
    LOTUS_ENVIRONMENT: configuredEnvironment || "dev",
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const nextCli = fileURLToPath(
    new URL("../../node_modules/next/dist/bin/next", import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [nextCli, "dev", ...process.argv.slice(2)],
    {
      env: resolveDevelopmentEnvironment(),
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
}
