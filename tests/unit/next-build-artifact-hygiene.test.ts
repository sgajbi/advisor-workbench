import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

type CleanNextBuildArtifactsModule = {
  cleanNextBuildArtifacts: (options: { cwd: string; expectedPackageName?: string }) => string;
};

const cleanModulePromise =
  // @ts-expect-error The repository quality gate is a Node .mjs script without a TypeScript declaration.
  import("../../scripts/quality/clean-next-build-artifacts.mjs") as Promise<CleanNextBuildArtifactsModule>;

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("Next.js build artifact hygiene", () => {
  it("removes only the repository-local .next directory before production builds", async () => {
    const { cleanNextBuildArtifacts } = await cleanModulePromise;
    const repository = createRepository("lotus-workbench");
    const nextDirectory = path.join(repository, ".next");
    fs.mkdirSync(nextDirectory, { recursive: true });
    fs.writeFileSync(path.join(nextDirectory, "stale-manifest.json"), "{}");

    const removedDirectory = cleanNextBuildArtifacts({ cwd: repository });

    expect(removedDirectory).toBe(nextDirectory);
    expect(fs.existsSync(nextDirectory)).toBe(false);
    expect(fs.existsSync(path.join(repository, "package.json"))).toBe(true);
  });

  it("fails closed outside the Workbench package", async () => {
    const { cleanNextBuildArtifacts } = await cleanModulePromise;
    const repository = createRepository("not-workbench");

    expect(() => cleanNextBuildArtifacts({ cwd: repository })).toThrow(
      "Refusing to clean Next.js build artifacts",
    );
  });
});

function createRepository(packageName: string): string {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "workbench-next-build-"));
  temporaryDirectories.push(repository);
  fs.writeFileSync(path.join(repository, "package.json"), JSON.stringify({ name: packageName }));
  return repository;
}
