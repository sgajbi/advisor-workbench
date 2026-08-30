import { describe, expect, it } from "vitest";

import {
  buildProposalSourceWindowHref,
  parseProposalSourceWindowContext,
} from "@/features/proposals/proposal-source-window-navigation";

describe("proposal source-window navigation", () => {
  it("parses an exact page-local source cursor and window", () => {
    expect(
      parseProposalSourceWindowContext(
        new URLSearchParams("cursor=opaque-window-2&sourceWindow=2"),
      ),
    ).toEqual({
      status: "valid",
      context: { cursor: "opaque-window-2", windowNumber: 2 },
    });
  });

  it("rejects partial, repeated, malformed, and unbounded addresses", () => {
    for (const search of [
      "cursor=opaque-window-2",
      "sourceWindow=2",
      "cursor=a&cursor=b&sourceWindow=2",
      "cursor=opaque-window-2&sourceWindow=02",
      "cursor=opaque-window-2&sourceWindow=0",
      `cursor=${"x".repeat(2_049)}&sourceWindow=2`,
    ]) {
      expect(
        parseProposalSourceWindowContext(new URLSearchParams(search)),
      ).toEqual({ status: "invalid" });
    }
  });

  it("preserves governed and page-local state while replacing the source window", () => {
    expect(
      buildProposalSourceWindowHref(
        "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=approval-queue&selectedRecordId=PRP-2",
        { cursor: "opaque-window-2", windowNumber: 2 },
      ),
    ).toBe(
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=approval-queue&selectedRecordId=PRP-2&cursor=opaque-window-2&sourceWindow=2",
    );

    expect(
      buildProposalSourceWindowHref(
        "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&cursor=opaque-window-2&sourceWindow=2",
        { windowNumber: 1 },
      ),
    ).toBe("/proposals?portfolioId=PB_SG_GLOBAL_BAL_001");
  });
});
