import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ManageContextRail from "../../src/features/workbench/components/manage-context-rail";
import ManageOverview from "../../src/features/workbench/components/manage-overview";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

describe("manage workspace split components", () => {
  it("renders overview decision posture from Gateway-backed manage data", () => {
    render(<ManageOverview data={buildManageWorkspaceData()} />);

    expect(screen.getByRole("heading", { name: "Mandate Operating Posture" })).toBeInTheDocument();
    expect(screen.getByLabelText("Decision readiness")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attention Required" })).toBeInTheDocument();
    expect(screen.getByText("Benchmark mapping requires review")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Manage work areas")).toBeInTheDocument();
    expect(screen.queryByText("Execute Trade")).not.toBeInTheDocument();
  });

  it("renders the context rail without exposing client communication actions", () => {
    render(<ManageContextRail data={buildManageWorkspaceData()} activeMode="reviews" />);

    expect(screen.getByText("Decision Support")).toBeInTheDocument();
    expect(screen.getByText("Outcome Reviews")).toBeInTheDocument();

    const posture = screen.getByLabelText("Manage review posture");
    expect(within(posture).getByText("Attention Items")).toBeInTheDocument();
    expect(within(posture).getByText("2 open")).toBeInTheDocument();
    expect(within(posture).getByText("Evidence")).toBeInTheDocument();
    expect(within(posture).getAllByText("Available").length).toBeGreaterThan(0);

    expect(screen.getByRole("link", { name: "Open PM Quality" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?mode=quality"
    );
    expect(screen.getByRole("link", { name: "Return to Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PF_1001"
    );
    expect(screen.queryByRole("button", { name: /client/i })).not.toBeInTheDocument();
  });
});
