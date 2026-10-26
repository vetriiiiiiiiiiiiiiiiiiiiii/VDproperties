/**
 * The homepage hero artwork, drawn from the logo's own motifs: a rising sun with cloud streaks,
 * gold skyline bars and layered leaf-green land with a surveyed plot boundary.
 * When the company uploads a hero photograph, it appears inside the sun.
 */
const BARS = [
  { x: 610, w: 30, h: 120 },
  { x: 648, w: 30, h: 168 },
  { x: 686, w: 34, h: 236 },
  { x: 728, w: 40, h: 330 },
  { x: 776, w: 30, h: 272 },
  { x: 814, w: 26, h: 196 },
  { x: 848, w: 22, h: 150 },
];

export function SunriseScene({ photo, photoAlt }: { photo?: string | null; photoAlt?: string | null }) {
  return (
    <svg viewBox="0 0 1200 900" className="block h-full w-full" role="img" aria-label={photo ? (photoAlt ?? "Property photograph") : "Illustration of the sun rising over green land and a gold skyline, in the style of the V D Properties logo"} preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="ss-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B90E10" />
          <stop offset="0.5" stopColor="#E5401A" />
          <stop offset="1" stopColor="#FDB668" />
        </linearGradient>
        <radialGradient id="ss-glow">
          <stop offset="0" stopColor="#FDB668" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FDB668" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ss-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3C86A" />
          <stop offset="0.55" stopColor="#D4921C" />
          <stop offset="1" stopColor="#7A4B08" />
        </linearGradient>
        <linearGradient id="ss-gold-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9A6410" />
          <stop offset="1" stopColor="#5A3604" />
        </linearGradient>
        <linearGradient id="ss-leaf1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8CBF26" />
          <stop offset="1" stopColor="#2C7A1E" />
        </linearGradient>
        <linearGradient id="ss-leaf2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2C7A1E" />
          <stop offset="1" stopColor="#0C3F19" />
        </linearGradient>
        <linearGradient id="ss-leaf3" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6FA824" />
          <stop offset="0.6" stopColor="#1E6A1A" />
          <stop offset="1" stopColor="#0C3F19" />
        </linearGradient>
        <pattern id="ss-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0H0V60" fill="none" stroke="#0A3468" strokeOpacity="0.07" />
        </pattern>
        <clipPath id="ss-sun-clip">
          <circle cx="720" cy="360" r="250" />
        </clipPath>
      </defs>

      <rect width="1200" height="900" fill="url(#ss-grid)" />

      {/* Sun + glow */}
      <g className="vd-scroll-sun">
        <circle className="vd-glow" cx="720" cy="360" r="420" fill="url(#ss-glow)" />
        <g className="vd-sun">
          {photo ? (
            <>
              <image href={photo} x="470" y="110" width="500" height="500" preserveAspectRatio="xMidYMid slice" clipPath="url(#ss-sun-clip)" />
              <circle cx="720" cy="360" r="250" fill="none" stroke="url(#ss-sun)" strokeWidth="10" />
            </>
          ) : (
            <circle cx="720" cy="360" r="250" fill="url(#ss-sun)" />
          )}
        </g>
        {/* Cloud streaks, as in the logo */}
        <g fill="#FDFAF3">
          <path className="vd-cloud" d="M380 250 C 470 238, 560 246, 640 240 L 760 236 C 700 250, 560 256, 380 250 Z" opacity="0.95" />
          <path className="vd-cloud" d="M600 300 C 700 290, 840 296, 960 290 L 1040 292 C 940 304, 780 310, 600 300 Z" opacity="0.9" />
          <path className="vd-cloud" d="M520 345 C 600 338, 690 342, 770 338 C 700 350, 610 354, 520 345 Z" opacity="0.7" />
        </g>
      </g>

      {/* Survey linework */}
      <g stroke="#0A3468" strokeOpacity="0.35" fill="none" fontFamily="var(--font-plex-mono), monospace">
        <path d="M120 140 H 300 M120 132 V 148 M300 132 V 148" />
        <text x="160" y="124" fill="#0A3468" fillOpacity="0.55" stroke="none" fontSize="15" letterSpacing="3">N ↑</text>
        <circle cx="1060" cy="160" r="26" />
        <path d="M1060 140 L1068 170 L1060 164 L1052 170 Z" fill="#0A3468" fillOpacity="0.5" stroke="none" />
      </g>

      {/* Gold skyline */}
      <g>
        {BARS.map((b, i) => (
          <g key={b.x} className="vd-bar" style={{ ["--i" as string]: i }}>
            <rect x={b.x} y={700 - b.h} width={b.w} height={b.h} fill="url(#ss-gold)" />
            <rect x={b.x + b.w - 7} y={700 - b.h} width="7" height={b.h} fill="url(#ss-gold-side)" />
          </g>
        ))}
      </g>

      {/* Leaf-green land, layered like the logo */}
      <g className="vd-scroll-hill" style={{ ["--depth" as string]: 0.4 }}>
        <path className="vd-hill" style={{ ["--i" as string]: 0 }} d="M300 720 C 520 600, 820 610, 1240 690 L1240 900 L300 900 Z" fill="url(#ss-leaf1)" stroke="#FDFAF3" strokeWidth="5" />
      </g>
      <g className="vd-scroll-hill" style={{ ["--depth" as string]: 0.8 }}>
        <path className="vd-hill" style={{ ["--i" as string]: 1 }} d="M-40 800 C 260 690, 600 680, 1000 760 C 1100 780, 1180 790, 1240 790 L1240 900 L-40 900 Z" fill="url(#ss-leaf2)" stroke="#FDFAF3" strokeWidth="5" />
        {/* Surveyed plot boundary on the land */}
        <polygon className="vd-trace" pathLength={1} points="420,752 640,732 706,780 470,800" fill="#F3C86A" fillOpacity="0.14" stroke="#F3C86A" strokeWidth="3" strokeDasharray="1" />
        <g fill="#F3C86A">
          {[[420, 752], [640, 732], [706, 780], [470, 800]].map(([x, y], i) => (
            <circle key={i} className="vd-pop" style={{ ["--i" as string]: 20 + i }} cx={x} cy={y} r="6" />
          ))}
        </g>
      </g>
      <g className="vd-scroll-hill" style={{ ["--depth" as string]: 1.3 }}>
        <path className="vd-hill" style={{ ["--i" as string]: 2 }} d="M-40 870 C 200 800, 360 760, 120 600 C 300 640, 470 760, 560 900 L-40 900 Z" fill="url(#ss-leaf3)" stroke="#FDFAF3" strokeWidth="5" />
      </g>
    </svg>
  );
}
