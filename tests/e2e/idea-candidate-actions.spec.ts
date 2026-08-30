import { expect, test } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const candidateId = "idea_high_cash_001";
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
    page.getByText("Review saved. Opportunity detail and worklist are current."),
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

  await expect(
    page.getByTestId("idea-feedback-reason-summary"),
  ).toContainText("Relevant to this client");
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
    await reasonSelect.locator("option").evaluateAll((options) =>
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
    new Set(
      recordedRequests.map(({ headers }) => headers["idempotency-key"]),
    ).size,
  ).toBe(recordedRequests.length);
  expect(recordedRequests).toHaveLength(1 + notUsefulFeedbackReasons.length);
});
