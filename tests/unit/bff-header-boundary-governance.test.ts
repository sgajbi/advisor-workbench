import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type BffHeaderBoundaryViolation = {
  file: string;
  control: string;
  reason: string;
};

type BffHeaderBoundaryModule = {
  REQUIRED_BFF_HEADER_BOUNDARY_CALL: string;
  findBffHeaderBoundaryViolations: (options: {
    repoRoot: string;
    routeRoot: string;
  }) => BffHeaderBoundaryViolation[];
};

const boundaryModulePromise =
  // @ts-expect-error The repository quality gate is a Node .mjs script without a TypeScript declaration.
  import("../../scripts/quality/check-bff-header-boundary.mjs") as Promise<BffHeaderBoundaryModule>;

const repoRoot = path.resolve(__dirname, "..", "..");

function createFixtureRoute(source: string): {
  fixtureRoot: string;
  routeRoot: string;
} {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lotus-bff-header-boundary-"));
  const routeRoot = path.join(fixtureRoot, "src", "app", "api", "bff", "[...path]");
  fs.mkdirSync(routeRoot, { recursive: true });
  fs.writeFileSync(path.join(routeRoot, "route.ts"), source, "utf8");
  return { fixtureRoot, routeRoot };
}

describe("BFF request-header boundary governance", () => {
  it("accepts the governed builder as the only browser-header entry point", async () => {
    const { findBffHeaderBoundaryViolations, REQUIRED_BFF_HEADER_BOUNDARY_CALL } =
      await boundaryModulePromise;
    const fixture = createFixtureRoute(
      `const headers = ${REQUIRED_BFF_HEADER_BOUNDARY_CALL};\n`,
    );

    try {
      expect(
        findBffHeaderBoundaryViolations({
          repoRoot: fixture.fixtureRoot,
          routeRoot: fixture.routeRoot,
        }),
      ).toEqual([]);
    } finally {
      fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it.each([
    "request.headers.forEach((value, key) => headers.set(key, value));",
    "const copied = new Headers(request.headers);",
    "const copied = Object.fromEntries(request.headers.entries());",
    "const actor = request.headers.get('X-Actor-Id');",
    "const options = { headers: request.headers };",
    "const copied = new Headers(request['headers']);",
    "const req = request; const copied = new Headers(req.headers);",
    "let req; req = request; const copied = new Headers(req.headers);",
    "const { headers } = request; const copied = new Headers(headers);",
    "const { headers: browserHeaders } = request; const copied = new Headers(browserHeaders);",
    "const copied = new Headers((request as Request).headers);",
  ])("rejects raw browser-header access: %s", async (rawAccess) => {
    const { findBffHeaderBoundaryViolations, REQUIRED_BFF_HEADER_BOUNDARY_CALL } =
      await boundaryModulePromise;
    const fixture = createFixtureRoute(
      `const headers = ${REQUIRED_BFF_HEADER_BOUNDARY_CALL};\n${rawAccess}\n`,
    );

    try {
      expect(
        findBffHeaderBoundaryViolations({
          repoRoot: fixture.fixtureRoot,
          routeRoot: fixture.routeRoot,
        }),
      ).toEqual([
        expect.objectContaining({ control: "raw-browser-header-access" }),
      ]);
    } finally {
      fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when no BFF route files are scanned", async () => {
    const { findBffHeaderBoundaryViolations } = await boundaryModulePromise;
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "lotus-bff-header-boundary-empty-"),
    );
    const routeRoot = path.join(fixtureRoot, "src", "app", "api", "bff");
    fs.mkdirSync(routeRoot, { recursive: true });

    try {
      expect(
        findBffHeaderBoundaryViolations({ repoRoot: fixtureRoot, routeRoot }),
      ).toEqual([
        expect.objectContaining({ control: "no-bff-routes-found" }),
      ]);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a BFF route that omits the governed builder", async () => {
    const { findBffHeaderBoundaryViolations } = await boundaryModulePromise;
    const fixture = createFixtureRoute("export async function GET() {}\n");

    try {
      expect(
        findBffHeaderBoundaryViolations({
          repoRoot: fixture.fixtureRoot,
          routeRoot: fixture.routeRoot,
        }),
      ).toEqual([
        expect.objectContaining({ control: "missing-governed-header-builder" }),
      ]);
    } finally {
      fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("runs the repository-wide boundary scan in the sequential lint gate", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["quality:bff-header-boundary"]).toBe(
      "node scripts/quality/check-bff-header-boundary.mjs",
    );
    expect(packageJson.scripts.lint).toContain(
      "npm run quality:bff-header-boundary",
    );
  });
});
