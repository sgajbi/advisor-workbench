type Props = {
  marketValueBase: number;
  cashWeightPct: number;
  positionCount: number;
  baseCurrency: string;
};

export default function OverviewCards(props: Props) {
  return (
    <section>
      <h2>Portfolio Overview</h2>
      <ul>
        <li>Market Value ({props.baseCurrency}): {props.marketValueBase.toFixed(2)}</li>
        <li>Cash Weight: {(props.cashWeightPct * 100).toFixed(2)}%</li>
        <li>Positions: {props.positionCount}</li>
      </ul>
    </section>
  );
}
