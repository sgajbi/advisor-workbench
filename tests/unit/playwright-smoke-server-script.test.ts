import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Playwright smoke server launcher", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/start-playwright-smoke-server.mjs"),
    "utf8",
  );

  it("starts Next directly and forwards shutdown signals without a shell child", () => {
    expect(source).toContain('import { cleanNextBuildArtifacts }');
    expect(source).toContain('cleanNextBuildArtifacts();');
    expect(source).toContain('spawn(process.execPath, [nextCli, ...args]');
    expect(source).toContain('child.kill(signal)');
    expect(source).toContain('process.once("SIGTERM"');
    expect(source).toContain('shell: false');
    expect(source).not.toContain("rmSync");
  });

  it("reuses a build only through the explicit validated-build contract", () => {
    expect(source).toContain('PLAYWRIGHT_REUSE_VALIDATED_BUILD === "1"');
    expect(source).toContain('existsSync(validatedBuildMarker)');
    expect(source).toContain("requires an existing .next/BUILD_ID");
  });

  it("starts on the validated explicit Playwright port", () => {
    expect(source).toContain('process.env.PLAYWRIGHT_PORT?.trim() || "3000"');
    expect(source).toContain('String(playwrightPort)');
    expect(source).toContain("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
  });
});
