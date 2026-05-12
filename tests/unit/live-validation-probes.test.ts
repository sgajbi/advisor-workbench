import * as probeHelpers from "../../scripts/live/validation/probes.mjs";

const { checkDns, fetchJson, fetchJsonUntil, fetchText, postJson } = probeHelpers as {
  checkDns: (
    summary: { dns: unknown[]; apiChecks: unknown[] },
    hostname: string,
    options?: {
      required?: boolean;
      lookup?: (hostname: string) => Promise<{ address: string }>;
    }
  ) => Promise<{ ok: boolean; required: boolean; warning?: string }>;
  fetchJson: <T = unknown>(
    summary: { dns: unknown[]; apiChecks: unknown[] },
    url: string,
    description: string,
    timeoutMs: number,
    fetchImpl?: typeof fetch
  ) => Promise<T>;
  fetchJsonUntil: <T = unknown>(
    summary: { dns: unknown[]; apiChecks: unknown[] },
    url: string,
    description: string,
    timeoutMs: number,
    predicate: (payload: T) => true | string | false,
    options?: {
      attempts?: number;
      delayMs?: number;
      fetchImpl?: typeof fetch;
      sleep?: (milliseconds: number) => Promise<void>;
    }
  ) => Promise<T>;
  fetchText: (
    summary: { dns: unknown[]; apiChecks: unknown[] },
    url: string,
    description: string,
    timeoutMs: number,
    fetchImpl?: typeof fetch
  ) => Promise<string>;
  postJson: <T = unknown>(
    summary: { dns: unknown[]; apiChecks: unknown[] },
    url: string,
    description: string,
    timeoutMs: number,
    body: unknown,
    fetchImpl?: typeof fetch
  ) => Promise<T>;
};

function createSummary() {
  return {
    dns: [],
    apiChecks: [],
  };
}

type EvidenceReadinessPayload = {
  capabilities: {
    evidence: {
      state: string;
    };
  };
};

describe("live validation probe helpers", () => {
  it("records optional DNS failures without aborting validation", async () => {
    const summary = createSummary();

    const result = await checkDns(summary, "ai.dev.lotus", {
      required: false,
      lookup: async () => {
        throw new Error("getaddrinfo ENOTFOUND ai.dev.lotus");
      },
    });

    expect(result.ok).toBe(false);
    expect(result.required).toBe(false);
    expect(result.warning).toContain("Optional canonical host 'ai.dev.lotus'");
    expect(summary.dns).toHaveLength(1);
  });

  it("fails required DNS resolution with a governed operator message", async () => {
    const summary = createSummary();

    await expect(
      checkDns(summary, "gateway.dev.lotus", {
        lookup: async () => {
          throw new Error("getaddrinfo ENOTFOUND gateway.dev.lotus");
        },
      })
    ).rejects.toThrow(
      "Canonical host 'gateway.dev.lotus' is not resolvable. Update your hosts/DNS mapping before running the live validation again."
    );
  });

  it("records successful JSON and text probes in the summary", async () => {
    const summary = createSummary();

    const jsonPayload = await fetchJson(
      summary,
      "http://gateway.dev.lotus/api/v1/example",
      "Example JSON",
      1000,
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    const textPayload = await fetchText(
      summary,
      "http://workbench.dev.lotus/example",
      "Example text",
      1000,
      async () => new Response("Portfolio", { status: 200 })
    );

    expect(jsonPayload).toEqual({ ok: true });
    expect(textPayload).toBe("Portfolio");
    expect(summary.apiChecks).toEqual([
      {
        description: "Example JSON",
        url: "http://gateway.dev.lotus/api/v1/example",
        status: 200,
        kind: "json",
        method: "GET",
      },
      {
        description: "Example text",
        url: "http://workbench.dev.lotus/example",
        status: 200,
        kind: "text",
        method: "GET",
      },
    ]);
  });

  it("records successful JSON POST probes in the summary", async () => {
    const summary = createSummary();
    const calls: Array<{ url: string; method?: string; headers?: HeadersInit; body?: string }> = [];

    const payload = await postJson(
      summary,
      "http://gateway.dev.lotus/api/v1/example",
      "Example POST",
      1000,
      { ok: true },
      async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({
          url: String(url),
          method: init?.method,
          headers: init?.headers,
          body: init?.body as string,
        });
        return new Response(JSON.stringify({ posted: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    );

    expect(payload).toEqual({ posted: true });
    expect(calls).toEqual([
      expect.objectContaining({
        url: "http://gateway.dev.lotus/api/v1/example",
        method: "POST",
        headers: expect.objectContaining({
          "X-Actor-Id": "workbench-system",
          "X-Tenant-Id": "tenant-sg",
          "X-Region": "APAC",
        }),
        body: JSON.stringify({ ok: true }),
      }),
    ]);
    expect(summary.apiChecks).toEqual([
      {
        description: "Example POST",
        url: "http://gateway.dev.lotus/api/v1/example",
        status: 200,
        kind: "json",
        method: "POST",
      },
    ]);
  });

  it("polls JSON probes until live readiness evidence is available", async () => {
    const summary = createSummary();
    const responses = [
      { capabilities: { evidence: { state: "partial" } } },
      { capabilities: { evidence: { state: "supported" } } },
    ];

    const payload = await fetchJsonUntil<EvidenceReadinessPayload>(
      summary,
      "http://gateway.dev.lotus/api/v1/workbench/PB_1/performance/summary",
      "Performance summary evidence readiness",
      1000,
      (candidate) =>
        candidate.capabilities.evidence.state === "supported"
          ? true
          : `evidence state is ${candidate.capabilities.evidence.state}`,
      {
        attempts: 3,
        delayMs: 1,
        sleep: async () => undefined,
        fetchImpl: async () =>
          new Response(JSON.stringify(responses.shift()), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      }
    );

    expect(payload.capabilities.evidence.state).toBe("supported");
    expect(summary.apiChecks).toEqual([
      expect.objectContaining({
        description: "Performance summary evidence readiness attempt 1",
        kind: "json",
      }),
      expect.objectContaining({
        description: "Performance summary evidence readiness attempt 2",
        kind: "json",
      }),
      {
        description: "Performance summary evidence readiness",
        url: "http://gateway.dev.lotus/api/v1/workbench/PB_1/performance/summary",
        status: "ready",
        kind: "json-readiness",
        method: "GET",
        attempts: 2,
      },
    ]);
  });

  it("fails JSON readiness probes with the last observed reason", async () => {
    const summary = createSummary();

    await expect(
      fetchJsonUntil<EvidenceReadinessPayload>(
        summary,
        "http://gateway.dev.lotus/api/v1/workbench/PB_1/performance/summary",
        "Performance summary evidence readiness",
        1000,
        (candidate) => `evidence state is ${candidate.capabilities.evidence.state}`,
        {
          attempts: 2,
          delayMs: 1,
          sleep: async () => undefined,
          fetchImpl: async () =>
            new Response(JSON.stringify({ capabilities: { evidence: { state: "partial" } } }), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
        }
      )
    ).rejects.toThrow(
      "Performance summary evidence readiness did not reach ready state after 2 attempts"
    );
  });

  it("fails non-JSON gateway responses with a high-signal error", async () => {
    const summary = createSummary();

    await expect(
      fetchJson(
        summary,
        "http://gateway.dev.lotus/api/v1/example",
        "Example JSON",
        1000,
        async () => new Response("not-json", { status: 200 })
      )
    ).rejects.toThrow("Example JSON returned non-JSON content");
  });
});
