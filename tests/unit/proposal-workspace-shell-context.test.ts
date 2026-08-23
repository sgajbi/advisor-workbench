import { describe, expect, it } from "vitest";

import { resolveProposalPortfolioContext } from "@/features/proposals/components/proposal-workspace-shell";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("proposal workspace shell context", () => {
  it("passes through source context only when portfolio identity agrees", () => {
    const workspace = buildPortfolioWorkspace();

    expect(
      resolveProposalPortfolioContext(
        workspace.portfolio.portfolio_id,
        workspace,
      ),
    ).toBe(workspace);
  });

  it("fails closed when the source returns another portfolio", () => {
    const workspace = buildPortfolioWorkspace();

    expect(resolveProposalPortfolioContext("PB_SG_OTHER_002", workspace)).toBeNull();
  });
});
