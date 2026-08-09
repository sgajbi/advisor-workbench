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

function moduleReferenceStatements(
  sourceFile: ts.SourceFile,
  moduleSuffix: string,
): Array<ts.ImportDeclaration | ts.ExportDeclaration> {
  return sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration | ts.ExportDeclaration =>
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      moduleMatches(statement.moduleSpecifier.text, moduleSuffix),
  );
}

function dynamicModuleReferences(
  sourceFile: ts.SourceFile,
  moduleSuffix: string,
): ts.CallExpression[] {
  const references: ts.CallExpression[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      moduleMatches(node.arguments[0].text, moduleSuffix)
    ) {
      references.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}

function referencesModule(sourceFile: ts.SourceFile, moduleSuffix: string): boolean {
  return (
    moduleReferenceStatements(sourceFile, moduleSuffix).length > 0 ||
    dynamicModuleReferences(sourceFile, moduleSuffix).length > 0
  );
}

function importsName(sourceFile: ts.SourceFile, moduleSuffix: string, name: string): boolean {
  return (
    dynamicModuleReferences(sourceFile, moduleSuffix).length > 0 ||
    sourceFile.statements.some((statement) => {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !moduleMatches(statement.moduleSpecifier.text, moduleSuffix)
      ) {
        return false;
      }

      const bindings = statement.importClause?.namedBindings;
      if (bindings === undefined) return false;
      if (ts.isNamedImports(bindings)) {
        return bindings.elements.some(
          (element) => (element.propertyName?.text ?? element.name.text) === name,
        );
      }
      // A namespace binding exposes every export from the publication module. Treat the import
      // itself as boundary access so a barrel cannot re-export the namespace without first using
      // ingestPortfolioBundle in the importing source file.
      return true;
    })
  );
}

function reexportsName(sourceFile: ts.SourceFile, moduleSuffix: string, name: string): boolean {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !moduleMatches(statement.moduleSpecifier.text, moduleSuffix)
    ) {
      return false;
    }

    if (statement.exportClause === undefined || ts.isNamespaceExport(statement.exportClause)) {
      return true;
    }

    return statement.exportClause.elements.some(
      (element) => (element.propertyName?.text ?? element.name.text) === name,
    );
  });
}

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
  );
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

function exportedNames(sourceFile: ts.SourceFile): string[] {
  return sourceFile.statements
    .flatMap((statement): string[] => {
      if (ts.isExportAssignment(statement)) return ["default"];
      if (ts.isExportDeclaration(statement)) {
        if (statement.exportClause === undefined) return ["*"];
        if (ts.isNamespaceExport(statement.exportClause)) return [statement.exportClause.name.text];
        return statement.exportClause.elements.map((element) => element.name.text);
      }
      if (!hasExportModifier(statement)) return [];
      if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.flatMap((declaration) =>
          bindingNames(declaration.name),
        );
      }
      if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isEnumDeclaration(statement) ||
          ts.isModuleDeclaration(statement)) &&
        statement.name
      ) {
        return [statement.name.getText(sourceFile)];
      }
      return [];
    })
    .sort();
}

