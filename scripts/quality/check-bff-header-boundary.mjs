import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_BFF_HEADER_BOUNDARY_CALL =
  "buildGatewayBffRequestHeaders(request.headers)";

function defaultRepoRoot() {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

function isMainModule() {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

function collectBffRouteFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return collectBffRouteFiles(entryPath);
      }
      return entry.name === "route.ts" ? [entryPath] : [];
    });
}

export function findBffHeaderBoundaryViolations({
  repoRoot = defaultRepoRoot(),
  routeRoot = resolve(repoRoot, "src", "app", "api", "bff"),
} = {}) {
  return collectBffRouteFiles(routeRoot).flatMap((filePath) => {
    const contents = readFileSync(filePath, "utf8");
    const file = relative(repoRoot, filePath).replaceAll("\\", "/");
    const violations = [];

    if (!contents.includes(REQUIRED_BFF_HEADER_BOUNDARY_CALL)) {
      violations.push({
        file,
        control: "missing-governed-header-builder",
        reason:
          "Every Workbench BFF route must enter Gateway through the governed request-header builder.",
      });
    }

    const sourceOutsideBoundary = contents.replaceAll(
      REQUIRED_BFF_HEADER_BOUNDARY_CALL,
      "",
    );
    if (sourceOutsideBoundary.includes("request.headers")) {
      violations.push({
        file,
        control: "raw-browser-header-access",
        reason:
          "BFF routes must not read or copy browser headers outside the governed allowlist boundary.",
      });
    }

    return violations;
  });
}

export function validateBffHeaderBoundary(options) {
  const violations = findBffHeaderBoundaryViolations(options);
  if (violations.length === 0) {
    return;
  }

  const detail = violations
    .map(({ file, control, reason }) => `- ${file}: ${control} (${reason})`)
    .join("\n");
  throw new Error(`BFF request-header boundary violations:\n${detail}`);
}

if (isMainModule()) {
  validateBffHeaderBoundary();
  console.log("BFF request-header boundary gate passed.");
}
