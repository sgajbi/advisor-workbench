import { fetchJson, sendJson } from "./probes.mjs";
import {
  buildPayloadScopedIdempotencyKey,
  extractGatewayEnvelopeData,
  readString,
} from "./payload-utils.mjs";

const DEFAULT_ADVISOR_ID = "advisor_sg_001";
const DEFAULT_ROLE = "ADVISOR";

function advisorCockpitQuery({
  portfolioId,
  advisorId = DEFAULT_ADVISOR_ID,
  role = DEFAULT_ROLE,
  limit,
}) {
  const query = new URLSearchParams({
    portfolio_id: portfolioId,
    advisor_id: advisorId,
    role,
  });
  if (limit) {
    query.set("limit", String(limit));
  }
  return query.toString();
}

function assertPortfolioScopedActions(items, portfolioId) {
  const outOfScope = items.find(
    (item) => readString(item?.portfolio_id) !== portfolioId,
  );
  if (outOfScope) {
    throw new Error(
      `Advisor cockpit returned out-of-scope action ${readString(outOfScope?.action_item_id) ?? "unknown"} for portfolio ${readString(outOfScope?.portfolio_id) ?? "missing"}.`,
    );
  }
}

function findPolicyReviewAction(items, expectedActionFamily) {
  return items.find((item) => {
    const family = readString(item?.action_family);
    const status = readString(item?.status);
    const reasonCodes = Array.isArray(item?.reason_codes)
      ? item.reason_codes
      : [];
    return (
      (expectedActionFamily && family === expectedActionFamily) ||
      family === "POLICY_REVIEW_REQUIRED" ||
      status === "PENDING_REVIEW" ||
      reasonCodes.includes("POLICY_PENDING_REVIEW")
    );
  });
}

function snapshotCount(snapshot, key) {
  const value = snapshot?.action_counts?.[key];
  return typeof value === "number" ? value : 0;
}

function isAcknowledged(action) {
  return action?.acknowledgement_state?.acknowledged === true;
}

