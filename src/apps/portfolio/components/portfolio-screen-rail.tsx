"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <Panel className="portfolio-screen-rail">
      <div className="portfolio-screen-rail-header">
        <Text variant="label">Review Workflow</Text>
        <strong>Portfolio book</strong>
      </div>
      <nav className="portfolio-screen-rail-nav" aria-label="Workbench screen navigation">
        {screens.map((screen) => {
          const active = activeScreen === screen.key || pathname === screen.href;
          return (
            <Link
              key={screen.key}
              href={screen.href}
              aria-current={active ? "page" : undefined}
              className={`portfolio-screen-rail-link ${active ? "portfolio-screen-rail-link-active" : ""}`}
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
                  onClick={item.onSelect}
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
