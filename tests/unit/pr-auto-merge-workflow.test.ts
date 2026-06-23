import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = join(__dirname, "..", "..");

describe("PR auto-merge workflow", () => {
  it("uses the repository-supported rebase merge method", () => {
    const workflow = readFileSync(
      join(repositoryRoot, ".github", "workflows", "pr-auto-merge.yml"),
      "utf8",
    );

    expect(workflow).toContain("gh pr merge");
    expect(workflow).toContain("--auto --rebase --delete-branch");
    expect(workflow).toContain("required status checks are expected");
    expect(workflow).toContain("gh pr view");
    expect(workflow).toContain(".autoMergeRequest != null");
    expect(workflow).toContain("Auto-merge was not queued");
    expect(workflow).not.toContain("--auto --merge --delete-branch");
  });
});
