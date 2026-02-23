import React from "react";
import { render, screen } from "@testing-library/react";

import SuitePage from "../../src/app/suite/page";

describe("SuitePage", () => {
  it("renders role-based navigation journeys", () => {
    render(<SuitePage />);

    expect(screen.getByText("Client Advisor Journey")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Manager Journey")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1\. Portfolio Intake/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1\. Decision Console/i })).toBeInTheDocument();
  });
});
