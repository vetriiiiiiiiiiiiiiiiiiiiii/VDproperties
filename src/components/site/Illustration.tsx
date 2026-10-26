/**
 * Architectural line drawings used in place of photographs until the company supplies its own.
 * Each one is visibly labelled as a sample illustration so it can't be mistaken for a real project photo.
 */
export type IllustrationVariant = "plot" | "site-plan" | "land" | "elevation" | "villa" | "floor-plan" | "construction" | "hero";

const TONES = {
  forest: { bg: "#0C3F19", line: "#FDFAF3", soft: "rgba(253,250,243,0.17)", accent: "#F3C86A", sun: "#E5401A" },
  ivory: { bg: "#F5EFE1", line: "#0A3468", soft: "rgba(10,52,104,0.12)", accent: "#D4921C", sun: "#E5401A" },
  navy: { bg: "#0A3468", line: "#FDFAF3", soft: "rgba(253,250,243,0.15)", accent: "#F3C86A", sun: "#E5401A" },
} as const;
export type Tone = keyof typeof TONES;

const DEFAULT_TONE: Record<IllustrationVariant, Tone> = {
  plot: "ivory",
  "site-plan": "forest",
  land: "forest",
  elevation: "ivory",
  villa: "navy",
  "floor-plan": "ivory",
  construction: "navy",
  hero: "ivory",
};

