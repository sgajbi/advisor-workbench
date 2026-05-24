import React from "react";
import { render, screen } from "@testing-library/react";

import ProposalSimulateForm from "../../src/features/proposals/components/proposal-simulate-form";

describe("ProposalSimulateForm", () => {
  it("renders proposal simulation form", () => {
    render(<ProposalSimulateForm />);
    expect(screen.getByText("Create Advisory Proposal")).toBeInTheDocument();
    expect(screen.getByText("Simulate Impact")).toBeInTheDocument();
    expect(screen.getByText("Security Orders")).toBeInTheDocument();
    expect(screen.queryByLabelText("Idempotency Key")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Created By")).not.toBeInTheDocument();
  });

  it("uses provided initial portfolio id", () => {
    render(<ProposalSimulateForm initialPortfolioId="PORT_UI_1001" />);
    const portfolioInput = screen.getByLabelText("Portfolio ID") as HTMLInputElement;
    expect(portfolioInput.value).toBe("PORT_UI_1001");
  });
});
