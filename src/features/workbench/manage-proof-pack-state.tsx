"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import type { DpmProofPackGatewayResponse } from "@/features/workbench/types";

type ManageProofPackState = {
  proofPack: DpmProofPackGatewayResponse | null;
  publishProofPack: (proofPack: DpmProofPackGatewayResponse) => void;
};

const ManageProofPackStateContext = createContext<ManageProofPackState | null>(null);

export function ManageProofPackStateProvider({
  initialProofPack,
  children,
}: {
  initialProofPack: DpmProofPackGatewayResponse | null;
  children: ReactNode;
}) {
  const [publishedProofPack, setPublishedProofPack] =
    useState<DpmProofPackGatewayResponse | null>(null);
  const proofPack = publishedProofPack ?? initialProofPack;
  const value = useMemo(
    () => ({ proofPack, publishProofPack: setPublishedProofPack }),
    [proofPack],
  );

  return (
    <ManageProofPackStateContext.Provider value={value}>
      {children}
    </ManageProofPackStateContext.Provider>
  );
}

export function useManageProofPackState(): ManageProofPackState | null {
  return useContext(ManageProofPackStateContext);
}
