"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Panel, Text } from "@/design-system";
import {
  buildPortfolioScreenNavigationItems,
  type PortfolioScreenNavigationKey,
} from "../portfolio-screen-navigation";

export default function PortfolioScreenRail({
  portfolioId,
  activeScreen,
}: {
  portfolioId: string;
  activeScreen: PortfolioScreenNavigationKey;
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
      </nav>
    </Panel>
  );
}
