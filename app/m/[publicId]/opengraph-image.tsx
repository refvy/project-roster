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
  const stamp =
    live && matchday
      ? matchdaySharePulse(matchday).stamp
      : null;

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
          position: "relative",
          background: "#f7f4ef",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "80px 96px",
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            height={72}
            alt="SKWAD"
          />
          <div
            style={{
              marginTop: 72,
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
              marginTop: 16,
              color: "#1a1714",
              fontFamily: "Outfit",
              fontSize: title.length > 28 ? 56 : 72,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: stamp ? 780 : 1000,
            }}
          >
            {title}
          </div>
          {sport ? (
            <div
              style={{
                marginTop: 28,
                color: "#5e584f",
                fontFamily: "Outfit",
                fontSize: 32,
                fontWeight: 500,
              }}
            >
              {sport}
            </div>
          ) : null}
          {when ? (
            <div
              style={{
                marginTop: 8,
                color: "#5e584f",
                fontFamily: "Outfit",
                fontSize: 32,
                fontWeight: 500,
              }}
            >
              {when}
            </div>
          ) : null}
        </div>
        {stamp ? <OgStamp stamp={stamp} /> : null}
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

/** Dan locked mock: white fill + thick coral/teal border, slight tilt, cream behind. */
function OgStamp({ stamp }: { stamp: StampView }) {
  const twoLines = Boolean(stamp.line2);
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        right: 72,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: stamp.fill,
        borderWidth: 14,
        borderStyle: "solid",
        borderColor: stamp.border,
        borderRadius: 36,
        paddingTop: twoLines ? 18 : 28,
        paddingBottom: twoLines ? 20 : 28,
        paddingLeft: 34,
        paddingRight: 34,
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
            marginTop: 4,
            color: stamp.line2.color,
            fontFamily: "Outfit",
            fontSize: 34,
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
