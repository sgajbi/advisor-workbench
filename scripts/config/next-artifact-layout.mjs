import path from "node:path";

export const NEXT_DEVELOPMENT_DIRECTORY = ".next-dev";
export const NEXT_PRODUCTION_DIRECTORY = ".next-build";

const GOVERNED_NEXT_DIRECTORIES = new Set([
  NEXT_DEVELOPMENT_DIRECTORY,
  NEXT_PRODUCTION_DIRECTORY,
]);

export function resolveGovernedNextDirectory({
  cwd = process.cwd(),
  directory,
} = {}) {
  if (!GOVERNED_NEXT_DIRECTORIES.has(directory)) {
    throw new Error(
      `Refusing to use ungoverned Next.js artifact directory: ${directory ?? "undefined"}.`,
    );
  }

  const resolvedDirectory = path.resolve(cwd, directory);
  if (path.relative(cwd, resolvedDirectory) !== directory) {
    throw new Error(
      `Refusing to use Next.js artifacts outside the repository: ${resolvedDirectory}.`,
    );
  }

  return resolvedDirectory;
}
