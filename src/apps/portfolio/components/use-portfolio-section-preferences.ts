"use client";

import { useCallback, useEffect, useState } from "react";

import type { PortfolioWorkspaceContext } from "../view-model";
import {
  getDefaultSectionExpanded,
  getPortfolioSectionStorageKey,
  PORTFOLIO_COLLAPSIBLE_SECTION_KEYS,
} from "./portfolio-analytical-section-state";
import type { PortfolioCollapsibleSectionKey } from "./portfolio-analytical-section-types";

type PortfolioSectionPreferences = Partial<
  Record<PortfolioCollapsibleSectionKey, boolean>
>;

export function readPortfolioSectionPreferences(
  storage: Pick<Storage, "getItem">,
): PortfolioSectionPreferences {
  return PORTFOLIO_COLLAPSIBLE_SECTION_KEYS.reduce<PortfolioSectionPreferences>(
    (preferences, key) => {
      const storedValue = storage.getItem(getPortfolioSectionStorageKey(key));
      if (storedValue === "true" || storedValue === "false") {
        preferences[key] = storedValue === "true";
      }
      return preferences;
    },
    {},
  );
}

export function usePortfolioSectionPreferences(
  viewMode: PortfolioWorkspaceContext["viewMode"],
) {
  const [sectionPreferences, setSectionPreferences] =
    useState<PortfolioSectionPreferences>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSectionPreferences(readPortfolioSectionPreferences(window.localStorage));
  }, []);

  const getSectionExpanded = useCallback(
    (sectionKey: PortfolioCollapsibleSectionKey) =>
      sectionPreferences[sectionKey] ??
      getDefaultSectionExpanded(sectionKey, viewMode),
    [sectionPreferences, viewMode],
  );

  const toggleSection = useCallback(
    (sectionKey: PortfolioCollapsibleSectionKey) => {
      setSectionPreferences((current) => {
        const nextExpanded = !(
          current[sectionKey] ?? getDefaultSectionExpanded(sectionKey, viewMode)
        );

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            getPortfolioSectionStorageKey(sectionKey),
            String(nextExpanded),
          );
        }

        return {
          ...current,
          [sectionKey]: nextExpanded,
        };
      });
    },
    [viewMode],
  );

  return { getSectionExpanded, toggleSection };
}
