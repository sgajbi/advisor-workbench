import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const SOURCE_TEXT_EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const REQUIRED_ROLES = new Set(["operational-ui", "brand-display", "technical-evidence"]);
const REQUIRED_ROLE_VARIABLES = new Map([
  ["operational-ui", "--font-lotus-ui-face"],
  ["brand-display", "--font-lotus-display-face"],
  ["technical-evidence", "--font-lotus-mono-face"],
]);
const REQUIRED_ROLE_PRELOAD = new Map([
  ["operational-ui", true],
  ["brand-display", true],
  ["technical-evidence", false],
]);
const REQUIRED_ROLE_CONSUMERS = new Map([
  ["operational-ui", { css: "--font-ui", typescript: "ui" }],
  ["brand-display", { css: "--font-display", typescript: "display" }],
  ["technical-evidence", { css: "--font-mono", typescript: "mono" }],
]);
const REQUIRED_FORBIDDEN_RUNTIME_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const REQUIRED_GIT_ATTRIBUTES = ["src/assets/fonts/** binary", "docs/licenses/fonts/** text eol=lf -whitespace"];
const REMOTE_FONT_DELIVERY_PATTERNS = [
  ["remote stylesheet import", /@import\s+(?:url\(\s*)?["']?\s*(?:https?:)?\/\//i],
  ["remote font asset", /(?:https?:)?\/\/[^\s"'`)<]+\.(?:woff2?|ttf|otf|eot)(?:[?#][^\s"'`)<]*)?/i],
  ["remote stylesheet link", /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["'](?:https?:)?\/\/)[^>]*>/i],
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

function storedFontAssetPaths(repoRoot) {
  const assetRoot = resolve(repoRoot, "src/assets/fonts");
  if (!existsSync(assetRoot)) {
    return [];
  }

  function fontAssets(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return fontAssets(absolutePath);
      }
      if (!entry.isFile() || !/\.(?:woff2?|ttf|otf|eot)$/i.test(entry.name)) {
        return [];
      }
      return [relative(repoRoot, absolutePath).replaceAll("\\", "/")];
    });
  }

  return fontAssets(assetRoot);
}

function propertyAssignment(objectLiteral, propertyName) {
  return objectLiteral.properties.find((property) => ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === propertyName);
}

function objectLiteralExpression(node) {
  let candidate = node;
  while (ts.isAsExpression(candidate) || ts.isSatisfiesExpression(candidate) || ts.isParenthesizedExpression(candidate)) {
    candidate = candidate.expression;
  }
  return ts.isObjectLiteralExpression(candidate) ? candidate : undefined;
}

function staticFontPath(node, description) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  throw new Error(`${description} in src/app/fonts.ts must use a static string path.`);
}

function optionalStaticProperty(objectLiteral, propertyName, description) {
  const property = propertyAssignment(objectLiteral, propertyName);
  return property ? staticFontPath(property.initializer, description) : undefined;
}

function staticBooleanProperty(objectLiteral, propertyName) {
  const property = propertyAssignment(objectLiteral, propertyName);
  if (!property) {
    return undefined;
  }
  if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  throw new Error(`localFont ${propertyName} in src/app/fonts.ts must use a static boolean.`);
}

function bindingIdentifierNames(name) {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : bindingIdentifierNames(element.name)));
}

function assertNoLoaderShadowing(sourceFile, loaderIdentifier) {
  function visit(node) {
    let names = [];
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      names = bindingIdentifierNames(node.name);
    } else if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name) {
      names = [node.name.text];
    }
    if (names.includes(loaderIdentifier)) {
      throw new Error(`src/app/fonts.ts must not shadow the ${loaderIdentifier} import from next/font/local.`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function localFontCalls(fontLoaderText) {
  const sourceFile = ts.createSourceFile("src/app/fonts.ts", fontLoaderText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const loaderImports = sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "next/font/local" || !statement.importClause?.name) {
      return [];
    }
    return [statement.importClause.name.text];
  });
  if (loaderImports.length !== 1) {
    throw new Error("src/app/fonts.ts must default-import next/font/local.");
  }
  const loaderIdentifier = loaderImports[0];
  assertNoLoaderShadowing(sourceFile, loaderIdentifier);

  const calls = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === loaderIdentifier) {
      const configuration = node.arguments[0];
      if (!configuration || !ts.isObjectLiteralExpression(configuration)) {
        throw new Error("Every localFont call must use an inline configuration object.");
      }
      const source = propertyAssignment(configuration, "src");
      if (!source) {
        throw new Error("Every localFont call must declare src.");
      }
      const variable = propertyAssignment(configuration, "variable");
      if (!variable) {
        throw new Error("Every localFont call must declare its semantic CSS variable.");
      }
      const semanticVariable = staticFontPath(variable.initializer, "localFont variable");
      const preload = staticBooleanProperty(configuration, "preload");
      const sourceReferences = [];
      if (ts.isArrayLiteralExpression(source.initializer)) {
        for (const entry of source.initializer.elements) {
          if (!ts.isObjectLiteralExpression(entry)) {
            throw new Error("Every localFont src array entry must declare an inline path object.");
          }
          const path = propertyAssignment(entry, "path");
          if (!path) {
            throw new Error("Every localFont src array entry must declare path.");
          }
          sourceReferences.push({
            path: staticFontPath(path.initializer, "localFont path"),
            style: optionalStaticProperty(entry, "style", "localFont style"),
            weight: optionalStaticProperty(entry, "weight", "localFont weight"),
          });
        }
      } else {
        sourceReferences.push({
          path: staticFontPath(source.initializer, "localFont src"),
          style: optionalStaticProperty(configuration, "style", "localFont style"),
          weight: optionalStaticProperty(configuration, "weight", "localFont weight"),
        });
      }
      calls.push({ preload, semanticVariable, sourceReferences });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (calls.length === 0) {
    throw new Error("src/app/fonts.ts must declare at least one localFont call.");
  }
  return calls;
}

function fontLoaderAssets(repoRoot, fontLoaderText) {
  const loaderDirectory = resolve(repoRoot, "src/app");
  const assetRoot = resolve(repoRoot, "src/assets/fonts");

  return localFontCalls(fontLoaderText).flatMap(({ preload, semanticVariable, sourceReferences }) =>
    sourceReferences.map((sourceReference) => {
      if (!sourceReference.path.toLowerCase().endsWith(".woff2")) {
        throw new Error(`${sourceReference.path} in src/app/fonts.ts must use the WOFF2 format.`);
      }
      const absolutePath = resolve(loaderDirectory, sourceReference.path.replaceAll("\\", "/"));
      if (!isContainedPath(assetRoot, absolutePath)) {
        throw new Error(`${sourceReference.path} in src/app/fonts.ts resolves outside src/assets/fonts.`);
      }
      return {
        path: relative(repoRoot, absolutePath).replaceAll("\\", "/"),
        preload,
        semanticVariable,
        style: sourceReference.style,
        weight: sourceReference.weight,
      };
    }),
  );
}

function fontModuleReferences(sourceFile) {
  const moduleNames = [];
  function visit(node) {
    let moduleName = null;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      moduleName = node.moduleSpecifier.text;
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      moduleName = node.arguments[0].text;
    }
    if (moduleName?.startsWith("next/font/") || moduleName?.startsWith("@fontsource/") || moduleName?.startsWith("typeface-")) {
      moduleNames.push(moduleName);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return moduleNames;
}

function staticJsxAttributeValue(attribute) {
  if (!attribute?.initializer) {
    return undefined;
  }
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }
  const expression = ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : undefined;
  return expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) ? expression.text : undefined;
}

function hasRuntimeJsxStylesheetLink(sourceFile) {
  let runtimeStylesheetLink = false;
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile).toLowerCase() === "link") {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const rel = attributes.find((attribute) => attribute.name.getText(sourceFile) === "rel");
      const relValue = staticJsxAttributeValue(rel)?.toLowerCase();
      if (relValue === "stylesheet") {
        runtimeStylesheetLink = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return runtimeStylesheetLink;
}

function usesBrowserFontFaceApi(sourceFile) {
  let usesFontFace = false;
  function visit(node) {
    if (
      ts.isNewExpression(node) &&
      (ts.isIdentifier(node.expression) ? node.expression.text === "FontFace" : ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "FontFace")
    ) {
      usesFontFace = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return usesFontFace;
}

function hasDirectCssFontFamily(text) {
  return [...text.matchAll(/(?:^|[;{])\s*font-family\s*:\s*([^;}]+)(?:;|})/gi)].some((match) => !/^var\(--font-(?:ui|display|mono)(?:\s*,|\))/i.test(match[1].trim()));
}

function hasDirectCssFontShorthand(text) {
  const safeReset = /^(?:inherit|initial|revert|revert-layer|unset)$/i;
  return [...text.matchAll(/(?:^|[;{])\s*font\s*:\s*([^;}]+)(?:;|})/gi)].some((match) => {
    const value = match[1].trim();
    return !safeReset.test(value) && !/var\(--font-(?:ui|display|mono)(?:\s*,|\))/i.test(value);
  });
}

function isGovernedTypescriptFontValue(node, sourceFile) {
  const source = node.getText(sourceFile);
  if (/^lotusThemeTokens\.typography\.fontFamily\.(?:ui|display|mono)$/.test(source)) {
    return true;
  }
  if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
    return false;
  }
  return /^(?:inherit|initial|revert|revert-layer|unset)$/i.test(node.text) || /var\(--font-(?:ui|display|mono)(?:\s*,|\))/i.test(node.text);
}

