import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const USER_FACING_PROPERTY_NAMES = new Set([
  "actionLabel",
  "aria-label",
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
const STATIC_GLOBAL_UNDEFINED_NODES = new WeakSet();
const STATIC_IMPORT_BINDING = Symbol("static-import-binding");
const STATIC_NON_COPY_NUMBER = ts.factory.createNumericLiteral("0");
const STANDARD_MUTATION_APIS = new Set([
  "Object.assign",
  "Object.defineProperties",
  "Object.defineProperty",
  "Object.setPrototypeOf",
  "Reflect.defineProperty",
  "Reflect.deleteProperty",
  "Reflect.set",
  "Reflect.setPrototypeOf",
]);

function rule(id, pattern, remediation) {
  return Object.freeze({ id, pattern, remediation });
}

export function scanProductCopySource(options) {
  return evaluateProductCopySource(options).findings;
}

export function evaluateProductCopySource({
  analysisContext = null,
  filePath,
  sourceFile: providedSourceFile = null,
  sourceText,
}) {
  const sourceFile = providedSourceFile ?? ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = [];
  const unresolvedExpressions = [];
  const findingOrigins = new WeakMap();
  const inspectedRenderedReferences = new Map();
  const localConstantScopesBySourceFile =
    analysisContext?.localConstantScopesBySourceFile
    ?? new Map([[sourceFile, collectLocalConstantScopes(sourceFile)]]);
  const jsxSpreadOwnedObjectLiterals = new Set();
  const jsxNonSpreadReferencedObjectLiterals = new Set();

  function structuralOccurrencePath(node, positionSourceFile) {
    const segments = [];
    let current = node;
    while (current && current !== positionSourceFile) {
      const parent = current.parent;
      if (!parent) {
        break;
      }
      let childIndex = -1;
      let nextIndex = 0;
      parent.forEachChild((child) => {
        if (child === current) {
          childIndex = nextIndex;
        }
        nextIndex += 1;
      });
      segments.push(`${current.kind}:${childIndex}`);
      current = parent;
    }
    return segments.reverse().join("/");
  }

  function enclosingDeclarationIdentity(node, positionSourceFile) {
    const identities = [];
    let current = node.parent;
    while (current && current !== positionSourceFile) {
      if (
        ts.isVariableDeclaration(current)
        || ts.isBindingElement(current)
        || ts.isFunctionDeclaration(current)
        || ts.isFunctionExpression(current)
        || ts.isClassDeclaration(current)
        || ts.isClassExpression(current)
        || ts.isMethodDeclaration(current)
        || ts.isGetAccessorDeclaration(current)
        || ts.isSetAccessorDeclaration(current)
        || ts.isPropertyDeclaration(current)
        || ts.isPropertyAssignment(current)
      ) {
        const name = current.name?.getText(positionSourceFile)
          .replace(/\s+/g, " ")
          .trim();
        if (name) {
          identities.push(`${current.kind}:${name}`);
        }
      }
      current = current.parent;
    }
    return identities.reverse().join("/");
  }

  function recordUnresolvedExpression(node, context) {
    const positionSourceFile = node.getSourceFile();
    const unresolvedFilePath = analysisContext?.filePathBySourceFile.get(positionSourceFile)
      ?? filePath;
    const position = positionSourceFile.getLineAndCharacterOfPosition(
      node.getStart(positionSourceFile),
    );
    unresolvedExpressions.push({
      filePath: unresolvedFilePath,
      line: position.line + 1,
      column: position.character + 1,
      context,
      signature: [
        unresolvedFilePath,
        context,
        structuralOccurrencePath(node, positionSourceFile),
        enclosingDeclarationIdentity(node, positionSourceFile),
        node.getText(positionSourceFile).replace(/\s+/g, " ").trim(),
      ].join("\u0000"),
    });
  }

  function resolveLocalConstantInitializer(identifier) {
    let scope = findContainingLexicalScope(identifier);
    while (scope) {
      const localConstantScopes = localConstantScopesBySourceFile.get(
        scope.getSourceFile(),
      );
      const bindings = localConstantScopes?.get(scope);
      if (bindings?.has(identifier.text)) {
        const binding = bindings.get(identifier.text);
        if (binding === STATIC_IMPORT_BINDING) {
          return resolveRepositoryConstInitializer(identifier, analysisContext) ?? null;
        }
        return binding;
      }
      scope = findContainingLexicalScope(scope.parent);
    }
    return resolveRepositoryConstInitializer(identifier, analysisContext);
  }

  function inspectLiteral(
    node,
    context,
    renderedReferenceNode = node,
    resolvedText = null,
  ) {
    const renderedPositionNode =
      renderedReferenceNode?.referenceKind === "jsx-spread-property"
        ? renderedReferenceNode.positionNode
        : renderedReferenceNode;
    const inspectedReferences = inspectedRenderedReferences.get(node) ?? new Set();
    const isDeclarationReference = renderedReferenceNode === node;
    if (
      isDeclarationReference
      && [...inspectedReferences].some((reference) => reference !== node)
    ) {
      return;
    }
    if (!isDeclarationReference && inspectedReferences.has(node)) {
      for (let index = findings.length - 1; index >= 0; index -= 1) {
        const origin = findingOrigins.get(findings[index]);
        if (origin?.literal === node && origin.reference === node) {
          findings.splice(index, 1);
        }
      }
      inspectedReferences.delete(node);
    }
    if (inspectedReferences.has(renderedReferenceNode)) {
      return;
    }
    inspectedReferences.add(renderedReferenceNode);
    inspectedRenderedReferences.set(node, inspectedReferences);

    const text = resolvedText ?? literalText(node);
    if (!text?.trim()) {
      return;
    }

    for (const copyRule of PRODUCT_COPY_RULES) {
      if (!copyRule.pattern.test(text)) {
        continue;
      }
      const positionSourceFile = renderedPositionNode.getSourceFile();
      const position = positionSourceFile.getLineAndCharacterOfPosition(
        renderedPositionNode.getStart(positionSourceFile),
      );
      const finding = {
        filePath: analysisContext?.filePathBySourceFile.get(positionSourceFile)
          ?? filePath,
        line: position.line + 1,
        column: position.character + 1,
        context,
        ruleId: copyRule.id,
        text: text.replace(/\s+/g, " ").trim(),
        remediation: copyRule.remediation,
      };
      findings.push(finding);
      findingOrigins.set(finding, {
        literal: node,
        reference: renderedReferenceNode,
      });
    }
  }

  function inspectExpression(
    expression,
    context,
    objectPropertyNames = null,
    resolvedObjectLiterals = null,
    renderedReferenceOverride = null,
    trackUnresolved = false,
  ) {
    const resolvingDeclarations = new Set();
    const visitingResolvedExpressions = new Set();
    const STATIC_PROPERTY_ABSENT = Symbol("static-property-absent");
    const STATIC_PROPERTY_UNKNOWN = Symbol("static-property-unknown");
    const renderedReferenceNode = renderedReferenceOverride ?? expression;
    let hasUnresolvedCopyPath = false;
    function resolveObjectProperty(
      owner,
      propertyName,
      resolvingObjects = new Set(),
      includeRepositoryMutations = true,
    ) {
      if (resolvingObjects.has(owner)) {
        return STATIC_PROPERTY_UNKNOWN;
      }
      resolvingObjects.add(owner);
      const mutationRecord = includeRepositoryMutations
        ? analysisContext?.repositoryMutationByInitializer?.get(owner)
        : undefined;
      if (mutationRecord) {
        const propertyState = mutationRecord.propertyWrites.get(propertyName);
        if (
          propertyState
          || mutationRecord.unknownPropertyWrites.length > 0
          || mutationRecord.hasUnknownPropertyWrite
        ) {
          resolvingObjects.delete(owner);
          const initialProperty = resolveObjectProperty(
            owner,
            propertyName,
            new Set(),
            false,
          );
          const candidates = [
            ...(propertyState?.includeInitial === false ? [] : [initialProperty]),
            ...(propertyState?.values ?? []),
            ...mutationRecord.unknownPropertyWrites,
          ].filter(
            (candidate) =>
              candidate !== STATIC_PROPERTY_ABSENT
              && candidate !== STATIC_PROPERTY_UNKNOWN,
          );
          return staticAlternatives(
            candidates,
            initialProperty === STATIC_PROPERTY_ABSENT
              || initialProperty === STATIC_PROPERTY_UNKNOWN
              || propertyState?.mayBeAbsent
              || mutationRecord.hasUnknownPropertyWrite,
          );
        }
      }
      if (isStaticAlternatives(owner)) {
        const candidateProperties = owner.candidates.map((candidate) =>
          isStaticObjectLike(candidate)
            ? resolveObjectProperty(candidate, propertyName, resolvingObjects)
            : STATIC_PROPERTY_UNKNOWN,
        );
        resolvingObjects.delete(owner);
        if (candidateProperties.includes(STATIC_PROPERTY_UNKNOWN)) {
          return STATIC_PROPERTY_UNKNOWN;
        }
        const presentProperties = candidateProperties.filter(
          (property) => property !== STATIC_PROPERTY_ABSENT,
        );
        if (presentProperties.length === 0) {
          return STATIC_PROPERTY_ABSENT;
        }
        return !owner.mayBeAbsent
          && presentProperties.length
            === candidateProperties.length + owner.nonObjectCandidates.length
          ? staticAlternatives(presentProperties)
          : staticOptionalProperty(presentProperties);
      }
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
      if (ts.isArrayLiteralExpression(owner)) {
        const arrayIndex = staticArrayIndex(propertyName);
        if (arrayIndex === null) {
          resolvingObjects.delete(owner);
          return STATIC_PROPERTY_UNKNOWN;
        }
        const element = owner.elements[arrayIndex];
        resolvingObjects.delete(owner);
        if (!element || ts.isOmittedExpression(element)) {
          return STATIC_PROPERTY_ABSENT;
        }
        return ts.isSpreadElement(element)
          ? STATIC_PROPERTY_UNKNOWN
          : element;
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
      if (isStaticOptionalProperty(node)) {
        return staticAlternatives(
          node.candidates
            .map((candidate) => resolveStaticExpression(candidate))
            .filter(Boolean),
          true,
        );
      }
      if (isStaticObjectRestBinding(node) || isStaticAlternatives(node)) {
        return node;
      }
      const unwrapped = unwrapCopyExpression(node);
      if (ts.isConditionalExpression(unwrapped)) {
        if (
          isProvablyTruthyStaticValue(
            unwrapped.condition,
            resolveStaticExpression,
          )
        ) {
          return resolveStaticExpression(unwrapped.whenTrue);
        }
        if (
          isProvablyFalsyStaticValue(
            unwrapped.condition,
            resolveStaticExpression,
          )
        ) {
          return resolveStaticExpression(unwrapped.whenFalse);
        }
        const whenTrue = resolveStaticExpression(unwrapped.whenTrue);
        const whenFalse = resolveStaticExpression(unwrapped.whenFalse);
        const resolvedBranches = [
          whenTrue ?? staticallyKnownNonObjectSpreadValue(unwrapped.whenTrue),
          whenFalse ?? staticallyKnownNonObjectSpreadValue(unwrapped.whenFalse),
        ];
        const candidates = resolvedBranches.filter(isStaticObjectLike);
        const nonObjectCandidates = resolvedBranches.filter(
          (candidate) => candidate && !isStaticObjectLike(candidate),
        );
        return candidates.length + nonObjectCandidates.length > 0
          ? staticAlternatives(
              candidates,
              candidates.length + nonObjectCandidates.length < 2,
              nonObjectCandidates,
            )
          : unwrapped;
      }
      if (
        ts.isBinaryExpression(unwrapped)
        && unwrapped.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        if (
          isProvablyFalsyStaticValue(
            unwrapped.left,
            resolveStaticExpression,
          )
        ) {
          return staticAlternatives(
            [],
            false,
            [resolveStaticExpression(unwrapped.left) ?? unwrapped.left],
          );
        }
        const whenTruthy = resolveStaticExpression(unwrapped.right);
        if (!whenTruthy) {
          return unwrapped;
        }
        if (isProvablyTruthyStaticValue(
          unwrapped.left,
          resolveStaticExpression,
        )) {
          return whenTruthy;
        }
        const resolvedLeft = resolveStaticExpression(unwrapped.left);
        const leftAlternatives = isStaticAlternatives(resolvedLeft)
          ? staticAlternativeValues(resolvedLeft)
          : [];
        const falsyAlternatives = leftAlternatives.filter((candidate) =>
          isProvablyFalsyStaticValue(candidate, resolveStaticExpression),
        );
        const hasBoundedTruthiness = Boolean(
          isStaticAlternatives(resolvedLeft)
          && !resolvedLeft.mayBeAbsent
          && leftAlternatives.length > 0
          && leftAlternatives.every((candidate) =>
            isProvablyTruthyStaticValue(candidate, resolveStaticExpression)
            || isProvablyFalsyStaticValue(candidate, resolveStaticExpression),
          ),
        );
        return staticAlternatives(
          isStaticObjectLike(whenTruthy) ? [whenTruthy] : [],
          !hasBoundedTruthiness,
          [
            ...(isStaticObjectLike(whenTruthy) ? [] : [whenTruthy]),
            ...falsyAlternatives,
          ],
        );
      }
      if (
        ts.isBinaryExpression(unwrapped)
        && [
          ts.SyntaxKind.QuestionQuestionToken,
          ts.SyntaxKind.BarBarToken,
        ].includes(unwrapped.operatorToken.kind)
      ) {
        const primary = resolveStaticExpression(unwrapped.left);
        const primaryIsAbsent =
          unwrapped.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
            ? isProvablyNullishStaticValue(
                unwrapped.left,
                resolveStaticExpression,
              )
            : isProvablyFalsyStaticValue(
                unwrapped.left,
                resolveStaticExpression,
              );
        const primaryIsFinal =
          unwrapped.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
            ? isProvablyNonNullishStaticValue(
                primary,
                resolveStaticExpression,
              )
            : isProvablyTruthyStaticValue(primary, resolveStaticExpression);
        if (
          primary
          && primaryIsFinal
        ) {
          return primary;
        }
        const fallback = resolveStaticExpression(unwrapped.right);
        const candidates = [primary, fallback].filter(isStaticObjectLike);
        return candidates.length > 0
          ? staticAlternatives(
              candidates,
              !primaryIsAbsent && !isStaticObjectLike(primary),
            )
          : unwrapped;
      }
      if (ts.isIdentifier(unwrapped)) {
        const binding = resolveLocalConstantInitializer(unwrapped);
        if (binding === undefined) {
          if (unwrapped.text === "undefined") {
            STATIC_GLOBAL_UNDEFINED_NODES.add(unwrapped);
            return unwrapped;
          }
          return undefined;
        }
        if (binding === null || resolvingDeclarations.has(binding)) {
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
        const repositoryMember = resolveRepositoryConstInitializer(
          ts.isPropertyAccessExpression(unwrapped)
            ? unwrapped.name
            : unwrapped.argumentExpression,
          analysisContext,
        );
        if (
          repositoryMember
          && !resolvingDeclarations.has(repositoryMember)
        ) {
          resolvingDeclarations.add(repositoryMember);
          const resolvedMember = resolveStaticExpression(repositoryMember);
          resolvingDeclarations.delete(repositoryMember);
          return resolvedMember;
        }
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

    function resolveStaticText(node, visitedNodes = new Set()) {
      if (!node || visitedNodes.has(node)) {
        return null;
      }
      visitedNodes.add(node);
      try {
        const resolved = resolveStaticExpression(node);
        const current = resolved && resolved !== node
          ? resolved
          : unwrapCopyExpression(node);
        if (isStaticAlternatives(current)) {
          const values = staticAlternativeValues(current)
            .map((candidate) => resolveStaticText(candidate, visitedNodes));
          return values.length > 0
            && values.every((value) => value !== null && value === values[0])
              ? values[0]
              : null;
        }
        if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
          return current.text;
        }
        if (ts.isNumericLiteral(current)) {
          return current.text;
        }
        if (ts.isBigIntLiteral(current)) {
          return current.text.slice(0, -1);
        }
        if (current.kind === ts.SyntaxKind.TrueKeyword) {
          return "true";
        }
        if (current.kind === ts.SyntaxKind.FalseKeyword) {
          return "false";
        }
        if (current.kind === ts.SyntaxKind.NullKeyword) {
          return "null";
        }
        if (ts.isTemplateExpression(current)) {
          const parts = [current.head.text];
          for (const span of current.templateSpans) {
            const value = resolveStaticText(span.expression, visitedNodes);
            if (value === null) {
              return null;
            }
            parts.push(value, span.literal.text);
          }
          return parts.join("");
        }
        if (
          ts.isBinaryExpression(current)
          && current.operatorToken.kind === ts.SyntaxKind.PlusToken
        ) {
          const left = resolveStaticText(current.left, visitedNodes);
          const right = resolveStaticText(current.right, visitedNodes);
          return left === null || right === null ? null : `${left}${right}`;
        }
        return null;
      } finally {
        visitedNodes.delete(node);
      }
    }

    function resolveStaticObjectPropertyBinding(binding) {
      const namespaceProperty = ts.isIdentifier(binding.owner)
        ? resolveRepositoryNamespaceExportInitializer(
            binding.owner,
            binding.propertyName,
            analysisContext,
          )
        : undefined;
      const owner = namespaceProperty
        ? undefined
        : resolveStaticExpression(binding.owner);
      const property = namespaceProperty
        ?? (isStaticObjectLike(owner)
          ? resolveObjectProperty(owner, binding.propertyName)
          : STATIC_PROPERTY_UNKNOWN);
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
        && (
          ts.isObjectLiteralExpression(value)
          || ts.isArrayLiteralExpression(value)
          || isStaticObjectRestBinding(value)
          || (
            isStaticAlternatives(value)
            && value.candidates.every((candidate) => isStaticObjectLike(candidate))
          )
        ),
      );
    }

    function collectResolvedObjectLiterals(owner, visitedOwners = new Set()) {
      if (!isStaticObjectLike(owner) || visitedOwners.has(owner)) {
        return;
      }
      visitedOwners.add(owner);
      if (isStaticAlternatives(owner)) {
        for (const candidate of owner.candidates) {
          collectResolvedObjectLiterals(candidate, visitedOwners);
        }
        return;
      }
      if (ts.isArrayLiteralExpression(owner)) {
        return;
      }
      if (isStaticObjectRestBinding(owner)) {
        collectResolvedObjectLiterals(
          resolveStaticExpression(owner.owner),
          visitedOwners,
        );
        return;
      }
      resolvedObjectLiterals.add(owner);
      for (const property of owner.properties) {
        if (ts.isSpreadAssignment(property)) {
          collectResolvedObjectLiterals(
            resolveStaticExpression(property.expression),
            visitedOwners,
          );
        }
      }
    }

    function collectPotentialSpreadObjectLiterals(node, visitedNodes = new Set()) {
      if (!node || visitedNodes.has(node)) {
        return;
      }
      visitedNodes.add(node);
      if (isStaticAlternatives(node)) {
        for (const candidate of node.candidates) {
          collectPotentialSpreadObjectLiterals(candidate, visitedNodes);
        }
        return;
      }
      if (isStaticObjectRestBinding(node)) {
        collectPotentialSpreadObjectLiterals(node.owner, visitedNodes);
        return;
      }
      const unwrapped = unwrapCopyExpression(node);
      if (ts.isObjectLiteralExpression(unwrapped)) {
        collectResolvedObjectLiterals(unwrapped);
        return;
      }
      if (ts.isIdentifier(unwrapped)) {
        collectPotentialSpreadObjectLiterals(
          resolveLocalConstantInitializer(unwrapped),
          visitedNodes,
        );
        return;
      }
      if (
        ts.isPropertyAccessExpression(unwrapped)
        || ts.isElementAccessExpression(unwrapped)
      ) {
        collectPotentialSpreadObjectLiterals(
          resolveStaticExpression(unwrapped),
          visitedNodes,
        );
        return;
      }
      if (ts.isConditionalExpression(unwrapped)) {
        collectPotentialSpreadObjectLiterals(unwrapped.whenTrue, visitedNodes);
        collectPotentialSpreadObjectLiterals(unwrapped.whenFalse, visitedNodes);
        return;
      }
      if (ts.isBinaryExpression(unwrapped)) {
        if (
          [
            ts.SyntaxKind.QuestionQuestionToken,
            ts.SyntaxKind.BarBarToken,
          ].includes(unwrapped.operatorToken.kind)
        ) {
          collectPotentialSpreadObjectLiterals(unwrapped.left, visitedNodes);
          collectPotentialSpreadObjectLiterals(unwrapped.right, visitedNodes);
        } else if (
          unwrapped.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        ) {
          collectPotentialSpreadObjectLiterals(unwrapped.right, visitedNodes);
        }
      }
    }

    function visitResolvedCopyExpression(
      node,
      referenceNode = renderedReferenceNode,
    ) {
      if (visitingResolvedExpressions.has(node)) {
        return;
      }
      visitingResolvedExpressions.add(node);
      try {
        if (isStaticAlternatives(node)) {
          for (const candidate of staticAlternativeValues(node)) {
            visitResolvedCopyExpression(candidate, referenceNode);
          }
          return;
        }
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          inspectLiteral(node, context, referenceNode);
          return;
        }
        if (ts.isTemplateExpression(node)) {
          const staticText = resolveStaticText(node);
          inspectLiteral(node, context, referenceNode, staticText);
          if (staticText !== null) {
            return;
          }
          for (const span of node.templateSpans) {
            visitResolvedCopyExpression(span.expression, referenceNode);
          }
          return;
        }
        if (
          ts.isIdentifier(node)
          || ts.isPropertyAccessExpression(node)
          || ts.isElementAccessExpression(node)
        ) {
          const resolved = resolveStaticExpression(node);
          if (resolved && resolved !== node) {
            visitResolvedCopyExpression(resolved, referenceNode);
          } else {
            hasUnresolvedCopyPath = true;
          }
          return;
        }
        if (ts.isConditionalExpression(node)) {
          const conditionIsTruthy = isProvablyTruthyStaticValue(
            node.condition,
            resolveStaticExpression,
          );
          const conditionIsFalsy = isProvablyFalsyStaticValue(
            node.condition,
            resolveStaticExpression,
          );
          if (!conditionIsFalsy) {
            visitResolvedCopyExpression(node.whenTrue, referenceNode);
          }
          if (!conditionIsTruthy) {
            visitResolvedCopyExpression(node.whenFalse, referenceNode);
          }
          return;
        }
        if (
          ts.isBinaryExpression(node)
          && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        ) {
          if (!isProvablyFalsyStaticValue(node.left, resolveStaticExpression)) {
            visitResolvedCopyExpression(node.right, referenceNode);
          }
          return;
        }
        if (
          ts.isBinaryExpression(node)
          && node.operatorToken.kind === ts.SyntaxKind.PlusToken
        ) {
          visitResolvedCopyExpression(node.left, referenceNode);
          visitResolvedCopyExpression(node.right, referenceNode);
          return;
        }
        if (
          ts.isBinaryExpression(node)
          && [
            ts.SyntaxKind.QuestionQuestionToken,
            ts.SyntaxKind.BarBarToken,
          ].includes(node.operatorToken.kind)
        ) {
          const primary = resolveStaticExpression(node.left) ?? node.left;
          const primaryIsFinal =
            node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
              ? isProvablyNonNullishStaticValue(
                  primary,
                  resolveStaticExpression,
                )
              : isProvablyTruthyStaticValue(
                  primary,
                  resolveStaticExpression,
                );
          const fallbackIsFinal =
            node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
              ? isProvablyNullishStaticValue(
                  node.left,
                  resolveStaticExpression,
                )
              : isProvablyFalsyStaticValue(
                  node.left,
                  resolveStaticExpression,
                );
          if (!fallbackIsFinal) {
            visitResolvedCopyExpression(node.left, referenceNode);
          }
          if (!primaryIsFinal) {
            visitResolvedCopyExpression(node.right, referenceNode);
          }
          return;
        }
        if (
          ts.isParenthesizedExpression(node) ||
          ts.isAsExpression(node) ||
          ts.isSatisfiesExpression(node) ||
          ts.isNonNullExpression(node)
        ) {
          visitResolvedCopyExpression(node.expression, referenceNode);
          return;
        }
        hasUnresolvedCopyPath = true;
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
        ts.isNoSubstitutionTemplateLiteral(node)
      ) {
        inspectLiteral(node, context);
        return;
      }
      if (ts.isTemplateExpression(node)) {
        visitResolvedCopyExpression(node);
        return;
      }
      if (ts.isConditionalExpression(node)) {
        visitResolvedCopyExpression(node);
        return;
      }
      if (
        ts.isBinaryExpression(node)
        && [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.PlusToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(node.operatorToken.kind)
      ) {
        visitResolvedCopyExpression(node);
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
    if (objectPropertyNames) {
      const propertyStates = new Map();
      const owner = resolveStaticExpression(expression);
      if (resolvedObjectLiterals) {
        collectPotentialSpreadObjectLiterals(expression);
        collectResolvedObjectLiterals(owner);
      }
      for (const propertyName of objectPropertyNames) {
        if (!isStaticObjectLike(owner)) {
          propertyStates.set(propertyName, "unknown");
          continue;
        }
        const property = resolveObjectProperty(owner, propertyName);
        if (property === STATIC_PROPERTY_ABSENT) {
          propertyStates.set(propertyName, "absent");
          continue;
        }
        if (property === STATIC_PROPERTY_UNKNOWN) {
          propertyStates.set(propertyName, "unknown");
          continue;
        }
        if (isStaticOptionalProperty(property)) {
          propertyStates.set(propertyName, {
            state: "maybe-present",
            value: staticAlternatives(
              property.candidates
                .map((candidate) => resolveStaticExpression(candidate))
                .filter(Boolean),
            ),
          });
          continue;
        }
        propertyStates.set(propertyName, {
          state: "present",
          value: resolveStaticExpression(property),
        });
      }
      return propertyStates;
    }
    if (isStaticAlternatives(expression)) {
      visitResolvedCopyExpression(expression);
    } else {
      visitExpression(expression);
    }
    if (trackUnresolved && hasUnresolvedCopyPath) {
      const positionNode = renderedReferenceNode?.referenceKind === "jsx-spread-property"
        ? renderedReferenceNode.positionNode
        : renderedReferenceNode;
      recordUnresolvedExpression(positionNode, context);
    }
    return null;
  }

  function collectJsxCopyOwnership(node) {
    if (ts.isJsxSpreadAttribute(node)) {
      inspectExpression(
        node.expression,
        "JSX spread ownership",
        new Set(),
        jsxSpreadOwnedObjectLiterals,
      );
    } else if (
      ts.isJsxAttribute(node)
      && node.initializer
      && ts.isJsxExpression(node.initializer)
      && node.initializer.expression
    ) {
      inspectExpression(
        node.initializer.expression,
        "JSX property ownership",
        new Set(),
        jsxNonSpreadReferencedObjectLiterals,
      );
    }
    ts.forEachChild(node, collectJsxCopyOwnership);
  }

  function inspectJsxAttributes(attributes) {
    const unresolvedPropertyNames = new Set(USER_FACING_PROPERTY_NAMES);
    const selectedCopyValues = [];
    for (let index = attributes.length - 1; index >= 0; index -= 1) {
      const attribute = attributes[index];
      if (ts.isJsxAttribute(attribute)) {
        const propertyName = attribute.name.getText(sourceFile);
        if (!unresolvedPropertyNames.has(propertyName)) {
          continue;
        }
        unresolvedPropertyNames.delete(propertyName);
        if (attribute.initializer && ts.isStringLiteral(attribute.initializer)) {
          selectedCopyValues.push({
            context: `JSX ${propertyName}`,
            node: attribute.initializer,
            referenceNode: attribute.initializer,
            sourceOrder: index,
          });
        } else if (
          attribute.initializer
          && ts.isJsxExpression(attribute.initializer)
          && attribute.initializer.expression
        ) {
          selectedCopyValues.push({
            context: `JSX ${propertyName}`,
            node: attribute.initializer.expression,
            referenceNode: attribute.initializer.expression,
            sourceOrder: index,
          });
        }
        continue;
      }
      if (!ts.isJsxSpreadAttribute(attribute)) {
        continue;
      }
      const propertyStates = inspectExpression(
        attribute.expression,
        "JSX spread",
        unresolvedPropertyNames,
      );
      for (const [propertyName, result] of propertyStates) {
        const state = typeof result === "string" ? result : result.state;
        if (state === "unknown") {
          recordUnresolvedExpression(
            attribute.expression,
            `JSX spread ${propertyName}`,
          );
        }
        if (
          (state === "present" || state === "maybe-present")
          && result.value
        ) {
          selectedCopyValues.push({
            context: "JSX spread",
            node: result.value,
            referenceNode: {
              referenceKind: "jsx-spread-property",
              positionNode: attribute.expression,
              propertyName,
            },
            sourceOrder: index,
          });
        }
        if (state !== "absent" && state !== "maybe-present") {
          unresolvedPropertyNames.delete(propertyName);
        }
      }
      if (unresolvedPropertyNames.size === 0) {
        break;
      }
    }
    selectedCopyValues
      .sort((left, right) =>
        left.sourceOrder - right.sourceOrder
        || left.node.getStart(sourceFile) - right.node.getStart(sourceFile),
      )
      .forEach(({ context, node, referenceNode }) => {
        if (ts.isStringLiteral(node)) {
          inspectLiteral(node, context, referenceNode);
        } else {
          inspectExpression(node, context, null, null, referenceNode, true);
        }
      });
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      inspectJsxAttributes(node.attributes.properties);
    } else if (ts.isJsxText(node)) {
      inspectLiteral(node, "JSX text");
    } else if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) {
      if (node.expression) {
        inspectExpression(node.expression, "JSX expression");
      }
    } else if (
      ts.isPropertyAssignment(node)
      && !(
        ts.isObjectLiteralExpression(node.parent)
        && jsxSpreadOwnedObjectLiterals.has(node.parent)
        && !jsxNonSpreadReferencedObjectLiterals.has(node.parent)
      )
    ) {
      const propertyName = propertyNameText(node.name, sourceFile);
      if (
        propertyName &&
        USER_FACING_PROPERTY_NAMES.has(propertyName) &&
        isProductCopyProperty(node, propertyName, sourceFile)
      ) {
        inspectExpression(
          node.initializer,
          `copy property ${propertyName}`,
          null,
          null,
          null,
          true,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  collectJsxCopyOwnership(sourceFile);
  visit(sourceFile);
  return { findings, unresolvedExpressions };
}

function resolveRepositoryConstInitializer(identifier, analysisContext) {
  if (!identifier || !analysisContext?.checker) {
    return undefined;
  }
  const symbol = resolveAliasedSymbol(
    analysisContext.checker.getSymbolAtLocation(identifier),
    analysisContext.checker,
  );
  return repositoryConstInitializerFromSymbol(symbol, analysisContext);
}

function resolveRepositoryNamespaceExportInitializer(
  identifier,
  exportName,
  analysisContext,
) {
  if (!identifier || !analysisContext?.checker) {
    return undefined;
  }
  const moduleSymbol = resolveAliasedSymbol(
    analysisContext.checker.getSymbolAtLocation(identifier),
    analysisContext.checker,
  );
  if (!moduleSymbol || (moduleSymbol.flags & ts.SymbolFlags.Module) === 0) {
    return undefined;
  }
  const exportedSymbol = analysisContext.checker
    .getExportsOfModule(moduleSymbol)
    .find((candidate) => candidate.getName() === exportName);
  return repositoryConstInitializerFromSymbol(
    resolveAliasedSymbol(exportedSymbol, analysisContext.checker),
    analysisContext,
  );
}

function resolveAliasedSymbol(symbol, checker) {
  const visitedSymbols = new Set();
  while (
    symbol
    && (symbol.flags & ts.SymbolFlags.Alias) !== 0
    && !visitedSymbols.has(symbol)
  ) {
    visitedSymbols.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  if (!symbol || visitedSymbols.has(symbol)) {
    return undefined;
  }
  return symbol;
}

function repositoryConstInitializerFromSymbol(symbol, analysisContext) {
  if (!symbol) {
    return undefined;
  }
  for (const declaration of symbol.declarations ?? []) {
    if (
      ts.isVariableDeclaration(declaration)
      && declaration.initializer
      && ts.isVariableDeclarationList(declaration.parent)
      && (declaration.parent.flags & ts.NodeFlags.Const) !== 0
      && sourceFileIsProductive(
        declaration.getSourceFile(),
        analysisContext.sourceRoot,
      )
    ) {
      return declaration.initializer;
    }
  }
  return undefined;
}

function sourceFileIsProductive(sourceFile, sourceRoot) {
  const normalizedRoot = resolve(sourceRoot).replaceAll("\\", "/").toLowerCase();
  const normalizedFile = resolve(sourceFile.fileName)
    .replaceAll("\\", "/")
    .toLowerCase();
  return normalizedFile.startsWith(`${normalizedRoot}/`);
}

function collectRepositoryMutationByInitializer(sourceFiles, checker, sourceRoot) {
  const initializerBySymbol = new Map();
  const aliasBindingBySymbol = new Map();
  const aliasAssignmentsBySymbol = new Map();
  const standardMutationApiBySymbol = new Map();
  const standardMutationApiAliasBySymbol = new Map();
  const standardMutationInitialAuthoritiesBySymbol = new Map();
  const standardMutationInitialCandidateBySymbol = new Map();
  const standardMutationApiAssignmentsBySymbol = new Map();
  const standardMutationNamespaceBySymbol = new Map();
  const standardMutationBindingPropertyAssignments = [];
  const standardMutationUndefinedValue = Symbol("standard-mutation-undefined");
  const standardMutationUnknownValue = Symbol("standard-mutation-unknown");
  const standardMutationUndefinedBindingExpression = ts.factory.createIdentifier(
    "undefined",
  );

  for (const sourceFile of sourceFiles) {
    function collectDeclarations(node) {
      if (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && !node.initializer
      ) {
        const symbol = resolveAliasedSymbol(
          checker.getSymbolAtLocation(node.name),
          checker,
        );
        if (symbol) {
          standardMutationInitialCandidateBySymbol.set(
            symbol,
            { value: standardMutationUndefinedValue },
          );
        }
      }
      if (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.initializer
      ) {
        const symbol = resolveAliasedSymbol(
          checker.getSymbolAtLocation(node.name),
          checker,
        );
        if (
          symbol
          && ts.isVariableDeclarationList(node.parent)
          && (node.parent.flags & ts.NodeFlags.Const) !== 0
          && sourceFileIsProductive(node.getSourceFile(), sourceRoot)
        ) {
          const initializer = unwrapCopyExpression(node.initializer);
          if (
            ts.isObjectLiteralExpression(initializer)
            || ts.isArrayLiteralExpression(initializer)
          ) {
            initializerBySymbol.set(symbol, initializer);
          }
        }
      }
      ts.forEachChild(node, collectDeclarations);
    }
    collectDeclarations(sourceFile);
  }

  for (const sourceFile of sourceFiles) {
    function collectAliasAssignments(node) {
      let target;
      let operatorKind;
      let value;
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        && ts.isIdentifier(node.left)
      ) {
        target = node.left;
        operatorKind = node.operatorToken.kind;
        value = node.right;
      } else if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
        && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)
        && ts.isIdentifier(node.operand)
      ) {
        target = node.operand;
        operatorKind = node.operator;
      }
      if (target) {
        recordAliasAssignment(target, { node, operatorKind, value });
      } else if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && (
          ts.isObjectLiteralExpression(node.left)
          || ts.isArrayLiteralExpression(node.left)
        )
      ) {
        const assignmentTarget = repositoryExpressionReference(
          node.right,
          checker,
          initializerBySymbol,
        );
        if (assignmentTarget) {
          collectAssignmentPatternAliases(node.left, assignmentTarget, node);
        }
      }
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        && (
          ts.isPropertyAccessExpression(node.left)
          || ts.isElementAccessExpression(node.left)
        )
      ) {
        standardMutationBindingPropertyAssignments.push({
          node,
          operatorKind: node.operatorToken.kind,
          owner: node.left.expression,
          propertyName: accessPropertyName(node.left),
          value: node.right,
        });
      }
      ts.forEachChild(node, collectAliasAssignments);
    }
    collectAliasAssignments(sourceFile);
  }

  function recordAliasAssignment(identifier, assignment, symbolOverride) {
    const symbol = resolveAliasedSymbol(
      symbolOverride ?? checker.getSymbolAtLocation(identifier),
      checker,
    );
    if (symbol) {
      const assignments = aliasAssignmentsBySymbol.get(symbol) ?? [];
      assignments.push(assignment);
      aliasAssignmentsBySymbol.set(symbol, assignments);
    }
  }

  function collectAssignmentPatternAliases(
    pattern,
    target,
    assignmentNode,
    symbolOverride,
  ) {
    if (ts.isIdentifier(pattern)) {
      recordAliasAssignment(pattern, {
        assignedReference: target,
        captureExpression: assignmentNode.right,
        node: assignmentNode,
        operatorKind: ts.SyntaxKind.EqualsToken,
      }, symbolOverride);
      return;
    }
    if (ts.isObjectLiteralExpression(pattern)) {
      const excludedRootProperties = pattern.properties.flatMap((property) => {
        if (ts.isSpreadAssignment(property)) {
          return [];
        }
        const propertyName = staticObjectPropertyName(property.name);
        return propertyName === null ? [] : [propertyName];
      });
      for (const property of pattern.properties) {
        if (ts.isSpreadAssignment(property)) {
          collectAssignmentPatternAliases(
            property.expression,
            {
              ...target,
              copyBarrierDepth: 1,
              excludedRootProperties,
            },
            assignmentNode,
          );
          continue;
        }
        const propertyName = staticObjectPropertyName(property.name);
        if (propertyName === null) {
          continue;
        }
        let binding;
        let bindingSymbol;
        let defaultValue;
        if (ts.isShorthandPropertyAssignment(property)) {
          binding = property.name;
          bindingSymbol = checker.getShorthandAssignmentValueSymbol(property);
          defaultValue = property.objectAssignmentInitializer;
        } else if (ts.isPropertyAssignment(property)) {
          const initializer = unwrapCopyExpression(property.initializer);
          if (
            ts.isBinaryExpression(initializer)
            && initializer.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ) {
            binding = initializer.left;
            defaultValue = initializer.right;
          } else {
            binding = property.initializer;
          }
        }
        if (binding) {
          const propertyTarget = {
            path: [...target.path, propertyName],
            symbol: target.symbol,
          };
          collectAssignmentPatternAliases(
            binding,
            assignmentPatternTarget(propertyTarget, defaultValue),
            assignmentNode,
            bindingSymbol,
          );
        }
      }
      return;
    }
    if (!ts.isArrayLiteralExpression(pattern)) {
      return;
    }
    for (const [index, element] of pattern.elements.entries()) {
      if (ts.isOmittedExpression(element)) {
        continue;
      }
      if (ts.isSpreadElement(element)) {
        collectAssignmentPatternAliases(
          element.expression,
          {
            ...target,
            copyBarrierDepth: 1,
            tupleRestStart: index,
          },
          assignmentNode,
        );
        continue;
      }
      const current = unwrapCopyExpression(element);
      const binding =
        ts.isBinaryExpression(current)
        && current.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ? current.left
          : element;
      const defaultValue = binding === element ? undefined : current.right;
      collectAssignmentPatternAliases(
        binding,
        assignmentPatternTarget(
          { path: [...target.path, String(index)], symbol: target.symbol },
          defaultValue,
        ),
        assignmentNode,
      );
    }
  }

  function assignmentPatternTarget(primaryTarget, defaultValue) {
    if (!defaultValue) {
      return primaryTarget;
    }
    const rootInitializer = initializerBySymbol.get(primaryTarget.symbol);
    if (
      rootInitializer
      && repositoryNestedInitializer(rootInitializer, primaryTarget.path)
    ) {
      return primaryTarget;
    }
    return repositoryExpressionReference(
      defaultValue,
      checker,
      initializerBySymbol,
    ) ?? primaryTarget;
  }

  for (const sourceFile of sourceFiles) {
    function collectAliases(node) {
      if (
        ts.isVariableDeclaration(node)
        && node.initializer
        && ts.isVariableDeclarationList(node.parent)
      ) {
        const isConstBinding =
          ts.isVariableDeclarationList(node.parent)
          && (node.parent.flags & ts.NodeFlags.Const) !== 0;
        const target = repositoryExpressionReference(
          node.initializer,
          checker,
          initializerBySymbol,
        );
        const standardMutationNamespace = isConstBinding
          ? standardMutationNamespaceName(
              node.initializer,
              checker,
              sourceRoot,
              standardMutationNamespaceBySymbol,
            )
          : undefined;
        if (standardMutationNamespace && ts.isIdentifier(node.name)) {
          const symbol = resolveAliasedSymbol(
            checker.getSymbolAtLocation(node.name),
            checker,
          );
          if (symbol) {
            standardMutationNamespaceBySymbol.set(
              symbol,
              standardMutationNamespace,
            );
          }
        }
        collectStandardMutationApiBindings(
          node.name,
          node.initializer,
          node,
          isConstBinding,
        );
        if (ts.isIdentifier(node.name)) {
          const symbol = resolveAliasedSymbol(
            checker.getSymbolAtLocation(node.name),
            checker,
          );
          const standardMutationAuthorities = standardMutationApiAuthorities(
            node.initializer,
          );
          recordStandardMutationBindingAuthorities(
            node.name,
            node.initializer,
            standardMutationAuthorities,
            node,
            isConstBinding,
            symbol,
          );
          recordAliasBinding(node.name, node, target);
        } else if (target) {
          collectBindingAliases(node.name, node, target);
        }
      }
      ts.forEachChild(node, collectAliases);
    }
    collectAliases(sourceFile);
  }

  function collectStandardMutationApiBindings(
    bindingName,
    initializer,
    declaration,
    isConstBinding,
  ) {
    collectStandardMutationApiBindingSources(
      bindingName,
      standardMutationBindingInitializers(initializer, declaration),
      declaration,
      isConstBinding,
    );
  }

  function collectStandardMutationApiBindingSources(
    bindingName,
    bindingInitializers,
    declaration,
    isConstBinding,
  ) {
    if (ts.isArrayBindingPattern(bindingName)) {
      for (const [index, element] of bindingName.elements.entries()) {
        if (
          ts.isOmittedExpression(element)
          || element.dotDotDotToken
        ) {
          continue;
        }
        const sourceElements = bindingInitializers.flatMap((bindingInitializer) => {
          const source = unwrapCopyExpression(bindingInitializer);
          return standardMutationBindingPropertySources(
            source,
            String(index),
            element.initializer,
            declaration,
          );
        });
        const inspectableSourceElements = sourceElements.filter(
          (sourceElement) => !ts.isSpreadElement(sourceElement),
        );
        if (inspectableSourceElements.length === 0) {
          continue;
        }
        if (ts.isIdentifier(element.name)) {
          recordStandardMutationBindingAuthorities(
            element.name,
            element,
            uniqueStandardMutationAuthorities(
              inspectableSourceElements.flatMap((sourceElement) =>
                standardMutationApiAuthorities(sourceElement)
              ),
            ),
            declaration,
            isConstBinding,
          );
        } else {
          collectStandardMutationApiBindingSources(
            element.name,
            inspectableSourceElements,
            declaration,
            isConstBinding,
          );
        }
      }
      return;
    }
    if (!ts.isObjectBindingPattern(bindingName)) {
      return;
    }
    for (const element of bindingName.elements) {
      if (element.dotDotDotToken) {
        continue;
      }
      const propertyName = element.propertyName
        ? staticMutationBindingPropertyName(
            element.propertyName,
            checker,
            sourceRoot,
          )
        : element.name.text;
      if (propertyName === null) {
        continue;
      }
      const sourceProperties = bindingInitializers.flatMap((bindingInitializer) =>
        standardMutationBindingPropertySources(
          bindingInitializer,
          propertyName,
          element.initializer,
          declaration,
        )
      );
      if (!ts.isIdentifier(element.name)) {
        collectStandardMutationApiBindingSources(
          element.name,
          sourceProperties,
          declaration,
          isConstBinding,
        );
        continue;
      }
      const namespaceAuthorities = bindingInitializers.flatMap(
        (bindingInitializer) => {
          const namespace = standardMutationNamespaceName(
            bindingInitializer,
            checker,
            sourceRoot,
            standardMutationNamespaceBySymbol,
          );
          const api = namespace ? `${namespace}.${propertyName}` : undefined;
          return api && STANDARD_MUTATION_APIS.has(api)
            ? [{ apis: new Set([api]) }]
            : [];
        },
      );
      const memberAuthorities = retainStandardMutationMemberHint(
        sourceProperties.flatMap((sourceProperty) =>
          standardMutationApiAuthorities(sourceProperty)
        ),
        propertyName,
      );
      const authorities = uniqueStandardMutationAuthorities([
        ...namespaceAuthorities,
        ...memberAuthorities,
      ]);
      if (authorities.length > 0) {
        recordStandardMutationBindingAuthorities(
          element.name,
          element,
          authorities,
          declaration,
          isConstBinding,
        );
      }
    }
  }

  function standardMutationBindingInitializers(
    value,
    usageExpression,
    visitedSymbols = new Set(),
  ) {
    const current = unwrapCopyExpression(value);
    if (!ts.isIdentifier(current)) {
      const reference = repositoryExpressionReference(
        current,
        checker,
        initializerBySymbol,
      );
      if (reference) {
        const referencedValues = resolveMutationRoots(
          reference,
          usageExpression,
        ).flatMap((root) => {
          const rootInitializer = initializerBySymbol.get(root.symbol);
          const nestedValue = rootInitializer
            ? standardMutationNestedValue(rootInitializer, root.path)
            : undefined;
          return nestedValue && nestedValue !== current
            ? standardMutationBindingInitializers(
                nestedValue,
                usageExpression,
                visitedSymbols,
              )
            : [];
        });
        if (referencedValues.length > 0) {
          return uniqueStandardMutationBindingInitializers(referencedValues);
        }
      }
      const alternatives = standardMutationBindingValueAlternatives(
        value,
        visitedSymbols,
      );
      if (alternatives.length === 1 && alternatives[0] === value) {
        return [value];
      }
      return uniqueStandardMutationBindingInitializers(
        alternatives.flatMap((alternative) =>
          standardMutationBindingInitializers(
            alternative,
            usageExpression,
            visitedSymbols,
          )
        ),
      );
    }
    const { captureNode, symbol } = standardMutationIdentifierReference(current);
    if (!symbol || visitedSymbols.has(symbol)) {
      return [value];
    }
    const effectiveUsageExpression = captureNode ?? usageExpression;
    const nextVisitedSymbols = new Set(visitedSymbols).add(symbol);
    const aliasTargets = aliasTargetsAt(symbol, effectiveUsageExpression);
    if (aliasTargets) {
      const aliasValues = aliasTargets.flatMap(({ captureExpression, reference }) =>
        resolveMutationRoots(reference, captureExpression).flatMap((root) => {
          const rootInitializer = initializerBySymbol.get(root.symbol);
          const nestedValue = rootInitializer
            ? standardMutationNestedValue(rootInitializer, root.path)
            : undefined;
          return nestedValue
            ? standardMutationBindingInitializers(
                nestedValue,
                captureExpression,
                nextVisitedSymbols,
              )
            : [];
        })
      );
      if (aliasValues.length > 0) {
        return uniqueStandardMutationBindingInitializers(aliasValues);
      }
    }
    const declaration = (symbol.declarations ?? []).find(
      (candidate) =>
        ts.isVariableDeclaration(candidate)
        && sourceFileIsProductive(candidate.getSourceFile(), sourceRoot),
    );
    if (!declaration || !ts.isVariableDeclaration(declaration)) {
      return [value];
    }
    let values = declaration.initializer
      ? standardMutationBindingInitializers(
          declaration.initializer,
          declaration.initializer,
          nextVisitedSymbols,
        )
      : [standardMutationUndefinedBindingExpression];
    const assignments = mutationWritesInEvaluationOrder(
      aliasAssignmentsBySymbol.get(symbol) ?? [],
    )
      .filter((assignment) =>
        assignment.node.getSourceFile() === declaration.getSourceFile()
        && (
          assignment.node.getSourceFile() !== effectiveUsageExpression.getSourceFile()
          || assignment.node.end <= effectiveUsageExpression.pos
        )
        && mutationExecutionPathsMayOverlap(assignment.node, effectiveUsageExpression)
        && !mutationIsStaticallyUnreachable(
          assignment.node,
          mutationTruthiness,
          mutationNullishness,
        )
      );
    for (const assignment of assignments) {
      const assignedValues = standardMutationAssignedBindingInitializers(
        assignment,
        values,
        nextVisitedSymbols,
      );
      if (
        mutationWriteIsDeterministicBeforeUsage(
          assignment.node,
          effectiveUsageExpression,
          mutationTruthiness,
          mutationNullishness,
        )
      ) {
        values = assignedValues;
      } else {
        values = uniqueStandardMutationBindingInitializers([
          ...values,
          ...assignedValues,
        ]);
      }
    }
    return uniqueStandardMutationBindingInitializers(values);
  }

  function standardMutationAssignedBindingInitializers(
    assignment,
    currentValues,
    visitedSymbols,
  ) {
    if (!assignment.value) {
      return currentValues;
    }
    const assignedValues = standardMutationBindingInitializers(
      assignment.value,
      assignment.value,
      visitedSymbols,
    );
    return standardMutationAssignmentValues(
      currentValues,
      assignedValues,
      assignment.operatorKind,
      assignment.node.left,
    );
  }

  function uniqueStandardMutationBindingInitializers(values) {
    return [...new Set(values)];
  }

  function standardMutationBindingPropertySources(
    bindingInitializer,
    propertyName,
    fallback,
    usageExpression,
    visitedInitializers = new Set(),
  ) {
    const initializer = unwrapCopyExpression(bindingInitializer);
    if (visitedInitializers.has(initializer)) {
      return standardMutationBindingSources(undefined, fallback);
    }
    const nextVisitedInitializers = new Set(visitedInitializers).add(initializer);
    if (
      !ts.isArrayLiteralExpression(initializer)
      && !ts.isObjectLiteralExpression(initializer)
    ) {
      const resolvedInitializers = standardMutationBindingInitializers(
        bindingInitializer,
        usageExpression,
      );
      if (
        resolvedInitializers.length !== 1
        || resolvedInitializers[0] !== bindingInitializer
      ) {
        return resolvedInitializers.flatMap((resolvedInitializer) =>
          standardMutationBindingPropertySources(
            resolvedInitializer,
            propertyName,
            fallback,
            usageExpression,
            nextVisitedInitializers,
          )
        );
      }
      return standardMutationBindingSources(undefined, fallback);
    }
    let values = standardMutationBindingValueAlternatives(
      standardMutationInitialProperty(initializer, propertyName)
        ?? standardMutationUndefinedBindingExpression,
    );
    const assignments = mutationWritesInEvaluationOrder(
      standardMutationBindingPropertyAssignments,
    )
      .filter((assignment) =>
        assignment.propertyName === propertyName
        && (
          assignment.node.getSourceFile() !== usageExpression.getSourceFile()
          || assignment.node.end <= usageExpression.pos
        )
        && mutationExecutionPathsMayOverlap(assignment.node, usageExpression)
        && !mutationIsStaticallyUnreachable(
          assignment.node,
          mutationTruthiness,
          mutationNullishness,
        )
        && mutationInitializers(assignment.owner).includes(initializer)
      );
    for (const assignment of assignments) {
      const assignedValues = standardMutationAssignedPropertyValues(
        assignment,
        values,
      );
      if (
        mutationWriteIsDeterministicBeforeUsage(
          assignment.node,
          usageExpression,
          mutationTruthiness,
          mutationNullishness,
        )
      ) {
        values = assignedValues;
      } else {
        values = uniqueStandardMutationBindingInitializers([
          ...values,
          ...assignedValues,
        ]);
      }
    }
    return values.flatMap((value) =>
      standardMutationBindingSources(value, fallback)
    );
  }

  function standardMutationAssignedPropertyValues(assignment, currentValues) {
    return standardMutationAssignmentValues(
      currentValues,
      standardMutationBindingValueAlternatives(assignment.value),
      assignment.operatorKind,
      assignment.node.left,
    );
  }

  function standardMutationBindingValueAlternatives(
    value,
    visitedSymbols = new Set(),
  ) {
    const current = unwrapCopyExpression(value);
    if (
      ts.isBinaryExpression(current)
      && current.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) {
      return standardMutationBindingValueAlternatives(
        current.right,
        visitedSymbols,
      );
    }
    if (ts.isConditionalExpression(current)) {
      const truthiness = mutationTruthiness(current.condition);
      if (truthiness === true) {
        return standardMutationBindingValueAlternatives(
          current.whenTrue,
          visitedSymbols,
        );
      }
      if (truthiness === false) {
        return standardMutationBindingValueAlternatives(
          current.whenFalse,
          visitedSymbols,
        );
      }
      return uniqueStandardMutationBindingInitializers([
        ...standardMutationBindingValueAlternatives(
          current.whenTrue,
          visitedSymbols,
        ),
        ...standardMutationBindingValueAlternatives(
          current.whenFalse,
          visitedSymbols,
        ),
      ]);
    }
    if (ts.isIdentifier(current)) {
      const symbol = resolveAliasedSymbol(
        checker.getSymbolAtLocation(current),
        checker,
      );
      if (!symbol || visitedSymbols.has(symbol)) {
        return [value];
      }
      const initializer = repositoryConstInitializerFromSymbol(symbol, { sourceRoot });
      return initializer
        ? standardMutationBindingValueAlternatives(
            initializer,
            new Set(visitedSymbols).add(symbol),
          )
        : [value];
    }
    if (
      !ts.isBinaryExpression(current)
      || ![
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(current.operatorToken.kind)
    ) {
      return [value];
    }
    const leftValues = standardMutationBindingValueAlternatives(
      current.left,
      visitedSymbols,
    );
    const rightValues = standardMutationBindingValueAlternatives(
      current.right,
      visitedSymbols,
    );
    return uniqueStandardMutationBindingInitializers(
      leftValues.flatMap((leftValue) => {
        const truthiness = mutationTruthiness(leftValue);
        const nullishness = mutationNullishness(leftValue);
        const rightExecutes =
          current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
            ? truthiness
            : current.operatorToken.kind === ts.SyntaxKind.BarBarToken
              ? truthiness === undefined ? undefined : !truthiness
              : nullishness;
        return rightExecutes === true
          ? rightValues
          : rightExecutes === false
            ? [leftValue]
            : [leftValue, ...rightValues];
      }),
    );
  }

  function standardMutationAssignmentValues(
    currentValues,
    assignedValues,
    operatorKind,
    unknownValue,
  ) {
    if (operatorKind === ts.SyntaxKind.EqualsToken) {
      return assignedValues;
    }
    if (operatorKind === ts.SyntaxKind.AmpersandAmpersandEqualsToken) {
      return currentValues.flatMap((currentValue) => {
        const truthiness = mutationTruthiness(currentValue);
        return truthiness === true
          ? assignedValues
          : truthiness === false
            ? [currentValue]
            : [currentValue, ...assignedValues];
      });
    }
    if (operatorKind === ts.SyntaxKind.BarBarEqualsToken) {
      return currentValues.flatMap((currentValue) => {
        const truthiness = mutationTruthiness(currentValue);
        return truthiness === true
          ? [currentValue]
          : truthiness === false
            ? assignedValues
            : [currentValue, ...assignedValues];
      });
    }
    if (operatorKind === ts.SyntaxKind.QuestionQuestionEqualsToken) {
      return currentValues.flatMap((currentValue) => {
        const nullishness = mutationNullishness(currentValue);
        return nullishness === false
          ? [currentValue]
          : nullishness === true
            ? assignedValues
            : [currentValue, ...assignedValues];
      });
    }
    return [unknownValue];
  }

  function standardMutationBindingSources(sourceValue, fallback) {
    if (!sourceValue || ts.isOmittedExpression(sourceValue)) {
      return fallback ? [fallback] : [];
    }
    if (!fallback) {
      return [sourceValue];
    }
    const undefinedness = standardMutationBindingUndefinedness(sourceValue);
    if (undefinedness === true) {
      return [fallback];
    }
    if (undefinedness === false) {
      return [sourceValue];
    }
    return [sourceValue, fallback];
  }

  function standardMutationBindingUndefinedness(value, visitedSymbols = new Set()) {
    const current = unwrapCopyExpression(value);
    if (ts.isVoidExpression(current)) {
      return true;
    }
    if (ts.isIdentifier(current)) {
      if (
        current.text === "undefined"
        && mutationIdentifierIsGlobalUndefined(current)
      ) {
        return true;
      }
      const symbol = resolveAliasedSymbol(
        checker.getSymbolAtLocation(current),
        checker,
      );
      if (!symbol || visitedSymbols.has(symbol)) {
        return undefined;
      }
      const initializer = repositoryConstInitializerFromSymbol(symbol, { sourceRoot });
      if (!initializer) {
        return undefined;
      }
      return standardMutationBindingUndefinedness(
        initializer,
        new Set(visitedSymbols).add(symbol),
      );
    }
    if (current.kind === ts.SyntaxKind.NullKeyword) {
      return false;
    }
    return staticMutationNullishness(current) === false ? false : undefined;
  }

  function recordStandardMutationBindingAuthorities(
    identifier,
    initializer,
    authorities,
    declaration,
    isConstBinding,
    symbolOverride,
  ) {
    const symbol = resolveAliasedSymbol(
      symbolOverride ?? checker.getSymbolAtLocation(identifier),
      checker,
    );
    if (!symbol || authorities.length === 0) {
      return;
    }
    if (!isConstBinding) {
      recordStandardMutationApiAssignment(
        identifier,
        authorities,
        declaration,
        symbol,
        ts.SyntaxKind.EqualsToken,
      );
      return;
    }
    if (authorities.length > 1) {
      standardMutationInitialAuthoritiesBySymbol.set(symbol, {
        authorities,
        node: initializer,
      });
      return;
    }
    const [authority] = authorities;
    if (authority.apis) {
      standardMutationApiBySymbol.set(symbol, authority.apis);
    } else if (authority.sourceSymbol) {
      standardMutationApiAliasBySymbol.set(symbol, {
        mutationApiHint: authority.mutationApiHint,
        node: authority.captureNode ?? initializer,
        sourceSymbol: authority.sourceSymbol,
      });
    } else {
      standardMutationInitialCandidateBySymbol.set(symbol, {
        mutationApiHint: authority.mutationApiHint,
        value: authority.value,
      });
    }
  }

  function standardMutationApiAuthority(expression) {
    const directStandardMutationApi = standardMutationApiName(
      expression,
      checker,
      sourceRoot,
      standardMutationNamespaceBySymbol,
    );
    if (directStandardMutationApi) {
      return { apis: new Set([directStandardMutationApi]) };
    }
    const current = unwrapCopyExpression(expression);
    if (!ts.isIdentifier(current)) {
      return { value: expression };
    }
    if (
      current.text === "undefined"
      && mutationIdentifierIsGlobalUndefined(current)
    ) {
      return { value: expression };
    }
    const { captureNode, symbol: sourceSymbol } = standardMutationIdentifierReference(current);
    return sourceSymbol
      ? { captureNode, sourceSymbol }
      : { value: expression };
  }

  function standardMutationIdentifierReference(identifier) {
    const parent = identifier.parent;
    const shorthandCapture =
      parent
      && ts.isShorthandPropertyAssignment(parent)
      && parent.name === identifier
        ? parent
        : undefined;
    const hasValueCapture = standardMutationHasEnclosingValueCapture(identifier);
    const captureNode = shorthandCapture || hasValueCapture
      ? identifier
      : undefined;
    const symbol = shorthandCapture
      ? checker.getShorthandAssignmentValueSymbol(shorthandCapture)
      : checker.getSymbolAtLocation(identifier);
    return {
      captureNode,
      symbol: resolveAliasedSymbol(symbol, checker),
    };
  }

  function standardMutationHasEnclosingValueCapture(identifier) {
    let current = identifier;
    while (current.parent) {
      const parent = current.parent;
      if (
        (ts.isPropertyAssignment(parent) && parent.initializer === current)
        || (ts.isVariableDeclaration(parent) && parent.initializer === current)
        || (
          ts.isArrayLiteralExpression(parent)
          && parent.elements.includes(current)
        )
        || (
          ts.isBinaryExpression(parent)
          && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
          && parent.right === current
        )
      ) {
        return true;
      }
      if (
        (
          (
            ts.isParenthesizedExpression(parent)
            || ts.isAsExpression(parent)
            || ts.isSatisfiesExpression(parent)
            || ts.isNonNullExpression(parent)
          )
          && parent.expression === current
        )
        || (
          ts.isConditionalExpression(parent)
          && (parent.whenTrue === current || parent.whenFalse === current)
        )
        || (
          ts.isBinaryExpression(parent)
          && [
            ts.SyntaxKind.AmpersandAmpersandToken,
            ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.QuestionQuestionToken,
          ].includes(parent.operatorToken.kind)
          && (parent.left === current || parent.right === current)
        )
        || (
          ts.isBinaryExpression(parent)
          && parent.operatorToken.kind === ts.SyntaxKind.CommaToken
          && parent.right === current
        )
      ) {
        current = parent;
        continue;
      }
      return false;
    }
    return false;
  }

  function standardMutationApiAuthorities(expression, visitedExpressions = new Set()) {
    const current = unwrapCopyExpression(expression);
    if (visitedExpressions.has(current)) {
      return [{ value: expression }];
    }
    const nextVisitedExpressions = new Set(visitedExpressions).add(current);
    if (
      ts.isBinaryExpression(current)
      && current.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) {
      return standardMutationApiAuthorities(
        current.right,
        nextVisitedExpressions,
      );
    }
    if (
      ts.isBinaryExpression(current)
      && current.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      return standardMutationApiAuthorities(
        current.right,
        nextVisitedExpressions,
      );
    }
    if (ts.isConditionalExpression(current)) {
      const truthiness = mutationTruthiness(current.condition);
      if (truthiness === true) {
        return standardMutationApiAuthorities(
          current.whenTrue,
          nextVisitedExpressions,
        );
      }
      if (truthiness === false) {
        return standardMutationApiAuthorities(
          current.whenFalse,
          nextVisitedExpressions,
        );
      }
      return uniqueStandardMutationAuthorities([
        ...standardMutationApiAuthorities(current.whenTrue, nextVisitedExpressions),
        ...standardMutationApiAuthorities(current.whenFalse, nextVisitedExpressions),
      ]);
    }
    if (
      ts.isBinaryExpression(current)
      && [
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(current.operatorToken.kind)
    ) {
      const leftAuthorities = standardMutationApiAuthorities(
        current.left,
        nextVisitedExpressions,
      );
      const rightAuthorities = standardMutationApiAuthorities(
        current.right,
        nextVisitedExpressions,
      );
      return uniqueStandardMutationAuthorities(leftAuthorities.flatMap((authority) => {
        const truthiness = standardMutationAuthorityTruthiness(authority);
        const nullishness = standardMutationAuthorityNullishness(authority);
        const rightExecutes =
          current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
            ? truthiness
            : current.operatorToken.kind === ts.SyntaxKind.BarBarToken
              ? truthiness === undefined ? undefined : !truthiness
              : nullishness;
        if (rightExecutes === true) {
          return rightAuthorities;
        }
        if (rightExecutes === false) {
          return [authority];
        }
        return [authority, ...rightAuthorities];
      }));
    }
    if (
      ts.isPropertyAccessExpression(current)
      || ts.isElementAccessExpression(current)
    ) {
      const propertyName = staticMutationAccessPropertyName(
        current,
        checker,
        sourceRoot,
      );
      if (propertyName !== null) {
        const propertyValues = standardMutationBindingInitializers(
          current.expression,
          current,
        ).flatMap((owner) =>
          standardMutationBindingPropertySources(
            owner,
            propertyName,
            undefined,
            current,
          )
        );
        if (propertyValues.length > 0) {
          const authorities = uniqueStandardMutationAuthorities(
            propertyValues.flatMap((propertyValue) =>
              standardMutationApiAuthorities(
                propertyValue,
                nextVisitedExpressions,
              )
            ),
          );
          return retainStandardMutationMemberHint(authorities, propertyName);
        }
      }
    }
    return [standardMutationApiAuthority(expression)];
  }

  function standardMutationAuthorityTruthiness(authority) {
    if (authority.apis) {
      return true;
    }
    return authority.value === undefined
      ? undefined
      : mutationTruthiness(authority.value);
  }

  function standardMutationAuthorityNullishness(authority) {
    if (authority.apis) {
      return false;
    }
    return authority.value === undefined
      ? undefined
      : mutationNullishness(authority.value);
  }

  function uniqueStandardMutationAuthorities(authorities) {
    const apiNames = new Set();
    const sourceSymbolCaptures = new Map();
    const valueHints = new Map();
    return authorities.filter((authority) => {
      if (authority.apis) {
        const names = [...authority.apis];
        const unseen = names.some((name) => !apiNames.has(name));
        names.forEach((name) => apiNames.add(name));
        return unseen;
      }
      if (authority.sourceSymbol) {
        const captures = sourceSymbolCaptures.get(authority.sourceSymbol) ?? new Set();
        const capture = authority.captureNode ?? null;
        const seen = captures.has(capture);
        captures.add(capture);
        sourceSymbolCaptures.set(authority.sourceSymbol, captures);
        return !seen;
      }
      const hints = valueHints.get(authority.value) ?? new Set();
      const hint = authority.mutationApiHint ?? null;
      const seen = hints.has(hint);
      hints.add(hint);
      valueHints.set(authority.value, hints);
      return !seen;
    });
  }

  function retainStandardMutationMemberHint(authorities, propertyName) {
    const mayBeStandardMutationMember = [...STANDARD_MUTATION_APIS]
      .some((api) => api.endsWith(`.${propertyName}`));
    return mayBeStandardMutationMember
      ? authorities.map((authority) => authority.apis
        ? authority
        : { ...authority, mutationApiHint: propertyName })
      : authorities;
  }

  function collectStandardMutationApiAssignmentPattern(
    pattern,
    bindingInitializers,
    assignment,
    additionalAuthorities = [],
    symbolOverride,
  ) {
    const current = unwrapCopyExpression(pattern);
    if (
      ts.isBinaryExpression(current)
      && current.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      collectStandardMutationApiAssignmentPattern(
        current.left,
        bindingInitializers,
        assignment,
        additionalAuthorities,
        symbolOverride,
      );
      return;
    }
    if (ts.isIdentifier(current)) {
      const authorities = uniqueStandardMutationAuthorities([
        ...additionalAuthorities,
        ...bindingInitializers.flatMap((bindingInitializer) =>
          standardMutationApiAuthorities(bindingInitializer)
        ),
      ]);
      if (authorities.length > 0) {
        recordStandardMutationApiAssignment(
          current,
          authorities,
          assignment,
          symbolOverride,
          ts.SyntaxKind.EqualsToken,
        );
      }
      return;
    }
    if (ts.isArrayLiteralExpression(current)) {
      for (const [index, element] of current.elements.entries()) {
        if (ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
          continue;
        }
        const elementExpression = unwrapCopyExpression(element);
        const fallback = ts.isBinaryExpression(elementExpression)
          && elementExpression.operatorToken.kind === ts.SyntaxKind.EqualsToken
            ? elementExpression.right
            : undefined;
        const sourceElements = bindingInitializers.flatMap((bindingInitializer) =>
          standardMutationBindingPropertySources(
            bindingInitializer,
            String(index),
            fallback,
            assignment,
          )
        );
        collectStandardMutationApiAssignmentPattern(
          element,
          sourceElements,
          assignment,
        );
      }
      return;
    }
    if (!ts.isObjectLiteralExpression(current)) {
      return;
    }
    for (const property of current.properties) {
      if (
        ts.isSpreadAssignment(property)
        || !(
          ts.isShorthandPropertyAssignment(property)
          || ts.isPropertyAssignment(property)
        )
      ) {
        continue;
      }
      const propertyName = staticMutationBindingPropertyName(
        property.name,
        checker,
        sourceRoot,
      );
      if (propertyName === null) {
        continue;
      }
      const target = ts.isShorthandPropertyAssignment(property)
        ? property.name
        : property.initializer;
      const targetExpression = unwrapCopyExpression(target);
      const fallback = ts.isBinaryExpression(targetExpression)
        && targetExpression.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ? targetExpression.right
          : undefined;
      const sourceProperties = bindingInitializers.flatMap((bindingInitializer) =>
        standardMutationBindingPropertySources(
          bindingInitializer,
          propertyName,
          fallback,
          assignment,
        )
      );
      const namespaceAuthorities = bindingInitializers.flatMap(
        (bindingInitializer) => {
          const namespace = standardMutationNamespaceName(
            bindingInitializer,
            checker,
            sourceRoot,
            standardMutationNamespaceBySymbol,
          );
          const api = namespace ? `${namespace}.${propertyName}` : undefined;
          return api && STANDARD_MUTATION_APIS.has(api)
            ? [{ apis: new Set([api]) }]
            : [];
        },
      );
      const memberAuthorities = retainStandardMutationMemberHint(
        sourceProperties.flatMap((sourceProperty) =>
          standardMutationApiAuthorities(sourceProperty)
        ),
        propertyName,
      );
      collectStandardMutationApiAssignmentPattern(
        target,
        sourceProperties,
        assignment,
        [...namespaceAuthorities, ...memberAuthorities],
        ts.isShorthandPropertyAssignment(property)
          ? checker.getShorthandAssignmentValueSymbol(property)
          : undefined,
      );
    }
  }

  for (const sourceFile of sourceFiles) {
    function collectStandardMutationApiAssignments(node) {
      if (
        ts.isBinaryExpression(node)
        && [
          ts.SyntaxKind.EqualsToken,
          ts.SyntaxKind.AmpersandAmpersandEqualsToken,
          ts.SyntaxKind.BarBarEqualsToken,
          ts.SyntaxKind.QuestionQuestionEqualsToken,
        ].includes(node.operatorToken.kind)
      ) {
        if (ts.isIdentifier(node.left)) {
          recordStandardMutationApiAssignment(
            node.left,
            standardMutationApiAuthorities(node.right),
            node,
            undefined,
            node.operatorToken.kind,
          );
        } else if (
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken
          && (
            ts.isArrayLiteralExpression(node.left)
            || ts.isObjectLiteralExpression(node.left)
          )
        ) {
          collectStandardMutationApiAssignmentPattern(
            node.left,
            standardMutationBindingInitializers(node.right, node),
            node,
          );
        }
      }
      ts.forEachChild(node, collectStandardMutationApiAssignments);
    }
    collectStandardMutationApiAssignments(sourceFile);
  }

  function recordStandardMutationApiAssignment(
    identifier,
    authorityOrAuthorities,
    node,
    symbolOverride,
    operatorKind = ts.SyntaxKind.EqualsToken,
  ) {
    const symbol = resolveAliasedSymbol(
      symbolOverride ?? checker.getSymbolAtLocation(identifier),
      checker,
    );
    if (!symbol) {
      return;
    }
    const assignments = standardMutationApiAssignmentsBySymbol.get(symbol) ?? [];
    assignments.push({
      authorities: Array.isArray(authorityOrAuthorities)
        ? authorityOrAuthorities
        : [authorityOrAuthorities],
      node,
      operatorKind,
    });
    standardMutationApiAssignmentsBySymbol.set(symbol, assignments);
  }

  function standardMutationCandidatesAtSymbol(
    symbol,
    usageNode,
    visitedStates = [],
  ) {
    if (visitedStates.some((state) =>
      state.symbol === symbol
      && state.sourceFile === usageNode.getSourceFile()
      && state.pos === usageNode.pos
    )) {
      return [{ value: standardMutationUnknownValue }];
    }
    const nextVisitedStates = [
      ...visitedStates,
      {
        pos: usageNode.pos,
        sourceFile: usageNode.getSourceFile(),
        symbol,
      },
    ];
    let candidates = [...(standardMutationApiBySymbol.get(symbol) ?? [])]
      .map((api) => ({ api }));
    const initialAuthorities = standardMutationInitialAuthoritiesBySymbol.get(symbol);
    const alias = standardMutationApiAliasBySymbol.get(symbol);
    if (initialAuthorities) {
      candidates = standardMutationCandidatesFromAuthorities(
        initialAuthorities.authorities,
        symbol,
        initialAuthorities.node,
        nextVisitedStates,
        candidates,
      );
    } else if (alias) {
      candidates = retainMutationApiHint(
        standardMutationCandidatesAtSymbol(
          alias.sourceSymbol,
          alias.node,
          nextVisitedStates,
        ),
        alias.mutationApiHint,
      );
    } else if (standardMutationInitialCandidateBySymbol.has(symbol)) {
      candidates = [standardMutationInitialCandidateBySymbol.get(symbol)];
    } else if (standardMutationApiAssignmentsBySymbol.has(symbol)) {
      candidates = [{ value: standardMutationUnknownValue }];
    }
    const logicalAssignmentInputCandidates = new Map();
    for (const assignment of mutationWritesInEvaluationOrder(
      standardMutationApiAssignmentsBySymbol.get(symbol) ?? [],
    )) {
      if (
        assignment.node.getSourceFile() === usageNode.getSourceFile()
        && assignment.node.pos < usageNode.pos
        && mutationExecutionPathsMayOverlap(assignment.node, usageNode)
        && !mutationIsStaticallyUnreachable(
          assignment.node,
          standardMutationTruthinessAtCurrentState,
          standardMutationNullishnessAtCurrentState,
        )
      ) {
        const assignedCandidates = standardMutationCandidatesFromAuthorities(
          assignment.authorities,
          symbol,
          assignment.node,
          nextVisitedStates,
          candidates,
        );
        const nextCandidates = standardMutationAssignmentCandidates(
          logicalAssignmentInputCandidates.get(assignment.node) ?? candidates,
          assignedCandidates,
          assignment.operatorKind,
        );
        if (
          mutationWriteIsDeterministicBeforeUsage(
            assignment.node,
            usageNode,
            standardMutationTruthinessAtCurrentState,
            standardMutationNullishnessAtCurrentState,
          )
        ) {
          candidates = nextCandidates;
        } else {
          candidates = uniqueStandardMutationCandidates([
            ...candidates,
            ...nextCandidates,
          ]);
        }
      }
    }
    return candidates;

    function standardMutationTruthinessAtCurrentState(expression) {
      return standardMutationStateAtCurrentSymbol(
        expression,
        (candidate) => candidate.api
          ? true
          : standardMutationCandidateTruthiness(candidate.value),
        mutationTruthiness,
      );
    }

    function standardMutationNullishnessAtCurrentState(expression) {
      return standardMutationStateAtCurrentSymbol(
        expression,
        (candidate) => candidate.api
          ? false
          : standardMutationCandidateNullishness(candidate.value),
        mutationNullishness,
      );
    }

    function standardMutationStateAtCurrentSymbol(
      expression,
      candidateState,
      fallbackState,
    ) {
      const current = unwrapCopyExpression(expression);
      if (ts.isIdentifier(current)) {
        const expressionSymbol = resolveAliasedSymbol(
          checker.getSymbolAtLocation(current),
          checker,
        );
        if (expressionSymbol === symbol && candidates.length > 0) {
          const parent = expression.parent;
          const logicalAssignment = parent
            && ts.isBinaryExpression(parent)
            && parent.left === expression
            && [
              ts.SyntaxKind.AmpersandAmpersandEqualsToken,
              ts.SyntaxKind.BarBarEqualsToken,
              ts.SyntaxKind.QuestionQuestionEqualsToken,
            ].includes(parent.operatorToken.kind)
              ? parent
              : undefined;
          if (
            logicalAssignment
            && !logicalAssignmentInputCandidates.has(logicalAssignment)
          ) {
            logicalAssignmentInputCandidates.set(logicalAssignment, [...candidates]);
          }
          const stateCandidates = logicalAssignment
            ? logicalAssignmentInputCandidates.get(logicalAssignment) ?? candidates
            : candidates;
          const states = stateCandidates.map(candidateState);
          const firstState = states[0];
          if (
            firstState !== undefined
            && states.every((state) => state === firstState)
          ) {
            return firstState;
          }
          return undefined;
        }
      }
      return fallbackState(expression);
    }

    function standardMutationCandidatesFromAuthorities(
      authorities,
      ownerSymbol,
      captureNode,
      seenStates,
      currentCandidates,
    ) {
      return uniqueStandardMutationCandidates(authorities.flatMap((authority) => {
        if (authority.apis) {
          return [...authority.apis].map((api) => ({ api }));
        }
        if (authority.sourceSymbol === ownerSymbol) {
          return [...currentCandidates];
        }
        if (authority.sourceSymbol) {
          return retainMutationApiHint(
            standardMutationCandidatesAtSymbol(
              authority.sourceSymbol,
              authority.captureNode ?? captureNode,
              seenStates,
            ),
            authority.mutationApiHint,
          );
        }
        return [{
          mutationApiHint: authority.mutationApiHint,
          value: authority.value ?? standardMutationUnknownValue,
        }];
      }));
    }

    function retainMutationApiHint(candidates, mutationApiHint) {
      if (!mutationApiHint) {
        return candidates;
      }
      const sourceCandidates = candidates.length > 0
        ? candidates
        : [{ value: standardMutationUnknownValue }];
      return sourceCandidates.map((candidate) => candidate.api
        ? candidate
        : {
            ...candidate,
            mutationApiHint: candidate.mutationApiHint ?? mutationApiHint,
          });
    }

    function standardMutationAssignmentCandidates(
      currentCandidates,
      assignedCandidates,
      operatorKind,
    ) {
      if (operatorKind === ts.SyntaxKind.EqualsToken) {
        return assignedCandidates;
      }
      const possibleCurrentCandidates = currentCandidates.length > 0
        ? currentCandidates
        : [{ value: standardMutationUnknownValue }];
      return uniqueStandardMutationCandidates(
        possibleCurrentCandidates.flatMap((candidate) => {
          const execution = standardMutationLogicalAssignmentExecution(
            candidate,
            operatorKind,
          );
          if (execution === "always") {
            return assignedCandidates;
          }
          if (execution === "never") {
            return [candidate];
          }
          return [candidate, ...assignedCandidates];
        }),
      );
    }

    function standardMutationLogicalAssignmentExecution(candidate, operatorKind) {
      const truthiness = candidate.api
        ? true
        : standardMutationCandidateTruthiness(candidate.value);
      if (operatorKind === ts.SyntaxKind.BarBarEqualsToken) {
        return truthiness === true ? "never" : truthiness === false ? "always" : "maybe";
      }
      if (operatorKind === ts.SyntaxKind.AmpersandAmpersandEqualsToken) {
        return truthiness === false ? "never" : truthiness === true ? "always" : "maybe";
      }
      const nullishness = candidate.api
        ? false
        : standardMutationCandidateNullishness(candidate.value);
      return nullishness === false ? "never" : nullishness === true ? "always" : "maybe";
    }

    function standardMutationCandidateTruthiness(value) {
      if (value === standardMutationUndefinedValue) {
        return false;
      }
      if (value === standardMutationUnknownValue) {
        return undefined;
      }
      return mutationTruthiness(value);
    }

    function standardMutationCandidateNullishness(value) {
      if (value === standardMutationUndefinedValue) {
        return true;
      }
      if (value === standardMutationUnknownValue) {
        return undefined;
      }
      return mutationNullishness(value);
    }

    function uniqueStandardMutationCandidates(values) {
      const apis = new Set();
      const otherValueHints = new Map();
      return values.filter((candidate) => {
        const hints = otherValueHints.get(candidate.value) ?? new Set();
        const hint = candidate.mutationApiHint ?? null;
        const seen = candidate.api
          ? apis.has(candidate.api)
          : hints.has(hint);
        if (candidate.api) {
          apis.add(candidate.api);
        } else {
          hints.add(hint);
          otherValueHints.set(candidate.value, hints);
        }
        return !seen;
      });
    }
  }

  function recordAliasBinding(identifier, declaration, target) {
    const symbol = resolveAliasedSymbol(
      checker.getSymbolAtLocation(identifier),
      checker,
    );
    if (symbol && target && symbol !== target.symbol) {
      aliasBindingBySymbol.set(symbol, {
        captureExpression: declaration.initializer ?? declaration,
        declaration,
        target,
      });
    }
  }

  function collectBindingAliases(bindingName, declaration, target) {
    if (ts.isIdentifier(bindingName)) {
      recordAliasBinding(bindingName, declaration, target);
      return;
    }
    if (ts.isObjectBindingPattern(bindingName)) {
      const excludedRootProperties = bindingName.elements.flatMap((element) => {
        if (element.dotDotDotToken) {
          return [];
        }
        const propertyName = element.propertyName
          ? staticObjectPropertyName(element.propertyName)
          : ts.isIdentifier(element.name)
            ? element.name.text
            : undefined;
        return propertyName === null || propertyName === undefined
          ? []
          : [propertyName];
      });
      for (const element of bindingName.elements) {
        if (element.dotDotDotToken) {
          collectBindingAliases(element.name, element, {
            ...target,
            copyBarrierDepth: 1,
            excludedRootProperties,
          });
          continue;
        }
        const propertyName = element.propertyName
          ? staticObjectPropertyName(element.propertyName)
          : ts.isIdentifier(element.name)
            ? element.name.text
            : undefined;
        if (propertyName !== null && propertyName !== undefined) {
          const propertyTarget = {
            path: [...target.path, propertyName],
            symbol: target.symbol,
          };
          collectBindingAliases(
            element.name,
            element,
            bindingElementTarget(element, propertyTarget),
          );
        }
      }
      return;
    }
    for (const [index, element] of bindingName.elements.entries()) {
      if (!ts.isBindingElement(element)) {
        continue;
      }
      if (element.dotDotDotToken) {
        collectBindingAliases(element.name, element, {
          ...target,
          copyBarrierDepth: 1,
          tupleRestStart: index,
        });
        continue;
      }
      const elementTarget = {
        path: [...target.path, String(index)],
        symbol: target.symbol,
      };
      collectBindingAliases(
        element.name,
        element,
        bindingElementTarget(element, elementTarget),
      );
    }
  }

  function bindingElementTarget(element, primaryTarget) {
    if (!element.initializer) {
      return primaryTarget;
    }
    const rootInitializer = initializerBySymbol.get(primaryTarget.symbol);
    if (
      rootInitializer
      && repositoryNestedInitializer(rootInitializer, primaryTarget.path)
    ) {
      return primaryTarget;
    }
    return repositoryExpressionReference(
      element.initializer,
      checker,
      initializerBySymbol,
    ) ?? primaryTarget;
  }

  function aliasTargetsAt(symbol, usageExpression) {
    const binding = aliasBindingBySymbol.get(symbol);
    const assignments = aliasAssignmentsBySymbol.get(symbol) ?? [];
    if (!binding && assignments.length === 0) {
      return undefined;
    }
    let targets = binding
      ? [{
          captureExpression: binding.captureExpression,
          reference: binding.target,
        }]
      : [];
    const declarationSource = binding
      ? binding.declaration.getSourceFile()
      : assignments[0].node.getSourceFile();
    for (const assignment of assignments) {
      if (
        assignment.node.getSourceFile() !== declarationSource
        || (
          usageExpression.getSourceFile() === declarationSource
          && assignment.node.end > usageExpression.pos
        )
        || !mutationExecutionPathsMayOverlap(assignment.node, usageExpression)
        || mutationIsStaticallyUnreachable(
          assignment.node,
          mutationTruthiness,
          mutationNullishness,
        )
      ) {
        continue;
      }
      let assignedTargets;
      if (assignment.assignedReference) {
        assignedTargets = [{
          captureExpression: assignment.captureExpression,
          reference: assignment.assignedReference,
        }];
      } else if (assignment.operatorKind === ts.SyntaxKind.EqualsToken) {
        assignedTargets = capturedAliasTargets(assignment.value, symbol, targets);
      } else if (assignment.operatorKind === ts.SyntaxKind.AmpersandAmpersandEqualsToken) {
        assignedTargets = targets.length > 0
          ? capturedAliasTargets(assignment.value, symbol, targets)
          : undefined;
      } else if (
        assignment.operatorKind === ts.SyntaxKind.BarBarEqualsToken
        || assignment.operatorKind === ts.SyntaxKind.QuestionQuestionEqualsToken
      ) {
        assignedTargets = targets.length > 0
          ? targets
          : capturedAliasTargets(assignment.value, symbol, targets);
      } else if (assignment.operatorKind !== undefined) {
        assignedTargets = [];
      }
      if (
        mutationWriteIsDeterministicBeforeUsage(
          assignment.node,
          usageExpression,
          mutationTruthiness,
          mutationNullishness,
        )
      ) {
        targets = assignedTargets ?? targets;
      } else if (assignedTargets) {
        targets.push(...assignedTargets);
      }
    }
    return targets;

    function capturedAliasTargets(expression, aliasSymbol, currentTargets) {
      if (!expression) {
        return undefined;
      }
      const current = unwrapCopyExpression(expression);
      if (ts.isConditionalExpression(current)) {
        const truthiness = mutationTruthiness(current.condition);
        if (truthiness === true) {
          return capturedAliasTargets(current.whenTrue, aliasSymbol, currentTargets);
        }
        if (truthiness === false) {
          return capturedAliasTargets(current.whenFalse, aliasSymbol, currentTargets);
        }
        const whenTrue = capturedAliasTargets(
          current.whenTrue,
          aliasSymbol,
          currentTargets,
        );
        const whenFalse = capturedAliasTargets(
          current.whenFalse,
          aliasSymbol,
          currentTargets,
        );
        return whenTrue || whenFalse
          ? [...(whenTrue ?? []), ...(whenFalse ?? [])]
          : undefined;
      }
      if (
        ts.isBinaryExpression(current)
        && [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(current.operatorToken.kind)
      ) {
        const leftTargets = capturedAliasTargets(
          current.left,
          aliasSymbol,
          currentTargets,
        );
        const leftIsObject = Boolean(leftTargets && leftTargets.length > 0);
        const truthiness = leftIsObject ? true : mutationTruthiness(current.left);
        const nullishness = leftIsObject ? false : mutationNullishness(current.left);
        if (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
          if (truthiness === true) {
            return capturedAliasTargets(current.right, aliasSymbol, currentTargets);
          }
          if (truthiness === false) {
            return leftTargets ?? [];
          }
        } else if (current.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          if (truthiness === true) {
            return leftTargets;
          }
          if (truthiness === false) {
            return capturedAliasTargets(current.right, aliasSymbol, currentTargets);
          }
        } else {
          if (nullishness === false) {
            return leftTargets;
          }
          if (nullishness === true) {
            return capturedAliasTargets(current.right, aliasSymbol, currentTargets);
          }
        }
        const rightTargets = capturedAliasTargets(
          current.right,
          aliasSymbol,
          currentTargets,
        );
        return leftTargets || rightTargets
          ? [...(leftTargets ?? []), ...(rightTargets ?? [])]
          : undefined;
      }
      const reference = repositoryExpressionReference(
        current,
        checker,
        initializerBySymbol,
      );
      if (reference) {
        return reference.symbol === aliasSymbol && reference.path.length === 0
          ? currentTargets
          : [{ captureExpression: current, reference }];
      }
      return mutationTruthiness(current) !== undefined
        || mutationNullishness(current) !== undefined
        ? []
        : undefined;
    }
  }

  function resolveMutationRoots(reference, usageExpression, visited = []) {
    if (
      !reference.symbol
      || visited.some((visit) =>
        visit.symbol === reference.symbol
        && visit.sourceFile === usageExpression.getSourceFile()
        && visit.pos === usageExpression.pos
      )
    ) {
      return [];
    }
    const aliasTargets = aliasTargetsAt(reference.symbol, usageExpression);
    if (!aliasTargets) {
      return [reference];
    }
    const nextVisited = [
      ...visited,
      {
        pos: usageExpression.pos,
        sourceFile: usageExpression.getSourceFile(),
        symbol: reference.symbol,
      },
    ];
    return aliasTargets.flatMap(({ captureExpression, reference: target }) => {
      if (
        target.copyBarrierDepth
        && reference.path.length < target.copyBarrierDepth
      ) {
        return [];
      }
      if (
        target.excludedRootProperties?.includes(reference.path[0])
      ) {
        return [];
      }
      let referencePath = reference.path;
      if (target.tupleRestStart !== undefined) {
        const relativeIndex = staticArrayIndex(reference.path[0]);
        if (relativeIndex === null) {
          return [];
        }
        referencePath = [
          String(target.tupleRestStart + relativeIndex),
          ...reference.path.slice(1),
        ];
      }
      return resolveMutationRoots(
        {
          path: [...target.path, ...referencePath],
          symbol: target.symbol,
        },
        captureExpression,
        nextVisited,
      );
    });
  }

  const mutationByInitializer = new Map();
  function mutationInitializers(targetExpression) {
    const reference = repositoryExpressionReference(
      targetExpression,
      checker,
      initializerBySymbol,
    );
    if (!reference) {
      return [];
    }
    return [
      ...new Set(
        resolveMutationRoots(reference, targetExpression).flatMap((root) => {
          const rootInitializer = initializerBySymbol.get(root.symbol);
          const initializer = rootInitializer
            ? repositoryNestedInitializer(rootInitializer, root.path)
            : undefined;
          return initializer ? [initializer] : [];
        }),
      ),
    ];
  }

  function mutationInitializer(targetExpression) {
    const initializers = mutationInitializers(targetExpression);
    return initializers.length === 1 ? initializers[0] : undefined;
  }

  function mutationRecordForInitializer(initializer) {
    const record = mutationByInitializer.get(initializer) ?? {
      arrayLength: ts.isArrayLiteralExpression(initializer)
        ? initializer.elements.length
        : undefined,
      hasUnknownPropertyWrite: false,
      propertyWrites: new Map(),
      unknownPropertyWrites: [],
    };
    mutationByInitializer.set(initializer, record);
    return record;
  }

  function mutationRecord(targetExpression) {
    const initializer = mutationInitializer(targetExpression);
    return initializer ? mutationRecordForInitializer(initializer) : undefined;
  }

  function recordPropertyWrite(
    targetExpression,
    propertyName,
    value,
    { enumerable = true, mayBeAbsent = false, replace = false } = {},
  ) {
    const initializers = mutationInitializers(targetExpression);
    if (initializers.length === 0) {
      return;
    }
    for (const initializer of initializers) {
      const record = mutationRecordForInitializer(initializer);
      if (propertyName === null) {
        if (value) {
          record.unknownPropertyWrites.push(value);
        } else {
          record.hasUnknownPropertyWrite = true;
        }
        continue;
      }
      if (!value) {
        record.hasUnknownPropertyWrite = true;
        continue;
      }
      const existingState = record.propertyWrites.get(propertyName);
      const effectiveEnumerable = enumerable === "preserve"
        ? existingState?.enumerable
          ?? Boolean(repositoryInitialProperty(initializer, propertyName))
        : enumerable;
      if (replace) {
        record.propertyWrites.set(propertyName, {
          enumerable: effectiveEnumerable,
          includeInitial: false,
          mayBeAbsent,
          values: [value],
        });
        continue;
      }
      const state = record.propertyWrites.get(propertyName) ?? {
        enumerable: repositoryInitialProperty(initializer, propertyName)
          ? true
          : effectiveEnumerable,
        includeInitial: true,
        mayBeAbsent: false,
        values: [],
      };
      state.values.push(value);
      state.mayBeAbsent ||= mayBeAbsent;
      if (state.enumerable !== effectiveEnumerable) {
        state.enumerable = undefined;
      }
      record.propertyWrites.set(propertyName, state);
    }
  }

  function recordPropertyRemoval(targetExpression, propertyName, replace) {
    const initializers = mutationInitializers(targetExpression);
    for (const initializer of initializers) {
      if (propertyName === null) {
        mutationRecordForInitializer(initializer).hasUnknownPropertyWrite = true;
        continue;
      }
      const record = mutationRecordForInitializer(initializer);
      if (replace) {
        record.propertyWrites.set(propertyName, {
          enumerable: false,
          includeInitial: false,
          mayBeAbsent: true,
          values: [],
        });
      } else {
        const state = record.propertyWrites.get(propertyName) ?? {
          enumerable: true,
          includeInitial: true,
          mayBeAbsent: false,
          values: [],
        };
        state.mayBeAbsent = true;
        state.enumerable = undefined;
        record.propertyWrites.set(propertyName, state);
      }
    }
  }

  function recordPropertyOpaqueUpdate(targetExpression, propertyName, replace) {
    const initializers = mutationInitializers(targetExpression);
    for (const initializer of initializers) {
      if (propertyName === null) {
        mutationRecordForInitializer(initializer).hasUnknownPropertyWrite = true;
        continue;
      }
      const record = mutationRecordForInitializer(initializer);
      if (replace) {
        record.propertyWrites.set(propertyName, {
          enumerable: true,
          includeInitial: false,
          mayBeAbsent: false,
          values: [STATIC_NON_COPY_NUMBER],
        });
      } else {
        const state = record.propertyWrites.get(propertyName) ?? {
          enumerable: true,
          includeInitial: true,
          mayBeAbsent: false,
          values: [],
        };
        state.values.push(STATIC_NON_COPY_NUMBER);
        record.propertyWrites.set(propertyName, state);
      }
    }
  }

  function recordObjectAssign(call, replace) {
    const [target, ...sources] = call.arguments;
    if (!target) {
      return;
    }
    for (const source of sources) {
      const resolved = staticObjectAssignEntries(source);
      if (!resolved) {
        recordPropertyWrite(target, null, null);
        continue;
      }
      for (const [propertyName, value, mayBeAbsent] of resolved.entries) {
        recordPropertyWrite(target, propertyName, value, {
          replace: replace && !mayBeAbsent,
        });
      }
      for (const value of resolved.unknownValues) {
        recordPropertyWrite(target, null, value);
      }
      if (!resolved.complete) {
        recordPropertyWrite(target, null, null);
      }
    }
  }

  function mutationWritesInEvaluationOrder(writes) {
    return [...writes].sort((left, right) => {
      if (left.node === right.node) {
        return 0;
      }
      if (mutationNodeContains(left.node, right.node)) {
        return 1;
      }
      if (mutationNodeContains(right.node, left.node)) {
        return -1;
      }
      return left.node.pos - right.node.pos;
    });
  }

  function staticCallableReturnValue(callable) {
    const current = unwrapCopyExpression(callable);
    if (ts.isArrowFunction(current) && !ts.isBlock(current.body)) {
      return current.body;
    }
    if (
      !(
        ts.isGetAccessorDeclaration(current)
        || ts.isMethodDeclaration(current)
        || ts.isFunctionExpression(current)
        || ts.isArrowFunction(current)
      )
      || !current.body
      || current.body.statements.length !== 1
      || !ts.isReturnStatement(current.body.statements[0])
      || !current.body.statements[0].expression
    ) {
      return current;
    }
    return current.body.statements[0].expression;
  }

  function standardMutationInitialProperty(initializer, propertyName) {
    const directProperty = standardMutationRepositoryInitialProperty(
      initializer,
      propertyName,
    );
    if (directProperty) {
      return directProperty;
    }
    const current = unwrapCopyExpression(initializer);
    if (!ts.isObjectLiteralExpression(current)) {
      return undefined;
    }
    for (let index = current.properties.length - 1; index >= 0; index -= 1) {
      const property = current.properties[index];
      if (
        ts.isGetAccessorDeclaration(property)
        && staticObjectPropertyName(property.name) === propertyName
      ) {
        return staticCallableReturnValue(property);
      }
    }
    return undefined;
  }

  function standardMutationNestedValue(initializer, path) {
    return repositoryNestedValue(
      initializer,
      path,
      standardMutationPropertyName,
    );
  }

  function standardMutationRepositoryInitialProperty(initializer, propertyName) {
    return repositoryInitialProperty(
      initializer,
      propertyName,
      standardMutationPropertyName,
    );
  }

  function standardMutationPropertyName(name) {
    return staticMutationBindingPropertyName(name, checker, sourceRoot);
  }

  function staticObjectAssignEntries(expression, visitedInitializers = new Set()) {
    const current = unwrapCopyExpression(expression);
    const initializer = ts.isObjectLiteralExpression(current)
      ? current
      : mutationInitializer(current);
    if (
      !initializer
      || !ts.isObjectLiteralExpression(initializer)
      || visitedInitializers.has(initializer)
    ) {
      return undefined;
    }
    visitedInitializers.add(initializer);
    const entriesByName = new Map();
    const unknownValues = [];
    let complete = true;
    for (const property of initializer.properties) {
      if (ts.isPropertyAssignment(property)) {
        const propertyName = staticObjectPropertyName(property.name);
        if (propertyName === null) {
          complete = false;
          unknownValues.push(property.initializer);
        } else {
          entriesByName.set(propertyName, [property.initializer, false]);
        }
      } else if (ts.isShorthandPropertyAssignment(property)) {
        entriesByName.set(property.name.text, [property.name, false]);
      } else if (ts.isGetAccessorDeclaration(property)) {
        const propertyName = staticObjectPropertyName(property.name);
        if (propertyName === null) {
          complete = false;
          unknownValues.push(property);
        } else {
          entriesByName.set(propertyName, [
            staticCallableReturnValue(property),
            false,
          ]);
        }
      } else if (ts.isMethodDeclaration(property)) {
        const propertyName = staticObjectPropertyName(property.name);
        if (propertyName === null) {
          complete = false;
          unknownValues.push(property);
        } else {
          entriesByName.set(propertyName, [property, false]);
        }
      } else if (ts.isSpreadAssignment(property)) {
        const spread = staticObjectAssignEntries(
          property.expression,
          visitedInitializers,
        );
        if (!spread) {
          complete = false;
        } else {
          for (const [propertyName, value, mayBeAbsent] of spread.entries) {
            entriesByName.set(propertyName, [value, mayBeAbsent]);
          }
          unknownValues.push(...spread.unknownValues);
          complete &&= spread.complete;
        }
      } else {
        complete = false;
      }
    }
    const mutation = mutationByInitializer.get(initializer);
    if (mutation) {
      for (const [propertyName, state] of mutation.propertyWrites) {
        if (state.enumerable === false) {
          entriesByName.delete(propertyName);
          continue;
        }
        const initial = entriesByName.get(propertyName)?.[0];
        const candidates = [
          ...(state.includeInitial && initial ? [initial] : []),
          ...state.values,
        ];
        if (candidates.length === 0) {
          entriesByName.delete(propertyName);
          continue;
        }
        const mayBeAbsent = state.mayBeAbsent || (state.includeInitial && !initial);
        entriesByName.set(propertyName, [
          candidates.length === 1
            ? candidates[0]
            : staticAlternatives(candidates, mayBeAbsent),
          mayBeAbsent,
        ]);
      }
      unknownValues.push(...mutation.unknownPropertyWrites);
      complete &&= !mutation.hasUnknownPropertyWrite;
    }
    visitedInitializers.delete(initializer);
    return {
      complete,
      entries: [...entriesByName].map(([propertyName, [value, mayBeAbsent]]) =>
        [propertyName, value, mayBeAbsent]
      ),
      unknownValues,
    };
  }

  function recordDefinedProperty(call, replace) {
    const [target, propertyExpression, descriptorExpression] = call.arguments;
    const propertyName = staticMutationPropertyName(propertyExpression);
    recordDescriptorProperty(
      target,
      propertyName,
      descriptorExpression,
      replace,
    );
  }

  function recordDescriptorProperty(
    target,
    propertyName,
    descriptorExpression,
    replace,
  ) {
    if (!target || !descriptorExpression) {
      recordPropertyWrite(target, null, null);
      return;
    }
    const descriptor = staticObjectAssignEntries(descriptorExpression);
    if (!descriptor) {
      recordPropertyWrite(target, null, null);
      return;
    }
    const valueEntry = descriptor.entries.find(([name]) => name === "value");
    const getterEntry = descriptor.entries.find(([name]) => name === "get");
    const enumerableEntry = descriptor.entries.find(([name]) => name === "enumerable");
    const enumerable = enumerableEntry
      ? mutationTruthiness(enumerableEntry[1])
      : "preserve";
    const productiveEntry = valueEntry ?? getterEntry;
    if (productiveEntry) {
      const [, rawValue, mayBeAbsent] = productiveEntry;
      const value = valueEntry ? rawValue : staticCallableReturnValue(rawValue);
      recordPropertyWrite(target, propertyName, value, {
        enumerable,
        replace: replace && !mayBeAbsent,
      });
    }
    for (const value of descriptor.unknownValues) {
      recordPropertyWrite(target, propertyName, value);
    }
    if (!productiveEntry || !descriptor.complete || productiveEntry[2]) {
      recordPropertyWrite(target, propertyName, null);
    }
  }

  function recordDefinedProperties(call, replace) {
    const [target, descriptorsExpression] = call.arguments;
    const descriptors = descriptorsExpression
      ? staticObjectAssignEntries(descriptorsExpression)
      : undefined;
    if (!target || !descriptors) {
      recordPropertyWrite(target, null, null);
      return;
    }
    for (const [propertyName, descriptorExpression, mayBeAbsent] of descriptors.entries) {
      recordDescriptorProperty(
        target,
        propertyName,
        descriptorExpression,
        replace && !mayBeAbsent,
      );
    }
    for (const value of descriptors.unknownValues) {
      recordDescriptorProperty(target, null, value, false);
    }
    if (!descriptors.complete) {
      recordPropertyWrite(target, null, null);
    }
  }

  function currentKnownPropertyValue(targetOwner, propertyName) {
    if (propertyName === null) {
      return undefined;
    }
    const initializer = mutationInitializer(targetOwner);
    if (!initializer) {
      return undefined;
    }
    const state = mutationByInitializer
      .get(initializer)
      ?.propertyWrites
      .get(propertyName);
    if (!state) {
      return repositoryInitialProperty(initializer, propertyName);
    }
    return state.includeInitial === false && state.values.length === 1
      ? state.values[0]
      : undefined;
  }

  function mutationCanReplace(targetExpression, node) {
    const initializer = mutationInitializer(targetExpression);
    return Boolean(
      initializer
      && initializer.getSourceFile() === node.getSourceFile()
      && initializer.pos < node.pos
      && mutationWriteIsDeterministic(
        node,
        mutationTruthiness,
        mutationNullishness,
      ),
    );
  }

  function mutationIdentifierIsGlobalUndefined(value) {
    const current = value ? unwrapCopyExpression(value) : undefined;
    if (!current || !ts.isIdentifier(current) || current.text !== "undefined") {
      return false;
    }
    const symbol = resolveAliasedSymbol(
      checker.getSymbolAtLocation(current),
      checker,
    );
    return !symbol || !(symbol.declarations ?? []).some((declaration) =>
      sourceFileIsProductive(declaration.getSourceFile(), sourceRoot)
    );
  }

  function mutationTruthiness(value, visitedSymbols = new Set()) {
    const current = value ? unwrapCopyExpression(value) : undefined;
    if (
      current
      && ts.isIdentifier(current)
      && current.text === "undefined"
      && !mutationIdentifierIsGlobalUndefined(current)
    ) {
      return undefined;
    }
    const truthiness = staticMutationTruthiness(value);
    if (truthiness !== undefined || !current || !ts.isIdentifier(current)) {
      return truthiness;
    }
    const symbol = resolveAliasedSymbol(
      checker.getSymbolAtLocation(current),
      checker,
    );
    if (!symbol || visitedSymbols.has(symbol)) {
      return undefined;
    }
    const initializer = repositoryConstInitializerFromSymbol(symbol, { sourceRoot });
    if (!initializer) {
      return undefined;
    }
    visitedSymbols.add(symbol);
    return mutationTruthiness(initializer, visitedSymbols);
  }

  function mutationNullishness(value) {
    const current = value ? unwrapCopyExpression(value) : undefined;
    if (
      current
      && ts.isIdentifier(current)
      && current.text === "undefined"
      && !mutationIdentifierIsGlobalUndefined(current)
    ) {
      return undefined;
    }
    return staticMutationNullishness(value);
  }

  function assignmentExecution(node, targetOwner, propertyName) {
    if (mutationIsStaticallyUnreachable(node, mutationTruthiness, mutationNullishness)) {
      return "never";
    }
    if (![
      ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
    ].includes(node.operatorToken.kind)) {
      return "always";
    }
    const currentValue = currentKnownPropertyValue(targetOwner, propertyName);
    const truthiness = mutationTruthiness(currentValue);
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken) {
      return truthiness === true ? "never" : truthiness === false ? "always" : "maybe";
    }
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken) {
      return truthiness === false ? "never" : truthiness === true ? "always" : "maybe";
    }
    const nullishness = mutationNullishness(currentValue);
    return nullishness === false ? "never" : nullishness === true ? "always" : "maybe";
  }

  function recordArrayMutation(receiver, methodName, args, node) {
    const record = mutationRecord(receiver);
    const initializer = mutationInitializer(receiver);
    if (!record || !initializer) {
      return;
    }
    const replace = mutationCanReplace(receiver, node);
    if (
      replace
      && ts.isArrayLiteralExpression(initializer)
      && Number.isInteger(record.arrayLength)
    ) {
      const sequence = Array.from(
        { length: record.arrayLength },
        (_, index) => currentArrayIndexCandidates(initializer, record, index),
      );
      if (methodName === "push") {
        sequence.push(...[...args].map((value) => [value]));
        replaceArraySequence(record, sequence);
        return;
      }
      if (methodName === "pop") {
        sequence.pop();
        replaceArraySequence(record, sequence);
        return;
      }
      if (methodName === "shift") {
        sequence.shift();
        replaceArraySequence(record, sequence);
        return;
      }
      if (methodName === "unshift") {
        sequence.unshift(...[...args].map((value) => [value]));
        replaceArraySequence(record, sequence);
        return;
      }
      if (methodName === "reverse") {
        sequence.reverse();
        replaceArraySequence(record, sequence);
        return;
      }
      if (methodName === "splice") {
        const rawStart = staticMutationNumber(args[0]);
        const rawDeleteCount = args[1] ? staticMutationNumber(args[1]) : undefined;
        if (rawStart !== undefined && (!args[1] || rawDeleteCount !== undefined)) {
          const start = normalizedArrayIndex(rawStart, sequence.length);
          const deleteCount = rawDeleteCount === undefined
            ? sequence.length - start
            : Math.min(Math.max(0, Math.trunc(rawDeleteCount)), sequence.length - start);
          sequence.splice(
            start,
            deleteCount,
            ...[...args].slice(2).map((value) => [value]),
          );
          replaceArraySequence(record, sequence);
          return;
        }
      }
      if (methodName === "copyWithin") {
        const rawTarget = staticMutationNumber(args[0]);
        const rawStart = staticMutationNumber(args[1]);
        const rawEnd = args[2] ? staticMutationNumber(args[2]) : sequence.length;
        if (rawTarget !== undefined && rawStart !== undefined && rawEnd !== undefined) {
          const target = normalizedArrayIndex(rawTarget, sequence.length);
          const start = normalizedArrayIndex(rawStart, sequence.length);
          const end = normalizedArrayIndex(rawEnd, sequence.length);
          const copied = sequence.slice(start, end);
          for (
            let offset = 0;
            offset < copied.length && target + offset < sequence.length;
            offset += 1
          ) {
            sequence[target + offset] = copied[offset];
          }
          replaceArraySequence(record, sequence);
          return;
        }
      }
      if (methodName === "sort") {
        const candidates = [...new Set(sequence.flat())];
        replaceArraySequence(
          record,
          sequence.map(() => candidates),
        );
        return;
      }
    }
    if (methodName === "fill") {
      const value = args[0];
      const rawStart = args[1] ? staticMutationNumber(args[1]) : 0;
      const rawEnd = args[2] ? staticMutationNumber(args[2]) : record.arrayLength;
      if (
        value
        && rawStart !== undefined
        && rawEnd !== undefined
        && Number.isInteger(record.arrayLength)
      ) {
        const start = normalizedArrayIndex(rawStart, record.arrayLength);
        const end = normalizedArrayIndex(rawEnd, record.arrayLength);
        for (let index = start; index < Math.min(end, record.arrayLength); index += 1) {
          recordPropertyWrite(receiver, String(index), value, { replace });
        }
        return;
      }
    }
    const insertedValues = mutationMethodInsertedValues(methodName, args);
    if (insertedValues.length === 0) {
      recordPropertyWrite(receiver, null, null);
      return;
    }
    for (const value of insertedValues) {
      recordPropertyWrite(receiver, null, value);
    }

    function currentArrayIndexCandidates(arrayInitializer, mutation, index) {
      const state = mutation.propertyWrites.get(String(index));
      const initial = repositoryInitialProperty(arrayInitializer, String(index));
      return [
        ...(state?.includeInitial === false ? [] : [initial]),
        ...(state?.values ?? []),
      ].filter(Boolean);
    }

    function replaceArraySequence(mutation, sequence) {
      const previousLength = mutation.arrayLength;
      for (let index = 0; index < Math.max(previousLength, sequence.length); index += 1) {
        mutation.propertyWrites.set(String(index), {
          includeInitial: false,
          values: sequence[index] ?? [],
        });
      }
      mutation.arrayLength = sequence.length;
    }
  }

  function recordStandardMutationCall(api, node) {
    const replace = mutationCanReplace(node.arguments[0], node);
    if (api === "Object.assign") {
      recordObjectAssign(node, replace);
    } else if (api === "Object.defineProperty") {
      recordDefinedProperty(node, replace);
    } else if (api === "Object.defineProperties") {
      recordDefinedProperties(node, replace);
    } else if (api === "Object.setPrototypeOf") {
      recordPropertyWrite(node.arguments[0], null, null);
    } else if (api === "Reflect.set") {
      recordPropertyWrite(
        node.arguments[0],
        staticMutationPropertyName(node.arguments[1]),
        node.arguments[2],
        { replace },
      );
    } else if (api === "Reflect.defineProperty") {
      recordDefinedProperty(node, replace);
    } else {
      recordPropertyWrite(node.arguments[0], null, null);
    }
  }

  function standardMutationCandidatesFromMemberAuthorities(authorities, usageNode) {
    return authorities.flatMap((authority) => {
      if (authority.apis) {
        return [...authority.apis].map((api) => ({ api }));
      }
      if (authority.sourceSymbol) {
        const candidates = standardMutationCandidatesAtSymbol(
          authority.sourceSymbol,
          authority.captureNode ?? usageNode,
        );
        if (!authority.mutationApiHint) {
          return candidates;
        }
        const sourceCandidates = candidates.length > 0
          ? candidates
          : [{ value: standardMutationUnknownValue }];
        return sourceCandidates.map((candidate) => candidate.api
          ? candidate
          : {
              ...candidate,
              mutationApiHint:
                candidate.mutationApiHint ?? authority.mutationApiHint,
            });
      }
      return [{
        mutationApiHint: authority.mutationApiHint,
        value: authority.value ?? standardMutationUnknownValue,
      }];
    });
  }

  const mutatingMethodNames = new Set([
    "add",
    "clear",
    "copyWithin",
    "delete",
    "fill",
    "pop",
    "push",
    "reverse",
    "set",
    "shift",
    "sort",
    "splice",
    "unshift",
  ]);
  const standardMutationMethodNames = new Set(
    [...STANDARD_MUTATION_APIS].map((api) => api.slice(api.indexOf(".") + 1)),
  );
  for (const sourceFile of sourceFiles) {
    function collectMutations(node) {
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        && (
          ts.isPropertyAccessExpression(node.left)
          || ts.isElementAccessExpression(node.left)
        )
      ) {
        const targetOwner = node.left.expression;
        const propertyName = accessPropertyName(node.left);
        const execution = assignmentExecution(node, targetOwner, propertyName);
        if (execution !== "never") {
          recordPropertyWrite(targetOwner, propertyName, node.right, {
            replace: execution === "always" && mutationCanReplace(targetOwner, node),
          });
        }
      } else if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
        && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken]
          .includes(node.operator)
        && (
          ts.isPropertyAccessExpression(node.operand)
          || ts.isElementAccessExpression(node.operand)
        )
      ) {
        if (!mutationIsStaticallyUnreachable(node, mutationTruthiness, mutationNullishness)) {
          recordPropertyOpaqueUpdate(
            node.operand.expression,
            accessPropertyName(node.operand),
            mutationCanReplace(node.operand.expression, node),
          );
        }
      } else if (ts.isDeleteExpression(node)) {
        if (!mutationIsStaticallyUnreachable(node, mutationTruthiness, mutationNullishness)) {
          const target = unwrapCopyExpression(node.expression);
          if (
            ts.isPropertyAccessExpression(target)
            || ts.isElementAccessExpression(target)
          ) {
            recordPropertyRemoval(
              target.expression,
              accessPropertyName(target),
              mutationCanReplace(target.expression, node),
            );
          }
        }
      } else if (
        ts.isCallExpression(node)
        && (
          ts.isPropertyAccessExpression(node.expression)
          || ts.isElementAccessExpression(node.expression)
        )
        && !mutationIsStaticallyUnreachable(node, mutationTruthiness, mutationNullishness)
      ) {
        const receiver = node.expression.expression;
        const methodName = staticMutationAccessPropertyName(
          node.expression,
          checker,
          sourceRoot,
        );
        const standardMutationApi = standardMutationApiName(
          node.expression,
          checker,
          sourceRoot,
          standardMutationNamespaceBySymbol,
        );
        const memberAuthorities = standardMutationApi
          ? [{ apis: new Set([standardMutationApi]) }]
          : standardMutationApiAuthorities(node.expression);
        const memberCandidates = standardMutationCandidatesFromMemberAuthorities(
          memberAuthorities,
          node,
        );
        const resolvedMutationApis = memberCandidates.flatMap(
          (candidate) => candidate.api ? [candidate.api] : [],
        );
        const opaqueMutationCandidates = memberCandidates.filter(
          (candidate) => !candidate.api && candidate.mutationApiHint,
        );
        let handledStandardMutation = false;
        if (resolvedMutationApis.length > 0) {
          for (const api of new Set(resolvedMutationApis)) {
            recordStandardMutationCall(api, node);
          }
          handledStandardMutation = true;
        }
        for (const candidate of opaqueMutationCandidates) {
          recordPropertyWrite(
            node.arguments[0],
            null,
            candidate.value === standardMutationUnknownValue
              ? null
              : candidate.value,
          );
          handledStandardMutation = true;
        }
        if (
          !handledStandardMutation
          && methodName
          && standardMutationMethodNames.has(methodName)
          && memberCandidates.some((candidate) => !candidate.api)
        ) {
          const opaqueAuthorityValues = memberCandidates.flatMap((candidate) =>
            candidate.value ? [candidate.value] : []
          );
          if (opaqueAuthorityValues.length === 0) {
            recordPropertyWrite(node.arguments[0], null, null);
          } else {
            for (const value of opaqueAuthorityValues) {
              recordPropertyWrite(node.arguments[0], null, value);
            }
          }
          handledStandardMutation = true;
        }
        if (
          !handledStandardMutation
          && methodName
          && mutatingMethodNames.has(methodName)
        ) {
          recordArrayMutation(receiver, methodName, node.arguments, node);
        }
      } else if (
        ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && !mutationIsStaticallyUnreachable(node, mutationTruthiness, mutationNullishness)
      ) {
        const symbol = resolveAliasedSymbol(
          checker.getSymbolAtLocation(node.expression),
          checker,
        );
        const candidates = symbol
          ? standardMutationCandidatesAtSymbol(symbol, node)
          : [];
        for (const candidate of candidates) {
          if (candidate.api) {
            recordStandardMutationCall(candidate.api, node);
          } else if (candidate.mutationApiHint) {
            recordPropertyWrite(
              node.arguments[0],
              null,
              candidate.value === standardMutationUnknownValue
                ? null
                : candidate.value,
            );
          }
        }
      }
      ts.forEachChild(node, collectMutations);
    }
    collectMutations(sourceFile);
  }
  return mutationByInitializer;
}

function repositoryExpressionReference(expression, checker, initializerBySymbol) {
  const current = unwrapCopyExpression(expression);
  if (ts.isIdentifier(current)) {
    const symbol = resolveAliasedSymbol(
      checker.getSymbolAtLocation(current),
      checker,
    );
    return symbol ? { path: [], symbol } : undefined;
  }
  if (
    !ts.isPropertyAccessExpression(current)
    && !ts.isElementAccessExpression(current)
  ) {
    return undefined;
  }
  const memberNode = ts.isPropertyAccessExpression(current)
    ? current.name
    : current.argumentExpression;
  const memberSymbol = memberNode
    ? resolveAliasedSymbol(checker.getSymbolAtLocation(memberNode), checker)
    : undefined;
  if (memberSymbol && initializerBySymbol.has(memberSymbol)) {
    return { path: [], symbol: memberSymbol };
  }
  const owner = repositoryExpressionReference(
    current.expression,
    checker,
    initializerBySymbol,
  );
  const propertyName = accessPropertyName(current);
  return owner && propertyName !== null
    ? { path: [...owner.path, propertyName], symbol: owner.symbol }
    : undefined;
}

function repositoryNestedInitializer(initializer, path) {
  const current = repositoryNestedValue(initializer, path);
  return current && (
    ts.isObjectLiteralExpression(current)
    || ts.isArrayLiteralExpression(current)
  )
    ? current
    : undefined;
}

function repositoryNestedValue(
  initializer,
  path,
  propertyNameResolver = staticObjectPropertyName,
) {
  let current = unwrapCopyExpression(initializer);
  for (const propertyName of path) {
    const property = repositoryInitialProperty(
      current,
      propertyName,
      propertyNameResolver,
    );
    if (!property) {
      return undefined;
    }
    current = unwrapCopyExpression(property);
  }
  return current;
}

function repositoryInitialProperty(
  initializer,
  propertyName,
  propertyNameResolver = staticObjectPropertyName,
) {
  const current = unwrapCopyExpression(initializer);
  if (ts.isArrayLiteralExpression(current)) {
    const index = staticArrayIndex(propertyName);
    const element = index === null ? undefined : current.elements[index];
    return element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)
      ? element
      : undefined;
  }
  if (!ts.isObjectLiteralExpression(current)) {
    return undefined;
  }
  for (let index = current.properties.length - 1; index >= 0; index -= 1) {
    const property = current.properties[index];
    if (
      (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
      && propertyNameResolver(property.name) === propertyName
    ) {
      return ts.isPropertyAssignment(property) ? property.initializer : property.name;
    }
  }
  return undefined;
}

function staticMutationTruthiness(value) {
  if (!value) {
    return undefined;
  }
  const current = unwrapCopyExpression(value);
  const bigintValue = staticMutationBigIntValue(current);
  if (
    current.kind === ts.SyntaxKind.FalseKeyword
    || current.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(current) && current.text === "undefined")
    || (ts.isNumericLiteral(current) && Number(current.text) === 0)
    || bigintValue === 0n
    || (
      (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
      && current.text.length === 0
    )
  ) {
    return false;
  }
  if (
    current.kind === ts.SyntaxKind.TrueKeyword
    || (ts.isNumericLiteral(current) && Number(current.text) !== 0)
    || (bigintValue !== undefined && bigintValue !== 0n)
    || (
      (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
      && current.text.length > 0
    )
    || ts.isObjectLiteralExpression(current)
    || ts.isArrayLiteralExpression(current)
    || ts.isArrowFunction(current)
    || ts.isFunctionExpression(current)
    || ts.isClassExpression(current)
  ) {
    return true;
  }
  return undefined;
}

function staticMutationNullishness(value) {
  if (!value) {
    return undefined;
  }
  const current = unwrapCopyExpression(value);
  const bigintValue = staticMutationBigIntValue(current);
  if (
    current.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(current) && current.text === "undefined")
  ) {
    return true;
  }
  if (
    current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || ts.isStringLiteral(current)
    || ts.isNoSubstitutionTemplateLiteral(current)
    || ts.isNumericLiteral(current)
    || bigintValue !== undefined
    || ts.isObjectLiteralExpression(current)
    || ts.isArrayLiteralExpression(current)
    || ts.isArrowFunction(current)
    || ts.isFunctionExpression(current)
    || ts.isClassExpression(current)
  ) {
    return false;
  }
  return undefined;
}

function staticMutationBigIntValue(value) {
  const current = unwrapCopyExpression(value);
  if (ts.isBigIntLiteral(current)) {
    return BigInt(current.text.replaceAll("_", "").replace(/n$/i, ""));
  }
  if (
    ts.isPrefixUnaryExpression(current)
    && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(current.operator)
  ) {
    const operand = unwrapCopyExpression(current.operand);
    if (ts.isBigIntLiteral(operand)) {
      const operandValue = BigInt(
        operand.text.replaceAll("_", "").replace(/n$/i, ""),
      );
      return current.operator === ts.SyntaxKind.MinusToken
        ? -operandValue
        : operandValue;
    }
  }
  return undefined;
}

function mutationShortCircuitExecution(
  node,
  truthinessOf = staticMutationTruthiness,
  nullishnessOf = staticMutationNullishness,
) {
  if (!ts.isBinaryExpression(node)) {
    return undefined;
  }
  const operatorKind = node.operatorToken.kind;
  if (
    operatorKind === ts.SyntaxKind.AmpersandAmpersandToken
    || operatorKind === ts.SyntaxKind.AmpersandAmpersandEqualsToken
  ) {
    const truthiness = truthinessOf(node.left);
    return truthiness === true ? "always" : truthiness === false ? "never" : "maybe";
  }
  if (
    operatorKind === ts.SyntaxKind.BarBarToken
    || operatorKind === ts.SyntaxKind.BarBarEqualsToken
  ) {
    const truthiness = truthinessOf(node.left);
    return truthiness === false ? "always" : truthiness === true ? "never" : "maybe";
  }
  if (
    operatorKind === ts.SyntaxKind.QuestionQuestionToken
    || operatorKind === ts.SyntaxKind.QuestionQuestionEqualsToken
  ) {
    const nullishness = nullishnessOf(node.left);
    return nullishness === true ? "always" : nullishness === false ? "never" : "maybe";
  }
  return undefined;
}

function mutationWriteIsDeterministic(
  node,
  truthinessOf = staticMutationTruthiness,
  nullishnessOf = staticMutationNullishness,
) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (ts.isFunctionLike(parent) || ts.isClassStaticBlockDeclaration(parent)) {
      return false;
    }
    if (ts.isIfStatement(parent)) {
      const truthiness = truthinessOf(parent.expression);
      if (truthiness === undefined) {
        return false;
      }
    } else if (ts.isConditionalExpression(parent)) {
      const truthiness = truthinessOf(parent.condition);
      if (truthiness === undefined) {
        return false;
      }
    } else if (
      ts.isWhileStatement(parent)
      || ts.isDoStatement(parent)
      || ts.isForStatement(parent)
      || ts.isForInStatement(parent)
      || ts.isForOfStatement(parent)
      || ts.isSwitchStatement(parent)
      || ts.isTryStatement(parent)
    ) {
      return false;
    } else if (ts.isBinaryExpression(parent) && current === parent.right) {
      const execution = mutationShortCircuitExecution(
        parent,
        truthinessOf,
        nullishnessOf,
      );
      if (execution && execution !== "always") {
        return false;
      }
    }
    current = parent;
  }
  return true;
}

