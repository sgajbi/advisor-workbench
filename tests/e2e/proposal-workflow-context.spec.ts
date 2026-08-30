import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { buildPlatformCapabilitiesFixture } from "./platform-capabilities-fixture";
import { collectHorizontalOverflow } from "./support/horizontal-overflow";
import { proposalImplementationStatusFixture } from "../fixtures/proposal-implementation-status";
import { proposalRiskImpactFixture } from "../fixtures/proposal-risk-impact";
import { proposalDiscussionPackFixture } from "../fixtures/proposal-discussion-pack";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const advisoryAsOfDate = "2026-04-10";
const discussionPackEvidenceDirectory = path.resolve(
  process.env.ISSUE_798_EVIDENCE_DIR ??
    path.join("output", "issue-798-product-copy"),
  "discussion-pack-review",
);
const implementationStatusEvidenceDirectory = path.resolve(
  process.env.ISSUE_798_EVIDENCE_DIR ??
    path.join("output", "issue-798-product-copy"),
  "implementation-follow-up",
);

function buildProposalBuilderUrl({
  includeAdvisoryDate = true,
  advisoryDate = advisoryAsOfDate,
  reportingCurrency,
}: {
  includeAdvisoryDate?: boolean;
  advisoryDate?: string;
  reportingCurrency?: string;
} = {}): string {
  const params = new URLSearchParams({ portfolioId });
  if (includeAdvisoryDate) {
    params.set("asOfDate", advisoryDate);
  }
  if (reportingCurrency) {
    params.set("reportingCurrency", reportingCurrency);
  }
  return `/proposals/simulate?${params.toString()}`;
}

async function mockProposalPortfolioEvidence(
  page: Page,
  {
    failFirstRead = false,
    effectiveDate,
    requestedDates,
    sourceCurrencies,
  }: {
    failFirstRead?: boolean;
    effectiveDate?: string;
    requestedDates?: string[];
    sourceCurrencies?: Array<string | null>;
  } = {},
) {
  let bookReadCount = 0;

  await page.route(
    `**/api/bff/api/v1/portfolio/portfolios/${portfolioId}/book**`,
    async (route) => {
      bookReadCount += 1;
      const requestUrl = new URL(route.request().url());
      const requestedDate = requestUrl.searchParams.get("as_of_date") ?? "";
      const requestedCurrency =
        requestUrl.searchParams.get("reporting_currency") ?? "USD";
      const sourceCurrency = sourceCurrencies
        ? sourceCurrencies[bookReadCount - 1]
        : requestedCurrency;
      requestedDates?.push(requestedDate);
      if (failFirstRead && bookReadCount === 1) {
        await route.fulfill({
          status: 503,
          json: { detail: "Portfolio book unavailable" },
        });
        return;
      }
      await route.fulfill({
        json: {
          as_of_date: effectiveDate ?? requestedDate,
          portfolio: {
            portfolio_id: portfolioId,
            display_name: "Global Balanced Portfolio",
            client_id: "CIF_001",
            base_currency: sourceCurrency,
            booking_center_code: "SGPB",
          },
          summary: {
            assets_under_management_base: 23_000,
            invested_market_value_base: 19_000,
            cash_market_value_base: 4_000,
            cash_weight_pct: 17.4,
            position_count: 1,
            cash_balance_count: 1,
          },
          cash_balances: [
            {
              security_id: "CASH_USD",
              instrument_name: "US Dollar Cash",
              currency: sourceCurrency,
              quantity: 4_000,
              market_value_base: 4_000,
              weight_pct: 17.4,
            },
          ],
          positions: [
            {
              security_id: "AAPL",
              instrument_name: "Apple Inc.",
              asset_class: "Equities",
              quantity: 100,
              market_value_base: 19_000,
              weight_pct: 82.6,
            },
          ],
          top_positions: [],
          allocation_views: [],
        },
      });
    },
  );
}

async function mockProposalBuilderEvaluation(
  page: Page,
  { failureStatus }: { failureStatus?: 403 | 404 } = {},
) {
  await mockProposalPortfolioEvidence(page);
  await page.route("**/api/bff/api/v1/advisory-workspaces**", async (route) => {
    if (failureStatus) {
      await route.fulfill({
        status: failureStatus,
        body: "INTERNAL_SOURCE_DETAIL",
        headers: {
          "X-Correlation-Id": `corr-proposal-builder-${failureStatus}`,
        },
      });
      return;
    }
    const url = new URL(route.request().url());
    const evaluated = url.pathname.endsWith("/evaluate");
    await route.fulfill({
      json: {
        correlation_id: evaluated
          ? "corr-builder-evaluation"
          : "corr-builder-create",
        contract_version: "v1",
        data: {
          workspace: {
            workspace_id: "aws_browser_001",
            ...(evaluated
              ? {
                  evaluation_summary: {
                    status: "READY",
                    blocking_issue_count: 0,
                    review_issue_count: 1,
                    impact_summary: { trade_count: 0 },
                  },
                  latest_proposal_result: {
                    status: "READY",
                    proposal_run_id: "run_browser_001",
                  },
                }
              : {}),
          },
        },
      },
    });
  });
}

async function mockProposalQueue(
  page: Page,
  {
    includeSecondRisk = false,
    includeDiscussionPack = false,
  }: { includeSecondRisk?: boolean; includeDiscussionPack?: boolean } = {},
) {
  await page.route(
    "**/api/bff/api/v1/platform/capabilities?**",
    async (route) => {
      await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals?portfolio_id=**",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-proposal-workflow-context",
          contract_version: "v1",
          data: {
            items: [
              {
                proposal_id: "PRP-RISK-001",
                portfolio_id: portfolioId,
                current_state: "RISK_REVIEW",
                current_version_no: 3,
                created_by: "advisor_sg_01",
                created_at: "2026-08-19T09:30:00Z",
                title: "Concentration risk review",
              },
              {
                proposal_id: "PRP-READY-001",
                portfolio_id: portfolioId,
                current_state: "EXECUTION_READY",
                current_version_no: 5,
                created_by: "advisor_sg_02",
                created_at: "2026-08-20T11:15:00Z",
                title: "Execution handoff review",
              },
              ...(includeSecondRisk
                ? [
                    {
                      proposal_id: "PRP-RISK-002",
                      portfolio_id: portfolioId,
                      current_state: "RISK_REVIEW",
                      current_version_no: 4,
                      created_at: "2026-08-20T15:20:00Z",
                      title: "Income allocation review",
                    },
                  ]
                : []),
              ...(includeDiscussionPack
                ? [
                    {
                      proposal_id: "proposal-1",
                      portfolio_id: portfolioId,
                      current_state: "AWAITING_CLIENT_CONSENT",
                      current_version_no: 2,
                      created_by: "advisor_sg_07",
                      created_at: "2026-08-21T08:30:00Z",
                      title: "Rebalance concentrated technology exposure",
                    },
                    {
                      proposal_id: "proposal-2",
                      portfolio_id: portfolioId,
                      current_state: "AWAITING_CLIENT_CONSENT",
                      current_version_no: 1,
                      created_by: "advisor_sg_09",
                      created_at: "2026-08-21T10:00:00Z",
                      title: "Income mandate adjustment",
                    },
                  ]
                : []),
            ],
            next_cursor: null,
          },
        },
      });
    },
  );
}

async function mockProposalDiscussionPack(
  page: Page,
  requestedProposalIds: string[],
) {
  await page.route(
    /\/api\/bff\/api\/v1\/proposals\/[^/?]+\/discussion-pack-review\?.+/,
    async (route) => {
      const url = new URL(route.request().url());
      const proposalId = url.pathname.split("/").at(-2) ?? "";
      const versionNo = Number(url.searchParams.get("version_no"));
      requestedProposalIds.push(proposalId);
      const envelope = proposalDiscussionPackFixture();
      envelope.data.proposal_id = proposalId;
      envelope.data.title =
        proposalId === "proposal-2"
          ? "Income mandate adjustment"
          : "Rebalance concentrated technology exposure";
      envelope.data.version_no = versionNo;
      envelope.data.narrative.generation_mode = "AI_ASSISTED_DRAFT";
      envelope.data.lineage.proposal_version_id = `${proposalId}:${versionNo}`;
      await route.fulfill({ json: envelope });
    },
  );
}

