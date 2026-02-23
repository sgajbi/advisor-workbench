import React from "react";
import { render, screen } from "@testing-library/react";

import ProposalSimulateForm from "../../src/features/proposals/components/proposal-simulate-form";

describe("ProposalSimulateForm", () => {
  it("renders proposal simulation form", () => {
    render(<ProposalSimulateForm />);
    expect(screen.getByText("Create And Simulate Proposal")).toBeInTheDocument();
    expect(screen.getByText("Simulate Proposal")).toBeInTheDocument();
  });
});
