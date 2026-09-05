import { buildAdvisorBookSourceRenderRows } from "../live/validation/advisor-book-proof.mjs";
import { buildIdeaExplanationSourceRenderRows } from "../live/validation/idea-explanation-proof.mjs";
import { buildRiskMandateSourceRenderRows } from "../live/validation/risk-mandate-proof.mjs";

const advisorBookGatewaySample = {
  items: [
    {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      status: "CLOSED",
    },
  ],
};

const riskMandateGatewaySample = {
  summary: {
    constraints: [{ key: "cash_band", state: "within" }],
  },
  concentration: {
    constraints: [{ key: "issuer_max_weight", state: "breach" }],
  },
};

const ideaExplanationGatewaySample = {
  status: "EXPLANATION_UNAVAILABLE",
  disposition: "runtime_unavailable",
  lotusAiRunId: null,
  lotusAiRuntimeExecutionConfirmed: false,
  evaluationVerdict: "not_evaluated",
  explanation: {
    requestId: "source-authority-proof",
    candidateId: "idea-source-authority-unavailable",
    posture: "fallback_only",
    verifierOutcome: "not_run",
    explanationText: "Cash remains above the source policy threshold.",
    fallbackUsed: true,
    fallbackReason: "ai_unavailable",
    grantsDownstreamAuthority: false,
    supportedFeaturePromoted: false,
    executionProvenancePosture: "runtime_unavailable",
    aiLineageRecorded: false,
  },
};

/**
 * Enrollment metadata is deliberately limited to source ownership and browser evidence. It is not
 * a second business model: Gateway payloads and their domain adapters remain authoritative.
 */
