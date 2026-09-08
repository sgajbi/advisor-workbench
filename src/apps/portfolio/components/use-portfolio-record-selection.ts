"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import {
  buildPortfolioRecordSelectionHref,
  buildPortfolioRelatedRecordHref,
} from "../portfolio-record-selection";

/**
 * Which record is open is a property of the URL, and of nothing else.
 *
 * This previously mirrored the URL into React state and moved between records
 * with `router.push`. Both halves caused the defect in #1031.
 *
 * `router.push` does not update the address bar until the RSC response for the
 * new URL arrives, so opening or closing a record — a change the client can
 * already render, because it holds the record — waited on a server round-trip.
 * Under load that wait exceeded five seconds and the URL simply did not move,
 * which is what the exact-main gate caught. `window.history.pushState` is the
 * supported App Router mechanism for a query-only change: it updates the URL
 * synchronously, pushes a real history entry, and `useSearchParams` reflects it.
 *
 * The mirrored state then had to go too. With the URL changing synchronously and
 * the server prop only refreshing on a full navigation, Back would have restored
 * the URL while the stale prop kept the drawer open. Reading the selection from
 * `useSearchParams` on every render removes that class of disagreement: Back and
 * Forward are ordinary re-renders, and there is no second copy to fall out of
 * step with the address bar.
 */
export function usePortfolioRecordSelection({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const addressedRecordId = searchParams.get("selectedRecordId") || null;
  // `addressed` records which router-supplied address this selection was taken
  // from, so a later render can tell "the router moved us" from "we moved
  // ourselves and the router has not caught up yet".
  const [selection, setSelection] = useState({
    addressed: addressedRecordId,
    recordId: addressedRecordId,
  });

  // Follow the address whenever the router re-renders us: a server navigation,
  // a reload, or a deep link. Adjusted during render rather than in an effect --
  // an effect would render once with the stale record and again with the right
  // one, which is the cascading render the compiler lint rejects.
  if (selection.addressed !== addressedRecordId) {
    setSelection({ addressed: addressedRecordId, recordId: addressedRecordId });
  }
  const selectedRecordId =
    selection.addressed === addressedRecordId
      ? selection.recordId
      : addressedRecordId;

  // Follow Back and Forward. These entries were pushed by this hook rather than
  // by the router, so the address is read from the document rather than waiting
  // to be told about it.
  useEffect(() => {
    const followAddress = () => {
      const current =
        new URLSearchParams(window.location.search).get("selectedRecordId") ||
        null;
      setSelection((previous) => ({ ...previous, recordId: current }));
    };
    window.addEventListener("popstate", followAddress);
    return () => window.removeEventListener("popstate", followAddress);
  }, []);
  const listHref = useMemo(
    () =>
      buildPortfolioRecordSelectionHref({
        pathname,
        searchParams,
        portfolioId,
      }),
    [pathname, portfolioId, searchParams],
  );

  const navigateToRecord = useCallback(
    (recordId: string | null) => {
      // Built from the live address rather than the render-time snapshot: the
      // snapshot can lag a push this hook has already made.
      const href = buildPortfolioRecordSelectionHref({
        pathname: window.location.pathname,
        searchParams: new URLSearchParams(window.location.search),
        portfolioId,
        selectedRecordId: recordId ?? undefined,
      });
      if (!href) {
        return;
      }

      // Only push when the address actually changes. `router.push` used to absorb
      // repeat calls for us, and this hook is called more than once for a single
      // user action -- the row handler and the review button both select. Pushing
      // unconditionally stacked duplicate entries, so Back stepped onto an entry
      // with the same URL and appeared to do nothing.
      if (href === `${window.location.pathname}${window.location.search}`) {
        return;
      }

      window.history.pushState(null, "", href);
      setSelection((previous) => ({ ...previous, recordId }));
    },
    [portfolioId],
  );

  return {
    selectedRecordId,
    listHref,
    buildRelatedHref: useCallback(
      (destinationPathname: string) =>
        listHref
          ? buildPortfolioRelatedRecordHref({
              destinationPathname,
              sourceHref: listHref,
              portfolioId,
            })
          : null,
      [listHref, portfolioId],
    ),
    openRecord: useCallback(
      (recordId: string) => navigateToRecord(recordId),
      [navigateToRecord],
    ),
    closeRecord: useCallback(() => navigateToRecord(null), [navigateToRecord]),
  };
}
