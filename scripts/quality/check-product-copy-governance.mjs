import { readFileSync, readdirSync } from "node:fs";
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

export function scanProductCopyRepository(repositoryRoot = process.cwd()) {
  const sourceRoot = join(repositoryRoot, "src");
  return collectSourceFiles(sourceRoot).flatMap((absolutePath) =>
    scanProductCopySource({
      filePath: relative(repositoryRoot, absolutePath).replaceAll("\\", "/"),
      sourceText: readFileSync(absolutePath, "utf8"),
    }),
  );
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
  const findings = scanProductCopyRepository();
  const reportOnly = process.argv.includes("--report");
  const maximum = readMaximum(process.argv);
  const exceedsMaximum = findings.length > maximum;
  const leavesHeadroom = findings.length < maximum;
  const baselineMatches = findings.length === maximum;
  if (findings.length > 0 && (reportOnly || !baselineMatches)) {
    console.error(
      `Product-copy governance found ${findings.length} user-facing violation(s):`,
    );
    for (const finding of findings) {
      console.error(`- ${formatFinding(finding)}`);
    }
  }
  if (!reportOnly && exceedsMaximum) {
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
      `Product-copy governance passed: measured inventory matches the checked-in baseline at ${findings.length}.`,
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
