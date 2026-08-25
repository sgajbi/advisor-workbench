"use client";

import { businessStateLabel } from "@/copy/business-state-copy";
import { SemanticBadge } from "@/design-system";
import {
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  state: string;
  label?: string;
};

export default function PmOperatingQualityStateBadge({ state, label }: Props) {
  return (
    <SemanticBadge tone={toneForState(state)}>
      {label ?? businessStateLabel(state)}
    </SemanticBadge>
  );
}
