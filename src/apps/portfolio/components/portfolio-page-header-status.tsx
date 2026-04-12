import { SemanticBadge, type SemanticBadgeTone } from "@/design-system";

export default function PortfolioPageHeaderStatus({
  label,
  tone,
}: {
  label: string;
  tone: SemanticBadgeTone;
}) {
  return (
    <div className="portfolio-page-header-actions" role="group" aria-label="Portfolio page status">
      <SemanticBadge tone={tone} className="portfolio-page-header-status">
        {label}
      </SemanticBadge>
    </div>
  );
}
