import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import valueParser from "postcss-value-parser";

function resolveDefaultRepoRoot() {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

function isMainModule() {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

function fileText(repoRoot, relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

export function lineCount(text) {
  if (text.length === 0) {
    return 0;
  }
  return text.endsWith("\n") ? text.split(/\r?\n/).length - 1 : text.split(/\r?\n/).length;
}

export function normalizedByteCount(text) {
  return Buffer.byteLength(text.replace(/\r\n/g, "\n"), "utf8");
}

function repoRelativePath(repoRoot, absolutePath) {
  return relative(repoRoot, absolutePath).replaceAll("\\", "/");
}

function isExternalImportRef(importRef) {
  return /^[a-z][a-z0-9+.-]*:/i.test(importRef) || importRef.startsWith("//");
}

function parseCssRoot(text, cssPath) {
  try {
    return postcss.parse(text, { from: cssPath });
  } catch (error) {
    const reason = error?.reason ?? error?.message ?? String(error);
    throw new Error(`${cssPath} contains invalid CSS: ${reason}`);
  }
}

function isImportAtRule(node) {
  return node.type === "atrule" && /^import$/i.test(node.name);
}

function describeCssNode(node) {
  if (node.type === "atrule") {
    return `@${node.name}`;
  }

  if (node.type === "rule") {
    return node.selector;
  }

  if (node.type === "decl") {
    return node.prop;
  }

  return node.type;
}

function significantValueNodes(nodes) {
  return nodes.filter((node) => node.type !== "space" && node.type !== "comment");
}

function parseImportRef(params) {
  const [targetNode] = significantValueNodes(valueParser(params).nodes);

  if (!targetNode) {
    return null;
  }

  if (targetNode.type === "string") {
    return targetNode.value;
  }

  if (targetNode.type === "function" && targetNode.value.toLowerCase() === "url") {
    const [urlValueNode] = significantValueNodes(targetNode.nodes);
    if (!urlValueNode) {
      return null;
    }

    if (urlValueNode.type === "string" || urlValueNode.type === "word") {
      return urlValueNode.value;
    }
  }

  return null;
}

function hasImportStatementTerminator(statement) {
  return /;\s*(?:\/\*[\s\S]*?\*\/\s*)*$/.test(statement);
}

function parseLocalImportPath(repoRoot, entrypointPath, importNode) {
  const importRef = parseImportRef(importNode.params);

  if (!importRef || isExternalImportRef(importRef)) {
    return null;
  }

  const importAbsolutePath = importRef.startsWith("/")
    ? resolve(repoRoot, importRef.slice(1))
    : resolve(repoRoot, dirname(entrypointPath), importRef);
  return repoRelativePath(repoRoot, importAbsolutePath);
}

function assertBudgetShape(kind, budget) {
  const { path, maxLines, maxBytes } = budget;

  if (typeof path !== "string" || path.length === 0) {
    throw new Error(`CSS global governance ${kind} budget must include a non-empty path.`);
  }

  for (const [fieldName, fieldValue] of [
    ["maxLines", maxLines],
    ["maxBytes", maxBytes],
  ]) {
    if (!Number.isInteger(fieldValue) || fieldValue < 0) {
      throw new Error(
        `CSS global governance budget for ${path} must include a finite non-negative integer ${fieldName}.`
      );
    }
  }
}

function assertWithinBudget(repoRoot, budget, kind = "module") {
  assertBudgetShape(kind, budget);

  const { path, maxLines, maxBytes, owner } = budget;
  const text = fileText(repoRoot, path);
  const actualLines = lineCount(text);
  const actualBytes = normalizedByteCount(text);
  const budgetOwner = owner ? ` (${owner})` : "";

  if (actualLines > maxLines) {
    throw new Error(
      `${path}${budgetOwner} has ${actualLines} lines; budget is ${maxLines}. ` +
        "Move selectors to an owning module or intentionally lower/raise the governed baseline."
    );
  }

  if (actualLines < maxLines) {
    throw new Error(
      `${path}${budgetOwner} has ${actualLines} lines; baseline still allows ${maxLines}. ` +
        "Lower scripts/quality/css-global-governance-baseline.json in the same migration so the ratchet does not leave selector headroom."
    );
  }

  if (actualBytes > maxBytes) {
    throw new Error(
      `${path}${budgetOwner} has ${actualBytes} bytes; budget is ${maxBytes}. ` +
        "Move selectors to an owning module or intentionally lower/raise the governed baseline."
    );
  }

  if (actualBytes < maxBytes) {
    throw new Error(
      `${path}${budgetOwner} has ${actualBytes} normalized bytes; baseline still allows ${maxBytes}. ` +
        "Lower scripts/quality/css-global-governance-baseline.json in the same migration so the ratchet does not leave selector headroom."
    );
  }
}

function assertNoModuleImports(repoRoot, moduleBudget) {
  const text = fileText(repoRoot, moduleBudget.path);
  const root = parseCssRoot(text, moduleBudget.path);
  let nestedImport = null;
  root.walkAtRules((node) => {
    if (isImportAtRule(node)) {
      nestedImport = node;
    }
  });

  if (nestedImport) {
    throw new Error(
      `${moduleBudget.path} must not contain CSS @import statements. ` +
        "Keep global CSS composition in src/app/globals.css and add each imported layer to scripts/quality/css-global-governance-baseline.json."
    );
  }
}

function assertLocalImportBudgetCoverage(entrypointPath, localImportPaths, moduleBudgets) {
  for (const moduleBudget of moduleBudgets) {
    assertBudgetShape("module", moduleBudget);
  }

  const moduleBudgetPaths = new Set(moduleBudgets.map((moduleBudget) => moduleBudget.path));

  const missingBudgets = localImportPaths.filter((importPath) => !moduleBudgetPaths.has(importPath));
  if (missingBudgets.length > 0) {
    throw new Error(
      `${entrypointPath} imports local global CSS files without module budgets: ${missingBudgets.join(", ")}. ` +
        "Add each imported layer to scripts/quality/css-global-governance-baseline.json."
    );
  }

  const importedPathSet = new Set(localImportPaths);
  const orphanBudgets = [...moduleBudgetPaths].filter((modulePath) => !importedPathSet.has(modulePath));
  if (orphanBudgets.length > 0) {
    throw new Error(
      `CSS module budgets are not imported by ${entrypointPath}: ${orphanBudgets.join(", ")}. ` +
        "Keep the entrypoint import list and module budget list aligned."
    );
  }
}

function assertEntrypoint(repoRoot, baseline) {
  const { path, imports } = baseline.entrypoint;
  const text = fileText(repoRoot, path);
  const root = parseCssRoot(text, path);
  const statements = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  assertWithinBudget(repoRoot, baseline.entrypoint, "entrypoint");

  const entrypointNodes = root.nodes ?? [];
  const invalidNodes = entrypointNodes.filter((node) => node.type !== "comment" && !isImportAtRule(node));
  const importNodes = entrypointNodes.filter(isImportAtRule);
  const unterminatedImportStatements = statements.filter((statement) => !hasImportStatementTerminator(statement));
  const invalidImportNodes = importNodes.filter((node) => !parseImportRef(node.params));

  if (invalidNodes.length > 0 || unterminatedImportStatements.length > 0 || invalidImportNodes.length > 0) {
    const invalidNodeSummary = invalidNodes.map(describeCssNode);
    const invalidImportSummary = [
      ...unterminatedImportStatements,
      ...invalidImportNodes.map((node) => `@import ${node.params}`),
      ...invalidNodeSummary,
    ];
    throw new Error(
      `${path} must remain a composition entrypoint with only valid import statements and optional trailing comments. ` +
        `Found invalid import statements: ${invalidImportSummary.join(", ")}`
    );
  }

  if (JSON.stringify(statements) !== JSON.stringify(imports)) {
    throw new Error(
      `${path} import order drifted. Preserve the governed cascade order or update ` +
        "scripts/quality/css-global-governance-baseline.json with evidence."
    );
  }

  const localImportPaths = importNodes
    .map((importNode) => parseLocalImportPath(repoRoot, path, importNode))
    .filter(Boolean);
  assertLocalImportBudgetCoverage(path, localImportPaths, baseline.modules);
}

export function validateCssGlobalGovernance({
  repoRoot,
  baselinePath,
  baseline,
} = {}) {
  const effectiveRepoRoot = repoRoot ?? resolveDefaultRepoRoot();
  const effectiveBaselinePath =
    baselinePath ?? resolve(effectiveRepoRoot, "scripts/quality/css-global-governance-baseline.json");
  const effectiveBaseline = baseline ?? JSON.parse(readFileSync(effectiveBaselinePath, "utf8"));

  assertEntrypoint(effectiveRepoRoot, effectiveBaseline);

  for (const moduleBudget of effectiveBaseline.modules) {
    assertNoModuleImports(effectiveRepoRoot, moduleBudget);
    assertWithinBudget(effectiveRepoRoot, moduleBudget);
  }
}

if (isMainModule()) {
  validateCssGlobalGovernance();
  console.log("CSS global governance gate passed.");
}
