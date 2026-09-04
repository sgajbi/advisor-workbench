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
  wave: (waveId: string) =>
    [...dpmWaveQueryKeys.all, "wave", waveId] as const,
  items: (waveId: string) =>
    [...dpmWaveQueryKeys.all, "items", waveId] as const,
  proofPack: (waveId: string) =>
    [...dpmWaveQueryKeys.all, "proof-pack", waveId] as const,
  confirmedCreatedWave: (portfolioId: string) =>
    [...dpmWaveQueryKeys.all, "confirmed-created-wave", portfolioId] as const,
};

export const dpmWaveMutationKeys = {
  all: [...dpmWaveQueryKeys.all, "mutation"] as const,
  command: () => [...dpmWaveMutationKeys.all, "command"] as const,
  pmMemo: () => [...dpmWaveMutationKeys.all, "pm-memo"] as const,
  operationsBrief: () =>
    [...dpmWaveMutationKeys.all, "operations-brief"] as const,
};
