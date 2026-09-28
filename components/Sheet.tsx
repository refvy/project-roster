"use client";

import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  testId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  testId: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface px-5 py-5 shadow-banner sm:rounded-3xl"
      >
        <h3
          id={`${testId}-title`}
          className="font-display text-2xl tracking-tight"
        >
          {title}
        </h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
