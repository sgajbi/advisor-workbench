import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function isIdentifierCharacter(character) {
  return /[a-z0-9_-]/i.test(character);
}

function isEscapedCharacter(text, characterIndex) {
  let slashCount = 0;

  for (let index = characterIndex - 1; index >= 0 && text[index] === "\\"; index -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function replaceCssBlockCommentsOutsideStrings(text, replacement = " ") {
  let result = "";
  let activeQuote = null;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = index + 1 < text.length ? text[index + 1] : "";

    if (activeQuote) {
      result += character;
      if (character === activeQuote && !isEscapedCharacter(text, index)) {
        activeQuote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      activeQuote = character;
      result += character;
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      result += replacement;
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        index += 1;
      }
      index += 1;
      continue;
    }

    result += character;
  }

  return result;
}

function containsCssImportAtRule(text) {
  let activeQuote = null;
  let insideBlockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = index + 1 < text.length ? text[index + 1] : "";

    if (insideBlockComment) {
      if (character === "*" && nextCharacter === "/") {
        insideBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (activeQuote) {
      if (character === activeQuote && !isEscapedCharacter(text, index)) {
        activeQuote = null;
      }
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      insideBlockComment = true;
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      activeQuote = character;
      continue;
    }

    if (character !== "@") {
      continue;
    }

    const atRuleName = text.slice(index + 1, index + 7);
    const nextAfterAtRuleName = index + 7 < text.length ? text[index + 7] : "";
    if (/^import$/i.test(atRuleName) && !isIdentifierCharacter(nextAfterAtRuleName)) {
      return true;
    }
  }

  return false;
}

function parseImportTarget(statement) {
  const importStatement = statement.trim();
  const prefixMatch = importStatement.match(/^@import(?:\s+|(?=["']))/i);
  if (!prefixMatch) {
    return null;
  }

  const importBody = importStatement.slice(prefixMatch[0].length);
  let activeQuote = null;
  let insideBlockComment = false;
  let parenthesisDepth = 0;

  for (let index = 0; index < importBody.length; index += 1) {
    const character = importBody[index];
    const nextCharacter = index + 1 < importBody.length ? importBody[index + 1] : "";

    if (insideBlockComment) {
      if (character === "*" && nextCharacter === "/") {
        insideBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (activeQuote) {
      if (character === activeQuote && !isEscapedCharacter(importBody, index)) {
        activeQuote = null;
      }
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      insideBlockComment = true;
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      activeQuote = character;
      continue;
    }

    if (character === "(") {
      parenthesisDepth += 1;
      continue;
    }

    if (character === ")" && parenthesisDepth > 0) {
      parenthesisDepth -= 1;
      continue;
    }

    if (character !== ";" || parenthesisDepth > 0) {
      continue;
    }

    const trailingText = importBody.slice(index + 1).trim();
    if (!/^(?:\/\*[\s\S]*?\*\/\s*)*$/.test(trailingText)) {
      return null;
    }

    const importTarget = importBody.slice(0, index).trim();
    return importTarget.length > 0 ? importTarget : null;
  }

  return null;
}

function parseLocalImportPath(repoRoot, entrypointPath, statement) {
  const importTarget = parseImportTarget(statement);
  if (!importTarget) {
    return null;
  }

  const normalizedImportTarget = replaceCssBlockCommentsOutsideStrings(importTarget);
  const urlMatch = importTarget.match(
    /^url\(\s*(?:"([^"]+)"|'([^']+)'|([^"')\s]+))\s*\)(?:\s+.*)?$/i
  );
  const normalizedUrlMatch = normalizedImportTarget.match(
    /^url\(\s*(?:"([^"]+)"|'([^']+)'|([^"')\s]+))\s*\)(?:\s+.*)?$/i
  );
  const quotedMatch = normalizedImportTarget.match(/^(?:"([^"]+)"|'([^']+)')(?:\s+.*)?$/);
  const importRef = [...(urlMatch?.slice(1) ?? []), ...(quotedMatch?.slice(1) ?? [])].find(Boolean);
  const normalizedImportRef = [
    ...(normalizedUrlMatch?.slice(1) ?? []),
    ...(quotedMatch?.slice(1) ?? []),
  ].find(Boolean);
  const effectiveImportRef = importRef ?? normalizedImportRef;

  if (!effectiveImportRef) {
    return null;
  }

  if (isExternalImportRef(effectiveImportRef)) {
    return null;
  }

  const importAbsolutePath = effectiveImportRef.startsWith("/")
    ? resolve(repoRoot, effectiveImportRef.slice(1))
    : resolve(repoRoot, dirname(entrypointPath), effectiveImportRef);
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
  if (containsCssImportAtRule(fileText(repoRoot, moduleBudget.path))) {
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
  const statements = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  assertWithinBudget(repoRoot, baseline.entrypoint, "entrypoint");

  const invalidImports = statements.filter((line) => !parseImportTarget(line));
  if (invalidImports.length > 0) {
    throw new Error(
      `${path} must remain a composition entrypoint with only valid import statements and optional trailing comments. ` +
        `Found invalid import statements: ${invalidImports.join(", ")}`
    );
  }

  if (JSON.stringify(statements) !== JSON.stringify(imports)) {
    throw new Error(
      `${path} import order drifted. Preserve the governed cascade order or update ` +
        "scripts/quality/css-global-governance-baseline.json with evidence."
    );
  }

  const localImportPaths = statements
    .map((statement) => parseLocalImportPath(repoRoot, path, statement))
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
