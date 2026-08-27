import { describe, expect, it } from "vitest";

import { evaluateScenarioProof } from "../../scripts/testing/e2e-scenario-reporter.mjs";

describe("governed E2E scenario reporter", () => {
  it("passes only when the exact registered tests complete successfully", () => {
    const proof = evaluateScenarioProof({
      expectedTests: ["first proof", "second proof"],
      plannedTests: ["first proof", "second proof"],
      results: [
        { title: "first proof", status: "passed" },
        { title: "second proof", status: "passed" },
      ],
    });

    expect(proof.result).toBe("passed");
    expect(proof.findings).toEqual([]);
    expect(proof.counts).toMatchObject({
      expected: 2,
      planned: 2,
      executed: 2,
      passed: 2,
      skipped: 0,
    });
  });

  it.each(["skipped", "failed", "timedOut", "interrupted"] as const)(
    "fails when an expected test finishes with %s",
    (status) => {
      const proof = evaluateScenarioProof({
        expectedTests: ["source-backed proof"],
        plannedTests: ["source-backed proof"],
        results: [{ title: "source-backed proof", status }],
      });

      expect(proof.result).toBe("failed");
      expect(proof.findings).toContain(
        `Expected test "source-backed proof" finished with ${status}.`,
      );
    },
  );

  it("fails on missing, unexpected, and duplicate test identities", () => {
    const proof = evaluateScenarioProof({
      expectedTests: ["required proof"],
      plannedTests: ["unexpected proof", "unexpected proof"],
      results: [{ title: "unexpected proof", status: "passed" }],
    });

    expect(proof.result).toBe("failed");
    expect(proof.findings).toEqual(
      expect.arrayContaining([
        'Expected test was not selected: "required proof".',
        'Selected test identity is duplicated: "unexpected proof".',
        'Unexpected test was selected: "unexpected proof".',
      ]),
    );
  });

  it("fails when a retried test passes only after a non-passing attempt", () => {
    const proof = evaluateScenarioProof({
      expectedTests: ["source-backed proof"],
      plannedTests: ["source-backed proof"],
      results: [
        { title: "source-backed proof", retry: 0, status: "failed" },
        { title: "source-backed proof", retry: 1, status: "passed" },
      ],
    });

    expect(proof.result).toBe("failed");
    expect(proof.findings).toEqual(
      expect.arrayContaining([
        'Test execution is duplicated: "source-backed proof".',
        'Test attempt "source-backed proof" finished with failed.',
      ]),
    );
    expect(proof.counts).toMatchObject({
      executed: 2,
      passed: 1,
      failed: 1,
    });
  });

  it("fails closed on an empty selection", () => {
    const proof = evaluateScenarioProof({
      expectedTests: [],
      plannedTests: [],
      results: [],
    });

    expect(proof.result).toBe("failed");
    expect(proof.findings).toContain(
      "Scenario proof selected zero expected or zero planned tests.",
    );
  });
});