function mutationWriteIsDeterministicBeforeUsage(
  node,
  usageExpression,
  truthinessOf = staticMutationTruthiness,
  nullishnessOf = staticMutationNullishness,
) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (ts.isFunctionLike(parent) || ts.isClassStaticBlockDeclaration(parent)) {
      if (!mutationNodeContains(parent, usageExpression)) {
        return false;
      }
    } else if (ts.isIfStatement(parent)) {
      const truthiness = truthinessOf(parent.expression);
      if (truthiness === undefined && !mutationNodeContains(current, usageExpression)) {
        return false;
      }
    } else if (ts.isConditionalExpression(parent)) {
      const truthiness = truthinessOf(parent.condition);
      if (truthiness === undefined && !mutationNodeContains(current, usageExpression)) {
        return false;
      }
    } else if (ts.isCaseClause(parent) || ts.isDefaultClause(parent)) {
      if (!mutationNodeContains(parent, usageExpression)) {
        return false;
      }
    } else if (
      ts.isWhileStatement(parent)
      || ts.isDoStatement(parent)
      || ts.isForStatement(parent)
      || ts.isForInStatement(parent)
      || ts.isForOfStatement(parent)
      || ts.isSwitchStatement(parent)
      || ts.isTryStatement(parent)
    ) {
      if (!mutationNodeContains(current, usageExpression)) {
        return false;
      }
    } else if (ts.isBinaryExpression(parent) && current === parent.right) {
      const execution = mutationShortCircuitExecution(
        parent,
        truthinessOf,
        nullishnessOf,
      );
      if (
        execution
        && execution !== "always"
        && !mutationNodeContains(current, usageExpression)
      ) {
        return false;
      }
    }
    current = parent;
  }
  return true;
}

