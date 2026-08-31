"use client";

import Link from "next/link";
import HeaderAnmeldung from "@/components/layout/HeaderAnmeldung";
import StartseitenLink from "@/components/layout/StartseitenLink";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { Menu, Phone, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import Wordmark from "@/components/layout/Wordmark";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/lib/content";
import { useCart } from "@/lib/cart-store";
import { scrollToId } from "@/lib/scroll";
import { cn, telHref } from "@/lib/utils";
import { siteConfig } from "@/site.config";
import { istPasswortschutz } from "@/lib/passwortschutz";
/*
 * Solange der Passwortschutz aktiv ist, lädt die Navigation nichts auf
 * Vorrat (kein Prefetch), damit vor der Anmeldung keine Inhalte im
 * Client landen. Bei PASSWORD_PROTECT=false gilt das normale Verhalten.
 */
const navPrefetch = istPasswortschutz ? false : undefined;


/**
 * Sticky Header: verkleinert sich beim Scrollen leicht und bekommt
 * einen geblurten Hintergrund. Anker-Navigation mit sanftem Scrollen.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const cartCount = useCart().length;

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menü mit Escape schließen
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  /**
   * Anker (beginnen mit "/#") werden auf der Startseite sanft gescrollt,
   * von Unterseiten aus übernimmt die normale Navigation zur Startseite.
   */
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false);
    if (href.startsWith("/#") && pathname === "/") {
      e.preventDefault();
      scrollToId(href.slice(2));
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || menuOpen
          ? "border-b border-line/70 bg-background/80 shadow-soft backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div
        className={cn(
          "container-page flex items-center justify-between transition-all duration-300",
          scrolled ? "py-3" : "py-5"
        )}
      >
        {/* Logo: zentrales Verhalten aus StartseitenLink (oben scrollen
            bzw. zur Startseite), identisch mit dem Footer */}
        <StartseitenLink
          onNavigate={() => setMenuOpen(false)}
          className="cursor-pointer rounded-md text-[1.22rem] leading-none"
        >
          <Wordmark />
        </StartseitenLink>

        <nav aria-label="Bereiche dieser Seite" className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link prefetch={navPrefetch}
              key={item.href}
              href={item.href}
              onClick={(e) => handleNav(e, item.href)}
              className="rounded-md text-[0.95rem] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Reihenfolge: Navigation, Anmelden, Telefon, Jetzt starten */}
        <div className="hidden items-center gap-4 lg:flex">
          {/* Warenkorb erscheint erst, wenn etwas im Wunsch-Paket liegt */}
          {cartCount > 0 ? (
            <Link prefetch={navPrefetch}
              href="/wunsch-paket"
              aria-label={`Zum Wunsch-Paket, ${cartCount} ${cartCount === 1 ? "Eintrag" : "Einträge"}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-tint"
            >
              <ShoppingBag size={19} strokeWidth={1.6} />
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-deep px-1 text-[0.68rem] font-semibold tabular-nums text-background"
              >
                {cartCount}
              </span>
            </Link>
          ) : null}
          {/* Login-Zustand: Anmelden oder Mein Bereich mit kleinem Menü */}
          <HeaderAnmeldung variante="desktop" />
          <a
            href={telHref(siteConfig.contact.phone)}
            className="flex items-center gap-2 rounded-full border border-primary/25 px-4 py-2 text-[0.9rem] font-medium text-primary transition-colors hover:border-primary/60 hover:bg-surface-tint"
          >
            <Phone size={15} strokeWidth={1.8} />
            <span className="tabular-nums">{siteConfig.contact.phone}</span>
          </a>
          {/* Führt zu den Paketen: auf der Startseite sanft gescrollt */}
          <Link
            prefetch={navPrefetch}
            href="/#pakete"
            onClick={(e) => handleNav(e, "/#pakete")}
            className="btn-primary !px-6 !py-2.5 text-[0.92rem]"
          >
            Jetzt starten
          </Link>
        </div>

        {/* Mobil: runder Telefon-Button plus Menü, damit nichts überläuft */}
        <div className="flex items-center gap-2 lg:hidden">
          {cartCount > 0 ? (
            <Link prefetch={navPrefetch}
              href="/wunsch-paket"
              aria-label={`Zum Wunsch-Paket, ${cartCount} ${cartCount === 1 ? "Eintrag" : "Einträge"}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-tint"
            >
              <ShoppingBag size={19} strokeWidth={1.6} />
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-deep px-1 text-[0.68rem] font-semibold tabular-nums text-background"
              >
                {cartCount}
              </span>
            </Link>
          ) : null}
          <a
            href={telHref(siteConfig.contact.phone)}
            aria-label={`Anrufen unter ${siteConfig.contact.phone}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 text-primary transition-colors hover:bg-surface-tint"
          >
            <Phone size={18} strokeWidth={1.6} />
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X strokeWidth={1.5} /> : <Menu strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobiles Menü */}
      <AnimatePresence>
        {menuOpen ? (
          <m.nav
            id="mobile-menu"
            aria-label="Bereiche dieser Seite"
            className="lg:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="container-page flex flex-col gap-1 overflow-hidden pb-6 pt-1">
              {/* Login-Zustand ganz oben im mobilen Menü */}
              <HeaderAnmeldung
                variante="mobil"
                aufNavigation={() => setMenuOpen(false)}
              />
              <span aria-hidden="true" className="mx-3 my-1 h-px bg-line/70" />
              {NAV_ITEMS.map((item) => (
                <Link prefetch={navPrefetch}
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNav(e, item.href)}
                  className="rounded-xl px-3 py-3 text-[1.05rem] font-medium text-ink transition-colors hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
              {SECONDARY_NAV_ITEMS.map((item) => (
                <Link prefetch={navPrefetch}
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-[1.05rem] font-medium text-ink transition-colors hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                prefetch={navPrefetch}
                href="/#pakete"
                className="btn-primary mt-3 w-full"
                onClick={(e) => handleNav(e, "/#pakete")}
              >
                Jetzt starten
              </Link>
            </div>
          </m.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
