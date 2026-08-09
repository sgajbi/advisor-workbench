import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const evidenceDirectory = path.resolve("output", "issue-593");

async function mockProposalDetail(page: import("@playwright/test").Page, blocked = false) {
  await page.route("**/api/bff/api/v1/proposals/pp_1?include_evidence=false", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-detail",
        contract_version: "v1",
        data: {
          proposal: {
            proposal_id: "pp_1",
            current_state: "DRAFT",
            portfolio_id: "PF_1001",
            current_version_no: 2,
          },
          current_version: {
            artifact_hash: "sha256:artifact-001",
            evidence_bundle: {
              generated_at: "2026-05-24T10:00:00Z",
              hashes: {
                request_hash: "sha256:request-001",
                simulation_hash: "sha256:simulation-001",
                artifact_hash: "sha256:artifact-001",
              },
              allocation_comparison: [
                { label: "Global Equities", current: "65.2%", proposed: "60.0%" },
                { label: "Fixed Income", current: "28.4%", proposed: "35.0%" },
              ],
            },
            simulate_request: {
              body: {
                options: { enable_proposal_simulation: true },
                proposed_trades: [
                  { side: "BUY", instrument_id: "VTI", quantity: "450.0000" },
                  { side: "SELL", instrument_id: "AAPL", quantity: "200.0000" },
                ],
              },
            },
          },
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/workflow-events", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-workflow",
        contract_version: "v1",
        data: { proposal_id: "pp_1", current_state: "DRAFT", events: [] },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/approvals", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-approvals",
        contract_version: "v1",
        data: { proposal_id: "pp_1", current_state: "DRAFT", approvals: [] },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/lineage", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-lineage",
        contract_version: "v1",
        data: { proposal_id: "pp_1", versions: [{ version_no: 2 }] },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/delivery-summary", async (route) => {
    await route.fulfill({
      json: { correlation_id: "corr-delivery", contract_version: "v1", data: {} },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/delivery-events", async (route) => {
    await route.fulfill({
      json: { correlation_id: "corr-events", contract_version: "v1", data: { event_count: 0 } },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/versions/2/memo", async (route) => {
    if (blocked && route.request().method() === "GET") {
      await route.fulfill({ status: 409, body: "MEMO_BLOCKED_BY_SOURCE_EVIDENCE" });
      return;
    }
    await route.fulfill({
      json: {
        correlation_id: "corr-memo",
        contract_version: "v1",
        data: {
          memo_id: "memo_1",
          memo_status: "APPROVED_FOR_ADVISOR_USE",
          memo_hash: "sha256:memo-001",
          review_posture: { advisor_use: "APPROVED_FOR_ADVISOR_USE" },
          report_package_posture: {
            status: "READY",
            archive_refs: ["archive://memo/report/1"],
          },
          ai_commentary_posture: {
            status: "AVAILABLE",
            authority: "NON_AUTHORITATIVE",
          },
          read_posture: { supportability: "SUPPORTED_ADVISOR_USE" },
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/versions/2/memo/projection**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const audience = requestUrl.searchParams.get("audience") ?? "ADVISOR";
    await route.fulfill({
      json: {
        correlation_id: "corr-projection",
        contract_version: "v1",
        data: {
          projection: {
            audience,
            client_ready_publication: blocked ? "BLOCKED_BY_SOURCE_EVIDENCE" : "BLOCKED",
          },
          projection_posture: {
            supportability: blocked ? "DEGRADED_SOURCE_EVIDENCE" : "SUPPORTED_ADVISOR_USE",
          },
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/memos/lineage", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-memo-lineage",
        contract_version: "v1",
        data: {
          memos: [{ memo_hash: "sha256:memo-001", memo_status: "APPROVED_FOR_ADVISOR_USE" }],
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/versions/2/memo/replay-evidence", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-replay",
        contract_version: "v1",
        data: {
          hashes: { memo_hash: "sha256:memo-001" },
          supportability: { client_ready_publication: "BLOCKED" },
        },
      },
    });
  });
}

test.describe("proposal memo posture", () => {
  test("renders advisor memo audiences and blocked client draft posture", async ({ page }) => {
    await mockProposalDetail(page);
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("region", { name: "Advisor proposal workspace" })).toBeVisible();
    await expect(
      page.getByText("Advisor use only. Client release requires source evidence and completed review gates."),
    ).toBeVisible();
    await expect(page.getByText("VTI")).toBeVisible();
    await expect(page.getByText("Global Equities")).toBeVisible();
    await expect(page.getByText("Client-ready publication is not promoted from this Workbench surface.")).toBeVisible();
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();
    await expect(page.getByRole("heading", { name: "Advisor Memo And Evidence Pack" })).toBeVisible();
    await expect(page.getByText("Approved for advisor use").first()).toBeVisible();
    await expect(page.getByText("Advisor-use evidence ready").first()).toBeVisible();
    await expect(page.getByText(/Client draft: Blocked/)).toBeVisible();
    await expect(page.getByText(/Evidence archive: 1 archived report item/)).toBeVisible();
    await expect(page.getByText("APPROVED_FOR_ADVISOR_USE")).toHaveCount(0);
    await expect(page.getByText("SUPPORTED_ADVISOR_USE")).toHaveCount(0);
    await expect(page.getByText(/archive:\/\//)).toHaveCount(0);

    await page.locator("select.input").selectOption("COMPLIANCE");
    await expect(page.getByText("Compliance review").first()).toBeVisible();
    await page.locator("select.input").selectOption("OPERATIONS");
    await expect(page.getByText("Operations handoff").first()).toBeVisible();
    await page.locator("select.input").selectOption("CLIENT_DRAFT");
    await expect(page.getByText("Client discussion draft").first()).toBeVisible();
    await expect(page.getByText("CLIENT_DRAFT")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send to client/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /client-ready release/i })).toHaveCount(0);
  });

  test("renders degraded and blocked memo posture from source responses", async ({ page }) => {
    await mockProposalDetail(page, true);
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();

    await expect(
      page.getByText(/Memo posture is degraded or blocked by source advisory evidence/),
    ).toBeVisible();
    await expect(page.getByText("Source evidence degraded").first()).toBeVisible();
    await expect(page.getByText(/Client draft: Blocked by source evidence/)).toBeVisible();
    await expect(page.getByText("DEGRADED_SOURCE_EVIDENCE")).toHaveCount(0);
    await expect(page.getByText("BLOCKED_BY_SOURCE_EVIDENCE")).toHaveCount(0);
    await expect(page.getByText(/ready for client/i)).toHaveCount(0);
  });

  test("keeps proposal decisions, review modes, and actions usable across supported widths", async ({
    page,
  }) => {
    await mockProposalDetail(page);
    await mkdir(evidenceDirectory, { recursive: true });

    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "compact", width: 519, height: 900 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { level: 1, name: "Proposal pp_1" })).toBeVisible();
      await expect(page.getByLabel("Proposal decision summary")).toBeVisible();
      await expect(page.getByRole("tab", { name: "Narrative review" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await page.screenshot({
        path: path.join(evidenceDirectory, `proposal-review-${viewport.name}.png`),
        fullPage: true,
      });

      const action = page.getByRole("button", { name: "Submit for risk review" });
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeVisible();
      expect(
        await action.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const point = document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2,
          );
          return point === element || (point !== null && element.contains(point));
        }),
      ).toBeTruthy();

      const evidence = page.getByTestId("proposal-evidence-disclosure");
      await expect(evidence).not.toHaveAttribute("open", "");
      await evidence.locator("summary").click();
      await expect(evidence).toHaveAttribute("open", "");
      await expect(page.getByText("Lineage and audit")).toBeVisible();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBeFalsy();

    }
  });
});
