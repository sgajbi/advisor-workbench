import { describe, expect, it } from "vitest";

import { resolveScaleProofDeploymentId } from "../../scripts/scale/scale-proof-configuration.mjs";

describe("scale-proof deployment identity", () => {
  it("uses the exact identity of a prebuilt protected image", () => {
    expect(
      resolveScaleProofDeploymentId({
        value: "c7bca92b75551d8f03505cb48da45ad59434c5b7",
        skipBuild: true,
      }),
    ).toBe("c7bca92b75551d8f03505cb48da45ad59434c5b7");
  });

  it("fails closed when a prebuilt image has no matching identity", () => {
    expect(() =>
      resolveScaleProofDeploymentId({ value: undefined, skipBuild: true }),
    ).toThrow("required when scale proof reuses a prebuilt image");
  });

  it("retains one explicit local identity only when the harness owns the build", () => {
    expect(
      resolveScaleProofDeploymentId({ value: undefined, skipBuild: false }),
    ).toBe("scale-proof-issue-619");
    expect(() =>
      resolveScaleProofDeploymentId({ value: "invalid identity", skipBuild: false }),
    ).toThrow("invalid for scale proof");
  });
});
