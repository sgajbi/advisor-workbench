"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Stack } from "@mui/material";

import {
  createProposalReportRequest,
  getProposalDeliveryEvents,
  getProposalDeliverySummary,
  reviewProposalNarrative,
} from "../api";
import {
  buildProposalNarrativePostureModel,
  formatEvidenceHash,
} from "../proposal-narrative-posture-view-model";
import { buildProposalActionIdempotencyKey } from "../proposal-workflow-copy";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { SectionBlock, SemanticBadge, Text } from "@/design-system";

type Props = {
  proposalId: string;
  currentVersionNo?: number | null;
};

export default function ProposalNarrativePosturePanel({
  proposalId,
  currentVersionNo,
}: Props) {
  const [versionNo, setVersionNo] = useState(currentVersionNo ?? 1);
  const [reviewedBy, setReviewedBy] = useState("advisor_1");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewData, setReviewData] =
    useState<Awaited<ReturnType<typeof reviewProposalNarrative>> | null>(null);
  const [reportData, setReportData] =
    useState<Awaited<ReturnType<typeof createProposalReportRequest>> | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["proposal-delivery-summary", proposalId],
    queryFn: async () => await getProposalDeliverySummary(proposalId),
    ...workbenchStrictQueryDefaults,
  });
  const eventsQuery = useQuery({
    queryKey: ["proposal-delivery-events", proposalId],
    queryFn: async () => await getProposalDeliveryEvents(proposalId),
    ...workbenchStrictQueryDefaults,
  });

  const posture = useMemo(
    () =>
      buildProposalNarrativePostureModel({
        review: reviewData,
        report: reportData,
        summary: summaryQuery.data,
        events: eventsQuery.data,
      }),
    [eventsQuery.data, reportData, reviewData, summaryQuery.data],
  );

  const canSubmit = reviewedBy.trim().length > 0 && reviewReason.trim().length > 0;

  async function handleApproveNarrative() {
    if (!canSubmit) {
      return;
    }
    setPendingAction("review");
    setActionError(null);
    try {
      const data = await reviewProposalNarrative(
        proposalId,
        versionNo,
        {
          action: "APPROVE",
          reviewed_by: reviewedBy.trim(),
          reason: reviewReason.trim(),
          client_ready_release_requested: false,
        },
        buildProposalActionIdempotencyKey(proposalId, `narrative-review-${versionNo}`),
      );
      setReviewData(data);
      setReviewReason("");
      await Promise.all([summaryQuery.refetch(), eventsQuery.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown narrative review error");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRequestReport() {
    setPendingAction("report");
    setActionError(null);
    try {
      const data = await createProposalReportRequest(proposalId, {
        report_type: "PORTFOLIO_REVIEW",
        requested_by: reviewedBy.trim() || "advisor_1",
        related_version_no: versionNo,
        include_execution_summary: true,
        include_reviewed_narrative: true,
      });
      setReportData(data);
      await Promise.all([summaryQuery.refetch(), eventsQuery.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown report request error");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SectionBlock
      className="proposal-narrative-posture-panel"
      title="Advisor Narrative And Delivery"
      subtitle="Review advisor-use rationale, request reviewed report packaging, and inspect delivery posture before client discussion."
      actions={
        <SemanticBadge tone={posture.sourceNarrativeHash ? "success" : "warn"}>
          {posture.reviewState}
        </SemanticBadge>
      }
    >
      {summaryQuery.error || eventsQuery.error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Delivery posture is not fully available from advisory evidence. Review and report actions
          remain bounded by the advisory workflow authority.
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
          <Text variant="metricValueCompact">{posture.reviewState}</Text>
          <Text variant="secondary">{posture.policyVersion ?? "Policy version pending"}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Report Package</Text>
          <Text variant="metricValueCompact">{posture.reportPackageState}</Text>
          <Text variant="secondary">Delivery: {posture.deliveryState}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Delivery Events</Text>
          <Text variant="metricValueCompact">{String(posture.eventCount)}</Text>
          <Text variant="secondary">{posture.latestEventLabel}</Text>
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
          <Text variant="label">Reviewed by</Text>
          <input
            className="input"
            value={reviewedBy}
            onChange={(event) => setReviewedBy(event.target.value)}
            placeholder="advisor_1"
            autoComplete="off"
          />
        </label>
        <label className="proposal-review-field proposal-review-field-wide">
          <Text variant="label">Review rationale</Text>
          <textarea
            className="textarea"
            rows={3}
            value={reviewReason}
            onChange={(event) => setReviewReason(event.target.value)}
            placeholder="Evidence-grounded and suitable for advisor use."
          />
        </label>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
        <Button
          type="button"
          variant="contained"
          disabled={!canSubmit || pendingAction !== null}
          onClick={() => void handleApproveNarrative()}
        >
          {pendingAction === "review" ? "Recording Review..." : "Approve Advisor Narrative"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={pendingAction !== null}
          onClick={() => void handleRequestReport()}
        >
          {pendingAction === "report" ? "Requesting Report..." : "Request Reviewed Report"}
        </Button>
      </Stack>

      <Text variant="metadata">
        Source narrative hash: {formatEvidenceHash(posture.sourceNarrativeHash)}
      </Text>
      {posture.latestEventTime ? (
        <Text variant="metadata">Latest delivery event time: {posture.latestEventTime}</Text>
      ) : null}
      <Text variant="secondary">
        Advisor-use review and report packaging preserve approved source evidence. This workspace
        does not generate narrative, infer client-ready publication, render documents, archive
        artifacts, or contact clients.
      </Text>
    </SectionBlock>
  );
}
