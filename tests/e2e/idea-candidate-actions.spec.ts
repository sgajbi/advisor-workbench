import { expect, test } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const candidateId = "idea_high_cash_001";

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
    page.getByText(/do not create a proposal, grant downstream authority/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Record review" }).click();

  await expect(page.getByText(/Review recorded through Gateway/)).toBeVisible();
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
