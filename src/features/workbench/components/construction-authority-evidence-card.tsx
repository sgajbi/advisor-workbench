"use client";

import { businessStateLabel, formatBusinessReason } from "@/copy/business-state-copy";
import { SemanticBadge, Text } from "@/design-system";
import type { ConstructionPanelModel } from "@/features/workbench/construction-alternatives-view-model";
import {
  buildConstructionAuthorityEvidenceSummary,
  constructionBadgeTone,
} from "@/features/workbench/construction-alternatives-panel-helpers";

type Props = {
  model: ConstructionPanelModel;
};

export default function ConstructionAuthorityEvidenceCard({ model }: Props) {
  const authorityEvidenceSummary =
    buildConstructionAuthorityEvidenceSummary(model);
  const eligibleInstrumentEvidence =
    model.currencyOverlayEvidence?.eligibleInstrumentEvidence;
  const executionAcknowledgementEvidence =
    model.executionAcknowledgementEvidence;

  if (!authorityEvidenceSummary.shouldRender) {
    return null;
  }

  return (
    <section className="construction-currency-overlay-evidence">
      <div className="construction-currency-overlay-header">
        <Text as="h3" variant="subsectionTitle">
          Construction Authority Evidence
        </Text>
        <SemanticBadge tone={constructionBadgeTone(authorityEvidenceSummary.state)}>
          {businessStateLabel(authorityEvidenceSummary.state)}
        </SemanticBadge>
      </div>
      {model.currencyOverlayEvidence ? (
        <dl>
          <div>
            <dt>Hedge policy source</dt>
            <dd>
              {model.currencyOverlayEvidence.sourceProductName}{" "}
              {model.currencyOverlayEvidence.sourceProductVersion}
            </dd>
          </div>
          <div>
            <dt>Source id</dt>
            <dd>{model.currencyOverlayEvidence.sourceId}</dd>
          </div>
          <div>
            <dt>Evidence hash</dt>
            <dd>{model.currencyOverlayEvidence.contentHash}</dd>
          </div>
          <div>
            <dt>Policy rules</dt>
            <dd>{model.currencyOverlayEvidence.ruleCount}</dd>
          </div>
        </dl>
      ) : null}
      {model.currencyOverlayEvidence?.rules.length ? (
        <div className="construction-currency-overlay-list">
          <strong>Returned rules</strong>
          {model.currencyOverlayEvidence.rules.map((rule, index) => (
            <span key={`${rule}-${index}`}>{rule}</span>
          ))}
        </div>
      ) : null}
      {eligibleInstrumentEvidence ? (
        <div className="construction-currency-overlay-list">
          <strong>Eligible instrument evidence</strong>
          <span>
            {eligibleInstrumentEvidence.sourceProductName}{" "}
            {eligibleInstrumentEvidence.sourceProductVersion}
          </span>
          <span>Source id: {eligibleInstrumentEvidence.sourceId}</span>
          <span>Evidence hash: {eligibleInstrumentEvidence.contentHash}</span>
          <span>Instrument rows: {eligibleInstrumentEvidence.instrumentCount}</span>
          {eligibleInstrumentEvidence.instruments.length > 0
            ? eligibleInstrumentEvidence.instruments.map((instrument, index) => (
                <span key={`${instrument}-${index}`}>{instrument}</span>
              ))
            : null}
        </div>
      ) : null}
      {executionAcknowledgementEvidence ? (
        <div className="construction-currency-overlay-list">
          <strong>Execution acknowledgement evidence</strong>
          <span>
            {executionAcknowledgementEvidence.sourceProductName}{" "}
            {executionAcknowledgementEvidence.sourceProductVersion}
          </span>
          <span>Source id: {executionAcknowledgementEvidence.sourceId}</span>
          <span>Evidence hash: {executionAcknowledgementEvidence.contentHash}</span>
          <span>
            Acknowledgement rows:{" "}
            {executionAcknowledgementEvidence.acknowledgementCount}
          </span>
          {executionAcknowledgementEvidence.acknowledgements.length > 0
            ? executionAcknowledgementEvidence.acknowledgements.map(
                (acknowledgement, index) => (
                  <span key={`${acknowledgement}-${index}`}>{acknowledgement}</span>
                ),
              )
            : null}
        </div>
      ) : null}
      <div className="construction-currency-overlay-list">
        <strong>Missing data</strong>
        {authorityEvidenceSummary.missingDataFamilies.length > 0 ? (
          authorityEvidenceSummary.missingDataFamilies.map((family) => (
            <SemanticBadge key={family} tone="warn">
              {formatBusinessReason(family)}
            </SemanticBadge>
          ))
        ) : (
          <span>None reported</span>
        )}
      </div>
      <div className="construction-currency-overlay-list">
        <strong>Blocked capabilities</strong>
        {authorityEvidenceSummary.blockedCapabilities.length > 0 ? (
          authorityEvidenceSummary.blockedCapabilities.map((capability) => (
            <SemanticBadge key={capability} tone="danger">
              {formatBusinessReason(capability)}
            </SemanticBadge>
          ))
        ) : (
          <span>None reported</span>
        )}
      </div>
      {authorityEvidenceSummary.reasonCodes.length > 0 ? (
        <div className="construction-currency-overlay-list">
          <strong>Reason codes</strong>
          {authorityEvidenceSummary.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone="warn">
              {formatBusinessReason(reason)}
            </SemanticBadge>
          ))}
        </div>
      ) : null}
    </section>
  );
}
