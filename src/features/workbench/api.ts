import { WorkbenchOverview } from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

export async function getWorkbenchOverview(portfolioId: string): Promise<WorkbenchOverview> {
  const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/overview`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch overview (${response.status})`);
  }

  return (await response.json()) as WorkbenchOverview;
}
