import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("codebase review ledger governance", () => {
  it("prevents additional durable review identifier collisions", () => {
    const ledger = fs.readFileSync(
      path.join(process.cwd(), "docs", "architecture", "CODEBASE-REVIEW-LEDGER.md"),
      "utf8",
    );
    const identifiers = [...ledger.matchAll(/^\| (LWB-R\d{3}) \|/gm)].map(
      ([, identifier]) => identifier,
    );
    const collisionBaseline = Object.fromEntries(
      [...new Set(identifiers)]
        .map((identifier) => [
          identifier,
          identifiers.filter((candidate) => candidate === identifier).length,
        ] as const)
        .filter(([, count]) => count > 1),
    );

    expect(identifiers.length).toBeGreaterThan(0);
    expect(collisionBaseline).toEqual({
      "LWB-R033": 2,
      "LWB-R063": 2,
      "LWB-R064": 2,
      "LWB-R153": 2,
      "LWB-R154": 2,
      "LWB-R257": 2,
      "LWB-R258": 2,
    });
  });
});
