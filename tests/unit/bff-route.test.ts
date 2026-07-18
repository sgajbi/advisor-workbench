import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/bff/[...path]/route";

describe("BFF proxy route", () => {
  const originalBffBaseUrl = process.env.BFF_BASE_URL;
  const callerContextEnvKeys = [
    "WORKBENCH_BFF_ACTOR_ID",
    "WORKBENCH_BFF_CALLER_APPLICATION",
    "WORKBENCH_BFF_TENANT_ID",
    "WORKBENCH_BFF_REGION",
    "WORKBENCH_BFF_BOOKING_CENTER_CODE",
    "WORKBENCH_BFF_ROLE",
    "WORKBENCH_IDEA_CALLER_SUBJECT",
    "WORKBENCH_IDEA_CALLER_ROLES",
    "WORKBENCH_IDEA_CALLER_PORTFOLIO_IDS",
    "WORKBENCH_IDEA_AUTH_MODE",
    "LOTUS_ENVIRONMENT",
  ] as const;
  const originalCallerContextEnv = Object.fromEntries(
    callerContextEnvKeys.map((key) => [key, process.env[key]])
  );

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.BFF_BASE_URL;
    for (const key of callerContextEnvKeys) {
      delete process.env[key];
    }
    process.env.LOTUS_ENVIRONMENT = "dev";
  });

  afterEach(() => {
    process.env.BFF_BASE_URL = originalBffBaseUrl;
    for (const key of callerContextEnvKeys) {
      const original = originalCallerContextEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
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
    expect(upstreamHeaders.get("X-Actor-Id")).toBe("workbench-system");
    expect(upstreamHeaders.get("X-Caller-Application")).toBe("lotus-workbench");
    expect(upstreamHeaders.get("X-Tenant-Id")).toBe("tenant-sg");
    expect(upstreamHeaders.get("X-Region")).toBe("APAC");
    expect(upstreamHeaders.get("X-Booking-Center-Code")).toBe("SG");
    expect(upstreamHeaders.get("X-Role")).toBe("advisor");
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

  it("derives Idea mutation authority at the BFF instead of trusting browser headers", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const request = new NextRequest(
      "http://localhost:3000/api/bff/api/v1/ideas/candidates/idea_high_cash_001/review-actions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Caller-Subject": "spoofed-subject",
          "X-Caller-Roles": "compliance",
          "X-Caller-Capabilities": "idea.conversion.intent.record",
          "X-Caller-Portfolio-Ids": "UNENTITLED_PORTFOLIO",
        },
        body: JSON.stringify({ action: "approve_for_conversion" }),
      },
    );

    await POST(request, {
      params: Promise.resolve({
        path: [
          "api",
          "v1",
          "ideas",
          "candidates",
          "idea_high_cash_001",
          "review-actions",
        ],
      }),
    });

    const upstreamHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(upstreamHeaders.get("X-Caller-Subject")).toBe("workbench-advisor");
    expect(upstreamHeaders.get("X-Caller-Roles")).toBe("advisor");
    expect(upstreamHeaders.get("X-Caller-Capabilities")).toBe(
      "idea.review.record",
    );
    expect(upstreamHeaders.get("X-Caller-Portfolio-Ids")).toBe(
      "PB_SG_GLOBAL_BAL_001",
    );
  });

  it("requires an authenticated Idea principal outside development before proxying", async () => {
    process.env.LOTUS_ENVIRONMENT = "uat";
    const fetchMock = vi.mocked(fetch);

    const request = new NextRequest(
      "http://localhost:3000/api/bff/api/v1/ideas/review-queues/advisor",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["api", "v1", "ideas", "review-queues", "advisor"],
      }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      code: "idea_authenticated_principal_required",
      status: "rejected",
    });
  });

  it("fails closed when the Idea runtime environment is unconfigured", async () => {
    delete process.env.LOTUS_ENVIRONMENT;
    const fetchMock = vi.mocked(fetch);

    const request = new NextRequest(
      "http://localhost:3000/api/bff/api/v1/ideas/review-queues/advisor",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["api", "v1", "ideas", "review-queues", "advisor"],
      }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "idea_authenticated_principal_required",
      status: "rejected",
    });
  });

  it("rejects development-configured Idea authority outside development before proxying", async () => {
    process.env.LOTUS_ENVIRONMENT = "production";
    process.env.WORKBENCH_IDEA_AUTH_MODE = "development_configured";
    const fetchMock = vi.mocked(fetch);

    const request = new NextRequest(
      "http://localhost:3000/api/bff/api/v1/ideas/review-queues/advisor",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["api", "v1", "ideas", "review-queues", "advisor"],
      }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "idea_authority_configuration_rejected",
      status: "rejected",
    });
  });

  it("preserves binary upstream responses for archived document downloads", async () => {
    const fetchMock = vi.mocked(fetch);
    const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
    fetchMock.mockResolvedValue(
      new Response(pdfBytes, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename=portfolio-review.pdf",
          "x-document-checksum-algorithm": "sha256",
          "x-document-checksum": "abc123",
        },
      })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/bff/api/v1/documents/doc_1/download",
      {
        method: "GET",
        headers: {
          "X-Actor-Id": "advisor_1",
          "X-Tenant-Id": "tenant-sg",
          "X-Region": "APAC",
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ["api", "v1", "documents", "doc_1", "download"] }),
    });

    const [upstreamUrl] = fetchMock.mock.calls[0];
    const upstreamHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    const body = new Uint8Array(await response.arrayBuffer());

    expect(String(upstreamUrl)).toBe("http://gateway.dev.lotus/api/v1/documents/doc_1/download");
    expect(upstreamHeaders.get("X-Actor-Id")).toBe("advisor_1");
    expect(upstreamHeaders.get("X-Tenant-Id")).toBe("tenant-sg");
    expect(upstreamHeaders.get("X-Region")).toBe("APAC");
    expect(upstreamHeaders.get("X-Caller-Application")).toBe("lotus-workbench");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-document-checksum")).toBe("abc123");
    expect(Array.from(body)).toEqual(Array.from(pdfBytes));
  });

  it("uses configured caller context defaults for upstream analytics reads", async () => {
    process.env.WORKBENCH_BFF_ACTOR_ID = "automation-advisor";
    process.env.WORKBENCH_BFF_CALLER_APPLICATION = "lotus-demo-workbench";
    process.env.WORKBENCH_BFF_TENANT_ID = "tenant-demo";
    process.env.WORKBENCH_BFF_REGION = "EMEA";
    process.env.WORKBENCH_BFF_BOOKING_CENTER_CODE = "CH";
    process.env.WORKBENCH_BFF_ROLE = "relationship-manager";
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const request = new NextRequest(
      "http://localhost:3000/api/bff/api/v1/workbench/PF_1001/performance/summary",
      {
        method: "GET",
      }
    );

    await GET(request, {
      params: Promise.resolve({
        path: ["api", "v1", "workbench", "PF_1001", "performance", "summary"],
      }),
    });

    const upstreamHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(upstreamHeaders.get("X-Actor-Id")).toBe("automation-advisor");
    expect(upstreamHeaders.get("X-Caller-Application")).toBe("lotus-demo-workbench");
    expect(upstreamHeaders.get("X-Tenant-Id")).toBe("tenant-demo");
    expect(upstreamHeaders.get("X-Region")).toBe("EMEA");
    expect(upstreamHeaders.get("X-Booking-Center-Code")).toBe("CH");
    expect(upstreamHeaders.get("X-Role")).toBe("relationship-manager");
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