async function mockProposalImplementationStatus(
  page: Page,
  requestedProposalIds: string[],
) {
  await page.route(
    /\/api\/bff\/api\/v1\/proposals\/[^/?]+\/execution-status$/,
    async (route) => {
      const proposalId =
        new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
      requestedProposalIds.push(proposalId);
      const envelope = proposalImplementationStatusFixture();
      envelope.data.proposal_id = proposalId;
      envelope.data.portfolio_id = portfolioId;
      envelope.data.title = "Execution handoff review";
      envelope.data.current_version_no = 5;
      envelope.data.related_version_no = 5;
      envelope.data.latest_workflow_event!.related_version_no = 5;
      envelope.data.lineage.proposal_id = proposalId;
      envelope.data.lineage.portfolio_id = portfolioId;
      envelope.data.lineage.related_version_no = 5;
      await route.fulfill({ json: envelope });
    },
  );
}

async function mockProposalApprovalEvidence(page: Page) {
  const proposal = (proposalId: string) => {
    const executionReady = proposalId === "PRP-READY-001";
    const incomeReview = proposalId === "PRP-RISK-003";
    return {
      proposal_id: proposalId,
      portfolio_id: portfolioId,
      current_state: executionReady ? "EXECUTION_READY" : "RISK_REVIEW",
      current_version_no: executionReady ? 5 : incomeReview ? 4 : 3,
      created_by: executionReady ? "advisor_sg_02" : "advisor_sg_01",
      created_at: executionReady
        ? "2026-08-20T11:15:00Z"
        : "2026-08-19T09:30:00Z",
      title: executionReady
        ? "Execution handoff review"
        : incomeReview
          ? "Income allocation review"
        : "Concentration risk review",
    };
  };

  await page.route(
    /\/api\/bff\/api\/v1\/proposals\/[^/?]+\?include_evidence=(?:true|false)$/,
    async (route) => {
      const proposalId =
        new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
      await route.fulfill({
        json: {
          correlation_id: `corr-detail-${proposalId}`,
          contract_version: "v1",
          data: {
            proposal: proposal(proposalId),
            current_version: {
              version_no: proposal(proposalId).current_version_no,
            },
          },
        },
      });
    },
  );
  await page.route(
    /\/api\/bff\/api\/v1\/proposals\/[^/?]+\/workflow-events$/,
    async (route) => {
      const proposalId =
        new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
      const record = proposal(proposalId);
      await route.fulfill({
        json: {
          correlation_id: `corr-workflow-${proposalId}`,
          contract_version: "v1",
          data: {
            proposal_id: proposalId,
            current_state: record.current_state,
            events: [
              {
                event_id: `event-${proposalId}`,
                event_type:
                  record.current_state === "EXECUTION_READY"
                    ? "COMPLIANCE_APPROVED"
                    : "RISK_REVIEW_REQUESTED",
                from_state:
                  record.current_state === "EXECUTION_READY"
                    ? "AWAITING_CLIENT_CONSENT"
                    : "DRAFT",
                to_state: record.current_state,
                actor_id: "advisor_sg_01",
                occurred_at: "2026-08-21T09:00:00Z",
              },
            ],
          },
        },
      });
    },
  );
  await page.route(
    /\/api\/bff\/api\/v1\/proposals\/[^/?]+\/approvals$/,
    async (route) => {
      const proposalId =
        new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
      const record = proposal(proposalId);
      await route.fulfill({
        json: {
          correlation_id: `corr-approvals-${proposalId}`,
          contract_version: "v1",
          data: {
            proposal_id: proposalId,
            current_state: record.current_state,
            approvals: [
              {
                approval_id: `approval-${proposalId}`,
                approval_type: "RISK",
                approved: record.current_state === "EXECUTION_READY",
                actor_id: "risk_officer_sg_01",
                occurred_at: "2026-08-21T09:00:00Z",
              },
            ],
          },
        },
      });
    },
  );
  await page.route(
    /\/api\/bff\/api\/v1\/proposals\/[^/?]+\/lineage$/,
    async (route) => {
      const proposalId =
        new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
      const record = proposal(proposalId);
      await route.fulfill({
        json: {
          correlation_id: `corr-lineage-${proposalId}`,
          contract_version: "v1",
          data: {
            proposal_id: proposalId,
            versions: [{ version_no: record.current_version_no }],
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/delivery-summary",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-delivery-PRP-READY-001",
          contract_version: "v1",
          data: {},
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/delivery-events",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-delivery-events-PRP-READY-001",
          contract_version: "v1",
          data: { event_count: 0 },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/versions/5/narrative",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-narrative-PRP-READY-001",
          contract_version: "v1",
          data: {
            policy_version: "proposal-narrative-deterministic.v1",
            narrative_review: {
              proposal_id: "PRP-READY-001",
              proposal_version_no: 5,
              narrative_id: "narrative-PRP-READY-001",
              review_state: "NOT_REVIEWED",
              source_narrative_hash: null,
              client_ready_status: "NOT_REQUESTED",
            },
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/versions/5/memo",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-memo-PRP-READY-001",
          contract_version: "v1",
          data: {
            proposal: {
              proposal_id: "PRP-READY-001",
              current_state: "DRAFT",
              current_version_no: 5,
            },
            proposal_version_no: 5,
            memo_id: "memo-PRP-READY-001",
            memo_status: "READY",
            memo_hash: "sha256:memo-PRP-READY-001",
            memo: {
              memo_hash: "sha256:memo-PRP-READY-001",
              memo_id: "memo-PRP-READY-001",
              proposal_id: "PRP-READY-001",
              proposal_version_no: 5,
            },
            review_posture: {
              status: "RECORDED",
              review_action: "APPROVE_FOR_ADVISOR_USE",
              source_memo_hash: "sha256:memo-PRP-READY-001",
            },
            report_package_posture: { status: "NOT_RECORDED" },
            ai_commentary_posture: { status: "NOT_RECORDED" },
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/versions/5/memo/projection**",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-projection-PRP-READY-001",
          contract_version: "v1",
          data: {
            proposal: {
              proposal_id: "PRP-READY-001",
              current_state: "DRAFT",
              current_version_no: 5,
            },
            proposal_version_no: 5,
            memo_id: "memo-PRP-READY-001",
            memo_hash: "sha256:memo-PRP-READY-001",
            audience: "ADVISOR",
            projection: { client_ready_publication: "BLOCKED" },
            sections: [{ section_id: "SUMMARY", audience_visibility: ["ADVISOR"] }],
            projection_posture: { client_ready_publication: "BLOCKED" },
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/memos/lineage",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-memo-lineage-PRP-READY-001",
          contract_version: "v1",
          data: {
            proposal: {
              proposal_id: "PRP-READY-001",
              current_state: "DRAFT",
              current_version_no: 5,
            },
            memo_count: 1,
            latest_memo_id: "memo-PRP-READY-001",
            lineage_complete: true,
            memos: [
              {
                memo_id: "memo-PRP-READY-001",
                proposal_version_no: 5,
                memo_hash: "sha256:memo-PRP-READY-001",
                memo_status: "READY",
                event_count: 2,
                archive_refs: [],
              },
            ],
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/PRP-READY-001/versions/5/memo/replay-evidence",
    async (route) => {
      await route.fulfill({
        json: {
          correlation_id: "corr-replay-PRP-READY-001",
          contract_version: "v1",
          data: {
            subject: {
              proposal_id: "PRP-READY-001",
              memo_id: "memo-PRP-READY-001",
              proposal_version_no: 5,
            },
            hashes: { memo_hash: "sha256:memo-PRP-READY-001" },
            audit_events: [
              { event_type: "MEMO_DRAFT_CREATED" },
              { event_type: "MEMO_REVIEW_RECORDED" },
            ],
            explanation: { client_ready_publication: "BLOCKED" },
          },
        },
      });
    },
  );
}

async function mockProposalRiskImpact(
  page: Page,
  requestedProposalIds: string[],
) {
  await page.route(
    "**/api/bff/api/v1/proposals/*/risk-impact",
    async (route) => {
      const url = new URL(route.request().url());
      expect(url.search).toBe("");
      const proposalId = url.pathname.split("/").at(-2) ?? "";
      requestedProposalIds.push(proposalId);
      const payload = proposalRiskImpactFixture();
      payload.data.proposal_id = proposalId;
      payload.data.title =
        proposalId === "PRP-RISK-002"
          ? "Income allocation review"
          : "Concentration risk review";
      payload.data.version_no = proposalId === "PRP-RISK-002" ? 4 : 3;
      await route.fulfill({ json: payload });
    },
  );
}

async function mockSuitabilityReviews(
  page: Page,
  recordedEvaluationIds: string[],
) {
  const reviews = [
    {
      evaluation_id: "pev_001",
      portfolio_id: portfolioId,
      proposal_id: "PRP-RISK-001",
      proposal_version_id: "ppv_001",
      policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
      policy_version: "2026.05",
      evaluation_status: "PENDING_REVIEW",
      approval_dependencies: ["COMPLIANCE_REVIEW:SG_STRUCTURED_NOTE"],
      disclosure_requirements: [
        "advisor_reviewed_disclosure:SG_STRUCTURED_NOTE",
      ],
      consent_requirements: [],
      source_gaps: ["client_consent:SG_STRUCTURED_NOTE"],
    },
    {
      evaluation_id: "pev_002",
      portfolio_id: portfolioId,
      proposal_id: "PRP-INCOME-002",
      proposal_version_id: "ppv_002",
      policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
      policy_version: "2026.06",
      evaluation_status: "PENDING_REVIEW",
      approval_dependencies: [],
      disclosure_requirements: [],
      consent_requirements: ["client_consent:SG_INCOME_MANDATE"],
      source_gaps: [],
    },
  ];

  await page.route(
    "**/api/bff/api/v1/advisory-policy-evaluations/**",
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith("/review-queue")) {
        await route.fulfill({
          json: {
            correlation_id: "corr-policy-queue",
            contract_version: "v1",
            data: { items: reviews },
          },
        });
        return;
      }

      const pathParts = url.pathname.split("/").filter(Boolean);
      const evaluationId = pathParts.at(-2)?.startsWith("pev_")
        ? pathParts.at(-2)
        : pathParts.at(-1);
      const review =
        reviews.find((item) => item.evaluation_id === evaluationId) ??
        reviews[0];

      if (
        request.method() === "POST" &&
        url.pathname.endsWith("/sign-off-decisions")
      ) {
        recordedEvaluationIds.push(evaluationId ?? "unknown");
        await route.fulfill({
          json: {
            correlation_id: "corr-policy-decision",
            contract_version: "v1",
            data: {
              workflow: {
                evaluation_id: evaluationId,
                sign_off_status: "PENDING_REVIEW",
                client_ready_publication: "BLOCKED",
              },
            },
          },
        });
        return;
      }

      if (url.pathname.endsWith("/sign-off-package")) {
        await route.fulfill({
          json: {
            correlation_id: "corr-policy-package",
            contract_version: "v1",
            data: {
              package_posture: {
                sign_off_source_package: "AVAILABLE",
                client_ready_publication: "BLOCKED",
              },
              lineage: {
                evaluation_id: evaluationId,
                audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
                lineage_posture: { client_ready_publication: "BLOCKED" },
              },
            },
          },
        });
        return;
      }

      if (url.pathname.endsWith("/workflow")) {
        await route.fulfill({
          json: {
            correlation_id: "corr-policy-workflow",
            contract_version: "v1",
            data: {
              evaluation_id: evaluationId,
              sign_off_status: "PENDING_REVIEW",
              sign_off_blockers:
                evaluationId === "pev_002" ? ["CLIENT_CONSENT_REQUIRED"] : [],
              maker_checker_required: true,
              sla_posture: { status: "WITHIN_SLA", open_requirement_count: 1 },
              client_ready_publication: "BLOCKED",
            },
          },
        });
        return;
      }

      await route.fulfill({
        json: {
          correlation_id: "corr-policy-detail",
          contract_version: "v1",
          data: {
            ...review,
            evaluation_hash: `sha256:${review.evaluation_id}`,
            source_refs: ["lotus-core:governed_policy_source"],
            evaluation_json: {
              rule_results: [{ rule_id: "MANDATE_ALIGNMENT", status: "READY" }],
            },
          },
        },
      });
    },
  );
}

test("shows source-backed queue posture without invented advisory evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalQueue(page);
  await mockProposalApprovalEvidence(page);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { level: 1, name: "Approval Queue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "1 decision is not approved",
    }),
  ).toBeVisible();
  const lifecycleCounts = page.getByLabel("Proposal lifecycle counts");
  await expect(lifecycleCounts.getByText("2", { exact: true })).toBeVisible();
  await expect(
    lifecycleCounts.getByText("In view", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Selected proposal decision" })
      .getByLabel("Status Approval exception"),
  ).toBeVisible();
  await expect(
    page.getByText("1 recorded approval decision is not approved."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Gateway-backed proposal detail, workflow, approvals, and lineage",
    ),
  ).toBeVisible();

  await expect(page.getByText("KYC validity verified")).toHaveCount(0);
  await expect(
    page.getByText("Evidence pack: advisor-use review in progress"),
  ).toHaveCount(0);
  await expect(page.getByText("Client Readiness")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("keeps Approval Queue decisions unavailable when its source worklist fails", async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  const proposalSourceStatuses: number[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (/\/api\/bff\/api\/v1\/proposals\?/.test(response.url())) {
      proposalSourceStatuses.push(response.status());
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(
    "**/api/bff/api/v1/proposals?portfolio_id=**",
    async (route) => {
      await route.fulfill({
        status: 503,
        json: { detail: "Proposal source unavailable" },
      });
    },
  );
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Proposal lifecycle unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The proposal queue could not be loaded from the approved advisory workflow.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("listbox", { name: "Approval Queue proposals" }),
  ).toHaveCount(0);
  await expect(page.getByText("Concentration risk review")).toHaveCount(0);
  await testInfo.attach("approval-queue-source-unavailable", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(proposalSourceStatuses.length).toBeGreaterThan(0);
  expect(new Set(proposalSourceStatuses)).toEqual(new Set([503]));
  expect(pageErrors).toEqual([]);
});

test("keeps an exception-led Approval Queue worklist and selected decision context", async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalQueue(page);
  await mockProposalApprovalEvidence(page);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  const workspace = page.getByTestId("proposal-approval-decision-workspace");
  const worklist = page.getByRole("listbox", {
    name: "Approval Queue proposals",
  });
  const selectedDecision = page.getByRole("region", {
    name: "Selected proposal decision",
  });
  const firstProposal = worklist.getByRole("option", {
    name: /Concentration risk review/,
  });
  const secondProposal = worklist.getByRole("option", {
    name: /Execution handoff review/,
  });

  await expect(workspace).toBeVisible();
  await expect(firstProposal).toHaveAttribute("aria-selected", "true");
  await expect(
    selectedDecision.getByRole("heading", {
      name: "Concentration risk review",
    }),
  ).toBeVisible();
  await expect(firstProposal).toContainText("Version 3");
  await expect(firstProposal).toContainText("19 Aug 2026");
  await expect(firstProposal).toContainText("Recorded by source");
  await expect(
    selectedDecision.getByRole("heading", {
      name: "1 decision is not approved",
    }),
  ).toBeVisible();
  await expect(
    selectedDecision.getByRole("link", { name: "Open full proposal review" }),
  ).toHaveAttribute(
    "href",
    `/proposals/PRP-RISK-001?portfolioId=${portfolioId}&selectedRecordId=PRP-RISK-001&fromMode=approval-queue`,
  );

  await firstProposal.press("ArrowDown");
  await expect(secondProposal).toBeFocused();
  await expect(secondProposal).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&selectedRecordId=PRP-READY-001&mode=approval-queue`,
  );
  await expect(
    selectedDecision.getByRole("heading", { name: "Execution handoff review" }),
  ).toBeVisible();
  await expect(
    selectedDecision.getByRole("link", { name: "Open full proposal review" }),
  ).toHaveAttribute(
    "href",
    `/proposals/PRP-READY-001?portfolioId=${portfolioId}&selectedRecordId=PRP-READY-001&fromMode=approval-queue`,
  );
  await secondProposal.press("Enter");
  await expect(selectedDecision).toBeFocused();
  await selectedDecision.press("Escape");
  await expect(secondProposal).toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await testInfo.attach("approval-queue-review-desk-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  for (const viewport of [
    { width: 1440, height: 1000, layout: "split" },
    { width: 1280, height: 1000, layout: "stacked" },
    { width: 1024, height: 1100, layout: "split" },
    { width: 768, height: 1024, layout: "stacked" },
    { width: 720, height: 1000, layout: "stacked" },
    { width: 519, height: 900, layout: "stacked" },
    { width: 390, height: 844, layout: "stacked" },
    { width: 320, height: 900, layout: "stacked" },
  ] as const) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await expect(workspace).toBeVisible();
    const [worklistBox, selectedBox] = await Promise.all([
      worklist.boundingBox(),
      selectedDecision.boundingBox(),
    ]);
    expect(worklistBox).not.toBeNull();
    expect(selectedBox).not.toBeNull();
    if (viewport.layout === "split") {
      expect(selectedBox?.x ?? 0).toBeGreaterThan(worklistBox?.x ?? 0);
    } else {
      expect(selectedBox?.y ?? 0).toBeGreaterThan(worklistBox?.y ?? 0);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await workspace.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await testInfo.attach("approval-queue-review-desk-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  const refresh = selectedDecision.getByRole("button", {
    name: "Refresh evidence",
  });
  await refresh.focus();
  await refresh.click();
  const refreshStatus = page.getByTestId("workbench-refresh-status");
  await expect(refreshStatus).toHaveAttribute("data-state", "confirmed");
  await expect(refresh).toBeFocused();

  await selectedDecision
    .getByRole("link", { name: "Open full proposal review" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(
      `/proposals/PRP-READY-001\\?portfolioId=${portfolioId}&selectedRecordId=PRP-READY-001&fromMode=approval-queue$`,
    ),
  );
  await expect(
    page.getByRole("link", { name: "Return to Approval Queue" }),
  ).toHaveAttribute(
    "href",
    `/proposals?portfolioId=${portfolioId}&selectedRecordId=PRP-READY-001`,
  );
  await page.getByRole("link", { name: "Return to Approval Queue" }).click();
  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&selectedRecordId=PRP-READY-001`,
  );
  await expect(
    page.getByRole("listbox", { name: "Approval Queue proposals" }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: /Execution handoff review/ }),
  ).toHaveAttribute("aria-selected", "true");
  expect(browserErrors).toEqual([]);
});

test("presents source-backed implementation handoff evidence without execution overclaim", async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  const requestedProposalIds: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockProposalQueue(page);
  await mockProposalImplementationStatus(page, requestedProposalIds);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=implementation`, {
    waitUntil: "domcontentloaded",
  });

  const workspace = page.getByTestId(
    "proposal-implementation-status-workspace",
  );
  const worklist = page.getByRole("listbox", {
    name: "Implementation follow-up proposals",
  });
  const selectedEvidence = page.getByRole("region", {
    name: "Selected proposal implementation review",
  });
  const selectedFacts = selectedEvidence.locator("dl").first();
  await expect(workspace).toBeVisible();
  await expect(worklist.getByRole("option")).toHaveCount(1);
  await expect(
    selectedEvidence.getByRole("heading", {
      name: "Accepted for implementation",
    }),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("Current version · Version 5"),
  ).toBeVisible();
  await expect(selectedEvidence).not.toContainText("Gateway");
  await expect(page.getByText("Decision posture")).toHaveCount(0);
  await expect(page.getByText("Proposal coverage")).toBeVisible();
  await expect(page.getByText("Advisory implementation record")).toBeVisible();
  expect(requestedProposalIds).toEqual(["PRP-READY-001"]);

  await mkdir(implementationStatusEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(
      implementationStatusEvidenceDirectory,
      "implementation-follow-up-desktop.png",
    ),
    fullPage: true,
  });

  const supportDetails = selectedEvidence.locator("details", {
    hasText: "Implementation support details",
  });
  await expect(supportDetails).not.toHaveAttribute("open", "");
  await selectedEvidence.getByText("Implementation support details").click();
  await expect(supportDetails).toHaveAttribute("open", "");
  await expect(
    selectedEvidence.getByText(
      /advisory implementation handoff only.*settlement/s,
    ),
  ).toBeVisible();
  await expect(selectedEvidence.getByText("lotus-advise")).toBeVisible();
  await expect(
    selectedEvidence.getByText("corr-implementation-1"),
  ).toBeVisible();

  const refresh = selectedEvidence.getByRole("button", {
    name: "Refresh implementation status",
  });
  await refresh.focus();
  await refresh.click();
  const refreshStatus = selectedEvidence.getByTestId(
    "workbench-refresh-status",
  );
  await expect(refreshStatus).toHaveAttribute("data-state", "confirmed");
  await expect(refreshStatus).toContainText(
    "Current handoff available",
  );
  await expect(refresh).toBeFocused();
  expect(requestedProposalIds).toEqual(["PRP-READY-001", "PRP-READY-001"]);

  await testInfo.attach("implementation-status-workspace-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  for (const viewport of [
    { width: 1440, height: 1100 },
    { width: 1280, height: 1100 },
    { width: 1024, height: 1200 },
    { width: 720, height: 1100 },
    { width: 390, height: 844 },
  ] as const) {
    await page.setViewportSize(viewport);
    const [worklistBox, selectedBox] = await Promise.all([
      worklist.boundingBox(),
      selectedEvidence.boundingBox(),
    ]);
    expect(worklistBox).not.toBeNull();
    expect(selectedBox).not.toBeNull();
    const sideBySide =
      (selectedBox?.x ?? 0) >=
      (worklistBox?.x ?? 0) + (worklistBox?.width ?? 0);
    const stacked =
      (selectedBox?.y ?? 0) >=
      (worklistBox?.y ?? 0) + (worklistBox?.height ?? 0);
    expect(
      sideBySide || stacked,
      `implementation worklist and evidence must not overlap at ${viewport.width}px`,
    ).toBe(true);
    if (viewport.width === 1440) expect(sideBySide).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await collectHorizontalOverflow(selectedEvidence),
      `implementation evidence must not overflow at ${viewport.width}px`,
    ).toEqual([]);
    expect(
      await workspace.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
      `implementation workspace must not overflow at ${viewport.width}px`,
    ).toBe(true);
    const factColumnWidths = await selectedFacts.evaluate((element) =>
      getComputedStyle(element)
        .gridTemplateColumns.split(" ")
        .filter(Boolean)
        .map((value) => Number.parseFloat(value)),
    );
    expect(
      Math.min(...factColumnWidths),
      `implementation facts must retain readable column width at ${viewport.width}px`,
    ).toBeGreaterThanOrEqual(120);
    if (viewport.width === 390) expect(factColumnWidths).toHaveLength(1);
  }

  await testInfo.attach("implementation-status-workspace-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 519, height: 920 });
  await selectedEvidence
    .getByText("Implementation support details")
    .click();
  await expect(supportDetails).not.toHaveAttribute("open", "");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.screenshot({
    path: path.join(
      implementationStatusEvidenceDirectory,
      "implementation-follow-up-compact.png",
    ),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});

test("presents an adviser-grade discussion review without client-release overclaim", async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  const requestedProposalIds: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockProposalQueue(page, { includeDiscussionPack: true });
  await mockProposalDiscussionPack(page, requestedProposalIds);
  await page.goto(
    `/proposals?portfolioId=${portfolioId}&mode=discussion-pack`,
    { waitUntil: "domcontentloaded" },
  );

  const workspace = page.getByTestId("proposal-discussion-pack-workspace");
  const worklist = page.getByRole("listbox", {
    name: "Discussion pack proposals",
  });
  const selectedEvidence = page.getByRole("region", {
    name: "Selected discussion pack review",
  });
  await expect(workspace).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Client meeting preparation" }),
  ).toBeVisible();
  await expect(worklist.getByRole("option")).toHaveCount(2);
  await expect(
    selectedEvidence.getByRole("heading", {
      name: "Resolve the remaining client-discussion controls",
    }),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByRole("heading", {
      name: "Client-discussion checklist",
    }),
  ).toBeVisible();
  await expect(selectedEvidence.getByText("AI-assisted draft")).toBeVisible();
  await expect(
    selectedEvidence.getByText(
      "No client consent is recorded for this version.",
    ),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("Client release and delivery"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByRole("button", {
      name: /publish|deliver|contact client/i,
    }),
  ).toHaveCount(0);
  expect(requestedProposalIds).toEqual(["proposal-1"]);

  await testInfo.attach("discussion-pack-review-workspace-desktop-default", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  const firstOption = worklist.getByRole("option").first();
  await firstOption.focus();
  await firstOption.press("ArrowDown");
  await expect(
    worklist.getByRole("option", { name: /Income mandate adjustment/i }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    selectedEvidence.getByRole("heading", {
      name: "Income mandate adjustment",
    }),
  ).toBeVisible();
  expect(requestedProposalIds).toEqual(["proposal-1", "proposal-2"]);

  const refresh = selectedEvidence.getByRole("button", {
    name: "Refresh discussion pack",
  });
  await refresh.focus();
  await refresh.click();
  const refreshStatus = selectedEvidence.getByTestId(
    "workbench-refresh-status",
  );
  await expect(refreshStatus).toHaveAttribute("data-state", "confirmed");
  await expect(refreshStatus).toContainText(
    "Current version available",
  );
  await expect(refresh).toBeFocused();

  await selectedEvidence.getByText("Support details").click();
  await expect(
    selectedEvidence.getByText("proposal-discussion-pack-review.v1"),
  ).toBeVisible();

  await testInfo.attach("discussion-pack-review-workspace-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await mkdir(discussionPackEvidenceDirectory, { recursive: true });
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1100, capture: true },
    { name: "intermediate", width: 1280, height: 1100, capture: false },
    { name: "tablet", width: 1024, height: 1200, capture: true },
    { name: "narrow", width: 720, height: 1100, capture: false },
    { name: "compact", width: 519, height: 920, capture: true },
    { name: "mobile", width: 390, height: 844, capture: false },
  ] as const) {
    await page.setViewportSize(viewport);
    const [worklistBox, selectedBox] = await Promise.all([
      worklist.boundingBox(),
      selectedEvidence.boundingBox(),
    ]);
    expect(worklistBox).not.toBeNull();
    expect(selectedBox).not.toBeNull();
    const sideBySide =
      (selectedBox?.x ?? 0) >=
      (worklistBox?.x ?? 0) + (worklistBox?.width ?? 0);
    const stacked =
      (selectedBox?.y ?? 0) >=
      (worklistBox?.y ?? 0) + (worklistBox?.height ?? 0);
    expect(
      stacked && !sideBySide,
      `discussion worklist must lead the evidence pane at ${viewport.width}px`,
    ).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await workspace.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    if (viewport.capture) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
      await page.screenshot({
        path: path.join(
          discussionPackEvidenceDirectory,
          `discussion-pack-review-${viewport.name}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
    }
  }

  await testInfo.attach("discussion-pack-review-workspace-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(browserErrors).toEqual([]);
});

test("presents source-backed Risk and Impact evidence as a responsive advisor decision workspace", async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  const requestedProposalIds: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockProposalQueue(page, { includeSecondRisk: true });
  await mockProposalRiskImpact(page, requestedProposalIds);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=risk-impact`, {
    waitUntil: "domcontentloaded",
  });

  const workspace = page.getByTestId("proposal-risk-impact-workspace");
  const worklist = page.getByRole("listbox", {
    name: "Risk and Impact proposals",
  });
  const selectedEvidence = page.getByRole("region", {
    name: "Selected proposal risk and impact",
  });
  const firstProposal = worklist.getByRole("option", {
    name: /Concentration risk review/,
  });
  const secondProposal = worklist.getByRole("option", {
    name: /Income allocation review/,
  });

  await expect(workspace).toBeVisible();
  await expect(
    selectedEvidence.getByRole("heading", { name: "Requires Risk Review" }),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("Current and proposed allocation"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("USD 850,000.00 · 12 positions"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("USD 775,000.00 · 13 positions"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText(
      "Risk review is required before client discussion.",
    ),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByRole("list", { name: "Workflow gate reasons" }),
  ).toContainText("Material Concentration Change · Rule Engine · High");
  expect(requestedProposalIds).toEqual(["PRP-RISK-001"]);

  await firstProposal.press("ArrowDown");
  await expect(secondProposal).toBeFocused();
  await expect(secondProposal).toHaveAttribute("aria-selected", "true");
  await expect(
    selectedEvidence.getByRole("heading", { name: "Income allocation review" }),
  ).toBeVisible();
  expect(requestedProposalIds).toEqual(["PRP-RISK-001", "PRP-RISK-002"]);
  await expect(
    selectedEvidence.getByRole("link", { name: "Open proposal review" }),
  ).toHaveAttribute(
    "href",
    `/proposals/PRP-RISK-002?portfolioId=${portfolioId}&selectedRecordId=PRP-RISK-002&fromMode=risk-impact`,
  );

  const refreshAction = selectedEvidence.getByRole("button", {
    name: "Refresh proposal evidence",
  });
  await refreshAction.click();
  await expect(refreshAction).toBeFocused();
  const refreshStatus = selectedEvidence.getByTestId(
    "workbench-refresh-status",
  );
  await expect(refreshStatus).toHaveAttribute("data-state", "confirmed");
  await expect(refreshStatus).toContainText(
    "Selected proposal evidence is current",
  );

  await selectedEvidence.getByText("Evidence scope and lineage").click();
  await expect(
    selectedEvidence.getByText("corr-proposal-risk-impact-001"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("advisory-simulation.v1"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("lotus-core.allocation-calculator.v1"),
  ).toBeVisible();
  await expect(
    selectedEvidence.getByText("Benchmark and limits"),
  ).toBeVisible();
  await expect(selectedEvidence.getByText("Scenario analysis")).toBeVisible();
  await expect(selectedEvidence.getByText("Valuation as of")).toBeVisible();

  const desktopTitleBox = await firstProposal
    .getByText("Concentration risk review", { exact: true })
    .boundingBox();
  expect(desktopTitleBox).not.toBeNull();
  expect(
    desktopTitleBox?.height ?? Number.POSITIVE_INFINITY,
    "desktop worklist titles should remain scannable within two lines",
  ).toBeLessThanOrEqual(42);
  const desktopFactsColumns = await firstProposal
    .locator("[data-workbench-record-facts]")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(
    desktopFactsColumns.trim().split(/\s+/),
    "narrow worklist items should stack record facts from their own container",
  ).toHaveLength(1);

  await testInfo.attach("risk-impact-decision-workspace-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  for (const viewport of [
    { width: 1440, height: 1100 },
    { width: 1280, height: 1100 },
    { width: 1024, height: 1200 },
    { width: 720, height: 1100 },
    { width: 390, height: 844 },
  ] as const) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    const [worklistBox, selectedBox] = await Promise.all([
      worklist.boundingBox(),
      selectedEvidence.boundingBox(),
    ]);
    expect(worklistBox).not.toBeNull();
    expect(selectedBox).not.toBeNull();
    const sideBySide =
      (selectedBox?.x ?? 0) >=
      (worklistBox?.x ?? 0) + (worklistBox?.width ?? 0);
    const stacked =
      (selectedBox?.y ?? 0) >=
      (worklistBox?.y ?? 0) + (worklistBox?.height ?? 0);
    expect(
      sideBySide || stacked,
      `worklist and evidence must not overlap at ${viewport.width}px`,
    ).toBe(true);
    if (viewport.width === 1440) {
      expect(
        sideBySide,
        "1440px keeps worklist and selected evidence simultaneously visible",
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await workspace.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    if (viewport.width === 390) {
      const [currentAmountBox, proposedAmountBox] = await Promise.all([
        selectedEvidence
          .getByText("USD 850,000.00 · 12 positions")
          .boundingBox(),
        selectedEvidence
          .getByText("USD 775,000.00 · 13 positions")
          .boundingBox(),
      ]);
      expect(currentAmountBox).not.toBeNull();
      expect(proposedAmountBox).not.toBeNull();
      expect(
        proposedAmountBox?.y ?? 0,
        "mobile allocation amounts should stack without colliding",
      ).toBeGreaterThanOrEqual(
        (currentAmountBox?.y ?? 0) + (currentAmountBox?.height ?? 0),
      );
    }
  }

  await testInfo.attach("risk-impact-decision-workspace-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(browserErrors).toEqual([]);
});

test("keeps workflow context readable without horizontal overflow at stacked-shell width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await mockProposalQueue(page);
  await mockProposalApprovalEvidence(page);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "1 decision is not approved",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Status Source current")).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();
});

test("binds the suitability evidence workspace to the advisor-selected review", async ({
  page,
}, testInfo) => {
  const recordedEvaluationIds: string[] = [];
  const proposalQueueRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/bff\/api\/v1\/proposals\?/.test(request.url())) {
      proposalQueueRequests.push(request.url());
    }
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockProposalQueue(page);
  await mockSuitabilityReviews(page, recordedEvaluationIds);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=suitability`, {
    waitUntil: "domcontentloaded",
  });

  const firstReview = page.getByRole("option", { name: /PRP-RISK-001/i });
  const secondReview = page.getByRole("option", { name: /PRP-INCOME-002/i });
  await expect(page.getByLabel("Suitability review counts")).toContainText(
    /2\s*In review\s*2\s*Needs action/,
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(proposalQueueRequests).toEqual([]);

  const decisionWorkspace = page.getByTestId("workbench-decision-workspace");
  const desktopWorklistBox = await decisionWorkspace
    .locator(":scope > div")
    .boundingBox();
  const desktopDecisionBox = await decisionWorkspace
    .locator(":scope > section")
    .boundingBox();
  expect(desktopWorklistBox).not.toBeNull();
  expect(desktopDecisionBox).not.toBeNull();
  expect(desktopDecisionBox!.x).toBeGreaterThan(desktopWorklistBox!.x);

  await expect(firstReview).toHaveAttribute("aria-selected", "true");
  await firstReview.press("ArrowDown");
  await expect(secondReview).toHaveAttribute("aria-selected", "true");

  const selectedReview = page.getByRole("region", {
    name: "Selected suitability review",
  });
  await expect(
    selectedReview.getByRole("heading", { name: "PRP-INCOME-002" }),
  ).toBeVisible();
  await expect(
    selectedReview.getByRole("link", { name: "Open full proposal" }),
  ).toHaveAttribute(
    "href",
    `/proposals/PRP-INCOME-002?portfolioId=${portfolioId}&selectedRecordId=PRP-INCOME-002&fromMode=suitability`,
  );
  await expect(
    selectedReview.getByText("Source evidence complete"),
  ).toBeVisible();
  await selectedReview
    .getByRole("button", { name: "Request more evidence" })
    .click();
  await expect(
    selectedReview.getByText(
      "Evidence review request recorded through the advisory policy workflow.",
    ),
  ).toBeVisible();
  expect(recordedEvaluationIds).toEqual(["pev_002"]);

  await testInfo.attach("suitability-selected-review-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 1024, height: 900 });
  const tabletWorklistBox = await decisionWorkspace
    .locator(":scope > div")
    .boundingBox();
  const tabletDecisionBox = await decisionWorkspace
    .locator(":scope > section")
    .boundingBox();
  expect(tabletWorklistBox).not.toBeNull();
  expect(tabletDecisionBox).not.toBeNull();
  expect(tabletDecisionBox!.x).toBeGreaterThan(tabletWorklistBox!.x);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(secondReview).toHaveAttribute("aria-selected", "true");
  const mobileWorklistBox = await decisionWorkspace
    .locator(":scope > div")
    .boundingBox();
  const mobileDecisionBox = await decisionWorkspace
    .locator(":scope > section")
    .boundingBox();
  expect(mobileWorklistBox).not.toBeNull();
  expect(mobileDecisionBox).not.toBeNull();
  expect(mobileDecisionBox!.y).toBeGreaterThan(mobileWorklistBox!.y);
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();
  await testInfo.attach("suitability-selected-review-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("keeps proposal counts scoped to the current source window", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalApprovalEvidence(page);
  await page.route(
    "**/api/bff/api/v1/proposals?portfolio_id=**",
    async (route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      await route.fulfill({
        json: {
          correlation_id: "corr-proposal-window",
          contract_version: "v1",
          data: cursor
            ? {
                items: [
                  {
                    proposal_id: "PRP-RISK-002",
                    portfolio_id: portfolioId,
                    current_state: "RISK_REVIEW",
                    current_version_no: 3,
                    title: "Cross-asset concentration review",
                  },
                  {
                    proposal_id: "PRP-RISK-003",
                    portfolio_id: portfolioId,
                    current_state: "RISK_REVIEW",
                    current_version_no: 4,
                    title: "Income allocation review",
                  },
                ],
                next_cursor: null,
              }
            : {
                items: [],
                next_cursor: "cursor-window-2",
              },
        },
      });
    },
  );

  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "More proposals available" }),
  ).toBeVisible();
  await expect(page.getByText("0 proposals in current view")).toBeVisible();
  await expect(
    page.getByText("No matching proposals in this view"),
  ).toBeVisible();
  await expect(
    page.getByText("No proposals in the approval queue"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next proposals" }).click();

  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&mode=approval-queue&cursor=cursor-window-2&sourceWindow=2`,
  );

  await expect(
    page
      .getByRole("region", { name: "Selected proposal decision" })
      .getByRole("heading", { name: "Cross-asset concentration review" }),
  ).toBeVisible();
  await expect(page.getByLabel("Proposal lifecycle counts")).toHaveText(
    /^\s*2\s*In view\s*2\s*Not execution-ready\s*$/,
  );
  await expect(page.getByText("Proposal view 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous proposals" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Next proposals" }),
  ).toBeDisabled();

  await page.goBack();
  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&mode=approval-queue`,
  );
  await expect(page.getByText("0 proposals in current view")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next proposals" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("option", { name: /Cross-asset concentration review/ }),
  ).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&mode=approval-queue&cursor=cursor-window-2&sourceWindow=2`,
  );
  await expect(
    page.getByRole("option", { name: /Cross-asset concentration review/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next proposals" }),
  ).toHaveCount(0);

  const secondWindowProposal = page.getByRole("option", {
    name: /Income allocation review/,
  });
  await secondWindowProposal.click();
  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&selectedRecordId=PRP-RISK-003&mode=approval-queue&cursor=cursor-window-2&sourceWindow=2`,
  );
  const openReview = page.getByRole("link", {
    name: "Open full proposal review",
  });
  await expect(openReview).toHaveAttribute(
    "href",
    `/proposals/PRP-RISK-003?portfolioId=${portfolioId}&selectedRecordId=PRP-RISK-003&fromMode=approval-queue&cursor=cursor-window-2&sourceWindow=2`,
  );
  await openReview.click();
  const returnLink = page.getByRole("link", {
    name: "Return to Approval Queue",
  });
  await expect(returnLink).toHaveAttribute(
    "href",
    `/proposals?portfolioId=${portfolioId}&selectedRecordId=PRP-RISK-003&cursor=cursor-window-2&sourceWindow=2`,
  );
  await returnLink.click();
  await expect(page).toHaveURL(
    `/proposals?portfolioId=${portfolioId}&selectedRecordId=PRP-RISK-003&cursor=cursor-window-2&sourceWindow=2`,
  );
  await expect(
    page.getByRole("option", { name: /Income allocation review/ }),
  ).toHaveAttribute("aria-selected", "true");
});

test("keeps proposal evaluation inside construction without persisted workflow authority", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(buildProposalBuilderUrl({ includeAdvisoryDate: false }), {
    waitUntil: "domcontentloaded",
  });

  const workflowRail = page.getByTestId("proposal-builder-workflow-rail");
  await expect(workflowRail).toBeVisible();
  await expect(workflowRail).toHaveAttribute(
    "data-workflow-admission",
    "blocked",
  );
  await expect(
    workflowRail.getByRole("heading", { name: "Review and retain" }),
  ).toBeVisible();
  await expect(
    workflowRail.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeDisabled();
  await expect(
    workflowRail.getByRole("button", { name: "Save Advisor Draft" }),
  ).toBeDisabled();
  await expect(
    page.getByText("No persisted advisory workflow record"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Simulation does not imply suitability review, approval, client consent, publication, or execution readiness.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Advisor Workflow" }),
  ).toHaveCount(0);
  await expect(page.getByText("KYC validity verified")).toHaveCount(0);
  await expect(page.getByText("Client Readiness")).toHaveCount(0);
  await expect(page.locator('a[href*="#simulation"]')).toHaveCount(0);
});

test("keeps proposal actions unavailable until failed portfolio evidence is refreshed", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { failFirstRead: true });
  await page.goto(buildProposalBuilderUrl(), {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute("data-evidence-status", "unavailable");
  await expect(
    page.getByText("Portfolio evidence is unavailable"),
  ).toBeVisible();
  await page.getByLabel("Additional Cash Assumption").fill("0");
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save Advisor Draft" }),
  ).toBeDisabled();

  await page
    .getByRole("button", { name: "Refresh Portfolio Evidence" })
    .click();

  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(page.getByText("Portfolio evidence confirmed")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Save Advisor Draft" }),
  ).toBeEnabled();
  const workflowRail = page.getByTestId("proposal-builder-workflow-rail");
  const blotterPanel = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Draft Order Blotter" }),
    })
    .first();
  for (const panel of [workflowRail, blotterPanel]) {
    await expect(panel).toBeVisible();
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }
  await testInfo.attach("proposal-evidence-recovery", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("keeps additional-cash validation and workflow admission aligned", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalBuilderEvaluation(page);
  await page.goto(buildProposalBuilderUrl(), {
    waitUntil: "domcontentloaded",
  });

  const cashInput = page.getByLabel("Additional Cash Assumption");
  const actionPanel = page.locator("section[data-scenario-cash-state]");
  const evaluateAction = page.getByRole("button", {
    name: "Evaluate Workspace",
  });
  const saveAction = page.getByRole("button", { name: "Save Advisor Draft" });

  await expect(actionPanel).toHaveAttribute(
    "data-scenario-cash-state",
    "positive",
  );
  await expect(actionPanel).toHaveAttribute("data-workflow-admission", "ready");
  await expect(evaluateAction).toBeEnabled();

  await cashInput.fill("-250");
  await cashInput.press("Tab");

  await expect(actionPanel).toHaveAttribute(
    "data-scenario-cash-state",
    "negative",
  );
  await expect(actionPanel).toHaveAttribute(
    "data-workflow-admission",
    "blocked",
  );
  await expect(cashInput).toHaveAttribute("aria-invalid", "true");
  await expect(
    page
      .getByText(
        "Additional cash assumption cannot be negative. Enter 0 or a positive amount.",
      )
      .last(),
  ).toBeVisible();
  await expect(evaluateAction).toBeDisabled();
  await expect(saveAction).toBeDisabled();
  await expect(page.getByTestId("proposal-draft-impact")).toHaveAttribute(
    "data-preview-blocked-by",
    "additional_cash",
  );
  await expect(
    page.getByText("Additional cash needs correction"),
  ).toBeVisible();
  await expect(
    page.getByTestId("proposal-draft-impact").getByText("Current Value"),
  ).toHaveCount(0);

  await cashInput.fill("1,000");
  await expect(actionPanel).toHaveAttribute(
    "data-scenario-cash-state",
    "not_numeric",
  );
  await expect(
    page
      .getByText(
        "Enter additional cash as a number without currency symbols or separators, or leave it blank.",
      )
      .last(),
  ).toBeVisible();

  await testInfo.attach("proposal-additional-cash-invalid", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await cashInput.fill("70368744177663.99");
  await expect(actionPanel).toHaveAttribute(
    "data-scenario-cash-state",
    "positive",
  );
  await expect(actionPanel).toHaveAttribute(
    "data-workflow-admission",
    "blocked",
  );
  await expect(page.getByTestId("proposal-draft-impact")).toHaveAttribute(
    "data-preview-blocked-by",
    "monetary_precision",
  );
  await expect(
    page.getByText("Draft amount exceeds the reliable preview range"),
  ).toBeVisible();

  await cashInput.fill("");
  await expect(actionPanel).toHaveAttribute(
    "data-scenario-cash-state",
    "empty",
  );
  await expect(cashInput).toHaveAttribute("aria-invalid", "false");
  await expect(evaluateAction).toBeEnabled();
  await expect(saveAction).toBeEnabled();

  const cashMovementCurrency = page.getByRole("textbox", {
    name: "Currency",
    exact: true,
  });
  await page.getByLabel("Amount").fill("1.0000000001");
  await cashMovementCurrency.fill("EUR");
  await expect(actionPanel).toHaveAttribute(
    "data-workflow-admission",
    "blocked",
  );
  await expect(
    page.getByText(
      "Use no more than 2 decimal places and remain within the reliable draft range.",
    ),
  ).toBeVisible();
  await expect(evaluateAction).toBeDisabled();
  await cashMovementCurrency.fill("USD");
  await page.getByLabel("Amount").fill("0");
  await expect(actionPanel).toHaveAttribute("data-workflow-admission", "ready");

  await cashInput.fill("0");
  await expect(actionPanel).toHaveAttribute("data-scenario-cash-state", "zero");
  await evaluateAction.click();

  await expect(
    page.getByRole("status", { name: "Proposal evaluation summary" }),
  ).toContainText("Advise Evaluation Summary");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await testInfo.attach("proposal-additional-cash-zero-narrow", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

for (const failure of [
  {
    status: 403 as const,
    businessCopy:
      "This proposal action is not available for your current access. No proposal change was recorded.",
  },
  {
    status: 404 as const,
    businessCopy:
      "The proposal workspace is no longer available. Return to the proposal worklist and reopen it.",
  },
]) {
  test(`keeps Proposal Builder ${failure.status} source evidence behind support details`, async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(60_000);
    await mockProposalBuilderEvaluation(page, { failureStatus: failure.status });
    await page.goto(buildProposalBuilderUrl(), { waitUntil: "domcontentloaded" });

    const rail = page.getByTestId("proposal-builder-workflow-rail");
    await rail.getByRole("button", { name: "Evaluate Workspace" }).click();

    await expect(rail.getByText(failure.businessCopy)).toBeVisible();
    await expect(page.getByText("INTERNAL_SOURCE_DETAIL")).toHaveCount(0);
    const supportDetails = rail.locator("details").filter({
      hasText: "Source request evidence",
    });
    await expect(
      supportDetails.getByText(`corr-proposal-builder-${failure.status}`),
    ).not.toBeVisible();

    await supportDetails.getByText("Support details").click();
    await expect(supportDetails.getByText(String(failure.status), { exact: true })).toBeVisible();
    await expect(
      supportDetails.getByText(`corr-proposal-builder-${failure.status}`),
    ).toBeVisible();
  });
}

test("uses the source-confirmed advisory date instead of stale route context", async ({
  page,
}) => {
  const requestedDates: string[] = [];
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { requestedDates });
  await page.goto(buildProposalBuilderUrl({ advisoryDate: "2026-04-11" }), {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(evidence).toHaveAttribute(
    "data-requested-as-of-date",
    advisoryAsOfDate,
  );
  await expect(evidence).toHaveAttribute(
    "data-effective-as-of-date",
    advisoryAsOfDate,
  );
  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  expect(requestedDates).toContain(advisoryAsOfDate);
  expect(requestedDates).not.toContain("2026-04-11");
  await expect(page.getByLabel("Advisory As-of Date")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeEnabled();
});

test("shows requested and source dates while blocking a mismatched source snapshot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { effectiveDate: "2026-04-09" });
  await page.goto(buildProposalBuilderUrl(), {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute(
    "data-evidence-status",
    "context_mismatch",
  );
  await expect(evidence).toHaveAttribute(
    "data-requested-as-of-date",
    "2026-04-10",
  );
  await expect(evidence).toHaveAttribute(
    "data-effective-as-of-date",
    "2026-04-09",
  );
  await expect(
    page.getByText("Portfolio context does not match"),
  ).toBeVisible();
  const positionsPanel = page.getByRole("region", {
    name: "Current Positions",
  });
  await expect(
    positionsPanel.getByText("1 position · different context"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy More" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sell Down" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save Advisor Draft" }),
  ).toBeDisabled();
});

test("keeps proposal decisions unavailable when source returns an impossible advisory date", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, {
    effectiveDate: "2026-04-31",
    sourceCurrencies: ["SGD"],
  });
  await page.goto(buildProposalBuilderUrl(), {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute("data-evidence-status", "unavailable");
  await expect(evidence).toHaveAttribute(
    "data-evidence-date-issue",
    "invalid_source_date",
  );
  await expect(evidence).toHaveAttribute(
    "data-effective-as-of-date",
    "2026-04-31",
  );
  await expect(evidence).toHaveAttribute("data-evidence-currency", "SGD");
  await expect(
    page.getByRole("heading", { name: "Portfolio evidence date is unavailable" }),
  ).toBeVisible();
  await expect(evidence.getByText("2026-04-31")).toBeVisible();
  await expect(
    page.getByText(
      "Evaluation and draft handoff remain unavailable until the portfolio source provides a valid date.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy More" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sell Down" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save Advisor Draft" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Refresh Portfolio Evidence" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("textbox", { name: "Currency", exact: true }),
  ).toHaveValue("USD");
  await expect(page.getByRole("textbox", { name: "Price Currency" })).toHaveValue("USD");
  await testInfo.attach("proposal-invalid-source-date", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("rejects an invalid carried advisory date before any portfolio read", async ({
  page,
}) => {
  const requestedDates: string[] = [];
  await mockProposalPortfolioEvidence(page, { requestedDates });
  await page.goto(
    buildProposalBuilderUrl({ advisoryDate: "2026-02-31", reportingCurrency: "USD" }),
    { waitUntil: "domcontentloaded" },
  );

  await expect(
    page.getByRole("heading", { name: "Review context needs attention" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The proposal address contains repeated or unsupported review context. No portfolio was substituted and no proposal draft was opened.",
    ),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(requestedDates).toEqual([]);
});

test("withholds mixed-currency impact until refreshed source evidence matches the proposal", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, {
    sourceCurrencies: ["SGD", "USD"],
  });
  await page.goto(buildProposalBuilderUrl({ reportingCurrency: "USD" }), {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  const impact = page.getByTestId("proposal-draft-impact");
  await expect(evidence).toHaveAttribute(
    "data-evidence-status",
    "context_mismatch",
  );
  await expect(impact).toHaveAttribute(
    "data-preview-currency-status",
    "mixed_currency",
  );
  await expect(impact).toHaveAttribute("data-requested-currency", "USD");
  await expect(impact).toHaveAttribute("data-source-currency", "SGD");
  await expect(
    impact.getByText("Currency-aligned impact is unavailable"),
  ).toBeVisible();
  await expect(impact.getByText("USD 23,000")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeDisabled();
  await testInfo.attach("proposal-mixed-currency-impact-withheld", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page
    .getByRole("button", { name: "Refresh Portfolio Evidence" })
    .click();

  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(impact).toHaveAttribute(
    "data-preview-currency-status",
    "available",
  );
  await expect(impact).toHaveAttribute("data-preview-currency", "USD");
  await expect(impact.getByText("USD 23,000").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeEnabled();
  await testInfo.attach("proposal-currency-impact-recovered", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("button", { name: "Buy More" }).click();
  await page.getByLabel("Quantity").last().fill("10");
  await page.getByLabel("Price Currency").last().fill("EUR");
  await expect(impact).toHaveAttribute(
    "data-preview-currency-status",
    "mixed_currency",
  );
  await expect(
    impact.getByText("Currency-aligned impact is unavailable"),
  ).toBeVisible();
  await expect(impact.getByText(/monetary evidence in EUR/)).toBeVisible();
});

test("withholds unlabelled source money until currency identity is refreshed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, {
    sourceCurrencies: [null, "USD"],
  });
  await page.goto(buildProposalBuilderUrl({ reportingCurrency: "USD" }), {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  const impact = page.getByTestId("proposal-draft-impact");
  const positions = page.getByRole("region", { name: "Current Positions" });
  await expect(impact).toHaveAttribute(
    "data-preview-currency-status",
    "unresolved",
  );
  await expect(evidence.getByText("Currency not confirmed")).toBeVisible();
  await expect(positions.getByText("Currency not confirmed")).toBeVisible();
  await expect(evidence.getByText("USD 4,000")).toHaveCount(0);
  await expect(positions.getByText("USD 19,000")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Evaluate Workspace" }),
  ).toBeDisabled();

  await page
    .getByRole("button", { name: "Refresh Portfolio Evidence" })
    .click();

  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(impact).toHaveAttribute(
    "data-preview-currency-status",
    "available",
  );
  await expect(evidence.getByText("USD 4,000")).toBeVisible();
  await expect(positions.getByText("USD 19,000")).toBeVisible();
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compressed-desktop", width: 1280, height: 900 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "zoom-200-equivalent", width: 720, height: 900 },
  { name: "narrow", width: 390, height: 844 },
]) {
  test(`evaluates inside Proposal Builder without a duplicate ${viewport.name} destination`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockProposalBuilderEvaluation(page);
    await page.goto(buildProposalBuilderUrl(), {
      waitUntil: "domcontentloaded",
    });

    const controlRail = page.getByTestId("proposal-builder-workflow-rail");
    const draftTitle = page.getByLabel("Advisory Draft Title");
    expect(
      await page.evaluate(() => {
        const input = document.querySelector('input[name="proposalTitle"]');
        const rail = document.querySelector(
          '[data-testid="proposal-builder-workflow-rail"]',
        );
        return Boolean(
          input &&
          rail &&
          (input.compareDocumentPosition(rail) &
            Node.DOCUMENT_POSITION_FOLLOWING) !==
            0,
        );
      }),
    ).toBe(true);
    await draftTitle.scrollIntoViewIfNeeded();
    const railContainer = controlRail.locator("..");
    if (viewport.width > 1200) {
      await expect(railContainer).toHaveCSS("position", "sticky");
      const railBox = await controlRail.boundingBox();
      expect(railBox?.y).toBeGreaterThanOrEqual(80);
      expect((railBox?.y ?? 0) + (railBox?.height ?? 0)).toBeLessThanOrEqual(
        viewport.height,
      );
    } else {
      await expect(railContainer).toHaveCSS("position", "static");
      const draftBox = await draftTitle.boundingBox();
      const railBox = await controlRail.boundingBox();
      expect(railBox?.y).toBeGreaterThan(draftBox?.y ?? 0);
    }

    await page.getByRole("button", { name: "Evaluate Workspace" }).click();

    await expect(
      page.getByRole("status", { name: "Proposal evaluation summary" }),
    ).toContainText("Advise Evaluation Summary");
    await expect(
      page.getByRole("status", { name: "Proposal evaluation status" }),
    ).toContainText("Evaluation confirmed");
    await expect(
      page.getByRole("status", { name: "Proposal evaluation status" }),
    ).toContainText("Source reference aws_browser_001");
    const orderBlotter = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Draft Order Blotter" }),
      })
      .first();
    expect(
      await orderBlotter.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await expect(page.locator('a[href*="#simulation"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await testInfo.attach(`proposal-builder-${viewport.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await page.getByLabel("Additional Cash Assumption").fill("12500");
    await expect(
      page.getByRole("status", { name: "Proposal evaluation status" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("status", { name: "Proposal evaluation summary" }),
    ).toHaveCount(0);
  });
}
