import { DefinitionList, SupportDetails } from "@/design-system";

import type { ProposalActionSupportEvidence } from "../proposal-action-error";

export default function ProposalActionSupportDetails({
  evidence,
}: {
  evidence: ProposalActionSupportEvidence;
}) {
  return (
    <SupportDetails context="Source request evidence">
      <DefinitionList
        ariaLabel="Source request evidence"
        items={[
          { label: "Source response", value: evidence.status },
          ...(evidence.requestReference
            ? [{ label: "Request reference", value: evidence.requestReference }]
            : []),
        ]}
      />
    </SupportDetails>
  );
}
