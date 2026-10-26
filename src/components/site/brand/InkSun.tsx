/**
 * The logo's sun, drawn as if by hand: a slightly uneven disc, pencil hatching for shade,
 * and loose strokes for rays. Static shapes; the rays draw on once.
 */
export function InkSun({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 11 }, (_, i) => {
    const a = (-170 + i * 16) * (Math.PI / 180);
    const wob = [0, 4, -3, 2, -5, 3, 0, -2, 5, -4, 1][i];
    const r1 = 92 + wob;
    const r2 = 118 + wob * 1.6 + (i % 2 ? 8 : 0);
    return `M${(120 + Math.cos(a) * r1).toFixed(1)} ${(130 + Math.sin(a) * r1).toFixed(1)} L${(120 + Math.cos(a) * r2).toFixed(1)} ${(130 + Math.sin(a) * r2).toFixed(1)}`;
  });
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden="true">
      <defs>
        <clipPath id="ink-sun-disc">
          <path d="M120 52c40 1 73 33 72 76-1 42-34 74-74 72-41-1-72-33-71-75 1-41 33-74 73-73z" />
        </clipPath>
        <pattern id="ink-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d="M0 0V7" stroke="#B90E10" strokeWidth="1.6" strokeOpacity="0.55" />
        </pattern>
      </defs>
      <path d="M120 52c40 1 73 33 72 76-1 42-34 74-74 72-41-1-72-33-71-75 1-41 33-74 73-73z" fill="#E5401A" />
      <g clipPath="url(#ink-sun-disc)">
        <path d="M150 60c30 22 44 60 32 100-14 40-60 52-90 42 50-6 82-56 58-142z" fill="url(#ink-hatch)" />
        <path d="M70 92c10-20 30-30 48-30" fill="none" stroke="#FDB668" strokeWidth="5" strokeLinecap="round" />
      </g>
      <path d="M121 50c42 2 77 36 75 79-2 44-37 76-78 74-42-2-75-35-74-78" fill="none" stroke="#0A3468" strokeWidth="1.4" strokeLinecap="round" />
      <g className="ink-rays" stroke="#D4921C" strokeWidth="3.2" strokeLinecap="round" fill="none">
        {rays.map((d, i) => <path key={i} d={d} pathLength={1} style={{ ["--i" as string]: i }} />)}
      </g>
      <path d="M8 168c40-10 80-14 112-12s70 8 112 4" fill="none" stroke="#2C7A1E" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 182c50-6 100-8 150-4" fill="none" stroke="#8CBF26" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
