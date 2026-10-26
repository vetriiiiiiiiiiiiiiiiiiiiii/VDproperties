/**
 * Shared SVG filter: a gooey metaball merge used by the navigation indicator and journey route. Rendered once per page, zero-size.
 */
export function LiquidDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }} focusable="false">
      <defs>
        <filter id="vd-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
