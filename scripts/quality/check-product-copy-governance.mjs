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

    function resolveStaticExpression(node) {
      const unwrapped = unwrapCopyExpression(node);
      if (ts.isIdentifier(unwrapped)) {
        const declaration = resolveLocalConstantInitializer(unwrapped);
        if (!declaration || resolvingDeclarations.has(declaration)) {
          return undefined;
        }
        resolvingDeclarations.add(declaration);
        const resolved = resolveStaticExpression(declaration);
        resolvingDeclarations.delete(declaration);
        return resolved;
      }
      if (
        ts.isPropertyAccessExpression(unwrapped)
        || ts.isElementAccessExpression(unwrapped)
      ) {
        const propertyName = accessPropertyName(unwrapped);
        const owner = resolveStaticExpression(unwrapped.expression);
        if (!propertyName || !owner || !ts.isObjectLiteralExpression(owner)) {
          return undefined;
        }
        const matches = owner.properties.filter((property) =>
          (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
          && propertyNameText(property.name, sourceFile) === propertyName,
        );
        if (matches.length !== 1) {
          return undefined;
        }
        const match = matches[0];
        return resolveStaticExpression(
          ts.isPropertyAssignment(match) ? match.initializer : match.name,
        );
      }
      return unwrapped;
    }

    function visitResolvedCopyExpression(node) {
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

function collectLocalConstantScopes(sourceFile) {
  const scopes = new Map();

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      const scope = findContainingLexicalScope(node);
      if (scope) {
        const bindings = scopes.get(scope) ?? new Map();
        bindings.set(
          node.name.text,
          bindings.has(node.name.text) ? null : node.initializer,
        );
        scopes.set(scope, bindings);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return scopes;
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
      ts.isForOfStatement(current)
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
