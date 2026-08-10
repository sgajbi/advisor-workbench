import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import ts from "typescript";

const INVENTORY_PATH =
  "docs/architecture/workbench-runtime-state-inventory.v1.json";
const SCHEMA_PATH =
  "docs/architecture/workbench-runtime-state-inventory.v1.schema.json";
const NEXT_CONFIG_PATH = "next.config.mjs";
const MUTABLE_COLLECTION_PATTERN = /\bnew\s+(?:Map|Set|WeakMap|WeakSet)\b|\bglobalThis\b/;
const PROHIBITED_SOURCE_FEATURES = [
  { name: "Server Action directive", pattern: /["']use server["']/ },
  { name: "Cache Component directive", pattern: /["']use cache(?::\s*remote)?["']/ },
  { name: "unstable_cache", pattern: /\bunstable_cache\s*\(/ },
  { name: "revalidatePath", pattern: /\brevalidatePath\s*\(/ },
  { name: "revalidateTag", pattern: /\brevalidateTag\s*\(/ },
  { name: "updateTag", pattern: /\bupdateTag\s*\(/ },
  { name: "cacheTag", pattern: /\bcacheTag\s*\(/ },
  { name: "cacheLife", pattern: /\bcacheLife\s*\(/ },
  { name: "force-cache fetch", pattern: /cache\s*:\s*["']force-cache["']/ },
  {
    name: "Next fetch revalidation",
    pattern: /next\s*:\s*\{[^}]*\b(?:revalidate|tags)\s*:/s,
  },
];
const PROHIBITED_NEXT_CONFIG_FEATURES = [
  { name: "cacheComponents", pattern: /\bcacheComponents\s*:/ },
  { name: "cacheHandler", pattern: /\bcacheHandlers?\s*:/ },
  { name: "serverActions", pattern: /\bserverActions\s*:/ },
  { name: "partial prerendering", pattern: /\bppr\s*:/ },
];

export function scanRuntimeStateHolders({ root = ".", sourceRoot = "src" } = {}) {
  const absoluteSourceRoot = join(root, sourceRoot);
  return collectSourceFiles(absoluteSourceRoot)
    .flatMap((file) => scanSourceFile(file, root))
    .sort(compareStateHolder);
}

export function validateRuntimeStateInventory({
  inventory,
  schema,
  sourceFiles,
  nextConfig,
  discoveredStateHolders,
  today = new Date().toISOString().slice(0, 10),
}) {
  const failures = [];
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  const validateSchema = ajv.compile(schema);
  if (!validateSchema(inventory)) {
    failures.push(
      ...validateSchema.errors.map(
        (error) => `runtime state schema ${error.instancePath || "/"} ${error.message}`,
      ),
    );
    return failures;
  }

  if (inventory.nextReviewBy < today) {
    failures.push(
      `runtime state inventory review expired on ${inventory.nextReviewBy}; current date is ${today}`,
    );
  }

  const ids = inventory.stateHolders.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    failures.push("runtime state holder ids must be unique");
  }

  const declared = inventory.stateHolders
    .flatMap(({ file, symbols }) => symbols.map((symbol) => ({ file, symbol })))
    .sort(compareStateHolder);
  const discovered = [...discoveredStateHolders].sort(compareStateHolder);
  for (const stateHolder of discovered) {
    if (!declared.some((entry) => sameStateHolder(entry, stateHolder))) {
      failures.push(
        `unreviewed module-scope runtime state ${stateHolder.file}:${stateHolder.symbol}`,
      );
    }
  }
  for (const stateHolder of declared) {
    if (!discovered.some((entry) => sameStateHolder(entry, stateHolder))) {
      failures.push(
        `stale runtime state declaration ${stateHolder.file}:${stateHolder.symbol}`,
      );
    }
  }

  for (const stateHolder of inventory.stateHolders) {
    if (stateHolder.temporaryException?.expiresOn < today) {
      failures.push(
        `runtime state exception ${stateHolder.id} expired on ${stateHolder.temporaryException.expiresOn}`,
      );
    }
    if (
      stateHolder.classification === "instance_telemetry" &&
      !stateHolder.temporaryException &&
      /unbounded|temporary exception/i.test(stateHolder.bounds)
    ) {
      failures.push(
        `instance telemetry ${stateHolder.id} must be bounded or carry an active exception`,
      );
    }
    if (stateHolder.classification === "browser_guarded_cache") {
      const source = sourceFiles[stateHolder.file] ?? "";
      if (!/target\s*===\s*["']client["']\s*&&/.test(source)) {
        failures.push(
          `browser-guarded cache ${stateHolder.id} must fail closed outside the client target`,
        );
      }
    }
    if (stateHolder.classification === "browser_inflight") {
      const source = sourceFiles[stateHolder.file] ?? "";
      if (!/^\s*["']use client["'];/m.test(source)) {
        failures.push(`browser in-flight state ${stateHolder.id} must live in a client module`);
      }
      for (const symbol of stateHolder.symbols) {
        if (!new RegExp(`${escapeRegExp(symbol)}\\.delete\\s*\\(`).test(source)) {
          failures.push(`browser in-flight state ${stateHolder.id}:${symbol} must delete settled entries`);
        }
      }
    }
  }

  for (const [file, source] of Object.entries(sourceFiles)) {
    for (const feature of PROHIBITED_SOURCE_FEATURES) {
      if (feature.pattern.test(source)) {
        failures.push(`unreviewed ${feature.name} in ${file}`);
      }
    }
  }
  for (const feature of PROHIBITED_NEXT_CONFIG_FEATURES) {
    if (feature.pattern.test(nextConfig)) {
      failures.push(`unreviewed Next configuration feature ${feature.name}`);
    }
  }

  return failures;
}

export function collectRuntimeStateInventoryFailures(root = ".") {
  const sourceFiles = Object.fromEntries(
    collectSourceFiles(join(root, "src")).map((file) => [
      normalizePath(relative(root, file)),
      readFileSync(file, "utf8"),
    ]),
  );
  return validateRuntimeStateInventory({
    inventory: readJson(join(root, INVENTORY_PATH)),
    schema: readJson(join(root, SCHEMA_PATH)),
    sourceFiles,
    nextConfig: readFileSync(join(root, NEXT_CONFIG_PATH), "utf8"),
    discoveredStateHolders: scanRuntimeStateHolders({ root }),
  });
}

function scanSourceFile(file, root) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const stateHolders = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }
      const initializer = declaration.initializer?.getText(sourceFile) ?? "";
      if (!isConst || MUTABLE_COLLECTION_PATTERN.test(initializer)) {
        stateHolders.push({
          file: normalizePath(relative(root, file)),
          symbol: declaration.name.text,
        });
      }
    }
  }
  return stateHolders;
}

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function compareStateHolder(left, right) {
  return `${left.file}:${left.symbol}`.localeCompare(`${right.file}:${right.symbol}`);
}

function sameStateHolder(left, right) {
  return left.file === right.file && left.symbol === right.symbol;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = collectRuntimeStateInventoryFailures(process.cwd());
  if (failures.length > 0) {
    console.error("Workbench runtime state governance failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Workbench runtime state governance passed.");
  }
}
