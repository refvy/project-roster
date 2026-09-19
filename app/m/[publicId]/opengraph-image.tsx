import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { sportLabel } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import {
  matchdaySharePulse,
  type StampView,
} from "@/lib/share-pulse";
import { formatWhenWhereLine } from "@/lib/when-where";

export const alt = "Matchday — powered by SKWAD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Dan locked mock: lime CTA band. Not an app chrome token. */
const OG_LIME = "#C5F04D";

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
    include: { rsvps: { select: { status: true, positionKey: true } } },
  });

  const gone = !matchday || Boolean(matchday.deletedAt);
  const cancelled = !gone && matchday.status === "CANCELLED";
  const completed = !gone && matchday.status === "COMPLETED";
  const live = !gone && matchday.status === "LIVE";
  const title = gone
    ? "This matchday was deleted"
    : cancelled
      ? "This match was cancelled"
      : completed
        ? "Match completed"
        : matchday.title;
  const sport = gone ? "" : sportLabel(matchday.sport);
  const when = gone ? "" : formatWhenWhereLine(matchday.whenWhere);
  const pulse = live && matchday ? matchdaySharePulse(matchday) : null;
  const stamp = pulse?.stamp ?? null;
  const ctaTitle = pulse?.title ?? null;

  const [logo, extraBold, medium] = await Promise.all([
    readFile(join(process.cwd(), "public/skwad-header.png")),
    readFile(join(process.cwd(), "fonts/Outfit-ExtraBold.ttf")),
    readFile(join(process.cwd(), "fonts/Outfit-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f7f4ef",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            flexGrow: 1,
            position: "relative",
            paddingTop: 56,
            paddingBottom: 28,
            paddingLeft: 72,
            paddingRight: 72,
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            height={64}
            alt="SKWAD"
          />
          <div
            style={{
              marginTop: 36,
              color: "#00D4C8",
              fontFamily: "Outfit",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Matchday
          </div>
          <div
            style={{
              marginTop: 12,
              color: "#1a1714",
              fontFamily: "Outfit",
              fontSize: title.length > 28 ? 48 : 60,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: stamp ? 760 : 1000,
            }}
          >
            {title}
          </div>
          {sport ? (
            <div
              style={{
                marginTop: 18,
                color: "#5e584f",
                fontFamily: "Outfit",
                fontSize: 28,
                fontWeight: 500,
              }}
            >
              {sport}
            </div>
          ) : null}
          {when ? (
            <div
              style={{
                marginTop: 6,
                color: "#5e584f",
                fontFamily: "Outfit",
                fontSize: 28,
                fontWeight: 500,
              }}
            >
              {when}
            </div>
          ) : null}
          {stamp ? <OgStamp stamp={stamp} /> : null}
        </div>
        {ctaTitle ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: "100%",
              backgroundColor: OG_LIME,
              paddingTop: 36,
              paddingBottom: 40,
              paddingLeft: 72,
              paddingRight: 72,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#1a1714",
                fontFamily: "Outfit",
                fontSize: ctaTitle.length > 52 ? 34 : 40,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                maxWidth: 1056,
              }}
            >
              {ctaTitle}
            </div>
            {when ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  color: "#3f3b36",
                  fontFamily: "Outfit",
                  fontSize: 26,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  maxWidth: 1056,
                }}
              >
                {truncateOgLine(when, 78)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Outfit", data: extraBold, weight: 800, style: "normal" },
        { name: "Outfit", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}

function truncateOgLine(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
}

/** Dan locked mock: white fill + thick coral/teal border, slight tilt, cream behind. */
function OgStamp({ stamp }: { stamp: StampView }) {
  const twoLines = Boolean(stamp.line2);
  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        right: 56,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: stamp.fill,
        borderWidth: 14,
        borderStyle: "solid",
        borderColor: stamp.border,
        borderRadius: 36,
        paddingTop: twoLines ? 20 : 26,
        paddingBottom: twoLines ? 22 : 26,
        paddingLeft: 30,
        paddingRight: 30,
        transform: `rotate(${stamp.tiltDeg}deg)`,
      }}
    >
      <div
        style={{
          display: "flex",
          color: stamp.line1.color,
          fontFamily: "Outfit",
          fontSize: stamp.line1.text.length > 9 ? 40 : 52,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          textTransform: "uppercase",
        }}
      >
        {stamp.line1.text}
      </div>
      {stamp.line2 ? (
        <div
          style={{
            display: "flex",
            marginTop: 8,
            color: stamp.line2.color,
            fontFamily: "Outfit",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            textTransform: "uppercase",
          }}
        >
          {stamp.line2.text}
        </div>
      ) : null}
    </div>
  );
}
