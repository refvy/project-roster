export function FatChoice({
  selected,
  onClick,
  children,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-14 min-w-[4.5rem] items-center justify-center rounded-full border-2 px-6 text-lg font-semibold tracking-wide transition ${
        selected
          ? "border-accent bg-accent text-on-accent"
          : "border-ink/15 bg-surface text-ink hover:border-accent/40"
      }`}
    >
      {children}
    </button>
  );
}
