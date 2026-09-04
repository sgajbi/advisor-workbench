"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { cx } from "@/design-system/utils/cx";
import type {
  PortfolioScreenNavigationItem,
  PortfolioScreenNavigationKey,
  PortfolioScreenNavigationModel,
  PortfolioScreenRailModeItem,
} from "../portfolio-screen-navigation";
import styles from "./portfolio-screen-rail.module.css";

type PortfolioScreenRailNavigationProps = {
  id: string;
  directoryId: string;
  workflowId: string;
  expanded: boolean;
  model: PortfolioScreenNavigationModel;
  activeScreen: PortfolioScreenNavigationKey;
  modeItems?: PortfolioScreenRailModeItem[];
  modeNavigationLabel: string;
  onDestinationSelected: (
    options?: { restoreCompactFocus?: boolean },
  ) => void;
};

function isModeItemActionable(item: PortfolioScreenRailModeItem) {
  return !item.disabled && Boolean(item.href || item.onSelect);
}

export default function PortfolioScreenRailNavigation({
  id,
  directoryId,
  workflowId,
  expanded,
  model,
  activeScreen,
  modeItems,
  modeNavigationLabel,
  onDestinationSelected,
}: PortfolioScreenRailNavigationProps) {
  const [directoryExpanded, setDirectoryExpanded] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const directoryButtonRef = useRef<HTMLButtonElement>(null);
  const workflowButtonRef = useRef<HTMLButtonElement>(null);
  const activeModeItem = modeItems?.find((item) => item.active) ?? null;
  const otherModeItems = modeItems?.filter((item) => !item.active) ?? [];
  const actionableModeItemCount = otherModeItems.filter(isModeItemActionable).length;
  const directoryItemCount = model.directoryGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );

  function closeNestedNavigation({
    restoreWorkflowFocus = false,
  }: { restoreWorkflowFocus?: boolean } = {}) {
    setDirectoryExpanded(false);
    setWorkflowExpanded(false);
    onDestinationSelected({ restoreCompactFocus: expanded });
    if (restoreWorkflowFocus && !expanded) {
      workflowButtonRef.current?.focus();
    }
  }

  function restoreDisclosureFocus(
    event: KeyboardEvent<HTMLElement>,
    isOpen: boolean,
    close: () => void,
    trigger: HTMLButtonElement | null,
  ) {
    if (event.key !== "Escape" || !isOpen) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    close();
    trigger?.focus();
  }

  function renderScreenLink(item: PortfolioScreenNavigationItem) {
    const active = item.key === activeScreen;
    return (
      <Link
        key={item.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cx(styles.link, active && styles.linkActive)}
        onClick={() => closeNestedNavigation()}
      >
        <span>{item.label}</span>
        <small>{item.detail}</small>
      </Link>
    );
  }

  function renderModeItem(item: PortfolioScreenRailModeItem) {
    const actionable = isModeItemActionable(item);
    const className = cx(
      styles.link,
      styles.subnavigationLink,
      item.active && styles.linkActive,
    );
    const content = (
      <>
        <span>{item.label}</span>
        <small>
          {item.detail}
          {item.status ? (
            <em aria-label={`Status ${item.status}`}>{item.status}</em>
          ) : null}
        </small>
      </>
    );

    if (item.href && actionable) {
      return (
        <Link
          key={item.key}
          href={item.href}
          prefetch={item.prefetch}
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          className={className}
          title={item.title}
          onClick={() => closeNestedNavigation({ restoreWorkflowFocus: true })}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        disabled={!actionable}
        aria-label={item.label}
        aria-current={item.active ? "page" : undefined}
        className={className}
        title={item.title}
        onClick={() => {
          item.onSelect?.();
          closeNestedNavigation({ restoreWorkflowFocus: true });
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <nav
      id={id}
      className={cx(
        styles.navigation,
        expanded ? styles.navigationExpanded : styles.navigationCollapsed,
      )}
      data-navigation-state={expanded ? "expanded" : "collapsed"}
      data-default-destination-count={
        model.primaryItems.length + (model.currentTask ? 1 : 0) + (activeModeItem ? 1 : 0)
      }
      aria-label="Workbench screen navigation"
    >
      <div className={styles.navigationGroup} role="group" aria-label="Primary workspaces">
        <span className={styles.sectionLabel}>Daily work</span>
        {model.primaryItems.map(renderScreenLink)}
      </div>

      {model.currentTask ? (
        <div className={styles.currentTask} role="group" aria-label="Current task">
          <span className={styles.sectionLabel}>Current task</span>
          {renderScreenLink(model.currentTask)}
        </div>
      ) : null}

      <div
        className={styles.directorySection}
        onKeyDown={(event) =>
          restoreDisclosureFocus(
            event,
            directoryExpanded,
            () => setDirectoryExpanded(false),
            directoryButtonRef.current,
          )
        }
      >
        <button
          ref={directoryButtonRef}
          type="button"
          className={styles.directoryDisclosure}
          aria-expanded={directoryExpanded}
          aria-controls={directoryId}
          onClick={() => setDirectoryExpanded((current) => !current)}
        >
          <span>
            <strong>All workspaces</strong>
            <small>{directoryItemCount} specialist views</small>
          </span>
          <span className={styles.disclosureAction} aria-hidden="true">
            {directoryExpanded ? "Close" : "Browse"}
          </span>
        </button>
        <div
          id={directoryId}
          className={styles.directory}
          hidden={!directoryExpanded}
          data-testid="workbench-workspace-directory"
        >
          {model.directoryGroups.map((group) => (
            <div key={group.key} className={styles.directoryGroup}>
              <span className={styles.directoryLabel}>{group.label}</span>
              {group.items.map(renderScreenLink)}
            </div>
          ))}
        </div>
      </div>

      {activeModeItem ? (
        <div
          className={styles.subnavigation}
          role="group"
          aria-label={modeNavigationLabel}
          onKeyDown={(event) =>
            restoreDisclosureFocus(
              event,
              workflowExpanded,
              () => setWorkflowExpanded(false),
              workflowButtonRef.current,
            )
          }
        >
          <span className={styles.sectionLabel}>Current workflow</span>
          {renderModeItem(activeModeItem)}
          {actionableModeItemCount > 0 ? (
            <>
              <button
                ref={workflowButtonRef}
                type="button"
                className={styles.directoryDisclosure}
                aria-expanded={workflowExpanded}
                aria-controls={workflowId}
                onClick={() => setWorkflowExpanded((current) => !current)}
              >
                <span>
                  <strong>Change workflow step</strong>
                  <small>
                    {actionableModeItemCount}{" "}
                    {actionableModeItemCount === 1 ? "available step" : "available steps"}
                  </small>
                </span>
                <span className={styles.disclosureAction} aria-hidden="true">
                  {workflowExpanded ? "Close" : "Choose"}
                </span>
              </button>
              <div
                id={workflowId}
                className={styles.workflowDirectory}
                hidden={!workflowExpanded}
                data-testid="workbench-workflow-directory"
              >
                {otherModeItems.map(renderModeItem)}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
