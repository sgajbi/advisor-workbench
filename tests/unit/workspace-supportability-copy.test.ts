import { describe, expect, it } from "vitest";

import { getWorkspaceDisabledTitle } from "../../src/shell/workspace-supportability-copy";
import type { PlatformShellWorkspaceDescriptor } from "../../src/features/platform-capabilities/types";

function workspace(
  overrides: Partial<PlatformShellWorkspaceDescriptor>
): PlatformShellWorkspaceDescriptor {
  return {
    id: "advisory",
    label: "Advisory",
    href: "/recommendations",
    enabled: false,
    supportability: {
      state: "unsupported",
      reasons: ["lifecycle_disabled"],
    },
    freshness: {
      state: "current",
      freshnessClass: "workflow_truth",
      evaluatedAt: "2026-05-21T00:00:00Z",
      maxAgeSeconds: 0,
    },
    evidence: {
      state: "source_backed",
      lineageSources: ["lotus_advise"],
      partialFailure: false,
      sourceErrorServices: [],
    },
    versioning: {
      shellContractVersion: "shell-bootstrap.v1",
      capabilityContractVersion: "v1",
      sourcePolicyVersion: "advisory.v1",
    },
    caching: {
      cacheMode: "authoritative_read",
      invalidationOwner: "lotus_advise",
      staleReadTolerance: "none",
      revalidateOnNavigation: true,
      ttlSeconds: 0,
      correctnessCritical: true,
    },
    ...overrides,
  };
}

describe("getWorkspaceDisabledTitle", () => {
  it.each([
    [
      "lifecycle_disabled",
      "Advisory is not enabled for the current operating configuration.",
    ],
    [
      "advisory_disabled",
      "Advisory is not enabled for the current operating configuration.",
    ],
    [
      "dependency_degraded",
      "Advisory is temporarily unavailable because required information could not be retrieved.",
    ],
    [
      "lotus_advise_unavailable",
      "Advisory is temporarily unavailable because required information could not be retrieved.",
    ],
    [
      "policy_review_required",
      "Advisory is unavailable until the required business review is complete.",
    ],
    ["advisory_disabled_in_fallback", "Advisory availability could not be confirmed."],
    ["lotus_advise_unknown", "Advisory availability could not be confirmed."],
  ])("maps the known %s reason to business availability copy", (reason, expected) => {
    expect(
      getWorkspaceDisabledTitle(
        workspace({ supportability: { state: "unavailable", reasons: [reason] } })
      )
    ).toBe(expected);
  });

  it("fails closed without exposing an unknown source reason", () => {
    const title = getWorkspaceDisabledTitle(
      workspace({
        supportability: {
          state: "unavailable",
          reasons: ["FUTURE_TECHNICAL_REASON_97"],
        },
      })
    );

    expect(title).toBe("Advisory availability could not be confirmed.");
    expect(title).not.toContain("FUTURE");
    expect(title).not.toContain("97");
  });

  it("uses neutral business copy when the source supplies no reason", () => {
    expect(
      getWorkspaceDisabledTitle(
        workspace({
          supportability: {
            state: "unavailable",
            reasons: [],
          },
        })
      )
    ).toBe("Advisory availability could not be confirmed.");
  });
});
