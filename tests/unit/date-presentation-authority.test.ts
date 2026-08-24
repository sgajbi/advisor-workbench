import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(process.cwd(), "src");
const DATE_PRESENTATION_AUTHORITY = resolve(
  SOURCE_ROOT,
  "design-system/utils/financial-formatters.ts",
);
const DATE_PRESENTATION_CANDIDATE =
  /\b(?:DateTimeFormat|toLocale(?:DateString|TimeString|String))\b/;

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(entryPath);
    }
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("date presentation authority", () => {
  it("keeps date locale and timezone rendering in the governed design-system formatter", () => {
    const sourceFiles = collectTypeScriptFiles(SOURCE_ROOT);
    const competingFormatters = sourceFiles
      .filter((filePath) => filePath !== DATE_PRESENTATION_AUTHORITY)
      .flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        if (!DATE_PRESENTATION_CANDIDATE.test(source)) {
          return [];
        }
        const sourceFile = ts.createSourceFile(
          filePath,
          source,
          ts.ScriptTarget.Latest,
          true,
        );
        return findDatePresentationBypasses(sourceFile).slice(0, 1).map((node) => {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          return `${relative(process.cwd(), filePath).replaceAll("\\", "/")}:${line + 1}`;
        });
      });

    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(competingFormatters).toEqual([]);
  });

  it("distinguishes Date locale rendering from numeric locale formatting", () => {
    const sourceFile = ts.createSourceFile(
      "presentation-sample.ts",
      `
        const date = new Date("2026-04-10T00:00:00Z");
        const amount = 1250000;
        date.toLocaleString("en-US");
        new Date().toLocaleTimeString("en-US");
        amount.toLocaleString("en-US");
      `,
      ts.ScriptTarget.Latest,
      true,
    );

    expect(findDatePresentationBypasses(sourceFile)).toHaveLength(2);
  });
});

function findDatePresentationBypasses(sourceFile: ts.SourceFile): ts.Node[] {
  const dateBindings = collectDateBindings(sourceFile);
  const findings: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    if (isIntlDateTimeFormatUse(node) || isDateLocaleMethodCall(node, dateBindings)) {
      findings.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return findings;
}

function collectDateBindings(sourceFile: ts.SourceFile): Set<string> {
  const bindings = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
      ts.isIdentifier(node.name) &&
      (isDateConstruction(node.initializer) || isDateTypeReference(node.type))
    ) {
      bindings.add(node.name.text);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      isDateConstruction(node.right)
    ) {
      bindings.add(node.left.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function isIntlDateTimeFormatUse(node: ts.Node): boolean {
  return (
    (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "Intl" &&
    node.expression.name.text === "DateTimeFormat"
  );
}

function isDateLocaleMethodCall(node: ts.Node, dateBindings: ReadonlySet<string>): boolean {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return false;
  }

  const method = node.expression.name.text;
  if (method === "toLocaleDateString" || method === "toLocaleTimeString") {
    return true;
  }
  if (method !== "toLocaleString") {
    return false;
  }

  const receiver = unwrapExpression(node.expression.expression);
  return (
    isDateConstruction(receiver) ||
    (receiver !== undefined && ts.isIdentifier(receiver) && dateBindings.has(receiver.text))
  );
}

function isDateConstruction(node: ts.Expression | undefined): boolean {
  const expression = unwrapExpression(node);
  return Boolean(
    expression &&
      ts.isNewExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "Date",
  );
}

function isDateTypeReference(node: ts.TypeNode | undefined): boolean {
  return Boolean(node && ts.isTypeReferenceNode(node) && node.typeName.getText() === "Date");
}

function unwrapExpression(node: ts.Expression | undefined): ts.Expression | undefined {
  let expression = node;
  while (
    expression &&
    (ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isNonNullExpression(expression))
  ) {
    expression = expression.expression;
  }
  return expression;
}
