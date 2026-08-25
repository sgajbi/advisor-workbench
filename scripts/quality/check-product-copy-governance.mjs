import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const USER_FACING_PROPERTY_NAMES = new Set([
  "actionLabel",
  "ariaLabel",
  "body",
  "description",
  "detail",
  "emptyBody",
  "emptyTitle",
  "headerName",
  "heading",
  "hint",
  "label",
  "message",
  "nextAction",
  "pageSubtitle",
  "pageTitle",
  "purpose",
  "screenDescription",
  "subtitle",
  "summary",
  "title",
]);

const PRODUCT_COPY_RULES = Object.freeze([
  rule("transport-gateway", /\bgateway\b/i, "name the business information or action"),
  rule("transport-bff", /\bbff\b/i, "name the business information or action"),
  rule("service-lotus-ai", /\blotus-ai\b/i, "use AI-assisted and state the human-review boundary"),
  rule("engineering-rfc", /\brfc-\d+\b/i, "name the supported business capability"),
  rule("transport-http-status", /\bhttp status\b/i, "describe availability and recovery"),
  rule("transport-endpoint", /\bendpoint\b/i, "describe the unavailable information"),
  rule("caller-context", /\bcaller context\b/i, "describe access or permission in business language"),
  rule("auditor-posture", /\bposture\b/i, "use status, readiness, availability or condition"),
  rule("engineering-supportability", /\bsupportability\b/i, "state what is available and what action is supported"),
  rule("engineering-inferred", /\binferred\b/i, "state what is confirmed and the recovery action"),
  rule("source-owned", /\bsource[- ]owned\b/i, "name the evidence or record"),
  rule("source-confirmed", /\bsource[- ]confirmed\b/i, "name the confirmed business fact"),
  rule("source-backed", /\bsource[- ]backed\b/i, "name the business information"),
  rule("engineering-governed", /\bgoverned\b/i, "name the applicable business control"),
  rule(
    "raw-enum",
    /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
    "map the source code through a typed business-label registry",
  ),
]);