function mutationNodeContains(container, node) {
  return container.getSourceFile() === node.getSourceFile()
    && container.pos <= node.pos
    && container.end >= node.end;
}

function mutationExecutionPathsMayOverlap(node, usageExpression) {
  if (node.getSourceFile() !== usageExpression.getSourceFile()) {
    return true;
  }
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (ts.isIfStatement(parent)) {
      if (
        current === parent.thenStatement
        && parent.elseStatement
        && mutationNodeContains(parent.elseStatement, usageExpression)
      ) {
        return false;
      }
      if (
        current === parent.elseStatement
        && mutationNodeContains(parent.thenStatement, usageExpression)
      ) {
        return false;
      }
    } else if (ts.isConditionalExpression(parent)) {
      if (
        (current === parent.whenTrue && mutationNodeContains(parent.whenFalse, usageExpression))
        || (current === parent.whenFalse && mutationNodeContains(parent.whenTrue, usageExpression))
      ) {
        return false;
      }
    }
    current = parent;
  }

  const assignmentClause = enclosingSwitchClause(node);
  const usageClause = enclosingSwitchClause(usageExpression);
  if (
    !assignmentClause
    || !usageClause
    || assignmentClause.switchStatement !== usageClause.switchStatement
    || assignmentClause.clause === usageClause.clause
  ) {
    return true;
  }
  const clauses = assignmentClause.switchStatement.caseBlock.clauses;
  const assignmentIndex = clauses.indexOf(assignmentClause.clause);
  const usageIndex = clauses.indexOf(usageClause.clause);
  if (assignmentIndex > usageIndex) {
    return false;
  }
  return !clauses.slice(assignmentIndex, usageIndex).some((clause) =>
    clause.statements.some((statement) =>
      ts.isBreakStatement(statement)
      || ts.isReturnStatement(statement)
      || ts.isThrowStatement(statement)
    )
  );
}

