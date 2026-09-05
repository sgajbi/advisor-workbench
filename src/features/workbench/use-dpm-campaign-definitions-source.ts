"use client";

import {
  skipToken,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { dpmCampaignDefinitionsQueryOptions } from "@/features/workbench/dpm-campaign-query-options";
import { dpmCampaignQueryKeys } from "@/features/workbench/dpm-campaign-query-keys";
import {
  acceptsActiveCampaignDefinitions,
  type DpmCampaignLifecycleConfirmationReceipt,
} from "@/features/workbench/dpm-campaign-command-evidence";
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
  const confirmationReceiptKeys = queryClient
    .getQueriesData<DpmCampaignLifecycleConfirmationReceipt>({
      queryKey: dpmCampaignQueryKeys.lifecycleConfirmationReceipts(),
    })
    .map(([queryKey]) => queryKey);
  const confirmationReceiptQueries = useQueries({
    queries: confirmationReceiptKeys.map((queryKey) => ({
      queryKey,
      queryFn: skipToken,
      gcTime: Infinity,
      initialData: () =>
        queryClient.getQueryData<DpmCampaignLifecycleConfirmationReceipt>(
          queryKey,
        ),
    })),
  });
  const confirmationReceipts = confirmationReceiptQueries.flatMap((query) => {
    const receipt = query.data as
      | DpmCampaignLifecycleConfirmationReceipt
      | undefined;
    return receipt ? [receipt] : [];
  });
  const initialDefinitionsContainConfirmedReceipt =
    confirmationReceipts.length === 0 ||
    (initialDefinitions !== null &&
      confirmationReceipts.every((receipt) =>
        acceptsActiveCampaignDefinitions(initialDefinitions, receipt),
      ));

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
        if (initialDefinitions && initialDefinitionsContainConfirmedReceipt) {
          queryClient.setQueryData(options.queryKey, initialDefinitions);
        } else if (!initialDefinitions) {
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
    initialDefinitionsContainConfirmedReceipt,
    initialReadId,
    options.queryKey,
    queryClient,
    serverReadAlreadyAdmitted,
    serverReadKey,
  ]);

  if (initialDefinitions === null) return null;
  return !serverReadAlreadyAdmitted &&
    initialDefinitionsContainConfirmedReceipt
    ? initialDefinitions
    : (definitionsQuery.data ?? null);
}
