import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AllocationPage from "@/app/allocation/page";
import CashflowPage from "@/app/cashflow/page";
import IncomePage from "@/app/income/page";
import PositionsPage from "@/app/positions/page";
import TransactionsPage from "@/app/transactions/page";

const { loadPortfolioRecordScreenData } = vi.hoisted(() => ({
  loadPortfolioRecordScreenData: vi.fn(async () => ({
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    portfolioContext: null,
    workspace: null,
  })),
}));

vi.mock("@/apps/portfolio/portfolio-record-screen-data", () => ({
  loadPortfolioRecordScreenData,
}));
vi.mock("@/apps/portfolio/components/portfolio-allocation-record-screen", () => ({
  default: () => <div data-testid="allocation-workspace">Allocation workspace</div>,
}));
vi.mock("@/apps/portfolio/components/portfolio-positions-record-screen", () => ({
  default: () => <div data-testid="positions-workspace">Positions workspace</div>,
}));
vi.mock("@/apps/portfolio/components/portfolio-transactions-record-screen", () => ({
  default: () => <div data-testid="transactions-workspace">Transactions workspace</div>,
}));
vi.mock("@/apps/portfolio/components/portfolio-cashflow-record-screen", () => ({
  default: () => <div data-testid="cashflow-workspace">Cashflow workspace</div>,
}));
vi.mock("@/apps/portfolio/components/portfolio-income-record-screen", () => ({
  default: () => <div data-testid="income-workspace">Income workspace</div>,
}));

const ROUTES = [
  { key: "allocation", page: AllocationPage },
  { key: "positions", page: PositionsPage },
  { key: "transactions", page: TransactionsPage },
  { key: "cashflow", page: CashflowPage },
  { key: "income", page: IncomePage },
] as const;

describe.each(ROUTES)("$key route composition", ({ key, page }) => {
  it("loads shared server data and mounts only its business workspace", async () => {
    const searchParams = Promise.resolve({ portfolioId: "PB_SG_GLOBAL_BAL_001" });

    render(await page({ searchParams }));

    expect(loadPortfolioRecordScreenData).toHaveBeenLastCalledWith({ searchParams });
    expect(screen.getByTestId(`${key}-workspace`)).toBeInTheDocument();
    for (const route of ROUTES.filter((candidate) => candidate.key !== key)) {
      expect(screen.queryByTestId(`${route.key}-workspace`)).not.toBeInTheDocument();
    }
  });
});
