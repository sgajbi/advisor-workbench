import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REGISTRY_PATH = "docs/documentation/workbench-screen-registry.v1.json";
const ACTIVE_SURFACE_CLASSIFICATIONS = new Set(["active-screen", "active-mode"]);
const DEFAULT_NEXT_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];
const REQUIRED_MODE_AUTHORITY_FAMILIES = new Set([
  "performance",
  "performance-aliases",
  "manage",
  "advisory-journey",
  "proposal-lifecycle",
]);

function toRepositoryPath(value) {
  return value.split(path.sep).join("/");
}

export function isNextPageEntrypoint(filename, pageExtensions = DEFAULT_NEXT_PAGE_EXTENSIONS) {
  return pageExtensions.some((extension) => filename === `page.${extension}`);
}

function configuredNextPageExtensions(rootDirectory) {
  const configNames = [
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
    "next.config.ts",
    "next.config.mts",
    "next.config.cts",
  ];
  const configPath = configNames
    .map((name) => path.join(rootDirectory, name))
    .find((candidate) => fs.existsSync(candidate));
  if (!configPath) return DEFAULT_NEXT_PAGE_EXTENSIONS;

  const configSource = fs.readFileSync(configPath, "utf8");
  const configuredList = configSource.match(/\bpageExtensions\s*:\s*\[([\s\S]*?)\]/)?.[1];
  if (!configuredList) {
    if (/\bpageExtensions\b/.test(configSource)) {
      throw new Error(`${path.basename(configPath)} must declare pageExtensions as a literal array.`);
    }
    return DEFAULT_NEXT_PAGE_EXTENSIONS;
  }

  const extensions = [...configuredList.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  if (extensions.length === 0) {
    throw new Error(`${path.basename(configPath)} declares pageExtensions without literal values.`);
  }
  return extensions;
}

function collectPageEntrypoints(directory, rootDirectory, pageExtensions, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectPageEntrypoints(absolutePath, rootDirectory, pageExtensions, result);
    } else if (entry.isFile() && isNextPageEntrypoint(entry.name, pageExtensions)) {
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
    .replace(/\/page\.[^/]+$/, "")
    .replace(/\/\([^/]+\)/g, "")
    .replace(/\[([^\]]+)\]/g, "{$1}");
  return routeSource || "/";
}

export function extractAuthorityEntries(source, authority) {
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
      (match) => ({ mode: match[1], targetMode: null }),
    );
  }

  if (authority.extraction === "type-union") {
    const closingOffset = symbolSource.indexOf(";");
    if (closingOffset === -1) {
      throw new Error(`type union ${authority.symbol} has no terminator`);
    }
    return [...symbolSource.slice(0, closingOffset).matchAll(/["']([^"']+)["']/g)].map(
      (match) => ({ mode: match[1], targetMode: null }),
    );
  }

  if (authority.extraction === "object-entries") {
    const openingOffset = symbolSource.indexOf("{");
    const closingOffset = symbolSource.indexOf("\n};", openingOffset);
    if (openingOffset === -1 || closingOffset === -1) {
      throw new Error(`object ${authority.symbol} has no inspectable literal body`);
    }
    return [
      ...symbolSource
        .slice(openingOffset + 1, closingOffset)
        .matchAll(/^\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']\s*,?\s*$/gm),
    ].map((match) => ({ mode: match[1], targetMode: match[2] }));
  }

  throw new Error(`unsupported extraction strategy ${authority.extraction}`);
}

function resolveCanonicalSurface(surface, surfaces) {
  const visitedSurfaceIds = new Set();
  let target = surface;
  while (target?.surfaceClassification === "alias") {
    if (!target.canonicalSurfaceId || visitedSurfaceIds.has(target.canonicalSurfaceId)) return null;
    visitedSurfaceIds.add(target.canonicalSurfaceId);
    target = surfaces.find((candidate) => candidate.id === target.canonicalSurfaceId);
  }
  return target ?? null;
}

