export default function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `filter-bar ${className}` : "filter-bar"} role="group" aria-label="Active filters">
      {children}
    </div>
  );
}
