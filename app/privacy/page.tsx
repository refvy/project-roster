import type { Metadata } from "next";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
      <header>
        <Wordmark />
      </header>
      <main className="mt-16 flex flex-col gap-8" data-testid="privacy-page">
        <h1 className="font-display text-4xl tracking-tight">Privacy</h1>
        <p className="text-lg text-ink-soft">
          Skwad keeps signup simple. We use a small browser cookie so you stay
          signed for a match without an account.
        </p>

        <section>
          <h2 className="font-display text-2xl tracking-tight">What we store</h2>
          <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
            <li>A guest cookie on your device (who you are on this match)</li>
            <li>
              Match details you or the manager enter (time, place, Going / Out
              names)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl tracking-tight">Why</h2>
          <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
            <li>So you don’t have to re-enter every time you open the link</li>
            <li>So the manager can run the roster</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl tracking-tight">
            Analytics (when on)
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
            <li>
              Anonymous usage events only — no names, no phone, no email in
              analytics
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl tracking-tight">Retention</h2>
          <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
            <li>Cookie lasts until it expires or you clear site data</li>
            <li>
              Match data stays while the match exists; managers can remove RSVPs
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl tracking-tight">Contact</h2>
          <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
            <li>
              <a
                href="mailto:privacy@getskwad.com"
                className="underline-offset-4 hover:underline"
              >
                privacy@getskwad.com
              </a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
