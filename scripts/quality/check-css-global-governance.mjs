import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
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

function normalizeUrlWordImportRef(value) {
  const normalizedValue = value.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (!normalizedValue) {
    return null;
  }

  const quote = normalizedValue[0];
  if (quote === "'" || quote === '"') {
    return normalizedValue.endsWith(quote) ? normalizedValue.slice(1, -1) : null;
  }

  return normalizedValue.includes("'") || normalizedValue.includes('"') ? null : normalizedValue;
}

function hasEmptyConditionalMediaEntry(conditionNodes) {
  let hasConditionTokenSinceComma = false;

  for (const node of conditionNodes) {
    if (node.type === "div" && node.value === ",") {
      if (!hasConditionTokenSinceComma) {
        return true;
      }
      hasConditionTokenSinceComma = false;
      continue;
    }

    hasConditionTokenSinceComma = true;
  }

  return (
    conditionNodes.some((node) => node.type === "div" && node.value === ",") &&
    !hasConditionTokenSinceComma
  );
}

function parseImportRef(params) {
  const [targetNode, ...conditionNodes] = significantValueNodes(valueParser(params).nodes);

  if (!targetNode) {
    return null;
  }

  if (
    conditionNodes.some(
      (node) =>
        node.type === "string" || (node.type === "function" && node.value.toLowerCase() === "url")
    ) ||
    hasEmptyConditionalMediaEntry(conditionNodes)
  ) {
    return null;
  }

  if (targetNode.type === "string") {
    return targetNode.value;
  }

  if (targetNode.type === "function" && targetNode.value.toLowerCase() === "url") {
    const urlValueNodes = significantValueNodes(targetNode.nodes);
    if (urlValueNodes.length !== 1) {
      return null;
    }

    const [urlValueNode] = urlValueNodes;
    if (urlValueNode.type === "string") {
      return urlValueNode.value;
    }

    if (urlValueNode.type === "word") {
      return normalizeUrlWordImportRef(urlValueNode.value);
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

function assertForbiddenSelectorPrefixes(repoRoot, moduleBudgets, prefixes = []) {
  if (
    !Array.isArray(prefixes) ||
    prefixes.some((prefix) => typeof prefix !== "string" || !prefix)
  ) {
    throw new Error(
      "CSS global governance forbiddenSelectorPrefixes must be an array of non-empty strings.",
    );
  }

  const findings = [];
  for (const moduleBudget of moduleBudgets) {
    const text = fileText(repoRoot, moduleBudget.path);
    const root = parseCssRoot(text, moduleBudget.path);
    root.walkRules((rule) => {
      for (const prefix of prefixes) {
        if (rule.selector.includes(`.${prefix}`)) {
          findings.push(`${moduleBudget.path}: ${rule.selector}`);
        }
      }
    });
  }

  if (findings.length > 0) {
    throw new Error(
      "Migrated component selectors must not return to governed global CSS: " +
        findings.join(", "),
    );
  }
}

function assertCssModuleEscapeBudgetShape(baseline) {
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) {
    throw new Error("CSS module escape governance must be an object.");
  }

  const { root, defaultMaxGlobalEscapes, exceptions } = baseline;

  if (root !== "src") {
    throw new Error("CSS module escape governance must scan the complete src root.");
  }

  if (defaultMaxGlobalEscapes !== 0) {
    throw new Error(
      "CSS module escape governance defaultMaxGlobalEscapes must remain zero.",
    );
  }

  if (!Array.isArray(exceptions)) {
    throw new Error("CSS module escape governance exceptions must be an array.");
  }

  const seenPaths = new Set();
  for (const exception of exceptions) {
    if (typeof exception.path !== "string" || !exception.path.endsWith(".module.css")) {
      throw new Error(
        "Each CSS module escape exception must include a .module.css path.",
      );
    }
    if (
      !exception.path.startsWith(`${root}/`) ||
      exception.path.includes("\\") ||
      exception.path.split("/").includes("..")
    ) {
      throw new Error(
        `CSS module escape exception ${exception.path} must be a normalized path below ${root}.`,
      );
    }
    if (!Number.isInteger(exception.maxGlobalEscapes) || exception.maxGlobalEscapes <= 0) {
      throw new Error(
        `CSS module escape exception for ${exception.path} must include a positive integer maxGlobalEscapes; remove zero-count exceptions.`,
      );
    }
    if (seenPaths.has(exception.path)) {
      throw new Error(`CSS module escape baseline includes duplicate path ${exception.path}.`);
    }
    seenPaths.add(exception.path);
  }
}

export function countCssModuleGlobalEscapes(text, cssPath = "CSS module") {
  const root = parseCssRoot(text, cssPath);
  let count = 0;

  root.walkRules((rule) => {
    try {
      selectorParser((selectors) => {
        selectors.walkPseudos((pseudo) => {
          if (pseudo.value.toLowerCase() === ":global" && Array.isArray(pseudo.nodes)) {
            count += 1;
          }
        });
      }).processSync(rule.selector, { lossless: true });
    } catch (error) {
      const reason = error?.message ?? String(error);
      throw new Error(`${cssPath} contains an invalid selector ${rule.selector}: ${reason}`);
    }
  });

  return count;
}

function findCssModulePaths(directoryPath) {
  const modulePaths = [];

  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      modulePaths.push(...findCssModulePaths(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".module.css")) {
      modulePaths.push(entryPath);
    }
  }

  return modulePaths;
}

function assertCssModuleEscapeBudgets(repoRoot, baseline) {
  assertCssModuleEscapeBudgetShape(baseline);

  const rootPath = resolve(repoRoot, baseline.root);
  const modulePaths = findCssModulePaths(rootPath)
    .map((modulePath) => repoRelativePath(repoRoot, modulePath))
    .sort();
  const modulePathSet = new Set(modulePaths);
  const exceptionsByPath = new Map(
    baseline.exceptions.map((exception) => [exception.path, exception.maxGlobalEscapes]),
  );
  const orphanExceptions = [...exceptionsByPath.keys()].filter(
    (exceptionPath) => !modulePathSet.has(exceptionPath),
  );

  if (orphanExceptions.length > 0) {
    throw new Error(
      `CSS module escape baseline references missing modules: ${orphanExceptions.join(", ")}.`,
    );
  }

  const report = modulePaths.map((modulePath) => {
    const actualGlobalEscapes = countCssModuleGlobalEscapes(
      fileText(repoRoot, modulePath),
      modulePath,
    );
    const maxGlobalEscapes =
      exceptionsByPath.get(modulePath) ?? baseline.defaultMaxGlobalEscapes;

    if (actualGlobalEscapes > maxGlobalEscapes) {
      throw new Error(
        `${modulePath} has ${actualGlobalEscapes} :global(...) escapes; budget is ${maxGlobalEscapes}. ` +
          "Scope selectors beside their component or add a reviewed exact baseline exception.",
      );
    }

    if (actualGlobalEscapes < maxGlobalEscapes) {
      throw new Error(
        `${modulePath} has ${actualGlobalEscapes} :global(...) escapes; baseline still allows ${maxGlobalEscapes}. ` +
          "Lower scripts/quality/css-global-governance-baseline.json in the same migration so the ratchet leaves no escape headroom.",
      );
    }

    return { path: modulePath, globalEscapes: actualGlobalEscapes };
  });

  return report;
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

  assertForbiddenSelectorPrefixes(
    effectiveRepoRoot,
    effectiveBaseline.modules,
    effectiveBaseline.forbiddenSelectorPrefixes,
  );

  return {
    cssModuleEscapes: assertCssModuleEscapeBudgets(
      effectiveRepoRoot,
      effectiveBaseline.cssModuleEscapes,
    ),
  };
}

if (isMainModule()) {
  const { cssModuleEscapes } = validateCssGlobalGovernance();
  console.log("CSS module escape budgets (path | :global escapes):");
  for (const moduleReport of cssModuleEscapes) {
    console.log(`${moduleReport.path} | ${moduleReport.globalEscapes}`);
  }
  console.log("CSS global governance gate passed.");
}
