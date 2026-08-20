"use client";

import { useMemo } from "react";
import { Alert, AlertTitle } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  combineQuerySourcePostures,
  projectQuerySourcePosture,
} from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import {
  acknowledgeAdvisorCockpitAction,
  getAdvisorCockpitSnapshot,
  getAdvisorCockpitSupportability,
  listAdvisorCockpitActions,
  listAdvisorCockpitPreparationPackets,
} from "../api";
import {
  buildAdvisorCockpitEvidencePresentation,
  buildAdvisorCockpitModel,
  type AdvisorCockpitActionRow,
  type AdvisorCockpitModel,
} from "../advisor-cockpit-view-model";
import AdvisorCockpitActionWorklist, {
  type AdvisorCockpitAcknowledgementTransaction,
} from "./advisor-cockpit-action-worklist";
import styles from "./advisor-cockpit-workspace.module.css";

export default function AdvisorCockpitWorkspace({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const queryClient = useQueryClient();
  const filters = useMemo(
    () => ({
      portfolioId,
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
      }),
    ...workbenchStrictQueryDefaults,
  });
  const snapshotSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(snapshotQuery.data),
    isLoading: snapshotQuery.isLoading,
    isFetching: snapshotQuery.isFetching,
    hasError: Boolean(snapshotQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(snapshotQuery.error),
  });
  const actionSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(actionQuery.data),
    isLoading: actionQuery.isLoading,
    isFetching: actionQuery.isFetching,
    hasError: Boolean(actionQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(actionQuery.error),
  });
  const preparationSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(preparationQuery.data),
    isLoading: preparationQuery.isLoading,
    isFetching: preparationQuery.isFetching,
    hasError: Boolean(preparationQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(preparationQuery.error),
  });
  const supportabilitySourcePosture = projectQuerySourcePosture({
    hasData: Boolean(supportabilityQuery.data),
    isLoading: supportabilityQuery.isLoading,
    isFetching: supportabilityQuery.isFetching,
    hasError: Boolean(supportabilityQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(supportabilityQuery.error),
  });
  const cockpitSourcePosture = combineQuerySourcePostures([
    snapshotSourcePosture,
    actionSourcePosture,
    preparationSourcePosture,
    supportabilitySourcePosture,
  ]);
  const evidencePresentation = buildAdvisorCockpitEvidencePresentation({
    ...cockpitSourcePosture,
    hasAnyEvidence: Boolean(
      snapshotQuery.data ||
        actionQuery.data ||
        preparationQuery.data ||
        supportabilityQuery.data,
    ),
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
          acknowledgement_note: "Reviewed in the advisor cockpit.",
        },
        {
          filters: {
            portfolioId,
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
  const actionWorklistUnavailable = actionSourcePosture.isUnavailable;
  const preparationRefreshUnavailable =
    preparationSourcePosture.hasRefreshFailure;
  const actionStatus = evidencePresentation.statusLabel
    ? {
        label: evidencePresentation.statusLabel,
        tone: evidencePresentation.statusTone,
      }
    : actionWorklistUnavailable
    ? { label: "Worklist unavailable", tone: "warn" as const }
    : model.actionPosture === "actionable"
      ? { label: "Action required", tone: "warn" as const }
      : model.actionPosture === "details-unavailable"
        ? { label: "Action details unavailable", tone: "warn" as const }
        : { label: "No open actions", tone: "success" as const };
  const primaryDecision =
    evidencePresentation.decisionTitle ??
    (actionWorklistUnavailable
      ? "Advisor action review unavailable"
      : model.primaryDecision);
  const recommendedAction =
    evidencePresentation.recommendedAction ??
    (actionWorklistUnavailable
      ? "Restore Advisor Cockpit worklist access before relying on action posture for client discussion."
      : model.recommendedAction);
  const acknowledgementTransaction: AdvisorCockpitAcknowledgementTransaction = {
    actionItemId: acknowledgementMutation.variables?.actionItemId ?? null,
    status: acknowledgementMutation.isPending
      ? cockpitSourcePosture.isRefreshing
        ? "confirming"
        : "recording"
      : acknowledgementMutation.isError
        ? "failed"
        : acknowledgementMutation.isSuccess
          ? evidencePresentation.state === "partial"
            ? "confirmed-partial"
            : "confirmed"
          : "idle",
  };

  if (evidencePresentation.state === "loading") {
    return (
      <SectionBlock>
        <ScreenStatePanel
          kind="loading"
          title={evidencePresentation.title!}
          body={evidencePresentation.body!}
          surface="default"
          rows={4}
        />
      </SectionBlock>
    );
  }

  if (evidencePresentation.state === "permission-blocked") {
    return (
      <SectionBlock>
        <ScreenStatePanel
          kind="permission_blocked"
          title={evidencePresentation.title!}
          body={evidencePresentation.body!}
          hint={evidencePresentation.hint ?? undefined}
          surface="default"
        />
      </SectionBlock>
    );
  }

  if (evidencePresentation.state === "unavailable") {
    return (
      <SectionBlock>
        <ScreenStatePanel
          kind="error"
          title={evidencePresentation.title!}
          body={evidencePresentation.body!}
          hint={evidencePresentation.hint ?? undefined}
          surface="default"
        />
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title={model.title}
      subtitle="Advisor operating priorities, preparation evidence, client-use boundaries, and review acknowledgement."
    >
      {evidencePresentation.state === "refreshing" ? (
        <Alert severity="info" role="status" aria-live="polite" sx={{ mb: 1 }}>
          <AlertTitle>{evidencePresentation.title}</AlertTitle>
          {evidencePresentation.body} {evidencePresentation.hint}
        </Alert>
      ) : evidencePresentation.state === "partial" ? (
        <ScreenStatePanel
          kind="partial"
          title={evidencePresentation.title!}
          body={evidencePresentation.body!}
          hint={evidencePresentation.hint ?? undefined}
          surface="default"
        />
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
        <AdvisorCockpitActionWorklist
          rows={model.actionRows}
          evidenceConfirmed={evidencePresentation.actionsEnabled}
          transaction={acknowledgementTransaction}
          onAcknowledge={(row) => {
            if (
              evidencePresentation.actionsEnabled &&
              !acknowledgementMutation.isPending
            ) {
              acknowledgementMutation.mutate(row);
            }
          }}
        />
      )}

      <SectionBlock
        title="Preparation Readiness"
        subtitle="Current evidence availability and client-use boundaries for this advisor review."
      >
        <div className={styles.supportabilityGrid}>
          {model.supportabilityRows.map((row) => (
            <div className={styles.supportabilityItem} key={row.label}>
              <div className={styles.supportabilityHeading}>
                <Text variant="microLabel">{row.label}</Text>
                <SemanticBadge tone={row.tone}>{row.value}</SemanticBadge>
              </div>
              <Text variant="secondary">{row.detail}</Text>
            </div>
          ))}
        </div>
        {model.operatingBoundaries.length > 0 ? (
          <div className={styles.operatingBoundaries}>
            <Text variant="microLabel">Operating Boundaries</Text>
            <div className={styles.operatingBoundaryGrid}>
              {model.operatingBoundaries.map((boundary) => (
                <div key={boundary.rawValue}>
                  <strong>{boundary.label}</strong>
                  <Text variant="secondary">{boundary.detail}</Text>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {model.supportDetails.length > 0 ? (
          <details className={styles.supportDetails}>
            <summary>Support details</summary>
            <dl>
              {model.supportDetails.map((detail) => (
                <div key={`${detail.label}-${detail.value}`}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </details>
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
