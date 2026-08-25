import { formatDateValue } from "@/design-system/utils/financial-formatters";
import {
  createAiAssistanceDisclosure,
  type SemanticBadgeTone,
} from "@/design-system";
import {
  PROPOSAL_DISCUSSION_PACK_COPY,
  proposalDiscussionCapabilityLabel,
  proposalDiscussionCapabilityStateLabel,
  proposalDiscussionLimitationAreaLabel,
  proposalDiscussionMemoOwnerLabel,
  proposalDiscussionMemoStatusLabel,
  proposalDiscussionPackStatusCopy,
  proposalDiscussionProductTypeLabel,
  proposalDiscussionUsePurposeLabel,
} from "@/copy/proposal-discussion-pack-copy";

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
    PROPOSAL_DISCUSSION_PACK_COPY.policyEvidenceUnavailable;
  const narrativeArtifactIsComplete = hasCompleteNarrativeArtifact(data.narrative);
  const narrativeIsAvailable =
    data.narrative.state === "supported" && narrativeArtifactIsComplete;
  const memoArtifactIsComplete = hasCompleteMemoArtifact(data.memo);
  const memoIsAvailable =
    data.memo.state === "supported" && memoArtifactIsComplete;
  const narrativeBoundaryMessage =
    PROPOSAL_DISCUSSION_PACK_COPY.narrativeEvidenceUnavailable;
  const narrativeControlPresentation = controls.find(
    ({ key }) => key === "narrative",
  )!;
  const memoControlPresentation = controls.find(({ key }) => key === "memo")!;
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
    status: overallStatus(envelope, controls),
    controls,
    narrative: {
      isAvailable: narrativeIsAvailable,
      isAiAssisted:
        narrativeIsAvailable &&
        data.narrative.generation_mode === "AI_ASSISTED_DRAFT",
      generationLabel: !narrativeIsAvailable
        ? narrativeControlPresentation.status
        : data.narrative.generation_mode === "AI_ASSISTED_DRAFT"
          ? PROPOSAL_DISCUSSION_PACK_COPY.generation.aiAssisted
          : data.narrative.generation_mode === "DETERMINISTIC_TEMPLATE"
            ? PROPOSAL_DISCUSSION_PACK_COPY.generation.deterministic
            : PROPOSAL_DISCUSSION_PACK_COPY.generation.notReported,
      aiDisclosure: createAiAssistanceDisclosure({
        scopeLabel: PROPOSAL_DISCUSSION_PACK_COPY.narrativeTitle,
        preparation:
          !narrativeIsAvailable
            ? "unavailable"
            : data.narrative.generation_mode === "AI_ASSISTED_DRAFT"
            ? "ai-assisted"
            : data.narrative.generation_mode === "DETERMINISTIC_TEMPLATE"
              ? "deterministic"
              : "unavailable",
        availability: narrativeIsAvailable ? "live" : "unavailable",
        evidence: {
          state: narrativeIsAvailable
            ? narrativeSourceCount > 0
              ? "supported"
              : "missing"
            : "missing",
          sourceCount: narrativeIsAvailable ? narrativeSourceCount : 0,
        },
        humanReview: {
          state: narrativeIsAvailable ? narrativeReviewState : "unavailable",
          sourceRecorded: narrativeIsAvailable && narrativeReviewIsRecorded,
          ...(narrativeIsAvailable && data.narrative.reviewed_by
            ? { actor: data.narrative.reviewed_by }
            : {}),
          ...(narrativeIsAvailable && data.narrative.reviewed_at
            ? { occurredAt: data.narrative.reviewed_at }
            : {}),
        },
        clientUse: "blocked",
        freshness: { state: "not-reported" },
        limitations: !narrativeIsAvailable
          ? [narrativeBoundaryMessage]
          : disclosurePolicyIsSupported
          ? [
              ...data.narrative.client_ready_blockers,
              ...data.narrative.limitations.map(({ message }) => message),
            ]
          : [policyBoundaryMessage],
      }),
      sections: narrativeIsAvailable
        ? data.narrative.sections.map((section) => ({
            key: section.section_key,
            title: section.title,
            text: section.text,
            sourceCount: section.source_refs.length,
            limitationCount: section.limitation_refs.length,
          }))
        : [],
      reviewedBy: narrativeIsAvailable
        ? (data.narrative.reviewed_by ?? "Not recorded")
        : "Not available",
      reviewedAt: narrativeIsAvailable
        ? formatDateValue(data.narrative.reviewed_at)
        : "Not available",
    },
    memo: {
      isAvailable: memoIsAvailable,
      status: memoIsAvailable
        ? proposalDiscussionMemoStatusLabel(
            data.memo.memo_status ?? data.memo.state,
          )
        : memoControlPresentation.status,
      tone: memoControlPresentation.tone,
      reviewedBy: memoIsAvailable
        ? (data.memo.reviewed_by ?? "Not recorded")
        : "Not available",
      reviewedAt: memoIsAvailable
        ? formatDateValue(data.memo.reviewed_at)
        : "Not available",
      sections: memoIsAvailable
        ? data.memo.sections.map((section) => ({
            key: section.section_id,
            title: section.title,
            status: proposalDiscussionMemoStatusLabel(section.status),
            tone:
              section.status === "READY"
                ? ("success" as const)
                : ("warn" as const),
            summary: section.summary,
            owner: proposalDiscussionMemoOwnerLabel(section.owner_role),
            reviewRequired: section.review_required,
          }))
        : [],
    },
    disclosurePolicy: {
      isSupported: disclosurePolicyIsSupported,
      status: proposalDiscussionCapabilityStateLabel(
        disclosurePolicyCapability.state,
      ),
      tone: capabilityTone(disclosurePolicyCapability.state),
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
            productType: proposalDiscussionProductTypeLabel(
              disclosure.product_type,
            ),
            text: disclosure.text,
            authority: disclosure.source_authority,
            policyVersion: disclosure.policy_version,
          }))
        : [],
    blockers: !narrativeIsAvailable
      ? [narrativeBoundaryMessage]
      : disclosurePolicyIsSupported
        ? data.narrative.client_ready_blockers
        : [policyBoundaryMessage],
    limitations:
      narrativeIsAvailable && disclosurePolicyIsSupported
        ? data.narrative.limitations.map((limitation, index) => ({
            key: `${limitation.evidence_key}:${index}`,
            area: proposalDiscussionLimitationAreaLabel(
              limitation.evidence_key,
            ),
            purpose: proposalDiscussionUsePurposeLabel(
              limitation.required_for,
            ),
            message: limitation.message,
          }))
        : [],
    capabilities: data.capabilities.map((capability) => ({
      key: capability.key,
      name: proposalDiscussionCapabilityLabel(capability.key),
      status: proposalDiscussionCapabilityStateLabel(capability.state),
      tone: capabilityTone(capability.state),
      source: capability.source_service ?? "Not exposed",
      reference: capability.support_reference,
    })),
    support: {
      clientReleaseExplanation: data.client_release.explanation,
    },
    lineage: {
      correlationId: envelope.correlation_id,
      contractVersion: envelope.contract_version,
      proposalVersionId: data.lineage.proposal_version_id,
      requestHash: data.lineage.request_hash,
      artifactHash: data.lineage.artifact_hash,
      narrativeHash:
        narrativeIsAvailable ? data.lineage.narrative_hash : null,
      memoHash: memoIsAvailable ? data.lineage.memo_hash : null,
    },
  };
}

