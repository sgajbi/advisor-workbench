"use client";

import { Alert } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  ActionButton,
  AiAssistanceDisclosure,
  SemanticBadge,
  Text,
} from "@/design-system";
import { getWorkbenchApiErrorStatus } from "@/features/workbench/api-client";

import { requestAdvisorIdeaAIExplanation } from "../api";
import {
  ADVISOR_RATIONALE_DRAFT_PURPOSE,
  isSameAdvisorIdeaEvidence,
  readAdvisorIdeaEvidenceIdentity,
  type AdvisorIdeaEvidenceIdentity,
  type AdvisorIdeaAIExplanationRequest,
} from "../idea-ai-explanation-contract";
import { createIdeaPresentationIdempotencyKey } from "../idea-presentation-receipt";
import {
  recordIdeaExplanationOpened,
  recordIdeaExplanationServed,
  recordIdeaExplanationUnavailable,
  recordIdeaExplanationFailed,
} from "../idea-ai-explanation-telemetry";
import {
  buildAdvisorIdeaExplanationViewModel,
  type AdvisorIdeaExplanationViewModel,
} from "../idea-ai-explanation-view-model";
import styles from "./idea-candidate-explanation.module.css";

type ExplanationSubmission = {
  evidenceIdentity: AdvisorIdeaEvidenceIdentity;
  request: AdvisorIdeaAIExplanationRequest;
  idempotencyKey: string;
};

type ExplanationMutationVariables = {
  evidenceIdentity: AdvisorIdeaEvidenceIdentity;
  submission?: ExplanationSubmission;
};

