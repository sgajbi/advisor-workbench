"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Panel, Text } from "@/design-system";
import { cx } from "@/design-system/utils/cx";
import AdvisorBookContextSwitcher from "@/features/advisor-book/components/advisor-book-context-switcher";
import {
  buildPortfolioScreenNavigationItems,
  type PortfolioScreenNavigationKey,
} from "../portfolio-screen-navigation";
import styles from "./portfolio-screen-rail.module.css";

export type PortfolioScreenRailModeItem = {
  key: string;
  label: string;
  detail: string;
  active: boolean;
  disabled?: boolean;
  status?: string;
  title?: string;
  href?: string;
  onSelect?: () => void;
};

export default function PortfolioScreenRail({
  portfolioId,
  activeScreen,
  modeItems,
  modeNavigationLabel = "Workspace surface navigation",
}: {
  portfolioId: string;
  activeScreen: PortfolioScreenNavigationKey;
  modeItems?: PortfolioScreenRailModeItem[];
  modeNavigationLabel?: string;
}) {
  const pathname = usePathname();
  const screens = buildPortfolioScreenNavigationItems(portfolioId);
  const [navigationExpanded, setNavigationExpanded] = useState(false);
  const navigationId = useId();
  const disclosureButtonRef = useRef<HTMLButtonElement>(null);
  const activeModeItem = modeItems?.find((item) => item.active);
  const activeItem = screens.find(
    (screen) => activeScreen === screen.key || pathname === screen.href,
  );
  const activeLabel =
    activeModeItem?.label ?? activeItem?.label ?? "Portfolio review";
  const activeDetail = activeModeItem
    ? `${activeItem?.label ?? "Workspace"} · ${activeModeItem.detail}`
    : (activeItem?.detail ?? "Selected portfolio workflow");

  function closeCompactNavigation({ restoreFocus = false } = {}) {
    setNavigationExpanded(false);
    if (restoreFocus) {
      disclosureButtonRef.current?.focus();
    }
  }

  return (
    <Panel
      className={styles.rail}
      data-testid="portfolio-screen-rail"
      onKeyDown={(event) => {
        if (event.key === "Escape" && navigationExpanded) {
          event.preventDefault();
          closeCompactNavigation({ restoreFocus: true });
        }
      }}
    >
      <div
        className={styles.header}
        data-testid="portfolio-screen-rail-header"
      >
        <AdvisorBookContextSwitcher
          pathname={pathname}
          portfolioId={portfolioId}
        />
        <div className={styles.context}>
          <Text variant="label">Selected portfolio</Text>
          <strong title={portfolioId}>{portfolioId}</strong>
        </div>
        <button
          ref={disclosureButtonRef}
          type="button"
          className={styles.disclosure}
          aria-expanded={navigationExpanded}
          aria-controls={navigationId}
          onClick={() => setNavigationExpanded((expanded) => !expanded)}
        >
          <span>
            <small>Current view</small>
            <strong>{activeLabel}</strong>
            <em>{activeDetail}</em>
          </span>
          <span className={styles.disclosureAction} aria-hidden="true">
            Change
          </span>
        </button>
      </div>
      <nav
        id={navigationId}
        className={cx(
          styles.navigation,
          navigationExpanded
            ? styles.navigationExpanded
            : styles.navigationCollapsed,
        )}
        data-navigation-state={navigationExpanded ? "expanded" : "collapsed"}
        aria-label="Workbench screen navigation"
      >
        {screens.map((screen) => {
          const active =
            activeScreen === screen.key || pathname === screen.href;
          return (
            <Link
              key={screen.key}
              href={screen.href}
              aria-current={active ? "page" : undefined}
              className={cx(styles.link, active && styles.linkActive)}
              onClick={() => closeCompactNavigation()}
            >
              <span>{screen.label}</span>
              <small>{screen.detail}</small>
            </Link>
          );
        })}
        {modeItems?.length ? (
          <div
            className={styles.subnavigation}
            aria-label={modeNavigationLabel}
          >
            {modeItems.map((item) => {
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
                      <em aria-label={`Status ${item.status}`}>
                        {item.status}
                      </em>
                    ) : null}
                  </small>
                </>
              );

              if (item.href && !item.disabled) {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={item.active ? "page" : undefined}
                    className={className}
                    title={item.title}
                    onClick={() => closeCompactNavigation()}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.disabled}
                  aria-label={item.label}
                  aria-current={item.active ? "page" : undefined}
                  className={className}
                  title={item.title}
                  onClick={() => {
                    item.onSelect?.();
                    closeCompactNavigation();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ) : null}
      </nav>
    </Panel>
  );
}
