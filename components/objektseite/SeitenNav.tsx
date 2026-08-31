"use client";

import { Printer } from "lucide-react";

/**
 * Die mitlaufende Leiste der Objektseite: Sprungmarken zu den
 * Abschnitten plus Drucken. Bleibt beim Rollen oben haengen und
 * verschwindet im Ausdruck (print:hidden).
 */
export default function SeitenNav({
  marken,
}: {
  marken: { id: string; label: string }[];
}) {
  if (marken.length === 0) return null;
  return (
    <nav
      aria-label="Abschnitte dieser Seite"
      className="sticky top-0 z-40 -mx-4 border-b border-line/60 bg-background/90 px-4 backdrop-blur print:hidden sm:-mx-6 sm:px-6"
    >
      <div className="flex items-center gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {marken.map((m) => (
          <a
            key={m.id}
            href={`#${m.id}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-[0.85rem] text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {m.label}
          </a>
        ))}
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.85rem] text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Printer size={14} strokeWidth={1.9} />
          Drucken
        </button>
      </div>
    </nav>
  );
}