export function Illustration({
  variant,
  tone,
  label = true,
  className = "",
  title,
}: {
  variant: IllustrationVariant;
  tone?: Tone;
  label?: boolean;
  className?: string;
  title?: string;
}) {
  const t = TONES[tone ?? DEFAULT_TONE[variant]];
  const Drawing = DRAWINGS[variant] ?? DRAWINGS.elevation;
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid meet"
      className={`block h-full w-full ${className}`}
      role="img"
      aria-label={title ?? "Sample architectural illustration"}
      style={{ background: t.bg }}
    >
      <defs>
        <pattern id={`g-${variant}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke={t.soft} strokeWidth="1" />
        </pattern>
      </defs>
      {/* Oversized so the grid fills the frame beyond the drawing when the container is a different shape. */}
      <rect x="-2000" y="-2000" width="4800" height="4600" fill={`url(#g-${variant})`} />
      <Drawing t={t} />
      {label && (
        <g fontFamily="ui-monospace, Menlo, monospace" fontSize="13" letterSpacing="2" fill={t.line} opacity="0.75">
          <rect x="24" y="552" width="330" height="26" fill={t.bg} opacity="0.9" />
          <text x="34" y="570">SAMPLE ILLUSTRATION · NOT A PHOTO</text>
        </g>
      )}
    </svg>
  );
}

type T = (typeof TONES)[Tone];

const DRAWINGS: Record<IllustrationVariant, (p: { t: T }) => React.ReactElement> = {
  plot: ({ t }) => (
    <g fill="none" stroke={t.line} strokeWidth="1.5" fontFamily="ui-monospace, Menlo, monospace">
      {/* neighbouring plots */}
      <g stroke={t.soft} strokeWidth="1.2">
        <rect x="90" y="110" width="170" height="250" />
        <rect x="540" y="110" width="170" height="250" />
        <rect x="90" y="360" width="170" height="120" />
        <rect x="540" y="360" width="170" height="120" />
      </g>
      {/* subject plot */}
      <rect x="260" y="110" width="280" height="370" stroke={t.line} strokeWidth="2.5" fill={t.soft} />
      <rect x="290" y="150" width="220" height="250" strokeDasharray="6 6" strokeWidth="1" />
      {/* road */}
      <path d="M40 500H760M40 540H760" stroke={t.line} />
      <path d="M40 520H760" strokeDasharray="18 14" stroke={t.accent} />
      {/* dimensions */}
      <g stroke={t.accent} strokeWidth="1">
        <path d="M260 85H540M260 78V92M540 78V92" />
        <path d="M570 110V480M563 110H577M563 480H577" />
      </g>
      <g fill={t.line} stroke="none" fontSize="14" letterSpacing="1.5">
        <text x="372" y="76">30′-0″</text>
        <text x="584" y="300" transform="rotate(90 584 300)">40′-0″</text>
        <text x="330" y="290" fontSize="15">PLOT · 1,200 SQ FT</text>
        <text x="330" y="312" fontSize="12" opacity="0.7">BUILDABLE ENVELOPE</text>
        <text x="330" y="525" fontSize="12">30′ ROAD</text>
      </g>
      {/* north arrow */}
      <g transform="translate(690 60)">
        <circle r="20" stroke={t.line} />
        <path d="M0 -16L7 10L0 5L-7 10Z" fill={t.line} stroke="none" />
        <text y="-26" textAnchor="middle" fill={t.line} stroke="none" fontSize="12">N</text>
      </g>
    </g>
  ),

  "site-plan": ({ t }) => {
    const plots: React.ReactElement[] = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 7; c++) {
        const x = 90 + c * 90;
        const y = 90 + r * 140 + (r > 0 ? 30 : 0);
        const hi = r === 1 && c === 2;
        plots.push(<rect key={`${r}-${c}`} x={x} y={y} width="80" height="105" fill={hi ? t.accent : "none"} fillOpacity={hi ? 0.35 : 0} stroke={hi ? t.accent : t.line} strokeWidth={hi ? 2.5 : 1.2} />);
      }
    return (
      <g fill="none" stroke={t.line}>
        <rect x="60" y="60" width="680" height="470" strokeWidth="2" strokeDasharray="14 6" />
        {plots}
        <path d="M60 210H740M60 380H740" stroke={t.soft} strokeWidth="18" />
        <circle cx="640" cy="470" r="34" stroke={t.line} strokeWidth="1.2" />
        <circle cx="610" cy="480" r="16" stroke={t.line} strokeWidth="1.2" />
        <g fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="1.5">
          <text x="70" y="50">LAYOUT BOUNDARY</text>
          <text x="560" y="525">OPEN SPACE</text>
          <text x="280" y="235" fill={t.accent}>PLOT B-03</text>
          <text x="80" y="204">40′ ROAD</text>
        </g>
      </g>
    );
  },

  land: ({ t }) => (
    <g fill="none" stroke={t.line}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`M-20 ${180 + i * 55} C 160 ${120 + i * 60}, 300 ${260 + i * 40}, 460 ${190 + i * 52} S 720 ${150 + i * 60}, 840 ${210 + i * 50}`}
          stroke={t.soft}
          strokeWidth="1.4"
        />
      ))}
      <polygon points="180,170 560,130 640,390 250,450" stroke={t.accent} strokeWidth="2.5" fill={t.accent} fillOpacity="0.12" />
      {[
        [180, 170],
        [560, 130],
        [640, 390],
        [250, 450],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill={t.bg} stroke={t.accent} strokeWidth="2" />
          <text x={x + 12} y={y - 10} fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12">
            P{i + 1}
          </text>
        </g>
      ))}
      <path d="M0 520 C 200 500, 420 540, 800 505" stroke={t.line} strokeWidth="2" />
      <text x="40" y="500" fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="1.5">
        ACCESS ROAD
      </text>
    </g>
  ),

  elevation: ({ t }) => (
    <g fill="none" stroke={t.line} strokeWidth="1.6">
      <circle cx="640" cy="150" r="56" fill={t.sun} fillOpacity="0.85" stroke="none" />
      <path d="M40 470H760" strokeWidth="2.5" />
      {/* ground floor */}
      <rect x="170" y="330" width="460" height="140" fill={t.bg} />
      {/* first floor cantilever */}
      <rect x="200" y="200" width="460" height="130" fill={t.bg} />
      <path d="M190 200H670" strokeWidth="5" />
      <path d="M160 330H640" strokeWidth="3" />
      {/* jaali screen */}
      <g stroke={t.accent} strokeWidth="1.2">
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M${470 + i * 18} 215V315`} />
        ))}
      </g>
      {/* windows */}
      <rect x="230" y="230" width="110" height="70" />
      <path d="M285 230V300" />
      <rect x="360" y="230" width="80" height="70" />
      <rect x="210" y="365" width="150" height="70" />
      <path d="M260 365V435M310 365V435" />
      {/* door & steps */}
      <rect x="420" y="360" width="64" height="110" fill={t.soft} />
      <path d="M405 470H500M410 462H495" />
      <rect x="520" y="365" width="80" height="70" />
      {/* planting */}
      <path d="M110 470C110 420 130 395 120 360M120 360C150 380 150 430 135 470M120 380C95 400 92 440 100 470" stroke={t.line} />
      <g fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="1.5">
        <text x="680" y="268">+3.30</text>
        <text x="680" y="400">±0.00</text>
        <text x="200" y="500">FRONT ELEVATION</text>
      </g>
      <path d="M670 200H700M670 330H700M670 470H700" stroke={t.accent} strokeWidth="1" />
    </g>
  ),

  villa: ({ t }) => (
    <g fill="none" stroke={t.line} strokeWidth="1.6">
      <circle cx="160" cy="140" r="48" fill={t.sun} fillOpacity="0.85" stroke="none" />
      <path d="M30 480H770" strokeWidth="2.5" />
      <path d="M120 300L330 190L540 300" strokeWidth="3" />
      <rect x="150" y="300" width="360" height="180" fill={t.bg} />
      <rect x="510" y="250" width="200" height="230" fill={t.bg} />
      <path d="M500 250H720" strokeWidth="5" />
      <rect x="190" y="340" width="120" height="80" />
      <path d="M250 340V420" />
      <rect x="350" y="350" width="70" height="130" fill={t.soft} />
      <rect x="540" y="290" width="140" height="80" />
      <path d="M540 410H680M540 425H680" stroke={t.accent} />
      <g stroke={t.line}>
        <circle cx="90" cy="400" r="40" />
        <path d="M90 440V480" />
        <circle cx="740" cy="410" r="28" />
        <path d="M740 438V480" />
      </g>
      <text x="150" y="515" fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="1.5">
        STREET ELEVATION
      </text>
    </g>
  ),

  "floor-plan": ({ t }) => (
    <g fill="none" stroke={t.line}>
      <rect x="140" y="90" width="520" height="410" strokeWidth="6" />
      <path d="M380 90V300M140 300H460M460 300V500M560 300V500M460 380H660" strokeWidth="3" />
      <path d="M380 240A50 50 0 0 1 430 290" strokeWidth="1" />
      <path d="M260 300A40 40 0 0 0 300 340" strokeWidth="1" />
      <g fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="13" letterSpacing="1.5">
        <text x="200" y="200">LIVING</text>
        <text x="200" y="220" fontSize="11" opacity="0.7">16′ × 14′</text>
        <text x="460" y="200">BEDROOM 1</text>
        <text x="460" y="220" fontSize="11" opacity="0.7">12′ × 13′</text>
        <text x="220" y="410">KITCHEN · DINING</text>
        <text x="475" y="350">BATH</text>
        <text x="575" y="350">UTILITY</text>
        <text x="480" y="450">BEDROOM 2</text>
      </g>
      <path d="M140 540H660M140 532V548M660 532V548" stroke={t.accent} />
      <text x="372" y="566" fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12">
        36′-0″
      </text>
    </g>
  ),

  construction: ({ t }) => (
    <g fill="none" stroke={t.line} strokeWidth="1.6">
      <path d="M40 490H760" strokeWidth="2.5" />
      {[180, 330, 480, 630].map((x) => (
        <rect key={x} x={x - 12} y="200" width="24" height="290" fill={t.soft} />
      ))}
      <path d="M150 200H660M150 345H660" strokeWidth="6" />
      <g stroke={t.accent} strokeWidth="1.2">
        {[130, 690].map((x) => (
          <g key={x}>
            <path d={`M${x} 140V490`} />
            {[160, 230, 300, 370, 440].map((y) => (
              <path key={y} d={`M${x - 20} ${y}H${x + 20}M${x - 20} ${y}L${x + 20} ${y + 70}`} />
            ))}
          </g>
        ))}
      </g>
      <path d="M560 60V200M520 60H740M720 60V120" strokeWidth="2" />
      <path d="M720 120V150" strokeDasharray="4 4" />
      <text x="190" y="525" fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="1.5">
        STRUCTURAL FRAME · STAGE 2
      </text>
    </g>
  ),

  hero: ({ t }) => (
    <g fill="none" stroke={t.line} strokeWidth="1.6">
      <circle cx="610" cy="170" r="74" fill={t.sun} fillOpacity="0.9" stroke="none" />
      <polygon points="70,500 740,470 780,560 30,590" fill={t.soft} stroke={t.accent} strokeWidth="1.5" strokeDasharray="10 6" />
      <path d="M30 480H780" strokeWidth="2.5" />
      <rect x="150" y="320" width="440" height="160" fill={t.bg} />
      <rect x="230" y="180" width="430" height="140" fill={t.bg} />
      <path d="M215 180H680" strokeWidth="6" />
      <path d="M130 320H600" strokeWidth="3.5" />
      <g stroke={t.accent} strokeWidth="1.3">
        {Array.from({ length: 10 }).map((_, i) => (
          <path key={i} d={`M${470 + i * 17} 196V306`} />
        ))}
      </g>
      <rect x="260" y="212" width="160" height="80" />
      <path d="M340 212V292" />
      <rect x="180" y="360" width="170" height="80" />
      <path d="M237 360V440M293 360V440" />
      <rect x="395" y="350" width="70" height="130" fill={t.soft} />
      <rect x="495" y="360" width="70" height="80" />
      <path d="M90 480C90 420 110 390 100 350M100 350C135 370 132 430 116 480" />
      <path d="M700 480C700 440 712 420 706 395M706 395C730 410 728 450 716 480" />
      <g fill={t.line} stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="1.5">
        <text x="560" y="540" opacity="0.8">PLOT BOUNDARY</text>
        <text x="690" y="250">+3.30</text>
      </g>
    </g>
  ),
};
