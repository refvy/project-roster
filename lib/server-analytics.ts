import { getPosthogHost, getPosthogKey, isAnalyticsEnabled } from "@/lib/analytics";

export type RsvpCaptureStatus = "going" | "out";
export type RsvpCaptureChange = "create" | "update";

export type PlayerRsvpProperties = {
  match_id: string;
  status: RsvpCaptureStatus;
  change: RsvpCaptureChange;
};

export type MatchCreatedProperties = {
  match_id: string;
};

type CaptureBody = {
  api_key: string;
  event: "player_rsvp" | "match_created";
  distinct_id: string;
  properties: Record<string, unknown>;
};

export function planRsvpCapture(
  existing: "GOING" | "OUT" | null,
  next: "GOING" | "OUT",
): { status: RsvpCaptureStatus; change: RsvpCaptureChange } | null {
  const status: RsvpCaptureStatus = next === "OUT" ? "out" : "going";
  if (existing == null) return { status, change: "create" };
  if (existing === next) return null;
  return { status, change: "update" };
}

export function playerRsvpProperties(
  matchId: string,
  planned: { status: RsvpCaptureStatus; change: RsvpCaptureChange },
): PlayerRsvpProperties {
  return {
    match_id: matchId,
    status: planned.status,
    change: planned.change,
  };
}

export function matchCreatedProperties(matchId: string): MatchCreatedProperties {
  return { match_id: matchId };
}

export function buildCaptureBody(
  event: "player_rsvp",
  matchId: string,
  extra: { status: RsvpCaptureStatus; change: RsvpCaptureChange },
): CaptureBody;
export function buildCaptureBody(
  event: "match_created",
  matchId: string,
): CaptureBody;
export function buildCaptureBody(
  event: "player_rsvp" | "match_created",
  matchId: string,
  extra?: { status: RsvpCaptureStatus; change: RsvpCaptureChange },
): CaptureBody {
  const properties: Record<string, unknown> = {
    match_id: matchId,
    $process_person_profile: false,
    $geoip_disable: true,
  };
  if (event === "player_rsvp" && extra) {
    properties.status = extra.status;
    properties.change = extra.change;
  }
  return {
    api_key: getPosthogKey(),
    event,
    distinct_id: `match:${matchId}`,
    properties,
  };
}

export function publicCaptureKeys(properties: Record<string, unknown>) {
  return Object.keys(properties)
    .filter((key) => !key.startsWith("$"))
    .sort();
}

export async function emitPlayerRsvp(
  matchId: string,
  planned: { status: RsvpCaptureStatus; change: RsvpCaptureChange },
) {
  await captureServer(buildCaptureBody("player_rsvp", matchId, planned));
}

export async function emitMatchCreated(matchId: string) {
  await captureServer(buildCaptureBody("match_created", matchId));
}

async function captureServer(body: CaptureBody) {
  if (!isAnalyticsEnabled() || !body.api_key) return;
  try {
    const response = await fetch(`${getPosthogHost()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      throw new Error(`posthog ${response.status}`);
    }
  } catch (error) {
    console.error("analytics capture failed", body.event, error);
  }
}