export function validateModeAuthority(authority, source, surfaces) {
  const errors = [];
  try {
    const sourceEntries = extractAuthorityEntries(source, authority);
    const sourceModes = new Set(sourceEntries.map((entry) => entry.mode));
    const mappedModes = new Set(Object.keys(authority.surfaceMappings ?? {}));

    for (const mode of duplicateValues(sourceEntries.map((entry) => entry.mode))) {
      errors.push(`Mode authority ${authority.family} has duplicate source mode: ${mode}.`);
    }
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
        continue;
      }
      if (surface.mode !== mode) {
        errors.push(
          `Mode authority ${authority.family} maps ${mode} to ${surfaceId}, whose mode is ${surface.mode ?? "missing"}.`,
        );
      }

      const targetMode = sourceEntries.find((entry) => entry.mode === mode)?.targetMode;
      if (targetMode) {
        const canonicalSurface = resolveCanonicalSurface(surface, surfaces);
        if (canonicalSurface?.mode !== targetMode) {
          errors.push(
            `Mode authority ${authority.family} source alias ${mode} targets ${targetMode}, but ${surfaceId} resolves to canonical mode ${canonicalSurface?.mode ?? "missing"}.`,
          );
        }
      }
    }
  } catch (error) {
    errors.push(`Mode authority ${authority.family} could not be inspected: ${error.message}.`);
  }
  return errors;
}

function wikiLinksToSlug(content, slug) {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\[[^\\]]+\\]\\(${escapedSlug}(?:\\.md)?(?:#[^)]+)?\\)`).test(content);
}

export function hasExactMarkdownHeading(content, expectedHeading) {
  let fence = null;

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const suffix = fenceMatch[2];
      if (fence === null) {
        fence = { character: marker[0], length: marker.length };
      } else if (
        marker[0] === fence.character &&
        marker.length >= fence.length &&
        suffix.trim() === ""
      ) {
        fence = null;
      }
      continue;
    }
    if (
      fence === null &&
      /^ {0,3}#{1,6}[\t ]+\S/.test(line) &&
      trimmedLine === expectedHeading
    ) {
      return true;
    }
  }

  return false;
}

const CATALOGUE_OWNER_LABELS = new Map([
  ["lotus-gateway", "Gateway"],
  ["lotus-core", "Core"],
  ["lotus-performance", "Performance"],
  ["lotus-risk", "Risk"],
  ["lotus-manage", "Manage"],
  ["lotus-ai", "Lotus AI"],
  ["lotus-advise", "Advise"],
  ["lotus-idea", "Lotus Idea"],
  ["lotus-report", "Report"],
  ["Lotus domain services", "Lotus domain services"],
]);

