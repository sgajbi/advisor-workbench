export default function PageToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={className ? `page-toolbar ${className}` : "page-toolbar"}
      role="toolbar"
      aria-label="Page controls"
    >
      {children}
    </section>
  );
}
