export type DpmWaveListContext = Readonly<{
  asOfDate: string;
  triggerType: string;
  limit: number;
  offset: number;
}>;

export const DPM_WAVE_COMMAND_SCOPE = "workbench-dpm-wave-command";

export const dpmWaveQueryKeys = {
  all: ["workbench", "dpm-waves"] as const,
  list: (context: DpmWaveListContext) =>
    [...dpmWaveQueryKeys.all, "list", context] as const,
  detail: (waveId: string) =>
    [...dpmWaveQueryKeys.all, "detail", waveId] as const,
  items: (waveId: string) =>
    [...dpmWaveQueryKeys.all, "items", waveId] as const,
  proofPack: (waveId: string) =>
    [...dpmWaveQueryKeys.all, "proof-pack", waveId] as const,
};

export const dpmWaveMutationKeys = {
  all: [...dpmWaveQueryKeys.all, "mutation"] as const,
  preview: () => [...dpmWaveMutationKeys.all, "preview"] as const,
  create: () => [...dpmWaveMutationKeys.all, "create"] as const,
  sourceCheck: () => [...dpmWaveMutationKeys.all, "source-check"] as const,
  simulate: () => [...dpmWaveMutationKeys.all, "simulate"] as const,
  approve: () => [...dpmWaveMutationKeys.all, "approve"] as const,
  stage: () => [...dpmWaveMutationKeys.all, "stage"] as const,
  handoff: () => [...dpmWaveMutationKeys.all, "handoff"] as const,
  pmMemo: () => [...dpmWaveMutationKeys.all, "pm-memo"] as const,
  operationsBrief: () =>
    [...dpmWaveMutationKeys.all, "operations-brief"] as const,
};
