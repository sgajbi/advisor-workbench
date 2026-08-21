import { formatDateValue } from "@/design-system/utils/financial-formatters";
import {
  createAiAssistanceDisclosure,
  type SemanticBadgeTone,
} from "@/design-system";

import type {
  ProposalDiscussionCapabilityState,
  ProposalDiscussionPackEnvelope,
} from "./proposal-discussion-pack-contract";

type ControlPresentation = {
  key: "narrative" | "memo" | "package" | "consent" | "release";
  label: string;
  status: string;
  tone: SemanticBadgeTone;
  summary: string;
  source: string;
};

export type ProposalDiscussionPackModel = ReturnType<
  typeof buildProposalDiscussionPackModel
>;

export function buildProposalDiscussionPackModel(
  envelope: ProposalDiscussionPackEnvelope,
) {
  const { data } = envelope;
  const controls = [
    narrativeControl(envelope),
    memoControl(envelope),
    packageControl(envelope),
    consentControl(envelope),
    releaseControl(envelope),
  ] satisfies ControlPresentation[];
  const narrativeSourceCount = data.narrative.sections.reduce(
    (count, section) => count + section.source_refs.length,
    0,
  );
  const disclosurePolicyCapability = data.capabilities.find(
    ({ key }) => key === "disclosure_policy",
  )!;
  const disclosurePolicyIsSupported =
    disclosurePolicyCapability.state === "supported";
  const policyBoundaryMessage =
    "Policy disclosure evidence is not available for this proposal version.";
  const narrativeArtifactIsComplete = hasCompleteNarrativeArtifact(data.narrative);
  const narrativeReviewIsRecorded = hasRecordedAudit({
    id: data.narrative.review_id,
    actor: data.narrative.reviewed_by,
    occurredAt: data.narrative.reviewed_at,
  });
  const narrativeReviewState =
    data.narrative.review_state === "APPROVED_FOR_ADVISOR_USE" &&
    narrativeReviewIsRecorded &&
    narrativeArtifactIsComplete
      ? "reviewed"
      : ["REJECTED", "REGENERATION_REQUESTED"].includes(
            data.narrative.review_state,
          )
        ? "rejected"
        : "review-required";
  return {
    identity: {
      proposalId: data.proposal_id,
      portfolioId: data.portfolio_id,
      title: data.title ?? data.proposal_id,
      version: `Version ${data.version_no}`,
      versionNo: data.version_no,
      recorded: formatDateValue(data.version_created_at),
    },
    posture: overallPosture(envelope, controls),
    controls,
    narrative: {
      isAvailable:
        data.narrative.state === "supported" && narrativeArtifactIsComplete,
      isAiAssisted: data.narrative.generation_mode === "AI_ASSISTED_DRAFT",
      generationLabel:
        data.narrative.generation_mode === "AI_ASSISTED_DRAFT"
          ? "AI-assisted draft"
          : data.narrative.generation_mode === "DETERMINISTIC_TEMPLATE"
            ? "Deterministic source narrative"
            : "Generation method not reported",
      aiDisclosure: createAiAssistanceDisclosure({
        scopeLabel: "Advisor conversation narrative",
        preparation:
          data.narrative.generation_mode === "AI_ASSISTED_DRAFT"
            ? "ai-assisted"
            : data.narrative.generation_mode === "DETERMINISTIC_TEMPLATE"
              ? "deterministic"
              : "unavailable",
        availability:
          data.narrative.state === "supported" && narrativeArtifactIsComplete
            ? "live"
            : data.narrative.state === "partial"
              ? "partial"
              : "unavailable",
        evidence: {
          state:
            data.narrative.state === "supported" && narrativeArtifactIsComplete
              ? narrativeSourceCount > 0
                ? "supported"
                : "missing"
              : data.narrative.state === "partial"
                ? "limited"
                : "missing",
          sourceCount: narrativeSourceCount,
        },
        humanReview: {
          state: narrativeReviewState,
          sourceRecorded: narrativeReviewIsRecorded,
          ...(data.narrative.reviewed_by
            ? { actor: data.narrative.reviewed_by }
            : {}),
          ...(data.narrative.reviewed_at
            ? { occurredAt: data.narrative.reviewed_at }
            : {}),
        },
        clientUse: "blocked",
        freshness: { state: "not-reported" },
        limitations: disclosurePolicyIsSupported
          ? [
              ...data.narrative.client_ready_blockers,
              ...data.narrative.limitations.map(({ message }) => message),
            ]
          : [policyBoundaryMessage],
      }),
      sections: data.narrative.sections.map((section) => ({
        key: section.section_key,
        title: section.title,
        text: section.text,
        sourceCount: section.source_refs.length,
        limitationCount: section.limitation_refs.length,
      })),
      reviewedBy: data.narrative.reviewed_by ?? "Not recorded",
      reviewedAt: formatDateValue(data.narrative.reviewed_at),
    },
    memo: {
      isAvailable:
        data.memo.state === "supported" && hasCompleteMemoArtifact(data.memo),
      status: businessLabel(data.memo.memo_status ?? data.memo.state),
      reviewedBy: data.memo.reviewed_by ?? "Not recorded",
      reviewedAt: formatDateValue(data.memo.reviewed_at),
      sections: data.memo.sections.map((section) => ({
        key: section.section_id,
        title: section.title,
        status: businessLabel(section.status),
        tone:
          section.status === "READY" ? ("success" as const) : ("warn" as const),
        summary: section.summary,
        owner: businessLabel(section.owner_role),
        reviewRequired: section.review_required,
      })),
    },
    disclosurePolicy: {
      isSupported: disclosurePolicyIsSupported,
      status: supportabilityLabel(disclosurePolicyCapability.state),
      tone: supportabilityTone(disclosurePolicyCapability.state),
    },
    disclosures:
      disclosurePolicyIsSupported
        ? data.narrative.disclosures.map((disclosure) => ({
            key: disclosure.disclosure_id,
            audience:
              disclosure.required_for === "CLIENT_READY"
                ? "Client-ready material"
                : "Advisor review",
            jurisdiction: disclosure.jurisdiction,
            productType: businessLabel(disclosure.product_type),
            text: disclosure.text,
            authority: disclosure.source_authority,
            policyVersion: disclosure.policy_version,
          }))
        : [],
    blockers: disclosurePolicyIsSupported
      ? data.narrative.client_ready_blockers
      : [policyBoundaryMessage],
    limitations: disclosurePolicyIsSupported
      ? data.narrative.limitations.map((limitation, index) => ({
          key: `${limitation.evidence_key}:${index}`,
          area: businessLabel(limitation.evidence_key),
          purpose: businessLabel(limitation.required_for),
          message: limitation.message,
        }))
      : [],
    capabilities: data.capabilities.map((capability) => ({
      key: capability.key,
      name: businessLabel(capability.key),
      status: supportabilityLabel(capability.state),
      tone: supportabilityTone(capability.state),
      source: capability.source_service ?? "Not exposed",
      reference: capability.support_reference,
    })),
    lineage: {
      correlationId: envelope.correlation_id,
      contractVersion: envelope.contract_version,
      proposalVersionId: data.lineage.proposal_version_id,
      requestHash: data.lineage.request_hash,
      artifactHash: data.lineage.artifact_hash,
      narrativeHash:
        data.narrative.state === "supported" && narrativeArtifactIsComplete
          ? data.lineage.narrative_hash
          : null,
      memoHash:
        data.memo.state === "supported" && hasCompleteMemoArtifact(data.memo)
          ? data.lineage.memo_hash
          : null,
    },
  };
}

