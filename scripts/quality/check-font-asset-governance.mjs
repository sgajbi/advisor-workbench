import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_TEXT_EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const REQUIRED_ROLES = new Set(["operational-ui", "brand-display", "technical-evidence"]);
const REQUIRED_FORBIDDEN_RUNTIME_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]);
const REQUIRED_GIT_ATTRIBUTES = [
  "src/assets/fonts/*.woff2 binary",
  "docs/licenses/fonts/*.txt text eol=lf -whitespace",
];

function resolveDefaultRepoRoot() {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

function isMainModule() {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function isContainedPath(parentPath, candidatePath) {
  const relativePath = relative(parentPath, candidatePath);
  return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}

function assertGovernedFile(repoRoot, file, expectedRoot, kind) {
  if (!file || typeof file.path !== "string" || typeof file.sha256 !== "string") {
    throw new Error(`Every ${kind} must declare path and sha256.`);
  }

  const normalizedPath = file.path.replaceAll("\\", "/");
  if (!normalizedPath.startsWith(`${expectedRoot}/`)) {
    throw new Error(`${file.path} must stay under ${expectedRoot}.`);
  }

  const absoluteRoot = resolve(repoRoot, expectedRoot);
  const absolutePath = resolve(repoRoot, normalizedPath);
  if (!isContainedPath(absoluteRoot, absolutePath)) {
    throw new Error(`${file.path} resolves outside ${expectedRoot}.`);
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error(`${file.path} is missing.`);
  }

  const realRoot = realpathSync(absoluteRoot);
  const realPath = realpathSync(absolutePath);
  if (!isContainedPath(realRoot, realPath)) {
    throw new Error(`${file.path} resolves outside ${expectedRoot}.`);
  }

  const actualHash = sha256(realPath);
  if (actualHash !== file.sha256.toLowerCase()) {
    throw new Error(`${file.path} checksum drifted: expected ${file.sha256}, received ${actualHash}.`);
  }
}

function sourceFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return entry.isFile() && SOURCE_TEXT_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function fontLoaderAssetPaths(repoRoot, fontLoaderText) {
  const loaderDirectory = resolve(repoRoot, "src/app");
  const assetRoot = resolve(repoRoot, "src/assets/fonts");
  const quotedWoff2Reference = /(["'`])([^"'`\r\n]+\.woff2)\1/g;

  return new Set([...fontLoaderText.matchAll(quotedWoff2Reference)].map((match) => {
    const absolutePath = resolve(loaderDirectory, match[2].replaceAll("\\", "/"));
    if (!isContainedPath(assetRoot, absolutePath)) {
      throw new Error(`${match[2]} in src/app/fonts.ts resolves outside src/assets/fonts.`);
    }
    return relative(repoRoot, absolutePath).replaceAll("\\", "/");
  }));
}

export function validateFontAssetGovernance({ repoRoot, manifest } = {}) {
  const effectiveRepoRoot = repoRoot ?? resolveDefaultRepoRoot();
  const effectiveManifest = manifest ?? JSON.parse(
    readFileSync(resolve(effectiveRepoRoot, "config/font-assets.json"), "utf8"),
  );
  const gitAttributes = readFileSync(resolve(effectiveRepoRoot, ".gitattributes"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const requiredAttribute of REQUIRED_GIT_ATTRIBUTES) {
    if (!gitAttributes.includes(requiredAttribute)) {
      throw new Error(`Font asset governance requires .gitattributes entry: ${requiredAttribute}.`);
    }
  }

  if (effectiveManifest.schemaVersion !== 1 || effectiveManifest.delivery !== "same-origin") {
    throw new Error("Font asset governance requires schemaVersion 1 and same-origin delivery.");
  }
  if (!Array.isArray(effectiveManifest.families) || effectiveManifest.families.length === 0) {
    throw new Error("Font asset governance requires at least one governed family.");
  }

  const roles = new Set();
  const governedAssetPaths = new Set();
  const fontLoaderText = readFileSync(resolve(effectiveRepoRoot, "src/app/fonts.ts"), "utf8");
  const loadedAssetPaths = fontLoaderAssetPaths(effectiveRepoRoot, fontLoaderText);

  for (const family of effectiveManifest.families) {
    if (!family.family || !family.version || family.license !== "OFL-1.1") {
      throw new Error("Every font family must declare family, version, and OFL-1.1 license truth.");
    }
    if (!family.upstream?.repository || !family.upstream?.tag || !/^[a-f0-9]{40}$/.test(family.upstream?.commit ?? "")) {
      throw new Error(`${family.family} must pin an upstream repository, tag, and 40-character commit SHA.`);
    }

    roles.add(family.role);
    assertGovernedFile(effectiveRepoRoot, family.licenseFile, "docs/licenses/fonts", "font license");

    if (!Array.isArray(family.assets) || family.assets.length === 0) {
      throw new Error(`${family.family} must declare at least one WOFF2 asset.`);
    }
    for (const asset of family.assets) {
      assertGovernedFile(effectiveRepoRoot, asset, "src/assets/fonts", "font asset");
      if (!asset.path.endsWith(".woff2")) {
        throw new Error(`${asset.path} must use the production-efficient WOFF2 format.`);
      }
      if (governedAssetPaths.has(asset.path)) {
        throw new Error(`${asset.path} is declared more than once.`);
      }
      governedAssetPaths.add(asset.path);

      if (!loadedAssetPaths.has(asset.path)) {
        throw new Error(`${asset.path} is governed but not loaded by src/app/fonts.ts.`);
      }
    }
  }

  const missingRoles = [...REQUIRED_ROLES].filter((role) => !roles.has(role));
  if (missingRoles.length > 0) {
    throw new Error(`Font asset governance is missing semantic roles: ${missingRoles.join(", ")}.`);
  }

  const ungovernedLoadedAssets = [...loadedAssetPaths]
    .filter((assetPath) => !governedAssetPaths.has(assetPath));
  if (ungovernedLoadedAssets.length > 0) {
    throw new Error(
      `Font assets loaded by src/app/fonts.ts must be governed in config/font-assets.json: ${ungovernedLoadedAssets.join(", ")}.`,
    );
  }

  const forbiddenHosts = effectiveManifest.forbiddenRuntimeHosts;
  if (!Array.isArray(forbiddenHosts) || forbiddenHosts.length === 0) {
    throw new Error("Font asset governance must declare forbiddenRuntimeHosts.");
  }
  const missingForbiddenHosts = [...REQUIRED_FORBIDDEN_RUNTIME_HOSTS]
    .filter((host) => !forbiddenHosts.includes(host));
  if (missingForbiddenHosts.length > 0) {
    throw new Error(
      `Font asset governance is missing required forbidden runtime hosts: ${missingForbiddenHosts.join(", ")}.`,
    );
  }

  const publicFontReferences = sourceFiles(resolve(effectiveRepoRoot, "src")).flatMap((filePath) => {
    const text = readFileSync(filePath, "utf8");
    return forbiddenHosts
      .filter((host) => text.includes(host))
      .map((host) => `${relative(effectiveRepoRoot, filePath).replaceAll("\\", "/")}: ${host}`);
  });
  if (publicFontReferences.length > 0) {
    throw new Error(`Public font runtime references are forbidden: ${publicFontReferences.join(", ")}.`);
  }
}

if (isMainModule()) {
  validateFontAssetGovernance();
  console.log("Font asset governance gate passed: licensed, checksummed, same-origin assets only.");
}
