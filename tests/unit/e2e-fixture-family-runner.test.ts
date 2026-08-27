import { describe, expect, it } from "vitest";

import {
  buildFamilyProof,
  buildReuseEnvironment,
  parseFamilyArguments,
  provesValidatedBuild,
} from "../../scripts/testing/run-e2e-fixture-family.mjs";

const passedArtifact = {
  result: "passed",
  counts: {
    expected: 2,
    executed: 2,
    passed: 2,
    skipped: 0,
    failed: 0,
    timed_out: 0,
    interrupted: 0,
  },
};

describe("governed E2E fixture family runner", () => {
  it("selects one registered CI family while forwarding safe Playwright controls", () => {
    expect(parseFamilyArguments(["--family", "portfolio", "--workers=1"])).toEqual({
      familyName: "portfolio",
      forwardedArguments: ["--workers=1"],
    });
  });

  it("rejects positional values so package-manager flag stripping cannot widen proof", () => {
    expect(() => parseFamilyArguments(["portfolio"])).toThrow(
      /Unexpected positional argument portfolio/,
    );
  });

  it("reuses a build only after this invocation proves it", () => {
    expect(buildReuseEnvironment(false)).toEqual({
      PLAYWRIGHT_REUSE_VALIDATED_BUILD: "0",
    });
    expect(
      provesValidatedBuild({
        exitCode: 0,
        artifact: passedArtifact,
        buildExists: true,
      }),
    ).toBe(true);
    expect(buildReuseEnvironment(true)).toEqual({
      PLAYWRIGHT_REUSE_VALIDATED_BUILD: "1",
    });
  });

  it("does not admit reuse without a successful exact artifact and build", () => {
    expect(
      provesValidatedBuild({
        exitCode: 1,
        artifact: passedArtifact,
        buildExists: true,
      }),
    ).toBe(false);
    expect(
      provesValidatedBuild({
        exitCode: 0,
        artifact: null,
        buildExists: true,
      }),
    ).toBe(false);
    expect(
      provesValidatedBuild({
        exitCode: 0,
        artifact: passedArtifact,
        buildExists: false,
      }),
    ).toBe(false);
  });

  it("fails closed when a registered scenario is missing its proof artifact", () => {
    const proof = buildFamilyProof({
      familyName: "portfolio",
      scenarioOutcomes: [
        { scenario: "cashflow", exit_code: 0, artifact: passedArtifact },
        { scenario: "positions-status", exit_code: 1, artifact: null },
      ],
    });

    expect(proof.result).toBe("failed");
    expect(proof.findings).toContain(
      "portfolio/positions-status produced no result artifact.",
    );
  });

  it("fails closed when any scenario reports a skip", () => {
    const proof = buildFamilyProof({
      familyName: "performance",
      scenarioOutcomes: [
        {
          scenario: "populated",
          exit_code: 0,
          artifact: {
            ...passedArtifact,
            counts: { ...passedArtifact.counts, skipped: 1 },
          },
        },
      ],
    });

    expect(proof.result).toBe("failed");
    expect(proof.findings).toContain("performance skipped 1 registered tests.");
  });

  it("passes only when every scenario has exact non-empty proof", () => {
    const proof = buildFamilyProof({
      familyName: "manage",
      scenarioOutcomes: [
        { scenario: "overview", exit_code: 0, artifact: passedArtifact },
        { scenario: "mandate-health", exit_code: 0, artifact: passedArtifact },
      ],
    });

    expect(proof).toMatchObject({
      result: "passed",
      findings: [],
      counts: { scenarios: 2, expected: 4, executed: 4, skipped: 0 },
    });
  });
});
