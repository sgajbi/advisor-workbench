"use client";

import type { ReactNode } from "react";

export function renderDrawerDefinitionList(entries: Array<[string, string]>): ReactNode {
  return (
    <dl className="portfolio-detail-drawer-definition-list">
      {entries.map(([label, value]) => (
        <div key={`${label}-${value}`} className="portfolio-detail-drawer-definition-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function renderDrawerParagraphs(paragraphs: string[]): ReactNode {
  return (
    <div className="portfolio-detail-drawer-copy">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export function formatDrawerLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
