export function GoingList({
  going,
  empty,
}: {
  going: { id: string; name: string; positionKey: string | null }[];
  empty: string;
}) {
  if (going.length === 0) {
    return <p className="mt-6 text-ink-soft">{empty}</p>;
  }

  return (
    <ul data-testid="roster" className="mt-6 divide-y divide-ink/10">
      {going.map((rsvp) => (
        <li
          key={rsvp.id}
          className="flex items-center justify-between gap-4 py-4"
        >
          <span className="text-lg font-medium">{rsvp.name}</span>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold tracking-wide text-accent-deep">
            {!rsvp.positionKey || rsvp.positionKey === "ANY"
              ? "Any"
              : rsvp.positionKey}
          </span>
        </li>
      ))}
    </ul>
  );
}
