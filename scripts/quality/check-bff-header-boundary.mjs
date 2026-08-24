import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const REQUIRED_BFF_HEADER_BOUNDARY_CALL =
  "buildGatewayBffRequestHeaders(request.headers)";

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

function collectBffRouteFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return collectBffRouteFiles(entryPath);
      }
      return entry.name === "route.ts" ? [entryPath] : [];
    });
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function accessedPropertyName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  if (ts.isElementAccessExpression(node)) {
    const argument = node.argumentExpression;
    return argument && ts.isStringLiteralLike(argument) ? argument.text : undefined;
  }
  return undefined;
}

function isRequestAlias(node, requestAliases) {
  const expression = unwrapExpression(node);
  return ts.isIdentifier(expression) && requestAliases.has(expression.text);
}

function isGovernedBoundaryCall(headerAccess) {
  const parent = headerAccess.parent;
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === headerAccess &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === "buildGatewayBffRequestHeaders"
  );
}

function hasRawBrowserHeaderAccess(contents, filePath) {
  const source = ts.createSourceFile(
    filePath,
    contents,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const requestAliases = new Set(["request"]);
  const aliasCandidates = [];

  function collectAliasCandidates(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      aliasCandidates.push({ name: node.name.text, value: node.initializer });
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      aliasCandidates.push({ name: node.left.text, value: node.right });
    }
    ts.forEachChild(node, collectAliasCandidates);
  }
  collectAliasCandidates(source);

  let aliasAdded = true;
  while (aliasAdded) {
    aliasAdded = false;
    for (const candidate of aliasCandidates) {
      if (
        !requestAliases.has(candidate.name) &&
        isRequestAlias(candidate.value, requestAliases)
      ) {
        requestAliases.add(candidate.name);
        aliasAdded = true;
      }
    }
  }

  let rawAccessFound = false;
  function inspect(node) {
    if (rawAccessFound) {
      return;
    }

    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      accessedPropertyName(node) === "headers" &&
      isRequestAlias(node.expression, requestAliases) &&
      !isGovernedBoundaryCall(node)
    ) {
      rawAccessFound = true;
      return;
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      isRequestAlias(node.initializer, requestAliases) &&
      node.name.elements.some((element) =>
        (element.propertyName ?? element.name).getText(source).replaceAll(/["']/g, "") ===
        "headers"
      )
    ) {
      rawAccessFound = true;
      return;
    }

    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return rawAccessFound;
}

export function findBffHeaderBoundaryViolations({
  repoRoot = defaultRepoRoot(),
  routeRoot = resolve(repoRoot, "src", "app", "api", "bff"),
} = {}) {
  const routeFiles = collectBffRouteFiles(routeRoot);
  if (routeFiles.length === 0) {
    return [
      {
        file: relative(repoRoot, routeRoot).replaceAll("\\", "/"),
        control: "no-bff-routes-found",
        reason:
          "The boundary gate must scan at least one BFF route; an empty or relocated route tree is a governance failure.",
      },
    ];
  }

  return routeFiles.flatMap((filePath) => {
    const contents = readFileSync(filePath, "utf8");
    const file = relative(repoRoot, filePath).replaceAll("\\", "/");
    const violations = [];

    if (!contents.includes(REQUIRED_BFF_HEADER_BOUNDARY_CALL)) {
      violations.push({
        file,
        control: "missing-governed-header-builder",
        reason:
          "Every Workbench BFF route must enter Gateway through the governed request-header builder.",
      });
    }

    if (hasRawBrowserHeaderAccess(contents, filePath)) {
      violations.push({
        file,
        control: "raw-browser-header-access",
        reason:
          "BFF routes must not read or copy browser headers outside the governed allowlist boundary.",
      });
    }

    return violations;
  });
}

export function validateBffHeaderBoundary(options) {
  const violations = findBffHeaderBoundaryViolations(options);
  if (violations.length === 0) {
    return;
  }

  const detail = violations
    .map(({ file, control, reason }) => `- ${file}: ${control} (${reason})`)
    .join("\n");
  throw new Error(`BFF request-header boundary violations:\n${detail}`);
}

if (isMainModule()) {
  validateBffHeaderBoundary();
  console.log("BFF request-header boundary gate passed.");
}
