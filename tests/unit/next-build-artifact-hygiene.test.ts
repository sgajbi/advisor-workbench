import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

type CleanNextBuildArtifactsModule = {
  cleanNextBuildArtifacts: (options: {
    cwd: string;
    expectedPackageName?: string;
    fileSystem?: Pick<typeof fs, "existsSync" | "readFileSync" | "readdirSync" | "rmSync">;
  }) => string;
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
  it("removes only the repository-local production directory before builds", async () => {
    const { cleanNextBuildArtifacts } = await cleanModulePromise;
    const repository = createRepository("lotus-workbench");
    const nextDirectory = path.join(repository, ".next-build");
    const developmentDirectory = path.join(repository, ".next-dev");
    fs.mkdirSync(nextDirectory, { recursive: true });
    fs.mkdirSync(developmentDirectory, { recursive: true });
    fs.writeFileSync(path.join(nextDirectory, "stale-manifest.json"), "{}");
    fs.writeFileSync(path.join(developmentDirectory, "active-dev-chunk.js"), "active");

    const removedDirectory = cleanNextBuildArtifacts({ cwd: repository });

    expect(removedDirectory).toBe(nextDirectory);
    expect(fs.existsSync(nextDirectory)).toBe(false);
    expect(fs.readFileSync(path.join(developmentDirectory, "active-dev-chunk.js"), "utf8")).toBe(
      "active",
    );
    expect(fs.existsSync(path.join(repository, "package.json"))).toBe(true);
  });

  it("fails closed outside the Workbench package", async () => {
    const { cleanNextBuildArtifacts } = await cleanModulePromise;
    const repository = createRepository("not-workbench");

    expect(() => cleanNextBuildArtifacts({ cwd: repository })).toThrow(
      "Refusing to clean Next.js build artifacts",
    );
  });

  it("clears a verified mounted production directory without removing its mount point", async () => {
    const { cleanNextBuildArtifacts } = await cleanModulePromise;
    const repository = createRepository("lotus-workbench");
    const nextDirectory = path.join(repository, ".next-build");
    const nestedDirectory = path.join(nextDirectory, "cache");
    fs.mkdirSync(nestedDirectory, { recursive: true });
    fs.writeFileSync(path.join(nextDirectory, "BUILD_ID"), "stale");
    fs.writeFileSync(path.join(nestedDirectory, "stale-pack"), "stale");
    let simulatedMountPoint = true;

    const removedDirectory = cleanNextBuildArtifacts({
      cwd: repository,
      fileSystem: {
        existsSync: fs.existsSync,
        readFileSync: fs.readFileSync,
        readdirSync: fs.readdirSync,
        rmSync(target, options) {
          if (simulatedMountPoint && path.resolve(target.toString()) === nextDirectory) {
            simulatedMountPoint = false;
            throw Object.assign(new Error("resource busy or locked"), {
              code: "EBUSY",
              path: nextDirectory,
            });
          }
          fs.rmSync(target, options);
        },
      },
    });

    expect(removedDirectory).toBe(nextDirectory);
    expect(fs.existsSync(nextDirectory)).toBe(true);
    expect(fs.readdirSync(nextDirectory)).toEqual([]);
    expect(fs.existsSync(path.join(repository, "package.json"))).toBe(true);
  });
});

function createRepository(packageName: string): string {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "workbench-next-build-"));
  temporaryDirectories.push(repository);
  fs.writeFileSync(path.join(repository, "package.json"), JSON.stringify({ name: packageName }));
  return repository;
}
