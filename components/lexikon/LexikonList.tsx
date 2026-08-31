"use client";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LEXIKON_TERMS, lexikonLetter } from "@/lib/lexikon";
import { scrollToId } from "@/lib/scroll";
import { cn } from "@/lib/utils";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Lexikon-Liste mit Live-Suche und A-Z-Sprungleiste.
 * Die Suche filtert clientseitig über Begriff und Erklärtext.
 */
export default function LexikonList() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEXIKON_TERMS;
    return LEXIKON_TERMS.filter(
      (term) =>
        term.begriff.toLowerCase().includes(q) || term.text.toLowerCase().includes(q)
    );
  }, [query]);

  // Nach Anfangsbuchstaben gruppieren (Umlaute wie Grundbuchstaben)
  const groups = useMemo(() => {
    const map = new Map<string, typeof LEXIKON_TERMS>();
    for (const term of filtered) {
      const letter = lexikonLetter(term.begriff);
      map.set(letter, [...(map.get(letter) ?? []), term]);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      {/* Suche */}
      <div className="relative max-w-xl">
        <label htmlFor="lexikon-suche" className="sr-only">
          Begriff suchen
        </label>
        <Search
          size={18}
          strokeWidth={1.8}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id="lexikon-suche"
          type="search"
          placeholder="Begriff, etwa Grundbuch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-line bg-paper py-3.5 pl-12 pr-5 text-[0.98rem] placeholder:text-ink-muted/70 shadow-soft"
        />
      </div>

      {/* A-Z-Sprungleiste */}
      <nav aria-label="Alphabetische Sprungleiste" className="mt-8">
        <ul className="flex flex-wrap gap-1.5">
          {ALPHABET.map((letter) => {
            const hasTerms = groups.has(letter);
            return (
              <li key={letter}>
                <button
                  type="button"
                  disabled={!hasTerms}
                  onClick={() => scrollToId(`lexikon-${letter}`)}
                  aria-label={
                    hasTerms ? `Zu Begriffen mit ${letter} springen` : `Keine Begriffe mit ${letter}`
                  }
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] font-semibold transition-colors",
                    hasTerms
                      ? "bg-paper text-primary shadow-soft hover:bg-surface-tint"
                      : "cursor-default text-ink-muted/35"
                  )}
                >
                  {letter}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Begriffe */}
      {filtered.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-line/70 bg-paper p-8 text-center shadow-soft">
          <p className="font-medium">Dazu haben wir noch keinen Eintrag.</p>
          <p className="mt-2 text-[0.95rem] text-ink-muted">
            Fragen Sie uns gern im Chat, wir ergänzen das Lexikon laufend.
          </p>
          <button type="button" onClick={() => setQuery("")} className="btn-secondary mt-6 !px-5 !py-2.5 text-[0.9rem]">
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {[...groups.entries()].map(([letter, terms]) => (
            <section key={letter} id={`lexikon-${letter}`} className="scroll-mt-28 pt-8">
              <p aria-hidden="true" className="font-heading text-[1.6rem] font-semibold text-accent-deep">
                {letter}
              </p>
              <div className="mt-3 space-y-4">
                {terms.map((term) => (
                  <article
                    key={term.begriff}
                    className="rounded-3xl border border-line/70 bg-paper p-6 shadow-soft sm:p-7"
                  >
                    <h2 className="font-heading text-[1.25rem] font-semibold tracking-[-0.01em]">
                      {term.begriff}
                    </h2>
                    <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-ink-muted">
                      {term.text}
                    </p>
                    {term.link ? (
                      <p className="mt-3">
                        {term.link.extern ? (
                          <a
                            href={term.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md text-[0.9rem] font-medium text-primary transition-colors hover:text-primary-dark"
                          >
                            {term.link.label}
                            <ExternalLink size={13} strokeWidth={1.8} aria-hidden="true" />
                            <span className="sr-only">(öffnet eine externe Seite in neuem Fenster)</span>
                          </a>
                        ) : (
                          <Link
                            href={term.link.href}
                            className="inline-flex items-center gap-1.5 rounded-md text-[0.9rem] font-medium text-primary transition-colors hover:text-primary-dark"
                          >
                            {term.link.label}
                          </Link>
                        )}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
