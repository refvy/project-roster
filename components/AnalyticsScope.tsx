"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import {
  capture,
  type AnalyticsEvent,
  type AnalyticsProps,
} from "@/lib/analytics";

const AnalyticsContext = createContext<AnalyticsProps | null>(null);

export function AnalyticsScope({
  value,
  children,
}: {
  value: AnalyticsProps;
  children: ReactNode;
}) {
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsProps() {
  return useContext(AnalyticsContext);
}

export function useTrack() {
  const props = useContext(AnalyticsContext);
  return useCallback(
    (event: AnalyticsEvent) => {
      if (!props) return;
      void capture(event, props);
    },
    [props],
  );
}