function overallStatus(
  envelope: ProposalDiscussionPackEnvelope,
  controls: ControlPresentation[],
) {
  const { data } = envelope;
  if (data.overall_state === "partial") {
    return {
      ...proposalDiscussionPackStatusCopy("incomplete"),
      tone: "warn" as const,
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
      ...proposalDiscussionPackStatusCopy("action-required"),
      tone: "warn" as const,
    };
  }
  return {
    ...proposalDiscussionPackStatusCopy("internal-ready"),
    tone: "success" as const,
  };
}

function narrativeControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const narrative = envelope.data.narrative;
  if (narrative.state !== "supported") {
    return unsupportedControl(
      "narrative",
      "Adviser narrative",
      narrative.state,
      "The conversation narrative is unavailable for this proposal version.",
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
    label: "Adviser narrative",
    status: approvalIsIncomplete
      ? "Review evidence incomplete"
      : approved
      ? "Approved for adviser use"
      : rejected
        ? "Revision required"
        : "Review required",
    tone: approved ? "success" : rejected ? "danger" : "warn",
    summary: approvalIsIncomplete
      ? "The approval state has no complete review record."
      : approved
      ? `Reviewed ${formatDateValue(narrative.reviewed_at)}.`
      : "An adviser-use review is still required for the selected version.",
    source: PROPOSAL_DISCUSSION_PACK_COPY.controlSources.narrative,
  };
}

function memoControl(
  envelope: ProposalDiscussionPackEnvelope,
): ControlPresentation {
  const memo = envelope.data.memo;
  if (memo.state !== "supported") {
    return unsupportedControl(
      "memo",
      "Adviser decision memo",
      memo.state,
      "The decision memo is unavailable for this proposal version.",
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
    label: "Adviser decision memo",
    status: approvalIsIncomplete
      ? "Review evidence incomplete"
      : approved
      ? "Approved for adviser use"
      : rejected
        ? "Revision required"
        : "Review required",
    tone: approved ? "success" : rejected ? "danger" : "warn",
    summary: approvalIsIncomplete
      ? "The approval state has no complete review record."
      : approved
      ? `Reviewed ${formatDateValue(memo.reviewed_at)}.`
      : "A completed adviser-use memo review is still required.",
    source: PROPOSAL_DISCUSSION_PACK_COPY.controlSources.memo,
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
        "The report package is available but does not include the reviewed adviser narrative.",
      source:
        evidence.source_service === "lotus-report"
          ? PROPOSAL_DISCUSSION_PACK_COPY.controlSources.reportPackage
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
        ? PROPOSAL_DISCUSSION_PACK_COPY.controlSources.reportPackage
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
      status: "Record incomplete",
      tone: "warn",
      summary:
        "The consent state has no complete approval, actor and date record.",
      source: PROPOSAL_DISCUSSION_PACK_COPY.controlSources.consent,
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
    source: PROPOSAL_DISCUSSION_PACK_COPY.controlSources.consent,
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
    summary: PROPOSAL_DISCUSSION_PACK_COPY.releaseSummary,
    source: PROPOSAL_DISCUSSION_PACK_COPY.controlSources.release,
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
    status: proposalDiscussionCapabilityStateLabel(state),
    tone: capabilityTone(state),
    summary,
    source: PROPOSAL_DISCUSSION_PACK_COPY.controlSources.currentVersion,
  };
}

function capabilityTone(
  state: ProposalDiscussionCapabilityState,
): SemanticBadgeTone {
  if (state === "supported") return "success";
  if (state === "restricted" || state === "unavailable") return "danger";
  if (state === "partial") return "warn";
  return "default";
}