function enclosingSwitchClause(node) {
  let current = node;
  while (current.parent) {
    if (ts.isCaseClause(current) || ts.isDefaultClause(current)) {
      const caseBlock = current.parent;
      if (ts.isCaseBlock(caseBlock) && ts.isSwitchStatement(caseBlock.parent)) {
        return { clause: current, switchStatement: caseBlock.parent };
      }
    }
    current = current.parent;
  }
  return undefined;
}

function mutationIsStaticallyUnreachable(
  node,
  truthinessOf = staticMutationTruthiness,
  nullishnessOf = staticMutationNullishness,
) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (ts.isIfStatement(parent)) {
      const truthiness = truthinessOf(parent.expression);
      if (
        (current === parent.thenStatement && truthiness === false)
        || (current === parent.elseStatement && truthiness === true)
      ) {
        return true;
      }
    }
    if (ts.isConditionalExpression(parent)) {
      const truthiness = truthinessOf(parent.condition);
      if (
        (current === parent.whenTrue && truthiness === false)
        || (current === parent.whenFalse && truthiness === true)
      ) {
        return true;
      }
    }
    if (ts.isBinaryExpression(parent) && current === parent.right) {
      if (
        mutationShortCircuitExecution(parent, truthinessOf, nullishnessOf)
        === "never"
      ) {
        return true;
      }
    }
    if (
      (ts.isWhileStatement(parent) || ts.isForStatement(parent))
      && current === parent.statement
    ) {
      const condition = ts.isWhileStatement(parent) ? parent.expression : parent.condition;
      if (condition && truthinessOf(condition) === false) {
        return true;
      }
    }
    current = parent;
  }
  return false;
}

