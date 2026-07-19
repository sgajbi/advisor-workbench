import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readRepositoryFile(...segments: string[]): string {
  return readFileSync(resolve(process.cwd(), ...segments), "utf8");
}

describe("Docker CI parity governance", () => {
  it("bounds Vitest workers without weakening assertions or individual timeouts", () => {
    const compose = readRepositoryFile("docker-compose.ci-local.yml");

    expect(compose).toContain("npm run test -- --maxWorkers=2");
    expect(compose).not.toContain("--passWithNoTests");
    expect(compose).not.toContain("--testTimeout");
    expect(compose).not.toContain("--no-file-parallelism");
  });

  it("masks developer-local environment values with a tracked empty fixture", () => {
    const compose = readRepositoryFile("docker-compose.ci-local.yml");
    const ciEnvironment = readRepositoryFile("scripts", "testing", "ci-empty.env");

    expect(compose).toContain(
      "./scripts/testing/ci-empty.env:/app/.env.local:ro",
    );
    expect(ciEnvironment).toContain("Intentionally empty");
    expect(ciEnvironment).not.toContain("=");
  });
});
