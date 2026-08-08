import { readFileSync, readdirSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RISK_ARCHITECTURE_FORBIDDEN_PATTERNS = Object.freeze([
  {
    pattern: "/analytics/risk/",
    reason: "Workbench must not call lotus-risk analytics routes directly.",
  },
  {
    pattern: "/analytics/workbench/risk-proxy",
    reason: "The old lotus-risk workbench risk-proxy endpoint is removed.",
  },
  {
    pattern: "risk.dev.lotus",
    reason: "Browser/runtime UI code must use the Gateway BFF, not service hostnames.",
  },
]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function defaultRepoRoot() {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

function isMainModule() {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

function collectSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

export function findRiskArchitectureViolations({
  repoRoot = defaultRepoRoot(),
  sourceRoot = resolve(repoRoot, "src"),
  forbiddenPatterns = RISK_ARCHITECTURE_FORBIDDEN_PATTERNS,
} = {}) {
  return collectSourceFiles(sourceRoot).flatMap((filePath) => {
    const contents = readFileSync(filePath, "utf8");
    return forbiddenPatterns
      .filter(({ pattern }) => contents.includes(pattern))
      .map(({ pattern, reason }) => ({
        file: relative(repoRoot, filePath).replaceAll("\\", "/"),
        pattern,
        reason,
      }));
  });
}

export function validateRiskArchitecture(options) {
  const violations = findRiskArchitectureViolations(options);
  if (violations.length === 0) {
    return;
  }

  const detail = violations
    .map(({ file, pattern, reason }) => `- ${file}: ${pattern} (${reason})`)
    .join("\n");
  throw new Error(`Risk architecture boundary violations:\n${detail}`);
}

if (isMainModule()) {
  validateRiskArchitecture();
  console.log("Risk architecture boundary gate passed.");
}
