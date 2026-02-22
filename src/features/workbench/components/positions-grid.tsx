type Props = {
  count: number;
};

export default function PositionsGrid(props: Props) {
  return (
    <section>
      <h2>Positions</h2>
      <p>Position count: {props.count}</p>
    </section>
  );
}
