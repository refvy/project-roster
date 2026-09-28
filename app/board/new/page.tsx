import { CreateMatchdayForm } from "@/components/CreateMatchdayForm";
import { Wordmark } from "@/components/Wordmark";
import { getOrganiser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewMatchdayPage() {
  const organiser = await getOrganiser();
  if (!organiser) redirect("/");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
      <header>
        <Wordmark href="/board" />
      </header>
      <main className="mt-12">
        <p className="text-sm font-medium text-ink-soft">
          <Link href="/board" className="underline-offset-4 hover:underline">
            ← Matchdays
          </Link>
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">
          New matchday
        </h1>
        <p className="mt-2 mb-8 text-ink-soft">
          Title, sport, optional date, time, and place. No venue booking.
        </p>
        <CreateMatchdayForm />
      </main>
    </div>
  );
}
