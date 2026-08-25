"use client";

import { businessStateLabel } from "@/copy/business-state-copy";
import { SemanticBadge } from "@/design-system";
import { dpmWaveBadgeTone } from "@/features/workbench/dpm-wave-command-center-panel-helpers";

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
