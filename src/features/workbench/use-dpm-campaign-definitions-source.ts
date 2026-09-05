"use client";

import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { dpmCampaignDefinitionsQueryOptions } from "@/features/workbench/dpm-campaign-query-options";
import { dpmCampaignQueryKeys } from "@/features/workbench/dpm-campaign-query-keys";
import type { DpmCampaignDefinitionGatewayResponse } from "@/features/workbench/types";

type ServerRead = Readonly<{ readId: string }>;

export function useDpmCampaignDefinitionsSource(
  initialDefinitions: DpmCampaignDefinitionGatewayResponse | null,
  initialReadId: string,
) {
  const queryClient = useQueryClient();
  const options = useMemo(() => dpmCampaignDefinitionsQueryOptions(), []);
  const definitionsQuery = useQuery({
    ...options,
    enabled: false,
    initialData: initialDefinitions ?? undefined,
  });
  const serverReadKey = useMemo(
    () => dpmCampaignQueryKeys.definitionsServerRead(),
    [],
  );
  const serverReadQuery = useQuery<ServerRead>({
    queryKey: serverReadKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () => queryClient.getQueryData<ServerRead>(serverReadKey),
  });
  const serverReadAlreadyAdmitted =
    serverReadQuery.data?.readId === initialReadId;

  useEffect(() => {
    if (serverReadAlreadyAdmitted) return;
    let active = true;
    void queryClient
      .cancelQueries({ queryKey: options.queryKey, exact: true })
      .then(() => {
        if (
          !active ||
          queryClient.getQueryData<ServerRead>(serverReadKey)?.readId ===
            initialReadId
        ) {
          return;
        }
        if (initialDefinitions) {
          queryClient.setQueryData(options.queryKey, initialDefinitions);
        } else {
          queryClient.removeQueries({ queryKey: options.queryKey, exact: true });
        }
        queryClient.setQueryData<ServerRead>(serverReadKey, {
          readId: initialReadId,
        });
      });
    return () => {
      active = false;
    };
  }, [
    initialDefinitions,
    initialReadId,
    options.queryKey,
    queryClient,
    serverReadAlreadyAdmitted,
    serverReadKey,
  ]);

  if (initialDefinitions === null) return null;
  return serverReadAlreadyAdmitted
    ? (definitionsQuery.data ?? null)
    : initialDefinitions;
}
