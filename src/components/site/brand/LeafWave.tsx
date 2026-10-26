/** Layered leaf-wave divider taken from the logo's land swooshes. Place between sections. */
export function LeafWave({ from = "#FDFAF3", to = "#0C3F19", flip = false, className = "" }: { from?: string; to?: string; flip?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative -mb-px overflow-hidden leading-[0] ${className}`} style={{ background: from, transform: flip ? "scaleY(-1)" : undefined }}>
      <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className="vd-wave-shift block h-[70px] w-[106%] -translate-x-[3%] sm:h-[110px]">
        <path d="M0 96 C 260 40, 520 30, 760 70 S 1200 120, 1440 52 L1440 140 L0 140 Z" fill="#8CBF26" opacity="0.9" />
        <path d="M0 110 C 300 60, 600 70, 860 100 S 1240 118, 1440 84 L1440 140 L0 140 Z" fill="#2C7A1E" stroke="#FDFAF3" strokeWidth="3" />
        <path d="M0 128 C 360 92, 700 104, 1000 120 S 1300 126, 1440 112 L1440 140 L0 140 Z" fill={to} stroke="#FDFAF3" strokeWidth="2" />
      </svg>
    </div>
  );
}
