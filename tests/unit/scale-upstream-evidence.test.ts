import { describe, expect, it } from "vitest";

import {
  parseUpstreamAttemptChain,
  resolveSuccessfulTerminalUpstream,
} from "../../scripts/scale/upstream-evidence.mjs";

describe("scale upstream evidence", () => {
  it("uses the terminal successful replica instead of counting a retry chain as another replica", () => {
    expect(parseUpstreamAttemptChain("172.20.0.2:3000, 172.20.0.3:3000")).toEqual([
      "172.20.0.2:3000",
      "172.20.0.3:3000",
    ]);
    expect(
      resolveSuccessfulTerminalUpstream(
        "172.20.0.2:3000, 172.20.0.3:3000",
        true,
      ),
    ).toBe("172.20.0.3:3000");
  });

  it("does not count a terminal upstream from an unsuccessful response", () => {
    expect(resolveSuccessfulTerminalUpstream("172.20.0.2:3000", false)).toBe(
      "unknown",
    );
    expect(resolveSuccessfulTerminalUpstream(null, true)).toBe("unknown");
  });
});