function callExpressions(sourceFile: ts.SourceFile, functionName: string): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) && node.expression.text === functionName) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === functionName) ||
        (ts.isElementAccessExpression(node.expression) &&
          ts.isStringLiteral(node.expression.argumentExpression) &&
          node.expression.argumentExpression.text === functionName))
    ) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function identifierOccurrences(sourceFile: ts.SourceFile, name: string): number {
  let count = 0;

  function visit(node: ts.Node) {
    if (ts.isIdentifier(node) && node.text === name) count += 1;
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return count;
}

function callArguments(sourceFile: ts.SourceFile, functionName: string): string[][] {
  return callExpressions(sourceFile, functionName).map((call) =>
    call.arguments.map((argument) => argument.getText(sourceFile)),
  );
}

describe("Portfolio Intake payload ownership", () => {
  const modules = sourceModules();

  it("recognizes aliased, namespace, extension-qualified, and re-exported boundaries", () => {
    const sourceFile = ts.createSourceFile(
      "fixture.ts",
      [
        'import { ingestPortfolioBundle as publishReviewedIntent } from "./api.ts";',
        'import * as payloadBuilders from "./payload-builder.js";',
        'import * as intakeApi from "./api";',
        'intakeApi["ingestPortfolioBundle"]({ sourceSystem: "fixture" });',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );
    const namedReexport = ts.createSourceFile(
      "named-reexport-fixture.ts",
      'export { ingestPortfolioBundle as publishReviewedIntent } from "./api.ts";',
      ts.ScriptTarget.Latest,
      true,
    );
    const namespaceReexport = ts.createSourceFile(
      "namespace-reexport-fixture.ts",
      'export * as intakeApi from "./api.js";',
      ts.ScriptTarget.Latest,
      true,
    );
    const localReexport = ts.createSourceFile(
      "local-reexport-fixture.ts",
      [
        'import { ingestPortfolioBundle as publishReviewedIntent } from "./api";',
        "export { publishReviewedIntent };",
        "export const publishAlias = publishReviewedIntent;",
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );
    const localNamespaceReexport = ts.createSourceFile(
      "local-namespace-reexport-fixture.ts",
      ['import * as intakeApi from "./api";', "export { intakeApi };"].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );
    const payloadBuilderReexport = ts.createSourceFile(
      "payload-builder-reexport-fixture.ts",
      'export { buildTransactionsPayloadFromList } from "./payload-builder.ts";',
      ts.ScriptTarget.Latest,
      true,
    );
    const dynamicImport = ts.createSourceFile(
      "dynamic-import-fixture.ts",
      [
        'const intakeApi = await import("./api.ts");',
        'const payloadBuilders = await import("./payload-builder.js");',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );

    expect(importsName(sourceFile, "/api", "ingestPortfolioBundle")).toBe(true);
    expect(referencesModule(sourceFile, "/payload-builder")).toBe(true);
    expect(reexportsName(namedReexport, "/api", "ingestPortfolioBundle")).toBe(true);
    expect(reexportsName(namespaceReexport, "/api", "ingestPortfolioBundle")).toBe(true);
    expect(exportedNames(localReexport)).toEqual(["publishAlias", "publishReviewedIntent"]);
    expect(importsName(localNamespaceReexport, "/api", "ingestPortfolioBundle")).toBe(true);
    expect(referencesModule(payloadBuilderReexport, "/payload-builder")).toBe(true);
    expect(importsName(dynamicImport, "/api", "ingestPortfolioBundle")).toBe(true);
    expect(referencesModule(dynamicImport, "/payload-builder")).toBe(true);
  });

  it("keeps payload construction behind the reviewed projection", () => {
    const payloadBuilderConsumers = modules
      .filter(({ sourceFile }) => referencesModule(sourceFile, "/payload-builder"))
      .map(({ path }) => path);

    expect(payloadBuilderConsumers).toEqual(["src/features/intake/draft.ts"]);

    const projection = modules.find(({ path }) => path === "src/features/intake/draft.ts");
    expect(projection).toBeDefined();
    const governedBuilders = [
      "buildCreatePortfolioPayload",
      "buildPositionSeedPayloadFromList",
      "buildTransactionsPayloadFromList",
      "buildInstrumentsPayloadFromList",
      "buildMarketDataPayloadFromList",
    ];
    for (const builderName of governedBuilders) {
      expect(callArguments(projection!.sourceFile, builderName)).toHaveLength(1);
      expect(identifierOccurrences(projection!.sourceFile, builderName)).toBe(2);
    }
  });

  it("keeps source publication in the workflow and submits its immutable reviewed projection", () => {
    const publicationConsumers = modules
      .filter(({ sourceFile }) => importsName(sourceFile, "/api", "ingestPortfolioBundle"))
      .map(({ path }) => path);
    const publicationReexports = modules
      .filter(({ sourceFile }) => reexportsName(sourceFile, "/api", "ingestPortfolioBundle"))
      .map(({ path }) => path);

    expect(publicationConsumers).toEqual(["src/features/intake/use-intake-workflow.ts"]);
    expect(publicationReexports).toEqual([]);

    const workflow = modules.find(
      ({ path }) => path === "src/features/intake/use-intake-workflow.ts",
    );
    expect(workflow).toBeDefined();
    const publicationModuleReferences = moduleReferenceStatements(workflow!.sourceFile, "/api");
    expect(publicationModuleReferences).toHaveLength(1);
    expect(ts.isImportDeclaration(publicationModuleReferences[0])).toBe(true);
    expect(exportedNames(workflow!.sourceFile)).toEqual(["useIntakeWorkflow"]);
    expect(identifierOccurrences(workflow!.sourceFile, "ingestPortfolioBundle")).toBe(2);
    expect(callArguments(workflow!.sourceFile, "buildIntakeReviewProjection")).toEqual([["draft"]]);
    const publicationCalls = callExpressions(workflow!.sourceFile, "ingestPortfolioBundle");
    expect(publicationCalls).toHaveLength(1);
    const [publicationCall] = publicationCalls;
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
