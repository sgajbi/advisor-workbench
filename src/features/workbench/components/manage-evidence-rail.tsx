"use client";

import { DefinitionList, Text, WorkbenchRailCard } from "@/design-system";
import { buildManageEvidenceRailModel } from "@/features/workbench/manage-evidence-rail-view-model";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { useManageProofPackState } from "@/features/workbench/manage-proof-pack-state";

export default function ManageEvidenceRail({
  data,
}: {
  data: ManageWorkspaceData;
}) {
  const sharedProofPack = useManageProofPackState();
  const model = buildManageEvidenceRailModel(
    sharedProofPack?.proofPack
      ? { ...data, proofPack: sharedProofPack.proofPack, proofPackError: null }
      : data,
  );

  return (
    <div className="manage-evidence-rail">
      <WorkbenchRailCard>
        <div className="manage-evidence-rail-header">
          <Text variant="label">Review evidence</Text>
          <strong>{model.headline}</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage source evidence"
          items={model.items}
        />
      </WorkbenchRailCard>
    </div>
  );
}
