export function ImbalanceBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <section
      data-testid="imbalance-banner"
      className="rounded-3xl bg-accent px-6 py-6 text-on-accent shadow-banner"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-accent/70">
        Roster skew
      </p>
      <p className="mt-2 font-display text-3xl leading-tight tracking-tight md:text-4xl">
        {message}
      </p>
    </section>
  );
}
