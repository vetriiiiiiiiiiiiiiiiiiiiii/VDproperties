/**
 * Cycles through words in place with a vertical slot motion (CSS only).
 * Screen readers get the first word; with reduced motion only the first word shows.
 */
export function RotatingWords({ words, className = "", wordClassName = "" }: { words: string[]; className?: string; wordClassName?: string }) {
  return (
    <span className={`relative inline-grid overflow-hidden align-bottom ${className}`}>
      <span className="sr-only">{words[0]}</span>
      {words.map((w, i) => (
        <span
          key={w}
          aria-hidden="true"
          className={`vd-word col-start-1 row-start-1 whitespace-nowrap pb-[0.08em] pr-[0.1em] ${wordClassName} ${i === 0 ? "motion-reduce:opacity-100" : "opacity-0 motion-reduce:hidden"}`}
          style={{ ["--i" as string]: i }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}
