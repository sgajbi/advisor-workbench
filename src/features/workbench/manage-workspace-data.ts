import {
  getDpmCommandCenter,
  getDpmCommandCenterExceptions,
  getDpmMandateByPortfolio,
  getDpmMandateHealth,
  getDpmOutcomeReviews,
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  getDpmPortfolioMemory,
  getDpmProofPack,
  listDpmCampaignDefinitions,
  listDpmCampaignDiscovery,
  listDpmPmOperatingQualityFairnessAnalyses,
  getPortfolio360,
  listDpmPmOperatingQualityPolicies,
  listDpmPmOperatingQualityReviewActions,
  listDpmPmOperatingQualityScoreRuns,
  listDpmWaves,
} from "@/features/workbench/api";

export type ManageWorkspaceData = {
  portfolio: Awaited<ReturnType<typeof getPortfolio360>>;
  commandCenter: Awaited<ReturnType<typeof getDpmCommandCenter>> | null;
  commandCenterExceptions: Awaited<ReturnType<typeof getDpmCommandCenterExceptions>> | null;
  mandate: Awaited<ReturnType<typeof getDpmMandateByPortfolio>> | null;
  mandateHealth: Awaited<ReturnType<typeof getDpmMandateHealth>> | null;
  commandCenterError: string | null;
  portfolioMemory: Awaited<ReturnType<typeof getDpmPortfolioMemory>> | null;
  portfolioMemoryError: string | null;
  pmOperatingQualityPolicies: Awaited<ReturnType<typeof listDpmPmOperatingQualityPolicies>> | null;
  pmOperatingQualityPoliciesError: string | null;
  pmOperatingQualityScoreRuns: Awaited<ReturnType<typeof listDpmPmOperatingQualityScoreRuns>> | null;
  pmOperatingQualityScoreRunsError: string | null;
  pmOperatingQualityFairnessAnalyses: Awaited<
    ReturnType<typeof listDpmPmOperatingQualityFairnessAnalyses>
  > | null;
  pmOperatingQualityFairnessAnalysesError: string | null;
  pmOperatingQualityFairnessAnalysisDetail: Awaited<
    ReturnType<typeof getDpmPmOperatingQualityFairnessAnalysis>
  > | null;
  pmOperatingQualityFairnessAnalysisDetailError: string | null;
  pmOperatingQualityReviewActions: Awaited<
    ReturnType<typeof listDpmPmOperatingQualityReviewActions>
  > | null;
  pmOperatingQualityReviewActionDetail: Awaited<
    ReturnType<typeof getDpmPmOperatingQualityReviewAction>
  > | null;
  pmOperatingQualityReviewActionsError: string | null;
  pmOperatingQualityReviewActionDetailError: string | null;
  waves: Awaited<ReturnType<typeof listDpmWaves>> | null;
  wavesError: string | null;
  campaignDefinitions: Awaited<ReturnType<typeof listDpmCampaignDefinitions>> | null;
  campaignDefinitionsError: string | null;
  campaignDiscovery: Awaited<ReturnType<typeof listDpmCampaignDiscovery>> | null;
  campaignDiscoveryError: string | null;
  outcomeReviews: Awaited<ReturnType<typeof getDpmOutcomeReviews>> | null;
  outcomeReviewError: string | null;
  proofPack: Awaited<ReturnType<typeof getDpmProofPack>> | null;
  proofPackError: string | null;
};

