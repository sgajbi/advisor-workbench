"use client";

import { SemanticBadge } from "@/design-system";
import { dpmWaveBadgeTone } from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  state: string;
  label?: string;
};

export default function DpmWaveStateBadge({ state, label }: Props) {
  return (
    <SemanticBadge tone={dpmWaveBadgeTone(state)}>
      {label ?? businessStateLabel(state)}
    </SemanticBadge>
  );
}
