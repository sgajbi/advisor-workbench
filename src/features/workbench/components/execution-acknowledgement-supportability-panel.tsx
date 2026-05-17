"use client";

import {
  MetricRow,
  ScreenStatePanel,
  SemanticBadge,
  Text,
} from "@/design-system";
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
            Execution Acknowledgement Supportability
          </Text>
          <Text variant="secondary">
            External OMS acknowledgement evidence is displayed as audit posture only.
          </Text>
        </div>
        <SemanticBadge tone="danger">{model.state}</SemanticBadge>
      </div>
      {loading ? (
        <ScreenStatePanel
          kind="loading"
          surface="portfolio"
          title="Checking external OMS evidence"
          body="Loading source-owned acknowledgement supportability."
        />
      ) : error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="External OMS evidence is unavailable"
          body={error}
        />
      ) : null}

      <div className="execution-acknowledgement-summary">
        <MetricRow label="Evidence Contract" value={model.evidenceLabel} />
        <MetricRow label="Posture" value={model.state} />
        <MetricRow label="Acknowledgements" value={model.acknowledgementCount} />
        <MetricRow label="Data Quality" value={model.dataQualityStatus} />
      </div>

      <div className="execution-acknowledgement-message">
        <Text variant="secondary">
          {model.reason}. Workbench does not treat this portfolio as OMS-acknowledged, filled,
          settled, or execution-ready.
        </Text>
      </div>

      <div className="execution-acknowledgement-evidence-grid">
        <div>
          <Text as="h3" variant="subsectionTitle">
            Blocked Capabilities
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
            Missing Evidence
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
        <div className="execution-acknowledgement-lineage">
          <Text as="h3" variant="subsectionTitle">
            Audit Lineage
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
      ) : null}
    </section>
  );
}
