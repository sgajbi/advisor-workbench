"use client";

import { forwardRef, useRef } from "react";

import ActionButton, { type ActionButtonPriority } from "./action-button";

type SourceRefreshActionProps = {
  refreshScope: string;
  idleLabel: string;
  busyLabel: string;
  isRefreshing: boolean;
  onRefresh: () => Promise<unknown>;
  priority?: ActionButtonPriority;
  className?: string;
};

const SourceRefreshAction = forwardRef<HTMLButtonElement, SourceRefreshActionProps>(
  function SourceRefreshAction(
    {
      refreshScope,
      idleLabel,
      busyLabel,
      isRefreshing,
      onRefresh,
      priority = "secondary",
      className,
    },
    ref,
  ) {
    const refreshInFlight = useRef<string | null>(null);
    const actionLabel = isRefreshing ? busyLabel : idleLabel;

    async function refreshOnce() {
      if (refreshInFlight.current === refreshScope || isRefreshing) return;
      refreshInFlight.current = refreshScope;

      try {
        await onRefresh();
      } catch {
        // The owning source-state projection renders support-safe failure evidence.
      } finally {
        if (refreshInFlight.current === refreshScope) {
          refreshInFlight.current = null;
        }
      }
    }

    return (
      <ActionButton
        ref={ref}
        priority={priority}
        className={className}
        aria-disabled={isRefreshing}
        aria-label={actionLabel}
        onClick={() => void refreshOnce()}
      >
        {actionLabel}
      </ActionButton>
    );
  },
);

export default SourceRefreshAction;
