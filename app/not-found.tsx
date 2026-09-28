import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
      <Wordmark />
      <h1 className="mt-16 font-display text-4xl tracking-tight">
        That board isn’t here
      </h1>
      <p className="mt-3 text-ink-soft">Check the share link and try again.</p>
    </div>
  );
}
