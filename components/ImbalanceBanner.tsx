export function ImbalanceBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <section
      data-testid="imbalance-banner"
      className="rounded-3xl bg-cobalt px-6 py-6 text-cream shadow-[0_20px_50px_-24px_rgba(31,75,255,0.7)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/70">
        Roster skew
      </p>
      <p className="mt-2 font-display text-3xl leading-tight tracking-tight md:text-4xl">
        {message}
      </p>
    </section>
  );
}
