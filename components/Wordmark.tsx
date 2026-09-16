import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-baseline gap-2 no-underline"
    >
      <span className="font-display text-2xl tracking-tight text-accent">
        Roster
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
        working name
      </span>
    </Link>
  );
}
