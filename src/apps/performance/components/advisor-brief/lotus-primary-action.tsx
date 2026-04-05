export default function LotusPrimaryAction({
  children,
  variant = "secondary",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "lotus-primary-action",
        variant === "primary" ? "lotus-primary-action-primary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