export async function loadManageWorkspaceData(
  portfolio: Awaited<ReturnType<typeof getPortfolio360>>
): Promise<ManageWorkspaceData> {
  const portfolioId = portfolio.portfolio.portfolio_id;
  const [
    commandCenterResult,
    exceptionsResult,
    mandateResult,
    memoryResult,
    wavesResult,
    campaignDefinitionsResult,
    campaignDiscoveryResult,
    pmQualityPoliciesResult,
    pmQualityScoreRunsResult,
    pmQualityFairnessAnalysesResult,
    pmQualityReviewActionsResult,
    reviewsResult,
  ] = await Promise.allSettled([
    getDpmCommandCenter({ limit: 25 }),
    getDpmCommandCenterExceptions({ state: "ACTIVE", limit: 25 }),
    getDpmMandateByPortfolio(portfolioId),
    getDpmPortfolioMemory({ portfolioId, limit: 100 }),
    listDpmWaves({ triggerType: "EXPLICIT_PORTFOLIO_LIST", limit: 10 }),
    listDpmCampaignDefinitions({ campaignStatus: "ACTIVE", limit: 10 }),
    listDpmCampaignDiscovery({ campaignStatus: "ACTIVE", limit: 10 }),
    listDpmPmOperatingQualityPolicies({ limit: 10 }),
    listDpmPmOperatingQualityScoreRuns({ limit: 10 }),
    listDpmPmOperatingQualityFairnessAnalyses({ limit: 10 }),
    listDpmPmOperatingQualityReviewActions({ limit: 10 }),
    getDpmOutcomeReviews({ portfolioId, limit: 10 }),
  ]);

  const mandate = readSettledValue(mandateResult);
  const mandateId = readDpmMandateId(mandate?.data ?? null);
  const outcomeReviews = readSettledValue(reviewsResult);
  let mandateHealth: Awaited<ReturnType<typeof getDpmMandateHealth>> | null = null;
  if (mandateId) {
    try {
      mandateHealth = await getDpmMandateHealth(mandateId);
    } catch {
      mandateHealth = null;
    }
  }

  let proofPack: Awaited<ReturnType<typeof getDpmProofPack>> | null = null;
  let proofPackError: string | null = null;
  const proofPackId = readDpmProofPackId(outcomeReviews?.data ?? null);
  if (proofPackId) {
    try {
      proofPack = await getDpmProofPack(proofPackId);
    } catch (error) {
      proofPackError = error instanceof Error ? error.message : "Evidence pack endpoint unavailable.";
    }
  }

  const fairnessAnalyses = readSettledValue(pmQualityFairnessAnalysesResult);
  let fairnessAnalysisDetail: Awaited<
    ReturnType<typeof getDpmPmOperatingQualityFairnessAnalysis>
  > | null = null;
  let fairnessAnalysisDetailError: string | null = null;
  const fairnessAnalysisId = readDpmFairnessAnalysisId(fairnessAnalyses?.data ?? null);
  if (fairnessAnalysisId) {
    try {
      fairnessAnalysisDetail = await getDpmPmOperatingQualityFairnessAnalysis(fairnessAnalysisId);
    } catch (error) {
      fairnessAnalysisDetailError =
        error instanceof Error
          ? error.message
          : "PM operating quality fairness-analysis detail endpoint unavailable.";
    }
  }

  const reviewActions = readSettledValue(pmQualityReviewActionsResult);
  let reviewActionDetail: Awaited<ReturnType<typeof getDpmPmOperatingQualityReviewAction>> | null =
    null;
  let reviewActionDetailError: string | null = null;
  const reviewActionId = readDpmReviewActionId(reviewActions?.data ?? null);
  if (reviewActionId) {
    try {
      reviewActionDetail = await getDpmPmOperatingQualityReviewAction(reviewActionId);
    } catch (error) {
      reviewActionDetailError =
        error instanceof Error
          ? error.message
          : "PM operating quality review-action detail endpoint unavailable.";
    }
  }

  return {
    portfolio,
    commandCenter: readSettledValue(commandCenterResult),
    commandCenterExceptions: readSettledValue(exceptionsResult),
    mandate,
    mandateHealth,
    commandCenterError: readSettledError(
      commandCenterResult,
      "Mandate readiness is temporarily unavailable."
    ),
    portfolioMemory: readSettledValue(memoryResult),
    portfolioMemoryError: readSettledError(
      memoryResult,
      "Portfolio-memory endpoint unavailable."
    ),
    pmOperatingQualityPolicies: readSettledValue(pmQualityPoliciesResult),
    pmOperatingQualityPoliciesError: readSettledError(
      pmQualityPoliciesResult,
      "PM operating quality policy endpoint unavailable."
    ),
    pmOperatingQualityScoreRuns: readSettledValue(pmQualityScoreRunsResult),
    pmOperatingQualityScoreRunsError: readSettledError(
      pmQualityScoreRunsResult,
      "PM operating quality score-run endpoint unavailable."
    ),
    pmOperatingQualityFairnessAnalyses: fairnessAnalyses,
    pmOperatingQualityFairnessAnalysesError: readSettledError(
      pmQualityFairnessAnalysesResult,
      "PM operating quality fairness-analysis list endpoint unavailable."
    ),
    pmOperatingQualityFairnessAnalysisDetail: fairnessAnalysisDetail,
    pmOperatingQualityFairnessAnalysisDetailError: fairnessAnalysisDetailError,
    pmOperatingQualityReviewActions: reviewActions,
    pmOperatingQualityReviewActionDetail: reviewActionDetail,
    pmOperatingQualityReviewActionsError: readSettledError(
      pmQualityReviewActionsResult,
      "PM operating quality review-action list endpoint unavailable."
    ),
    pmOperatingQualityReviewActionDetailError: reviewActionDetailError,
    waves: readSettledValue(wavesResult),
    wavesError: readSettledError(wavesResult, "DPM wave endpoint unavailable."),
    campaignDefinitions: readSettledValue(campaignDefinitionsResult),
    campaignDefinitionsError: readSettledError(
      campaignDefinitionsResult,
      "DPM campaign-definition endpoint unavailable."
    ),
    campaignDiscovery: readSettledValue(campaignDiscoveryResult),
    campaignDiscoveryError: readSettledError(
      campaignDiscoveryResult,
      "DPM campaign-discovery endpoint unavailable."
    ),
    outcomeReviews,
    outcomeReviewError: readSettledError(
      reviewsResult,
      "Outcome review endpoint unavailable."
    ),
    proofPack,
    proofPackError,
  };
}

