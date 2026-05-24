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
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  proposalId: string;
  currentVersionNo?: number | null;
};

const projectionAudiences = ["ADVISOR", "COMPLIANCE", "OPERATIONS", "CLIENT_DRAFT"] as const;

function textValue(value: unknown, fallback = "Not reported"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => String(item)).join(", ");
  }
  return fallback;
}

function recordValue(source: Record<string, unknown> | undefined, key: string): unknown {
  return source?.[key];
}

function firstString(source: Record<string, unknown> | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export default function ProposalMemoPosturePanel({ proposalId, currentVersionNo }: Props) {
  const [versionNo, setVersionNo] = useState(currentVersionNo ?? 1);
  const [actorId, setActorId] = useState("advisor_1");
  const [reviewReason, setReviewReason] = useState("");
  const [audience, setAudience] = useState<(typeof projectionAudiences)[number]>("ADVISOR");
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

  const memoHash = useMemo(() => {
    const memo = memoQuery.data?.memo as Record<string, unknown> | undefined;
    return (
      firstString(memoQuery.data, ["memo_hash", "source_memo_hash"]) ??
      firstString(memo, ["memo_hash", "source_memo_hash"])
    );
  }, [memoQuery.data]);
  const reviewPosture = memoQuery.data?.review_posture as Record<string, unknown> | undefined;
  const reportPosture = memoQuery.data?.report_package_posture as Record<string, unknown> | undefined;
  const aiPosture = memoQuery.data?.ai_commentary_posture as Record<string, unknown> | undefined;
  const readPosture = memoQuery.data?.read_posture as Record<string, unknown> | undefined;
  const projection = projectionQuery.data?.projection;
  const projectionPosture = projectionQuery.data?.projection_posture;
  const latestMemo = lineageQuery.data?.memos?.[0];
  const replayHashes = replayQuery.data?.hashes;
  const replaySupportability = replayQuery.data?.supportability;

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

  const hasMemo = Boolean(memoQuery.data?.memo_id || memoHash);
  const supportability =
    firstString(readPosture, ["supportability", "status"]) ??
    firstString(projectionPosture, ["supportability", "status"]) ??
    firstString(replaySupportability, ["supportability", "status"]);

  return (
    <SectionBlock
      className="proposal-memo-posture-panel"
      title="Advisor Memo Product Surface"
      subtitle="Memo review, projection, report-package, archive-reference, replay, and AI-commentary posture from the Gateway advisory contract."
      actions={
        <SemanticBadge tone={hasMemo ? "success" : "warn"}>
          {textValue(memoQuery.data?.memo_status, hasMemo ? "Memo Available" : "Memo Pending")}
        </SemanticBadge>
      }
    >
      {memoQuery.error || projectionQuery.error || lineageQuery.error || replayQuery.error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Memo posture is degraded or blocked by Gateway. Workbench keeps source-owned memo facts,
          supportability, and readiness unchanged.
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
          <Text variant="metricValueCompact">
            {textValue(recordValue(reviewPosture, "advisor_use"), "Pending")}
          </Text>
          <Text variant="secondary">Memo hash: {memoHash ?? "Not available"}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Projection Audience</Text>
          <Text variant="metricValueCompact">
            {textValue(recordValue(projection, "audience"), audience)}
          </Text>
          <Text variant="secondary">
            Client draft: {textValue(recordValue(projection, "client_ready_publication"), "Blocked")}
          </Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Supportability</Text>
          <Text variant="metricValueCompact">{supportability ?? "Not reported"}</Text>
          <Text variant="secondary">
            Replay hash: {textValue(recordValue(replayHashes, "memo_hash"), "Not available")}
          </Text>
        </div>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <div className="analytics-stat">
          <Text variant="label">Report Package</Text>
          <Text variant="metricValueCompact">
            {textValue(recordValue(reportPosture, "status"), "Not requested")}
          </Text>
          <Text variant="secondary">
            Archive refs: {textValue(recordValue(reportPosture, "archive_refs"), "None")}
          </Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">AI Commentary</Text>
          <Text variant="metricValueCompact">
            {textValue(recordValue(aiPosture, "status"), "Not requested")}
          </Text>
          <Text variant="secondary">
            Authority: {textValue(recordValue(aiPosture, "authority"), "Non-authoritative")}
          </Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Lineage</Text>
          <Text variant="metricValueCompact">
            {textValue(latestMemo?.memo_status, "No lineage memo")}
          </Text>
          <Text variant="secondary">{latestMemo?.memo_hash ?? "No lineage hash"}</Text>
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
            onChange={(event) =>
              setAudience(event.target.value as (typeof projectionAudiences)[number])
            }
          >
            {projectionAudiences.map((item) => (
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
        Workbench uses Gateway memo endpoints only. It does not infer memo facts, promote
        client-ready release, render documents, synthesize archive references, or treat AI
        commentary as authoritative memo evidence.
      </Text>
    </SectionBlock>
  );
}
