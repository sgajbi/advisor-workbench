import { Alert, Button, Divider, FormControlLabel, Switch } from "@mui/material";

import { SemanticBadge, Text } from "@/design-system";
import type {
  ProposalApprovalRecord,
  ProposalLineageData,
  ProposalVersionData,
  ProposalWorkflowEvent,
} from "../types";
import type { ProposalDetailStageItem } from "../proposal-detail-evidence-view-model";
import { businessEventLabel, proposalStageLabel } from "../proposal-workflow-copy";

import detailStyles from "./proposal-detail-view.module.css";

export function ProposalAdvisorActionsPanel({
  currentState,
  stageCopy,
  stageItems,
  actionDisabled,
  actionDisabledReason,
  onSubmitForRiskReview,
  onSubmitForComplianceReview,
  onApproveRisk,
  onApproveCompliance,
  onRecordClientConsent,
}: {
  currentState: string;
  stageCopy: string;
  stageItems: ProposalDetailStageItem[];
  actionDisabled: boolean;
  actionDisabledReason?: string;
  onSubmitForRiskReview: () => void;
  onSubmitForComplianceReview: () => void;
  onApproveRisk: () => void;
  onApproveCompliance: () => void;
  onRecordClientConsent: () => void;
}) {
  return (
    <section className={detailStyles.railPanel}>
      <div className={detailStyles.railPanelHeader}>
        <Text variant="panelTitle">Next action</Text>
        <SemanticBadge tone={currentState === "EXECUTION_READY" ? "success" : "warn"}>
          {proposalStageLabel(currentState)}
        </SemanticBadge>
      </div>
      <Text variant="secondary">{stageCopy}</Text>
      {actionDisabledReason ? (
        <Alert severity="info" sx={{ py: 0, alignItems: "center" }}>
          {actionDisabledReason}
        </Alert>
      ) : null}
      <div className={detailStyles.stageList}>
        {stageItems.map((stage) => (
          <span key={stage.label} className={stage.reached ? detailStyles.stageDone : detailStyles.stagePending}>
            {stage.label}
          </span>
        ))}
      </div>
      <div className={detailStyles.actionStack}>
        {currentState === "DRAFT" ? (
          <>
            <Button type="button" variant="contained" onClick={onSubmitForRiskReview} disabled={actionDisabled}>
              Submit for risk review
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={onSubmitForComplianceReview}
              disabled={actionDisabled}
            >
              Submit for compliance review
            </Button>
          </>
        ) : null}
        {currentState === "RISK_REVIEW" ? (
          <Button type="button" variant="contained" onClick={onApproveRisk} disabled={actionDisabled}>
            Approve risk review
          </Button>
        ) : null}
        {currentState === "COMPLIANCE_REVIEW" ? (
          <Button type="button" variant="contained" onClick={onApproveCompliance} disabled={actionDisabled}>
            Approve compliance review
          </Button>
        ) : null}
        {currentState === "AWAITING_CLIENT_CONSENT" ? (
          <Button type="button" variant="contained" onClick={onRecordClientConsent} disabled={actionDisabled}>
            Record client consent
          </Button>
        ) : null}
        {currentState === "EXECUTION_READY" ? (
          <Alert severity="success" sx={{ py: 0, alignItems: "center" }}>
            Proposal is execution ready.
          </Alert>
        ) : null}
      </div>
    </section>
  );
}

