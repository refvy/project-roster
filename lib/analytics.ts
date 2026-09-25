import { parseSport } from "./positions";

export const ANALYTICS_EVENTS = {
  match_created: "match_created",
  invite_copied: "invite_copied",
  share_update_copied: "share_update_copied",
  player_rsvp: "player_rsvp",
  roster_copied: "roster_copied",
  rsvp_removed: "rsvp_removed",
  dupe_warn_shown: "dupe_warn_shown",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsRole = "manager" | "guest";

export type AnalyticsProps = {
  sport: string;
  going_count: number;
  has_datetime: boolean;
  has_map: boolean;
  role: AnalyticsRole;
  match_id?: string;
};

export function getPosthogKey() {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
}

export function getPosthogHost() {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com"
  );
}

/** Key present = on. Empty/missing key is a hard no-op. */
export function isAnalyticsEnabled() {
  return Boolean(getPosthogKey());
}

export function analyticsFromMatchday(
  matchday: {
    sport: string;
    startsAt?: Date | null;
    hasTime?: boolean | null;
    mapUrl?: string | null;
    publicId?: string | null;
  },
  goingCount: number,
  role: AnalyticsRole,
): AnalyticsProps {
  return {
    sport: parseSport(matchday.sport),
    going_count: goingCount,
    has_datetime: Boolean(matchday.startsAt && matchday.hasTime),
    has_map: Boolean(matchday.mapUrl?.trim()),
    role,
    ...(matchday.publicId ? { match_id: matchday.publicId } : {}),
  };
}

function eventPayload(props: AnalyticsProps) {
  return {
    sport: props.sport,
    going_count: props.going_count,
    has_datetime: props.has_datetime,
    has_map: props.has_map,
    role: props.role,
    ...(props.match_id ? { match_id: props.match_id } : {}),
  };
}

function tapSink(event: string, props: AnalyticsProps) {
  if (typeof window === "undefined") return;
  const sink = window.__SKWAD_ANALYTICS__;
  if (Array.isArray(sink)) sink.push({ event, props: eventPayload(props) });
}

let started = false;

async function ensurePosthog() {
  const key = getPosthogKey();
  if (!key || typeof window === "undefined") return null;
  const posthog = (await import("posthog-js")).default;
  if (!started) {
    started = true;
    posthog.init(key, {
      api_host: getPosthogHost(),
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: "memory",
    });
  }
  return posthog;
}

export async function initAnalytics() {
  if (!isAnalyticsEnabled()) return;
  await ensurePosthog();
}

export async function capture(
  event: AnalyticsEvent | string,
  props: AnalyticsProps,
) {
  tapSink(event, props);
  if (!isAnalyticsEnabled()) return;
  const posthog = await ensurePosthog();
  if (!posthog) return;
  posthog.capture(event, eventPayload(props));
}

declare global {
  interface Window {
    __SKWAD_ANALYTICS__?: { event: string; props: AnalyticsProps }[];
  }
}
