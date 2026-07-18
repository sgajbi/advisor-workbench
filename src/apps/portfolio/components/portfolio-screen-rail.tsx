"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Panel, Text } from "@/design-system";
import {
  buildPortfolioScreenNavigationItems,
  type PortfolioScreenNavigationKey,
} from "../portfolio-screen-navigation";

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
  const activeLabel = activeModeItem?.label ?? activeItem?.label ?? "Portfolio review";
  const activeDetail = activeModeItem
    ? `${activeItem?.label ?? "Workspace"} · ${activeModeItem.detail}`
    : activeItem?.detail ?? "Selected portfolio workflow";

  function closeCompactNavigation({ restoreFocus = false } = {}) {
    setNavigationExpanded(false);
    if (restoreFocus) {
      disclosureButtonRef.current?.focus();
    }
  }

  return (
    <Panel
      className="portfolio-screen-rail"
      onKeyDown={(event) => {
        if (event.key === "Escape" && navigationExpanded) {
          event.preventDefault();
          closeCompactNavigation({ restoreFocus: true });
        }
      }}
    >
      <div className="portfolio-screen-rail-header">
        <div className="portfolio-screen-rail-context">
          <Text variant="label">Review Workflow</Text>
          <strong title={portfolioId}>{portfolioId}</strong>
        </div>
        <button
          ref={disclosureButtonRef}
          type="button"
          className="portfolio-screen-rail-disclosure"
          aria-expanded={navigationExpanded}
          aria-controls={navigationId}
          onClick={() => setNavigationExpanded((expanded) => !expanded)}
        >
          <span>
            <small>Current view</small>
            <strong>{activeLabel}</strong>
            <em>{activeDetail}</em>
          </span>
          <span className="portfolio-screen-rail-disclosure-action" aria-hidden="true">
            Change
          </span>
        </button>
      </div>
      <nav
        id={navigationId}
        className={`portfolio-screen-rail-nav ${
          navigationExpanded
            ? "portfolio-screen-rail-nav-expanded"
            : "portfolio-screen-rail-nav-collapsed"
        }`}
        aria-label="Workbench screen navigation"
      >
        {screens.map((screen) => {
          const active = activeScreen === screen.key || pathname === screen.href;
          return (
            <Link
              key={screen.key}
              href={screen.href}
              aria-current={active ? "page" : undefined}
              className={`portfolio-screen-rail-link ${active ? "portfolio-screen-rail-link-active" : ""}`}
              onClick={() => closeCompactNavigation()}
            >
              <span>{screen.label}</span>
              <small>{screen.detail}</small>
            </Link>
          );
        })}
        {modeItems?.length ? (
          <div className="portfolio-screen-rail-subnav" aria-label={modeNavigationLabel}>
            {modeItems.map((item) => {
              const className = `portfolio-screen-rail-link portfolio-screen-rail-subnav-link ${
                item.active ? "portfolio-screen-rail-link-active" : ""
              }`;
              const content = (
                <>
                  <span>{item.label}</span>
                  <small>
                    {item.detail}
                    {item.status ? <em aria-label={`Status ${item.status}`}>{item.status}</em> : null}
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
