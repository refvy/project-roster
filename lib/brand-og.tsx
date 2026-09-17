import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Skwad — Paste a link. Get your squad signed up.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "Paste a link. Get your squad signed up.";

export async function brandOpenGraphImage() {
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
          Matchday board
        </div>
        <div
          style={{
            marginTop: 20,
            color: "#1a1714",
            fontFamily: "Outfit",
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            maxWidth: 980,
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 20,
            color: "#00D4C8",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00D4C8"
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.05 14.55 8.9l-.95 2.95H10.4L9.45 8.9Z" />
            <path d="M14.55 8.9 18.4 7.35" />
            <path d="M9.45 8.9 5.6 7.35" />
            <path d="M13.6 11.85 16.7 14.7 15.55 18.4" />
            <path d="M10.4 11.85 7.3 14.7 8.45 18.4" />
            <path d="M12 14.8v4.2" />
            <path d="M8.45 18.4H15.55" />
          </svg>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00D4C8"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18" />
            <path d="M3 12h18" />
            <path d="M5.2 5.6c3.8 2.8 3.8 10 0 12.8" />
            <path d="M18.8 5.6c-3.8 2.8-3.8 10 0 12.8" />
          </svg>
        </div>
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
