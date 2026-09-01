import Link from "next/link";

import DetailCard from "./detail-card";
import { cx } from "../utils/cx";

type ActionItem = {
  key: string;
  sequence: number;
  title: string;
  impact?: string;
  target?: string;
  href: string;
  ctaLabel: string;
  recommended?: boolean;
};

export default function ActionListCard({
  title,
  subtitle,
  items,
  className,
}: {
  title: string;
  subtitle: string;
  items: ActionItem[];
  className?: string;
}) {
  return (
    <DetailCard title={title} subtitle={subtitle} className={cx("action-list-card", className)}>
      <div className="portfolio-guidance-list portfolio-workflow-list" role="list" aria-label={`${title} workflow list`}>
        {items.map((item) => (
          <div
            key={item.key}
            role="listitem"
            className={
              item.recommended
                ? "portfolio-guidance-item portfolio-workflow-item portfolio-workflow-item-recommended"
                : "portfolio-guidance-item portfolio-workflow-item"
            }
          >
            <div className="portfolio-workflow-sequence">
              <span className="portfolio-workflow-step">{item.sequence}</span>
              <div className="portfolio-guidance-copy">
                {item.recommended ? (
                  <span className="portfolio-workflow-kicker">Recommended next</span>
                ) : null}
                <strong>{item.title}</strong>
                {item.impact ? <p className="portfolio-evidence-copy">{item.impact}</p> : null}
                {item.target ? <p className="portfolio-workflow-target">{item.target}</p> : null}
              </div>
            </div>
            <div className="portfolio-workflow-actions">
              <Link href={item.href} className="portfolio-workflow-cta">
                {item.ctaLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
