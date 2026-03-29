import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioDrilldownDisclosure from "../../src/apps/portfolio/components/portfolio-drilldown-disclosure";
import { hidden, partial, supported, unavailable } from "../../src/shell/workspace-capabilities";

describe("PortfolioDrilldownDisclosure", () => {
  it("renders supported drilldown content only when expanded", () => {
    const onToggle = vi.fn();

    const { rerender } = render(
      <PortfolioDrilldownDisclosure
        title="Transactions"
        summary="1 booked event in 30D"
        expanded={false}
        onToggle={onToggle}
        capability={supported("Detailed transaction rows are available.")}
        partialTitle="Transactions drill-down is partially available"
        unavailableTitle="Transactions drill-down unavailable"
        body="Detailed transaction rows are not available in the current portfolio contract."
      >
        <div>Contract-backed transaction grid</div>
      </PortfolioDrilldownDisclosure>
    );

    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("1 booked event in 30D")).toBeInTheDocument();
    expect(screen.queryByText("Contract-backed transaction grid")).not.toBeInTheDocument();

    rerender(
      <PortfolioDrilldownDisclosure
        title="Transactions"
        summary="1 booked event in 30D"
        expanded
        onToggle={onToggle}
        capability={supported("Detailed transaction rows are available.")}
        partialTitle="Transactions drill-down is partially available"
        unavailableTitle="Transactions drill-down unavailable"
        body="Detailed transaction rows are not available in the current portfolio contract."
      >
        <div>Contract-backed transaction grid</div>
      </PortfolioDrilldownDisclosure>
    );

    expect(screen.getByText("Contract-backed transaction grid")).toBeInTheDocument();
  });

  it("renders a partial capability panel instead of unsupported children", () => {
    render(
      <PortfolioDrilldownDisclosure
        title="Holdings"
        summary="Detailed position rows are incomplete."
        expanded
        onToggle={() => undefined}
        capability={partial("The book reports holdings, but detailed position rows are incomplete.")}
        partialTitle="Holdings drill-down is partially available"
        unavailableTitle="Holdings drill-down unavailable"
        body="The book reports holdings, but detailed position rows are incomplete."
        hint="Publish detailed position rows to support holdings drill-down."
      >
        <div>Should not render supported content</div>
      </PortfolioDrilldownDisclosure>
    );

    expect(screen.getByText("Holdings drill-down is partially available")).toBeInTheDocument();
    expect(screen.getByText("The book reports holdings, but detailed position rows are incomplete.")).toBeInTheDocument();
    expect(screen.queryByText("Should not render supported content")).not.toBeInTheDocument();
  });

  it("renders an unavailable capability panel instead of silent omission", () => {
    render(
      <PortfolioDrilldownDisclosure
        title="Projected Cashflow"
        summary="Projected cashflow is unavailable."
        expanded
        onToggle={() => undefined}
        capability={unavailable("No projected cashflow outlook is available in the current contract.")}
        partialTitle="Projected cashflow is partially available"
        unavailableTitle="Projected cashflow unavailable"
        body="No projected cashflow outlook is available in the current contract."
      >
        <div>Should not render projected cashflow chart</div>
      </PortfolioDrilldownDisclosure>
    );

    expect(screen.getByText("Projected cashflow unavailable")).toBeInTheDocument();
    expect(screen.getByText("No projected cashflow outlook is available in the current contract.")).toBeInTheDocument();
    expect(screen.queryByText("Should not render projected cashflow chart")).not.toBeInTheDocument();
  });

  it("suppresses hidden drilldown capabilities entirely", () => {
    const { container } = render(
      <PortfolioDrilldownDisclosure
        title="Transactions"
        summary="Hidden"
        expanded
        onToggle={() => undefined}
        capability={hidden("Transactions drill-down is hidden outside detailed mode.")}
        partialTitle="Transactions drill-down is partially available"
        unavailableTitle="Transactions drill-down unavailable"
        body="Hidden"
      >
        <div>Hidden content</div>
      </PortfolioDrilldownDisclosure>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("emits the next disclosure state through the shared toggle handler", () => {
    const onToggle = vi.fn();

    render(
      <PortfolioDrilldownDisclosure
        title="Holdings"
        summary="2 holdings with valuation context"
        expanded={false}
        onToggle={onToggle}
        capability={supported("Detailed position rows are available.")}
        partialTitle="Holdings drill-down is partially available"
        unavailableTitle="Holdings drill-down unavailable"
        body="Detailed position rows are not available in the current portfolio contract."
      >
        <div>Supported holdings content</div>
      </PortfolioDrilldownDisclosure>
    );

    const disclosure = screen.getByText("Holdings").closest("details") as HTMLDetailsElement;
    disclosure.open = false;
    fireEvent(disclosure, new Event("toggle"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
