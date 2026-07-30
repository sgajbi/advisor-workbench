"use client";

import { useEffect, useState } from "react";

export default function DeferredWorkbenchMount({
  when = true,
  placeholder = null,
  children,
}: {
  when?: boolean;
  placeholder?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!when) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [when]);

  return when && isMounted ? <>{children}</> : <>{placeholder}</>;
}
