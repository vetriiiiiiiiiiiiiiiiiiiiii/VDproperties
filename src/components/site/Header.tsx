"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { splitLocale } from "@/i18n/config";
import Link from "@/i18n/Link";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";
import { buildNav } from "./nav";

type Account = { href: string; kind: "signin" | "account" | "admin" };

export function Header({ account }: { account: Account }) {
  const { t } = useI18n();
  const NAV = buildNav(t);
  const rawPath = usePathname();
  const pathname = splitLocale(rawPath).path;
  const [compact, setCompact] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [blob, setBlob] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const navRef = useRef<HTMLUListElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const accountLabel = account.kind === "signin" ? t.signIn : account.kind === "admin" ? t.admin : t.myAccount;

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDrawer(false);
    setOpenMenu(null);
  }, [rawPath]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Gooey indicator rests on the active item, and flows to whichever item the pointer is on.
  const moveTo = (el: HTMLElement | null) => {
    const list = navRef.current;
    if (!el || !list) return;
    const a = el.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    setBlob({ x: a.left - b.left, w: a.width, on: true });
  };
  const rest = () => {
    const active = navRef.current?.querySelector<HTMLElement>("[data-active='true']");
    if (active) moveTo(active);
    else setBlob((s) => ({ ...s, on: false }));
  };
  useEffect(() => {
    const id = requestAnimationFrame(rest);
    window.addEventListener("resize", rest);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", rest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, compact]);

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

  const itemClass = (active: boolean) => `relative z-10 flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.875rem] font-medium transition-colors duration-300 ${active ? "text-forest" : "text-ink/80 hover:text-ink"}`;

  return (
    <header className={`sticky top-0 z-40 transition-[padding] duration-500 ${compact ? "pt-2" : "pt-3 lg:pt-4"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory">
        {t.skip}
      </a>
      <div className="wrap">
        <div className={`glass flex items-center justify-between gap-4 rounded-full pl-3 pr-2 transition-[padding,box-shadow] duration-500 ${compact ? "py-1.5" : "py-2"}`}>
          <Link href="/" aria-label={t.homeLabel} className="shrink-0 rounded-full">
            <Logo compact />
          </Link>

          <nav aria-label={t.mainNav} className="hidden xl:block" onMouseLeave={rest}>
            <div className="relative">
              {/* Liquid indicator: two blobs merged by the goo filter stretch as they travel */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ filter: "url(#vd-goo)" }}>
                <span className="absolute top-1/2 h-9 -translate-y-1/2 rounded-full bg-white shadow-[0_6px_18px_-8px_rgba(10,52,104,0.45)] transition-all duration-300 ease-out" style={{ left: blob.x, width: blob.w, opacity: blob.on ? 1 : 0 }} />
                <span className="absolute top-1/2 h-7 -translate-y-1/2 rounded-full bg-white transition-all duration-700 ease-[cubic-bezier(.2,1.4,.4,1)]" style={{ left: blob.x + blob.w * 0.15, width: blob.w * 0.7, opacity: blob.on ? 1 : 0 }} />
              </div>
              <ul ref={navRef} className="relative flex items-center">
                {NAV.map((item) => {
                  const active = item.children ? item.children.some((c) => isActive(c.href)) : isActive(item.href);
                  return item.children ? (
                    <li key={item.key} className="relative" data-menu>
                      <button
                        type="button"
                        data-active={active}
                        aria-expanded={openMenu === item.key}
                        aria-controls={`menu-${item.key}`}
                        onMouseEnter={(e) => moveTo(e.currentTarget)}
                        onFocus={(e) => moveTo(e.currentTarget)}
                        onClick={() => setOpenMenu(openMenu === item.key ? null : item.key)}
                        className={itemClass(active)}
                      >
                        {item.label}
                        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" className={`transition-transform duration-300 ${openMenu === item.key ? "rotate-180" : ""}`}>
                          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      </button>
                      <ul id={`menu-${item.key}`} hidden={openMenu !== item.key} className="glass absolute left-0 top-full mt-3 w-80 rounded-[1.5rem] p-2">
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link href={c.href} className="block rounded-2xl px-4 py-3 transition-colors hover:bg-white/70" aria-current={pathname === c.href ? "page" : undefined}>
                              <span className="block font-semibold text-ink">{c.label}</span>
                              {c.note && <span className="block text-sm text-slate">{c.note}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        data-active={active}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={(e) => moveTo(e.currentTarget)}
                        onFocus={(e) => moveTo(e.currentTarget)}
                        className={itemClass(active)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitch />
            </div>
            <Link href={account.href} className="hidden rounded-full px-3 py-2 text-sm font-semibold text-navy hover:bg-white/60 lg:inline-block">
              {accountLabel}
            </Link>
            <Link href="/contact#enquire" className="btn btn-primary hidden min-h-10 py-2 sm:inline-flex">
              {t.enquireNow}
            </Link>
            <button
              ref={toggleRef}
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/70 xl:hidden"
              aria-expanded={drawer}
              aria-controls="mobile-nav"
              aria-label={drawer ? t.closeMenu : t.openMenu}
              onClick={() => setDrawer((d) => !d)}
            >
              <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
                <path d="M0 1h18M0 6h18M0 11h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label={t.siteMenu}>
          <button type="button" aria-hidden="true" tabIndex={-1} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <div ref={drawerRef} id="mobile-nav" className="absolute inset-y-2 right-2 flex w-[min(24rem,calc(100vw-1rem))] flex-col overflow-y-auto rounded-[1.25rem] bg-forest text-ivory shadow-2xl">
            <div className="relative flex items-center justify-between px-5 py-4">
              <LanguageSwitch dark />
              <button type="button" onClick={() => setDrawer(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ivory/10" aria-label={t.closeMenu}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav aria-label={t.mainNav} className="relative flex-1 px-6 py-4">
              <ul className="space-y-5">
                <li>
                  <Link href="/" className="font-serif text-2xl">{t.homeNav}</Link>
                </li>
                {NAV.map((item) => (
                  <li key={item.key}>
                    {item.children ? (
                      <>
                        <span className="annot-plain text-gold-light">{item.label}</span>
                        <ul className="mt-2 space-y-1.5 border-l border-ivory/20 pl-4">
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
                  <Link href="/faqs" className="font-serif text-2xl">{t.faqs}</Link>
                </li>
              </ul>
            </nav>
            <div className="relative space-y-3 p-5">
              <Link href="/contact#enquire" className="btn btn-gold w-full">{t.enquireNow}</Link>
              <Link href={account.href} className="btn w-full bg-ivory/10 text-ivory">{accountLabel}</Link>
              <Link href="/site-visit" className="btn w-full bg-ivory/10 text-ivory">{t.requestVisit}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
