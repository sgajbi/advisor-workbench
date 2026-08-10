import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REGISTRY_PATH = "docs/documentation/workbench-screen-registry.v1.json";
const ACTIVE_SURFACE_CLASSIFICATIONS = new Set(["active-screen", "active-mode"]);

function toRepositoryPath(value) {
  return value.split(path.sep).join("/");
}

function collectPageEntrypoints(directory, rootDirectory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectPageEntrypoints(absolutePath, rootDirectory, result);
    } else if (entry.isFile() && entry.name === "page.tsx") {
      result.push(toRepositoryPath(path.relative(rootDirectory, absolutePath)));
    }
  }
  return result;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function setDifference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function resolveSchemaReference(rootSchema, reference) {
  if (!reference.startsWith("#/")) {
    throw new Error(`unsupported schema reference ${reference}`);
  }
  return reference
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], rootSchema);
}

function matchesSchemaType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function validateJsonSchemaValue(value, schema, rootSchema, location, errors) {
  if (schema.$ref) {
    const referencedSchema = resolveSchemaReference(rootSchema, schema.$ref);
    if (!referencedSchema) {
      errors.push(`Schema ${location}: unresolved reference ${schema.$ref}.`);
      return;
    }
    validateJsonSchemaValue(value, referencedSchema, rootSchema, location, errors);
    return;
  }

  if (schema.oneOf) {
    const branchErrors = schema.oneOf.map((branch) => {
      const candidateErrors = [];
      validateJsonSchemaValue(value, branch, rootSchema, location, candidateErrors);
      return candidateErrors;
    });
    if (branchErrors.filter((candidateErrors) => candidateErrors.length === 0).length !== 1) {
      errors.push(`Schema ${location}: value does not match exactly one allowed shape.`);
    }
    return;
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`Schema ${location}: expected constant ${JSON.stringify(schema.const)}.`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`Schema ${location}: value ${JSON.stringify(value)} is not allowed.`);
  }

  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (allowedTypes.length > 0 && !allowedTypes.some((type) => matchesSchemaType(value, type))) {
    errors.push(`Schema ${location}: expected ${allowedTypes.join(" or ")}.`);
    return;
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`Schema ${location}: string is shorter than ${schema.minLength}.`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`Schema ${location}: value does not match ${schema.pattern}.`);
    }
  }

  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`Schema ${location}: value is below ${schema.minimum}.`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`Schema ${location}: requires at least ${schema.minItems} items.`);
    }
    if (schema.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) {
        errors.push(`Schema ${location}: items must be unique.`);
      }
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateJsonSchemaValue(item, schema.items, rootSchema, `${location}[${index}]`, errors),
      );
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    for (const requiredProperty of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredProperty)) {
        errors.push(`Schema ${location}: missing required property ${requiredProperty}.`);
      }
    }
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) {
      errors.push(`Schema ${location}: requires at least ${schema.minProperties} properties.`);
    }
    for (const [property, propertyValue] of Object.entries(value)) {
      if (properties[property]) {
        validateJsonSchemaValue(
          propertyValue,
          properties[property],
          rootSchema,
          `${location}.${property}`,
          errors,
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`Schema ${location}: unexpected property ${property}.`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        validateJsonSchemaValue(
          propertyValue,
          schema.additionalProperties,
          rootSchema,
          `${location}.${property}`,
          errors,
        );
      }
    }
  }
}

function deriveRoutePattern(entrypoint) {
  const routeSource = entrypoint
    .replace(/^src\/app/, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/\([^/]+\)/g, "")
    .replace(/\[([^\]]+)\]/g, "{$1}");
  return routeSource || "/";
}