const PRODUCT_COPY_RULE_IDS = new Set(PRODUCT_COPY_RULES.map(({ id }) => id));
const EXCEPTION_POLICY_RELATIVE_PATH = "config/product-copy-exceptions.v1.json";
const EXCEPTION_POLICY_SCHEMA_VERSION = "product-copy-exceptions.v1";
const EXCEPTION_POLICY_KEYS = ["entries", "governingIssue", "schemaVersion"];
const EXCEPTION_ENTRY_KEYS = [
  "context",
  "exactText",
  "expectedMatches",
  "filePath",
  "id",
  "reason",
  "reviewUrl",
  "ruleId",
];
const WORKBENCH_REVIEW_URL =
  /^https:\/\/github\.com\/sgajbi\/lotus-workbench\/(?:issues|pull)\/\d+(?:#.*)?$/;

function rule(id, pattern, remediation) {
  return Object.freeze({ id, pattern, remediation });
}

export function scanProductCopySource({ filePath, sourceText }) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = [];
  const inspectedNodes = new Set();
  const localConstantScopes = collectLocalConstantScopes(sourceFile);

  function resolveLocalConstantInitializer(identifier) {
    let scope = findContainingLexicalScope(identifier);
    while (scope) {
      const bindings = localConstantScopes.get(scope);
      if (bindings?.has(identifier.text)) {
        return bindings.get(identifier.text);
      }
      scope = findContainingLexicalScope(scope.parent);
    }
    return undefined;
  }

  function inspectLiteral(node, context) {
    if (inspectedNodes.has(node)) {
      return;
    }
    inspectedNodes.add(node);

    const text = literalText(node);
    if (!text?.trim()) {
      return;
    }

    for (const copyRule of PRODUCT_COPY_RULES) {
      if (!copyRule.pattern.test(text)) {
        continue;
      }
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push({
        filePath,
        line: position.line + 1,
        column: position.character + 1,
        context,
        ruleId: copyRule.id,
        text: text.replace(/\s+/g, " ").trim(),
        remediation: copyRule.remediation,
      });
    }
  }

  function inspectExpression(expression, context) {
    const resolvingDeclarations = new Set();
    const visitingResolvedExpressions = new Set();
    const STATIC_PROPERTY_ABSENT = Symbol("static-property-absent");
    const STATIC_PROPERTY_UNKNOWN = Symbol("static-property-unknown");

    function resolveObjectProperty(owner, propertyName, resolvingObjects = new Set()) {
      if (resolvingObjects.has(owner)) {
        return STATIC_PROPERTY_UNKNOWN;
      }
      resolvingObjects.add(owner);
      if (isStaticObjectRestBinding(owner)) {
        if (owner.excludedPropertyNames.includes(propertyName)) {
          resolvingObjects.delete(owner);
          return STATIC_PROPERTY_ABSENT;
        }
        const restOwner = resolveStaticExpression(owner.owner);
        if (!isStaticObjectLike(restOwner)) {
          resolvingObjects.delete(owner);
          return STATIC_PROPERTY_UNKNOWN;
        }
        const restProperty = resolveObjectProperty(
          restOwner,
          propertyName,
          resolvingObjects,
        );
        resolvingObjects.delete(owner);
        return restProperty;
      }
      if (!ts.isObjectLiteralExpression(owner)) {
        resolvingObjects.delete(owner);
        return STATIC_PROPERTY_UNKNOWN;
      }
      for (let index = owner.properties.length - 1; index >= 0; index -= 1) {
        const property = owner.properties[index];
        if (ts.isSpreadAssignment(property)) {
          const spreadOwner = resolveStaticExpression(property.expression);
          if (!isStaticObjectLike(spreadOwner)) {
            resolvingObjects.delete(owner);
            return STATIC_PROPERTY_UNKNOWN;
          }
          const spreadProperty = resolveObjectProperty(
            spreadOwner,
            propertyName,
            resolvingObjects,
          );
          if (spreadProperty === STATIC_PROPERTY_UNKNOWN) {
            resolvingObjects.delete(owner);
            return STATIC_PROPERTY_UNKNOWN;
          }
          if (spreadProperty !== STATIC_PROPERTY_ABSENT) {
            resolvingObjects.delete(owner);
            return spreadProperty;
          }
          continue;
        }
        if (
          ts.isPropertyAssignment(property)
          || ts.isShorthandPropertyAssignment(property)
        ) {
          const staticName = staticObjectPropertyName(property.name);
          if (staticName === null) {
            resolvingObjects.delete(owner);
            return STATIC_PROPERTY_UNKNOWN;
          }
          if (staticName === propertyName) {
            resolvingObjects.delete(owner);
            return ts.isPropertyAssignment(property)
              ? property.initializer
              : property.name;
          }
          continue;
        }
        const staticName = staticObjectPropertyName(property.name);
        if (staticName === null || staticName === propertyName) {
          resolvingObjects.delete(owner);
          return STATIC_PROPERTY_UNKNOWN;
        }
      }
      resolvingObjects.delete(owner);
      return STATIC_PROPERTY_ABSENT;
    }

    function resolveStaticExpression(node) {
      if (isStaticObjectPropertyBinding(node)) {
        return resolveStaticObjectPropertyBinding(node);
      }
      if (isStaticObjectRestBinding(node) || isStaticAlternatives(node)) {
        return node;
      }
      const unwrapped = unwrapCopyExpression(node);
      if (ts.isIdentifier(unwrapped)) {
        const binding = resolveLocalConstantInitializer(unwrapped);
        if (
          binding === undefined
          || binding === null
          || resolvingDeclarations.has(binding)
        ) {
          return undefined;
        }
        resolvingDeclarations.add(binding);
        const resolved = isStaticObjectPropertyBinding(binding)
          ? resolveStaticObjectPropertyBinding(binding)
          : resolveStaticExpression(binding);
        resolvingDeclarations.delete(binding);
        return resolved;
      }
      if (
        ts.isPropertyAccessExpression(unwrapped)
        || ts.isElementAccessExpression(unwrapped)
      ) {
        const propertyName = accessPropertyName(unwrapped);
        const owner = resolveStaticExpression(unwrapped.expression);
        if (!propertyName || !isStaticObjectLike(owner)) {
          return undefined;
        }
        const property = resolveObjectProperty(owner, propertyName);
        if (
          property === STATIC_PROPERTY_ABSENT
          || property === STATIC_PROPERTY_UNKNOWN
        ) {
          return undefined;
        }
        return resolveStaticExpression(property);
      }
      return unwrapped;
    }

    function resolveStaticObjectPropertyBinding(binding) {
      const owner = resolveStaticExpression(binding.owner);
      if (!isStaticObjectLike(owner)) {
        return resolveStaticFallback(binding);
      }
      const property = resolveObjectProperty(owner, binding.propertyName);
      if (
        property === STATIC_PROPERTY_ABSENT
        || property === STATIC_PROPERTY_UNKNOWN
      ) {
        return resolveStaticFallback(binding);
      }
      const resolvedProperty = resolveStaticExpression(property);
      const resolvedFallback = resolveStaticFallback(binding);
      if (
        !resolvedFallback
        || isProvablyDefinedStaticValue(
          resolvedProperty,
          resolveStaticExpression,
        )
      ) {
        return resolvedProperty ?? resolvedFallback;
      }
      return staticAlternatives(
        [resolvedProperty, resolvedFallback].filter(Boolean),
      );
    }

    function resolveStaticFallback(binding) {
      return binding.fallback
        ? resolveStaticExpression(binding.fallback)
        : undefined;
    }

    function isStaticObjectLike(value) {
      return Boolean(
        value
        && (ts.isObjectLiteralExpression(value) || isStaticObjectRestBinding(value)),
      );
    }

    function visitResolvedCopyExpression(node) {
      if (visitingResolvedExpressions.has(node)) {
        return;
      }
      visitingResolvedExpressions.add(node);
      try {
        if (isStaticAlternatives(node)) {
          for (const candidate of node.candidates) {
            visitResolvedCopyExpression(candidate);
          }
          return;
        }
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateExpression(node)
        ) {
          inspectLiteral(node, context);
          return;
        }
        if (
          ts.isIdentifier(node)
          || ts.isPropertyAccessExpression(node)
          || ts.isElementAccessExpression(node)
        ) {
          const resolved = resolveStaticExpression(node);
          if (resolved && resolved !== node) {
            visitResolvedCopyExpression(resolved);
          }
          return;
        }
        if (ts.isConditionalExpression(node)) {
          visitResolvedCopyExpression(node.whenTrue);
          visitResolvedCopyExpression(node.whenFalse);
          return;
        }
        if (
          ts.isBinaryExpression(node) &&
          [
            ts.SyntaxKind.PlusToken,
            ts.SyntaxKind.QuestionQuestionToken,
            ts.SyntaxKind.BarBarToken,
          ].includes(node.operatorToken.kind)
        ) {
          visitResolvedCopyExpression(node.left);
          visitResolvedCopyExpression(node.right);
          return;
        }
        if (
          ts.isParenthesizedExpression(node) ||
          ts.isAsExpression(node) ||
          ts.isSatisfiesExpression(node) ||
          ts.isNonNullExpression(node)
        ) {
          visitResolvedCopyExpression(node.expression);
        }
      } finally {
        visitingResolvedExpressions.delete(node);
      }
    }

    function visitExpression(node) {
      if (
        node !== expression &&
        (ts.isJsxElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxFragment(node))
      ) {
        return;
      }
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateExpression(node)
      ) {
        inspectLiteral(node, context);
        return;
      }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        visitResolvedCopyExpression(node);
        return;
      }
      if (ts.isIdentifier(node) && isValueReferenceIdentifier(node)) {
        visitResolvedCopyExpression(node);
        return;
      }
      ts.forEachChild(node, visitExpression);
    }
    visitExpression(expression);
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      inspectLiteral(node, "JSX text");
    } else if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) {
      if (node.expression) {
        inspectExpression(node.expression, "JSX expression");
      }
    } else if (ts.isJsxAttribute(node)) {
      const propertyName = node.name.getText(sourceFile);
      if (USER_FACING_PROPERTY_NAMES.has(propertyName) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          inspectLiteral(node.initializer, `JSX ${propertyName}`);
        } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          inspectExpression(node.initializer.expression, `JSX ${propertyName}`);
        }
      }
    } else if (ts.isPropertyAssignment(node)) {
      const propertyName = propertyNameText(node.name, sourceFile);
      if (
        propertyName &&
        USER_FACING_PROPERTY_NAMES.has(propertyName) &&
        isProductCopyProperty(node, propertyName, sourceFile)
      ) {
        inspectExpression(node.initializer, `copy property ${propertyName}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function unwrapCopyExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function accessPropertyName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  const argument = node.argumentExpression;
  return argument &&
    (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
    ? argument.text
    : null;
}

function staticObjectPropertyName(name) {
  if (
    ts.isIdentifier(name)
    || ts.isStringLiteral(name)
    || ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  if (
    ts.isComputedPropertyName(name)
    && (ts.isStringLiteral(name.expression)
      || ts.isNoSubstitutionTemplateLiteral(name.expression)
      || ts.isNumericLiteral(name.expression))
  ) {
    return name.expression.text;
  }
  return null;
}

function collectLocalConstantScopes(sourceFile) {
  const scopes = new Map();

  function recordBinding(scope, name, value) {
    const bindings = scopes.get(scope) ?? new Map();
    bindings.set(name, bindings.has(name) ? null : value);
    scopes.set(scope, bindings);
  }

  function recordBarrierBindings(scope, name) {
    for (const identifier of bindingIdentifiers(name)) {
      recordBinding(scope, identifier, null);
    }
  }

  function recordConstBinding(scope, name, initializer) {
    if (ts.isIdentifier(name)) {
      recordBinding(scope, name.text, initializer);
      return;
    }
    if (ts.isObjectBindingPattern(name)) {
      recordObjectBinding(scope, name, initializer);
      return;
    }
    recordBarrierBindings(scope, name);
  }

  function recordObjectBinding(scope, pattern, owner) {
    const excludedPropertyNames = [];
    let hasUnknownExclusion = false;
    for (const element of pattern.elements) {
      if (element.dotDotDotToken) {
        if (ts.isIdentifier(element.name) && !hasUnknownExclusion) {
          recordBinding(
            scope,
            element.name.text,
            staticObjectRestBinding(owner, excludedPropertyNames),
          );
        } else {
          recordBarrierBindings(scope, element.name);
        }
        continue;
      }
      const propertyName = element.propertyName
        ? staticObjectPropertyName(element.propertyName)
        : ts.isIdentifier(element.name)
          ? element.name.text
          : null;
      if (propertyName === null) {
        hasUnknownExclusion = true;
        recordBarrierBindings(scope, element.name);
        continue;
      }
      excludedPropertyNames.push(propertyName);
      const propertyBinding = staticObjectPropertyBinding(
        owner,
        propertyName,
        element.initializer,
      );
      if (ts.isIdentifier(element.name)) {
        recordBinding(scope, element.name.text, propertyBinding);
      } else if (ts.isObjectBindingPattern(element.name)) {
        recordObjectBinding(scope, element.name, propertyBinding);
      } else {
        recordBarrierBindings(scope, element.name);
      }
    }
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node)) {
      const scope = variableBindingScope(node);
      if (scope) {
        const isConst =
          ts.isVariableDeclarationList(node.parent)
          && (node.parent.flags & ts.NodeFlags.Const) !== 0;
        if (isConst && node.initializer) {
          recordConstBinding(scope, node.name, node.initializer);
        } else {
          recordBarrierBindings(scope, node.name);
        }
      }
    }
    if (ts.isParameter(node)) {
      const scope = findContainingFunctionScope(node);
      if (scope) {
        recordBarrierBindings(scope, node.name);
      }
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      recordBarrierBindings(node.block, node.variableDeclaration.name);
    }
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))
      && node.name
    ) {
      const scope = findContainingLexicalScope(node.parent);
      if (scope) {
        recordBinding(scope, node.name.text, null);
      }
    }
    if (
      (ts.isFunctionExpression(node) || ts.isClassExpression(node))
      && node.name
    ) {
      recordBinding(node, node.name.text, null);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return scopes;
}

function staticObjectPropertyBinding(owner, propertyName, fallback = undefined) {
  return { bindingKind: "object-property", owner, propertyName, fallback };
}

function isStaticObjectPropertyBinding(value) {
  return value?.bindingKind === "object-property";
}

function staticObjectRestBinding(owner, excludedPropertyNames) {
  return {
    bindingKind: "object-rest",
    owner,
    excludedPropertyNames: [...excludedPropertyNames],
  };
}

function isStaticObjectRestBinding(value) {
  return value?.bindingKind === "object-rest";
}

function staticAlternatives(candidates) {
  return { bindingKind: "alternatives", candidates };
}

function isStaticAlternatives(value) {
  return value?.bindingKind === "alternatives";
}

function isProvablyDefinedStaticValue(
  value,
  resolveValue,
  proofStack = new Set(),
) {
  if (!value || proofStack.has(value)) {
    return false;
  }
  proofStack.add(value);
  try {
    if (isStaticAlternatives(value)) {
      return value.candidates.every((candidate) =>
        isProvablyDefinedStaticValue(candidate, resolveValue, proofStack),
      );
    }
    const node = unwrapCopyExpression(value);
    if (isResolvableStaticReference(node)) {
      const resolved = resolveValue(node);
      return Boolean(
        resolved
        && resolved !== node
        && isProvablyDefinedStaticValue(resolved, resolveValue, proofStack),
      );
    }
    if (ts.isConditionalExpression(node)) {
      return (
        isProvablyDefinedStaticValue(node.whenTrue, resolveValue, proofStack)
        && isProvablyDefinedStaticValue(
          node.whenFalse,
          resolveValue,
          proofStack,
        )
      );
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        return true;
      }
      if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        return (
          isProvablyNonNullishStaticValue(node.left, resolveValue, proofStack)
          || isProvablyDefinedStaticValue(node.right, resolveValue, proofStack)
        );
      }
      if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        return (
          isProvablyTruthyStaticValue(node.left, resolveValue, proofStack)
          || isProvablyDefinedStaticValue(node.right, resolveValue, proofStack)
        );
      }
    }
    return isProvablyDefinedAtomicValue(node);
  } finally {
    proofStack.delete(value);
  }
}

function isProvablyNonNullishStaticValue(
  value,
  resolveValue,
  proofStack = new Set(),
) {
  if (!value || proofStack.has(value)) {
    return false;
  }
  proofStack.add(value);
  try {
    if (isStaticAlternatives(value)) {
      return value.candidates.every((candidate) =>
        isProvablyNonNullishStaticValue(candidate, resolveValue, proofStack),
      );
    }
    const node = unwrapCopyExpression(value);
    if (isResolvableStaticReference(node)) {
      const resolved = resolveValue(node);
      return Boolean(
        resolved
        && resolved !== node
        && isProvablyNonNullishStaticValue(resolved, resolveValue, proofStack),
      );
    }
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return false;
    }
    if (ts.isConditionalExpression(node)) {
      return (
        isProvablyNonNullishStaticValue(node.whenTrue, resolveValue, proofStack)
        && isProvablyNonNullishStaticValue(
          node.whenFalse,
          resolveValue,
          proofStack,
        )
      );
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        return true;
      }
      if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        return (
          isProvablyNonNullishStaticValue(node.left, resolveValue, proofStack)
          || isProvablyNonNullishStaticValue(
            node.right,
            resolveValue,
            proofStack,
          )
        );
      }
      if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        return (
          isProvablyTruthyStaticValue(node.left, resolveValue, proofStack)
          || isProvablyNonNullishStaticValue(
            node.right,
            resolveValue,
            proofStack,
          )
        );
      }
    }
    return isProvablyDefinedAtomicValue(node);
  } finally {
    proofStack.delete(value);
  }
}

function isProvablyTruthyStaticValue(
  value,
  resolveValue,
  proofStack = new Set(),
) {
  if (!value || proofStack.has(value)) {
    return false;
  }
  proofStack.add(value);
  try {
    if (isStaticAlternatives(value)) {
      return value.candidates.every((candidate) =>
        isProvablyTruthyStaticValue(candidate, resolveValue, proofStack),
      );
    }
    const node = unwrapCopyExpression(value);
    if (isResolvableStaticReference(node)) {
      const resolved = resolveValue(node);
      return Boolean(
        resolved
        && resolved !== node
        && isProvablyTruthyStaticValue(resolved, resolveValue, proofStack),
      );
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text.length > 0;
    }
    if (ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) {
      return Number(node.text.replace(/n$/, "")) !== 0;
    }
    if (ts.isConditionalExpression(node)) {
      return (
        isProvablyTruthyStaticValue(node.whenTrue, resolveValue, proofStack)
        && isProvablyTruthyStaticValue(node.whenFalse, resolveValue, proofStack)
      );
    }
    return (
      ts.isObjectLiteralExpression(node)
      || ts.isArrayLiteralExpression(node)
      || ts.isFunctionExpression(node)
      || ts.isArrowFunction(node)
      || ts.isClassExpression(node)
      || node.kind === ts.SyntaxKind.TrueKeyword
    );
  } finally {
    proofStack.delete(value);
  }
}

function isResolvableStaticReference(node) {
  return (
    ts.isIdentifier(node)
    || ts.isPropertyAccessExpression(node)
    || ts.isElementAccessExpression(node)
  );
}

function isProvablyDefinedAtomicValue(node) {
  return (
    ts.isStringLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node)
    || ts.isTemplateExpression(node)
    || ts.isNumericLiteral(node)
    || ts.isBigIntLiteral(node)
    || ts.isObjectLiteralExpression(node)
    || ts.isArrayLiteralExpression(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isClassExpression(node)
    || node.kind === ts.SyntaxKind.TrueKeyword
    || node.kind === ts.SyntaxKind.FalseKeyword
    || node.kind === ts.SyntaxKind.NullKeyword
  );
}

function bindingIdentifiers(name) {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name),
  );
}

function variableBindingScope(declaration) {
  const declarationList = declaration.parent;
  if (
    ts.isVariableDeclarationList(declarationList)
    && (declarationList.flags & ts.NodeFlags.BlockScoped) === 0
  ) {
    return findContainingFunctionScope(declaration);
  }
  return findContainingLexicalScope(declaration);
}

function findContainingFunctionScope(node) {
  let current = node;
  while (current) {
    if (ts.isSourceFile(current) || ts.isFunctionLike(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function findContainingLexicalScope(node) {
  let current = node;
  while (current) {
    if (
      ts.isSourceFile(current) ||
      ts.isBlock(current) ||
      ts.isCaseBlock(current) ||
      ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isFunctionLike(current) ||
      ts.isClassLike(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isValueReferenceIdentifier(node) {
  const { parent } = node;
  const isNonCopyBinaryOperand =
    ts.isBinaryExpression(parent) &&
    ![
      ts.SyntaxKind.PlusToken,
      ts.SyntaxKind.QuestionQuestionToken,
      ts.SyntaxKind.BarBarToken,
    ].includes(parent.operatorToken.kind);
  return !(
    isNonCopyBinaryOperand ||
    (ts.isConditionalExpression(parent) && parent.condition === node) ||
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isShorthandPropertyAssignment(parent) && parent.name === node) ||
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    (ts.isParameter(parent) && parent.name === node) ||
    (ts.isFunctionDeclaration(parent) && parent.name === node) ||
    (ts.isFunctionExpression(parent) && parent.name === node) ||
    (ts.isTypeReferenceNode(parent) && parent.typeName === node) ||
    ts.isImportSpecifier(parent) ||
    ts.isExportSpecifier(parent)
  );
}

function isProductCopyProperty(node, propertyName, sourceFile) {
  if (propertyName !== "body") {
    return true;
  }
  if (!ts.isObjectLiteralExpression(node.parent)) {
    return false;
  }

  const siblingNames = new Set(
    node.parent.properties.flatMap((property) => {
      if (!ts.isPropertyAssignment(property)) {
        return [];
      }
      const name = propertyNameText(property.name, sourceFile);
      return name ? [name] : [];
    }),
  );
  return [
    "actionLabel",
    "description",
    "detail",
    "kind",
    "label",
    "surface",
    "title",
    "tone",
  ].some((name) => siblingNames.has(name));
}

function collectProductCopyRepositoryFindings(repositoryRoot) {
  const sourceRoot = join(repositoryRoot, "src");
  return collectSourceFiles(sourceRoot).flatMap((absolutePath) =>
    scanProductCopySource({
      filePath: relative(repositoryRoot, absolutePath).replaceAll("\\", "/"),
      sourceText: readFileSync(absolutePath, "utf8"),
    }),
  );
}

export function evaluateProductCopyRepository(repositoryRoot = process.cwd()) {
  const findings = collectProductCopyRepositoryFindings(repositoryRoot);
  const policyPath = join(repositoryRoot, ...EXCEPTION_POLICY_RELATIVE_PATH.split("/"));
  if (!existsSync(policyPath)) {
    return {
      findings,
      suppressedFindings: [],
      policyErrors: [`Missing ${EXCEPTION_POLICY_RELATIVE_PATH}.`],
      exceptionCount: 0,
    };
  }

  let policy;
  try {
    policy = JSON.parse(readFileSync(policyPath, "utf8"));
  } catch (error) {
    return {
      findings,
      suppressedFindings: [],
      policyErrors: [
        `${EXCEPTION_POLICY_RELATIVE_PATH} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
      exceptionCount: 0,
    };
  }
  return applyProductCopyExceptions(findings, policy);
}

