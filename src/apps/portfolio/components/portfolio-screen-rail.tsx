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
  onSelect: () => void;
};

export default function PortfolioScreenRail({
  portfolioId,
  activeScreen,
  modeItems,
}: {
  portfolioId: string;
  activeScreen: PortfolioScreenNavigationKey;
  modeItems?: PortfolioScreenRailModeItem[];
}) {
  const pathname = usePathname();
  const screens = buildPortfolioScreenNavigationItems(portfolioId);

  return (
    <Panel className="portfolio-screen-rail">
      <div className="portfolio-screen-rail-header">
        <Text variant="label">Workbench Screens</Text>
        <strong>{portfolioId}</strong>
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
          <div className="portfolio-screen-rail-subnav" aria-label="Performance surface navigation">
            {modeItems.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
                className={`portfolio-screen-rail-link portfolio-screen-rail-subnav-link ${
                  item.active ? "portfolio-screen-rail-link-active" : ""
                }`}
                title={item.title}
                onClick={item.onSelect}
              >
                <span>{item.label}</span>
                <small>
                  {item.detail}
                  {item.status ? <em aria-label={`Status ${item.status}`}>{item.status}</em> : null}
                </small>
              </button>
            ))}
          </div>
        ) : null}
      </nav>
    </Panel>
  );
}
