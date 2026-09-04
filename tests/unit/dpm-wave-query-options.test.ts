import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  listDpmWaves,
} from "../../src/features/workbench/dpm-wave-api";
import {
  dpmWaveDetailQueryOptions,
  dpmWaveItemsQueryOptions,
  dpmWaveListQueryOptions,
  dpmWaveProofPackQueryOptions,
} from "../../src/features/workbench/dpm-wave-query-options";
import type { DpmWaveGatewayResponse } from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/dpm-wave-api", () => ({
  getDpmWave: vi.fn(),
  getDpmWaveItems: vi.fn(),
  getDpmWaveProofPackPosture: vi.fn(),
  listDpmWaves: vi.fn(),
}));

const response = {
  correlation_id: "corr-dpm-wave-query",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: { state: "READY", wave_id: "wave-1" },
  data: {},
} as DpmWaveGatewayResponse;

const context = {
  asOfDate: "2026-05-03",
  triggerType: "EXPLICIT_PORTFOLIO_LIST",
  limit: 10,
  offset: 0,
};

describe("DPM wave Query options", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(listDpmWaves).mockResolvedValue(response);
    vi.mocked(getDpmWave).mockResolvedValue(response);
    vi.mocked(getDpmWaveItems).mockResolvedValue(response);
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue(response);
  });

  it("refreshes the source list through the browser BFF boundary", async () => {
    await queryClient.fetchQuery(dpmWaveListQueryOptions(context));

    expect(listDpmWaves).toHaveBeenCalledWith(context, "client");
  });

  it("isolates every selected-wave evidence family by source wave id", async () => {
    await queryClient.fetchQuery(dpmWaveDetailQueryOptions("wave-1"));
    await queryClient.fetchQuery(dpmWaveItemsQueryOptions("wave-1"));
    await queryClient.fetchQuery(dpmWaveProofPackQueryOptions("wave-1"));

    expect(getDpmWave).toHaveBeenCalledWith("wave-1");
    expect(getDpmWaveItems).toHaveBeenCalledWith("wave-1");
    expect(getDpmWaveProofPackPosture).toHaveBeenCalledWith("wave-1");
  });

  it("rejects wave detail that identifies another wave before Query admission", async () => {
    const options = dpmWaveDetailQueryOptions("wave-1");
    vi.mocked(getDpmWave).mockResolvedValue({
      ...response,
      supportability: { ...response.supportability, wave_id: "wave-2" },
    });

    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Refreshed wave detail identified wave-2 instead of wave-1.",
    );
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("requires wave detail to identify its source wave", async () => {
    const options = dpmWaveDetailQueryOptions("wave-1");
    vi.mocked(getDpmWave).mockResolvedValue({
      ...response,
      supportability: { ...response.supportability, wave_id: undefined },
    });

    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Refreshed wave detail identified no wave instead of wave-1.",
    );
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("rejects proposed changes that identify another wave before Query admission", async () => {
    const options = dpmWaveItemsQueryOptions("wave-1");
    vi.mocked(getDpmWaveItems).mockResolvedValue({
      ...response,
      supportability: { ...response.supportability, wave_id: "wave-2" },
    });

    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Refreshed proposed changes identified wave-2 instead of wave-1.",
    );
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("requires proposed changes to identify their source wave", async () => {
    const options = dpmWaveItemsQueryOptions("wave-1");
    vi.mocked(getDpmWaveItems).mockResolvedValue({
      ...response,
      supportability: { ...response.supportability, wave_id: undefined },
    });

    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Refreshed proposed changes identified no wave instead of wave-1.",
    );
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("rejects a proof pack that identifies another wave before Query admission", async () => {
    const options = dpmWaveProofPackQueryOptions("wave-1");
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue({
      ...response,
      supportability: { ...response.supportability, wave_id: "wave-2" },
    });

    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Refreshed proof pack identified wave-2 instead of wave-1.",
    );
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("requires a proof pack to identify its source wave", async () => {
    const options = dpmWaveProofPackQueryOptions("wave-1");
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue({
      ...response,
      supportability: { ...response.supportability, wave_id: undefined },
    });

    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Refreshed proof pack identified no wave instead of wave-1.",
    );
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });
});