function joinBusinessLabels(labels) {
  if (labels.length < 2) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function catalogueRouteLabel(surface) {
  if (!surface.mode || surface.mode === "proposal-builder") return surface.routePattern;
  return `${surface.routePattern}?mode=${surface.mode}`;
}

function cataloguePostureLabel(surface) {
  return {
    active: "Active",
    "runtime-capability-gated": "Runtime-gated",
    "capability-disabled": "Capability-disabled",
  }[surface.navigationPosture];
}

function parseCatalogueRows(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter(
      (cells) =>
        cells.length === 5 &&
        cells[1] !== "Route or mode" &&
        !cells.every((cell) => /^:?-{3,}:?$/.test(cell)),
    )
    .map((cells) => cells.map((cell) => cell.replace(/^`([^`]+)`$/, "$1")));
}

function catalogueBusinessName(cell) {
  return cell.match(/^\[([^\]]+)\]\([^)]+\)$/)?.[1] ?? cell;
}

function catalogueGuideStatus(surface, governingIssue) {
  if (!surface.coverageException) return "Guide available";
  if (surface.wikiSlug) return "Existing guide; complete-standard alignment planned";
  return `Guide planned — #${governingIssue}`;
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
  for (const duplicate of duplicateValues(authorities.map((authority) => authority.family))) {
    errors.push(`Duplicate mode authority family: ${duplicate}.`);
  }
  const registeredAuthorityFamilies = new Set(authorities.map((authority) => authority.family));
  for (const family of setDifference(
    REQUIRED_MODE_AUTHORITY_FAMILIES,
    registeredAuthorityFamilies,
  )) {
    errors.push(`Required mode authority is missing: ${family}.`);
  }
  for (const family of setDifference(
    registeredAuthorityFamilies,
    REQUIRED_MODE_AUTHORITY_FAMILIES,
  )) {
    errors.push(`Unexpected mode authority family: ${family}.`);
  }
  for (const duplicate of duplicateValues(
    activeSurfaces.map((surface) => surface.wikiSlug).filter(Boolean),
  )) {
    errors.push(`Duplicate active wiki slug: ${duplicate}.`);
  }

  const appDirectory = path.join(rootDirectory, "src", "app");
  const discoveredEntrypoints = new Set(
    fs.existsSync(appDirectory)
      ? collectPageEntrypoints(
          appDirectory,
          rootDirectory,
          configuredNextPageExtensions(rootDirectory),
        ).sort()
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
      } else if (
        ["active-supported-screen", "active-route-container"].includes(route.routeClassification)
      ) {
        const surface = surfaces.find((candidate) => candidate.id === surfaceId);
        if (surface.routePattern !== route.routePattern) {
          errors.push(
            `Active route ${route.routePattern} references ${surfaceId}, whose canonical route is ${surface.routePattern}.`,
          );
        }
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
  } else {
    const catalogueRows = parseCatalogueRows(fs.readFileSync(cataloguePath, "utf8"));
    const rowsByRoute = new Map();
    for (const row of catalogueRows) {
      const routeLabel = row[1];
      if (rowsByRoute.has(routeLabel)) {
        errors.push(`Screen guide catalogue has duplicate route or mode: ${routeLabel}.`);
      } else {
        rowsByRoute.set(routeLabel, row);
      }
    }

    const expectedRoutes = new Set();
    for (const surface of activeSurfaces) {
      const routeLabel = catalogueRouteLabel(surface);
      expectedRoutes.add(routeLabel);
      const row = rowsByRoute.get(routeLabel);
      if (!row) {
        errors.push(`Screen guide catalogue is missing active surface ${surface.id}: ${routeLabel}.`);
        continue;
      }

      const actualBusinessName = catalogueBusinessName(row[0]);
      if (actualBusinessName !== surface.businessName) {
        errors.push(
          `Screen guide catalogue name for ${surface.id} must be ${surface.businessName}, not ${actualBusinessName}.`,
        );
      }

      const expectedPosture = cataloguePostureLabel(surface);
      if (row[2] !== expectedPosture) {
        errors.push(
          `Screen guide catalogue posture for ${surface.id} must be ${expectedPosture}, not ${row[2]}.`,
        );
      }

      const expectedOwners = joinBusinessLabels(
        (surface.sourceOwners ?? []).map(
          (owner) => CATALOGUE_OWNER_LABELS.get(owner) ?? owner,
        ),
      );
      if (row[4] !== expectedOwners) {
        errors.push(
          `Screen guide catalogue owners for ${surface.id} must be ${expectedOwners}, not ${row[4]}.`,
        );
      }


      const expectedGuideStatus = catalogueGuideStatus(surface, registry.governingIssue);
      if (row[3] !== expectedGuideStatus) {
        errors.push(
          `Screen guide catalogue guide status for ${surface.id} must be ${expectedGuideStatus}, not ${row[3]}.`,
        );
      }
    }

    for (const routeLabel of rowsByRoute.keys()) {
      if (!expectedRoutes.has(routeLabel)) {
        errors.push(`Screen guide catalogue contains an unregistered route or mode: ${routeLabel}.`);
      }
    }
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
      } else {
        const visitedSurfaceIds = new Set([surface.id]);
        let target = surface;
        while (target.surfaceClassification === "alias") {
          if (visitedSurfaceIds.has(target.canonicalSurfaceId)) {
            errors.push(
              `Alias ${surface.id} must terminate at a non-alias canonical surface; cycle detected at ${target.canonicalSurfaceId}.`,
            );
            break;
          }
          visitedSurfaceIds.add(target.canonicalSurfaceId);
          target = surfaces.find((candidate) => candidate.id === target.canonicalSurfaceId);
          if (!target) break;
        }
      }
      if (surface.wikiSlug) {
        errors.push(`Alias ${surface.id} must reuse its canonical guide instead of ${surface.wikiSlug}.`);
      }
      continue;
    }

    if (!ACTIVE_SURFACE_CLASSIFICATIONS.has(surface.surfaceClassification)) continue;

    const isMappedByCanonicalRoute = routes.some(
      (route) =>
        route.routePattern === surface.routePattern &&
        route.canonicalSurfaceIds?.includes(surface.id),
    );
    if (!isMappedByCanonicalRoute) {
      errors.push(
        `Active surface ${surface.id} is not mapped by its canonical route ${surface.routePattern}.`,
      );
    }

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
          if (!hasExactMarkdownHeading(guideContent, heading)) {
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

    errors.push(
      ...validateModeAuthority(
        authority,
        fs.readFileSync(sourcePath, "utf8"),
        surfaces,
      ),
    );
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
        `${result.summary.activeSurfaces} active screens/modes, ${result.summary.aliases} aliases, ` +
        `${result.summary.mappedGuides} mapped guides, ` +
        `${result.summary.coverageExceptions} governed exceptions.`,
    );
  }
  if (result.errors.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
