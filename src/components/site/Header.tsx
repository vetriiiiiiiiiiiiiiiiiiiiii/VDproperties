"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { NAV } from "./nav";

export function Header({ account }: { account: { href: string; label: string } }) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDrawer(false);
    setOpenMenu(null);
  }, [pathname]);

  // Drawer: lock scroll, close on Escape, keep focus inside.
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = drawerRef.current;
    panel?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>("a,button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    const onClick = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-menu]") && setOpenMenu(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [openMenu]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={`sticky top-0 z-40 border-b border-line/80 bg-ivory transition-[padding] duration-300 ${compact ? "py-2" : "py-3 lg:py-5"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <div className="wrap flex items-center justify-between gap-6">
        <Link href="/" aria-label="V D Properties home" className="shrink-0">
          <Logo compact={compact} />
        </Link>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {NAV.map((item) =>
              item.children ? (
                <li key={item.label} className="relative" data-menu>
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-controls={`menu-${item.label}`}
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 text-[0.9rem] font-medium hover:text-emerald ${item.children.some((c) => isActive(c.href)) ? "text-emerald" : "text-ink"}`}
                  >
                    {item.label}
                    <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" className={`transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}>
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </button>
                  <ul
                    id={`menu-${item.label}`}
                    hidden={openMenu !== item.label}
                    className="absolute left-0 top-full mt-2 w-72 border border-line bg-white p-2 shadow-[0_18px_40px_-20px_rgba(16,44,74,0.35)]"
                  >
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="block px-3 py-2.5 hover:bg-ivory" aria-current={pathname === c.href ? "page" : undefined}>
                          <span className="block font-medium text-ink">{c.label}</span>
                          {c.note && <span className="block text-sm text-slate">{c.note}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`block px-2.5 py-2 text-[0.9rem] font-medium hover:text-emerald ${isActive(item.href) ? "text-emerald" : "text-ink"}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href={account.href} className="hidden px-2 py-2 text-sm font-semibold text-navy hover:text-emerald sm:inline-block">
            {account.label}
          </Link>
          <Link href="/contact#enquire" className="btn btn-primary hidden min-h-11 sm:inline-flex">
            Enquire Now
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center border border-line xl:hidden"
            aria-expanded={drawer}
            aria-controls="mobile-nav"
            aria-label={drawer ? "Close menu" : "Open menu"}
            onClick={() => setDrawer((d) => !d)}
          >
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
              <path d="M0 1h20M0 7h20M0 13h12" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
          <button type="button" aria-hidden="true" tabIndex={-1} className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <div ref={drawerRef} id="mobile-nav" className="survey-grid absolute inset-y-0 right-0 flex w-[min(24rem,88vw)] flex-col overflow-y-auto bg-forest text-ivory">
            <div className="flex items-center justify-between border-b border-ivory/15 px-5 py-4">
              <span className="annot text-gold">Menu</span>
              <button type="button" onClick={() => setDrawer(false)} className="inline-flex h-11 w-11 items-center justify-center border border-ivory/30" aria-label="Close menu">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 px-5 py-6">
              <ul className="space-y-6">
                <li>
                  <Link href="/" className="font-serif text-2xl">Home</Link>
                </li>
                {NAV.map((item) => (
                  <li key={item.label}>
                    {item.children ? (
                      <>
                        <span className="annot-plain text-gold">{item.label}</span>
                        <ul className="mt-2 space-y-2 border-l border-ivory/20 pl-4">
                          {item.children.map((c) => (
                            <li key={c.href}>
                              <Link href={c.href} className="block py-1 font-serif text-xl">{c.label}</Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <Link href={item.href} className="font-serif text-2xl">{item.label}</Link>
                    )}
                  </li>
                ))}
                <li>
                  <Link href="/faqs" className="font-serif text-2xl">FAQs</Link>
                </li>
              </ul>
            </nav>
            <div className="border-t border-ivory/15 p-5">
              <Link href="/contact#enquire" className="btn btn-gold w-full">Enquire Now</Link>
              <Link href={account.href} className="btn btn-outline mt-3 w-full">{account.label}</Link>
              <Link href="/site-visit" className="btn btn-outline mt-3 w-full">Request a site visit</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
