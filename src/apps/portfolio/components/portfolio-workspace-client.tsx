"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  WorkbenchRefreshStatus,
  WorkbenchToolbarPlaceholder,
} from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";

import {
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
} from "../api";
import { recordPortfolioShellRecoveryLifecycle } from "../portfolio-shell-recovery-observability";
import { isPortfolioWorkspaceIdentityConfirmed } from "../portfolio-selection";
import { PORTFOLIO_CURRENCY_LABELS } from "../portfolio-terminology";
import {
  applyPortfolioControlPatch,
  buildPortfolioReviewHref,
  hasPortfolioSourceControlOverride,
  isPortfolioReviewResponseCurrent,
  restorePortfolioSourceControls,
} from "../portfolio-workspace-controls";
import { buildPortfolioSummaryDetailsRequest } from "../portfolio-workspace-client-view-model";
import type { PortfolioCatalogResponse, PortfolioWorkspace } from "../types";
import {
  buildInitialPortfolioControls,
  buildPortfolioExportPayload,
  buildPortfolioWorkspaceContext,
  derivePortfolioWorkspace,
  getOrderedWorkflowCues,
  type PortfolioTimeWindow,
  type PortfolioWorkspaceControls,
} from "../view-model";
import PortfolioUnavailableWorkspace from "./portfolio-unavailable-workspace";
import PortfolioPageLayout from "./portfolio-page-layout";
import { buildPortfolioReviewContextStrip } from "../portfolio-review-context-strip-view-model";
import { buildUnavailableReviewContextStrip } from "@/shell/review-context-strip-view-model";
import PortfolioWorkspaceToolbar from "./portfolio-workspace-toolbar";
import PortfolioWorkspaceView from "./portfolio-workspace";

const summaryDetailsInflightRequests = new Map<
  string,
  ReturnType<typeof getPortfolioWorkspaceSummaryDetails>
>();
const shellInflightRequests = new Map<
  string,
  ReturnType<typeof getPortfolioWorkspaceShell>
>();

type WorkspaceStateDraft = {
  sourceKey: string;
  workspace: PortfolioWorkspace | null;
};

type ShellRequestState = {
  sourceKey: string;
  status: "idle" | "loading" | "loaded" | "unavailable";
};

type PortfolioControlStateDraft = {
  sourceKey: string;
  controls: PortfolioWorkspaceControls;
};

type PortfolioControlTransition = {
  sourceKey: string;
  status: "pending" | "confirmed" | "failed";
  requestedControls: PortfolioWorkspaceControls;
};

