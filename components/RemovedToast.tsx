"use client";

import { useEffect, useState } from "react";

export const REMOVED_TOAST_KEY = "skwad-removed-toast";

export function markRemovedToast() {
  try {
    sessionStorage.setItem(REMOVED_TOAST_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function RemovedToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(REMOVED_TOAST_KEY) !== "1") return;
      sessionStorage.removeItem(REMOVED_TOAST_KEY);
    } catch {
      return;
    }
    setShow(true);
    const timer = window.setTimeout(() => setShow(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;
  return (
    <p
      data-testid="removed-toast"
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-cream"
    >
      Removed
    </p>
  );
}
