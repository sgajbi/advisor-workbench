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