export function ProposalEvidenceControlsPanel({
  includeEvidence,
  onIncludeEvidenceChange,
  versionLookupNo,
  onVersionLookupNoChange,
  onLoadVersion,
  onCreateNextVersion,
  creatingVersion,
  createdVersionNo,
  versionLookup,
  versionActionError,
}: {
  includeEvidence: boolean;
  onIncludeEvidenceChange: (value: boolean) => void;
  versionLookupNo: number;
  onVersionLookupNoChange: (value: number) => void;
  onLoadVersion: () => void;
  onCreateNextVersion: () => void;
  creatingVersion: boolean;
  createdVersionNo: number | null;
  versionLookup: ProposalVersionData | null;
  versionActionError: string | null;
}) {
  return (
    <section className={detailStyles.railPanel}>
      <div className={detailStyles.railPanelHeader}>
        <Text variant="panelTitle">Evidence and versions</Text>
      </div>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={includeEvidence}
            onChange={(event) => onIncludeEvidenceChange(event.target.checked)}
          />
        }
        label="Load full evidence bundle"
      />
      <div className={detailStyles.versionControls}>
        <label>
          <Text variant="label">Version number</Text>
          <input
            className="input"
            type="number"
            min={1}
            value={versionLookupNo}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              onVersionLookupNoChange(Number.isNaN(next) ? 1 : next);
            }}
          />
        </label>
        <Button type="button" variant="outlined" onClick={onLoadVersion}>
          Load version
        </Button>
        <Button type="button" variant="outlined" onClick={onCreateNextVersion} disabled={creatingVersion}>
          {creatingVersion ? "Creating version..." : "Create next version"}
        </Button>
      </div>
      {createdVersionNo ? (
        <Text variant="secondary">Version created successfully: {createdVersionNo}</Text>
      ) : null}
      {versionLookup ? (
        <div className={detailStyles.loadedVersion}>
          <Text variant="cardTitle">Loaded Version {String(versionLookup.version_no ?? versionLookupNo)}</Text>
          <Text variant="metadata">Status at creation: {String(versionLookup.status_at_creation ?? "N/A")}</Text>
          <Text variant="metadata">Created at: {String(versionLookup.created_at ?? "N/A")}</Text>
          <Text variant="metadata">Artifact hash: {String(versionLookup.artifact_hash ?? "N/A")}</Text>
        </div>
      ) : null}
      {versionActionError ? <Alert severity="warning">{versionActionError}</Alert> : null}
    </section>
  );
}

export function ProposalLineageAuditPanel({
  artifactHash,
  requestHash,
  simulationHash,
  generatedAt,
  lineageVersions,
}: {
  artifactHash?: string;
  requestHash?: string;
  simulationHash?: string;
  generatedAt?: string;
  lineageVersions: NonNullable<ProposalLineageData["versions"]>;
}) {
  return (
    <section className={detailStyles.railPanel}>
      <Text variant="panelTitle">Lineage and audit</Text>
      <div className={detailStyles.hashList}>
        <div>
          <span>Artifact Hash</span>
          <strong>{artifactHash ?? "Not available"}</strong>
        </div>
        <div>
          <span>Request Hash</span>
          <strong>{requestHash ?? "Not available"}</strong>
        </div>
        <div>
          <span>Simulation Hash</span>
          <strong>{simulationHash ?? "Not available"}</strong>
        </div>
      </div>
      <Text variant="secondary">
        {generatedAt
          ? `Latest artifact generated at ${generatedAt}.`
          : "Evidence metadata is not available in the current Gateway response."}
      </Text>
      {lineageVersions.length ? (
        <div className={detailStyles.timelineList}>
          {lineageVersions.map((version) => (
            <div key={`lineage-${String(version.version_no ?? "na")}`}>
              <strong>Version {String(version.version_no ?? "N/A")}</strong>
              <span>{String(version.created_at ?? "Created time unavailable")}</span>
            </div>
          ))}
        </div>
      ) : (
        <Text variant="secondary">No lineage metadata returned for this proposal yet.</Text>
      )}
    </section>
  );
}

export function ProposalReviewHistoryPanel({
  workflowEvents,
  hiddenWorkflowEventCount,
  approvals,
}: {
  workflowEvents: ProposalWorkflowEvent[];
  hiddenWorkflowEventCount: number;
  approvals: ProposalApprovalRecord[];
}) {
  return (
    <section className={detailStyles.railPanel}>
      <Text variant="panelTitle">Review history</Text>
      {workflowEvents.length ? (
        <div className={detailStyles.timelineList}>
          {workflowEvents.map((event) => (
            <div key={event.event_id}>
              <strong>{businessEventLabel(event.event_type)}</strong>
              <span>
                {event.from_state ? proposalStageLabel(event.from_state) : "Started"} to{" "}
                {proposalStageLabel(event.to_state)} · {businessEventLabel(event.actor_id)}
              </span>
            </div>
          ))}
          {hiddenWorkflowEventCount > 0 ? (
            <div className={detailStyles.timelineMore}>
              <strong>{hiddenWorkflowEventCount} earlier events retained in Gateway history</strong>
            </div>
          ) : null}
        </div>
      ) : (
        <Text variant="secondary">No workflow events.</Text>
      )}
      <Divider sx={{ my: 1 }} />
      {approvals.length ? (
        <div className={detailStyles.timelineList}>
          {approvals.map((approval) => (
            <div key={approval.approval_id}>
              <strong>{businessEventLabel(approval.approval_type)} review</strong>
              <span>
                {approval.approved ? "Approved" : "Rejected"} by {businessEventLabel(approval.actor_id)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Text variant="secondary">No approvals recorded.</Text>
      )}
    </section>
  );
}
