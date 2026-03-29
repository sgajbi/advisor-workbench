import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/bff/[...path]/route";

describe("BFF proxy route", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
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

    expect(parsedUpstreamUrl.pathname).toBe("/api/v1/lookups/portfolios");
    expect(parsedUpstreamUrl.search).toBe("?limit=1");
    expect(upstreamInit).toEqual(
      expect.objectContaining({
        method: "GET",
        body: undefined,
        cache: "no-store",
      })
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

    expect(parsedUpstreamUrl.pathname).toBe("/api/v1/intake/portfolio-bundle");
    expect(upstreamInit).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: { portfolio_id: "PORT_1001" } }),
      })
    );
    expect(response.status).toBe(202);
  });
});
