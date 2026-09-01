export type PmOperatingQualityListContext = Readonly<{
  asOfDate: string;
  limit: number;
  offset: number;
}>;

export const PM_OPERATING_QUALITY_PERSISTENCE_SCOPE =
  "workbench-pm-operating-quality-persistence";

export const pmOperatingQualityQueryKeys = {
  all: ["workbench", "pm-operating-quality"] as const,
  fairnessAnalyses: (context: PmOperatingQualityListContext) =>
    [
      ...pmOperatingQualityQueryKeys.all,
      "fairness-analyses",
      context,
    ] as const,
  fairnessAnalysis: (fairnessAnalysisId: string) =>
    [
      ...pmOperatingQualityQueryKeys.all,
      "fairness-analyses",
      fairnessAnalysisId,
    ] as const,
  reviewActions: (context: PmOperatingQualityListContext) =>
    [...pmOperatingQualityQueryKeys.all, "review-actions", context] as const,
  reviewAction: (reviewActionId: string) =>
    [
      ...pmOperatingQualityQueryKeys.all,
      "review-actions",
      reviewActionId,
    ] as const,
  summaryInvocations: (context: PmOperatingQualityListContext) =>
    [
      ...pmOperatingQualityQueryKeys.all,
      "summary-invocations",
      context,
    ] as const,
  summaryInvocation: (summaryInvocationId: string) =>
    [
      ...pmOperatingQualityQueryKeys.all,
      "summary-invocations",
      summaryInvocationId,
    ] as const,
};

export const pmOperatingQualityMutationKeys = {
  all: [...pmOperatingQualityQueryKeys.all, "mutation"] as const,
  scoreRunPreview: () =>
    [...pmOperatingQualityMutationKeys.all, "score-run-preview"] as const,
  supportSummary: () =>
    [...pmOperatingQualityMutationKeys.all, "support-summary"] as const,
  fairnessPreview: () =>
    [...pmOperatingQualityMutationKeys.all, "fairness-preview"] as const,
  fairnessCreate: () =>
    [...pmOperatingQualityMutationKeys.all, "fairness-create"] as const,
  reviewActionPreview: () =>
    [...pmOperatingQualityMutationKeys.all, "review-action-preview"] as const,
  reviewActionCreate: () =>
    [...pmOperatingQualityMutationKeys.all, "review-action-create"] as const,
  summaryInvocationPreview: () =>
    [
      ...pmOperatingQualityMutationKeys.all,
      "summary-invocation-preview",
    ] as const,
  summaryInvocationCreate: () =>
    [
      ...pmOperatingQualityMutationKeys.all,
      "summary-invocation-create",
    ] as const,
};