export function scanProductCopyRepository(repositoryRoot = process.cwd()) {
  const evaluation = evaluateProductCopyRepository(repositoryRoot);
  if (evaluation.policyErrors.length > 0) {
    throw new Error(
      `Product-copy exception policy is invalid:\n- ${evaluation.policyErrors.join("\n- ")}`,
    );
  }
  return evaluation.findings;
}

export function applyProductCopyExceptions(findings, policy) {
  const policyErrors = validateExceptionPolicy(policy);
  if (policyErrors.length > 0) {
    return {
      findings,
      suppressedFindings: [],
      policyErrors,
      exceptionCount: Array.isArray(policy?.entries) ? policy.entries.length : 0,
    };
  }

  const suppressedIndexes = new Set();
  const suppressedFindings = [];
  for (const entry of policy.entries) {
    const matchingIndexes = findings.flatMap((finding, index) =>
      exceptionMatchesFinding(entry, finding) ? [index] : [],
    );
    if (matchingIndexes.length !== entry.expectedMatches) {
      policyErrors.push(
        `${entry.id} expected ${entry.expectedMatches} exact match(es) but found ${matchingIndexes.length}; remove or narrow stale exceptions instead of broadening them.`,
      );
      continue;
    }
    for (const index of matchingIndexes) {
      suppressedIndexes.add(index);
      suppressedFindings.push({ ...findings[index], exceptionId: entry.id });
    }
  }

  if (policyErrors.length > 0) {
    return {
      findings,
      suppressedFindings: [],
      policyErrors,
      exceptionCount: policy.entries.length,
    };
  }
  return {
    findings: findings.filter((_, index) => !suppressedIndexes.has(index)),
    suppressedFindings,
    policyErrors: [],
    exceptionCount: policy.entries.length,
  };
}

