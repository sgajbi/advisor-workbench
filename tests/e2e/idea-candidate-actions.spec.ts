import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const candidateId = "idea_high_cash_001";
const candidateEvidenceIdentity = {
  evidencePacketId: "evidence_high_cash_001",
  evidenceContentHash: "sha256:evidence-high-cash-001",
  sourceRevisionVectorDigest: "sha256:revision-high-cash-001",
};
const explanationEvidenceDirectory = process.env.ISSUE_996_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_996_EVIDENCE_DIR)
  : null;
const notUsefulFeedbackReasons = [
  "not_relevant",
  "already_known",
  "wrong_timing",
  "insufficient_evidence",
  "wrong_priority",
  "duplicate",
  "client_specific_constraint",
] as const;

async function mockIdeaCandidateActions(page: import("@playwright/test").Page) {
  await page.route(
    "**/api/bff/api/v1/ideas/review-queues/advisor**",
    async (route) => {
      await route.fulfill({
        json: {
          data: {
            policyVersion: "idea-deterministic-ranking-v1",
            evaluatedAtUtc: "2026-07-17T08:00:00Z",
            durableStorageBacked: true,
            supportedFeaturePromoted: false,
            exclusions: [],
            items: [
              {
                rank: 1,
                score: "82",
                priorityBucket: "high",
                reasonCodes: ["high_cash_ratio", "review_required"],
                candidate: {
                  candidateId,
                  family: "high_cash",
                  reviewPosture: "advisor_review_required",
                  score: "82",
                  sourceSignalIds: ["signal_high_cash_001"],
                },
              },
            ],
          },
        },
      });
    },
  );
  await page.route(
    `**/api/bff/api/v1/ideas/candidates/${candidateId}`,
    async (route) => {
      await route.fulfill({
        json: {
          data: {
            candidate: {
              candidateId,
              family: "high_cash",
              lifecycleStatus: "generated",
              reviewPosture: "advisor_review_required",
            },
            evidence: {
              ...candidateEvidenceIdentity,
              supportability: "ready",
              sourceRefs: [{ productId: "idea-source-001" }],
            },
            auditSummary: { eventCount: 1 },
            durableStorageBacked: true,
            supportedFeaturePromoted: false,
          },
        },
      });
    },
  );
}

