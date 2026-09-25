import Link from "next/link";

export function PrivacyLink() {
  return (
    <footer className="mt-auto pt-10">
      <Link
        href="/privacy"
        data-testid="privacy-link"
        className="text-[12px] leading-none underline-offset-4 hover:underline"
        style={{ color: "#9CA3AF" }}
      >
        Privacy
      </Link>
    </footer>
  );
}
