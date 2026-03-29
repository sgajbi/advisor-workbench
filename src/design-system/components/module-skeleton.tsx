import Skeleton from "@mui/material/Skeleton";

export default function ModuleSkeleton({
  rows = 4,
  chart = false,
}: {
  rows?: number;
  chart?: boolean;
}) {
  return (
    <div className="module-skeleton" aria-hidden="true">
      <Skeleton variant="text" width="36%" height={28} />
      <Skeleton variant="text" width="58%" height={18} />
      {chart ? <Skeleton variant="rounded" width="100%" height={220} /> : null}
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" width="100%" height={40} />
      ))}
    </div>
  );
}