export const SOURCE_AUTHORITY_CONTRACTS = Object.freeze([
  Object.freeze({
    id: "advisor-book-portfolios",
    screen: "Advisor Book",
    sourceOwnership: Object.freeze({
      identity: "items[].portfolio_id",
      state: "items[].status",
    }),
    presentationOnly: Object.freeze(["display name", "formatted market value"]),
    allowedStates: Object.freeze(["ACTIVE", "CLOSED"]),
    renderedEvidence: Object.freeze({
      rowSelector: '[data-advisor-book-row="portfolio"]',
      sourceAttribute: "data-advisor-book-source",
      identityAttribute: "data-portfolio-id",
      stateAttribute: "data-lifecycle-state",
    }),
    implementationEvidence: Object.freeze([
      Object.freeze({
        path: "scripts/live/validation/advisor-book-proof.mjs",
        tokens: Object.freeze([
          "buildAdvisorBookSourceRenderRows",
          "item?.portfolio_id",
          "item?.status",
        ]),
      }),
      Object.freeze({
        path: "src/features/advisor-book/components/advisor-book-workspace.tsx",
        tokens: Object.freeze([
          'data-advisor-book-row="portfolio"',
          'data-advisor-book-source="advisor-book"',
          "data-portfolio-id={row.portfolioId}",
          "data-lifecycle-state={row.sourceLifecycleState}",
        ]),
      }),
      Object.freeze({
        path: "scripts/live/validation/browser-workflows.mjs",
        tokens: Object.freeze([
          'screen: "Advisor Book"',
          'element.getAttribute("data-portfolio-id")',
          'element.getAttribute("data-lifecycle-state")',
        ]),
      }),
    ]),
    sampleGatewayResponse: Object.freeze(advisorBookGatewaySample),
    target: Object.freeze({
      source: "advisor-book",
      identity: "PB_SG_GLOBAL_BAL_001",
      sourceState: "CLOSED",
      mutatedSourceState: "ACTIVE",
      reassuringRenderedState: "ACTIVE",
    }),
    buildExpectedRows: buildAdvisorBookSourceRenderRows,
    mutateSourceState(payload, state) {
      payload.items[0].status = state;
    },
  }),
  Object.freeze({
    id: "idea-candidate-explanation",
    screen: "Opportunities and Ideas",
    sourceOwnership: Object.freeze({
      identity: "explanation.candidateId",
      state: "status",
    }),
    presentationOnly: Object.freeze([
      "business labels",
      "formatted source dates",
    ]),
    allowedStates: Object.freeze([
      "EXPLANATION_SERVED",
      "EXPLANATION_UNAVAILABLE",
    ]),
    renderedEvidence: Object.freeze({
      rowSelector: "[data-idea-explanation-source]",
      sourceAttribute: "data-idea-explanation-source",
      identityAttribute: "data-candidate-id",
      stateAttribute: "data-explanation-status",
    }),
    implementationEvidence: Object.freeze([
      Object.freeze({
        path: "scripts/live/validation/idea-explanation-proof.mjs",
        tokens: Object.freeze([
          "buildIdeaExplanationSourceRenderRows",
          "response?.explanation?.candidateId",
          "response?.status",
        ]),
      }),
      Object.freeze({
        path: "src/features/proposals/components/idea-candidate-explanation.tsx",
        tokens: Object.freeze([
          'data-idea-explanation-source="lotus-idea"',
          "data-candidate-id={mutation.data?.explanation.candidateId}",
          "data-explanation-status={mutation.data?.status}",
        ]),
      }),
      Object.freeze({
        path: "tests/e2e/idea-candidate-actions.spec.ts",
        tokens: Object.freeze([
          'data-explanation-state", "served"',
          'data-explanation-state",',
          '"unavailable"',
        ]),
      }),
    ]),
    sampleGatewayResponse: Object.freeze(ideaExplanationGatewaySample),
    target: Object.freeze({
      source: "lotus-idea",
      identity: "idea-source-authority-unavailable",
      sourceState: "EXPLANATION_UNAVAILABLE",
      mutatedSourceState: "EXPLANATION_SERVED",
      reassuringRenderedState: "EXPLANATION_SERVED",
    }),
    buildExpectedRows: buildIdeaExplanationSourceRenderRows,
    mutateSourceState(payload, state) {
      payload.status = state;
    },
  }),
  Object.freeze({
    id: "risk-mandate-comparison",
    screen: "Risk review",
    sourceOwnership: Object.freeze({
      identity: "summary|concentration.constraints[].key",
      state: "summary|concentration.constraints[].state",
    }),
    presentationOnly: Object.freeze(["label", "formatted measure", "formatted limit"]),
    allowedStates: Object.freeze([
      "unavailable",
      "not_defined",
      "measure_unavailable",
      "within",
      "breach",
    ]),
    renderedEvidence: Object.freeze({
      rowSelector: "[data-mandate-constraint]",
      sourceAttribute: "data-mandate-constraint-source",
      identityAttribute: "data-mandate-constraint",
      stateAttribute: "data-mandate-state",
    }),
    implementationEvidence: Object.freeze([
      Object.freeze({
        path: "scripts/live/validation/risk-mandate-proof.mjs",
        tokens: Object.freeze([
          "buildRiskMandateSourceRenderRows",
          "constraint?.key",
          "constraint?.state",
        ]),
      }),
      Object.freeze({
        path: "src/apps/performance/components/risk/risk-mandate-comparison.tsx",
        tokens: Object.freeze([
          "data-mandate-constraint-source={sourceKey}",
          "data-mandate-constraint={constraint.key}",
          "data-mandate-state={constraint.state}",
        ]),
      }),
      Object.freeze({
        path: "scripts/live/validation/browser-workflows.mjs",
        tokens: Object.freeze([
          'screen: "Risk review"',
          'element.getAttribute("data-mandate-constraint")',
          'element.getAttribute("data-mandate-state")',
        ]),
      }),
    ]),
    sampleGatewayResponse: Object.freeze(riskMandateGatewaySample),
    target: Object.freeze({
      source: "concentration",
      identity: "issuer_max_weight",
      sourceState: "breach",
      mutatedSourceState: "measure_unavailable",
      reassuringRenderedState: "within",
    }),
    buildExpectedRows: buildRiskMandateSourceRenderRows,
    mutateSourceState(payload, state) {
      payload.concentration.constraints[0].state = state;
    },
  }),
]);