function staticMutationNumber(expression) {
  if (!expression) {
    return undefined;
  }
  const current = unwrapCopyExpression(expression);
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (
    ts.isPrefixUnaryExpression(current)
    && current.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(current.operand)
  ) {
    return -Number(current.operand.text);
  }
  return undefined;
}

function normalizedArrayIndex(rawIndex, length) {
  const index = Math.trunc(rawIndex);
  return index < 0
    ? Math.max(length + index, 0)
    : Math.min(index, length);
}

function standardMutationApiName(
  expression,
  checker,
  sourceRoot,
  standardMutationNamespaceBySymbol,
) {
  const current = unwrapCopyExpression(expression);
  if (
    !ts.isPropertyAccessExpression(current)
    && !ts.isElementAccessExpression(current)
  ) {
    return undefined;
  }
  const namespace = standardMutationNamespaceName(
    current.expression,
    checker,
    sourceRoot,
    standardMutationNamespaceBySymbol,
  );
  if (!namespace) {
    return undefined;
  }
  const propertyName = staticMutationAccessPropertyName(
    current,
    checker,
    sourceRoot,
  );
  if (propertyName === null) {
    return undefined;
  }
  const api = `${namespace}.${propertyName}`;
  return STANDARD_MUTATION_APIS.has(api) ? api : undefined;
}

