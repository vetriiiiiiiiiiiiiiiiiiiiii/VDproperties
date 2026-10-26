/** Closing scene: the logo's sun setting behind leaf-green hills, with the tagline at full scale. */
export function FooterSunset({ tagline }: { tagline: string }) {
  return (
    <div className="relative overflow-hidden bg-paper" aria-hidden="true">
      <svg viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" className="block h-[220px] w-full sm:h-[320px]">
        <defs>
          <linearGradient id="fs-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B90E10" />
            <stop offset="0.55" stopColor="#E5401A" />
            <stop offset="1" stopColor="#FDB668" />
          </linearGradient>
          <linearGradient id="fs-a" x1="0" x2="1">
            <stop offset="0" stopColor="#8CBF26" />
            <stop offset="1" stopColor="#2C7A1E" />
          </linearGradient>
        </defs>
        <g className="vd-footer-sun">
          <circle cx="1040" cy="250" r="150" fill="url(#fs-sun)" />
          <path d="M800 190 C 900 182, 1010 188, 1110 182 L 1240 184 C 1120 196, 960 200, 800 190 Z" fill="#F5EFE1" />
          <path d="M920 236 C 1000 230, 1080 233, 1170 229 C 1100 242, 1000 246, 920 236 Z" fill="#F5EFE1" opacity="0.8" />
        </g>
        <path d="M0 290 C 300 200, 700 210, 1000 260 S 1340 300, 1440 250 L1440 360 L0 360 Z" fill="url(#fs-a)" stroke="#F5EFE1" strokeWidth="4" />
        <path d="M0 320 C 360 270, 760 280, 1080 320 S 1360 330, 1440 310 L1440 360 L0 360 Z" fill="#0C3F19" stroke="#F5EFE1" strokeWidth="3" />
      </svg>
      <p className="pointer-events-none absolute inset-x-0 top-6 text-center font-serif whitespace-nowrap text-[clamp(1.4rem,5.4vw,5.5rem)] font-semibold uppercase leading-none tracking-[0.04em] text-navy/[0.07] sm:top-10">
        {tagline}
      </p>
    </div>
  );
}
