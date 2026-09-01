import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  getDpmPmOperatingQualitySummaryInvocation,
  listDpmPmOperatingQualityFairnessAnalyses,
  listDpmPmOperatingQualityReviewActions,
  listDpmPmOperatingQualitySummaryInvocations,
} from "../../src/features/workbench/pm-operating-quality-api";
import {
  pmOperatingQualityFairnessAnalysesQueryOptions,
  pmOperatingQualityFairnessAnalysisQueryOptions,
  pmOperatingQualityReviewActionsQueryOptions,
  pmOperatingQualityReviewActionQueryOptions,
  pmOperatingQualitySummaryInvocationsQueryOptions,
  pmOperatingQualitySummaryInvocationQueryOptions,
} from "../../src/features/workbench/pm-operating-quality-query-options";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/pm-operating-quality-api", () => ({
  getDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  getDpmPmOperatingQualityReviewAction: vi.fn(),
  getDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  listDpmPmOperatingQualityFairnessAnalyses: vi.fn(),
  listDpmPmOperatingQualityReviewActions: vi.fn(),
  listDpmPmOperatingQualitySummaryInvocations: vi.fn(),
}));

const response = {
  correlation_id: "corr-pm-quality-query",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: { state: "READY" },
  data: {},
} as DpmPmOperatingQualityGatewayResponse;

const context = { asOfDate: "2026-05-15", limit: 10, offset: 0 };

describe("PM operating-quality Query options", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("refreshes every persisted collection through the client BFF boundary", async () => {
    vi.mocked(listDpmPmOperatingQualityFairnessAnalyses).mockResolvedValue(response);
    vi.mocked(listDpmPmOperatingQualityReviewActions).mockResolvedValue(response);
    vi.mocked(listDpmPmOperatingQualitySummaryInvocations).mockResolvedValue(response);

    await queryClient.fetchQuery(pmOperatingQualityFairnessAnalysesQueryOptions(context));
    await queryClient.fetchQuery(pmOperatingQualityReviewActionsQueryOptions(context));
    await queryClient.fetchQuery(pmOperatingQualitySummaryInvocationsQueryOptions(context));

    expect(listDpmPmOperatingQualityFairnessAnalyses).toHaveBeenCalledWith(
      context,
      "client",
    );
    expect(listDpmPmOperatingQualityReviewActions).toHaveBeenCalledWith(
      context,
      "client",
    );
    expect(listDpmPmOperatingQualitySummaryInvocations).toHaveBeenCalledWith(
      context,
      "client",
    );
  });

  it("isolates selected detail by source record identity", async () => {
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(response);
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(response);
    vi.mocked(getDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(response);

    await queryClient.fetchQuery(
      pmOperatingQualityFairnessAnalysisQueryOptions("fairness-1"),
    );
    await queryClient.fetchQuery(
      pmOperatingQualityReviewActionQueryOptions("review-1"),
    );
    await queryClient.fetchQuery(
      pmOperatingQualitySummaryInvocationQueryOptions("summary-1"),
    );

    expect(getDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith(
      "fairness-1",
      "client",
    );
    expect(getDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith(
      "review-1",
      "client",
    );
    expect(getDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith(
      "summary-1",
      "client",
    );
  });
});
