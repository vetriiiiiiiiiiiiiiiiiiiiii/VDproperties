"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavLink = { href: string; label: string; badge?: number };

export function AdminNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <>
      <button type="button" className="mb-2 w-full border border-ivory/30 px-3 py-2 text-left text-sm lg:hidden" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
        Menu
      </button>
      <nav id="admin-nav" aria-label="Admin" className={`${open ? "block" : "hidden"} lg:block`}>
        <ul className="space-y-0.5">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-sm ${active(l.href) ? "bg-ivory/12 font-semibold text-ivory" : "text-ivory/75 hover:bg-ivory/8 hover:text-ivory"}`}
              >
                {l.label}
                {l.badge ? <span className="min-w-6 bg-gold px-1.5 text-center text-xs font-bold text-ink">{l.badge}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