export default function PortfolioWorkspaceClient({
  portfolios,
  selectedPortfolioId,
  initialWorkspace,
  initialControls,
}: {
  portfolios: PortfolioCatalogResponse["items"];
  selectedPortfolioId: string | null;
  initialWorkspace: PortfolioWorkspace | null;
  initialControls?: PortfolioWorkspaceControls;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmedInitialWorkspace = isPortfolioWorkspaceIdentityConfirmed(
    initialWorkspace,
    selectedPortfolioId,
  )
    ? initialWorkspace
    : null;
  const initialWorkspaceSourceKey = useMemo(
    () =>
      buildPortfolioWorkspaceSourceKey(
        selectedPortfolioId,
        confirmedInitialWorkspace,
      ),
    [confirmedInitialWorkspace, selectedPortfolioId],
  );
  const initialControlValues = useMemo(
    () =>
      confirmedInitialWorkspace && initialControls
        ? initialControls
        : buildInitialPortfolioControls(confirmedInitialWorkspace),
    [confirmedInitialWorkspace, initialControls],
  );
  const [controlDraft, setControlDraft] = useState<PortfolioControlStateDraft>({
    sourceKey: initialWorkspaceSourceKey,
    controls: initialControlValues,
  });
  const controls =
    controlDraft.sourceKey === initialWorkspaceSourceKey
      ? controlDraft.controls
      : initialControlValues;
  const setControls = useCallback(
    (
      next:
        | PortfolioWorkspaceControls
        | ((current: PortfolioWorkspaceControls) => PortfolioWorkspaceControls),
    ) => {
      setControlDraft((current) => {
        const currentControls =
          current.sourceKey === initialWorkspaceSourceKey
            ? current.controls
            : initialControlValues;
        return {
          sourceKey: initialWorkspaceSourceKey,
          controls: typeof next === "function" ? next(currentControls) : next,
        };
      });
    },
    [initialControlValues, initialWorkspaceSourceKey],
  );
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceStateDraft>({
    sourceKey: initialWorkspaceSourceKey,
    workspace: confirmedInitialWorkspace,
  });
  const initialShellRequestState: ShellRequestState = {
    sourceKey: initialWorkspaceSourceKey,
    status: confirmedInitialWorkspace ? "loaded" : "idle",
  };
  const shellRequestRef = useRef<ShellRequestState>(initialShellRequestState);
  const [shellRequestState, setShellRequestState] = useState<ShellRequestState>(
    initialShellRequestState,
  );
  const workspaceState =
    workspaceDraft.sourceKey === initialWorkspaceSourceKey
      ? workspaceDraft.workspace
      : confirmedInitialWorkspace;
  const activeShellRequestStatus =
    shellRequestState.sourceKey === initialWorkspaceSourceKey
      ? shellRequestState.status
      : confirmedInitialWorkspace
        ? "loaded"
        : "idle";
  const setWorkspaceState = useCallback(
    (
      next:
        | PortfolioWorkspace
        | null
        | ((current: PortfolioWorkspace | null) => PortfolioWorkspace | null),
    ) => {
      setWorkspaceDraft((current) => {
        const currentWorkspace =
          current.sourceKey === initialWorkspaceSourceKey
            ? current.workspace
            : confirmedInitialWorkspace;
        return {
          sourceKey: initialWorkspaceSourceKey,
          workspace: typeof next === "function" ? next(currentWorkspace) : next,
        };
      });
    },
    [confirmedInitialWorkspace, initialWorkspaceSourceKey],
  );
  const interactiveReady = useClientMounted();
  const summaryRequestRef = useRef<{
    key: string;
    status: "loading" | "loaded";
  } | null>(null);
  const controlRequestSequence = useRef(0);
  const controlRequestSourceKey = useRef(initialWorkspaceSourceKey);
  const [controlTransition, setControlTransition] =
    useState<PortfolioControlTransition | null>(null);
  const initialControlTransition = useMemo<PortfolioControlTransition | null>(
    () =>
      confirmedInitialWorkspace &&
      hasPortfolioSourceControlOverride(
        initialControlValues,
        confirmedInitialWorkspace,
      )
        ? {
            sourceKey: initialWorkspaceSourceKey,
            status: "pending",
            requestedControls: initialControlValues,
          }
        : null,
    [
      confirmedInitialWorkspace,
      initialControlValues,
      initialWorkspaceSourceKey,
    ],
  );
  const activeControlTransition =
    controlTransition?.sourceKey === initialWorkspaceSourceKey
      ? controlTransition
      : initialControlTransition;
  const awaitsInitialSourceConfirmation =
    activeControlTransition?.status === "pending" &&
    Boolean(
      confirmedInitialWorkspace &&
        hasPortfolioSourceControlOverride(
          activeControlTransition.requestedControls,
          confirmedInitialWorkspace,
        ),
    );
  const context = useMemo(
    () => buildPortfolioWorkspaceContext(workspaceState, controls),
    [controls, workspaceState],
  );

  useEffect(() => {
    if (controlRequestSourceKey.current !== initialWorkspaceSourceKey) {
      controlRequestSourceKey.current = initialWorkspaceSourceKey;
      controlRequestSequence.current += 1;
    }
  }, [initialWorkspaceSourceKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadShellWorkspace() {
      if (shellRequestRef.current.sourceKey !== initialWorkspaceSourceKey) {
        const resetState: ShellRequestState = {
          sourceKey: initialWorkspaceSourceKey,
          status: confirmedInitialWorkspace ? "loaded" : "idle",
        };
        shellRequestRef.current = resetState;
        setShellRequestState(resetState);
      }
      if (
        !selectedPortfolioId ||
        workspaceState ||
        confirmedInitialWorkspace ||
        shellRequestRef.current.status !== "idle"
      ) {
        return;
      }

      const loadingState: ShellRequestState = {
        sourceKey: initialWorkspaceSourceKey,
        status: "loading",
      };
      shellRequestRef.current = loadingState;
      setShellRequestState(loadingState);
      const shellWorkspace =
        await getPortfolioWorkspaceShellOnce(selectedPortfolioId);
      if (cancelled) {
        return;
      }

      if (
        isPortfolioWorkspaceIdentityConfirmed(
          shellWorkspace,
          selectedPortfolioId,
        )
      ) {
        setControls((current) => {
          const defaults = buildInitialPortfolioControls(shellWorkspace);
          return {
            ...defaults,
            timeWindow: current.timeWindow,
          };
        });
        setWorkspaceState(shellWorkspace);
        const loadedState: ShellRequestState = {
          sourceKey: initialWorkspaceSourceKey,
          status: "loaded",
        };
        shellRequestRef.current = loadedState;
        setShellRequestState(loadedState);
        recordPortfolioShellRecoveryLifecycle("ready");
        return;
      }
      const unavailableState: ShellRequestState = {
        sourceKey: initialWorkspaceSourceKey,
        status: "unavailable",
      };
      shellRequestRef.current = unavailableState;
      setShellRequestState(unavailableState);
      recordPortfolioShellRecoveryLifecycle("unavailable");
    }

    void loadShellWorkspace();

    return () => {
      cancelled = true;
      if (
        shellRequestRef.current.sourceKey === initialWorkspaceSourceKey &&
        shellRequestRef.current.status === "loading"
      ) {
        shellRequestRef.current = {
          sourceKey: initialWorkspaceSourceKey,
          status: "idle",
        };
      }
    };
  }, [
    confirmedInitialWorkspace,
    initialWorkspaceSourceKey,
    selectedPortfolioId,
    setControls,
    setWorkspaceState,
    workspaceState,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaryDetails() {
      if (!selectedPortfolioId || !workspaceState) {
        return;
      }

      const request = buildPortfolioSummaryDetailsRequest(
        selectedPortfolioId,
        context,
      );
      const scopedRequestKey = `${initialWorkspaceSourceKey}|${request.key}`;
      if (summaryRequestRef.current?.key === scopedRequestKey) {
        return;
      }

      summaryRequestRef.current = { key: scopedRequestKey, status: "loading" };
      const details = await getPortfolioWorkspaceSummaryDetailsOnce(
        scopedRequestKey,
        selectedPortfolioId,
        request.params,
      );
      if (cancelled) {
        return;
      }

      const responseIsCurrent = isPortfolioReviewResponseCurrent(
        details,
        controls,
        request.params,
      );
      const sourceOverrideRequested = hasPortfolioSourceControlOverride(
        controls,
        workspaceState,
      );
      let completedRequestKey = scopedRequestKey;
      if (responseIsCurrent) {
        setWorkspaceState((current) =>
          current ? mergePortfolioWorkspace(current, details) : current,
        );
        if (sourceOverrideRequested) {
          setControlTransition({
            sourceKey: initialWorkspaceSourceKey,
            status: "confirmed",
            requestedControls: controls,
          });
        }
      } else {
        const requestedControls = controls;
        if (sourceOverrideRequested) {
          const confirmedControls = restorePortfolioSourceControls(
            controls,
            workspaceState,
          );
          const confirmedContext = buildPortfolioWorkspaceContext(
            workspaceState,
            confirmedControls,
          );
          const confirmedRequest = buildPortfolioSummaryDetailsRequest(
            selectedPortfolioId,
            confirmedContext,
          );
          completedRequestKey = `${initialWorkspaceSourceKey}|${confirmedRequest.key}`;
          setControls(confirmedControls);
          router.replace(
            buildPortfolioReviewHref({
              pathname,
              searchParams: searchParams ?? new URLSearchParams(),
              portfolioId: selectedPortfolioId,
              controls: confirmedControls,
            }),
            { scroll: false },
          );
        }
        if (details || sourceOverrideRequested) {
          setControlTransition({
            sourceKey: initialWorkspaceSourceKey,
            status: "failed",
            requestedControls,
          });
        }
      }
      summaryRequestRef.current = {
        key: completedRequestKey,
        status: "loaded",
      };
    }

    void loadSummaryDetails();

    return () => {
      cancelled = true;
    };
  }, [
    context,
    controls,
    initialWorkspaceSourceKey,
    pathname,
    router,
    searchParams,
    selectedPortfolioId,
    setControls,
    setWorkspaceState,
    workspaceState,
  ]);

  const workspace = useMemo(
    () =>
      awaitsInitialSourceConfirmation
        ? null
        : derivePortfolioWorkspace(workspaceState, controls),
    [awaitsInitialSourceConfirmation, controls, workspaceState],
  );
  function handleControlsChange(patch: Partial<PortfolioWorkspaceControls>) {
    const nextControls = applyPortfolioControlPatch(controls, patch);
    if (!requiresSourceConfirmation(patch)) {
      setControls(nextControls);
      return;
    }

    void confirmPortfolioControls(nextControls);
  }

  async function confirmPortfolioControls(
    requestedControls: PortfolioWorkspaceControls,
  ) {
    if (!selectedPortfolioId || !workspaceState) {
      return;
    }

    const requestId = ++controlRequestSequence.current;
    const requestedContext = buildPortfolioWorkspaceContext(
      workspaceState,
      requestedControls,
    );
    const request = buildPortfolioSummaryDetailsRequest(
      selectedPortfolioId,
      requestedContext,
    );
    const scopedRequestKey = `${initialWorkspaceSourceKey}|${request.key}`;
    setControlTransition({
      sourceKey: initialWorkspaceSourceKey,
      status: "pending",
      requestedControls,
    });

    const details = await getPortfolioWorkspaceSummaryDetailsOnce(
      scopedRequestKey,
      selectedPortfolioId,
      request.params,
    );
    if (requestId !== controlRequestSequence.current) {
      return;
    }

    if (
      !isPortfolioReviewResponseCurrent(
        details,
        requestedControls,
        request.params,
      )
    ) {
      setControlTransition({
        sourceKey: initialWorkspaceSourceKey,
        status: "failed",
        requestedControls,
      });
      return;
    }

    summaryRequestRef.current = { key: scopedRequestKey, status: "loaded" };
    setWorkspaceState((current) =>
      current ? mergePortfolioWorkspace(current, details) : current,
    );
    setControls(requestedControls);
    router.push(
      buildPortfolioReviewHref({
        pathname,
        searchParams: searchParams ?? new URLSearchParams(),
        portfolioId: selectedPortfolioId,
        controls: requestedControls,
      }),
      { scroll: false },
    );
    setControlTransition({
      sourceKey: initialWorkspaceSourceKey,
      status: "confirmed",
      requestedControls,
    });
  }

  function handleExport() {
    const payload = buildPortfolioExportPayload(workspace, context);
    if (!payload || !workspace) {
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${workspace.portfolio.portfolio_id}-${context.selectedAsOfDate}.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  const acceptedReportingCurrency =
    workspace &&
    activeControlTransition?.status === "confirmed" &&
    activeControlTransition.requestedControls.reportingCurrency !==
      workspace.portfolio.base_currency
      ? activeControlTransition.requestedControls.reportingCurrency
      : undefined;

  return (
    <PortfolioPageLayout
      reviewContext={
        workspace
          ? buildPortfolioReviewContextStrip(workspace, {
              acceptedReportingCurrency,
            })
          : buildUnavailableReviewContextStrip()
      }
    >
      {!portfolios.length ? (
        <PortfolioUnavailableWorkspace />
      ) : (
        <PortfolioWorkspaceView
          workspace={workspace}
          workspaceStatus={
            workspace
              ? "ready"
              : awaitsInitialSourceConfirmation ||
                  (selectedPortfolioId &&
                  (activeShellRequestStatus === "idle" ||
                    activeShellRequestStatus === "loading"))
                ? "loading"
                : "unavailable"
          }
          context={context}
          toolbar={
            !interactiveReady ? (
              <div className="workbench-toolbar-placeholder-stack">
                <WorkbenchToolbarPlaceholder
                  className="portfolio-workspace-toolbar"
                  contextMessage="Loading portfolio controls…"
                  fields={[
                    { key: "as-of", label: "As of" },
                    {
                      key: "reporting-currency",
                      label: PORTFOLIO_CURRENCY_LABELS.reporting,
                    },
                    { key: "period", label: "Period", width: "period" },
                  ]}
                />
              </div>
            ) : (
              <>
                <PortfolioWorkspaceToolbar
                  controls={controls}
                  context={context}
                  onControlsChange={handleControlsChange}
                  onExport={handleExport}
                  quickActions={
                    workspaceState ? getOrderedWorkflowCues(workspaceState) : []
                  }
                  contextChangePending={
                    activeControlTransition?.status === "pending"
                  }
                />
                {activeControlTransition ? (
                  <PortfolioControlTransitionStatus
                    transition={activeControlTransition}
                    confirmedControls={controls}
                    onRetry={() =>
                      void confirmPortfolioControls(
                        activeControlTransition.requestedControls,
                      )
                    }
                  />
                ) : null}
              </>
            )
          }
        />
      )}
    </PortfolioPageLayout>
  );
}

function PortfolioControlTransitionStatus({
  transition,
  confirmedControls,
  onRetry,
}: {
  transition: PortfolioControlTransition;
  confirmedControls: PortfolioWorkspaceControls;
  onRetry: () => void;
}) {
  const requestedContext = formatPortfolioControlContext(
    transition.requestedControls,
  );

  const confirmedContext = formatPortfolioControlContext(confirmedControls);

  if (transition.status === "pending") {
    return (
      <WorkbenchRefreshStatus
        kind="pending"
        eyebrow="Portfolio review context"
        title="Confirming review context"
        message="Source-backed portfolio detail is being refreshed before the view changes."
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }

  if (transition.status === "failed") {
    return (
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow="Portfolio review context"
        title="Review context was not changed"
        message="Portfolio detail could not be confirmed. The previous review context remains active."
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
        onRetry={onRetry}
        retryLabel="Retry portfolio review context"
      />
    );
  }

  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow="Portfolio review context"
      title="Review context confirmed"
      confirmedContext={confirmedContext}
    />
  );
}

function requiresSourceConfirmation(
  patch: Partial<PortfolioWorkspaceControls>,
): boolean {
  return [
    patch.asOfDate,
    patch.reportingCurrency,
    patch.timeWindow,
    patch.customStartDate,
    patch.customEndDate,
  ].some((value) => value !== undefined);
}

function formatPortfolioControlContext(
  controls: PortfolioWorkspaceControls,
): string {
  return `${formatBusinessDateValue(controls.asOfDate)} · ${controls.timeWindow} · ${controls.reportingCurrency}`;
}

function getPortfolioWorkspaceSummaryDetailsOnce(
  requestKey: string,
  portfolioId: string,
  params: {
    asOfDate?: string;
    reportingCurrency?: string;
    includeProjected?: boolean;
    timeWindow: PortfolioTimeWindow;
    reportStartDate: string;
    reportEndDate: string;
    usesCustomDateRange?: boolean;
  },
) {
  const existingRequest = summaryDetailsInflightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = getPortfolioWorkspaceSummaryDetails(
    portfolioId,
    params,
  ).finally(() => {
    summaryDetailsInflightRequests.delete(requestKey);
  });
  summaryDetailsInflightRequests.set(requestKey, request);
  return request;
}

function getPortfolioWorkspaceShellOnce(portfolioId: string) {
  const existingRequest = shellInflightRequests.get(portfolioId);
  if (existingRequest) {
    return existingRequest;
  }

  recordPortfolioShellRecoveryLifecycle("automatic_attempt");
  const request = getPortfolioWorkspaceShell(portfolioId).finally(() => {
    shellInflightRequests.delete(portfolioId);
  });
  shellInflightRequests.set(portfolioId, request);
  return request;
}

function buildPortfolioWorkspaceSourceKey(
  selectedPortfolioId: string | null,
  initialWorkspace: PortfolioWorkspace | null,
): string {
  return JSON.stringify({
    selectedPortfolioId,
    initialWorkspace,
  });
}
