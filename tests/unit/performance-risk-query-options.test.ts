import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPerformanceRiskSourceState,
  performanceRiskSummaryQueryOptions,
} from "../../src/apps/performance/performance-risk-query-options";
import { buildPerformanceRiskQueryContext } from "../../src/apps/performance/performance-risk-query-keys";
import { buildFixtureRiskSummary } from "../../src/apps/performance/risk-workspace-view-model";
import { getWorkbenchRiskSummaryClient } from "../../src/features/workbench/api";
import type { WorkbenchRiskSummaryResponse } from "../../src/features/workbench/types";
import {
  WORKBENCH_QUERY_STALE_TIME_MS,
  workbenchStrictQueryDefaults,
} from "../../src/features/platform-runtime/query-policy";
import { buildPerformanceWorkspace } from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchRiskSummaryClient: vi.fn(),
  getWorkbenchRiskConcentrationClient: vi.fn(),
  getWorkbenchRiskAttributionClient: vi.fn(),
  getWorkbenchRiskDrawdownClient: vi.fn(),
  getWorkbenchRiskRollingClient: vi.fn(),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: workbenchStrictQueryDefaults },
  });
}

const workspace = buildPerformanceWorkspace("PB_SG_GLOBAL_BAL_001");
const context = buildPerformanceRiskQueryContext(workspace, "YTD");

describe("Performance Risk query options", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("coalesces concurrent reads and reuses source evidence while fresh", async () => {
    const queryClient = createQueryClient();
    const response = buildFixtureRiskSummary(workspace, "YTD", "NET");
    let resolveSource:
      ((value: WorkbenchRiskSummaryResponse) => void) | undefined;
    vi.mocked(getWorkbenchRiskSummaryClient).mockImplementation(
      async () =>
        await new Promise<WorkbenchRiskSummaryResponse>((resolve) => {
          resolveSource = resolve;
        }),
    );
    const options = performanceRiskSummaryQueryOptions(context, "NET");

    const first = queryClient.fetchQuery(options);
    const second = queryClient.fetchQuery(options);
    resolveSource?.(response);

    await expect(Promise.all([first, second])).resolves.toEqual([
      response,
      response,
    ]);
    await expect(queryClient.fetchQuery(options)).resolves.toEqual(response);
    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it("revalidates source evidence after the governed stale boundary", async () => {
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(workspace, "YTD", "NET"),
    );
    const options = performanceRiskSummaryQueryOptions(context, "NET");

    await queryClient.fetchQuery(options);
    await queryClient.fetchQuery(options);
    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(WORKBENCH_QUERY_STALE_TIME_MS + 1);
    await queryClient.fetchQuery(options);
    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(2);
    queryClient.clear();
  });

  it("does not admit source-declared unavailable evidence into reusable data", async () => {
    const queryClient = createQueryClient();
    const unavailableResponse: WorkbenchRiskSummaryResponse = {
      ...buildFixtureRiskSummary(workspace, "YTD", "NET"),
      state: "unavailable",
      payload: null,
    };
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      unavailableResponse,
    );
    const options = performanceRiskSummaryQueryOptions(context, "NET");

    const firstError = await queryClient
      .fetchQuery(options)
      .catch((error) => error);
    const secondError = await queryClient
      .fetchQuery(options)
      .catch((error) => error);

    expect(
      getPerformanceRiskSourceState<WorkbenchRiskSummaryResponse>(firstError),
    ).toEqual(unavailableResponse);
    expect(
      getPerformanceRiskSourceState<WorkbenchRiskSummaryResponse>(secondError),
    ).toEqual(unavailableResponse);
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(2);
    queryClient.clear();
  });

  it("keeps transport and source-state failures distinct", async () => {
    const queryClient = createQueryClient();
    vi.mocked(getWorkbenchRiskSummaryClient).mockRejectedValue(
      new Error("Gateway unavailable"),
    );
    const options = performanceRiskSummaryQueryOptions(context, "NET");

    const error = await queryClient
      .fetchQuery(options)
      .catch((failure) => failure);

    expect(
      getPerformanceRiskSourceState<WorkbenchRiskSummaryResponse>(error),
    ).toBeNull();
    queryClient.clear();
  });
});
