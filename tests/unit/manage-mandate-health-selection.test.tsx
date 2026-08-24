import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ManageMandateHealth from "@/features/workbench/components/manage-mandate-health";

import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";

type ExceptionResponse = NonNullable<
  ManageWorkspaceData["commandCenterExceptions"]
>;

const sourceWindowState = vi.hoisted(() => ({
  response: null as unknown,
  currentWindow: 1,
  isLoading: false,
}));

vi.mock("@/features/workbench/use-manage-exception-source-window", () => ({
  useManageExceptionSourceWindow: () => ({
    response: sourceWindowState.response,
    sourceError: null,
    evidencePosture: "complete",
    nextCursor: null,
    currentWindow: sourceWindowState.currentWindow,
    hasPrevious: sourceWindowState.currentWindow > 1,
    isLoading: sourceWindowState.isLoading,
    navigationFailure: null,
    showNext: async () => undefined,
    showPrevious: async () => undefined,
    retry: async () => undefined,
  }),
}));

function responseWithItems(
  base: ExceptionResponse,
  items: Array<Record<string, unknown>>,
  correlationId: string,
): ExceptionResponse {
  return {
    ...base,
    correlation_id: correlationId,
    data: {
      ...base.data,
      items,
    },
  };
}

function sourceItems(response: ExceptionResponse) {
  if (!Array.isArray(response.data.items)) {
    throw new Error("Mandate Health selection proof requires exception items.");
  }
  return response.data.items;
}

function selectedDetail() {
  return screen.getByLabelText("Selected mandate review item");
}

describe("Mandate Health source-owned selection admission", () => {
  beforeEach(() => {
    const data = buildManageWorkspaceData();
    sourceWindowState.response = data.commandCenterExceptions;
    sourceWindowState.currentWindow = 1;
    sourceWindowState.isLoading = false;
  });

  it("keeps the selected exception when the resolved source response reorders", () => {
    const data = buildManageWorkspaceData();
    const base = data.commandCenterExceptions!;
    const items = sourceItems(base);
    sourceWindowState.response = base;

    const { rerender } = render(<ManageMandateHealth data={data} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Stale price requires review" }),
    );
    expect(within(selectedDetail()).getByText("exc_002")).toBeInTheDocument();

    sourceWindowState.response = responseWithItems(
      base,
      [...items].reverse(),
      "corr_exceptions_reordered",
    );
    rerender(<ManageMandateHealth data={data} />);

    expect(within(selectedDetail()).getByText("exc_002")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stale price requires review" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("admits one source-ranked fallback after removal and retains it through another reorder", () => {
    const data = buildManageWorkspaceData();
    const base = data.commandCenterExceptions!;
    const [benchmarkItem] = sourceItems(base);
    const replacementItem = {
      exception_id: "exc_003",
      mandate_id: "mandate_001",
      severity: "HIGH",
      title: "Portfolio cash buffer outside mandate range",
      state: "ACTIVE",
      owner: "Portfolio Management",
      next_action: "Review the cash buffer",
    };
    sourceWindowState.response = base;

    const { rerender } = render(<ManageMandateHealth data={data} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Stale price requires review" }),
    );

    sourceWindowState.response = responseWithItems(
      base,
      [replacementItem, benchmarkItem],
      "corr_exceptions_removed",
    );
    rerender(<ManageMandateHealth data={data} />);
    expect(within(selectedDetail()).getByText("exc_003")).toBeInTheDocument();

    sourceWindowState.response = responseWithItems(
      base,
      [benchmarkItem, replacementItem],
      "corr_exceptions_reordered_again",
    );
    rerender(<ManageMandateHealth data={data} />);

    expect(within(selectedDetail()).getByText("exc_003")).toBeInTheDocument();
  });

  it("cannot retain selection across portfolio, mandate, or source-window scope", () => {
    const data = buildManageWorkspaceData();
    const base = data.commandCenterExceptions!;
    sourceWindowState.response = base;

    const { rerender } = render(<ManageMandateHealth data={data} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Stale price requires review" }),
    );
    expect(within(selectedDetail()).getByText("exc_002")).toBeInTheDocument();

    sourceWindowState.currentWindow = 2;
    sourceWindowState.response = responseWithItems(
      base,
      [
        {
          exception_id: "exc_window_2",
          mandate_id: "mandate_001",
          severity: "MEDIUM",
          title: "Concentration threshold requires review",
          state: "ACTIVE",
        },
      ],
      "corr_exceptions_window_2",
    );
    rerender(<ManageMandateHealth data={data} />);
    expect(
      within(selectedDetail()).getByText("exc_window_2"),
    ).toBeInTheDocument();

    const nextScope = buildManageWorkspaceData();
    nextScope.portfolio = {
      ...nextScope.portfolio,
      portfolio: {
        ...nextScope.portfolio.portfolio,
        portfolio_id: "PF_2002",
      },
    };
    nextScope.mandate = {
      ...nextScope.mandate!,
      data: { ...nextScope.mandate!.data, mandate_id: "mandate_002" },
    };
    nextScope.mandateHealth = {
      ...nextScope.mandateHealth!,
      data: {
        ...nextScope.mandateHealth!.data,
        mandate_id: "mandate_002",
      },
    };
    sourceWindowState.currentWindow = 1;
    sourceWindowState.response = responseWithItems(
      base,
      [
        {
          exception_id: "exc_new_scope",
          mandate_id: "mandate_002",
          severity: "HIGH",
          title: "Income distribution threshold requires review",
          state: "ACTIVE",
        },
      ],
      "corr_exceptions_new_scope",
    );
    rerender(<ManageMandateHealth data={nextScope} />);

    expect(
      within(selectedDetail()).getByText("exc_new_scope"),
    ).toBeInTheDocument();
    expect(screen.queryByText("exc_002")).not.toBeInTheDocument();
  });
});
