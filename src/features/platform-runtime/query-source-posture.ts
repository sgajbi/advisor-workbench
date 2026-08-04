export type QuerySourcePosture = {
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isPermissionBlocked: boolean;
  isUnavailable: boolean;
  hasRefreshFailure: boolean;
};

export function projectQuerySourcePosture({
  hasData,
  isLoading,
  isFetching,
  hasError,
  isPermissionBlocked = false,
}: {
  hasData: boolean;
  isLoading: boolean;
  isFetching: boolean;
  hasError: boolean;
  isPermissionBlocked?: boolean;
}): QuerySourcePosture {
  return {
    isInitialLoading: isLoading,
    isRefreshing: isFetching && !isLoading,
    isPermissionBlocked,
    isUnavailable: hasError && !hasData,
    hasRefreshFailure: hasError && hasData,
  };
}

export function combineQuerySourcePostures(
  postures: QuerySourcePosture[]
): QuerySourcePosture {
  return {
    isInitialLoading: postures.some((posture) => posture.isInitialLoading),
    isRefreshing: postures.some((posture) => posture.isRefreshing),
    isPermissionBlocked: postures.some((posture) => posture.isPermissionBlocked),
    isUnavailable: postures.some((posture) => posture.isUnavailable),
    hasRefreshFailure: postures.some((posture) => posture.hasRefreshFailure),
  };
}
