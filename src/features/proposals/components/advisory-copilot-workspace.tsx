"use client";

import { useMemo, useState } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  ActionButton,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import {
  createAdvisoryCopilotEvidencePacketFromProposalVersion,
  getAdvisoryCopilotSupportability,
  listProposals,
  reviewAdvisoryCopilotRun,
  runAdvisoryCopilotAction,
} from "../api";
import {
  buildAdvisoryCopilotWorkspaceModel,
  formatCode,
  type AdvisoryCopilotActionOption,
} from "../advisory-copilot-view-model";
import type {
  AdvisoryCopilotEvidencePacketData,
  AdvisoryCopilotRunData,
} from "../types";
import styles from "./advisory-copilot-workspace.module.css";

const ADVISOR_ID = "advisor_sg_001";
const REVIEWER_ID = "desk_head_sg_001";

export default function AdvisoryCopilotWorkspace({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const [latestPacket, setLatestPacket] = useState<
    AdvisoryCopilotEvidencePacketData | undefined
  >();
  const [latestRun, setLatestRun] = useState<AdvisoryCopilotRunData | undefined>();
  const proposalQuery = useQuery({
    queryKey: ["advisory-copilot-proposals", portfolioId],
    queryFn: async () =>
      await listProposals({
        portfolioId,
        limit: 5,
      }),
    ...workbenchStrictQueryDefaults,
  });
  const supportabilityQuery = useQuery({
    queryKey: ["advisory-copilot-supportability"],
    queryFn: async () => await getAdvisoryCopilotSupportability(),
    ...workbenchStrictQueryDefaults,
  });
  const model = useMemo(
    () =>
      buildAdvisoryCopilotWorkspaceModel({
        proposals: proposalQuery.data?.items ?? [],
        supportability: supportabilityQuery.data,
        packet: latestPacket,
        run: latestRun,
      }),
    [proposalQuery.data, supportabilityQuery.data, latestPacket, latestRun],
  );
  const runMutation = useMutation({
    mutationFn: async (option: AdvisoryCopilotActionOption) => {
      const proposal = model.proposal;
      if (!proposal?.proposal_id || !proposal.current_version_no) {
        throw new Error("No proposal version is available for copilot review.");
      }
      const packet = await createAdvisoryCopilotEvidencePacketFromProposalVersion({
        proposal_id: proposal.proposal_id,
        proposal_version_no: proposal.current_version_no,
        action_family: option.family,
        audience: option.audience,
        created_by: ADVISOR_ID,
        reason: {
          business_reason: "Prepare advisor-use copilot review.",
        },
      });
      const evidencePacketId = packet.evidence_packet?.evidence_packet_id;
      if (!evidencePacketId) {
        throw new Error("Copilot evidence packet was not returned by Gateway.");
      }
      const run = await runAdvisoryCopilotAction(
        {
          evidence_packet_id: evidencePacketId,
          audience: option.audience,
          requested_outputs: [option.outputKey],
          requested_by: ADVISOR_ID,
          requested_intents: [option.intent],
          user_instruction: "",
          reason: {
            business_reason: "Prepare advisor-use copilot review.",
          },
        },
        `ui-copilot-run-${option.family}-${proposal.proposal_id}-${proposal.current_version_no}-${evidencePacketId}`,
      );
      return { packet, run };
    },
    onSuccess: ({ packet, run }) => {
      setLatestPacket(packet);
      setLatestRun(run);
    },
  });
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const runId = latestRun?.run?.run_id;
      if (!runId) {
        throw new Error("No copilot run is available for review.");
      }
      return await reviewAdvisoryCopilotRun(
        runId,
        {
          action: "APPROVE_FOR_INTERNAL_USE",
          actor_id: REVIEWER_ID,
          reason: {
            decision: "Reviewed against source evidence for internal advisor use.",
          },
        },
        `ui-copilot-review-${runId}`,
      );
    },
    onSuccess: (review) => {
      setLatestRun(review);
    },
  });
  const isLoading = proposalQuery.isLoading || supportabilityQuery.isLoading;
  const hasError = Boolean(proposalQuery.error || supportabilityQuery.error);
  const canRecordInternalReview =
    Boolean(latestRun?.run?.run_id) &&
    latestRun?.run?.review_posture === "REVIEW_REQUIRED";

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading advisory copilot...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Advisory Copilot"
      subtitle="Gateway-backed advisor-use copilot actions, evidence projection, review posture, and publication boundaries."
    >
      {hasError ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Advisory copilot supportability or proposal scope is unavailable. No
          fallback copilot action is shown.
        </Alert>
      ) : null}
      <div className={styles.copilotHeader}>
        <div className={styles.decisionPanel}>
          <div>
            <Text variant="microLabel">Advisor Decision</Text>
            <Text variant="subsectionTitle" as="h2">
              Prepare source-backed advisor review
            </Text>
            <Text variant="secondary">
              Use the selected proposal version and Advise-owned source projection before
              relying on generated output.
            </Text>
          </div>
          <SemanticBadge tone="warn">Client-ready blocked</SemanticBadge>
        </div>
        <div className={styles.metricGrid} aria-label="Advisory copilot posture">
          {model.supportabilityRows.map((row) => (
            <div className={styles.metricTile} key={row.label}>
              <Text variant="microLabel">{row.label}</Text>
              <strong>{row.value}</strong>
              <SemanticBadge tone={row.tone}>{row.label}</SemanticBadge>
            </div>
          ))}
        </div>
      </div>

      {!model.proposal ? (
        <ScreenStatePanel
          kind="empty"
          title="No advisory proposal in scope"
          body={`No Gateway-backed advisory proposal is available for ${portfolioId}.`}
          surface="default"
        />
      ) : (
        <AdvisoryCopilotActionGrid
          actions={model.availableActions}
          pendingFamily={
            runMutation.isPending ? runMutation.variables?.family : undefined
          }
          onRun={(option) => runMutation.mutate(option)}
        />
      )}

      {runMutation.error ? (
        <Alert severity="warning">
          Advisory copilot action could not be completed through Gateway.
        </Alert>
      ) : null}

      <SectionBlock
        title="Source Evidence"
        subtitle="Advise-owned evidence projection and unsupported-evidence posture."
      >
        {model.packetSections.length > 0 ? (
          <div className={styles.evidenceGrid}>
            {model.packetSections.map((section) => (
              <div className={styles.evidenceItem} key={section.title}>
                <Text variant="microLabel">{section.title}</Text>
                <strong>Available</strong>
                <Text variant="secondary">{section.summary}</Text>
              </div>
            ))}
          </div>
        ) : (
          <ScreenStatePanel
            kind="empty"
            title="No copilot evidence packet requested"
            body="Select a copilot action to request an Advise-owned evidence packet through Gateway."
            surface="default"
          />
        )}
        {model.unsupportedEvidence.length > 0 ? (
          <ul className={styles.unsupportedList} aria-label="Unsupported evidence">
            {model.unsupportedEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Review Posture"
        subtitle="Human review and client-publication boundary."
      >
        <div className={styles.reviewPanel}>
          <div className={styles.reviewHeader}>
            <div>
              <Text variant="microLabel">Run posture</Text>
              <Text variant="subsectionTitle" as="h2">
                {model.runPosture}
              </Text>
              <Text variant="secondary">
                Client publication: {model.clientReadyPosture}
              </Text>
            </div>
            <Stack direction="row" spacing={1}>
              <SemanticBadge tone={model.runTone}>{model.runPosture}</SemanticBadge>
              <ActionButton
                priority="secondary"
                disabled={!canRecordInternalReview || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {reviewMutation.isPending
                  ? "Recording..."
                  : "Record internal review"}
              </ActionButton>
            </Stack>
          </div>
          {model.runSections.length > 0 ? (
            <div className={styles.sectionList}>
              {model.runSections.map((section) => (
                <article key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <Text variant="secondary">
              No advisor-use copilot output has been returned for this scope.
            </Text>
          )}
          {model.reviewGuidance.length > 0 ? (
            <ul className={styles.guardrailList} aria-label="Review guidance">
              {model.reviewGuidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {model.guardrailResults.length > 0 ? (
            <ul className={styles.guardrailList} aria-label="Guardrail posture">
              {model.guardrailResults.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {reviewMutation.error ? (
            <Alert severity="warning">
              Internal review could not be recorded through Gateway.
            </Alert>
          ) : null}
        </div>
      </SectionBlock>
    </SectionBlock>
  );
}

function AdvisoryCopilotActionGrid({
  actions,
  pendingFamily,
  onRun,
}: {
  actions: AdvisoryCopilotActionOption[];
  pendingFamily?: string;
  onRun: (option: AdvisoryCopilotActionOption) => void;
}) {
  if (actions.length === 0) {
    return (
      <ScreenStatePanel
        kind="unavailable"
        title="No supported copilot actions"
        body="Gateway supportability has not declared any advisory copilot action families for this scope."
        surface="default"
      />
    );
  }

  return (
    <div className={styles.actionGrid} aria-label="Advisory copilot actions">
      {actions.map((option) => (
        <div className={styles.actionCard} key={option.family}>
          <Text variant="microLabel">{formatCode(option.family)}</Text>
          <strong>{option.label}</strong>
          <Text variant="secondary">{option.purpose}</Text>
          <ActionButton
            priority="secondary"
            disabled={Boolean(pendingFamily)}
            onClick={() => onRun(option)}
          >
            {pendingFamily === option.family ? "Preparing..." : "Prepare review"}
          </ActionButton>
        </div>
      ))}
    </div>
  );
}
