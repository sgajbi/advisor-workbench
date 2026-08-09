import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = resolve(repositoryRoot, "src");

type SourceModule = {
  path: string;
  sourceFile: ts.SourceFile;
};

function sourceModules(directory = sourceRoot): SourceModule[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): SourceModule[] => {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) return sourceModules(absolutePath);
      if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) return [];

      const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
      return [
        {
          path,
          sourceFile: ts.createSourceFile(
            path,
            readFileSync(absolutePath, "utf8"),
            ts.ScriptTarget.Latest,
            true,
          ),
        },
      ];
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function moduleMatches(moduleSpecifier: string, moduleSuffix: string): boolean {
  return moduleSpecifier.replace(/\.(?:js|jsx|ts|tsx)$/, "").endsWith(moduleSuffix);
}

function importsModule(sourceFile: ts.SourceFile, moduleSuffix: string): boolean {
  return sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      moduleMatches(statement.moduleSpecifier.text, moduleSuffix),
  );
}

function importsName(sourceFile: ts.SourceFile, moduleSuffix: string, name: string): boolean {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !moduleMatches(statement.moduleSpecifier.text, moduleSuffix)
    ) {
      return false;
    }

    const bindings = statement.importClause?.namedBindings;
    return (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((element) => (element.propertyName?.text ?? element.name.text) === name)
    );
  });
}

function callExpressions(sourceFile: ts.SourceFile, functionName: string): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === functionName
    ) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function callArguments(sourceFile: ts.SourceFile, functionName: string): string[][] {
  return callExpressions(sourceFile, functionName).map((call) =>
    call.arguments.map((argument) => argument.getText(sourceFile)),
  );
}

describe("Portfolio Intake payload ownership", () => {
  const modules = sourceModules();

  it("recognizes aliased and extension-qualified boundary imports", () => {
    const sourceFile = ts.createSourceFile(
      "fixture.ts",
      [
        'import { ingestPortfolioBundle as publishReviewedIntent } from "./api.ts";',
        'import * as payloadBuilders from "./payload-builder.js";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );

    expect(importsName(sourceFile, "/api", "ingestPortfolioBundle")).toBe(true);
    expect(importsModule(sourceFile, "/payload-builder")).toBe(true);
  });

  it("keeps payload construction behind the reviewed projection", () => {
    const payloadBuilderConsumers = modules
      .filter(({ sourceFile }) => importsModule(sourceFile, "/payload-builder"))
      .map(({ path }) => path);

    expect(payloadBuilderConsumers).toEqual(["src/features/intake/draft.ts"]);

    const projection = modules.find(({ path }) => path === "src/features/intake/draft.ts");
    expect(projection).toBeDefined();
    expect(callArguments(projection!.sourceFile, "buildCreatePortfolioPayload")).toHaveLength(1);
    expect(callArguments(projection!.sourceFile, "buildPositionSeedPayloadFromList")).toHaveLength(
      1,
    );
    expect(callArguments(projection!.sourceFile, "buildTransactionsPayloadFromList")).toHaveLength(
      1,
    );
    expect(callArguments(projection!.sourceFile, "buildInstrumentsPayloadFromList")).toHaveLength(
      1,
    );
    expect(callArguments(projection!.sourceFile, "buildMarketDataPayloadFromList")).toHaveLength(1);
  });

  it("keeps source publication in the workflow and submits its immutable reviewed projection", () => {
    const publicationConsumers = modules
      .filter(({ sourceFile }) => importsName(sourceFile, "/api", "ingestPortfolioBundle"))
      .map(({ path }) => path);

    expect(publicationConsumers).toEqual(["src/features/intake/use-intake-workflow.ts"]);

    const workflow = modules.find(
      ({ path }) => path === "src/features/intake/use-intake-workflow.ts",
    );
    expect(workflow).toBeDefined();
    expect(callArguments(workflow!.sourceFile, "buildIntakeReviewProjection")).toEqual([["draft"]]);
    const [publicationCall] = callExpressions(workflow!.sourceFile, "ingestPortfolioBundle");
    expect(publicationCall).toBeDefined();
    expect(publicationCall.arguments).toHaveLength(2);
    expect(publicationCall.arguments[0].getText(workflow!.sourceFile)).toBe(
      "submittedIntent.projection.payload",
    );

    const publicationOptions = publicationCall.arguments[1];
    expect(ts.isObjectLiteralExpression(publicationOptions)).toBe(true);
    const idempotencyKey = ts.isObjectLiteralExpression(publicationOptions)
      ? publicationOptions.properties.find((property) => {
          if (!ts.isPropertyAssignment(property)) return false;
          return property.name.getText(workflow!.sourceFile) === "idempotencyKey";
        })
      : undefined;
    expect(idempotencyKey).toBeDefined();
    expect(
      idempotencyKey && ts.isPropertyAssignment(idempotencyKey)
        ? idempotencyKey.initializer.getText(workflow!.sourceFile)
        : undefined,
    ).toBe("submittedIntent.idempotencyKey");
  });
});
