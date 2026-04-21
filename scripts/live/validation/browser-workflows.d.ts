export function hasAcceptedAdvisorBriefReviewPosture(text: string): boolean;

export function createBrowserValidationHelpers(args: {
  outputDir: string;
  summary: {
    uiChecks: unknown[];
    screenshots: unknown[];
  };
  portfolioId: string;
  benchmarkCode: string;
  canonicalAsOfDate: string;
  timeoutMs: number;
  panelRegistryById: Map<
    string,
    {
      screenshotName?: string;
      route: string;
    }
  >;
}): {
  assertListHasItems: (...args: unknown[]) => Promise<void>;
  assertTableHasRows: (...args: unknown[]) => Promise<void>;
  screenshotRegisteredPanel: (...args: unknown[]) => Promise<void>;
  resolveRegistryRoute: (routeTemplate: string) => string;
};
