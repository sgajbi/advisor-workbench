"use client";

import {
  MetricRow,
  ScreenStatePanel,
  SemanticBadge,
  SupportDetails,
  Text,
} from "@/design-system";
import { EXECUTION_EVIDENCE_COPY } from "@/copy/execution-evidence-copy";
import type { ExternalOrderExecutionAcknowledgementResponse } from "@/features/workbench/types";
import { buildExecutionAcknowledgementSupportabilityModel } from "@/features/workbench/execution-acknowledgement-view-model";

type Props = {
  response: ExternalOrderExecutionAcknowledgementResponse | null;
  loading: boolean;
  error: string | null;
};

export default function ExecutionAcknowledgementSupportabilityPanel({
  response,
  loading,
  error,
}: Props) {
  const model = buildExecutionAcknowledgementSupportabilityModel(response);

  return (
    <section className="execution-acknowledgement-supportability-panel">
      <div className="execution-acknowledgement-header">
        <div>
          <Text as="h3" variant="subsectionTitle">
            {EXECUTION_EVIDENCE_COPY.title}
          </Text>
          <Text variant="secondary">{EXECUTION_EVIDENCE_COPY.description}</Text>
        </div>
        <SemanticBadge tone="danger">{model.state}</SemanticBadge>
      </div>
      {loading ? (
        <ScreenStatePanel
          kind="loading"
          surface="portfolio"
          title={EXECUTION_EVIDENCE_COPY.loadingTitle}
          body={EXECUTION_EVIDENCE_COPY.loadingBody}
        />
      ) : error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title={EXECUTION_EVIDENCE_COPY.unavailableTitle}
          body={error}
        />
      ) : null}

      <div className="execution-acknowledgement-summary">
        <MetricRow label="Evidence" value={model.evidenceLabel} />
        <MetricRow label="Record status" value={model.state} />
        <MetricRow
          label="Acknowledgements"
          value={model.acknowledgementCount}
        />
        <MetricRow label="Data quality" value={model.dataQualityStatus} />
      </div>

      <div className="execution-acknowledgement-message">
        <Text variant="secondary">
          {model.reason}. Workbench does not treat this portfolio as
          OMS-acknowledged, filled, settled, or execution-ready.
        </Text>
      </div>

      <div className="execution-acknowledgement-evidence-grid">
        <div>
          <Text as="h3" variant="subsectionTitle">
            Blocked capabilities
          </Text>
          <div className="execution-acknowledgement-badge-list">
            {model.blockedCapabilities.length > 0 ? (
              model.blockedCapabilities.map((capability) => (
                <SemanticBadge key={capability} tone="danger">
                  {capability}
                </SemanticBadge>
              ))
            ) : (
              <span>None reported</span>
            )}
          </div>
        </div>

        <div>
          <Text as="h3" variant="subsectionTitle">
            Missing evidence
          </Text>
          <div className="execution-acknowledgement-badge-list">
            {model.missingDataFamilies.length > 0 ? (
              model.missingDataFamilies.map((family) => (
                <SemanticBadge key={family} tone="warn">
                  {family}
                </SemanticBadge>
              ))
            ) : (
              <span>None reported</span>
            )}
          </div>
        </div>
      </div>

      {model.lineageRows.length > 0 ? (
        <SupportDetails context={EXECUTION_EVIDENCE_COPY.supportContext}>
          <div className="execution-acknowledgement-lineage">
            <Text as="h3" variant="subsectionTitle">
              Source evidence
            </Text>
            <dl>
              {model.lineageRows.map((row) => (
                <div key={row.key}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SupportDetails>
      ) : null}
    </section>
  );
}
