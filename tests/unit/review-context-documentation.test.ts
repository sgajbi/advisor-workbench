import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const rootDirectory = process.cwd();

function readRepositoryFile(...segments: string[]) {
  return fs
    .readFileSync(path.join(rootDirectory, ...segments), "utf8")
    .replaceAll("\r\n", "\n");
}

describe("governed review-context documentation", () => {
  it("keeps product architecture aligned to the atomic source-backed navigation contract", () => {
    const architecture = readRepositoryFile("wiki", "Architecture.md");

    expect(architecture).toContain("### Governed review context");
    expect(architecture).toContain("one atomic context");
    expect(architecture).toContain("substitute a demo or first-catalogue portfolio");
    expect(architecture).toContain("User decisions create browser history with `push`");
    expect(architecture).toContain("Query-key remounts are not an acceptable history mechanism");
  });

  it("gives future repository agents the same no-substitution and history rules", () => {
    const context = readRepositoryFile("REPOSITORY-ENGINEERING-CONTEXT.md");

    expect(context).toContain("src/shell/review-context.ts");
    expect(context).toContain("invalidates the complete context before source reads");
    expect(context).toContain("Use browser-history `push` for confirmed user decisions");
    expect(context).toContain("without query-key remounts or focus loss");
  });
});
