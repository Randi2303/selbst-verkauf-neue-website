"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { navPrefetch } from "@/lib/passwortschutz";

/**
 * Zentrales Klickverhalten der Wortmarke (Header und Footer, eine
 * Logik statt Kopien): Auf der Startseite scrollt der Klick sanft ganz
 * nach oben (bei reduzierter Bewegung sofort), auf jeder anderen Seite
 * führt er zur Startseite, die dann oben beginnt.
 */
export default function StartseitenLink({
  children,
  className,
  onNavigate,
}: {
  children: ReactNode;
  className?: string;
  /** Zusatz-Aufräumen des Aufrufers, z. B. mobiles Menü schließen */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <Link
      prefetch={navPrefetch}
      href="/"
      onClick={(e) => {
        onNavigate?.();
        if (pathname === "/") {
          e.preventDefault();
          /*
           * Einen stehengebliebenen Anker (z. B. /#pakete) aus der
           * Adresse räumen: replaceState MIT dem bestehenden
           * history.state, damit der interne Router-Zustand von Next
           * erhalten bleibt (state: null würde ihn zerstören).
           */
          if (window.location.hash) {
            window.history.replaceState(
              window.history.state,
              "",
              window.location.pathname + window.location.search
            );
          }
          if (window.__lenis && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            window.__lenis.scrollTo(0, { duration: 1.2 });
          } else {
            window.scrollTo({ top: 0, behavior: "auto" });
          }
        }
      }}
      className={className}
      aria-label="selbst-verkauf.de, zur Startseite"
    >
      {children}
    </Link>
  );
}
