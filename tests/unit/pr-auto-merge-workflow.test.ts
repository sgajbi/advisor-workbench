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
    expect(workflow).not.toContain("--auto --merge --delete-branch");
  });

  it("uses a non-suppressed auto-merge actor with read-only workflow permissions", () => {
    const workflow = readFileSync(
      join(repositoryRoot, ".github", "workflows", "pr-auto-merge.yml"),
      "utf8",
    );

    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("contents: write");
    expect(workflow).not.toContain("pull-requests: write");
    expect(workflow).toContain("GH_TOKEN: ${{ secrets.LOTUS_AUTOMERGE_TOKEN }}");
    expect(workflow).toContain("LOTUS_AUTOMERGE_TOKEN is required");
    expect(workflow).toContain("Skipping auto-merge");
    expect(workflow).not.toContain("GH_TOKEN: ${{ github.token }}");
  });

  it("dispatches main releasability after merged pull requests", () => {
    const dispatchWorkflow = readFileSync(
      join(repositoryRoot, ".github", "workflows", "merged-pr-main-releasability.yml"),
      "utf8",
    );
    const mainReleasabilityWorkflow = readFileSync(
      join(repositoryRoot, ".github", "workflows", "main-releasability.yml"),
      "utf8",
    );

    expect(dispatchWorkflow).toContain("name: Merged PR Main Releasability Dispatch");
    expect(dispatchWorkflow).toContain("types: [closed]");
    expect(dispatchWorkflow).toContain("github.event.pull_request.merged == true");
    expect(dispatchWorkflow).toContain("github.event.pull_request.base.ref == 'main'");
    expect(dispatchWorkflow).toContain("permissions:");
    expect(dispatchWorkflow).toContain("actions: write");
    expect(dispatchWorkflow).toContain("contents: write");
    expect(dispatchWorkflow).toContain("gh workflow run main-releasability.yml");
    expect(dispatchWorkflow).toContain(
      "MERGE_COMMIT_SHA: ${{ github.event.pull_request.merge_commit_sha }}",
    );
    expect(dispatchWorkflow).toContain('dispatch_ref="main-releasability-${MERGE_COMMIT_SHA}"');
    expect(dispatchWorkflow).toContain('-f expected_sha="$MERGE_COMMIT_SHA"');

    expect(mainReleasabilityWorkflow).toContain("concurrency:");
    expect(mainReleasabilityWorkflow).toContain(
      "group: ${{ github.workflow }}-${{ inputs.expected_sha || github.sha }}",
    );
    expect(mainReleasabilityWorkflow).toContain("cancel-in-progress: true");
    expect(mainReleasabilityWorkflow).toContain("expected_sha:");
    expect(mainReleasabilityWorkflow).toContain('actual_sha="$(git rev-parse HEAD)"');
    expect(mainReleasabilityWorkflow.split("concurrency:", 1)[0]).not.toContain("push:");
  });
});