function validateExceptionPolicy(policy) {
  const errors = [];
  if (!isPlainObject(policy)) {
    return ["Exception policy must be a JSON object."];
  }
  pushExactKeysError(errors, policy, EXCEPTION_POLICY_KEYS, "Exception policy");
  if (policy.schemaVersion !== EXCEPTION_POLICY_SCHEMA_VERSION) {
    errors.push(
      `Exception policy schemaVersion must be ${EXCEPTION_POLICY_SCHEMA_VERSION}.`,
    );
  }
  if (!WORKBENCH_REVIEW_URL.test(policy.governingIssue ?? "")) {
    errors.push("Exception policy governingIssue must be a Workbench GitHub issue URL.");
  }
  if (!Array.isArray(policy.entries)) {
    errors.push("Exception policy entries must be an array.");
    return errors;
  }

  const ids = new Set();
  const signatures = new Set();
  for (const [index, entry] of policy.entries.entries()) {
    const location = `Exception policy entries[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${location} must be an object.`);
      continue;
    }
    pushExactKeysError(errors, entry, EXCEPTION_ENTRY_KEYS, location);
    if (!/^copy-exception-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id ?? "")) {
      errors.push(`${location}.id must be a stable copy-exception-* identifier.`);
    } else if (ids.has(entry.id)) {
      errors.push(`${location}.id duplicates ${entry.id}.`);
    } else {
      ids.add(entry.id);
    }
    if (!/^src\/.+\.(?:ts|tsx)$/.test(entry.filePath ?? "")) {
      errors.push(`${location}.filePath must identify one productive src/*.ts or src/*.tsx file.`);
    }
    if (!PRODUCT_COPY_RULE_IDS.has(entry.ruleId)) {
      errors.push(`${location}.ruleId is not a governed product-copy rule.`);
    }
    for (const field of ["context", "exactText", "reason"]) {
      if (typeof entry[field] !== "string" || entry[field].trim().length === 0) {
        errors.push(`${location}.${field} must be non-empty text.`);
      }
    }
    if (typeof entry.reason === "string" && entry.reason.trim().length < 24) {
      errors.push(`${location}.reason must explain the business-language exception.`);
    }
    if (!Number.isInteger(entry.expectedMatches) || entry.expectedMatches < 1) {
      errors.push(`${location}.expectedMatches must be a positive integer.`);
    }
    if (!WORKBENCH_REVIEW_URL.test(entry.reviewUrl ?? "")) {
      errors.push(`${location}.reviewUrl must be a Workbench GitHub issue or PR URL.`);
    }
    const signature = [
      entry.filePath,
      entry.ruleId,
      entry.context,
      entry.exactText,
    ].join("\u0000");
    if (signatures.has(signature)) {
      errors.push(`${location} duplicates an existing exact exception signature.`);
    } else {
      signatures.add(signature);
    }
  }
  return errors;
}

