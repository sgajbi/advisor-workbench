"use client";

import { useCallback, useState } from "react";

type SourceSelectionState = {
  scopeKey: string;
  selectedKey: string | null;
};

type AdmittedSourceSelectionInput = {
  scopeKey: string;
  requestedKey?: string | null;
  admittedKeys: readonly string[];
  sourceResolved: boolean;
};

/**
 * Keeps a controlled worklist selection aligned with source-owned identities.
 *
 * A route-requested identity remains pending while the source is unresolved.
 * Once a response is available, only returned identities are admitted and the
 * first source-ranked item becomes the deterministic fallback.
 */
export function useAdmittedSourceSelection({
  scopeKey,
  requestedKey = null,
  admittedKeys,
  sourceResolved,
}: AdmittedSourceSelectionInput) {
  const [selection, setSelection] = useState<SourceSelectionState>(() => ({
    scopeKey,
    selectedKey: requestedKey,
  }));
  const scopedSelection =
    selection.scopeKey === scopeKey
      ? selection
      : { scopeKey, selectedKey: requestedKey };
  const admittedSelectedKey =
    scopedSelection.selectedKey !== null &&
    admittedKeys.includes(scopedSelection.selectedKey)
      ? scopedSelection.selectedKey
      : (admittedKeys[0] ?? null);
  const selectedKey = sourceResolved
    ? admittedSelectedKey
    : scopedSelection.selectedKey;

  if (
    selection.scopeKey !== scopeKey ||
    selection.selectedKey !== selectedKey
  ) {
    setSelection({ scopeKey, selectedKey });
  }

  const selectKey = useCallback(
    (nextSelectedKey: string | null) => {
      setSelection({ scopeKey, selectedKey: nextSelectedKey });
    },
    [scopeKey],
  );

  return [selectedKey, selectKey] as const;
}
