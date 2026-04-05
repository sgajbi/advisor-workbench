"use client";

import { SectionBlock, WorkbenchSummaryMetricStrip } from "@/design-system";

type Props = {
  marketValueBase: number;
  cashWeightPct: number;
  positionCount: number;
  baseCurrency: string;
};

export default function OverviewCards(props: Props) {
  return (
    <SectionBlock title="Portfolio Overview">
      <WorkbenchSummaryMetricStrip
        ariaLabel="Portfolio overview metrics"
        items={[
          {
            key: "market-value",
            label: `Market Value (${props.baseCurrency})`,
            value: props.marketValueBase.toLocaleString(undefined, { maximumFractionDigits: 2 }),
          },
          {
            key: "cash-weight",
            label: "Cash Weight",
            value: `${(props.cashWeightPct * 100).toFixed(2)}%`,
          },
          {
            key: "positions",
            label: "Positions",
            value: String(props.positionCount),
          },
        ]}
      />
    </SectionBlock>
  );
}
