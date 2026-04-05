"use client";

import { DegradedStatePanel } from "@/design-system";

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
    <DegradedStatePanel
      className="workbench-partial-failure-banner"
      label="Operational status"
      title="Partial Data Warning"
      tone="warn"
      status="Partial"
    >
      <ul>
        {props.items.map((item) => (
          <li key={`${item.source_service}:${item.error_code}`}>
            {item.source_service}: {item.error_code}
          </li>
        ))}
      </ul>
    </DegradedStatePanel>
  );
}
