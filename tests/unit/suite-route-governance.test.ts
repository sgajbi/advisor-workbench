import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

describe("legacy Suite route governance", () => {
  it("keeps Suite as a thin alias of the canonical Home entry", () => {
    const routeSource = fs.readFileSync(
      path.join(repoRoot, "src/app/suite/page.tsx"),
      "utf8",
    );

    expect(routeSource.trim()).toBe('export { default } from "@/apps/home/page";');
  });

  it("does not ship a separate Suite feature or fabricated business dataset", () => {
    const suiteFeatureRoot = path.join(repoRoot, "src/features/suite");
    const shippedEntries = fs.existsSync(suiteFeatureRoot)
      ? fs.readdirSync(suiteFeatureRoot)
      : [];

    expect(shippedEntries).toEqual([]);
  });
});
