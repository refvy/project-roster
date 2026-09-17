import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { sportLabel } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import { formatWhenWhereLine } from "@/lib/when-where";

export const alt = "Matchday — powered by SKWAD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
    select: { title: true, sport: true, whenWhere: true, deletedAt: true },
  });

  const gone = !matchday || Boolean(matchday.deletedAt);
  const title = gone ? "This matchday was deleted" : matchday.title;
  const sport = gone ? "" : sportLabel(matchday.sport);
  const when = gone ? "" : formatWhenWhereLine(matchday.whenWhere);

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
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#f7f4ef",
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
            maxWidth: 1000,
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
