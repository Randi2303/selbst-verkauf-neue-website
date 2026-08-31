import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Hourglass } from "lucide-react";
import WaitlistForm from "@/components/forms/WaitlistForm";
import Wordmark from "@/components/layout/Wordmark";

export const metadata: Metadata = {
  title: "Bald verfügbar | selbst-verkauf.de",
  description:
    "Der Bereich zum Anlegen Ihrer Immobilie startet in Kürze. Tragen Sie sich in die Warteliste ein, wir melden uns zum Start.",
  robots: { index: false, follow: false },
};

/**
 * Platzhalter-Route für alle CTA-Buttons. Der eigentliche Login-Bereich
 * wird separat gebaut und ersetzt diese Seite später.
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page py-6">
        <Link href="/" className="inline-block rounded-md text-[1.22rem]" aria-label="selbst-verkauf.de, zur Startseite">
          <Wordmark />
        </Link>
      </header>

      <main
      id="inhalt" className="flex flex-1 items-center justify-center px-5 py-12"
      /* SCHRIFT DER ANWENDUNG (Runde 37, Freigabe des Inhabers vom
         29.08.2026: die Zwischenseiten kommen mit). Diese Seite steht
         unter oeffentlicher Adresse, gehoert aber zur Anwendung.
         Erklaerung der Regel in app/globals.css. */
      data-bereich="anwendung"
    >
        <div className="w-full max-w-lg rounded-4xl border border-line/70 bg-paper p-8 text-center shadow-card sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tint text-primary">
            <Hourglass size={24} strokeWidth={1.5} />
          </span>
          <h1 className="mt-6 font-heading text-h2 opsz-display text-ink">Bald verfügbar</h1>
          <p className="mt-4 leading-relaxed text-ink-muted">
            Hier entsteht gerade der Bereich, in dem Sie Ihre Immobilie anlegen
            und Schritt für Schritt verkaufen. Tragen Sie sich ein, wir melden
            uns, sobald es losgeht.
          </p>

          <div className="mt-8">
            <WaitlistForm />
          </div>
          <p className="mt-3 text-[0.8rem] text-ink-muted">
            Wir verwenden Ihre E-Mail-Adresse nur für die Benachrichtigung zum Start.
          </p>

          {/* Hinweis für Bestandskunden, der Anmelde-Weg läuft über /login */}
          <p className="mt-6 rounded-2xl bg-surface-tint px-5 py-3.5 text-[0.88rem] leading-relaxed text-ink">
            Sie haben schon ein Konto?{" "}
            <Link href="/login" className="font-medium text-primary transition-colors hover:text-primary-dark">
              Zur Anmeldung
            </Link>
            .
          </p>

          <Link
            href="/"
            className="mt-9 inline-flex items-center gap-2 rounded-md text-[0.95rem] font-medium text-primary transition-colors hover:text-primary-dark"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            Zurück zur Startseite
          </Link>
        </div>
      </main>

      <footer className="container-page flex justify-center gap-6 py-8 text-[0.85rem] text-ink-muted">
        <Link href="/impressum" className="rounded-md transition-colors hover:text-ink">
          Impressum
        </Link>
        <Link href="/datenschutz" className="rounded-md transition-colors hover:text-ink">
          Datenschutz
        </Link>
      </footer>
    </div>
  );
}
