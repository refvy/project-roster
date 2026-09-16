import { logoutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/Wordmark";
import { getOrganiser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BoardPage() {
  const organiser = await getOrganiser();
  if (!organiser) redirect("/");

  const matchdays = await prisma.matchday.findMany({
    where: { organiserId: organiser.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { rsvps: { where: { status: "GOING" } } },
      },
    },
  });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Wordmark href="/board" />
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="mt-12">
        <p className="text-sm text-ink-soft">{organiser.email}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl tracking-tight">Matchdays</h1>
          <Link
            href="/board/new"
            className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
          >
            New matchday
          </Link>
        </div>
        {matchdays.length === 0 ? (
          <p className="mt-10 text-ink-soft">
            No matchdays yet. Create one, copy the link, send it to the ก๊วน.
          </p>
        ) : (
          <ul className="mt-10 divide-y divide-ink/10">
            {matchdays.map((matchday) => (
              <li key={matchday.id} className="py-5">
                <Link href={`/board/${matchday.id}`} className="block">
                  <p className="font-display text-2xl tracking-tight">
                    {matchday.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {matchday.whenWhere} · {matchday._count.rsvps} going
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
