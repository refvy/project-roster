import type { SVGProps } from "react";

export function FootballMark({
  className,
  ...rest
}: { className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
      {...rest}
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
  );
}

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
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="M5.2 5.6c3.8 2.8 3.8 10 0 12.8" />
      <path d="M18.8 5.6c-3.8 2.8-3.8 10 0 12.8" />
    </svg>
  );
}
