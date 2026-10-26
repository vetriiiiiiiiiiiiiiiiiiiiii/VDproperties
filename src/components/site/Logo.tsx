import Image from "next/image";

/**
 * Official V D Properties logo. The emblem is the company's artwork (public/brand/vd-mark.webp,
 * generated from brand/vd-properties-logo.png by scripts/brand-assets.mjs); the wordmark is live text
 * styled after the logo so it stays crisp and readable on light or dark backgrounds.
 */
export function Logo({ inverted = false, compact = false, size = "md" }: { inverted?: boolean; compact?: boolean; size?: "md" | "lg" }) {
  const markH = size === "lg" ? 72 : compact ? 40 : 52;
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/brand/vd-mark.webp" alt="" width={Math.round(markH * 1.48)} height={markH} priority className="h-auto w-auto shrink-0 transition-[height] duration-300" style={{ height: markH }} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif font-semibold uppercase tracking-[0.04em] ${size === "lg" ? "text-[2rem]" : compact ? "text-[1.15rem]" : "text-[1.4rem]"}`}>
          <span className={inverted ? "text-leaf" : "text-emerald"}>V</span>{" "}
          <span className="text-gold">D</span>{" "}
          <span className={inverted ? "text-ivory" : "text-navy"}>Properties</span>
        </span>
        {!compact && (
          <span className={`mt-1.5 flex items-center gap-1.5 text-[0.56rem] font-medium uppercase tracking-[0.28em] ${inverted ? "text-ivory/80" : "text-navy"}`}>
            <span className="h-px w-3 bg-gold" aria-hidden="true" />
            Build better from now
            <span className="h-px w-3 bg-gold" aria-hidden="true" />
          </span>
        )}
      </span>
    </span>
  );
}