function standardMutationNamespaceName(
  expression,
  checker,
  sourceRoot,
  standardMutationNamespaceBySymbol,
) {
  const current = unwrapCopyExpression(expression);
  if (!ts.isIdentifier(current)) {
    return undefined;
  }
  const receiverSymbol = resolveAliasedSymbol(
    checker.getSymbolAtLocation(current),
    checker,
  );
  const aliasedNamespace = receiverSymbol
    ? standardMutationNamespaceBySymbol?.get(receiverSymbol)
    : undefined;
  if (aliasedNamespace) {
    return aliasedNamespace;
  }
  if (!["Object", "Reflect"].includes(current.text)) {
    return undefined;
  }
  if (
    receiverSymbol
    && (receiverSymbol.declarations ?? []).some((declaration) =>
      sourceFileIsProductive(declaration.getSourceFile(), sourceRoot)
    )
  ) {
    return undefined;
  }
  return current.text;
}

function staticMutationAccessPropertyName(access, checker, sourceRoot) {
  const direct = accessPropertyName(access);
  if (direct !== null || !ts.isElementAccessExpression(access)) {
    return direct;
  }
  return staticMutationExpressionPropertyName(
    access.argumentExpression,
    checker,
    sourceRoot,
  );
}

function staticMutationBindingPropertyName(name, checker, sourceRoot) {
  const direct = staticObjectPropertyName(name);
  if (direct !== null || !ts.isComputedPropertyName(name)) {
    return direct;
  }
  return staticMutationExpressionPropertyName(name.expression, checker, sourceRoot);
}

