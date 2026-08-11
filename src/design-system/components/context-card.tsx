import type { ReactNode } from "react";

import { cx } from "../utils/cx";
import DefinitionList from "./definition-list";
import DetailCard from "./detail-card";

type ContextFact = {
  label: string;
  value: ReactNode;
  action?: ReactNode;
};

type ContextGroup = {
  key: string;
  title: string;
  facts: ContextFact[];
};

export default function ContextCard({
  title,
  subtitle,
  groups,
  className,
}: {
  title: string;
  subtitle: string;
  groups: ContextGroup[];
  className?: string;
}) {
  return (
    <DetailCard title={title} subtitle={subtitle} className={cx("context-card", className)}>
      <div className="portfolio-context-panel">
        {groups.map((group) => (
          <section key={group.key} className="portfolio-context-group" aria-label={group.title}>
            <span className="portfolio-context-group-title">{group.title}</span>
            <DefinitionList
              className="portfolio-context-facts"
              rowClassName="portfolio-context-row"
              items={group.facts}
            />
          </section>
        ))}
      </div>
    </DetailCard>
  );
}
