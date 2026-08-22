"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Panel, ScreenStatePanel, Text } from "@/design-system";
import AdvisorBookContextSwitcher from "@/features/advisor-book/components/advisor-book-context-switcher";
import { parseReviewContext } from "@/shell/review-context";
import {
  buildPortfolioScreenNavigationModel,
  type PortfolioScreenNavigationKey,
  type PortfolioScreenRailModeItem,
} from "../portfolio-screen-navigation";
import PortfolioScreenRailNavigation from "./portfolio-screen-rail-navigation";
import styles from "./portfolio-screen-rail.module.css";

export type { PortfolioScreenRailModeItem } from "../portfolio-screen-navigation";

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
  const searchParams = useSearchParams();
  const reviewContextResult = parseReviewContext(searchParams);
  const portfolioContextMismatch =
    reviewContextResult.status === "valid" &&
    reviewContextResult.context.portfolioId !== undefined &&
    reviewContextResult.context.portfolioId !== portfolioId;
  const reviewContextInvalid =
    reviewContextResult.status === "invalid" || portfolioContextMismatch;
  const navigationModel = buildPortfolioScreenNavigationModel(
    reviewContextResult.status === "valid" && !portfolioContextMismatch
      ? { ...reviewContextResult.context, portfolioId }
      : { portfolioId },
    activeScreen,
  );
  const [navigationExpanded, setNavigationExpanded] = useState(false);
  const navigationId = useId();
  const disclosureButtonRef = useRef<HTMLButtonElement>(null);
  const activeModeItem = modeItems?.find((item) => item.active);
  const activeItem =
    navigationModel.currentTask ??
    navigationModel.primaryItems.find((item) => item.key === activeScreen);
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
      {reviewContextInvalid ? (
        <div role="alert">
          <ScreenStatePanel
            kind="error"
            surface="portfolio"
            title="Review context needs attention"
            body="The portfolio review address contains conflicting or unsupported context. Correct the portfolio, date, period, or currency before opening another workspace."
          />
        </div>
      ) : (
        <PortfolioScreenRailNavigation
          key={navigationExpanded ? "expanded" : "collapsed"}
          id={navigationId}
          expanded={navigationExpanded}
          model={navigationModel}
          activeScreen={activeScreen}
          modeItems={modeItems}
          modeNavigationLabel={modeNavigationLabel}
          onDestinationSelected={({ restoreCompactFocus = false } = {}) =>
            closeCompactNavigation({ restoreFocus: restoreCompactFocus })
          }
        />
      )}
    </Panel>
  );
}
