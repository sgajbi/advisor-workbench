import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const createSandboxSessionMock = vi.fn();
const applySandboxChangesMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("../../src/features/workbench/api", () => ({
  createSandboxSession: (...args: unknown[]) => createSandboxSessionMock(...args),
  applySandboxChanges: (...args: unknown[]) => applySandboxChangesMock(...args),
}));

import SandboxControls from "../../src/features/workbench/components/sandbox-controls";

describe("SandboxControls", () => {
  afterEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    createSandboxSessionMock.mockReset();
    applySandboxChangesMock.mockReset();
  });

  it("creates a sandbox session and updates navigation and policy state", async () => {
    createSandboxSessionMock.mockResolvedValue({
      session_id: "sess_001",
      session_version: 2,
      policy_feedback: {
        status: "PASS",
        detail: "Policy checks passed.",
      },
      warnings: ["MANAGE_POLICY_SIMULATION_UNAVAILABLE"],
      partial_failures: [
        {
          source_service: "lotus-manage",
          error_code: "HTTP_503",
          detail: "paused",
        },
      ],
    });

    render(<SandboxControls portfolioId="PF_1001" sessionId={null} warnings={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => {
      expect(createSandboxSessionMock).toHaveBeenCalledWith("PF_1001", {
        created_by: "advisor_1",
        ttl_hours: 24,
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/workbench/PF_1001?sessionId=sess_001");
    expect(refreshMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("PASS")).toBeInTheDocument();
      expect(screen.getByText("Policy checks passed.")).toBeInTheDocument();
      expect(screen.getAllByText("WARNINGS_PRESENT").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("lotus-manage: paused")).toBeInTheDocument();
    });
  });

  it("validates required sandbox inputs before applying a change", async () => {
    render(<SandboxControls portfolioId="PF_1001" sessionId={null} warnings={["stale pricing"]} />);

    expect(screen.getByRole("button", { name: "Apply Change" })).toBeDisabled();
    expect(screen.getAllByText("WARNINGS_PRESENT").length).toBeGreaterThanOrEqual(1);

    cleanup();
    render(<SandboxControls portfolioId="PF_1001" sessionId="sess_123" warnings={["stale pricing"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply Change" }));

    expect(screen.getByText("Security ID is required.")).toBeInTheDocument();
  });

  it("applies a sandbox change and refreshes the workbench", async () => {
    applySandboxChangesMock.mockResolvedValue({
      session_version: 4,
      policy_feedback: {
        status: "FAIL",
        detail: "Policy threshold breached.",
      },
      warnings: ["MANAGE_POLICY_SIMULATION_UNAVAILABLE"],
      partial_failures: [
        {
          source_service: "lotus-manage",
          error_code: "HTTP_503",
          detail: "paused",
        },
      ],
    });

    render(<SandboxControls portfolioId="PF_1001" sessionId="sess_123" warnings={[]} />);

    fireEvent.change(screen.getByLabelText("Security ID"), { target: { value: "AAPL.US" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Change" }));

    await waitFor(() => {
      expect(applySandboxChangesMock).toHaveBeenCalledWith("PF_1001", "sess_123", {
        changes: [
          {
            security_id: "AAPL.US",
            transaction_type: "BUY",
            quantity: 25,
          },
        ],
        evaluate_policy: true,
      });
    });

    expect(refreshMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("FAIL")).toBeInTheDocument();
      expect(screen.getByText("Policy threshold breached.")).toBeInTheDocument();
      expect(screen.getAllByText("WARNINGS_PRESENT").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("lotus-manage: paused")).toBeInTheDocument();
    });
  });
});