function staticMutationExpressionPropertyName(
  expression,
  checker,
  sourceRoot,
  visitedSymbols = new Set(),
) {
  const current = unwrapCopyExpression(expression);
  if (
    ts.isStringLiteral(current)
    || ts.isNoSubstitutionTemplateLiteral(current)
    || ts.isNumericLiteral(current)
  ) {
    return current.text;
  }
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const symbol = resolveAliasedSymbol(
    checker.getSymbolAtLocation(current),
    checker,
  );
  if (!symbol || visitedSymbols.has(symbol)) {
    return null;
  }
  visitedSymbols.add(symbol);
  const initializer = repositoryConstInitializerFromSymbol(symbol, { sourceRoot });
  return initializer
    ? staticMutationExpressionPropertyName(
        initializer,
        checker,
        sourceRoot,
        visitedSymbols,
      )
    : null;
}

function mutationMethodInsertedValues(methodName, args) {
  if (["push", "unshift"].includes(methodName)) {
    return [...args];
  }
  if (methodName === "splice") {
    return [...args].slice(2);
  }
  if (["add", "fill"].includes(methodName)) {
    return args[0] ? [args[0]] : [];
  }
  if (methodName === "set") {
    return args[1] ? [args[1]] : [];
  }
  return [];
}

function staticMutationPropertyName(expression) {
  if (!expression) {
    return null;
  }
  const unwrapped = unwrapCopyExpression(expression);
  return (
    ts.isStringLiteral(unwrapped)
    || ts.isNoSubstitutionTemplateLiteral(unwrapped)
    || ts.isNumericLiteral(unwrapped)
  )
    ? unwrapped.text
    : null;
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
    (
      ts.isStringLiteral(argument)
      || ts.isNoSubstitutionTemplateLiteral(argument)
      || ts.isNumericLiteral(argument)
    )
    ? argument.text
    : null;
}

