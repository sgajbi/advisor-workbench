import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const baselinePath = resolve(repoRoot, "scripts/quality/css-global-governance-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

function fileText(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function lineCount(text) {
  if (text.length === 0) {
    return 0;
  }
  return text.endsWith("\n") ? text.split(/\r?\n/).length - 1 : text.split(/\r?\n/).length;
}

function byteCount(relativePath) {
  return statSync(resolve(repoRoot, relativePath)).size;
}

function assertWithinBudget({ path, maxLines, maxBytes, owner }) {
  const text = fileText(path);
  const actualLines = lineCount(text);
  const actualBytes = byteCount(path);
  const budgetOwner = owner ? ` (${owner})` : "";

  if (actualLines > maxLines) {
    throw new Error(
      `${path}${budgetOwner} has ${actualLines} lines; budget is ${maxLines}. ` +
        "Move selectors to an owning module or intentionally lower/raise the governed baseline."
    );
  }

  if (actualBytes > maxBytes) {
    throw new Error(
      `${path}${budgetOwner} has ${actualBytes} bytes; budget is ${maxBytes}. ` +
        "Move selectors to an owning module or intentionally lower/raise the governed baseline."
    );
  }
}

function assertEntrypoint() {
  const { path, imports } = baseline.entrypoint;
  const text = fileText(path);
  const statements = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  assertWithinBudget(baseline.entrypoint);

  const nonImports = statements.filter((line) => !line.startsWith("@import "));
  if (nonImports.length > 0) {
    throw new Error(
      `${path} must remain a composition entrypoint. Found non-import statements: ${nonImports.join(", ")}`
    );
  }

  if (JSON.stringify(statements) !== JSON.stringify(imports)) {
    throw new Error(
      `${path} import order drifted. Preserve the governed cascade order or update ` +
        "scripts/quality/css-global-governance-baseline.json with evidence."
    );
  }
}

assertEntrypoint();

for (const moduleBudget of baseline.modules) {
  assertWithinBudget(moduleBudget);
}

console.log("CSS global governance gate passed.");
