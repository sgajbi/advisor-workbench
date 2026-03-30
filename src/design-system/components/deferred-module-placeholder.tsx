"use client";

export default function DeferredModulePlaceholder({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="deferred-module-placeholder" role="status" aria-live="polite">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
