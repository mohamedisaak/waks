"use client";

import { useEffect, useState } from "react";

/** Monotonic-ish clock for entitlement checks — updates on an interval without calling `Date.now()` during render. */
export function useTickerNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
