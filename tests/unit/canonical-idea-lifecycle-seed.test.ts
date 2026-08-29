import { spawn } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CANDIDATE_ID = "idea_high_cash_contract_001";
const GENERATED_AT_UTC = "2026-04-10T10:00:00.000Z";
const EXPECTED_STATUSES = [
  "enriched",
  "scored",
  "governance_checked",
  "ready_for_review",
] as const;

type ObservedRequest = Readonly<{
  body: Record<string, unknown>;
  headers: IncomingMessage["headers"];
  method: string | undefined;
  url: string | undefined;
}>;

type ScriptResult = Readonly<{
  exitCode: number | null;
  requests: readonly ObservedRequest[];
  stderr: string;
  stdout: string;
}>;

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function respondWithPersistence(
  response: ServerResponse,
  body: Record<string, unknown>,
  requestIndex: number,
  persistedStatus: string,
): void {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      persistence: {
        candidateId: CANDIDATE_ID,
        decision: requestIndex % 2 === 0 ? "accepted" : "replayed",
        lifecycleStatus: persistedStatus,
      },
      transition: {
        candidateId: CANDIDATE_ID,
        lifecycleStatus: body.targetLifecycleStatus,
      },
    }),
  );
}

async function runLifecycleSeed(
  persistedStatusForRequest: (
    requestIndex: number,
    requestedStatus: string,
  ) => string,
): Promise<ScriptResult> {
  const requests: ObservedRequest[] = [];
  const server = createServer(async (request, response) => {
    const body = JSON.parse(await readRequestBody(request)) as Record<
      string,
      unknown
    >;
    const requestIndex = requests.length;
    requests.push({
      body,
      headers: request.headers,
      method: request.method,
      url: request.url,
    });
    respondWithPersistence(
      response,
      body,
      requestIndex,
      persistedStatusForRequest(
        requestIndex,
        String(body.targetLifecycleStatus),
      ),
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Lifecycle contract server did not expose a TCP port.");
    }

    const executable = process.platform === "win32" ? "powershell.exe" : "pwsh";
    const arguments_ = ["-NoLogo", "-NoProfile", "-NonInteractive"];
    if (process.platform === "win32") {
      arguments_.push("-ExecutionPolicy", "Bypass");
    }
    arguments_.push(
      "-File",
      join(
        process.cwd(),
        "scripts",
        "live",
        "Invoke-IdeaCandidateLifecycleSeed.ps1",
      ),
      "-IdeaBaseUrl",
      `http://127.0.0.1:${address.port}`,
      "-CandidateId",
      CANDIDATE_ID,
      "-GeneratedAtUtc",
      GENERATED_AT_UTC,
    );

    const child = spawn(executable, arguments_, {
      cwd: process.cwd(),
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    return { exitCode, requests, stderr, stdout };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("canonical Idea lifecycle seed", () => {
  it("progresses the source candidate through every prerequisite with deterministic authority", async () => {
    const result = await runLifecycleSeed(
      (_index, requestedStatus) => requestedStatus,
    );

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.requests).toHaveLength(4);
    expect(
      result.requests.map(({ body }) => body.targetLifecycleStatus),
    ).toEqual(EXPECTED_STATUSES);
    for (const [index, request] of result.requests.entries()) {
      const status = EXPECTED_STATUSES[index];
      const identity = `canonical-idea-lifecycle:${CANDIDATE_ID}:${status}:${GENERATED_AT_UTC}`;
      expect(request.method).toBe("POST");
      expect(request.url).toBe(
        `/api/v1/idea-candidates/${CANDIDATE_ID}/lifecycle-transitions`,
      );
      expect(request.headers["x-caller-subject"]).toBe(
        "canonical-front-office-lifecycle-seed",
      );
      expect(request.headers["x-caller-capabilities"]).toBe(
        "idea.candidate.lifecycle.transition",
      );
      expect(request.headers["idempotency-key"]).toBe(identity);
      expect(request.body).toEqual({
        changedAtUtc: `2026-04-10T10:0${index + 1}:00.000Z`,
        reasonCodes: ["review_required"],
        targetLifecycleStatus: status,
        transitionId: identity,
      });
    }
    expect(result.stdout).toContain(
      "source lifecycle 'ready_for_review' (replayed)",
    );
  }, 30_000);

  it("fails closed when Idea does not prove the requested source state", async () => {
    const result = await runLifecycleSeed((index, requestedStatus) =>
      index === 1 ? "generated" : requestedStatus,
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.requests).toHaveLength(2);
    expect(result.stderr).toContain(
      "returned state 'generated' instead of 'scored'",
    );
  }, 30_000);
});
