"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Stack } from "@mui/material";

import {
  createProposalMemo,
  getProposalMemo,
  getProposalMemoLineage,
  getProposalMemoProjection,
  getProposalMemoReplayEvidence,
  requestProposalMemoAiCommentary,
  requestProposalMemoReportPackage,
  reviewProposalMemo,
} from "../api";
import { buildProposalActionIdempotencyKey } from "../proposal-workflow-copy";
import {
  buildProposalMemoPostureModel,
  PROPOSAL_MEMO_PROJECTION_AUDIENCES,
  type ProposalMemoProjectionAudience,
} from "../proposal-memo-posture-view-model";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  proposalId: string;
  currentVersionNo?: number | null;
};

export default function ProposalMemoPosturePanel({ proposalId, currentVersionNo }: Props) {
  const [versionNo, setVersionNo] = useState(currentVersionNo ?? 1);
  const [actorId, setActorId] = useState("advisor_1");
  const [reviewReason, setReviewReason] = useState("");
  const [audience, setAudience] = useState<ProposalMemoProjectionAudience>("ADVISOR");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const memoQuery = useQuery({
    queryKey: ["proposal-memo", proposalId, versionNo],
    queryFn: async () => await getProposalMemo(proposalId, versionNo),
    ...workbenchStrictQueryDefaults,
  });
  const projectionQuery = useQuery({
    queryKey: ["proposal-memo-projection", proposalId, versionNo, audience],
    queryFn: async () => await getProposalMemoProjection(proposalId, versionNo, audience),
    ...workbenchStrictQueryDefaults,
  });
  const lineageQuery = useQuery({
    queryKey: ["proposal-memo-lineage", proposalId],
    queryFn: async () => await getProposalMemoLineage(proposalId),
    ...workbenchStrictQueryDefaults,
  });
  const replayQuery = useQuery({
    queryKey: ["proposal-memo-replay-evidence", proposalId, versionNo],
    queryFn: async () => await getProposalMemoReplayEvidence(proposalId, versionNo),
    ...workbenchStrictQueryDefaults,
  });

  const memoPosture = useMemo(
    () =>
      buildProposalMemoPostureModel({
        lineageData: lineageQuery.data,
        memoData: memoQuery.data,
        projectionData: projectionQuery.data,
        replayData: replayQuery.data,
        selectedAudience: audience,
      }),
    [audience, lineageQuery.data, memoQuery.data, projectionQuery.data, replayQuery.data],
  );
  const memoHash = memoPosture.memoHash;

  async function refreshMemoState() {
    await Promise.all([
      memoQuery.refetch(),
      projectionQuery.refetch(),
      lineageQuery.refetch(),
      replayQuery.refetch(),
    ]);
  }

  async function handleCreateMemo() {
    setPendingAction("create");
    setActionError(null);
    try {
      await createProposalMemo(
        proposalId,
        versionNo,
        {
          created_by: actorId.trim() || "advisor_1",
          lifecycle_status: "DRAFT",
          reason: { source: "workbench", purpose: "advisor memo review" },
        },
        buildProposalActionIdempotencyKey(proposalId, `memo-create-${versionNo}`)
      );
      await refreshMemoState();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown memo creation error");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleApproveMemo() {
    if (!memoHash || reviewReason.trim().length === 0) {
      return;
    }
    setPendingAction("review");
    setActionError(null);
    try {
      await reviewProposalMemo(
        proposalId,
        versionNo,
        {
          action: "APPROVE_FOR_ADVISOR_USE",
          reviewed_by: actorId.trim() || "advisor_1",
          reason: reviewReason.trim(),
          source_memo_hash: memoHash,
          client_ready_release_requested: false,
        },
        buildProposalActionIdempotencyKey(proposalId, `memo-review-${versionNo}`)
      );
      setReviewReason("");
      await refreshMemoState();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown memo review error");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRequestReportPackage() {
    if (!memoHash) {
      return;
    }
    setPendingAction("report");
    setActionError(null);
    try {
      await requestProposalMemoReportPackage(
        proposalId,
        versionNo,
        {
          requested_by: actorId.trim() || "advisor_1",
          source_memo_hash: memoHash,
          requested_output_formats: ["pdf"],
          client_ready_document_requested: false,
          reason: { source: "workbench", purpose: "advisor-use memo package" },
        },
        buildProposalActionIdempotencyKey(proposalId, `memo-report-package-${versionNo}`)
      );
      await refreshMemoState();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown memo report-package error");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRequestAiCommentary() {
    if (!memoHash) {
      return;
    }
    setPendingAction("ai");
    setActionError(null);
    try {
      await requestProposalMemoAiCommentary(
        proposalId,
        versionNo,
        {
          requested_by: actorId.trim() || "advisor_1",
          source_memo_hash: memoHash,
          requested_sections: ["EXECUTIVE_SUMMARY", "LIMITATIONS_AND_DISCLOSURES"],
          reason: { source: "workbench", purpose: "advisor-use commentary" },
        },
        buildProposalActionIdempotencyKey(proposalId, `memo-ai-commentary-${versionNo}`)
      );
      await refreshMemoState();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown AI commentary error");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SectionBlock
      className="proposal-memo-posture-panel"
      title="Advisor Memo And Evidence Pack"
      subtitle="Review memo readiness, audience projection, report package, replay, and commentary posture before client discussion."
      actions={
        <SemanticBadge tone={memoPosture.hasMemo ? "success" : "warn"}>
          {memoPosture.statusLabel}
        </SemanticBadge>
      }
    >
      {memoQuery.error || projectionQuery.error || lineageQuery.error || replayQuery.error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Memo posture is degraded or blocked by source advisory evidence. Existing memo facts,
          supportability, and readiness remain unchanged.
        </Alert>
      ) : null}
      {actionError ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {actionError}
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <div className="analytics-stat">
          <Text variant="label">Review Posture</Text>
          <Text variant="metricValueCompact">{memoPosture.reviewPostureLabel}</Text>
          <Text variant="secondary">Memo hash: {memoHash ?? "Not available"}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Projection Audience</Text>
          <Text variant="metricValueCompact">{memoPosture.projectionAudienceLabel}</Text>
          <Text variant="secondary">
            Client draft: {memoPosture.clientDraftPublicationLabel}
          </Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Supportability</Text>
          <Text variant="metricValueCompact">{memoPosture.supportabilityLabel}</Text>
          <Text variant="secondary">Replay hash: {memoPosture.replayHashLabel}</Text>
        </div>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <div className="analytics-stat">
          <Text variant="label">Report Package</Text>
          <Text variant="metricValueCompact">{memoPosture.reportPackageStatusLabel}</Text>
          <Text variant="secondary">Archive refs: {memoPosture.reportArchiveRefsLabel}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">AI Commentary</Text>
          <Text variant="metricValueCompact">{memoPosture.aiCommentaryStatusLabel}</Text>
          <Text variant="secondary">Authority: {memoPosture.aiAuthorityLabel}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Lineage</Text>
          <Text variant="metricValueCompact">{memoPosture.lineageStatusLabel}</Text>
          <Text variant="secondary">{memoPosture.lineageHashLabel}</Text>
        </div>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <label className="proposal-review-field">
          <Text variant="label">Version</Text>
          <input
            className="input"
            type="number"
            min={1}
            value={versionNo}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setVersionNo(Number.isNaN(next) ? 1 : next);
            }}
          />
        </label>
        <label className="proposal-review-field">
          <Text variant="label">Actor</Text>
          <input
            className="input"
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="advisor_1"
            autoComplete="off"
          />
        </label>
        <label className="proposal-review-field">
          <Text variant="label">Projection</Text>
          <select
            className="input"
            value={audience}
            onChange={(event) => setAudience(event.target.value as ProposalMemoProjectionAudience)}
          >
            {PROPOSAL_MEMO_PROJECTION_AUDIENCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="proposal-review-field proposal-review-field-wide">
          <Text variant="label">Review rationale</Text>
          <textarea
            className="textarea"
            rows={3}
            value={reviewReason}
            onChange={(event) => setReviewReason(event.target.value)}
            placeholder="Evidence-backed memo is ready for advisor use."
          />
        </label>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
        <Button type="button" variant="outlined" disabled={pendingAction !== null} onClick={handleCreateMemo}>
          {pendingAction === "create" ? "Creating Memo..." : "Create Or Replay Memo"}
        </Button>
        <Button
          type="button"
          variant="contained"
          disabled={!memoHash || reviewReason.trim().length === 0 || pendingAction !== null}
          onClick={handleApproveMemo}
        >
          {pendingAction === "review" ? "Recording Review..." : "Approve Memo For Advisor Use"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={!memoHash || pendingAction !== null}
          onClick={handleRequestReportPackage}
        >
          {pendingAction === "report" ? "Requesting Package..." : "Request Memo Report Package"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={!memoHash || pendingAction !== null}
          onClick={handleRequestAiCommentary}
        >
          {pendingAction === "ai" ? "Requesting Commentary..." : "Request AI Commentary"}
        </Button>
      </Stack>

      <Text variant="secondary">
        Advisor-use memo actions preserve source evidence and do not promote client-ready release,
        render documents, synthesize archive references, or treat AI commentary as authoritative
        memo evidence.
      </Text>
    </SectionBlock>
  );
}
