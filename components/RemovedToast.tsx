"use client";

import { useEffect, useState } from "react";

export const REMOVED_TOAST_KEY = "skwad-removed-toast";
const REMOVED_EVENT = "skwad-removed";

export function markRemovedToast() {
  try {
    sessionStorage.setItem(REMOVED_TOAST_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(REMOVED_EVENT));
}

export function RemovedToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    function showToast() {
      setShow(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShow(false), 1800);
    }
    function consumeStored() {
      try {
        if (sessionStorage.getItem(REMOVED_TOAST_KEY) !== "1") return;
        sessionStorage.removeItem(REMOVED_TOAST_KEY);
        showToast();
      } catch {
        /* ignore */
      }
    }
    consumeStored();
    window.addEventListener(REMOVED_EVENT, showToast);
    return () => {
      window.removeEventListener(REMOVED_EVENT, showToast);
      window.clearTimeout(timer);
    };
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