function exceptionMatchesFinding(entry, finding) {
  return (
    entry.filePath === finding.filePath &&
    entry.ruleId === finding.ruleId &&
    entry.context === finding.context &&
    entry.exactText === finding.text
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pushExactKeysError(errors, value, expectedKeys, location) {
  const actualKeys = Object.keys(value).sort();
  if (actualKeys.join("\u0000") !== [...expectedKeys].sort().join("\u0000")) {
    errors.push(`${location} must contain exactly: ${expectedKeys.join(", ")}.`);
  }
}

function propertyNameText(name, sourceFile) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return name.getText(sourceFile);
}

function literalText(node) {
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isJsxText(node)
  ) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  }
  return null;
}

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [absolutePath] : [];
  });
}

function formatFinding(finding) {
  return `${finding.filePath}:${finding.line}:${finding.column} [${finding.ruleId}] ${finding.context}: ${JSON.stringify(finding.text)} — ${finding.remediation}`;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile === currentFile) {
  const evaluation = evaluateProductCopyRepository();
  const { findings, policyErrors, suppressedFindings } = evaluation;
  const reportOnly = process.argv.includes("--report");
  const maximum = readMaximum(process.argv);
  const exceedsMaximum = findings.length > maximum;
  const leavesHeadroom = findings.length < maximum;
  const baselineMatches = findings.length === maximum;
  if (policyErrors.length > 0) {
    console.error("Product-copy exception policy failed:");
    for (const error of policyErrors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  }
  if (suppressedFindings.length > 0 && reportOnly) {
    console.error(
      `Product-copy governance accepted ${suppressedFindings.length} reviewed exact exception(s):`,
    );
    for (const finding of suppressedFindings) {
      console.error(`- [${finding.exceptionId}] ${formatFinding(finding)}`);
    }
  }
  if (findings.length > 0 && (reportOnly || !baselineMatches)) {
    console.error(
      `Product-copy governance found ${findings.length} user-facing violation(s):`,
    );
    for (const finding of findings) {
      console.error(`- ${formatFinding(finding)}`);
    }
  }
  if (!reportOnly && policyErrors.length > 0) {
    // The policy failure already carries the actionable reason.
  } else if (!reportOnly && exceedsMaximum) {
    console.error(
      `Product-copy governance failed: ${findings.length} exceeds the checked-in baseline of ${maximum}. Fix productive copy; do not raise the baseline.`,
    );
    process.exitCode = 1;
  } else if (!reportOnly && leavesHeadroom) {
    console.error(
      `Product-copy governance failed: ${findings.length} is below the checked-in baseline of ${maximum}. Ratchet --max down to ${findings.length} in package.json so the improvement cannot be spent by a later regression.`,
    );
    process.exitCode = 1;
  } else if (!reportOnly) {
    console.log(
      `Product-copy governance passed: measured inventory matches the checked-in baseline at ${findings.length}; ${suppressedFindings.length} reviewed exact exception(s).`,
    );
  }
}

function readMaximum(arguments_) {
  const argument = arguments_.find((value) => value.startsWith("--max="));
  if (!argument) {
    return 0;
  }
  const maximum = Number.parseInt(argument.slice("--max=".length), 10);
  if (!Number.isInteger(maximum) || maximum < 0) {
    throw new Error("--max must be a non-negative integer");
  }
  return maximum;
}
