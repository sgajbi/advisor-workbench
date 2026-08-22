"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { WorkspaceMenuNav } from "@/design-system";
import { fallbackNormalizedCapabilities } from "@/features/platform-capabilities/api";
import { usePlatformCapabilities } from "@/features/platform-capabilities/use-platform-capabilities";
import type { PlatformShellWorkspaceDescriptor } from "@/features/platform-capabilities/types";

import { resolveShellRouteContext } from "./app-registry";
import styles from "./app-shell.module.css";
import {
  buildReviewContextHref,
  parseReviewContext,
  scopeReviewContextForWorkspace,
} from "./review-context";
import { getWorkspaceDisabledTitle } from "./workspace-supportability-copy";

export default function AppSwitcherNav() {
  const { loading, normalized, shellBootstrapSource } = usePlatformCapabilities();
  const fallback = fallbackNormalizedCapabilities();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeContext = resolveShellRouteContext(pathname, searchParams);
  const routeIdentity = `${pathname ?? ""}?${searchParams.toString()}`;
  const reviewContextResult = parseReviewContext(searchParams);
  const workspaceDescriptors =
    shellBootstrapSource === "contract"
      ? normalized.shellBootstrap.workspaces
      : shellBootstrapSource === "fallback"
        ? fallback.shellBootstrap.workspaces
        : [];

  if (loading && shellBootstrapSource === "loading") {
    return <AppSwitcherNavLoading />;
  }

  const items = workspaceDescriptors.map((workspace) => {
    const reviewContextInvalid = reviewContextResult.status === "invalid";
    const disabled = !workspace.enabled || reviewContextInvalid;
    return {
      key: workspace.id,
      label: workspace.label,
      href:
        !disabled && reviewContextResult.status === "valid"
          ? buildReviewContextHref(
              workspace.href,
              scopeReviewContextForWorkspace(reviewContextResult.context),
            )
          : undefined,
      disabled,
      active: routeContext.workspaceId === workspace.id,
      title: reviewContextInvalid
        ? "Review context is invalid. Correct the portfolio, date, period, or currency selection before switching workspaces."
        : buildWorkspaceTitle(workspace),
    };
  });

  return (
    <WorkspaceMenuNav
      items={items}
      ariaLabel="Workspace Navigation"
      navigationIdentity={routeIdentity}
    />
  );
}

export function AppSwitcherNavLoading() {
  return (
    <div
      className={styles.workspaceLoading}
      role="status"
      aria-label="Checking workspace availability"
    >
      <small>Workspace</small>
      <strong>Checking availability</strong>
    </div>
  );
}

function buildWorkspaceTitle(workspace: PlatformShellWorkspaceDescriptor): string {
  if (workspace.enabled) {
    return workspace.label;
  }

  return getWorkspaceDisabledTitle(workspace);
}
