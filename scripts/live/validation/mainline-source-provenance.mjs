import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const CANONICAL_REPOSITORIES = [
  "lotus-core", "lotus-performance", "lotus-risk", "lotus-ai", "lotus-advise",
  "lotus-manage", "lotus-report", "lotus-archive", "lotus-render", "lotus-idea",
  "lotus-gateway", "lotus-workbench", "lotus-platform",
];

function git(repoPath, args, runGit) {
  return runGit(repoPath, args).trim();
}

export function evaluateRepository({ name, path, runGit }) {
  try {
    git(path, ["fetch", "origin", "--prune"], runGit);
    const dirty = git(path, ["status", "--porcelain"], runGit).length > 0;
    const headSha = git(path, ["rev-parse", "HEAD"], runGit);
    const expectedMainSha = git(path, ["rev-parse", "refs/remotes/origin/main"], runGit);
    const branch = git(path, ["branch", "--show-current"], runGit);
    const reason = dirty
      ? "dirty_worktree"
      : headSha !== expectedMainSha
        ? "head_not_origin_main"
        : branch !== "" && branch !== "main"
          ? "non_main_branch"
          : "aligned_with_origin_main";
    return { repository: name, branch: branch || null, headSha, expectedMainSha, passed: reason === "aligned_with_origin_main", reason };
  } catch {
    return { repository: name, branch: null, headSha: null, expectedMainSha: null, passed: false, reason: "repository_unavailable_or_invalid" };
  }
}

export function buildMainlineSourceManifest(projectsRoot, runGit) {
  const repositories = CANONICAL_REPOSITORIES.map((name) =>
    evaluateRepository({ name, path: join(projectsRoot, name), runGit }),
  );
  return {
    schemaVersion: "lotus.canonical-front-office.mainline-source-provenance.v1",
    proofScope: "canonical_front_office_mainline_source_preflight",
    certificationClassification: "mainline_certification_preflight",
    repositories,
    passed: repositories.every((repository) => repository.passed),
  };
}

export function validateMainlineSourceManifest(manifest) {
  if (
    !manifest ||
    manifest.schemaVersion !== "lotus.canonical-front-office.mainline-source-provenance.v1" ||
    manifest.proofScope !== "canonical_front_office_mainline_source_preflight" ||
    manifest.certificationClassification !== "mainline_certification_preflight" ||
    manifest.passed !== true ||
    !Array.isArray(manifest.repositories)
  ) {
    throw new Error("Mainline source provenance manifest is not a passing canonical certification preflight.");
  }
  const names = manifest.repositories.map((repository) => repository?.repository);
  if (names.length !== CANONICAL_REPOSITORIES.length || new Set(names).size !== names.length || CANONICAL_REPOSITORIES.some((name) => !names.includes(name))) {
    throw new Error("Mainline source provenance manifest does not cover the complete canonical participant set.");
  }
  for (const repository of manifest.repositories) {
    if (
      repository.passed !== true ||
      repository.reason !== "aligned_with_origin_main" ||
      !repository.headSha ||
      repository.headSha !== repository.expectedMainSha ||
      (repository.branch !== null && repository.branch !== "main")
    ) {
      throw new Error(`Mainline source provenance manifest contains an invalid participant: ${repository.repository}.`);
    }
  }
  return manifest;
}

export function loadValidatedMainlineSourceManifest(manifestPath) {
  return validateMainlineSourceManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
}

function defaultRunGit(repoPath, args) {
  return execFileSync("git", ["-C", repoPath, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && process.argv[1].endsWith("mainline-source-provenance.mjs")) {
  const projectsRoot = readArgument("--projects-root");
  const output = readArgument("--output");
  if (!projectsRoot || !output) throw new Error("Usage: mainline-source-provenance.mjs --projects-root <path> --output <path>");
  const manifest = buildMainlineSourceManifest(projectsRoot, defaultRunGit);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  if (!manifest.passed) {
    const failed = manifest.repositories.filter((repository) => !repository.passed).map((repository) => `${repository.repository}:${repository.reason}`).join(", ");
    throw new Error(`Canonical mainline source provenance failed: ${failed}`);
  }
}
