"use client";

import { useId, type SVGProps } from "react";

const INK = "#1a1714";
const TEAL = "#00D4C8";

/** Dan’s football: white ball, slate patches (#0f172a / #ffffff). */
export function FootballMark({
  className,
  ...rest
}: { className?: string } & SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `ball-edge-${uid}`;
  const sliceId = `football-slice-${uid}`;

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      {...rest}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="40" />
        </clipPath>
        <g id={sliceId}>
          <polygon
            points="50,27 62,17 63.64,-4.55 36.36,-4.55 38,17"
            fill="#0f172a"
          />
          <line
            x1="50"
            y1="37"
            x2="50"
            y2="25.45"
            stroke="#0f172a"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      </defs>
      <circle cx="50" cy="50" r="40" fill="#ffffff" />
      <g clipPath={`url(#${clipId})`}>
        <use href={`#${sliceId}`} />
        <use href={`#${sliceId}`} transform="rotate(72 50 50)" />
        <use href={`#${sliceId}`} transform="rotate(144 50 50)" />
        <use href={`#${sliceId}`} transform="rotate(216 50 50)" />
        <use href={`#${sliceId}`} transform="rotate(288 50 50)" />
        <polygon
          points="50,32.07 67.05,44.46 60.55,64.51 39.45,64.51 32.95,44.46"
          fill="#0f172a"
        />
      </g>
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke="#0f172a"
        strokeWidth="5"
        fill="none"
      />
    </svg>
  );
}

/** Matching basketball: black ball, teal seams. */
export function BasketballMark({
  className,
  ...rest
}: { className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      {...rest}
    >
      <circle cx="12" cy="12" r="9.15" fill={INK} />
      <g
        stroke={TEAL}
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M5.2 5.6c3.8 2.8 3.8 10 0 12.8" />
        <path d="M18.8 5.6c-3.8 2.8-3.8 10 0 12.8" />
      </g>
    </svg>
  );
}
