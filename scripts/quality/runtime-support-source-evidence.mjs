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
  const sourceLines = source.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex += 1) {
    const sourceLine = sourceLines[lineIndex];
    const trimmed = sourceLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const continues = /\\\s*$/.test(sourceLine);
    const segment = sourceLine.replace(/\\\s*$/, "");
    logicalLine = logicalLine === "" ? segment.trimStart() : logicalLine + segment;
    if (continues) {
      continue;
    }

    const match = logicalLine.trim().match(/^(?<keyword>[A-Za-z]+)\s+(?<argument>.+)$/);
    if (match?.groups) {
      const keyword = match.groups.keyword.toUpperCase();
      let argument = match.groups.argument;
      const heredocs = keyword === "RUN" ? collectDockerHeredocs(argument) : [];
      const heredocBody = [];
      for (const heredoc of heredocs) {
        while (lineIndex + 1 < sourceLines.length) {
          lineIndex += 1;
          const bodyLine = sourceLines[lineIndex];
          heredocBody.push(bodyLine);
          const terminator = heredoc.stripTabs ? bodyLine.replace(/^\t+/, "") : bodyLine;
          if (terminator === heredoc.delimiter) {
            break;
          }
        }
      }
      if (heredocBody.length > 0) {
        argument = [argument, ...heredocBody].join("\n");
      }
      instructions.push({
        keyword,
        argument: normalizeInstruction(argument),
      });
    }
    logicalLine = "";
  }

  return instructions;
}

function collectDockerHeredocs(argument) {
  const heredocs = [];
  const pattern = /<<(?<stripTabs>-)?\s*(?:"(?<double>[^"\r\n]+)"|'(?<single>[^'\r\n]+)'|(?<bare>[A-Za-z_][A-Za-z0-9_]*))/g;
  for (const match of argument.matchAll(pattern)) {
    const delimiter = match.groups?.double ?? match.groups?.single ?? match.groups?.bare;
    if (delimiter) {
      heredocs.push({ delimiter, stripTabs: match.groups?.stripTabs === "-" });
    }
  }
  return heredocs;
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
