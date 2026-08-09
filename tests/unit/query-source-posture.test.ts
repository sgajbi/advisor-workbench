import { describe, expect, it } from "vitest";

import {
  combineQuerySourcePostures,
  isQuerySourceSettledAndAvailable,
  projectQuerySourcePosture,
} from "@/features/platform-runtime/query-source-posture";

describe("query source posture", () => {
  it("distinguishes initial loading from a background refresh", () => {
    expect(
      projectQuerySourcePosture({
        hasData: false,
        isLoading: true,
        isFetching: true,
        hasError: false,
      })
    ).toMatchObject({ isInitialLoading: true, isRefreshing: false });

    expect(
      projectQuerySourcePosture({
        hasData: true,
        isLoading: false,
        isFetching: true,
        hasError: false,
      })
    ).toMatchObject({ isInitialLoading: false, isRefreshing: true });
  });

  it("preserves the distinction between unavailable and cached refresh failures", () => {
    expect(
      projectQuerySourcePosture({
        hasData: false,
        isLoading: false,
        isFetching: false,
        hasError: true,
      })
    ).toMatchObject({ isUnavailable: true, hasRefreshFailure: false });

    expect(
      projectQuerySourcePosture({
        hasData: true,
        isLoading: false,
        isFetching: false,
        hasError: true,
      })
    ).toMatchObject({ isUnavailable: false, hasRefreshFailure: true });
  });

  it("combines source postures without losing permission or refresh evidence", () => {
    const combined = combineQuerySourcePostures([
      projectQuerySourcePosture({
        hasData: true,
        isLoading: false,
        isFetching: true,
        hasError: false,
      }),
      projectQuerySourcePosture({
        hasData: false,
        isLoading: false,
        isFetching: false,
        hasError: true,
        isPermissionBlocked: true,
      }),
    ]);

    expect(combined).toMatchObject({
      isRefreshing: true,
      isPermissionBlocked: true,
      isUnavailable: true,
    });
  });

  it("permits actions only against settled available source evidence", () => {
    expect(isQuerySourceSettledAndAvailable(projectQuerySourcePosture({
      hasData: true,
      isLoading: false,
      isFetching: false,
      hasError: false,
    }))).toBe(true);

    expect(isQuerySourceSettledAndAvailable(projectQuerySourcePosture({
      hasData: true,
      isLoading: false,
      isFetching: true,
      hasError: false,
    }))).toBe(false);

    expect(isQuerySourceSettledAndAvailable(projectQuerySourcePosture({
      hasData: true,
      isLoading: false,
      isFetching: false,
      hasError: true,
    }))).toBe(false);
  });
});
