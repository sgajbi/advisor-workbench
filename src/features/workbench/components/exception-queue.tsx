type Failure = {
  source_service: string;
  error_code: string;
  detail: string;
};

type Props = {
  warnings: string[];
  partialFailures: Failure[];
};

export default function ExceptionQueue(props: Props) {
  return (
    <section className="section-card">
      <h3>Exception Queue</h3>
      {props.warnings.length === 0 && props.partialFailures.length === 0 ? (
        <p className="muted">No active warnings or upstream failures.</p>
      ) : (
        <div className="exception-list">
          {props.warnings.map((warning) => (
            <div className="exception-item warn" key={warning}>
              <strong>Warning</strong>
              <span>{warning}</span>
            </div>
          ))}
          {props.partialFailures.map((item) => (
            <div className="exception-item fail" key={`${item.source_service}-${item.error_code}`}>
              <strong>
                {item.source_service} - {item.error_code}
              </strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