function assignedFontPropertyName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  if (ts.isElementAccessExpression(node) && node.argumentExpression && (ts.isStringLiteral(node.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(node.argumentExpression))) {
    return node.argumentExpression.text;
  }
  return undefined;
}

function hasDirectTypescriptFontDeclaration(sourceFile, relativePath) {
  if (relativePath === "src/design-system/theme/tokens.ts") {
    return false;
  }
  let directFamily = false;
  function visit(node) {
    const propertyName = ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : undefined;
    if ((propertyName === "font" || propertyName === "fontFamily") && !isGovernedTypescriptFontValue(node.initializer, sourceFile)) {
      directFamily = true;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ["font", "fontFamily"].includes(assignedFontPropertyName(node.left) ?? "") &&
      !isGovernedTypescriptFontValue(node.right, sourceFile)
    ) {
      directFamily = true;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "setProperty" &&
      node.arguments.length >= 2 &&
      ts.isStringLiteral(node.arguments[0]) &&
      ["font", "font-family"].includes(node.arguments[0].text) &&
      !isGovernedTypescriptFontValue(node.arguments[1], sourceFile)
    ) {
      directFamily = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return directFamily;
}

function nonCanonicalFontDelivery(relativePath, text) {
  const violations = [];
  if (/@font-face\b/i.test(text)) {
    violations.push("direct @font-face declaration");
  }
  for (const [label, pattern] of REMOTE_FONT_DELIVERY_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(label);
    }
  }
  if (hasDirectCssFontFamily(text)) {
    violations.push("font-family outside shared semantic tokens");
  }
  if (hasDirectCssFontShorthand(text)) {
    violations.push("font shorthand outside shared semantic tokens");
  }

  if (extname(relativePath) !== ".css") {
    const sourceFile = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true, relativePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (hasRuntimeJsxStylesheetLink(sourceFile)) {
      violations.push("runtime stylesheet link outside governed loader");
    }
    if (usesBrowserFontFaceApi(sourceFile)) {
      violations.push("browser FontFace API outside governed loader");
    }
    if (hasDirectTypescriptFontDeclaration(sourceFile, relativePath)) {
      violations.push("font or fontFamily outside shared semantic tokens");
    }
    for (const moduleName of fontModuleReferences(sourceFile)) {
      if (moduleName.startsWith("next/font/") && moduleName !== "next/font/local") {
        violations.push(`non-local Next font loader ${moduleName}`);
      } else if (moduleName === "next/font/local" && relativePath !== "src/app/fonts.ts") {
        violations.push("next/font/local outside src/app/fonts.ts");
      } else if (moduleName.startsWith("@fontsource/") || moduleName.startsWith("typeface-")) {
        violations.push(`non-canonical font package ${moduleName}`);
      }
    }
  }
  return [...new Set(violations)].map((violation) => `${relativePath}: ${violation}`);
}

function cssCustomProperties(text) {
  return new Map([...text.matchAll(/(?:^|\n)\s*(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function typescriptFontFamilyTokens(text) {
  const sourceFile = ts.createSourceFile("src/design-system/theme/tokens.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tokenDeclaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "lotusThemeTokens");
  const tokenObject = tokenDeclaration?.initializer ? objectLiteralExpression(tokenDeclaration.initializer) : undefined;
  if (!tokenObject) {
    throw new Error("src/design-system/theme/tokens.ts must declare lotusThemeTokens as an object literal.");
  }

  const typography = propertyAssignment(tokenObject, "typography");
  const typographyObject = typography ? objectLiteralExpression(typography.initializer) : undefined;
  if (!typographyObject) {
    throw new Error("lotusThemeTokens must declare typography as an object literal.");
  }
  const fontFamily = propertyAssignment(typographyObject, "fontFamily");
  const fontFamilyObject = fontFamily ? objectLiteralExpression(fontFamily.initializer) : undefined;
  if (!fontFamilyObject) {
    throw new Error("lotusThemeTokens.typography must declare fontFamily as an object literal.");
  }

  const tokens = new Map();
  for (const property of fontFamilyObject.properties) {
    if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
      tokens.set(property.name.text, staticFontPath(property.initializer, `fontFamily.${property.name.text}`));
    }
  }
  return tokens;
}

function validateSemanticTokenConsumers(repoRoot) {
  const cssPath = resolve(repoRoot, "src/styles/global/tokens.css");
  const typescriptPath = resolve(repoRoot, "src/design-system/theme/tokens.ts");
  const cssTokens = cssCustomProperties(readFileSync(cssPath, "utf8"));
  const typescriptTokens = typescriptFontFamilyTokens(readFileSync(typescriptPath, "utf8"));

  for (const [role, consumers] of REQUIRED_ROLE_CONSUMERS) {
    const expectedVariable = REQUIRED_ROLE_VARIABLES.get(role);
    const expectedPrefix = `var(${expectedVariable})`;
    const cssValue = cssTokens.get(consumers.css);
    const typescriptValue = typescriptTokens.get(consumers.typescript);
    if (!cssValue?.startsWith(expectedPrefix)) {
      throw new Error(`${consumers.css} must consume ${expectedVariable} for ${role}.`);
    }
    if (!typescriptValue?.startsWith(expectedPrefix)) {
      throw new Error(`fontFamily.${consumers.typescript} must consume ${expectedVariable} for ${role}.`);
    }
  }
}

export function validateFontAssetGovernance({ repoRoot, manifest } = {}) {
  const effectiveRepoRoot = repoRoot ?? resolveDefaultRepoRoot();
  const effectiveManifest = manifest ?? JSON.parse(readFileSync(resolve(effectiveRepoRoot, "config/font-assets.json"), "utf8"));
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
  const loadedAssets = fontLoaderAssets(effectiveRepoRoot, fontLoaderText);
  const loadedAssetsByPath = new Map();
  for (const loadedAsset of loadedAssets) {
    if (loadedAssetsByPath.has(loadedAsset.path)) {
      throw new Error(`${loadedAsset.path} is loaded more than once by src/app/fonts.ts.`);
    }
    loadedAssetsByPath.set(loadedAsset.path, loadedAsset);
  }

  for (const family of effectiveManifest.families) {
    if (!family.family || !family.version || family.license !== "OFL-1.1") {
      throw new Error("Every font family must declare family, version, and OFL-1.1 license truth.");
    }
    if (!family.upstream?.repository || !family.upstream?.tag || !/^[a-f0-9]{40}$/.test(family.upstream?.commit ?? "")) {
      throw new Error(`${family.family} must pin an upstream repository, tag, and 40-character commit SHA.`);
    }

    if (!REQUIRED_ROLE_VARIABLES.has(family.role)) {
      throw new Error(`${family.family} declares unsupported semantic role ${family.role}.`);
    }
    if (roles.has(family.role)) {
      throw new Error(`Semantic font role ${family.role} is declared more than once.`);
    }
    roles.add(family.role);
    assertGovernedFile(effectiveRepoRoot, family.licenseFile, "docs/licenses/fonts", "font license");

    if (!Array.isArray(family.assets) || family.assets.length === 0) {
      throw new Error(`${family.family} must declare at least one WOFF2 asset.`);
    }
    for (const asset of family.assets) {
      assertGovernedFile(effectiveRepoRoot, asset, "src/assets/fonts", "font asset");
      if (typeof asset.weight !== "string" || !asset.weight.trim() || typeof asset.style !== "string" || !asset.style.trim()) {
        throw new Error(`${asset.path} must declare nonempty weight and style descriptors.`);
      }
      if (!asset.path.endsWith(".woff2")) {
        throw new Error(`${asset.path} must use the production-efficient WOFF2 format.`);
      }
      if (governedAssetPaths.has(asset.path)) {
        throw new Error(`${asset.path} is declared more than once.`);
      }
      governedAssetPaths.add(asset.path);

      const loadedAsset = loadedAssetsByPath.get(asset.path);
      if (!loadedAsset) {
        throw new Error(`${asset.path} is governed but not loaded by src/app/fonts.ts.`);
      }
      const expectedVariable = REQUIRED_ROLE_VARIABLES.get(family.role);
      if (loadedAsset.semanticVariable !== expectedVariable) {
        throw new Error(`${asset.path} for ${family.role} must be loaded through ${expectedVariable}, received ${loadedAsset.semanticVariable}.`);
      }
      if (loadedAsset.weight !== asset.weight || loadedAsset.style !== asset.style) {
        throw new Error(`${asset.path} loader descriptors must match manifest weight ${asset.weight} and style ${asset.style}.`);
      }
      const expectedPreload = REQUIRED_ROLE_PRELOAD.get(family.role);
      if (loadedAsset.preload !== expectedPreload) {
        throw new Error(`${asset.path} for ${family.role} must declare preload: ${expectedPreload}.`);
      }
    }
  }

  const missingRoles = [...REQUIRED_ROLES].filter((role) => !roles.has(role));
  if (missingRoles.length > 0) {
    throw new Error(`Font asset governance is missing semantic roles: ${missingRoles.join(", ")}.`);
  }

  validateSemanticTokenConsumers(effectiveRepoRoot);

  const ungovernedLoadedAssets = [...loadedAssetsByPath.keys()].filter((assetPath) => !governedAssetPaths.has(assetPath));
  if (ungovernedLoadedAssets.length > 0) {
    throw new Error(`Font assets loaded by src/app/fonts.ts must be governed in config/font-assets.json: ${ungovernedLoadedAssets.join(", ")}.`);
  }

  const ungovernedStoredAssets = storedFontAssetPaths(effectiveRepoRoot).filter((assetPath) => !governedAssetPaths.has(assetPath));
  if (ungovernedStoredAssets.length > 0) {
    throw new Error(`Font assets stored under src/assets/fonts must be governed in config/font-assets.json: ${ungovernedStoredAssets.join(", ")}.`);
  }

  const forbiddenHosts = effectiveManifest.forbiddenRuntimeHosts;
  if (!Array.isArray(forbiddenHosts) || forbiddenHosts.length === 0) {
    throw new Error("Font asset governance must declare forbiddenRuntimeHosts.");
  }
  const missingForbiddenHosts = [...REQUIRED_FORBIDDEN_RUNTIME_HOSTS].filter((host) => !forbiddenHosts.includes(host));
  if (missingForbiddenHosts.length > 0) {
    throw new Error(`Font asset governance is missing required forbidden runtime hosts: ${missingForbiddenHosts.join(", ")}.`);
  }

  const publicFontReferences = sourceFiles(resolve(effectiveRepoRoot, "src")).flatMap((filePath) => {
    const text = readFileSync(filePath, "utf8");
    const normalizedText = text.toLowerCase();
    return forbiddenHosts.filter((host) => normalizedText.includes(host.toLowerCase())).map((host) => `${relative(effectiveRepoRoot, filePath).replaceAll("\\", "/")}: ${host}`);
  });
  if (publicFontReferences.length > 0) {
    throw new Error(`Public font runtime references are forbidden: ${publicFontReferences.join(", ")}.`);
  }

  const fontDeliveryViolations = sourceFiles(resolve(effectiveRepoRoot, "src")).flatMap((filePath) => {
    const relativePath = relative(effectiveRepoRoot, filePath).replaceAll("\\", "/");
    return nonCanonicalFontDelivery(relativePath, readFileSync(filePath, "utf8"));
  });
  if (fontDeliveryViolations.length > 0) {
    throw new Error(`Font delivery must remain same-origin through src/app/fonts.ts: ${fontDeliveryViolations.join(", ")}.`);
  }
}

if (isMainModule()) {
  validateFontAssetGovernance();
  console.log("Font asset governance gate passed: licensed, checksummed, same-origin assets only.");
}
