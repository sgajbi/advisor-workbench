import {
  WorkbenchOverview,
  WorkbenchPortfolio360,
  WorkbenchSandboxState,
} from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";
const BFF_PROXY_BASE = "/api/bff/api/v1";

export async function getWorkbenchOverview(portfolioId: string): Promise<WorkbenchOverview> {
  const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/overview`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch overview (${response.status})`);
  }

  return (await response.json()) as WorkbenchOverview;
}

export async function getPortfolio360(
  portfolioId: string,
  sessionId?: string
): Promise<WorkbenchPortfolio360> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/portfolio-360${query}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio 360 (${response.status})`);
  }
  return (await response.json()) as WorkbenchPortfolio360;
}

export async function createSandboxSession(
  portfolioId: string,
  payload: { created_by?: string; ttl_hours?: number }
): Promise<WorkbenchSandboxState> {
  const response = await fetch(`${BFF_PROXY_BASE}/workbench/${portfolioId}/sandbox/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sandbox create failed (${response.status}): ${body}`);
  }
  return (await response.json()) as WorkbenchSandboxState;
}

export async function applySandboxChanges(
  portfolioId: string,
  sessionId: string,
  payload: {
    changes: Array<{
      security_id: string;
      transaction_type: string;
      quantity?: number;
      amount?: number;
      currency?: string;
    }>;
    evaluate_policy?: boolean;
  }
): Promise<WorkbenchSandboxState> {
  const response = await fetch(
    `${BFF_PROXY_BASE}/workbench/${portfolioId}/sandbox/sessions/${sessionId}/changes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sandbox apply failed (${response.status}): ${body}`);
  }
  return (await response.json()) as WorkbenchSandboxState;
}
