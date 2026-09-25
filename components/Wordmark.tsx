import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Skwad"
      className="inline-flex items-center no-underline"
    >
      <img
        src="/skwad-header.png"
        alt=""
        width={129}
        height={36}
        className="h-9 w-auto sm:h-10"
        draggable={false}
      />
    </Link>
  );
}
