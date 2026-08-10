import ts from "typescript";
import { parse as parseYaml } from "yaml";

export function parseWorkflow(source) {
  return parseYaml(source);
}

export function collectWorkflowStepEntries(workflow) {
  if (!isRecord(workflow) || !isRecord(workflow.jobs)) {
    return [];
  }
  return Object.values(workflow.jobs).flatMap((job) => {
    if (!isRecord(job) || !Array.isArray(job.steps)) {
      return [];
    }
    return job.steps
      .filter(isRecord)
      .map((step) => ({ workflow, job, step, stepIndex: job.steps.indexOf(step) }));
  });
}

export function isUnconditionalWorkflowStep({ job, step }) {
  return (
    !Object.hasOwn(job, "if") &&
    !Object.hasOwn(job, "continue-on-error") &&
    !Object.hasOwn(step, "if") &&
    !Object.hasOwn(step, "continue-on-error")
  );
}

export function usesGovernedExecutingShell({ workflow, job, step }) {
  const effectiveShell = [
    step.shell,
    isRecord(job.defaults) && isRecord(job.defaults.run)
      ? job.defaults.run.shell
      : undefined,
    isRecord(workflow.defaults) && isRecord(workflow.defaults.run)
      ? workflow.defaults.run.shell
      : undefined,
  ].find((shell) => shell !== undefined);

  if (effectiveShell !== undefined) {
    return (
      typeof effectiveShell === "string" &&
      ["bash", "sh"].includes(normalizeInstruction(effectiveShell).toLowerCase())
    );
  }

  return job["runs-on"] === "ubuntu-latest";
}

export function parseDockerfile(source) {
  const model = { globalInstructions: [], stages: [] };
  let currentStage;

  for (const instruction of collectDockerfileInstructions(source)) {
    if (instruction.keyword === "FROM") {
      const stageDeclaration = instruction.argument.match(
        /^(?:--platform=\S+\s+)?(?<base>\S+)(?:\s+AS\s+(?<name>[A-Za-z0-9._-]+))?\s*$/i
      );
      currentStage = {
        base: stageDeclaration?.groups?.base,
        name: stageDeclaration?.groups?.name?.toLowerCase(),
        instructions: [],
      };
      model.stages.push(currentStage);
    } else if (currentStage) {
      currentStage.instructions.push(instruction);
    } else {
      model.globalInstructions.push(instruction);
    }
  }

  return model;
}

export function declaresGovernedChromiumProject(source) {
  const sourceFile = ts.createSourceFile(
    "playwright.config.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return false;
  }

  if (!importsPlaywrightDefineConfig(sourceFile)) {
    return false;
  }

  const defaultExports = sourceFile.statements.filter(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals
  );
  if (defaultExports.length !== 1) {
    return false;
  }

  const exportedExpression = resolveTopLevelExpression(
    sourceFile,
    defaultExports[0].expression
  );
  return (
    !!exportedExpression &&
    ts.isCallExpression(exportedExpression) &&
    ts.isIdentifier(exportedExpression.expression) &&
    exportedExpression.expression.text === "defineConfig" &&
    exportedExpression.arguments.length === 1 &&
    ts.isObjectLiteralExpression(exportedExpression.arguments[0]) &&
    hasExactChromiumProject(exportedExpression.arguments[0])
  );
}

export function normalizeInstruction(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectDockerfileInstructions(source) {
  const instructions = [];
  let logicalLine = "";

  for (const sourceLine of source.split(/\r?\n/)) {
    const trimmed = sourceLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const continues = /\\\s*$/.test(trimmed);
    const segment = trimmed.replace(/\\\s*$/, "").trim();
    logicalLine = [logicalLine, segment].filter(Boolean).join(" ");
    if (continues) {
      continue;
    }

    const match = logicalLine.match(/^(?<keyword>[A-Za-z]+)\s+(?<argument>.+)$/);
    if (match?.groups) {
      instructions.push({
        keyword: match.groups.keyword.toUpperCase(),
        argument: normalizeInstruction(match.groups.argument),
      });
    }
    logicalLine = "";
  }

  return instructions;
}

function hasExactChromiumProject(config) {
  if (config.properties.some(ts.isSpreadAssignment)) {
    return false;
  }
  const projects = getObjectProperty(config, "projects")?.initializer;
  if (!projects || !ts.isArrayLiteralExpression(projects) || projects.elements.length !== 1) {
    return false;
  }
  const project = projects.elements[0];
  if (!ts.isObjectLiteralExpression(project)) {
    return false;
  }
  const use = getObjectProperty(project, "use")?.initializer;
  return (
    !project.properties.some(ts.isSpreadAssignment) &&
    getStringProperty(project, "name") === "chromium" &&
    !!use &&
    ts.isObjectLiteralExpression(use) &&
    !use.properties.some(ts.isSpreadAssignment) &&
    getStringProperty(use, "browserName") === "chromium"
  );
}

function importsPlaywrightDefineConfig(sourceFile) {
  return sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "@playwright/test" &&
      !!statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) =>
          element.name.text === "defineConfig" &&
          (!element.propertyName || element.propertyName.text === "defineConfig")
      )
  );
}

function resolveTopLevelExpression(sourceFile, expression) {
  if (!ts.isIdentifier(expression)) {
    return expression;
  }
  const declarations = sourceFile.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) &&
    (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
      ? statement.declarationList.declarations.filter(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === expression.text &&
            !!declaration.initializer
        )
      : []
  );
  return declarations.length === 1 ? declarations[0].initializer : undefined;
}

function getStringProperty(object, name) {
  const initializer = getObjectProperty(object, name)?.initializer;
  return initializer &&
    (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))
    ? initializer.text
    : undefined;
}

function getObjectProperty(object, name) {
  const properties = object.properties.filter(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === name) ||
        (ts.isStringLiteral(property.name) && property.name.text === name))
  );
  return properties.length === 1 ? properties[0] : undefined;
}
