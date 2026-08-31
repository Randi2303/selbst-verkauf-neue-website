"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";

/**
 * Ehrliche Fehlerseite: Wenn eine Abfrage scheitert, steht hier, dass
 * etwas schiefging, NICHT dass die Seite nicht existiert. Der
 * technische Fehler bleibt im Server-Log, der Nutzer bekommt einen
 * verständlichen Satz und einen Weg zurück.
 */
export default function Fehlerseite({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page py-6">
        <Link
          href="/"
          className="inline-block rounded-md text-[1.22rem]"
          aria-label="selbst-verkauf.de, zur Startseite"
        >
          <Wordmark />
        </Link>
      </header>

      <main
        id="inhalt"
        className="flex flex-1 items-center justify-center px-5 py-12"
      >
        <div className="w-full max-w-xl rounded-4xl border border-line/70 bg-paper p-8 text-center shadow-card sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tint text-primary">
            <TriangleAlert size={24} strokeWidth={1.5} />
          </span>
          <p className="mt-6 eyebrow">Etwas ist schiefgelaufen</p>
          <h1 className="mt-3 font-heading text-h2 opsz-display text-ink">
            Diese Angaben konnten wir gerade nicht laden.
          </h1>
          <p className="mt-4 leading-relaxed text-ink-muted">
            Die Seite gibt es, nur die Daten dahinter sind im Moment nicht
            erreichbar. Meist hilft ein zweiter Versuch. Bleibt es dabei,
            melden Sie sich gern bei uns, wir sehen dann direkt nach.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={reset} className="btn-primary">
              Erneut versuchen
            </button>
            <Link href="/" className="btn-secondary">
              Zur Startseite
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