export function readDpmReviewActionId(data: Record<string, unknown> | null): string | null {
  if (!data) {
    return null;
  }
  if (typeof data.review_action_id === "string" && data.review_action_id.trim().length > 0) {
    return data.review_action_id;
  }
  const reviewAction = data.review_action;
  if (reviewAction && typeof reviewAction === "object" && !Array.isArray(reviewAction)) {
    const reviewActionId = (reviewAction as Record<string, unknown>).review_action_id;
    if (typeof reviewActionId === "string" && reviewActionId.trim().length > 0) {
      return reviewActionId;
    }
  }
  const items = Array.isArray(data.review_actions)
    ? data.review_actions
    : Array.isArray(data.items)
      ? data.items
      : [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const reviewActionId = (item as Record<string, unknown>).review_action_id;
    if (typeof reviewActionId === "string" && reviewActionId.trim().length > 0) {
      return reviewActionId;
    }
  }
  return null;
}

function readSettledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function readSettledError<T>(result: PromiseSettledResult<T>, fallback: string): string | null {
  if (result.status === "fulfilled") {
    return null;
  }
  return result.reason instanceof Error ? result.reason.message : fallback;
}

export function readDpmMandateId(data: Record<string, unknown> | null): string | null {
  if (!data) {
    return null;
  }
  if (typeof data.mandate_id === "string" && data.mandate_id.trim().length > 0) {
    return data.mandate_id;
  }
  const mandate = data.mandate;
  if (mandate && typeof mandate === "object" && !Array.isArray(mandate)) {
    const mandateId = (mandate as Record<string, unknown>).mandate_id;
    return typeof mandateId === "string" && mandateId.trim().length > 0 ? mandateId : null;
  }
  return null;
}

export function readDpmProofPackId(data: Record<string, unknown> | null): string | null {
  if (!data) {
    return null;
  }
  if (typeof data.proof_pack_id === "string" && data.proof_pack_id.trim().length > 0) {
    return data.proof_pack_id;
  }
  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const proofPackId = (item as Record<string, unknown>).proof_pack_id;
    if (typeof proofPackId === "string" && proofPackId.trim().length > 0) {
      return proofPackId;
    }
  }
  return null;
}

export function readDpmFairnessAnalysisId(data: Record<string, unknown> | null): string | null {
  if (!data) {
    return null;
  }
  if (
    typeof data.fairness_analysis_id === "string" &&
    data.fairness_analysis_id.trim().length > 0
  ) {
    return data.fairness_analysis_id;
  }
  const fairnessAnalysis = data.fairness_analysis;
  if (
    fairnessAnalysis &&
    typeof fairnessAnalysis === "object" &&
    !Array.isArray(fairnessAnalysis)
  ) {
    const fairnessAnalysisId = (fairnessAnalysis as Record<string, unknown>).fairness_analysis_id;
    if (typeof fairnessAnalysisId === "string" && fairnessAnalysisId.trim().length > 0) {
      return fairnessAnalysisId;
    }
  }
  const items = Array.isArray(data.fairness_analyses)
    ? data.fairness_analyses
    : Array.isArray(data.items)
      ? data.items
      : [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const fairnessAnalysisId = (item as Record<string, unknown>).fairness_analysis_id;
    if (typeof fairnessAnalysisId === "string" && fairnessAnalysisId.trim().length > 0) {
      return fairnessAnalysisId;
    }
  }
  return null;
}
