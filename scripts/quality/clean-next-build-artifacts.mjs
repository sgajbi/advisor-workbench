import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_PACKAGE_NAME = "lotus-workbench";
const NEXT_BUILD_DIRECTORY = ".next";

export function cleanNextBuildArtifacts({
  cwd = process.cwd(),
  expectedPackageName = EXPECTED_PACKAGE_NAME,
  fileSystem = fs,
} = {}) {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fileSystem.existsSync(packageJsonPath)) {
    throw new Error(`Cannot clean Next.js build artifacts: package.json not found at ${packageJsonPath}.`);
  }

  const packageJson = JSON.parse(fileSystem.readFileSync(packageJsonPath, "utf8"));
  if (packageJson.name !== expectedPackageName) {
    throw new Error(
      `Refusing to clean Next.js build artifacts for package '${packageJson.name ?? "unknown"}'. Expected '${expectedPackageName}'.`,
    );
  }

  const buildDirectory = path.resolve(cwd, NEXT_BUILD_DIRECTORY);
  const relativeBuildDirectory = path.relative(cwd, buildDirectory);
  if (relativeBuildDirectory !== NEXT_BUILD_DIRECTORY) {
    throw new Error(`Refusing to clean unexpected Next.js build directory: ${buildDirectory}.`);
  }

  removeBuildDirectory(fileSystem, buildDirectory);
  return buildDirectory;
}

function removeBuildDirectory(fileSystem, buildDirectory) {
  const removalOptions = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 };

  try {
    fileSystem.rmSync(buildDirectory, removalOptions);
    return;
  } catch (error) {
    if (!isBusyMountPoint(error, buildDirectory)) throw error;
  }

  for (const entry of fileSystem.readdirSync(buildDirectory)) {
    const entryPath = path.resolve(buildDirectory, entry);
    if (path.dirname(entryPath) !== buildDirectory) {
      throw new Error(`Refusing to clean unexpected Next.js build artifact: ${entryPath}.`);
    }
    fileSystem.rmSync(entryPath, removalOptions);
  }
}

function isBusyMountPoint(error, buildDirectory) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "EBUSY" &&
    "path" in error &&
    typeof error.path === "string" &&
    path.resolve(error.path) === buildDirectory
  );
}

function run() {
  const removedDirectory = cleanNextBuildArtifacts();
  console.log(`Cleared prior Next.js build artifacts at ${removedDirectory}.`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  run();
}
