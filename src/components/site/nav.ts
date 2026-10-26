import type { Dict } from "@/i18n/dict";

export type NavItem = { key: string; label: string; href: string; children?: { label: string; href: string; note?: string }[] };

export function buildNav(t: Dict): NavItem[] {
  const n = t.nav;
  return [
    {
      key: "buy",
      label: n.buy,
      href: "/properties",
      children: [
        { label: n.allProperties, href: "/properties", note: n.allPropertiesNote },
        { label: n.plots, href: "/plots", note: n.plotsNote },
        { label: n.houses, href: "/houses", note: n.housesNote },
        { label: n.ongoing, href: "/projects/ongoing", note: n.ongoingNote },
        { label: n.completed, href: "/projects/completed", note: n.completedNote },
      ],
    },
    { key: "sell", label: n.sell, href: "/sell" },
    { key: "plotfit", label: n.plotfit, href: "/plotfit" },
    { key: "twin", label: n.twin, href: "/twin" },
    { key: "studio", label: n.studio, href: "/studio" },
    {
      key: "build",
      label: n.build,
      href: "/construction",
      children: [
        { label: n.construction, href: "/construction", note: n.constructionNote },
        { label: n.buildtrace, href: "/buildtrace", note: n.buildtraceNote },
      ],
    },
    { key: "about", label: n.about, href: "/about" },
    { key: "contact", label: n.contact, href: "/contact" },
  ];
}