function staticArrayIndex(propertyName) {
  if (!/^(0|[1-9]\d*)$/.test(propertyName)) {
    return null;
  }
  const index = Number(propertyName);
  return Number.isSafeInteger(index) ? index : null;
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
    recordPatternBinding(scope, name, initializer);
  }

  function recordPatternBinding(scope, name, value) {
    if (ts.isIdentifier(name)) {
      recordBinding(scope, name.text, value);
    } else if (ts.isObjectBindingPattern(name)) {
      recordObjectBinding(scope, name, value);
    } else if (ts.isArrayBindingPattern(name)) {
      recordArrayBinding(scope, name, value);
    } else {
      recordBarrierBindings(scope, name);
    }
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
      recordPatternBinding(scope, element.name, propertyBinding);
    }
  }

  function recordArrayBinding(scope, pattern, owner) {
    pattern.elements.forEach((element, index) => {
      if (ts.isOmittedExpression(element)) {
        return;
      }
      if (element.dotDotDotToken) {
        recordBarrierBindings(scope, element.name);
        return;
      }
      recordPatternBinding(
        scope,
        element.name,
        staticObjectPropertyBinding(owner, String(index), element.initializer),
      );
    });
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
    if (ts.isImportDeclaration(node) && node.importClause) {
      const scope = findContainingLexicalScope(node.parent);
      if (scope) {
        if (node.importClause.name) {
          recordBinding(
            scope,
            node.importClause.name.text,
            STATIC_IMPORT_BINDING,
          );
        }
        const namedBindings = node.importClause.namedBindings;
        if (namedBindings) {
          if (ts.isNamespaceImport(namedBindings)) {
            recordBinding(scope, namedBindings.name.text, STATIC_IMPORT_BINDING);
          } else {
            for (const element of namedBindings.elements) {
              recordBinding(scope, element.name.text, STATIC_IMPORT_BINDING);
            }
          }
        }
      }
    }
    if (ts.isImportEqualsDeclaration(node)) {
      const scope = findContainingLexicalScope(node.parent);
      if (scope) {
        recordBinding(scope, node.name.text, STATIC_IMPORT_BINDING);
      }
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

function staticAlternatives(
  candidates,
  mayBeAbsent = false,
  nonObjectCandidates = [],
) {
  return {
    bindingKind: "alternatives",
    candidates,
    mayBeAbsent,
    nonObjectCandidates,
  };
}

function isStaticAlternatives(value) {
  return value?.bindingKind === "alternatives";
}

function staticAlternativeValues(value) {
  return [...value.candidates, ...value.nonObjectCandidates];
}

function staticOptionalProperty(candidates) {
  return { bindingKind: "optional-property", candidates };
}

function isStaticOptionalProperty(value) {
  return value?.bindingKind === "optional-property";
}

function staticallyKnownNonObjectSpreadValue(value) {
  const node = unwrapCopyExpression(value);
  return (
    node.kind === ts.SyntaxKind.NullKeyword
    || node.kind === ts.SyntaxKind.TrueKeyword
    || node.kind === ts.SyntaxKind.FalseKeyword
    || (ts.isIdentifier(node) && node.text === "undefined")
    || ts.isStringLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node)
    || ts.isNumericLiteral(node)
    || ts.isBigIntLiteral(node)
  )
    ? node
    : undefined;
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
      const alternatives = staticAlternativeValues(value);
      return (
        !value.mayBeAbsent
        && alternatives.length > 0
        && alternatives.every((candidate) =>
          isProvablyDefinedStaticValue(candidate, resolveValue, proofStack),
        )
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
      const alternatives = staticAlternativeValues(value);
      return (
        !value.mayBeAbsent
        && alternatives.length > 0
        && alternatives.every((candidate) =>
          isProvablyNonNullishStaticValue(candidate, resolveValue, proofStack),
        )
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

function isProvablyNullishStaticValue(
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
      const alternatives = staticAlternativeValues(value);
      return (
        !value.mayBeAbsent
        && alternatives.length > 0
        && alternatives.every((candidate) =>
          isProvablyNullishStaticValue(candidate, resolveValue, proofStack),
        )
      );
    }
    const node = unwrapCopyExpression(value);
    if (isResolvableStaticReference(node)) {
      const resolved = resolveValue(node);
      if (resolved === node) {
        return STATIC_GLOBAL_UNDEFINED_NODES.has(node);
      }
      return Boolean(
        resolved
        && isProvablyNullishStaticValue(resolved, resolveValue, proofStack),
      );
    }
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return true;
    }
    if (ts.isConditionalExpression(node)) {
      return (
        isProvablyNullishStaticValue(node.whenTrue, resolveValue, proofStack)
        && isProvablyNullishStaticValue(
          node.whenFalse,
          resolveValue,
          proofStack,
        )
      );
    }
    return false;
  } finally {
    proofStack.delete(value);
  }
}

function isProvablyFalsyStaticValue(
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
      const alternatives = staticAlternativeValues(value);
      return (
        !value.mayBeAbsent
        && alternatives.length > 0
        && alternatives.every((candidate) =>
          isProvablyFalsyStaticValue(candidate, resolveValue, proofStack),
        )
      );
    }
    const node = unwrapCopyExpression(value);
    if (isResolvableStaticReference(node)) {
      const resolved = resolveValue(node);
      if (resolved === node) {
        return STATIC_GLOBAL_UNDEFINED_NODES.has(node);
      }
      return Boolean(
        resolved
        && isProvablyFalsyStaticValue(resolved, resolveValue, proofStack),
      );
    }
    if (
      node.kind === ts.SyntaxKind.NullKeyword
      || node.kind === ts.SyntaxKind.FalseKeyword
      || (ts.isNumericLiteral(node) && Number(node.text) === 0)
      || (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        && node.text.length === 0
      )
    ) {
      return true;
    }
    if (ts.isConditionalExpression(node)) {
      return (
        isProvablyFalsyStaticValue(node.whenTrue, resolveValue, proofStack)
        && isProvablyFalsyStaticValue(node.whenFalse, resolveValue, proofStack)
      );
    }
    return false;
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
      const alternatives = staticAlternativeValues(value);
      return (
        !value.mayBeAbsent
        && alternatives.length > 0
        && alternatives.every((candidate) =>
          isProvablyTruthyStaticValue(candidate, resolveValue, proofStack),
        )
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
    if (ts.isTemplateExpression(node)) {
      return isProvablyNonEmptyTemplateExpression(
        node,
        resolveValue,
        proofStack,
      );
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

function isProvablyNonEmptyTemplateInterpolation(
  value,
  resolveValue,
  proofStack,
) {
  if (!value || proofStack.has(value)) {
    return false;
  }
  proofStack.add(value);
  try {
    if (isStaticAlternatives(value)) {
      const alternatives = staticAlternativeValues(value);
      return (
        !value.mayBeAbsent
        && alternatives.length > 0
        && alternatives.every((candidate) =>
          isProvablyNonEmptyTemplateInterpolation(
            candidate,
            resolveValue,
            proofStack,
          ),
        )
      );
    }
    const node = unwrapCopyExpression(value);
    if (isResolvableStaticReference(node)) {
      const resolved = resolveValue(node);
      if (resolved === node) {
        return STATIC_GLOBAL_UNDEFINED_NODES.has(node);
      }
      return Boolean(
        resolved
        && isProvablyNonEmptyTemplateInterpolation(
          resolved,
          resolveValue,
          proofStack,
        ),
      );
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text.length > 0;
    }
    if (ts.isTemplateExpression(node)) {
      return isProvablyNonEmptyTemplateExpression(
        node,
        resolveValue,
        proofStack,
      );
    }
    if (ts.isConditionalExpression(node)) {
      return (
        isProvablyNonEmptyTemplateInterpolation(
          node.whenTrue,
          resolveValue,
          proofStack,
        )
        && isProvablyNonEmptyTemplateInterpolation(
          node.whenFalse,
          resolveValue,
          proofStack,
        )
      );
    }
    return (
      ts.isNumericLiteral(node)
      || ts.isBigIntLiteral(node)
      || node.kind === ts.SyntaxKind.TrueKeyword
      || node.kind === ts.SyntaxKind.FalseKeyword
      || node.kind === ts.SyntaxKind.NullKeyword
    );
  } finally {
    proofStack.delete(value);
  }
}

function isProvablyNonEmptyTemplateExpression(node, resolveValue, proofStack) {
  return (
    node.head.text.length > 0
    || node.templateSpans.some((span) => span.literal.text.length > 0)
    || node.templateSpans.some((span) =>
      isProvablyNonEmptyTemplateInterpolation(
        span.expression,
        resolveValue,
        proofStack,
      ),
    )
  );
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
    (
      parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        ? parent.left === node
        : ![
            ts.SyntaxKind.PlusToken,
            ts.SyntaxKind.QuestionQuestionToken,
            ts.SyntaxKind.BarBarToken,
          ].includes(parent.operatorToken.kind)
    );
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

function collectProductCopyRepositoryEvaluation(repositoryRoot) {
  const sourceRoot = join(repositoryRoot, "src");
  const sourcePaths = collectSourceFiles(sourceRoot).sort((left, right) =>
    left.localeCompare(right),
  );
  const compilerOptions = loadRepositoryCompilerOptions(repositoryRoot);
  const program = ts.createProgram(sourcePaths, compilerOptions);
  const programSourceFiles = new Map(
    program.getSourceFiles().map((sourceFile) => [
      normalizeSourcePath(sourceFile.fileName),
      sourceFile,
    ]),
  );
  const sourceFiles = sourcePaths.flatMap((absolutePath) => {
    const sourceFile = programSourceFiles.get(normalizeSourcePath(absolutePath));
    return sourceFile ? [sourceFile] : [];
  });
  const filePathBySourceFile = new Map(
    sourceFiles.map((sourceFile) => [
      sourceFile,
      relative(repositoryRoot, sourceFile.fileName).replaceAll("\\", "/"),
    ]),
  );
  const checker = program.getTypeChecker();
  const analysisContext = {
    checker,
    filePathBySourceFile,
    localConstantScopesBySourceFile: new Map(
      sourceFiles.map((sourceFile) => [
        sourceFile,
        collectLocalConstantScopes(sourceFile),
      ]),
    ),
    repositoryMutationByInitializer: collectRepositoryMutationByInitializer(
      sourceFiles,
      checker,
      sourceRoot,
    ),
    sourceRoot,
  };
  const sourceEvaluations = sourceFiles.map((sourceFile) =>
    evaluateProductCopySource({
      analysisContext,
      filePath: filePathBySourceFile.get(sourceFile),
      sourceFile,
      sourceText: "",
    }),
  );
  return {
    findings: sourceEvaluations.flatMap(({ findings }) => findings),
    unresolvedExpressions: sourceEvaluations.flatMap(
      ({ unresolvedExpressions }) => unresolvedExpressions,
    ),
  };
}

function loadRepositoryCompilerOptions(repositoryRoot) {
  const configPath = ts.findConfigFile(
    repositoryRoot,
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (configPath) {
    const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
    if (!loaded.error) {
      const parsedOptions = ts.parseJsonConfigFileContent(
        loaded.config,
        ts.sys,
        repositoryRoot,
      ).options;
      return copyAnalysisCompilerOptions(parsedOptions);
    }
  }
  return copyAnalysisCompilerOptions({
    baseUrl: repositoryRoot,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    paths: { "@/*": ["src/*"] },
    target: ts.ScriptTarget.ES2022,
  });
}

function copyAnalysisCompilerOptions(options) {
  const copyOptions = { ...options };
  delete copyOptions.lib;
  delete copyOptions.types;
  return {
    ...copyOptions,
    noLib: true,
    skipLibCheck: true,
    types: [],
  };
}

function normalizeSourcePath(filePath) {
  return resolve(filePath).replaceAll("\\", "/").toLowerCase();
}

export function evaluateProductCopyRepository(repositoryRoot = process.cwd()) {
  const { findings, unresolvedExpressions } =
    collectProductCopyRepositoryEvaluation(repositoryRoot);
  const policyPath = join(repositoryRoot, ...EXCEPTION_POLICY_RELATIVE_PATH.split("/"));
  if (!existsSync(policyPath)) {
    return {
      findings,
      unresolvedExpressions,
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
      unresolvedExpressions,
      suppressedFindings: [],
      policyErrors: [
        `${EXCEPTION_POLICY_RELATIVE_PATH} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
      exceptionCount: 0,
    };
  }
  return {
    ...applyProductCopyExceptions(findings, policy),
    unresolvedExpressions,
  };
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

function formatUnresolvedExpression(expression) {
  return `${expression.filePath}:${expression.line}:${expression.column} ${expression.context}`;
}

export function productCopyUnresolvedDigest(unresolvedExpressions) {
  const signatures = unresolvedExpressions
    .map((expression) => expression.signature)
    .sort();
  return createHash("sha256").update(signatures.join("\n")).digest("hex");
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile === currentFile) {
  const evaluation = evaluateProductCopyRepository();
  const {
    findings,
    policyErrors,
    suppressedFindings,
    unresolvedExpressions,
  } = evaluation;
  const reportOnly = process.argv.includes("--report");
  const maximum = readMaximum(process.argv);
  const unresolvedMaximum = readUnresolvedMaximum(process.argv);
  const expectedUnresolvedDigest = readUnresolvedDigest(process.argv);
  const measuredUnresolvedDigest = productCopyUnresolvedDigest(
    unresolvedExpressions,
  );
  const exceedsMaximum = findings.length > maximum;
  const leavesHeadroom = findings.length < maximum;
  const baselineMatches = findings.length === maximum;
  const exceedsUnresolvedMaximum = unresolvedExpressions.length > unresolvedMaximum;
  const leavesUnresolvedHeadroom = unresolvedExpressions.length < unresolvedMaximum;
  const unresolvedBaselineMatches =
    unresolvedExpressions.length === unresolvedMaximum;
  const unresolvedIdentityMatches =
    measuredUnresolvedDigest === expectedUnresolvedDigest;
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
  if (
    unresolvedExpressions.length > 0
    && (reportOnly || !unresolvedBaselineMatches)
  ) {
    console.error(
      `Product-copy governance found ${unresolvedExpressions.length} unresolved user-facing expression(s):`,
    );
    for (const expression of unresolvedExpressions) {
      console.error(`- ${formatUnresolvedExpression(expression)}`);
    }
  }
  if (reportOnly) {
    console.error(
      `Product-copy unresolved identity digest: ${measuredUnresolvedDigest}`,
    );
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
  }
  if (!reportOnly && policyErrors.length === 0 && exceedsUnresolvedMaximum) {
    console.error(
      `Product-copy governance failed: ${unresolvedExpressions.length} unresolved expression(s) exceed the checked-in baseline of ${unresolvedMaximum}. Resolve the newly opaque copy path; do not raise the baseline.`,
    );
    process.exitCode = 1;
  } else if (
    !reportOnly
    && policyErrors.length === 0
    && leavesUnresolvedHeadroom
  ) {
    console.error(
      `Product-copy governance failed: ${unresolvedExpressions.length} unresolved expression(s) are below the checked-in baseline of ${unresolvedMaximum}. Ratchet --max-unresolved down to ${unresolvedExpressions.length} in package.json so the improvement cannot be spent by a later regression.`,
    );
    process.exitCode = 1;
  }
  if (
    !reportOnly
    && policyErrors.length === 0
    && unresolvedBaselineMatches
    && !unresolvedIdentityMatches
  ) {
    console.error(
      `Product-copy governance failed: the unresolved-expression identity set changed while the count remained ${unresolvedExpressions.length}. Review the added and removed opaque paths, then update --unresolved-digest only when the new exact set is intentional.`,
    );
    process.exitCode = 1;
  }
  if (
    !reportOnly
    && policyErrors.length === 0
    && baselineMatches
    && unresolvedBaselineMatches
    && unresolvedIdentityMatches
  ) {
    console.log(
      `Product-copy governance passed: measured inventory matches the checked-in baselines at ${findings.length} finding(s) and ${unresolvedExpressions.length} unresolved expression(s) with identity digest ${measuredUnresolvedDigest}; ${suppressedFindings.length} reviewed exact exception(s).`,
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

function readUnresolvedMaximum(arguments_) {
  const argument = arguments_.find((value) => value.startsWith("--max-unresolved="));
  if (!argument) {
    return 0;
  }
  const maximum = Number.parseInt(argument.slice("--max-unresolved=".length), 10);
  if (!Number.isInteger(maximum) || maximum < 0) {
    throw new Error("--max-unresolved must be a non-negative integer");
  }
  return maximum;
}

function readUnresolvedDigest(arguments_) {
  const argument = arguments_.find((value) => value.startsWith("--unresolved-digest="));
  const digest = argument?.slice("--unresolved-digest=".length) ?? "";
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error("--unresolved-digest must be a lowercase SHA-256 digest");
  }
  return digest;
}