export default function IdeaCandidateExplanation({
  candidateId,
  evidenceIdentity,
  portfolioId,
}: {
  candidateId: string;
  evidenceIdentity?: AdvisorIdeaEvidenceIdentity;
  portfolioId: string;
}) {
  const retryableSubmission = useRef<ExplanationSubmission | undefined>(
    undefined,
  );
  const currentEvidenceIdentity = useRef(evidenceIdentity);
  useEffect(() => {
    currentEvidenceIdentity.current = evidenceIdentity;
  }, [evidenceIdentity]);
  const mutation = useMutation({
    mutationFn: async (variables: ExplanationMutationVariables) => {
      const submission =
        variables.submission ??
        createSubmission(candidateId, variables.evidenceIdentity);
      retryableSubmission.current = submission;
      return await requestAdvisorIdeaAIExplanation({
        candidateId,
        portfolioId,
        ...submission,
      });
    },
    onSuccess: (response, variables) => {
      retryableSubmission.current = undefined;
      if (
        !isSameAdvisorIdeaEvidence(
          variables.evidenceIdentity,
          currentEvidenceIdentity.current,
        )
      ) {
        recordIdeaExplanationUnavailable("candidate_evidence_changed");
      } else if (response.status === "EXPLANATION_SERVED") {
        recordIdeaExplanationServed(response.disposition);
      } else {
        recordIdeaExplanationUnavailable(response.disposition);
      }
    },
    onError: (error) => {
      if (getWorkbenchApiErrorStatus(error) === 409) {
        retryableSubmission.current = undefined;
      }
      recordIdeaExplanationFailed();
    },
  });

  function requestExplanation() {
    if (!evidenceIdentity) {
      return;
    }
    recordIdeaExplanationOpened();
    const retryable = retryableSubmission.current;
    mutation.mutate(
      {
        evidenceIdentity,
        ...(retryable &&
        isSameAdvisorIdeaEvidence(retryable.evidenceIdentity, evidenceIdentity)
          ? { submission: retryable }
          : {}),
      },
    );
  }

  const responseEvidenceIdentity = mutation.data
    ? readAdvisorIdeaEvidenceIdentity(
        mutation.data.explanation.redactedEvidence,
      )
    : undefined;
  const responseIsCurrent = Boolean(
    mutation.data &&
      mutation.variables &&
      isSameAdvisorIdeaEvidence(
        evidenceIdentity,
        mutation.variables.evidenceIdentity,
      ) &&
      isSameAdvisorIdeaEvidence(evidenceIdentity, responseEvidenceIdentity),
  );
  const model = mutation.data && responseIsCurrent
    ? buildAdvisorIdeaExplanationViewModel(mutation.data)
    : undefined;
  const isSuperseded = Boolean(mutation.data && !responseIsCurrent);

  return (
    <section
      className={styles.panel}
      aria-labelledby={`idea-explanation-title-${candidateId}`}
      data-testid="idea-candidate-explanation"
      data-explanation-state={
        mutation.isPending
          ? "loading"
          : mutation.isError
            ? "unavailable"
            : isSuperseded
              ? "superseded"
              : model?.state ?? "not-requested"
      }
    >
      <div className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.eyebrow}>
            <Text variant="microLabel">Decision support</Text>
            <SemanticBadge tone="default">Internal draft</SemanticBadge>
          </div>
          <h4 id={`idea-explanation-title-${candidateId}`}>
            Why this opportunity surfaced
          </h4>
          <Text variant="secondary">
            Review why the opportunity was surfaced and where evidence is
            incomplete before deciding. Candidate facts and actions remain
            independent.
          </Text>
        </div>
        <ActionButton
          priority="secondary"
          type="button"
          disabled={mutation.isPending || !evidenceIdentity}
          onClick={requestExplanation}
        >
          {mutation.isPending
            ? "Preparing explanation..."
            : !evidenceIdentity
              ? "Explanation unavailable"
              : mutation.isError
              ? "Retry explanation"
              : model
                ? "Refresh explanation"
                : "Explain this idea"}
        </ActionButton>
      </div>

      {!evidenceIdentity ? (
        <Alert severity="info" data-testid="idea-explanation-evidence-unavailable">
          A current rationale cannot be requested because the opportunity record
          does not include its evidence identity. Opportunity facts and advisor
          actions remain available.
        </Alert>
      ) : null}

      {mutation.error ? (
        <Alert severity="warning" data-testid="idea-explanation-error">
          {explanationFailureCopy(mutation.error)} Candidate facts and advisor
          actions remain available.
        </Alert>
      ) : null}

      {isSuperseded ? (
        <Alert severity="info" data-testid="idea-explanation-superseded">
          The earlier rationale is no longer current because the opportunity
          evidence changed. Request an updated explanation before relying on it.
        </Alert>
      ) : null}

      {model ? (
        <div
          className={styles.result}
          data-testid="idea-explanation-result"
          data-idea-explanation-source="lotus-idea"
          data-candidate-id={mutation.data?.explanation.candidateId}
          data-explanation-status={mutation.data?.status}
        >
          <div className={styles.resultHeader}>
            <SemanticBadge tone={model.state === "served" ? "success" : "warn"}>
              {model.state === "served"
                ? "Rationale available"
                : "AI explanation unavailable"}
            </SemanticBadge>
            <span>{model.dispositionLabel}</span>
          </div>
          <p className={styles.summary}>{model.displayText}</p>
          <AiAssistanceDisclosure disclosure={model.disclosure} />
          <EvidenceSources
            candidateId={candidateId}
            sources={model.supportingSources}
          />

          {model.state === "served" ? (
            <div className={styles.evidenceGrid}>
              <section aria-labelledby={`idea-rationale-${candidateId}`}>
                <h5 id={`idea-rationale-${candidateId}`}>Grounded rationale</h5>
                {model.rationale.length > 0 ? (
                  <ol className={styles.claims}>
                    {model.rationale.map((claim) => (
                      <li key={claim.id}>
                        <strong>{claim.text}</strong>
                        {claim.sources.length > 0 ? (
                          <ul className={styles.sources} aria-label="Claim sources">
                            {claim.sources.map((source) => (
                              <li key={source.id}>
                                {source.identity} · {source.asOf} · {source.freshness} ·{" "}
                                {source.quality}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className={styles.notReported}>
                            Claim source references were not published.
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.notReported}>
                    The source returned a summary without grounded claim detail.
                  </p>
                )}
              </section>
              <ExplanationEvidenceLimits
                candidateId={candidateId}
                detailAvailable={model.evidenceDetailAvailable}
                gaps={model.evidenceGaps}
                signals={model.evidenceSignals}
              />
            </div>
          ) : (
            <div className={styles.evidenceGrid}>
              <Alert severity="info" data-testid="idea-explanation-fallback">
                <strong>Deterministic evidence summary</strong>
                <div>{model.deterministicFallback}</div>
              </Alert>
              <ExplanationEvidenceLimits
                candidateId={candidateId}
                detailAvailable={model.evidenceDetailAvailable}
                gaps={model.evidenceGaps}
                signals={model.evidenceSignals}
              />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function EvidenceSources({
  candidateId,
  sources,
}: {
  candidateId: string;
  sources: AdvisorIdeaExplanationViewModel["supportingSources"];
}) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={`idea-supporting-evidence-${candidateId}`}>
      <h5 id={`idea-supporting-evidence-${candidateId}`}>Supporting evidence</h5>
      <ul className={styles.sources}>
        {sources.map((source) => (
          <li key={source.id}>
            {source.identity} · {source.asOf} · {source.freshness} · {source.quality}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExplanationEvidenceLimits({
  candidateId,
  detailAvailable,
  gaps,
  signals,
}: {
  candidateId: string;
  detailAvailable: boolean;
  gaps: string[];
  signals: string[];
}) {
  return (
    <section aria-labelledby={`idea-evidence-limits-${candidateId}`}>
      <h5 id={`idea-evidence-limits-${candidateId}`}>Evidence limits</h5>
      {!detailAvailable ? (
        <p className={styles.notReported}>
          The source did not publish evidence-gap detail.
        </p>
      ) : (
        <>
          <EvidenceList
            label="Evidence gaps"
            values={gaps}
            empty="No unsupported evidence was reported."
          />
          <EvidenceList
            label="Source signals"
            values={signals}
            empty="No source reason codes were reported."
          />
        </>
      )}
    </section>
  );
}

function EvidenceList({
  empty,
  label,
  values,
}: {
  empty: string;
  label: string;
  values: string[];
}) {
  return (
    <div className={styles.evidenceList}>
      <strong>{label}</strong>
      {values.length > 0 ? (
        <ul>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <span>{empty}</span>
      )}
    </div>
  );
}

function createSubmission(
  candidateId: string,
  evidenceIdentity: AdvisorIdeaEvidenceIdentity,
): ExplanationSubmission {
  const requestId = createSecureId(`idea-explanation-${candidateId}`);
  return {
    evidenceIdentity,
    request: {
      requestId,
      purpose: ADVISOR_RATIONALE_DRAFT_PURPOSE,
      requestedAtUtc: new Date().toISOString(),
    },
    idempotencyKey: requestId,
  };
}

function createSecureId(prefix: string): string {
  try {
    return `${prefix}-${createIdeaPresentationIdempotencyKey()}`;
  } catch {
    throw new Error("Secure request identity is unavailable in this browser.");
  }
}

function explanationFailureCopy(error: unknown): string {
  if (
    error instanceof Error &&
    error.message === "Secure request identity is unavailable in this browser."
  ) {
    return "A protected request reference could not be created. Reload Workbench before trying again.";
  }
  if (
    error instanceof Error &&
    error.message ===
      "Idea explanation response did not match the requested candidate evidence."
  ) {
    return "The returned rationale does not match the current opportunity evidence. Refresh the opportunity before trying again.";
  }
  const status = getWorkbenchApiErrorStatus(error);
  if (status === 401 || status === 403) {
    return "Idea explanations are not available for your current access.";
  }
  if (status === 404) {
    return "An explanation is not available for this opportunity.";
  }
  if (status === 409) {
    return "The opportunity evidence changed or conflicts with the prior request. Refresh the opportunity before trying again.";
  }
  if (status === 422) {
    return "The source could not validate this explanation request.";
  }
  return "The governed explanation service is temporarily unavailable.";
}
