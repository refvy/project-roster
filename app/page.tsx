import { LoginForm } from "@/components/LoginForm";
import { Wordmark } from "@/components/Wordmark";
import { getOrganiser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const organiser = await getOrganiser();
  if (organiser) {
    redirect("/board");
  }

  const { error } = await searchParams;
  const errorCopy =
    error === "expired-link"
      ? "That magic link is expired or already used. Request a new one."
      : error === "missing-link"
        ? "That magic link was incomplete. Request a new one."
        : null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8">
      <header>
        <Wordmark />
      </header>
      <main className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cobalt">
            Matchday board
          </p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Paste a link.
            <br />
            See who’s going.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Recreational ก๊วน, football first. Guests open a share link, tap
            Going or Out, pick a position, type a name. Organisers get a live
            roster — no player accounts, no venue booking.
          </p>
        </div>
        <section className="rounded-[2rem] bg-cream-deep/80 p-6 md:p-8">
          <h2 className="font-display text-2xl tracking-tight">Organise</h2>
          <p className="mt-2 mb-6 text-sm text-ink-soft">
            Magic link. No password. Players never sign in.
          </p>
          {errorCopy ? (
            <p className="mb-4 text-sm font-medium text-red-700" role="alert">
              {errorCopy}
            </p>
          ) : null}
          <LoginForm />
        </section>
      </main>
    </div>
  );
}
