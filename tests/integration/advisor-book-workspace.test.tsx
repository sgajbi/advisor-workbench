import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisorBookWorkspace from "@/features/advisor-book/components/advisor-book-workspace";
import { WorkbenchApiError } from "@/features/workbench/api-client";

const getAdvisorBookMock = vi.fn();
const routerReplaceMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("@/features/advisor-book/api", async () => {
  const actual = await vi.importActual<typeof import("@/features/advisor-book/api")>(
    "@/features/advisor-book/api",
  );
  return { ...actual, getAdvisorBook: (...args: unknown[]) => getAdvisorBookMock(...args) };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/book",
  useRouter: () => ({ replace: routerReplaceMock }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const readyResponse = {
  correlation_id: "corr-1",
  contract_version: "v1",
  scope: {
    kind: "own_book",
    label: "My book",
    as_of_date: "2026-04-10",
    booking_center_code: "Singapore",
  },
  page: {
    total_count: 1,
    offset: 0,
    limit: 25,
    returned_count: 1,
    sort_by: "portfolio_id",
    sort_order: "asc",
  },
  items: [
    {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      display_name: "Global Balanced Mandate",
      client_id: "CIF_SG_GLOBAL_BAL_001",
      base_currency: "USD",
      booking_center_code: "Singapore",
      mandate_type: "DISCRETIONARY",
      status: "ACTIVE",
      opened_on: "2025-03-31",
      closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1",
      membership_reference: "portfolio:PB_SG_GLOBAL_BAL_001",
      membership_basis: "governed_role_assignment",
    },
  ],
  supportability: {
    state: "ready",
    reason_code: "advisor_book_ready",
    tenant_scope: "source_confirmed",
    limitations: ["delegated_scope_not_supported"],
  },
  provenance: {
    product_name: "PortfolioManagerBookMembership",
    product_version: "v1",
    generated_at: "2026-04-10T02:00:00Z",
    latest_evidence_timestamp: "2026-04-10T01:59:00Z",
    freshness_status: "CURRENT",
    data_quality_status: "ACCEPTED",
    source_evidence_current: true,
    snapshot_id: "pm_book_membership:abc",
    content_hash: "sha256:abc",
    lineage: { source_owner: "lotus-core" },
  },
} as const;

describe("AdvisorBookWorkspace", () => {
  beforeEach(() => {
    routerReplaceMock.mockReset();
    getAdvisorBookMock.mockReset();
    useSearchParamsMock.mockReturnValue(new URLSearchParams("asOfDate=2026-04-10"));
  });

  it("moves from source loading to a dense own-book summary and portfolio handoff", async () => {
    getAdvisorBookMock.mockResolvedValue(readyResponse);
    render(<AdvisorBookWorkspace />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading your book");
    expect(await screen.findByText("Book available")).toBeInTheDocument();
    expect(screen.getByLabelText("Book summary")).toHaveTextContent("Portfolios1");
    const table = screen.getByRole("table", { name: "Portfolios in my book" });
    expect(within(table).getByText("Client CIF_SG_GLOBAL_BAL_001")).toBeInTheDocument();
    expect(within(table).getByText("Discretionary mandate")).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Global Balanced Mandate" })).toHaveAttribute(
      "href",
      "/portfolio?asOfDate=2026-04-10&portfolioId=PB_SG_GLOBAL_BAL_001",
    );
    expect(screen.getByText("Own book only")).toBeInTheDocument();
    expect(screen.queryByText(/team book|household|AUM|attention rank/i)).not.toBeInTheDocument();
  });

  it("updates supported source filters in the URL and resets paging", async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("asOfDate=2026-04-10&offset=25&sortBy=portfolio_id"),
    );
    getAdvisorBookMock.mockResolvedValue({
      ...readyResponse,
      page: { ...readyResponse.page, offset: 25, total_count: 26 },
    });
    render(<AdvisorBookWorkspace />);
    await screen.findByText("Book available");

    fireEvent.change(screen.getByRole("textbox", { name: "Client reference" }), {
      target: { value: "CIF_SG_002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply client" }));

    expect(routerReplaceMock).toHaveBeenCalledWith(
      "/book?asOfDate=2026-04-10&offset=0&sortBy=portfolio_id&clientId=CIF_SG_002",
    );
  });

  it("shows a permission-specific boundary without substituting the global catalogue", async () => {
    getAdvisorBookMock.mockRejectedValue(new WorkbenchApiError("advisor book", 403));
    render(<AdvisorBookWorkspace />);

    expect(await screen.findByText("Book access is not available")).toBeInTheDocument();
    expect(screen.getByText(/does not currently provide access/i)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Portfolios in my book" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("retries a failed source request", async () => {
    getAdvisorBookMock
      .mockRejectedValueOnce(new WorkbenchApiError("advisor book", 502))
      .mockResolvedValueOnce(readyResponse);
    render(<AdvisorBookWorkspace />);

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(getAdvisorBookMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Book available")).toBeInTheDocument();
  });
});
