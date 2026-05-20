"use client";

import { SemanticBadge } from "@/design-system";
import {
  businessStateLabel,
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
