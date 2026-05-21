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
  it("uses Gateway-provided supportability reasons before local fallback copy", () => {
    expect(getWorkspaceDisabledTitle(workspace({}))).toBe(
      "Advisory workspace is unavailable: lifecycle disabled."
    );
  });

  it("falls back without inventing an advisory supportability reason", () => {
    expect(
      getWorkspaceDisabledTitle(
        workspace({
          supportability: {
            state: "unavailable",
            reasons: [],
          },
        })
      )
    ).toBe("Advisory workspace is unavailable.");
  });
});
