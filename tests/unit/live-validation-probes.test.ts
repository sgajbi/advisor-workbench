import { checkDns, fetchJson, fetchText } from "../../scripts/live/validation/probes.mjs";

function createSummary() {
  return {
    dns: [],
    apiChecks: [],
  };
}

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
      },
      {
        description: "Example text",
        url: "http://workbench.dev.lotus/example",
        status: 200,
        kind: "text",
      },
    ]);
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
