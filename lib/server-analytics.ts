import {
  analyticsEnv,
  getPosthogHost,
  getPosthogKey,
  isAnalyticsEnabled,
} from "@/lib/analytics";
import { organiserAnalyticsId } from "@/lib/organiser-id";
import { parseSport } from "@/lib/positions";

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

export type CopyCaptureEvent = "invite_copied" | "roster_copied";

export type CopyCaptureMatch = {
  publicId: string;
  organiserUserId: string;
  sport: string;
  startsAt: Date | null;
  hasTime: boolean;
  mapUrl: string | null;
  goingCount: number;
};

type CaptureEvent = "player_rsvp" | "match_created" | CopyCaptureEvent;

type CaptureBody = {
  api_key: string;
  event: CaptureEvent;
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

function withOrganiser(
  properties: Record<string, unknown>,
  organiserUserId?: string | null,
) {
  const organiserId = organiserAnalyticsId(organiserUserId);
  if (organiserId) properties.organiser_id = organiserId;
  return properties;
}

export function buildCaptureBody(
  event: "player_rsvp",
  matchId: string,
  extra: { status: RsvpCaptureStatus; change: RsvpCaptureChange },
  organiserUserId?: string | null,
): CaptureBody;
export function buildCaptureBody(
  event: "match_created",
  matchId: string,
  extra?: undefined,
  organiserUserId?: string | null,
): CaptureBody;
export function buildCaptureBody(
  event: "player_rsvp" | "match_created",
  matchId: string,
  extra?: { status: RsvpCaptureStatus; change: RsvpCaptureChange },
  organiserUserId?: string | null,
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
    properties: withOrganiser(properties, organiserUserId),
  };
}

export function buildCopyCaptureBody(
  event: CopyCaptureEvent,
  match: CopyCaptureMatch,
): CaptureBody {
  const properties: Record<string, unknown> = {
    sport: parseSport(match.sport),
    going_count: match.goingCount,
    has_datetime: Boolean(match.startsAt && match.hasTime),
    has_map: Boolean(match.mapUrl?.trim()),
    role: "manager",
    match_id: match.publicId,
    $process_person_profile: false,
    $geoip_disable: true,
  };
  return {
    api_key: getPosthogKey(),
    event,
    distinct_id: `match:${match.publicId}`,
    properties: withOrganiser(properties, match.organiserUserId),
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
  organiserUserId?: string | null,
) {
  await captureServer(
    buildCaptureBody("player_rsvp", matchId, planned, organiserUserId),
  );
}

export async function emitMatchCreated(
  matchId: string,
  organiserUserId?: string | null,
) {
  await captureServer(
    buildCaptureBody("match_created", matchId, undefined, organiserUserId),
  );
}

export async function emitMatchCopy(
  event: CopyCaptureEvent,
  match: CopyCaptureMatch,
) {
  await captureServer(buildCopyCaptureBody(event, match));
}

async function captureServer(body: CaptureBody) {
  if (!isAnalyticsEnabled() || !body.api_key) return;
  const payload = {
    ...body,
    properties: { ...body.properties, env: analyticsEnv() },
  };
  try {
    const response = await fetch(`${getPosthogHost()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      throw new Error(`posthog ${response.status}`);
    }
  } catch (error) {
    console.error("analytics capture failed", body.event, error);
  }
}
