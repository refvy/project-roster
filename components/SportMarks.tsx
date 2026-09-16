export function FootballMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.4 14.2 8.9l.15 2.9-2.35 1.7-2.35-1.7.15-2.9Z" />
      <path d="M14.2 8.9 17.8 7.5M9.8 8.9 6.2 7.5M12 13.5v3.6M9.6 13.5 7.2 16.8M14.4 13.5 16.8 16.8" />
    </svg>
  );
}

export function BasketballMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="4.5" width="15" height="15" rx="1" />
      <rect x="9" y="4.5" width="6" height="6.5" />
      <path d="M9 11a3 3 0 0 0 6 0" />
      <path d="M6.2 4.5a6.2 6.2 0 0 0 11.6 0" />
    </svg>
  );
}