function overallPosture(
  envelope: ProposalDiscussionPackEnvelope,
  controls: ControlPresentation[],
) {
  const { data } = envelope;
  if (data.overall_state === "partial") {
    return {
      label: "Evidence incomplete",
      tone: "warn" as const,
      title: "Some conversation evidence cannot be confirmed",
      summary:
        "Use the supported advisor material only after reviewing every unavailable or restricted source. No client-release posture is inferred.",
      nextAction:
        "Resolve the unavailable evidence before relying on this pack in a client meeting.",
    };
  }
  const internalControlsConfirmed = controls
    .filter(({ key }) => key !== "release")
    .every(({ tone }) => tone === "success");
  const requiredCapabilitiesSupported = [
    "proposal_identity",
    "disclosure_policy",
  ].every(
    (key) =>
      data.capabilities.find((capability) => capability.key === key)?.state ===
      "supported",
  );
  if (
    data.attention_required ||
    !internalControlsConfirmed ||
    !requiredCapabilitiesSupported
  ) {
    return {
      label: "Review required",
      tone: "warn" as const,
      title: "Conversation controls still need advisor attention",
      summary:
        "Source evidence is available, but one or more review, package, consent, or release controls remain unresolved.",
      nextAction:
        "Review the control ledger and resolve the highlighted business action in the governed proposal record.",
    };
  }
  return {
    label: "Advisor evidence reviewed",
    tone: "success" as const,
    title: "Advisor-use conversation evidence is confirmed",
    summary:
      "Narrative, memo, report-package, and consent evidence are source-confirmed for this version. Client release remains a separate governed boundary.",
    nextAction:
      "Use the material for internal preparation and verify the client-release boundary before any external use.",
  };
}

function narrativeControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const narrative = envelope.data.narrative;
  if (narrative.state !== "supported") {
    return unsupportedControl(
      "narrative",
      "Advisor narrative",
      narrative.state,
      "Narrative evidence cannot be confirmed for this version.",
    );
  }
  const reviewIsRecorded = hasRecordedAudit({
    id: narrative.review_id,
    actor: narrative.reviewed_by,
    occurredAt: narrative.reviewed_at,
  });
  const artifactIsComplete = hasCompleteNarrativeArtifact(narrative);
  const approvalIsIncomplete =
    narrative.review_state === "APPROVED_FOR_ADVISOR_USE" &&
    (!reviewIsRecorded || !artifactIsComplete);
  const approved =
    narrative.review_state === "APPROVED_FOR_ADVISOR_USE" &&
    reviewIsRecorded &&
    artifactIsComplete &&
    narrative.status === "READY_FOR_ADVISOR_REVIEW";
  const rejected = ["REJECTED", "REGENERATION_REQUESTED"].includes(
    narrative.review_state,
  );
  return {
    key: "narrative",
    label: "Advisor narrative",
    status: approvalIsIncomplete
      ? "Review evidence incomplete"
      : approved
      ? "Approved for advisor use"
      : rejected
        ? "Revision required"
        : "Review required",
    tone: approved ? "success" : rejected ? "danger" : "warn",
    summary: approvalIsIncomplete
      ? "The approval state has no complete source review record."
      : approved
      ? `Reviewed ${formatDateValue(narrative.reviewed_at)}.`
      : "An advisor-use review has not been confirmed for the selected version.",
    source: "Lotus Advise",
  };
}

function memoControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const memo = envelope.data.memo;
  if (memo.state !== "supported") {
    return unsupportedControl(
      "memo",
      "Advisor decision memo",
      memo.state,
      "Memo evidence cannot be confirmed for this version.",
    );
  }
  const reviewIsRecorded = hasRecordedAudit({
    id: memo.review_event_id,
    actor: memo.reviewed_by,
    occurredAt: memo.reviewed_at,
  });
  const artifactIsComplete = hasCompleteMemoArtifact(memo);
  const finalizedForAdvisorUse =
    memo.memo_status === "READY" &&
    memo.lifecycle_status === "FINALIZED" &&
    memo.sections.every(
      ({ status, review_required }) => status === "READY" && !review_required,
    );
  const approvalIsIncomplete =
    memo.latest_review_action === "APPROVE_FOR_ADVISOR_USE" &&
    (!reviewIsRecorded || !artifactIsComplete || !finalizedForAdvisorUse);
  const approved =
    memo.latest_review_action === "APPROVE_FOR_ADVISOR_USE" &&
    reviewIsRecorded &&
    artifactIsComplete &&
    finalizedForAdvisorUse;
  const rejected = ["REQUEST_CHANGES", "REJECT"].includes(
    memo.latest_review_action ?? "",
  );
  return {
    key: "memo",
    label: "Advisor decision memo",
    status: approvalIsIncomplete
      ? "Review evidence incomplete"
      : approved
      ? "Approved for advisor use"
      : rejected
        ? "Revision required"
        : "Review required",
    tone: approved ? "success" : rejected ? "danger" : "warn",
    summary: approvalIsIncomplete
      ? "The approval state has no complete source review record."
      : approved
      ? `Reviewed ${formatDateValue(memo.reviewed_at)}.`
      : "A completed advisor-use memo review has not been confirmed.",
    source: "Lotus Advise",
  };
}

function packageControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const evidence = envelope.data.package;
  if (evidence.state !== "supported") {
    return unsupportedControl(
      "package",
      "Report package",
      evidence.state,
      "Report-package evidence cannot be confirmed.",
    );
  }
  if (evidence.package_state === "available" && !evidence.includes_reviewed_narrative) {
    return {
      key: "package",
      label: "Report package",
      status: "Narrative review missing",
      tone: "warn",
      summary:
        "The report package is available but does not include the reviewed advisor narrative.",
      source:
        evidence.source_service === "lotus-report"
          ? "Lotus Report"
          : "Not recorded",
    };
  }
  const presentation = {
    available: [
      "Available",
      "success",
      "A source report reference is recorded.",
    ],
    pending: [
      "In preparation",
      "warn",
      "The report package has not completed.",
    ],
    attention: [
      "Needs attention",
      "danger",
      "Report processing requires follow-up.",
    ],
    not_requested: [
      "Not requested",
      "default",
      "No report package request is recorded.",
    ],
  }[evidence.package_state] as [string, SemanticBadgeTone, string];
  return {
    key: "package",
    label: "Report package",
    status: presentation[0],
    tone: presentation[1],
    summary: presentation[2],
    source:
      evidence.source_service === "lotus-report"
        ? "Lotus Report"
        : "Not recorded",
  };
}

function consentControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const consent = envelope.data.consent;
  if (consent.state !== "supported") {
    return unsupportedControl(
      "consent",
      "Client consent record",
      consent.state,
      "Current-version client consent cannot be confirmed.",
    );
  }
  const recordIsComplete = hasRecordedAudit({
    id: consent.approval_id,
    actor: consent.actor_id,
    occurredAt: consent.occurred_at,
  });
  if (
    ["approved", "declined"].includes(consent.consent_state) &&
    !recordIsComplete
  ) {
    return {
      key: "consent",
      label: "Client consent record",
      status: "Source record incomplete",
      tone: "warn",
      summary:
        "The consent state has no complete source approval, actor, and occurrence record.",
      source: "Lotus Advise",
    };
  }
  const presentation = {
    approved: [
      "Recorded",
      "success",
      `Recorded ${formatDateValue(consent.occurred_at)}.`,
    ],
    declined: [
      "Declined",
      "danger",
      `Declined ${formatDateValue(consent.occurred_at)}.`,
    ],
    not_recorded: [
      "Not recorded",
      "warn",
      "No client consent is recorded for this version.",
    ],
  }[consent.consent_state] as [string, SemanticBadgeTone, string];
  return {
    key: "consent",
    label: "Client consent record",
    status: presentation[0],
    tone: presentation[1],
    summary: presentation[2],
    source: "Lotus Advise",
  };
}

function releaseControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const release = envelope.data.client_release;
  return {
    key: "release",
    label: "Client release and delivery",
    status: release.state === "blocked" ? "Blocked" : "Not supported",
    tone: "warn",
    summary: release.explanation,
    source: "Governed platform boundary",
  };
}

function hasRecordedAudit({
  id,
  actor,
  occurredAt,
}: {
  id: string | null;
  actor: string | null;
  occurredAt: string | null;
}): boolean {
  return Boolean(id && actor && occurredAt);
}

function hasCompleteNarrativeArtifact(
  narrative: ProposalDiscussionPackEnvelope["data"]["narrative"],
): boolean {
  return Boolean(
    narrative.narrative_id &&
    narrative.source_narrative_hash &&
    narrative.status &&
    narrative.generation_mode &&
    narrative.sections.length > 0 &&
    narrative.sections.every(({ source_refs }) => source_refs.length > 0),
  );
}

function hasCompleteMemoArtifact(
  memo: ProposalDiscussionPackEnvelope["data"]["memo"],
): boolean {
  return Boolean(
    memo.memo_id &&
    memo.memo_version &&
    memo.memo_status &&
    memo.lifecycle_status &&
    memo.source_input_hash &&
    memo.memo_hash &&
    memo.sections.length > 0,
  );
}

function unsupportedControl(
  key: ControlPresentation["key"],
  label: string,
  state: ProposalDiscussionCapabilityState,
  summary: string,
): ControlPresentation {
  return {
    key,
    label,
    status: supportabilityLabel(state),
    tone: supportabilityTone(state),
    summary,
    source: "Source not confirmed",
  };
}

function supportabilityLabel(state: ProposalDiscussionCapabilityState) {
  return {
    supported: "Supported",
    partial: "Partial",
    restricted: "Restricted",
    unavailable: "Unavailable",
    not_available: "Not available",
    not_supported: "Not supported",
  }[state];
}

function supportabilityTone(
  state: ProposalDiscussionCapabilityState,
): SemanticBadgeTone {
  if (state === "supported") return "success";
  if (state === "restricted" || state === "unavailable") return "danger";
  if (state === "partial") return "warn";
  return "default";
}

function businessLabel(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}