function extractAuthorityModes(source, authority) {
  const symbolOffset = source.indexOf(authority.symbol);
  if (symbolOffset === -1) {
    throw new Error(`symbol ${authority.symbol} was not found`);
  }

  const symbolSource = source.slice(symbolOffset);
  if (authority.extraction === "definition-keys") {
    const closingOffset = symbolSource.indexOf("\n];");
    if (closingOffset === -1) {
      throw new Error(`definition array ${authority.symbol} has no closing bracket`);
    }
    return [...symbolSource.slice(0, closingOffset).matchAll(/\bkey:\s*["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
  }

  if (authority.extraction === "type-union") {
    const closingOffset = symbolSource.indexOf(";");
    if (closingOffset === -1) {
      throw new Error(`type union ${authority.symbol} has no terminator`);
    }
    return [...symbolSource.slice(0, closingOffset).matchAll(/["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
  }

  throw new Error(`unsupported extraction strategy ${authority.extraction}`);
}

function wikiLinksToSlug(content, slug) {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\[[^\\]]+\\]\\(${escapedSlug}(?:\\.md)?(?:#[^)]+)?\\)`).test(content);
}

export function validateScreenDocumentation({
  rootDirectory = process.cwd(),
  registryData,
  registryPath = DEFAULT_REGISTRY_PATH,
} = {}) {
  const absoluteRegistryPath = path.resolve(rootDirectory, registryPath);
  const registry =
    registryData ?? JSON.parse(fs.readFileSync(absoluteRegistryPath, "utf8"));
  const errors = [];

  const schemaReference = registry?.$schema;
  const schemaPath = schemaReference
    ? path.resolve(path.dirname(absoluteRegistryPath), schemaReference)
    : null;
  if (!schemaPath || !fs.existsSync(schemaPath)) {
    errors.push(`Registry schema does not exist: ${schemaReference ?? "missing"}.`);
  } else {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    validateJsonSchemaValue(registry, schema, schema, "$", errors);
  }

  if (registry.schemaVersion !== "lotus.workbench.screen-registry.v1") {
    errors.push(`Unsupported schemaVersion: ${registry.schemaVersion ?? "missing"}.`);
  }
  if (!Number.isInteger(registry.governingIssue) || registry.governingIssue < 1) {
    errors.push("governingIssue must be a positive integer.");
  }

  const routes = Array.isArray(registry.routeEntrypoints) ? registry.routeEntrypoints : [];
  const surfaces = Array.isArray(registry.surfaces) ? registry.surfaces : [];
  const authorities = Array.isArray(registry.modeAuthorities) ? registry.modeAuthorities : [];
  const activeSurfaces = surfaces.filter((surface) =>
    ACTIVE_SURFACE_CLASSIFICATIONS.has(surface.surfaceClassification),
  );
  const aliases = surfaces.filter((surface) => surface.surfaceClassification === "alias");

  for (const duplicate of duplicateValues(routes.map((route) => route.entrypoint))) {
    errors.push(`Duplicate route entrypoint: ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(routes.map((route) => route.routePattern))) {
    errors.push(`Duplicate route pattern: ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(surfaces.map((surface) => surface.id))) {
    errors.push(`Duplicate surface id: ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(
    activeSurfaces.map((surface) => surface.wikiSlug).filter(Boolean),
  )) {
    errors.push(`Duplicate active wiki slug: ${duplicate}.`);
  }

  const appDirectory = path.join(rootDirectory, "src", "app");
  const discoveredEntrypoints = new Set(
    fs.existsSync(appDirectory)
      ? collectPageEntrypoints(appDirectory, rootDirectory).sort()
      : [],
  );
  const registeredEntrypoints = new Set(routes.map((route) => route.entrypoint));
  for (const entrypoint of setDifference(discoveredEntrypoints, registeredEntrypoints)) {
    errors.push(`Unregistered route entrypoint: ${entrypoint}.`);
  }
  for (const entrypoint of setDifference(registeredEntrypoints, discoveredEntrypoints)) {
    errors.push(`Registry route entrypoint does not exist: ${entrypoint}.`);
  }

  const surfaceIds = new Set(surfaces.map((surface) => surface.id));
  for (const route of routes) {
    const derivedRoutePattern = deriveRoutePattern(route.entrypoint);
    if (route.routePattern !== derivedRoutePattern) {
      errors.push(
        `Route ${route.entrypoint} must use derived pattern ${derivedRoutePattern}, not ${route.routePattern}.`,
      );
    }
    for (const surfaceId of route.canonicalSurfaceIds ?? []) {
      if (!surfaceIds.has(surfaceId)) {
        errors.push(`Route ${route.routePattern} references unknown surface ${surfaceId}.`);
      }
    }
    for (const evidencePath of route.implementationEvidence ?? []) {
      if (!fs.existsSync(path.resolve(rootDirectory, evidencePath))) {
        errors.push(`Route ${route.routePattern} evidence does not exist: ${evidencePath}.`);
      }
    }
  }

  const requiredHeadings = registry.guideStandard?.requiredHeadings ?? [];
  const templatePath = registry.guideStandard?.templatePath;
  if (!templatePath || !fs.existsSync(path.resolve(rootDirectory, templatePath))) {
    errors.push(`Screen guide template does not exist: ${templatePath ?? "missing"}.`);
  }

  const catalogueSlug = registry.guideStandard?.catalogueSlug;
  const cataloguePath = catalogueSlug ? path.join(rootDirectory, "wiki", `${catalogueSlug}.md`) : null;
  if (!cataloguePath || !fs.existsSync(cataloguePath)) {
    errors.push(`Screen guide catalogue does not exist: ${catalogueSlug ?? "missing"}.`);
  }

  const navigationPaths = ["wiki/Home.md", "wiki/_Sidebar.md"];
  const navigationContent = navigationPaths
    .filter((navigationPath) => fs.existsSync(path.resolve(rootDirectory, navigationPath)))
    .map((navigationPath) => fs.readFileSync(path.resolve(rootDirectory, navigationPath), "utf8"));
  if (catalogueSlug && !navigationContent.some((content) => wikiLinksToSlug(content, catalogueSlug))) {
    errors.push(`Screen guide catalogue ${catalogueSlug} is not linked from wiki navigation.`);
  }

  for (const surface of surfaces) {
    for (const evidencePath of [
      ...(surface.implementationEvidence ?? []),
      ...(surface.runtimeEvidence ?? []),
    ]) {
      if (!fs.existsSync(path.resolve(rootDirectory, evidencePath))) {
        errors.push(`Surface ${surface.id} evidence does not exist: ${evidencePath}.`);
      }
    }

    if (surface.fragment) {
      const escapedFragment = surface.fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fragmentPattern = new RegExp(
        `\\bid\\s*=\\s*(?:["']${escapedFragment}["']|\\{\\s*["']${escapedFragment}["']\\s*\\})`,
      );
      const ownsFragment = (surface.implementationEvidence ?? []).some((evidencePath) => {
        const absoluteEvidencePath = path.resolve(rootDirectory, evidencePath);
        return (
          fs.existsSync(absoluteEvidencePath) &&
          fragmentPattern.test(fs.readFileSync(absoluteEvidencePath, "utf8"))
        );
      });
      if (!ownsFragment) {
        errors.push(`Surface ${surface.id} fragment target does not exist: #${surface.fragment}.`);
      }
    }

    if (surface.surfaceClassification === "alias") {
      if (!surface.canonicalSurfaceId || !surfaceIds.has(surface.canonicalSurfaceId)) {
        errors.push(`Alias ${surface.id} must reference an existing canonicalSurfaceId.`);
      }
      if (surface.wikiSlug) {
        errors.push(`Alias ${surface.id} must reuse its canonical guide instead of ${surface.wikiSlug}.`);
      }
      continue;
    }

    if (!ACTIVE_SURFACE_CLASSIFICATIONS.has(surface.surfaceClassification)) continue;

    if (!surface.wikiSlug && !surface.coverageException) {
      errors.push(`Active surface ${surface.id} has neither a wiki guide nor a coverage exception.`);
    }
    if (surface.coverageException) {
      if (surface.coverageException.issue !== registry.governingIssue) {
        errors.push(
          `Surface ${surface.id} exception must reference governing issue #${registry.governingIssue}.`,
        );
      }
      if (!surface.coverageException.plannedSlice?.trim() || !surface.coverageException.reason?.trim()) {
        errors.push(`Surface ${surface.id} exception requires plannedSlice and reason.`);
      }
    }

    if (surface.wikiSlug) {
      const wikiPath = path.join(rootDirectory, "wiki", `${surface.wikiSlug}.md`);
      if (!fs.existsSync(wikiPath)) {
        errors.push(`Surface ${surface.id} guide does not exist: wiki/${surface.wikiSlug}.md.`);
        continue;
      }
      if (!surface.coverageException) {
        const guideContent = fs.readFileSync(wikiPath, "utf8");
        for (const heading of requiredHeadings) {
          if (!guideContent.includes(heading)) {
            errors.push(`Surface ${surface.id} guide is missing heading: ${heading}.`);
          }
        }
      }
      if (!navigationContent.some((content) => wikiLinksToSlug(content, surface.wikiSlug))) {
        errors.push(`Surface ${surface.id} guide ${surface.wikiSlug} is not linked from wiki navigation.`);
      }
    }
  }

  for (const authority of authorities) {
    const sourcePath = path.resolve(rootDirectory, authority.source);
    if (!fs.existsSync(sourcePath)) {
      errors.push(`Mode authority source does not exist: ${authority.source}.`);
      continue;
    }

    try {
      const sourceModes = new Set(
        extractAuthorityModes(fs.readFileSync(sourcePath, "utf8"), authority),
      );
      const mappedModes = new Set(Object.keys(authority.surfaceMappings ?? {}));
      for (const mode of setDifference(sourceModes, mappedModes)) {
        errors.push(`Mode authority ${authority.family} has unmapped source mode: ${mode}.`);
      }
      for (const mode of setDifference(mappedModes, sourceModes)) {
        errors.push(`Mode authority ${authority.family} maps nonexistent source mode: ${mode}.`);
      }
      for (const [mode, surfaceId] of Object.entries(authority.surfaceMappings ?? {})) {
        const surface = surfaces.find((candidate) => candidate.id === surfaceId);
        if (!surface) {
          errors.push(`Mode authority ${authority.family} maps ${mode} to unknown surface ${surfaceId}.`);
        } else if (surface.mode !== mode) {
          errors.push(
            `Mode authority ${authority.family} maps ${mode} to ${surfaceId}, whose mode is ${surface.mode ?? "missing"}.`,
          );
        }
      }
    } catch (error) {
      errors.push(`Mode authority ${authority.family} could not be inspected: ${error.message}.`);
    }
  }

  const mappedGuides = activeSurfaces.filter((surface) => Boolean(surface.wikiSlug)).length;
  const coverageExceptions = activeSurfaces.filter((surface) =>
    Boolean(surface.coverageException),
  ).length;
  const summary = {
    routeEntrypoints: routes.length,
    activeSurfaces: activeSurfaces.length,
    aliases: aliases.length,
    mappedGuides,
    coverageExceptions,
    unmappedGuides: activeSurfaces.length - mappedGuides,
  };

  return { errors, summary };
}

function runCli() {
  const jsonOutput = process.argv.includes("--json");
  const result = validateScreenDocumentation();
  if (jsonOutput) {
    console.log(JSON.stringify({ ok: result.errors.length === 0, ...result }, null, 2));
  } else if (result.errors.length > 0) {
    console.error("Workbench screen documentation governance failed:");
    for (const error of result.errors) console.error(`- ${error}`);
  } else {
    console.log(
      `Workbench screen documentation governance passed: ${result.summary.routeEntrypoints} routes, ` +
        `${result.summary.activeSurfaces} active screens/modes, ${result.summary.mappedGuides} mapped guides, ` +
        `${result.summary.coverageExceptions} governed exceptions.`,
    );
  }
  if (result.errors.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
