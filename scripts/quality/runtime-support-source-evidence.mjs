import ts from "typescript";
import { parse as parseYaml } from "yaml";

export function parseWorkflow(source) {
  return parseYaml(source);
}

export function collectWorkflowSteps(workflow) {
  if (!isRecord(workflow) || !isRecord(workflow.jobs)) {
    return [];
  }
  return Object.values(workflow.jobs).flatMap((job) =>
    isRecord(job) && Array.isArray(job.steps) ? job.steps : []
  );
}

export function parseDockerfile(source) {
  const model = { globalInstructions: [], stages: [] };
  let currentStage;

  for (const instruction of collectDockerfileInstructions(source)) {
    if (instruction.keyword === "FROM") {
      const stageName = instruction.argument.match(/\s+AS\s+(?<name>[A-Za-z0-9._-]+)\s*$/i)
        ?.groups?.name.toLowerCase();
      currentStage = { name: stageName, instructions: [] };
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

  const declarations = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "defineConfig" &&
      node.arguments.length === 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      declarations.push(hasExactChromiumProject(node.arguments[0]));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations.length === 1 && declarations[0] === true;
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
    getStringProperty(project, "name") === "chromium" &&
    !!use &&
    ts.isObjectLiteralExpression(use) &&
    getStringProperty(use, "browserName") === "chromium"
  );
}

function getStringProperty(object, name) {
  const initializer = getObjectProperty(object, name)?.initializer;
  return initializer &&
    (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))
    ? initializer.text
    : undefined;
}

function getObjectProperty(object, name) {
  return object.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === name) ||
        (ts.isStringLiteral(property.name) && property.name.text === name))
  );
}
