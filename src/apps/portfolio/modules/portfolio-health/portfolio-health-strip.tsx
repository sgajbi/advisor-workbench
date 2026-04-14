"use client";

import { KpiStatTile } from "@/design-system";

type HealthTile = {
  key: string;
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  definition?: string;
  tone?: "neutral" | "success" | "warn" | "danger";
  onClick?: () => void;
};

export default function PortfolioHealthStrip({
  tiles,
}: {
  tiles: HealthTile[];
}) {
  return (
    <div className="portfolio-summary-band" role="group" aria-label="Portfolio key metrics">
      {tiles.map((tile) => (
        <div key={tile.key} className="portfolio-summary-band-item">
          <KpiStatTile
            label={tile.label}
            value={tile.value}
            support={tile.support}
            definition={tile.definition}
            valueTone={tile.tone}
            onClick={tile.onClick}
          />
        </div>
      ))}
    </div>
  );
}

export type { HealthTile };