export async function validateCanonicalAdvisorCockpit({
  summary,
  scenario,
  gatewayBaseUrl,
  portfolioId,
  proposalId,
  proposalVersionId,
  timeoutMs,
  advisorId = scenario?.advisorId ?? DEFAULT_ADVISOR_ID,
  role = scenario?.role ?? DEFAULT_ROLE,
}) {
  const query = advisorCockpitQuery({
    portfolioId,
    advisorId,
    role,
    limit: 25,
  });
  const actions = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/advisor-cockpit/actions?${query}`,
    "Advisor cockpit canonical action list",
    timeoutMs,
  );
  const actionPage = extractGatewayEnvelopeData(actions);
  const items = Array.isArray(actionPage?.items) ? actionPage.items : [];
  if (items.length < 1) {
    throw new Error(
      "Advisor cockpit canonical action list returned no action items.",
    );
  }
  assertPortfolioScopedActions(items, portfolioId);

  const policyAction = findPolicyReviewAction(
    items,
    scenario?.expectedActionFamily,
  );
  if (!policyAction) {
    throw new Error(
      "Advisor cockpit did not expose a policy-review action for the canonical scenario.",
    );
  }
  const actionItemId = readString(policyAction.action_item_id);
  const actionItemVersion = policyAction.action_item_version;
  if (!actionItemId || typeof actionItemVersion !== "number") {
    throw new Error(
      "Advisor cockpit canonical action item did not include stable identity and version.",
    );
  }

  const snapshot = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/advisor-cockpit/snapshot?${query}`,
    "Advisor cockpit canonical operating snapshot",
    timeoutMs,
  );
  const snapshotData = extractGatewayEnvelopeData(snapshot);
  if (!readString(snapshotData?.snapshot_id)) {
    throw new Error("Advisor cockpit snapshot returned no snapshot id.");
  }
  if (snapshotCount(snapshotData, "status.PENDING_REVIEW") < 1) {
    throw new Error(
      "Advisor cockpit snapshot did not preserve pending-review action count.",
    );
  }
  const clientReadyPublication = readString(
    snapshotData?.supportability?.client_ready_publication,
  );
  const workbenchPosture = readString(
    snapshotData?.supportability?.workbench_posture,
  );
  if (
    scenario?.expectedClientReadyPublication &&
    clientReadyPublication !== scenario.expectedClientReadyPublication
  ) {
    throw new Error(
      `Advisor cockpit snapshot returned client publication ${clientReadyPublication ?? "missing"}, expected ${scenario.expectedClientReadyPublication}.`,
    );
  }
  if (
    scenario?.expectedWorkbenchPosture &&
    workbenchPosture !== scenario.expectedWorkbenchPosture
  ) {
    throw new Error(
      `Advisor cockpit snapshot returned Workbench posture ${workbenchPosture ?? "missing"}, expected ${scenario.expectedWorkbenchPosture}.`,
    );
  }

  const supportability = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/advisor-cockpit/supportability?${advisorCockpitQuery(
      {
        portfolioId,
        advisorId,
        role,
      },
    )}`,
    "Advisor cockpit canonical supportability",
    timeoutMs,
  );
  const supportabilityData = extractGatewayEnvelopeData(supportability);
  const supportabilityPosture = readString(supportabilityData?.posture);
  if (!supportabilityPosture) {
    throw new Error(
      "Advisor cockpit supportability returned no bounded posture.",
    );
  }
  if (
    scenario?.expectedSupportabilityPosture &&
    supportabilityPosture !== scenario.expectedSupportabilityPosture
  ) {
    throw new Error(
      `Advisor cockpit supportability returned posture ${supportabilityPosture}, expected ${scenario.expectedSupportabilityPosture}.`,
    );
  }

  const alreadyAcknowledged = isAcknowledged(policyAction);
  let acknowledgementData = null;
  let acknowledgementState = policyAction.acknowledgement_state;
  if (!alreadyAcknowledged) {
    const acknowledgementBody = {
      action_item_version: actionItemVersion,
      acknowledged_by: "workbench-canonical-validator",
      acknowledgement_note:
        "Canonical validation recorded advisor cockpit acknowledgement without clearing source-owned blockers.",
    };
    const acknowledgementIdempotencyMaterial = {
      portfolio_id: portfolioId,
      advisor_id: advisorId,
      role,
      action_item_id: actionItemId,
      ...acknowledgementBody,
    };
    const acknowledgement = await sendJson(
      summary,
      `${gatewayBaseUrl}/api/v1/advisor-cockpit/actions/${encodeURIComponent(
        actionItemId,
      )}/acknowledgements?${advisorCockpitQuery({ portfolioId, advisorId, role })}`,
      "Advisor cockpit canonical acknowledgement",
      timeoutMs,
      {
        method: "POST",
        body: acknowledgementBody,
        headers: {
          "Idempotency-Key": buildPayloadScopedIdempotencyKey(
            "wb-advisor-cockpit-ack",
            acknowledgementIdempotencyMaterial,
          ),
        },
      },
    );
    acknowledgementData = extractGatewayEnvelopeData(acknowledgement);
    acknowledgementState =
      acknowledgementData?.acknowledgement ??
      acknowledgementData?.action_item?.acknowledgement_state;
  }
  if (acknowledgementState?.acknowledged !== true) {
    throw new Error(
      "Advisor cockpit acknowledgement did not return acknowledged=true.",
    );
  }

  summary.workflowPackChecks.push({
    actionType:
      scenario?.expectedAcknowledgementMarker ??
      "ADVISOR_COCKPIT_ACTION_ACKNOWLEDGED",
    route: "/api/v1/advisor-cockpit/actions",
    portfolioId,
    proposalId,
    proposalVersionId,
    actionItemId,
    actionItemVersion,
    resultReviewState: policyAction.status,
    clientReadyPublication,
    workbenchPosture,
    supportabilityPosture,
    alreadyAcknowledged,
    replayed: alreadyAcknowledged || Boolean(acknowledgementData?.replayed),
  });

  return {
    actionItemId,
    actionItemVersion,
    actionCount: items.length,
    snapshotId: snapshotData.snapshot_id,
    supportabilityPosture,
    workbenchPosture,
    clientReadyPublication,
  };
}
