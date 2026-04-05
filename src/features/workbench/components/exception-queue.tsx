import { SectionBlock, SemanticBadge, Text } from "@/design-system";

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
    <SectionBlock title="Exception Queue">
      {props.warnings.length === 0 && props.partialFailures.length === 0 ? (
        <Text variant="secondary" className="muted">No active warnings or upstream failures.</Text>
      ) : (
        <div className="exception-list">
          {props.warnings.map((warning) => (
            <div className="exception-item warn" key={warning}>
              <SemanticBadge tone="warn">Warning</SemanticBadge>
              <span>{warning}</span>
            </div>
          ))}
          {props.partialFailures.map((item) => (
            <div className="exception-item fail" key={`${item.source_service}-${item.error_code}`}>
              <SemanticBadge tone="danger">
                {item.source_service} - {item.error_code}
              </SemanticBadge>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
}
