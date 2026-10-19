import { parseSport } from "./positions";

export const ANALYTICS_EVENTS = {
  invite_copied: "invite_copied",
  share_update_copied: "share_update_copied",
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
  /** HMAC of the match organiser's user id. Omitted when the server has no secret. */
  organiser_id?: string;
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

/** Every capture, client and server. Vercel sets VERCEL_ENV; otherwise local. */
export function analyticsEnv() {
  const value = process.env.VERCEL_ENV?.trim() ?? "";
  return value.length > 0 ? value : "local";
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
  organiserId?: string | null,
): AnalyticsProps {
  return {
    sport: parseSport(matchday.sport),
    going_count: goingCount,
    has_datetime: Boolean(matchday.startsAt && matchday.hasTime),
    has_map: Boolean(matchday.mapUrl?.trim()),
    role,
    ...(matchday.publicId ? { match_id: matchday.publicId } : {}),
    ...(organiserId ? { organiser_id: organiserId } : {}),
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
    ...(props.organiser_id ? { organiser_id: props.organiser_id } : {}),
    env: analyticsEnv(),
  };
}

/**
 * First-party copy ping. Does not call posthog-js, so invite_copied and
 * roster_copied are not counted twice. Fire-and-forget: never throws, never awaited by the button.
 */
export function reportServerCopy(
  event: "invite_copied" | "roster_copied",
  publicId: string,
) {
  if (typeof window === "undefined" || !publicId) return;
  try {
    void fetch("/api/analytics/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, publicId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // The clipboard write already finished. A failed ping must not surface.
  }
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
    __SKWAD_ANALYTICS__?: {
      event: string;
      props: AnalyticsProps & { env: string };
    }[];
  }
}
