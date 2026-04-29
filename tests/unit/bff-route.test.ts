import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/bff/[...path]/route";

describe("BFF proxy route", () => {
  const originalBffBaseUrl = process.env.BFF_BASE_URL;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.BFF_BASE_URL;
  });

  afterEach(() => {
    process.env.BFF_BASE_URL = originalBffBaseUrl;
  });

  it("forwards GET requests to the configured upstream without the host header", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      })
    );

    const request = new NextRequest("http://localhost:3000/api/bff/api/v1/lookups/portfolios?limit=1", {
      method: "GET",
      headers: {
        host: "localhost:3000",
        authorization: "Bearer token",
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({ path: ["api", "v1", "lookups", "portfolios"] }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [upstreamUrl, upstreamInit] = fetchMock.mock.calls[0];
    const parsedUpstreamUrl = new URL(String(upstreamUrl));

    expect(parsedUpstreamUrl.origin).toBe("http://gateway.dev.lotus");
    expect(parsedUpstreamUrl.pathname).toBe("/api/v1/lookups/portfolios");
    expect(parsedUpstreamUrl.search).toBe("?limit=1");
    expect(upstreamInit).toEqual(
      expect.objectContaining({
        method: "GET",
        body: undefined,
        cache: "no-store",
      })
    );
    const upstreamHeaders = upstreamInit?.headers as Headers;
    expect(upstreamHeaders.get("host")).toBeNull();
    expect(upstreamHeaders.get("authorization")).toBe("Bearer token");
    expect(upstreamHeaders.get("X-Correlation-Id")).toMatch(/^corr-workbench-[0-9a-f]{16}$/);
    expect(upstreamHeaders.get("traceparent")).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(await response.text()).toBe('{"ok":true}');
  });

  it("forwards mutating request bodies to the upstream", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{"accepted":true}', { status: 202 }));

    const request = new NextRequest("http://localhost:3000/api/bff/api/v1/intake/portfolio-bundle", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ body: { portfolio_id: "PORT_1001" } }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["api", "v1", "intake", "portfolio-bundle"] }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [upstreamUrl, upstreamInit] = fetchMock.mock.calls[0];
    const parsedUpstreamUrl = new URL(String(upstreamUrl));

    expect(parsedUpstreamUrl.origin).toBe("http://gateway.dev.lotus");
    expect(parsedUpstreamUrl.pathname).toBe("/api/v1/intake/portfolio-bundle");
    expect(upstreamInit).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: { portfolio_id: "PORT_1001" } }),
      })
    );
    expect(response.status).toBe(202);
  });

  it("preserves valid context and replaces malformed traceparent before proxying", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const request = new NextRequest("http://localhost:3000/api/bff/api/v1/workbench/PF_1001/risk/summary", {
      method: "GET",
      headers: {
        "X-Correlation-Id": "corr-workbench-route-1",
        traceparent: "malformed",
      },
    });

    await GET(request, {
      params: Promise.resolve({ path: ["api", "v1", "workbench", "PF_1001", "risk", "summary"] }),
    });

    const upstreamInit = fetchMock.mock.calls[0][1];
    const upstreamHeaders = upstreamInit?.headers as Headers;
    expect(upstreamHeaders.get("X-Correlation-Id")).toBe("corr-workbench-route-1");
    expect(upstreamHeaders.get("traceparent")).not.toBe("malformed");
    expect(upstreamHeaders.get("traceparent")).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/
    );
  });
});
