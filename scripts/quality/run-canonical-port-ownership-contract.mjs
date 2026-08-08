import { spawnSync } from "node:child_process";
import { join } from "node:path";

const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";
const contractPath = join(
  process.cwd(),
  "scripts",
  "quality",
  "Test-CanonicalPortOwnership.ps1",
);
const result = spawnSync(
  powershell,
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contractPath],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(
    `Unable to execute canonical port-ownership contracts with ${powershell}: ${result.error.message}`,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