test("records a source-owned Idea review without creating a proposal", async ({
  page,
}) => {
  await mockIdeaCandidateActions(page);
  let recordedRequest:
    { headers: Record<string, string>; body: unknown } | undefined;
  await page.route(
    `**/api/bff/api/v1/ideas/candidates/${candidateId}/review-actions`,
    async (route) => {
      recordedRequest = {
        headers: route.request().headers(),
        body: route.request().postDataJSON(),
      };
      await route.fulfill({
        json: {
          data: {
            persistence: {
              decision: "accepted",
              reviewPosture: "conversion_review_requested",
            },
            durableStorageBacked: true,
            supportedFeaturePromoted: false,
          },
        },
      });
    },
  );

  await page.goto(
    `/recommendations?mode=opportunities&portfolioId=${portfolioId}&candidateId=${candidateId}`,
    { waitUntil: "domcontentloaded" },
  );

  await expect(page.getByLabel("Idea candidate advisor actions")).toBeVisible();
  await expect(
    page.getByText(/do not create or approve a proposal, contact a client/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Record review" }).click();

  await expect(
    page.getByText(
      "Review saved. Opportunity detail and worklist are current.",
    ),
  ).toBeVisible();
  expect(recordedRequest?.headers["idempotency-key"]).toMatch(
    /^ui-idea-review-/,
  );
  expect(recordedRequest?.headers["x-caller-subject"]).toBeUndefined();
  expect(recordedRequest?.headers["x-caller-roles"]).toBeUndefined();
  expect(recordedRequest?.headers["x-caller-portfolio-ids"]).toBeUndefined();
  expect(recordedRequest?.headers["x-caller-capabilities"]).toBeUndefined();
  expect(recordedRequest?.body).toMatchObject({
    action: "approve_for_conversion",
    reasonCodes: ["review_approved_for_conversion", "high_cash_ratio"],
  });
  await expect(
    page.getByRole("link", { name: /Open Proposal Builder/ }),
  ).toBeVisible();
  await expect(page.getByText(/proposal created/i)).toHaveCount(0);
});

test("records every adviser-selected governed feedback reason through Gateway", async ({
  page,
}) => {
  await mockIdeaCandidateActions(page);
  const recordedRequests: Array<{
    headers: Record<string, string>;
    body: Record<string, string>;
  }> = [];
  await page.route(
    `**/api/bff/api/v1/ideas/candidates/${candidateId}/feedback`,
    async (route) => {
      const body = route.request().postDataJSON() as Record<string, string>;
      recordedRequests.push({ headers: route.request().headers(), body });
      await route.fulfill({
        json: {
          data: {
            feedbackEvent: {
              ...body,
              candidateId,
              evidencePacketId: "evidence_high_cash_001",
              actorRole: "advisor",
            },
            persistence: { decision: "accepted" },
            durableStorageBacked: true,
            supportedFeaturePromoted: false,
          },
        },
      });
    },
  );

  await page.goto(
    `/recommendations?mode=opportunities&portfolioId=${portfolioId}&candidateId=${candidateId}`,
    { waitUntil: "domcontentloaded" },
  );

  await expect(page.getByTestId("idea-feedback-reason-summary")).toContainText(
    "Relevant to this client",
  );
  await expect(page.getByLabel("Why was it not useful?")).toHaveCount(0);
  const usefulChoice = page.getByRole("radio", {
    name: "Useful",
    exact: true,
  });
  const notUsefulChoice = page.getByRole("radio", {
    name: "Not useful",
    exact: true,
  });
  await usefulChoice.focus();
  await usefulChoice.press("ArrowRight");
  await expect(notUsefulChoice).toBeFocused();
  await expect(notUsefulChoice).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Why was it not useful?")).toBeVisible();
  await notUsefulChoice.press("ArrowLeft");
  await expect(usefulChoice).toBeFocused();
  await expect(usefulChoice).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Why was it not useful?")).toHaveCount(0);
  await page.getByRole("button", { name: "Record feedback" }).click();

  const status = page.getByTestId("idea-action-feedback-status");
  await expect(status).toHaveAttribute(
    "data-action-state",
    "recorded-and-refreshed",
  );
  await expect(status).toContainText(
    "Feedback saved. Opportunity detail and worklist are current.",
  );
  expect(recordedRequests[0]).toMatchObject({
    headers: { "idempotency-key": expect.stringMatching(/^ui-idea-feedback-/) },
    body: {
      feedbackId: expect.stringMatching(/^ui-idea-feedback-/),
      taxonomyVersion: "idea-feedback-taxonomy-v1",
      outcome: "useful",
      reason: "relevant",
      recordedAtUtc: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    },
  });

  await page.getByRole("radio", { name: "Not useful" }).click();
  const reasonSelect = page.getByLabel("Why was it not useful?");
  await expect(reasonSelect).toBeVisible();
  expect(
    await reasonSelect
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(["", ...notUsefulFeedbackReasons]);

  for (const [index, reason] of notUsefulFeedbackReasons.entries()) {
    await reasonSelect.selectOption(reason);
    await page.getByRole("button", { name: "Record feedback" }).click();
    await expect.poll(() => recordedRequests.length).toBe(index + 2);
    await expect(status).toHaveAttribute(
      "data-action-state",
      "recorded-and-refreshed",
    );
    const request = recordedRequests[index + 1]!;
    expect(request.headers["idempotency-key"]).toMatch(/^ui-idea-feedback-/);
    expect(request.body).toEqual({
      feedbackId: expect.stringMatching(/^ui-idea-feedback-/),
      taxonomyVersion: "idea-feedback-taxonomy-v1",
      outcome: "not_useful",
      reason,
      recordedAtUtc: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(request.body).not.toHaveProperty("reasonCodes");
  }

  expect(
    new Set(recordedRequests.map(({ headers }) => headers["idempotency-key"]))
      .size,
  ).toBe(recordedRequests.length);
  expect(recordedRequests).toHaveLength(1 + notUsefulFeedbackReasons.length);

  await page.setViewportSize({ width: 820, height: 1_180 });
  const reviewForm = page
    .getByRole("heading", { name: "Record review" })
    .locator("..");
  const feedbackForm = page
    .getByRole("heading", { name: "Record feedback" })
    .locator("..");
  const conversionForm = page
    .getByRole("heading", { name: "Record conversion intent" })
    .locator("..");
  const [reviewBox, feedbackBox, conversionBox] = await Promise.all([
    reviewForm.boundingBox(),
    feedbackForm.boundingBox(),
    conversionForm.boundingBox(),
  ]);
  expect(reviewBox).not.toBeNull();
  expect(feedbackBox).not.toBeNull();
  expect(conversionBox).not.toBeNull();
  expect(feedbackBox!.x).toBeCloseTo(reviewBox!.x, 0);
  expect(conversionBox!.x).toBeCloseTo(reviewBox!.x, 0);
  expect(feedbackBox!.y).toBeGreaterThanOrEqual(
    reviewBox!.y + reviewBox!.height,
  );
  expect(conversionBox!.y).toBeGreaterThanOrEqual(
    feedbackBox!.y + feedbackBox!.height,
  );
});

test("renders a governed idea rationale with distinct evidence limits", async ({
  page,
}, testInfo) => {
  await mockIdeaCandidateActions(page);
  let recordedRequest:
    | { body: Record<string, string>; idempotencyKey?: string }
    | undefined;
  await page.route(
    `**/api/bff/api/v1/ideas/candidates/${candidateId}/ai-explanations`,
    async (route) => {
      const body = route.request().postDataJSON() as Record<string, string>;
      recordedRequest = {
        body,
        idempotencyKey: route.request().headers()["idempotency-key"],
      };
      await route.fulfill({
        json: {
          status: "EXPLANATION_SERVED",
          disposition: "executed",
          lotusAiRunId: "run-browser-001",
          lotusAiRuntimeExecutionConfirmed: true,
          evaluationVerdict: "accepted",
          explanation: {
            requestId: body.requestId,
            candidateId,
            posture: "ready_for_advisor_review",
            verifierOutcome: "passed",
            explanationText: "Cash weight is above the policy threshold.",
            fallbackUsed: false,
            fallbackReason: null,
            grantsDownstreamAuthority: false,
            supportedFeaturePromoted: false,
            executionProvenancePosture: "unattested_local_test_fixture",
            aiLineageRecorded: true,
            verifiedOutput: {
              groundedClaims: [
                {
                  claimId: "claim-browser-001",
                  claimText: "Cash weight is above the policy threshold.",
                  sourceRefs: [
                    {
                      productId: "portfolio-state-v1",
                      sourceSystem: "portfolio-record",
                      productVersion: "v1",
                      asOfDate: "2026-06-21",
                      freshness: "current",
                      dataQualityStatus: "complete",
                    },
                  ],
                },
              ],
            },
            redactedEvidence: {
              ...candidateEvidenceIdentity,
              reasonCodes: ["high_cash_ratio"],
              unsupportedReasons: ["benchmark_evidence_missing"],
              scorePolicyVersion: "idle-liquidity-v2",
              sourceRefs: [],
            },
          },
        },
      });
    },
  );

  await page.goto(
    `/recommendations?mode=opportunities&portfolioId=${portfolioId}&candidateId=${candidateId}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.getByRole("button", { name: "Explain this idea" }).click();

  const explanation = page.getByTestId("idea-candidate-explanation");
  await expect(explanation).toHaveAttribute("data-explanation-state", "served");
  await expect(explanation.getByText("Grounded rationale")).toBeVisible();
  await expect(explanation.getByText("Benchmark Evidence Missing")).toBeVisible();
  await expect(explanation.getByText("High Cash Ratio")).toBeVisible();
  await expect(explanation.getByText("run-browser-001")).toBeAttached();
  await expect(
    explanation.getByText(/not verified production provenance/i),
  ).toBeAttached();
  expect(recordedRequest?.body).toMatchObject({
    requestId: expect.stringMatching(/^idea-explanation-/),
    purpose: "advisor_rationale_draft",
    requestedAtUtc: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
  });
  expect(recordedRequest?.idempotencyKey).toBe(recordedRequest?.body.requestId);
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("idea-governed-rationale", {
    body: screenshot,
    contentType: "image/png",
  });
  if (explanationEvidenceDirectory) {
    await mkdir(explanationEvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: path.join(explanationEvidenceDirectory, "idea-governed-rationale.png"),
      fullPage: true,
    });
  }
});

test("keeps advisor actions available with deterministic evidence when AI is unavailable", async ({
  page,
}, testInfo) => {
  await mockIdeaCandidateActions(page);
  await page.route(
    `**/api/bff/api/v1/ideas/candidates/${candidateId}/ai-explanations`,
    async (route) => {
      const body = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({
        json: {
          status: "EXPLANATION_UNAVAILABLE",
          disposition: "runtime_unavailable",
          lotusAiRunId: null,
          lotusAiRuntimeExecutionConfirmed: false,
          evaluationVerdict: "not_evaluated",
          explanation: {
            requestId: body.requestId,
            candidateId,
            posture: "fallback_only",
            verifierOutcome: "not_run",
            explanationText:
              "Cash remains above the source policy threshold for advisor review.",
            fallbackUsed: true,
            fallbackReason: "ai_unavailable",
            grantsDownstreamAuthority: false,
            supportedFeaturePromoted: false,
            executionProvenancePosture: "runtime_unavailable",
            aiLineageRecorded: false,
            redactedEvidence: {
              ...candidateEvidenceIdentity,
              reasonCodes: ["high_cash_ratio"],
              unsupportedReasons: ["runtime_unavailable"],
              scorePolicyVersion: "idle-liquidity-v2",
              sourceRefs: [],
            },
          },
        },
      });
    },
  );

  await page.goto(
    `/recommendations?mode=opportunities&portfolioId=${portfolioId}&candidateId=${candidateId}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.getByRole("button", { name: "Explain this idea" }).click();

  const explanation = page.getByTestId("idea-candidate-explanation");
  await expect(explanation).toHaveAttribute(
    "data-explanation-state",
    "unavailable",
  );
  await expect(explanation.getByText("Deterministic evidence summary")).toBeVisible();
  await expect(
    explanation.getByText(
      "Cash remains above the source policy threshold for advisor review.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Record review" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Record feedback" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Record intent" })).toBeEnabled();
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("idea-deterministic-fallback", {
    body: screenshot,
    contentType: "image/png",
  });
  if (explanationEvidenceDirectory) {
    await mkdir(explanationEvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: path.join(
        explanationEvidenceDirectory,
        "idea-deterministic-fallback.png",
      ),
      fullPage: true,
    });
  }
});
