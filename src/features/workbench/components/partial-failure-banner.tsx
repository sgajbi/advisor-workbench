type PartialFailure = {
  source_service: string;
  error_code: string;
  detail: string;
};

type Props = {
  items: PartialFailure[];
};

export default function PartialFailureBanner(props: Props) {
  if (!props.items.length) {
    return null;
  }

  return (
    <section aria-label="partial-failures">
      <h2>Partial Data Warning</h2>
      <ul>
        {props.items.map((item) => (
          <li key={`${item.source_service}:${item.error_code}`}>
            {item.source_service}: {item.error_code}
          </li>
        ))}
      </ul>
    </section>
  );
}
