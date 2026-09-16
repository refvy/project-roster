export function FootballMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.2 14.3 8.9l.2 3.1-2.5 1.8-2.5-1.8.2-3.1Z" />
      <path d="M14.3 8.9 18.2 7.4M9.7 8.9 5.8 7.4M12 13.8v3.9M9.5 13.8 7 17.2M14.5 13.8 17 17.2" />
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
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M6.2 5.4c2.6 2.2 2.6 10.9 0 13.2M17.8 5.4c-2.6 2.2-2.6 10.9 0 13.2" />
    </svg>
  );
}
