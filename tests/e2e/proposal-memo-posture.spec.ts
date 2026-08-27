import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { collectHorizontalOverflow } from "./support/horizontal-overflow";

const narrativeEvidenceDirectory = process.env.ISSUE_798_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_798_EVIDENCE_DIR, "narrative-review")
  : null;
const memoEvidenceDirectory = process.env.ISSUE_798_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_798_EVIDENCE_DIR, "memo-evidence-pack")
  : null;
const memoRecoveryEvidenceDirectory = process.env.ISSUE_877_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_877_EVIDENCE_DIR)
  : null;

type ProposalMockOptions = {
  actionFailure?: boolean;
  blocked?: boolean;
  memoCreateFailure?: boolean;
  memoInitialState?: "not-prepared" | "unreviewed" | "reviewed" | "complete";
  memoCommentaryInitiallyRecorded?: boolean;
  memoCommentaryRefreshMismatch?: boolean;
  memoNestedIdentityMismatch?: boolean;
  memoReviewFailure?: boolean;
  memoReviewRefreshMismatch?: boolean;
  memoSourceVersionNo?: number;
  narrativeReviewFailure?: boolean;
  narrativeInitialRefreshMismatch?: boolean;
  workflowFailure?: boolean;
};

async function mockProposalDetail(
  page: import("@playwright/test").Page,
  options: ProposalMockOptions = {},
) {
  let sourceState = "DRAFT";
  let narrativeReviewState = "NOT_REVIEWED";
  let narrativeHash: string | null = null;
  let narrativeReviewedBy: string | null = null;
  let narrativeReviewedAt: string | null = null;
  let narrativeConfirmationReadCount = 0;
  let discussionPackRequested = false;
  const memoHash = "sha256:memo-001";
  const memoReportEventId = "memo-report-event-001";
  const memoReviewEventId = "memo-review-event-001";
  const initialMemoState = options.memoInitialState ?? "complete";
  const memoSourceVersionNo = options.memoSourceVersionNo ?? 2;
  let memoCreated = initialMemoState !== "not-prepared";
  let memoReviewed = initialMemoState === "reviewed" || initialMemoState === "complete";
  let memoReviewRequestCount = 0;
  let memoReportRecorded = initialMemoState === "complete";
  let memoCommentaryRecorded = options.memoCommentaryInitiallyRecorded ?? false;
  let memoCommentaryEventId = memoCommentaryRecorded
    ? "memo-ai-event-prior"
    : null;
  await page.route("**/api/bff/api/v1/proposals/pp_1?include_evidence=false", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-detail",
        contract_version: "v1",
        data: {
          proposal: {
            proposal_id: "pp_1",
            current_state: sourceState,
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
    if (options.workflowFailure) {
      await route.fulfill({ status: 503, body: "WORKFLOW_SOURCE_UNAVAILABLE" });
      return;
    }
    await route.fulfill({
      json: {
        correlation_id: "corr-workflow",
        contract_version: "v1",
        data: {
          proposal_id: "pp_1",
          current_state: sourceState,
          events: sourceState === "DRAFT"
            ? []
            : [{
                event_id: "event-risk-review",
                event_type: "SUBMITTED_FOR_REVIEW",
                from_state: "DRAFT",
                to_state: sourceState,
                actor_id: "advisor_1",
                occurred_at: "2026-05-24T10:01:00Z",
              }],
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/approvals", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-approvals",
        contract_version: "v1",
        data: { proposal_id: "pp_1", current_state: sourceState, approvals: [] },
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
      json: {
        correlation_id: "corr-delivery",
        contract_version: "v1",
        data: {
          proposal: {
            proposal_id: "pp_1",
            current_state: sourceState,
            current_version_no: 2,
          },
          reporting: {
            report_request_id: discussionPackRequested ? "report-001" : undefined,
            report_type: "PORTFOLIO_REVIEW",
            related_version_no: 2,
            status: discussionPackRequested ? "ACCEPTED" : "NO_REPORT",
            report_reference_id: discussionPackRequested ? "report-document-001" : undefined,
            generated_at: discussionPackRequested ? "2026-05-24T10:02:00Z" : undefined,
            include_reviewed_narrative: discussionPackRequested,
            proposal_narrative_package: {
              proposal_version_no: 2,
              review_state: narrativeReviewState,
              package_status: discussionPackRequested
                ? "INCLUDED_REVIEWED_NARRATIVE"
                : "NOT_REQUESTED",
              ...(narrativeHash ? { source_narrative_hash: narrativeHash } : {}),
            },
          },
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/delivery-events", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-events",
        contract_version: "v1",
        data: discussionPackRequested
          ? {
              proposal: {
                proposal_id: "pp_1",
                current_state: sourceState,
                current_version_no: 2,
              },
              event_count: 1,
              latest_event: {
                event_id: "delivery-event-001",
                proposal_id: "pp_1",
                related_version_no: 2,
                event_type: "REPORT_REQUESTED",
                occurred_at: "2026-05-24T10:02:00Z",
                reason: { report_request_id: "report-001" },
              },
              events: [
                {
                  event_id: "delivery-event-001",
                  proposal_id: "pp_1",
                  related_version_no: 2,
                  event_type: "REPORT_REQUESTED",
                  occurred_at: "2026-05-24T10:02:00Z",
                  reason: { report_request_id: "report-001" },
                },
              ],
            }
          : {
              proposal: {
                proposal_id: "pp_1",
                current_state: sourceState,
                current_version_no: 2,
              },
              event_count: 0,
              events: [],
            },
      },
    });
  });
  await page.route(
    "**/api/bff/api/v1/proposals/pp_1/versions/2/narrative/review",
    async (route) => {
      if (options.narrativeReviewFailure) {
        await route.fulfill({ status: 500, body: "INTERNAL_NARRATIVE_FAILURE" });
        return;
      }
      narrativeReviewState = "APPROVED_FOR_ADVISOR_USE";
      narrativeHash = "sha256:narrative-001";
      narrativeReviewedBy = "advisor_1";
      narrativeReviewedAt = "2026-05-24T10:01:30Z";
      await route.fulfill({
        json: {
          correlation_id: "corr-narrative-review",
          contract_version: "v1",
          data: {
            policy_version: "proposal-narrative-deterministic.v1",
            narrative_review: narrativeReviewRecord({
              sourceNarrativeHash: "sha256:narrative-001",
            }),
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/pp_1/versions/2/narrative",
    async (route) => {
      const confirmationRead = narrativeReviewState === "APPROVED_FOR_ADVISOR_USE";
      const sourceNarrativeHash =
        options.narrativeInitialRefreshMismatch &&
        confirmationRead &&
        narrativeConfirmationReadCount === 0
          ? "sha256:mismatched-narrative"
          : narrativeHash;
      if (confirmationRead) {
        narrativeConfirmationReadCount += 1;
      }
      await route.fulfill({
        json: {
          correlation_id: "corr-narrative",
          contract_version: "v1",
          data: {
            policy_version: "proposal-narrative-deterministic.v1",
            narrative_review: narrativeReviewRecord({ sourceNarrativeHash }),
          },
        },
      });
    },
  );
  await page.route("**/api/bff/api/v1/proposals/pp_1/report-requests", async (route) => {
    if (!narrativeHash || narrativeReviewState !== "APPROVED_FOR_ADVISOR_USE") {
      await route.fulfill({ status: 409, body: "NARRATIVE_REVIEW_REQUIRED" });
      return;
    }
    discussionPackRequested = true;
    await route.fulfill({
      json: {
        correlation_id: "corr-report-request",
        contract_version: "v1",
        data: {
          report_request_id: "report-001",
          report_type: "PORTFOLIO_REVIEW",
          status: "ACCEPTED",
          report_reference_id: "report-document-001",
          generated_at: "2026-05-24T10:02:00Z",
          explanation: {
            related_version_no: 2,
            include_reviewed_narrative: true,
            proposal_narrative_package: {
              package_status: "INCLUDED_REVIEWED_NARRATIVE",
              source_narrative_hash: narrativeHash,
            },
          },
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/versions/2/memo", async (route) => {
    if (route.request().method() === "POST") {
      if (options.memoCreateFailure) {
        await route.fulfill({ status: 500, body: "INTERNAL_MEMO_CREATE_FAILURE" });
        return;
      }
      memoCreated = true;
      await route.fulfill({
        json: { correlation_id: "corr-memo-create", contract_version: "v1", data: memoResponse() },
      });
      return;
    }
    if (options.blocked && route.request().method() === "GET") {
      await route.fulfill({ status: 409, body: "MEMO_BLOCKED_BY_SOURCE_EVIDENCE" });
      return;
    }
    if (!memoCreated) {
      await route.fulfill({ status: 404, body: "MEMO_NOT_FOUND" });
      return;
    }
    await route.fulfill({
      json: {
        correlation_id: "corr-memo",
        contract_version: "v1",
        data: memoResponse(),
      },
    });
  });
  await page.route(
    "**/api/bff/api/v1/proposals/pp_1/versions/2/memo/review",
    async (route) => {
      memoReviewRequestCount += 1;
      if (options.memoReviewFailure) {
        await route.fulfill({ status: 500, body: "INTERNAL_MEMO_REVIEW_FAILURE" });
        return;
      }
      if (!options.memoReviewRefreshMismatch) memoReviewed = true;
      await route.fulfill({
        json: {
          correlation_id: "corr-memo-review",
          contract_version: "v1",
          data: {
            memo: { ...memoResponse(), review_posture: recordedReviewPosture() },
            review_event: memoActionEvent(
              memoReviewEventId,
              "MEMO_REVIEW_RECORDED",
            ),
            replayed: false,
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/pp_1/versions/2/memo/report-packages",
    async (route) => {
      memoReportRecorded = true;
      await route.fulfill({
        json: {
          correlation_id: "corr-memo-report",
          contract_version: "v1",
          data: {
            memo: memoResponse(),
            report_package_event: memoActionEvent(
              memoReportEventId,
              "MEMO_REPORT_PACKAGE_RECORDED",
            ),
            report: { status: "ARCHIVED" },
            replayed: false,
          },
        },
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals/pp_1/versions/2/memo/ai-commentary",
    async (route) => {
      memoCommentaryRecorded = true;
      const actionEventId = "memo-ai-event-current";
      if (!options.memoCommentaryRefreshMismatch) {
        memoCommentaryEventId = actionEventId;
      }
      await route.fulfill({
        json: {
          correlation_id: "corr-memo-commentary",
          contract_version: "v1",
          data: {
            memo: memoResponse(),
            ai_event: memoActionEvent(
              actionEventId,
              "MEMO_AI_REFERENCE_RECORDED",
            ),
            commentary: { status: "REVIEW_REQUIRED", authoritative_for_memo_status: false },
            replayed: false,
          },
        },
      });
    },
  );
  await page.route("**/api/bff/api/v1/proposals/pp_1/versions/2/memo/projection**", async (route) => {
    if (!memoCreated) {
      await route.fulfill({ status: 404, body: "MEMO_NOT_FOUND" });
      return;
    }
    const requestUrl = new URL(route.request().url());
    const audience = requestUrl.searchParams.get("audience") ?? "ADVISOR";
    await route.fulfill({
      json: {
        correlation_id: "corr-projection",
        contract_version: "v1",
        data: {
          proposal: {
            proposal_id: "pp_1",
            current_state: sourceState,
            current_version_no: memoSourceVersionNo,
          },
          proposal_version_no: memoSourceVersionNo,
          memo_id: "memo_1",
          memo_hash: "sha256:memo-001",
          audience,
          projection: { client_ready_publication: "BLOCKED" },
          sections: [
            { section_id: "SUMMARY", audience_visibility: [audience] },
            { section_id: "DISCLOSURES", audience_visibility: [audience] },
          ],
          projection_posture: { client_ready_publication: "BLOCKED" },
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
          proposal_id: "pp_1",
          proposal: {
            proposal_id: "pp_1",
            current_state: sourceState,
            current_version_no: memoSourceVersionNo,
          },
          memo_count: memoCreated ? 1 : 0,
          latest_memo_id: memoCreated ? "memo_1" : null,
          lineage_complete: true,
          memos: memoCreated ? [{
            memo_id: "memo_1",
            proposal_version_no: memoSourceVersionNo,
            memo_hash: "sha256:memo-001",
            memo_status: "READY",
            event_count: 1 + Number(memoReviewed) + Number(memoReportRecorded) + Number(memoCommentaryRecorded),
            report_package_posture: reportPosture(),
            ai_commentary_posture: commentaryPosture(),
            archive_refs: memoReportRecorded ? [{ document_id: "doc_memo_001" }] : [],
          }] : [],
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/versions/2/memo/replay-evidence", async (route) => {
    if (!memoCreated) {
      await route.fulfill({ status: 404, body: "MEMO_NOT_FOUND" });
      return;
    }
    await route.fulfill({
      json: {
        correlation_id: "corr-replay",
        contract_version: "v1",
        data: {
          subject: {
            proposal_id: "pp_1",
            memo_id: "memo_1",
            proposal_version_no: memoSourceVersionNo,
          },
          hashes: { memo_hash: "sha256:memo-001" },
          audit_events: [
            { event_type: "MEMO_DRAFT_CREATED" },
            ...(memoReviewed
              ? [memoActionEvent(memoReviewEventId, "MEMO_REVIEW_RECORDED")]
              : []),
            ...(memoReportRecorded
              ? [
                  memoActionEvent(
                    memoReportEventId,
                    "MEMO_REPORT_PACKAGE_RECORDED",
                  ),
                ]
              : []),
            ...(memoCommentaryEventId
              ? [
                  memoActionEvent(
                    memoCommentaryEventId,
                    "MEMO_AI_REFERENCE_RECORDED",
                  ),
                ]
              : []),
          ],
          explanation: { client_ready_publication: "BLOCKED" },
        },
      },
    });
  });
  await page.route("**/api/bff/api/v1/proposals/pp_1/submit", async (route) => {
    if (options.actionFailure) {
      await route.fulfill({ status: 500, body: "INTERNAL_SOURCE_DETAIL" });
      return;
    }
    sourceState = "RISK_REVIEW";
    await route.fulfill({
      json: {
        correlation_id: "corr-submit",
        contract_version: "v1",
        data: { current_state: sourceState },
      },
    });
  });

  function recordedReviewPosture() {
    return {
      status: "RECORDED",
      review_action: "APPROVE_FOR_ADVISOR_USE",
      source_memo_hash: "sha256:memo-001",
    };
  }
  function memoActionEvent(eventId: string, eventType: string) {
    return {
      event_id: eventId,
      event_type: eventType,
      reason: { source_memo_hash: memoHash },
    };
  }
  function narrativeReviewRecord({
    sourceNarrativeHash = narrativeHash,
  }: { sourceNarrativeHash?: string | null } = {}) {
    return {
      ...(narrativeReviewState === "APPROVED_FOR_ADVISOR_USE"
        ? {
            review_id: "narrative-review-001",
            action: "APPROVE",
            reviewed_by: narrativeReviewedBy,
            reviewed_at: narrativeReviewedAt,
          }
        : {}),
      proposal_id: "pp_1",
      proposal_version_no: 2,
      narrative_id: "narrative-001",
      review_state: narrativeReviewState,
      source_narrative_hash: sourceNarrativeHash,
      client_ready_status: "NOT_REQUESTED",
    };
  }
  function reportPosture() {
    return memoReportRecorded
      ? { status: "RECORDED", report_status: "ARCHIVED", source_memo_hash: "sha256:memo-001" }
      : { status: "NOT_RECORDED" };
  }
  function commentaryPosture() {
    return memoCommentaryRecorded
      ? {
          status: "RECORDED",
          ai_status: "REVIEW_REQUIRED",
          source_memo_hash: "sha256:memo-001",
          authoritative_for_memo_status: false,
        }
      : { status: "NOT_RECORDED" };
  }
  function memoResponse() {
    return {
      proposal: {
        proposal_id: "pp_1",
        current_state: sourceState,
        current_version_no: memoSourceVersionNo,
      },
      proposal_version_no: memoSourceVersionNo,
      memo_id: "memo_1",
      memo_status: "READY",
      memo_hash: memoHash,
      memo: {
        memo_hash: options.memoNestedIdentityMismatch
          ? "sha256:stale-pack"
          : memoHash,
        memo_id: options.memoNestedIdentityMismatch ? "memo_stale" : "memo_1",
        proposal_id: "pp_1",
        proposal_version_no: memoSourceVersionNo,
      },
      event_count: 1 + Number(memoReviewed) + Number(memoReportRecorded) + Number(memoCommentaryRecorded),
      review_posture: memoReviewed ? recordedReviewPosture() : { status: "NOT_RECORDED" },
      report_package_posture: reportPosture(),
      ai_commentary_posture: commentaryPosture(),
      audit_events: [
        ...(memoReviewed
          ? [memoActionEvent(memoReviewEventId, "MEMO_REVIEW_RECORDED")]
          : []),
        ...(memoReportRecorded
          ? [
              memoActionEvent(
                memoReportEventId,
                "MEMO_REPORT_PACKAGE_RECORDED",
              ),
            ]
          : []),
        ...(memoCommentaryEventId
          ? [
              memoActionEvent(
                memoCommentaryEventId,
                "MEMO_AI_REFERENCE_RECORDED",
              ),
            ]
          : []),
      ],
    };
  }

  return {
    confirmMemoReview() {
      memoReviewed = true;
    },
    getMemoReviewRequestCount() {
      return memoReviewRequestCount;
    },
  };
}

test.describe("proposal memo posture", () => {
  test("starts the memo workflow from source-confirmed absence", async ({ page }) => {
    await mockProposalDetail(page, { memoInitialState: "not-prepared" });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();

    await expect(page.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "not-prepared",
    );
    await expect(page.getByText("Memo not prepared").first()).toBeVisible();
    await expect(page.getByText(/Current memo evidence is unavailable/)).toHaveCount(0);
    await page.getByText("Memo record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Advisor or reviewer reference" }).fill("advisor_9");
    await page.getByRole("button", { name: "Prepare advisor memo" }).click();

    await expect(
      page.getByText("Advisor memo confirmed for proposal version 2."),
    ).toBeVisible();
    await expect(page.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "ready",
    );
    await expect(page.getByRole("button", { name: "Record advisor review" })).toBeVisible();
  });

  test("keeps failed preparation explicit without fabricating a memo", async ({ page }) => {
    await mockProposalDetail(page, {
      memoCreateFailure: true,
      memoInitialState: "not-prepared",
    });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();
    await page.getByText("Memo record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Advisor or reviewer reference" }).fill("advisor_9");
    await page.getByRole("button", { name: "Prepare advisor memo" }).click();

    await expect(page.getByText(/The advisor memo was not prepared/)).toBeVisible();
    await expect(page.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "not-prepared",
    );
    await expect(page.getByRole("button", { name: "Prepare advisor memo" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Record advisor review" })).toHaveCount(0);
  });

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
    await expect(page.getByRole("heading", { name: "Advisor memo and evidence pack" })).toBeVisible();
    await expect(page.getByText("Approved for advisor use").first()).toBeVisible();
    await expect(page.getByText("Review the evidence record")).toBeVisible();
    await expect(page.getByText("Available in the record")).toBeVisible();
    await expect(page.getByText("Evidence aligned")).toBeVisible();
    await expect(page.getByText("1 archived item").first()).toBeVisible();
    await expect(page.getByText("APPROVED_FOR_ADVISOR_USE")).toHaveCount(0);
    await expect(page.getByText("SUPPORTED_ADVISOR_USE")).toHaveCount(0);
    await expect(page.getByText(/archive:\/\//)).toHaveCount(0);

    await page.getByText("Memo record details", { exact: true }).click();
    await page.getByRole("combobox", { name: "Audience view" }).selectOption("COMPLIANCE");
    await expect(page.getByText("Compliance review").first()).toBeVisible();
    await page.getByRole("combobox", { name: "Audience view" }).selectOption("OPERATIONS");
    await expect(page.getByText("Operations handoff").first()).toBeVisible();
    await page.getByRole("combobox", { name: "Audience view" }).selectOption("CLIENT_DRAFT");
    await expect(page.getByText("Client discussion draft").first()).toBeVisible();
    await expect(page.getByText("CLIENT_DRAFT")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send to client/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /client-ready release/i })).toHaveCount(0);
  });

  test("renders degraded and blocked memo posture from source responses", async ({ page }) => {
    await mockProposalDetail(page, { blocked: true });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();

    await expect(
      page.getByText(/Current memo evidence is unavailable/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh record" })).toBeVisible();
    await expect(page.getByText("Review required").first()).toBeVisible();
    await expect(page.getByText("DEGRADED_SOURCE_EVIDENCE")).toHaveCount(0);
    await expect(page.getByText("MEMO_BLOCKED_BY_SOURCE_EVIDENCE")).toHaveCount(0);
    await expect(page.getByText(/ready for client/i)).toHaveCount(0);
  });

  test("does not authorize current-version actions from coherent stale-version evidence", async ({
    page,
  }) => {
    await mockProposalDetail(page, { memoSourceVersionNo: 1 });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();

    await expect(page.getByRole("heading", { name: "Refresh the memo evidence" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Prepare advisor memo" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Request discussion material" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /advisor commentary/i }),
    ).toHaveCount(0);
    await expect(page.getByText("Evidence aligned")).toHaveCount(0);
  });

  test("does not authorize actions when the nested memo pack conflicts with its outer record", async ({
    page,
  }) => {
    await mockProposalDetail(page, { memoNestedIdentityMismatch: true });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();

    await expect(page.getByRole("heading", { name: "Refresh the memo evidence" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Prepare advisor memo" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Request discussion material" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /advisor commentary/i }),
    ).toHaveCount(0);
    await expect(page.getByText("Evidence aligned")).toHaveCount(0);
  });

  test("records memo review before requesting discussion material", async ({ page }) => {
    await mockProposalDetail(page, { memoInitialState: "unreviewed" });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();
    await expect(page.getByRole("heading", { name: "Record advisor review" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request discussion material" })).toHaveCount(0);
    await page.getByText("Memo record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Advisor or reviewer reference" }).fill("advisor_9");
    await page.getByRole("textbox", { name: "Advisor review rationale" }).fill(
      "The retained evidence is appropriate for use in the advisor-led discussion.",
    );
    await page.getByRole("button", { name: "Record advisor review" }).click();

    await expect(page.getByTestId("proposal-memo-action-status")).toContainText(
      "Advisor review confirmed for proposal version 2.",
    );
    const discussionMaterial = page.getByRole("button", { name: "Request discussion material" });
    await expect(discussionMaterial).toBeEnabled();
    await discussionMaterial.click();
    await expect(page.getByTestId("proposal-memo-action-status")).toContainText(
      "Discussion material confirmed for proposal version 2.",
    );
    await expect(page.getByRole("heading", { name: "Review the evidence record" })).toBeVisible();
    await expect(page.getByText("1 archived item").first()).toBeVisible();
  });

  test("does not claim memo success when persistence or refreshed proof fails", async ({ page }) => {
    await mockProposalDetail(page, { memoInitialState: "unreviewed", memoReviewFailure: true });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();
    await page.getByText("Memo record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Advisor or reviewer reference" }).fill("advisor_9");
    await page.getByRole("textbox", { name: "Advisor review rationale" }).fill(
      "Evidence supports advisor use.",
    );
    await page.getByRole("button", { name: "Record advisor review" }).click();
    await expect(page.getByText(
      "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
    )).toBeVisible();
    await expect(page.getByText("INTERNAL_MEMO_REVIEW_FAILURE")).toHaveCount(0);
    await expect(page.getByTestId("proposal-memo-action-status")).toHaveCount(0);

    await page.unrouteAll({ behavior: "wait" });
    const memoControls = await mockProposalDetail(page, {
      memoInitialState: "unreviewed",
      memoReviewRefreshMismatch: true,
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();
    await page.getByText("Memo record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Advisor or reviewer reference" }).fill("advisor_9");
    await page.getByRole("textbox", { name: "Advisor review rationale" }).fill(
      "Evidence supports advisor use.",
    );
    await page.getByRole("button", { name: "Record advisor review" }).click();
    await expect(page.getByText(
      "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
    )).toBeVisible();
    await expect(page.getByTestId("proposal-memo-action-status")).toHaveCount(0);
    const recovery = page.getByTestId("proposal-memo-confirmation-recovery");
    await expect(recovery).toHaveAttribute(
      "data-confirmation-state",
      "awaiting-source",
    );
    await expect(
      page.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
    expect(memoControls.getMemoReviewRequestCount()).toBe(1);
    if (memoRecoveryEvidenceDirectory) {
      await mkdir(memoRecoveryEvidenceDirectory, { recursive: true });
      await recovery.screenshot({
        path: path.join(
          memoRecoveryEvidenceDirectory,
          "proposal-memo-awaiting-confirmation.png",
        ),
      });
    }

    memoControls.confirmMemoReview();
    const refreshRecord = page.getByRole("button", { name: "Refresh record" });
    await refreshRecord.focus();
    await expect(refreshRecord).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("proposal-memo-action-status")).toContainText(
      "Advisor review confirmed for proposal version 2.",
    );
    await expect(recovery).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Request discussion material" }),
    ).toBeEnabled();
    expect(memoControls.getMemoReviewRequestCount()).toBe(1);
  });

  test("keeps the proposal decision usable when workflow evidence is unavailable", async ({ page }) => {
    await mockProposalDetail(page, { workflowFailure: true });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: "Proposal pp_1" })).toBeVisible();
    await expect(page.getByText("Proposed changes")).toBeVisible();
    await expect(page.getByText("Review evidence partially available")).toBeVisible();
    await expect(page.getByText(/Workflow history could not be refreshed/)).toBeVisible();
  });

  test("confirms an action only after refreshed source posture is coherent", async ({ page }) => {
    await mockProposalDetail(page);
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Submit for risk review" }).click();

    const status = page.getByTestId("proposal-action-status");
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toContainText("Proposal submitted for risk review.");
    await expect(status).toContainText("Risk team review is currently pending.");
    await expect(page.getByRole("button", { name: "Approve risk review" })).toBeVisible();
  });

  test("keeps source action failure explicit without exposing internal response text", async ({ page }) => {
    await mockProposalDetail(page, { actionFailure: true });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Submit for risk review" }).click();

    await expect(
      page.getByText("The proposal action could not be completed. Review the current posture and try again."),
    ).toBeVisible();
    await expect(page.getByText("INTERNAL_SOURCE_DETAIL")).toHaveCount(0);
    await expect(page.getByTestId("proposal-action-status")).toHaveCount(0);
  });

  test("confirms narrative review before admitting the discussion-pack request", async ({ page }) => {
    await mockProposalDetail(page);
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

    const requestButton = page.getByRole("button", { name: "Request discussion pack" });
    await expect(requestButton).toBeDisabled();
    await page.getByText("Review record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Reviewer reference" }).fill("advisor_1");
    await page
      .getByRole("textbox", { name: "Advisor review rationale" })
      .fill("The recommendation is appropriate for advisor use and supported by the proposal evidence.");
    await page.getByRole("button", { name: "Record advisor review" }).click();

    await expect(page.getByTestId("proposal-narrative-action-status")).toContainText(
      "Advisor review confirmed for proposal version 2.",
    );
    await expect(requestButton).toBeEnabled();
    await requestButton.click();
    await expect(page.getByTestId("proposal-narrative-action-status")).toContainText(
      "Discussion-pack request confirmed for proposal version 2.",
    );
    await expect(page.getByRole("heading", { name: "Review the latest delivery activity" })).toBeVisible();
  });

  test("does not claim narrative success when source persistence or refresh proof fails", async ({ page }) => {
    await mockProposalDetail(page, { narrativeReviewFailure: true });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByText("Review record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Reviewer reference" }).fill("advisor_1");
    await page
      .getByRole("textbox", { name: "Advisor review rationale" })
      .fill("Evidence supports advisor use.");
    await page.getByRole("button", { name: "Record advisor review" }).click();

    await expect(
      page.getByText(
        "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
      ),
    ).toBeVisible();
    await expect(page.getByText("INTERNAL_NARRATIVE_FAILURE")).toHaveCount(0);
    await expect(page.getByTestId("proposal-narrative-action-status")).toHaveCount(0);

    await page.unrouteAll({ behavior: "wait" });
    await mockProposalDetail(page, { narrativeInitialRefreshMismatch: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("Review record details", { exact: true }).click();
    await page.getByRole("textbox", { name: "Reviewer reference" }).fill("advisor_1");
    await page
      .getByRole("textbox", { name: "Advisor review rationale" })
      .fill("Evidence supports advisor use.");
    await page.getByRole("button", { name: "Record advisor review" }).click();

    await expect(
      page.getByText(
        "The review was submitted, but current proposal evidence could not confirm it. Refresh before taking another action.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("proposal-narrative-action-status")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Record advisor review" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Request discussion pack" })).toBeDisabled();

    await page.getByRole("button", { name: "Refresh record" }).click();

    await expect(page.getByTestId("proposal-narrative-action-status")).toContainText(
      "Advisor review confirmed for proposal version 2.",
    );
    await expect(page.getByRole("button", { name: "Refresh record" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request discussion pack" })).toBeEnabled();
  });

  test("does not confirm repeated commentary from a prior audit event", async ({
    page,
  }) => {
    await mockProposalDetail(page, {
      memoCommentaryInitiallyRecorded: true,
      memoCommentaryRefreshMismatch: true,
    });
    await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Memo & evidence pack" }).click();
    await page.getByText("Memo record details", { exact: true }).click();
    await page
      .getByRole("textbox", { name: "Advisor or reviewer reference" })
      .fill("advisor_1");

    await page
      .getByRole("button", { name: "Refresh advisor commentary" })
      .click();

    await expect(
      page.getByText(
        "The commentary request was submitted, but the current memo record could not confirm it. Refresh before retrying.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("proposal-memo-action-status")).toHaveCount(0);
  });

  test("keeps proposal decisions, review modes, and actions usable across supported widths", async ({
    page,
  }) => {
    await mockProposalDetail(page);
    if (narrativeEvidenceDirectory && memoEvidenceDirectory) {
      await Promise.all([
        mkdir(narrativeEvidenceDirectory, { recursive: true }),
        mkdir(memoEvidenceDirectory, { recursive: true }),
      ]);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "tablet", width: 768, height: 1024 },
      // 640 CSS pixels is the reflow equivalent of a 1280-pixel browser viewport at 200% zoom.
      { name: "zoom-200", width: 640, height: 900 },
      { name: "compact", width: 519, height: 900 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/proposals/pp_1", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { level: 1, name: "Proposal pp_1" })).toBeVisible();
      await expect(page.getByLabel("Proposal decision summary")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Narrative review and discussion pack" }),
      ).toBeVisible();
      await expect(page.getByRole("tab", { name: "Narrative review" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBeTruthy();

      const narrativeTab = page.getByRole("tab", { name: "Narrative review" });
      await narrativeTab.focus();
      await narrativeTab.press("ArrowRight");
      const memoTab = page.getByRole("tab", { name: "Memo & evidence pack" });
      await expect(memoTab).toBeFocused();
      await expect(memoTab).toHaveAttribute("aria-selected", "true");
      await memoTab.press("ArrowLeft");
      await expect(narrativeTab).toBeFocused();
      await expect(narrativeTab).toHaveAttribute("aria-selected", "true");
      if (
        narrativeEvidenceDirectory &&
        memoEvidenceDirectory &&
        ["desktop", "compact"].includes(viewport.name)
      ) {
        // Keyboard checks intentionally move focus into the lower review workspace. Reset the
        // document before a full-page capture so the sticky shell is recorded at its true top
        // position rather than composited over evidence that Playwright scrolled into view.
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
        await expect(page.getByRole("heading", { level: 1, name: "Proposal pp_1" })).toBeInViewport();
        await page.screenshot({
          path: path.join(narrativeEvidenceDirectory, `narrative-review-${viewport.name}.png`),
          fullPage: true,
        });
        await memoTab.click();
        await expect(page.getByRole("heading", { name: "Advisor memo and evidence pack" })).toBeVisible();
        expect(await collectHorizontalOverflow(page.locator("main"))).toEqual([]);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
        await page.screenshot({
          path: path.join(memoEvidenceDirectory, `memo-evidence-${viewport.name}.png`),
          fullPage: true,
        });
      }

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

      expect(await collectHorizontalOverflow(page.locator("main"))).toEqual([]);
    }
  });
});
