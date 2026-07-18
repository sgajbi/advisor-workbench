"use client";

import { useMemo } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ActionButton,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import {
  acknowledgeAdvisorCockpitAction,
  getAdvisorCockpitSnapshot,
  getAdvisorCockpitSupportability,
  listAdvisorCockpitActions,
  listAdvisorCockpitPreparationPackets,
} from "../api";
import {
  buildAdvisorCockpitModel,
  type AdvisorCockpitActionRow,
  type AdvisorCockpitModel,
} from "../advisor-cockpit-view-model";
import styles from "./advisor-cockpit-workspace.module.css";

const ADVISOR_ID = "advisor_sg_001";

export default function AdvisorCockpitWorkspace({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const queryClient = useQueryClient();
  const filters = useMemo(
    () => ({
      portfolioId,
      advisorId: ADVISOR_ID,
      role: "ADVISOR" as const,
      limit: 25,
    }),
    [portfolioId],
  );
  const snapshotQuery = useQuery({
    queryKey: ["advisor-cockpit-snapshot", filters],
    queryFn: async () => await getAdvisorCockpitSnapshot(filters),
    ...workbenchStrictQueryDefaults,
  });
  const actionQuery = useQuery({
    queryKey: ["advisor-cockpit-actions", filters],
    queryFn: async () => await listAdvisorCockpitActions(filters),
    ...workbenchStrictQueryDefaults,
  });
  const preparationQuery = useQuery({
    queryKey: ["advisor-cockpit-preparation-packets", filters],
    queryFn: async () => await listAdvisorCockpitPreparationPackets(filters),
    ...workbenchStrictQueryDefaults,
  });
  const supportabilityQuery = useQuery({
    queryKey: ["advisor-cockpit-supportability", portfolioId],
    queryFn: async () =>
      await getAdvisorCockpitSupportability({
        portfolioId,
        advisorId: ADVISOR_ID,
        role: "ADVISOR",
      }),
    ...workbenchStrictQueryDefaults,
  });
  const model = useMemo(
    () =>
      buildAdvisorCockpitModel({
        snapshot: snapshotQuery.data,
        actionPage: actionQuery.data,
        preparationPage: preparationQuery.error && !preparationQuery.data
          ? { items: [], total_count: null }
          : preparationQuery.data,
        supportability: supportabilityQuery.data,
      }),
    [
      snapshotQuery.data,
      actionQuery.data,
      preparationQuery.data,
      preparationQuery.error,
      supportabilityQuery.data,
    ],
  );
  const acknowledgementMutation = useMutation({
    mutationFn: async (row: AdvisorCockpitActionRow) =>
      await acknowledgeAdvisorCockpitAction(
        row.actionItemId,
        {
          action_item_version: row.actionItemVersion,
          acknowledged_by: ADVISOR_ID,
          acknowledgement_note: "Reviewed in the advisor cockpit.",
        },
        {
          filters: {
            portfolioId,
            advisorId: ADVISOR_ID,
            role: "ADVISOR",
          },
          idempotencyKey: `ui-cockpit-ack-${row.actionItemId}-${row.actionItemVersion}`,
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["advisor-cockpit-snapshot"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["advisor-cockpit-actions"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["advisor-cockpit-preparation-packets"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["advisor-cockpit-supportability"],
        }),
      ]);
    },
  });
  const isLoading =
    snapshotQuery.isLoading ||
    actionQuery.isLoading ||
    preparationQuery.isLoading ||
    supportabilityQuery.isLoading;
  const hasError = Boolean(
    snapshotQuery.error ||
      actionQuery.error ||
      preparationQuery.error ||
      supportabilityQuery.error,
  );
  const actionWorklistUnavailable = Boolean(actionQuery.error);
  const preparationRefreshUnavailable = Boolean(
    preparationQuery.error && preparationQuery.data,
  );
  const actionStatus = actionWorklistUnavailable
    ? { label: "Worklist unavailable", tone: "warn" as const }
    : model.actionPosture === "actionable"
      ? { label: "Action required", tone: "warn" as const }
      : model.actionPosture === "details-unavailable"
        ? { label: "Action details unavailable", tone: "warn" as const }
        : { label: "No open actions", tone: "success" as const };
  const primaryDecision = actionWorklistUnavailable
    ? "Advisor action review unavailable"
    : model.primaryDecision;
  const recommendedAction = actionWorklistUnavailable
    ? "Restore Advisor Cockpit worklist access before relying on action posture for client discussion."
    : model.recommendedAction;

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading advisor cockpit...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title={model.title}
      subtitle="Advisor operating priorities, source evidence, readiness, and review acknowledgement."
    >
      {hasError ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {actionWorklistUnavailable
            ? "Advisor action worklist is unavailable. No fallback operating worklist is shown."
            : "Some Advisor Cockpit evidence is unavailable. Available source-backed information remains visible."}
        </Alert>
      ) : null}
      <div className={styles.cockpitHeader}>
        <div className={styles.decisionPanel}>
          <div>
            <Text variant="microLabel">Advisor Decision</Text>
            <Text variant="subsectionTitle" as="h2">
              {primaryDecision}
            </Text>
            <Text variant="secondary">{recommendedAction}</Text>
          </div>
          <SemanticBadge tone={actionStatus.tone}>
            {actionStatus.label}
          </SemanticBadge>
        </div>
        <div className={styles.metricGrid} aria-label="Advisor cockpit counts">
          {model.metrics.map((metric) => (
            <div className={styles.metricTile} key={metric.label}>
              <Text variant="microLabel">{metric.label}</Text>
              <strong>{metric.value}</strong>
              <Text variant="secondary">{metric.detail}</Text>
            </div>
          ))}
        </div>
      </div>

      {actionWorklistUnavailable ? (
        <ScreenStatePanel
          kind="error"
          title="Advisor action worklist unavailable"
          body="The action worklist could not be loaded from the advisory workflow."
          surface="default"
        />
      ) : model.actionPosture === "details-unavailable" ? (
        <ScreenStatePanel
          kind="partial"
          title="Action details unavailable"
          body={
            model.actionCount === null
              ? "The source action total and review details are not available for this portfolio."
              : `${model.actionCount} ${model.actionCount === 1 ? "advisor action is" : "advisor actions are"} reported in scope, but ${model.actionCount === 1 ? "its" : "their"} review details are not available.`
          }
          hint="Refresh or verify Advisor Cockpit source readiness before client discussion."
          surface="default"
        />
      ) : model.actionPosture === "clear" ? (
        <ScreenStatePanel
          kind="empty"
          title="No cockpit actions in scope"
          body={`No advisor cockpit action items are visible for ${portfolioId}.`}
          surface="default"
        />
      ) : (
        <AdvisorCockpitActionTable
          rows={model.actionRows}
          acknowledgementPending={acknowledgementMutation.isPending}
          acknowledgementSucceeded={acknowledgementMutation.isSuccess}
          acknowledgementFailed={Boolean(acknowledgementMutation.error)}
          onAcknowledge={(row) => acknowledgementMutation.mutate(row)}
        />
      )}

      <SectionBlock
        title="Source Readiness"
        subtitle="Downstream readiness and client-publication boundaries reported by source services."
      >
        <div className={styles.supportabilityGrid}>
          {model.supportabilityRows.map((row) => (
            <div className={styles.supportabilityItem} key={row.label}>
              <Text variant="microLabel">{row.label}</Text>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
        {model.unsupportedClaims.length > 0 ? (
          <div className={styles.unsupportedClaims}>
            <Text variant="microLabel">Unsupported Claims</Text>
            <Text variant="secondary">
              {model.unsupportedClaims.join(", ")}
            </Text>
          </div>
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Meeting Preparation"
        subtitle="Source-backed meeting preparation evidence."
      >
        {preparationRefreshUnavailable ? (
          <>
            <ScreenStatePanel
              kind="partial"
              title="Meeting preparation refresh unavailable"
              body={
                model.preparationRows.length === 0
                  ? "No previously loaded preparation packs remain visible, and the current source scope cannot be confirmed."
                  : `${model.preparationRows.length} previously loaded ${model.preparationRows.length === 1 ? "preparation pack remains" : "preparation packs remain"} visible, but the current source scope cannot be confirmed.`
              }
              hint="Treat any visible preparation evidence as last loaded and verify source readiness before a client discussion."
              surface="default"
            />
            <AdvisorCockpitPreparationGrid rows={model.preparationRows} />
          </>
        ) : model.preparationPosture === "available" ? (
          <>
            {model.preparationCount === null ? (
              <Text variant="secondary">
                At least {model.preparationRows.length}{" "}
                {model.preparationRows.length === 1
                  ? "preparation pack is"
                  : "preparation packs are"}{" "}
                available for review; the full source scope is not reported.
              </Text>
            ) : model.preparationCount !== null &&
              model.preparationCount > model.preparationRows.length ? (
              <Text variant="secondary">
                {model.preparationCount}{" "}
                {model.preparationCount === 1
                  ? "preparation pack is"
                  : "preparation packs are"}{" "}
                in scope; {model.preparationRows.length}{" "}
                {model.preparationRows.length === 1 ? "is" : "are"} available
                for review.
              </Text>
            ) : null}
            <AdvisorCockpitPreparationGrid rows={model.preparationRows} />
          </>
        ) : model.preparationPosture === "details-unavailable" ? (
          <ScreenStatePanel
            kind="partial"
            title="Meeting preparation details unavailable"
            body={
              model.preparationCount === null
                ? "The preparation scope and review evidence are not available for this portfolio."
                : `${model.preparationCount} ${model.preparationCount === 1 ? "preparation pack is" : "preparation packs are"} reported in scope, but ${model.preparationCount === 1 ? "its" : "their"} review evidence is not available.`
            }
            hint="Refresh or verify Advisor Cockpit source readiness before relying on meeting preparation evidence in a client discussion."
            surface="default"
          />
        ) : (
          <ScreenStatePanel
            kind="empty"
            title="No preparation packs in scope"
            body="The source reports no meeting preparation packs for this portfolio."
            surface="default"
          />
        )}
      </SectionBlock>
    </SectionBlock>
  );
}

function AdvisorCockpitPreparationGrid({
  rows,
}: {
  rows: AdvisorCockpitModel["preparationRows"];
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className={styles.preparationGrid}>
      {rows.map((packet) => (
        <div className={styles.preparationItem} key={packet.packetId}>
          <Text variant="microLabel">{packet.context}</Text>
          <strong>{packet.status}</strong>
          <Text variant="secondary">{packet.evidenceSummary}</Text>
        </div>
      ))}
    </div>
  );
}

function AdvisorCockpitActionTable({
  rows,
  acknowledgementPending,
  acknowledgementSucceeded,
  acknowledgementFailed,
  onAcknowledge,
}: {
  rows: AdvisorCockpitActionRow[];
  acknowledgementPending: boolean;
  acknowledgementSucceeded: boolean;
  acknowledgementFailed: boolean;
  onAcknowledge: (row: AdvisorCockpitActionRow) => void;
}) {
  return (
    <div className={styles.actionTableWrap}>
      <table className={styles.actionTable}>
        <thead>
          <tr>
            <th>Action</th>
            <th>Status</th>
            <th>Owner</th>
            <th>SLA</th>
            <th>Evidence</th>
            <th>Next Action</th>
            <th>Acknowledgement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.actionItemId}>
              <td>
                <span className={styles.actionTitle}>{row.title}</span>
                <span className={styles.actionMeta}>{row.family}</span>
                <span className={styles.actionMeta}>{row.reasonSummary}</span>
              </td>
              <td>
                <SemanticBadge tone={row.statusTone}>
                  {row.status}
                </SemanticBadge>
                <span className={styles.actionMeta}>{row.priority}</span>
              </td>
              <td>{row.owner}</td>
              <td>{row.sla}</td>
              <td className={styles.evidenceCell}>
                <p>{row.evidenceSummary}</p>
                <span className={styles.actionMeta}>
                  {row.sourceGapSummary}
                </span>
                <span className={styles.actionMeta}>
                  {row.dependencySummary}
                </span>
              </td>
              <td>{row.nextRequiredAction}</td>
              <td>
                <ActionButton
                  priority="secondary"
                  disabled={!row.canAcknowledge || acknowledgementPending}
                  onClick={() => onAcknowledge(row)}
                >
                  {acknowledgementPending && row.canAcknowledge
                    ? "Recording..."
                    : row.acknowledgementLabel}
                </ActionButton>
                <span className={styles.acknowledgementDetail}>
                  {acknowledgementSucceeded && row.canAcknowledge
                    ? "Acknowledgement recorded in the source workflow."
                    : acknowledgementFailed && row.canAcknowledge
                      ? "Acknowledgement could not be recorded."
                      : row.acknowledgementDetail}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
