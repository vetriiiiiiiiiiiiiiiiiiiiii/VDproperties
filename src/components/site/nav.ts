export type NavItem = { label: string; href: string; children?: { label: string; href: string; note?: string }[] };

export const NAV: NavItem[] = [
  {
    label: "Buy",
    href: "/properties",
    children: [
      { label: "All properties", href: "/properties", note: "Search every listing" },
      { label: "Residential plots & land", href: "/plots", note: "Plots, parcels and layouts" },
      { label: "Houses & villas", href: "/houses", note: "Completed homes" },
      { label: "Ongoing projects", href: "/projects/ongoing", note: "Developments in progress" },
      { label: "Completed projects", href: "/projects/completed", note: "Delivered developments" },
    ],
  },
  { label: "PlotFit", href: "/plotfit" },
  { label: "Property Twin", href: "/twin" },
  { label: "Property Studio", href: "/studio" },
  {
    label: "Build",
    href: "/construction",
    children: [
      { label: "Construction services", href: "/construction", note: "Build a home with us" },
      { label: "BuildTrace", href: "/buildtrace", note: "Track an agreed construction project" },
    ],
  },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
