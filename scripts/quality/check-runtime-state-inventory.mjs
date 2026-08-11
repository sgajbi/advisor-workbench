import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import ts from "typescript";

const INVENTORY_PATH =
  "docs/architecture/workbench-runtime-state-inventory.v1.json";
const SCHEMA_PATH =
  "docs/architecture/workbench-runtime-state-inventory.v1.schema.json";
const NEXT_CONFIG_PATH = "next.config.mjs";
const MUTABLE_COLLECTION_PATTERN =
  /\bnew\s+(?:Map|Set|WeakMap|WeakSet)\b|\bglobalThis\b|\b[A-Za-z_$][A-Za-z0-9_$]*\.__[A-Za-z0-9_$]+/;
const MUTATING_METHODS = new Set([
  "add",
  "append",
  "clear",
  "copyWithin",
  "delete",
  "fill",
  "pop",
  "prepend",
  "push",
  "put",
  "remove",
  "reset",
  "reverse",
  "set",
  "shift",
  "sort",
  "splice",
  "unshift",
  "update",
  "write",
]);
const STATIC_MUTATORS = new Map([
  ["Object", new Set(["assign", "defineProperties", "defineProperty", "setPrototypeOf"])],
  ["Reflect", new Set(["defineProperty", "deleteProperty", "set", "setPrototypeOf"])],
]);
const PROHIBITED_SOURCE_FEATURES = [
  { name: "Server Action directive", pattern: /["']use server["']/ },
  { name: "Cache Component directive", pattern: /["']use cache(?::\s*remote)?["']/ },
  { name: "unstable_cache", pattern: /\bunstable_cache\s*\(/ },
  { name: "revalidatePath", pattern: /\brevalidatePath\s*\(/ },
  { name: "revalidateTag", pattern: /\brevalidateTag\s*\(/ },
  { name: "updateTag", pattern: /\bupdateTag\s*\(/ },
  { name: "cacheTag", pattern: /\bcacheTag\s*\(/ },
  { name: "cacheLife", pattern: /\bcacheLife\s*\(/ },
  { name: "force-cache fetch", pattern: /cache\s*:\s*["']force-cache["']/ },
  {
    name: "Next fetch revalidation",
    pattern: /next\s*:\s*\{[^}]*\b(?:revalidate|tags)\s*:/s,
  },
];
const PROHIBITED_NEXT_CONFIG_FEATURES = [
  { name: "cacheComponents", pattern: /\bcacheComponents\s*:/ },
  { name: "cacheHandler", pattern: /\bcacheHandlers?\s*:/ },
  { name: "serverActions", pattern: /\bserverActions\s*:/ },
  { name: "partial prerendering", pattern: /\bppr\s*:/ },
];

export function scanRuntimeStateHolders({ root = ".", sourceRoot = "src" } = {}) {
  const absoluteSourceRoot = join(root, sourceRoot);
  return collectSourceFiles(absoluteSourceRoot)
    .flatMap((file) => scanSourceFile(file, root))
    .sort(compareStateHolder);
}

export function validateRuntimeStateInventory({
  inventory,
  schema,
  sourceFiles,
  nextConfig,
  discoveredStateHolders,
  today = new Date().toISOString().slice(0, 10),
}) {
  const failures = [];
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  const validateSchema = ajv.compile(schema);
  if (!validateSchema(inventory)) {
    failures.push(
      ...validateSchema.errors.map(
        (error) => `runtime state schema ${error.instancePath || "/"} ${error.message}`,
      ),
    );
    return failures;
  }

  if (inventory.nextReviewBy < today) {
    failures.push(
      `runtime state inventory review expired on ${inventory.nextReviewBy}; current date is ${today}`,
    );
  }

  const ids = inventory.stateHolders.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    failures.push("runtime state holder ids must be unique");
  }

  const declared = inventory.stateHolders
    .flatMap(({ file, symbols }) => symbols.map((symbol) => ({ file, symbol })))
    .sort(compareStateHolder);
  const discovered = [...discoveredStateHolders].sort(compareStateHolder);
  for (const stateHolder of discovered) {
    if (!declared.some((entry) => sameStateHolder(entry, stateHolder))) {
      failures.push(
        `unreviewed module-scope runtime state ${stateHolder.file}:${stateHolder.symbol}`,
      );
    }
  }
  for (const stateHolder of declared) {
    if (!discovered.some((entry) => sameStateHolder(entry, stateHolder))) {
      failures.push(
        `stale runtime state declaration ${stateHolder.file}:${stateHolder.symbol}`,
      );
    }
  }

  for (const stateHolder of inventory.stateHolders) {
    if (stateHolder.temporaryException?.expiresOn < today) {
      failures.push(
        `runtime state exception ${stateHolder.id} expired on ${stateHolder.temporaryException.expiresOn}`,
      );
    }
    if (
      stateHolder.classification === "instance_telemetry" &&
      !stateHolder.temporaryException &&
      /unbounded|temporary exception/i.test(stateHolder.bounds)
    ) {
      failures.push(
        `instance telemetry ${stateHolder.id} must be bounded or carry an active exception`,
      );
    }
    if (stateHolder.classification === "browser_guarded_cache") {
      const source = sourceFiles[stateHolder.file] ?? "";
      if (!/target\s*===\s*["']client["']\s*&&/.test(source)) {
        failures.push(
          `browser-guarded cache ${stateHolder.id} must fail closed outside the client target`,
        );
      }
    }
    if (stateHolder.classification === "browser_inflight") {
      const source = sourceFiles[stateHolder.file] ?? "";
      if (!/^\s*["']use client["'];/m.test(source)) {
        failures.push(`browser in-flight state ${stateHolder.id} must live in a client module`);
      }
      for (const symbol of stateHolder.symbols) {
        if (!new RegExp(`${escapeRegExp(symbol)}\\.delete\\s*\\(`).test(source)) {
          failures.push(`browser in-flight state ${stateHolder.id}:${symbol} must delete settled entries`);
        }
      }
    }
  }

  for (const [file, source] of Object.entries(sourceFiles)) {
    for (const feature of PROHIBITED_SOURCE_FEATURES) {
      if (feature.pattern.test(source)) {
        failures.push(`unreviewed ${feature.name} in ${file}`);
      }
    }
  }
  for (const feature of PROHIBITED_NEXT_CONFIG_FEATURES) {
    if (feature.pattern.test(nextConfig)) {
      failures.push(`unreviewed Next configuration feature ${feature.name}`);
    }
  }
  if (
    !/^\s*deploymentId,\s*$/m.test(nextConfig) ||
    !/WORKBENCH_DEPLOYMENT_ID/.test(nextConfig) ||
    !/WORKBENCH_BUILD_DEPLOYMENT_ID\s*:\s*deploymentId/.test(nextConfig)
  ) {
    failures.push(
      "Next configuration must bind deploymentId and embedded build identity to WORKBENCH_DEPLOYMENT_ID for rolling-version protection",
    );
  }

  return failures;
}

export function collectRuntimeStateInventoryFailures(root = ".") {
  const sourceFiles = Object.fromEntries(
    collectSourceFiles(join(root, "src")).map((file) => [
      normalizePath(relative(root, file)),
      readFileSync(file, "utf8"),
    ]),
  );
  return validateRuntimeStateInventory({
    inventory: readJson(join(root, INVENTORY_PATH)),
    schema: readJson(join(root, SCHEMA_PATH)),
    sourceFiles,
    nextConfig: readFileSync(join(root, NEXT_CONFIG_PATH), "utf8"),
    discoveredStateHolders: scanRuntimeStateHolders({ root }),
  });
}

function scanSourceFile(file, root) {
  const source = readFileSync(file, "utf8");
  return scanRuntimeStateSource({
    source,
    file: normalizePath(relative(root, file)),
    scriptKind: file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  });
}

export function scanRuntimeStateSource({
  source,
  file = "src/runtime-state-source.ts",
  scriptKind = ts.ScriptKind.TS,
}) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const moduleBindings = new Set();
  const importedBindings = new Set();
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const identifier of bindingIdentifiers(declaration.name)) {
          moduleBindings.add(identifier.text);
        }
      }
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      moduleBindings.add(statement.name.text);
    } else if (ts.isImportDeclaration(statement)) {
      for (const identifier of importBindingIdentifiers(statement)) {
        moduleBindings.add(identifier.text);
        importedBindings.add(identifier.text);
      }
    }
  }
  const mutatedBindings = collectMutatedBindings(sourceFile, moduleBindings);
  const stateHolders = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    for (const declaration of statement.declarationList.declarations) {
      const initializer = declaration.initializer?.getText(sourceFile) ?? "";
      for (const identifier of bindingIdentifiers(declaration.name)) {
        if (
          !isConst ||
          MUTABLE_COLLECTION_PATTERN.test(initializer) ||
          (declaration.initializer &&
            ts.isClassExpression(declaration.initializer) &&
            hasMutableStaticState(declaration.initializer)) ||
          mutatedBindings.has(identifier.text)
        ) {
          stateHolders.push({
            file: normalizePath(file),
            symbol: identifier.text,
          });
        }
      }
    }
  }
  for (const statement of sourceFile.statements) {
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name &&
      (mutatedBindings.has(statement.name.text) ||
        (ts.isClassDeclaration(statement) && hasMutableStaticState(statement)))
    ) {
      stateHolders.push({
        file: normalizePath(file),
        symbol: statement.name.text,
      });
    }
  }
  for (const symbol of importedBindings) {
    if (mutatedBindings.has(symbol)) {
      stateHolders.push({ file: normalizePath(file), symbol });
    }
  }
  return stateHolders;
}

function hasMutableStaticState(declaration) {
  return declaration.members.some((member) => {
    if (!ts.isPropertyDeclaration(member) || !hasModifier(member, ts.SyntaxKind.StaticKeyword)) {
      return false;
    }
    const initializer = member.initializer?.getText() ?? "";
    return (
      !hasModifier(member, ts.SyntaxKind.ReadonlyKeyword) ||
      MUTABLE_COLLECTION_PATTERN.test(initializer)
    );
  });
}

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function collectMutatedBindings(sourceFile, moduleBindings) {
  const mutated = new Set();
  const bindingGraph = collectBindingGraph(sourceFile);
  const recordRoot = (expression) => {
    const root = rootIdentifier(expression);
    const moduleBindingsForRoot = root
      ? resolveModuleBindings(root, bindingGraph, sourceFile, moduleBindings)
      : new Set();
    for (const moduleBinding of moduleBindingsForRoot) {
      mutated.add(moduleBinding);
    }
  };
  const visit = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      if (ts.isIdentifier(node.left)) {
        const binding = resolveBinding(node.left, bindingGraph.bindingsByScope);
        if (
          binding?.scope === sourceFile &&
          moduleBindings.has(binding.name)
        ) {
          mutated.add(binding.name);
        }
      } else {
        recordRoot(node.left);
      }
    } else if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      if (ts.isIdentifier(node.operand)) {
        const binding = resolveBinding(node.operand, bindingGraph.bindingsByScope);
        if (
          binding?.scope === sourceFile &&
          moduleBindings.has(binding.name)
        ) {
          mutated.add(binding.name);
        }
      } else {
        recordRoot(node.operand);
      }
    } else if (ts.isDeleteExpression(node)) {
      recordRoot(node.expression);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        MUTATING_METHODS.has(callee.name.text)
      ) {
        recordRoot(callee.expression);
      }
      if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        STATIC_MUTATORS.get(callee.expression.text)?.has(callee.name.text) &&
        node.arguments[0]
      ) {
        recordRoot(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return mutated;
}

function rootIdentifier(expression) {
  let current = expression;
  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current : undefined;
}

function bindingIdentifiers(name) {
  if (ts.isIdentifier(name)) {
    return [name];
  }
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name),
  );
}

function importBindingIdentifiers(declaration) {
  const importClause = declaration.importClause;
  if (!importClause || importClause.isTypeOnly) {
    return [];
  }
  const identifiers = importClause.name ? [importClause.name] : [];
  const namedBindings = importClause.namedBindings;
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    identifiers.push(namedBindings.name);
  } else if (namedBindings && ts.isNamedImports(namedBindings)) {
    identifiers.push(
      ...namedBindings.elements
        .filter((element) => !element.isTypeOnly)
        .map((element) => element.name),
    );
  }
  return identifiers;
}

function aliasTargets(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  if (ts.isConditionalExpression(current)) {
    return [
      ...aliasTargets(current.whenTrue),
      ...aliasTargets(current.whenFalse),
    ];
  }
  if (
    ts.isBinaryExpression(current) &&
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(current.operatorToken.kind)
  ) {
    return [...aliasTargets(current.left), ...aliasTargets(current.right)];
  }
  const target = rootIdentifier(current);
  return target ? [target] : [];
}

function collectBindingGraph(sourceFile) {
  const bindingsByScope = new Map();
  const aliasesByScope = new Map();
  const addBinding = (scope, name) => {
    const bindings = bindingsByScope.get(scope) ?? new Set();
    bindings.add(name);
    bindingsByScope.set(scope, bindings);
  };
  const addAliasEvent = (scope, name, position, targets, conditional = false) => {
    const aliases = aliasesByScope.get(scope) ?? new Map();
    const events = aliases.get(name) ?? [];
    events.push({ conditional, position, targets });
    aliases.set(name, events);
    aliasesByScope.set(scope, aliases);
  };
  const addBindingName = (scope, name) => {
    if (ts.isIdentifier(name)) {
      addBinding(scope, name.text);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) {
        addBindingName(scope, element.name);
      }
    }
  };
  const visit = (node) => {
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      addBindingName(node, node.variableDeclaration.name);
    } else if (
      ts.isVariableDeclaration(node) &&
      !ts.isCatchClause(node.parent)
    ) {
      const declarationList = node.parent;
      const isBlockScoped =
        (declarationList.flags & ts.NodeFlags.BlockScoped) !== 0;
      const scope = findBindingScope(node, isBlockScoped);
      addBindingName(scope, node.name);
      const targets = node.initializer ? aliasTargets(node.initializer) : [];
      if (ts.isIdentifier(node.name)) {
        addAliasEvent(scope, node.name.text, node.end, targets);
      }
    } else if (ts.isImportDeclaration(node)) {
      for (const identifier of importBindingIdentifiers(node)) {
        addBinding(sourceFile, identifier.text);
      }
    } else if (ts.isParameter(node) && isFunctionScope(node.parent)) {
      addBindingName(node.parent, node.name);
    } else if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name
    ) {
      addBinding(findBindingScope(node, true), node.name.text);
    } else if (
      (ts.isFunctionExpression(node) || ts.isClassExpression(node)) &&
      node.name
    ) {
      addBinding(node, node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const collectAssignments = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      ts.isIdentifier(node.left) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      const binding = resolveBinding(node.left, bindingsByScope);
      if (binding) {
        const targets =
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken
            ? aliasTargets(node.right)
            : [];
        addAliasEvent(
          binding.scope,
          binding.name,
          node.end,
          targets,
          isConditionallyExecuted(node, binding.scope),
        );
      }
    }
    ts.forEachChild(node, collectAssignments);
  };
  collectAssignments(sourceFile);
  return { bindingsByScope, aliasesByScope };
}

