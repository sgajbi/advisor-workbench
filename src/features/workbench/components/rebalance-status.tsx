type Props = {
  status: string;
  lastRunId: string | null;
};

export default function RebalanceStatus(props: Props) {
  return (
    <section>
      <h2>Rebalance Status</h2>
      <p>Status: {props.status}</p>
      <p>Last Run: {props.lastRunId ?? "N/A"}</p>
    </section>
  );
}
