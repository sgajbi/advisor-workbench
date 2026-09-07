import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Playwright smoke server launcher", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/start-playwright-smoke-server.mjs"),
    "utf8",
  )
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");

  it("starts Next directly and forwards shutdown signals without a shell child", () => {
    expect(source).toContain("import { NEXT_PRODUCTION_DIRECTORY }");
    expect(source).toContain("import { cleanNextBuildArtifacts }");
    expect(source).toContain("cleanNextBuildArtifacts();");
    expect(source).toContain("spawn(process.execPath, [nextCli, ...args]");
    expect(source).toContain("child.kill(signal)");
    expect(source).toContain('process.once("SIGTERM"');
    expect(source).toContain("shell: false");
    expect(source).not.toContain("rmSync");
  });

  it("runs the generated standalone server and stages its generated static assets", () => {
    expect(source).toContain('resolve(standaloneRoot, "server.js")');
    expect(source).toContain(
      "resolve(projectRoot, NEXT_PRODUCTION_DIRECTORY, \"static\")",
    );
    expect(source).toContain("standaloneRoot,\n  NEXT_PRODUCTION_DIRECTORY,");
    expect(source).toContain(
      "cpSync(generatedStaticAssets, standaloneStaticAssets",
    );
    expect(source).toContain("spawn(process.execPath, [standaloneServerPath]");
    expect(source).toContain("...environment");
    expect(source).toContain('HOSTNAME: "127.0.0.1"');
    expect(source).toContain("PORT: String(playwrightPort)");
    expect(source).not.toContain('nextCli,\n      "start"');
  });

  it("fails closed when standalone server or static output is absent", () => {
    expect(source).toContain("if (!existsSync(standaloneServerPath))");
    expect(source).toContain(
      "Playwright smoke requires ${NEXT_PRODUCTION_DIRECTORY}/standalone/server.js from a successful production build.",
    );
    expect(source).toContain("if (!existsSync(generatedStaticAssets))");
    expect(source).toContain(
      "Playwright smoke requires generated ${NEXT_PRODUCTION_DIRECTORY}/static assets from a successful production build.",
    );
  });

  it("reuses a build only through the explicit validated-build contract", () => {
    expect(source).toContain('PLAYWRIGHT_REUSE_VALIDATED_BUILD === "1"');
    expect(source).toContain("existsSync(validatedBuildMarker)");
    expect(source).toContain(
      "requires an existing ${NEXT_PRODUCTION_DIRECTORY}/BUILD_ID",
    );
  });

  it("starts on the validated explicit Playwright port", () => {
    expect(source).toContain('process.env.PLAYWRIGHT_PORT?.trim() || "3000"');
    expect(source).toContain("String(playwrightPort)");
    expect(source).toContain(
      "PLAYWRIGHT_PORT must be an integer between 1 and 65535.",
    );
  });

  it("owns source-confirmed server context without overriding caller fixtures", () => {
    expect(source).toContain("startPlaywrightSourceFixtureGateway");
    expect(source).toContain("if (!environment.BFF_BASE_URL?.trim())");
    expect(source).toContain(
      'environment.WORKBENCH_E2E_FIXTURE_GATEWAY = "playwright-smoke"',
    );
    expect(source).toContain(
      'environment.PLAYWRIGHT_E2E_FIXTURE = "source-context"',
    );
    expect(source).toContain("await sourceFixture?.close()");
  });

  it("starts the fixture-backed Workbench in an explicit test authority posture", () => {
    expect(source).toContain(
      'environment.LOTUS_ENVIRONMENT?.trim() || "dev"',
    );
  });
});