function isConditionallyExecuted(node, bindingScope) {
  let current = node.parent;
  while (current && current !== bindingScope) {
    if (
      ts.isIfStatement(current) ||
      ts.isConditionalExpression(current) ||
      ts.isSwitchStatement(current) ||
      ts.isCaseClause(current) ||
      ts.isDefaultClause(current) ||
      ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current) ||
      ts.isTryStatement(current) ||
      ts.isCatchClause(current) ||
      (isFunctionScope(current) && current !== bindingScope) ||
      (ts.isBinaryExpression(current) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(current.operatorToken.kind))
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function findBindingScope(node, blockScoped) {
  let current = node.parent;
  while (current) {
    if (isFunctionScope(current) || ts.isSourceFile(current)) {
      return current;
    }
    if (blockScoped && isLexicalScope(current)) {
      return current;
    }
    current = current.parent;
  }
  throw new Error("Runtime-state binding has no lexical scope.");
}

function resolveModuleBindings(
  identifier,
  bindingGraph,
  sourceFile,
  moduleBindings,
  visited = new Map(),
) {
  const binding = resolveBinding(identifier, bindingGraph.bindingsByScope);
  if (!binding) {
    return new Set();
  }
  if (binding.scope === sourceFile) {
    return moduleBindings.has(binding.name)
      ? new Set([binding.name])
      : new Set();
  }
  const visitedNames = visited.get(binding.scope) ?? new Set();
  if (visitedNames.has(binding.name)) {
    return new Set();
  }
  visitedNames.add(binding.name);
  visited.set(binding.scope, visitedNames);
  const aliasEvents = bindingGraph.aliasesByScope
    .get(binding.scope)
    ?.get(binding.name);
  const candidates = new Set();
  const priorEvents = (aliasEvents ?? [])
    .filter((event) => event.position < identifier.pos)
    .sort((left, right) => right.position - left.position);
  for (const event of priorEvents) {
    for (const target of event.targets) {
      const branchVisited = new Map(
        [...visited].map(([scope, names]) => [scope, new Set(names)]),
      );
      for (const moduleBinding of resolveModuleBindings(
        target,
        bindingGraph,
        sourceFile,
        moduleBindings,
        branchVisited,
      )) {
        candidates.add(moduleBinding);
      }
    }
    if (!event.conditional) {
      break;
    }
  }
  return candidates;
}

function resolveBinding(identifier, bindingsByScope) {
  let current = identifier.parent;
  while (current) {
    if (
      (isFunctionScope(current) || isLexicalScope(current)) &&
      bindingsByScope.get(current)?.has(identifier.text)
    ) {
      return { name: identifier.text, scope: current };
    }
    current = current.parent;
  }
  return undefined;
}

function isFunctionScope(node) {
  return ts.isFunctionLike(node);
}

function isLexicalScope(node) {
  return (
    ts.isSourceFile(node) ||
    ts.isBlock(node) ||
    ts.isModuleBlock(node) ||
    ts.isCaseBlock(node) ||
    ts.isCatchClause(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node)
  );
}

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function compareStateHolder(left, right) {
  return `${left.file}:${left.symbol}`.localeCompare(`${right.file}:${right.symbol}`);
}

function sameStateHolder(left, right) {
  return left.file === right.file && left.symbol === right.symbol;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = collectRuntimeStateInventoryFailures(process.cwd());
  if (failures.length > 0) {
    console.error("Workbench runtime state governance failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Workbench runtime state governance passed.");
  }
}
