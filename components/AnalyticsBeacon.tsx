"use client";

import { useEffect, useRef } from "react";
import { capture, type AnalyticsProps } from "@/lib/analytics";

export function AnalyticsBeacon({ props }: { props: AnalyticsProps }) {
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const current = propsRef.current;
    const key = `skwad:created:${current.match_id ?? "unknown"}`;
    try {
      if (sessionStorage.getItem(key)) {
        stripCreatedQuery();
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode — still fire once this mount.
    }
    void capture("match_created", current);
    stripCreatedQuery();
  }, [props.match_id]);

  return null;
}

function stripCreatedQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("created")) return;
  url.searchParams.delete("created");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
