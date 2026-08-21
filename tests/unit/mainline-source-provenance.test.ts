import { describe, expect, it } from "vitest";

import { CANONICAL_REPOSITORIES, bindMainlineSourceManifestToRuntime, buildMainlineSourceManifest, canonicalRepositoryPath, evaluateRepository, validateMainlineSourceManifest } from "../../scripts/live/validation/mainline-source-provenance.mjs";

function gitFixture(values: Record<string, string>) {
  return (_path: string, args: string[]) => values[args.join(" ")] ?? "";
}

function recordingGitFixture(values: Record<string, string>, paths: string[]) {
  return (path: string, args: string[]) => {
    if (args.join(" ") === "fetch origin --prune") {
      paths.push(path);
    }
    return values[args.join(" ")] ?? "";
  };
}

describe("canonical mainline source provenance", () => {
  it("accepts a clean main checkout and an exact detached main SHA", () => {
    const runGit = gitFixture({ "fetch origin --prune": "", "status --porcelain": "", "rev-parse HEAD": "abc", "rev-parse refs/remotes/origin/main": "abc", "branch --show-current": "" });
    expect(evaluateRepository({ name: "lotus-idea", path: "unused", runGit })).toMatchObject({ passed: true, reason: "aligned_with_origin_main", branch: null });
  });

  it("fails closed for dirty, diverged, and non-main source checkouts", () => {
    const base = { "fetch origin --prune": "", "rev-parse HEAD": "abc", "rev-parse refs/remotes/origin/main": "abc", "branch --show-current": "feature/proof" };
    expect(evaluateRepository({ name: "lotus-idea", path: "unused", runGit: gitFixture({ ...base, "status --porcelain": " M docs/runbook.md" }) }).reason).toBe("dirty_worktree");
    expect(evaluateRepository({ name: "lotus-idea", path: "unused", runGit: gitFixture({ ...base, "status --porcelain": "", "rev-parse HEAD": "old" }) }).reason).toBe("head_not_origin_main");
    expect(evaluateRepository({ name: "lotus-idea", path: "unused", runGit: gitFixture({ ...base, "status --porcelain": "" }) }).reason).toBe("non_main_branch");
  });

  it("records every canonical participant without source paths or dirty filenames", () => {
    const manifest = buildMainlineSourceManifest("C:/projects", gitFixture({ "fetch origin --prune": "", "status --porcelain": "", "rev-parse HEAD": "abc", "rev-parse refs/remotes/origin/main": "abc", "branch --show-current": "main" }));
    expect(manifest).toMatchObject({ schemaVersion: "lotus.canonical-front-office.mainline-source-provenance.v1", passed: true });
    expect(manifest.repositories.map((repository) => repository.repository)).toContain("lotus-idea");
    expect(manifest.repositories.map((repository) => repository.repository)).toContain("lotus-platform");
    expect(JSON.stringify(manifest)).not.toContain("C:/projects");
  });

  it("uses the supplied Workbench repository path for isolated mainline preflight", () => {
    expect(canonicalRepositoryPath({
      name: "lotus-workbench",
      projectsRoot: "C:/projects",
      workbenchRepoPath: "C:/projects/_qa_worktrees/lotus-workbench-mainline",
    })).toBe("C:/projects/_qa_worktrees/lotus-workbench-mainline");
    expect(canonicalRepositoryPath({
      name: "lotus-idea",
      projectsRoot: "C:/projects",
      workbenchRepoPath: "C:/projects/_qa_worktrees/lotus-workbench-mainline",
    })).toMatch(/lotus-idea$/);
  });

  it("evaluates lotus-workbench from the isolated path while preserving sibling repo paths", () => {
    const paths: string[] = [];
    const manifest = buildMainlineSourceManifest("C:/projects", recordingGitFixture({
      "fetch origin --prune": "",
      "status --porcelain": "",
      "rev-parse HEAD": "abc",
      "rev-parse refs/remotes/origin/main": "abc",
      "branch --show-current": "main",
    }, paths), { workbenchRepoPath: "C:/projects/_qa_worktrees/lotus-workbench-mainline" });

    expect(manifest.passed).toBe(true);
    expect(paths).toContain("C:/projects/_qa_worktrees/lotus-workbench-mainline");
    expect(paths.some((path) => /lotus-idea$/.test(path))).toBe(true);
    expect(paths.some((path) => /lotus-workbench$/.test(path))).toBe(false);
  });

  it("rejects incomplete, failed, or arbitrary manifests before certification is asserted", () => {
    const validManifest = buildMainlineSourceManifest("C:/projects", gitFixture({ "fetch origin --prune": "", "status --porcelain": "", "rev-parse HEAD": "abc", "rev-parse refs/remotes/origin/main": "abc", "branch --show-current": "main" }));
    expect(validateMainlineSourceManifest(validManifest)).toBe(validManifest);
    expect(() => validateMainlineSourceManifest({ ...validManifest, repositories: validManifest.repositories.slice(1) })).toThrow("complete canonical participant set");
    expect(() => validateMainlineSourceManifest({ ...validManifest, passed: false })).toThrow("passing canonical certification preflight");
    expect(CANONICAL_REPOSITORIES).toContain("lotus-platform");
  });

  it("binds the Idea runtime version to the passing source manifest", () => {
    const manifest = buildMainlineSourceManifest("C:/projects", gitFixture({ "fetch origin --prune": "", "status --porcelain": "", "rev-parse HEAD": "abc", "rev-parse refs/remotes/origin/main": "abc", "branch --show-current": "main" }));
    expect(bindMainlineSourceManifestToRuntime(manifest, { repository: "lotus-idea", commitSha: "abc", branch: "main" })).toMatchObject({ repository: "lotus-idea", expectedMainSha: "abc" });
    expect(() => bindMainlineSourceManifestToRuntime(manifest, { repository: "lotus-idea", commitSha: "branch-built", branch: "main" })).toThrow("Runtime provenance does not match");
    expect(() => bindMainlineSourceManifestToRuntime(manifest, { repository: "lotus-idea", commitSha: "abc", branch: "feature/proof" })).toThrow("Runtime provenance does not match");
  });
});
