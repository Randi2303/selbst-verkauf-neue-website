import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";

export const metadata: Metadata = {
  title: "Datenschutz | selbst-verkauf.de",
  description:
    "Datenschutzerklärung von selbst-verkauf.de. Die Angaben werden vor Veröffentlichung ergänzt.",
  robots: { index: false, follow: false },
};

/** Platzhalter, wird vor Veröffentlichung ergänzt */
export default function DatenschutzPage() {
  return (
    <div className="min-h-dvh">
      <header className="container-page py-6">
        <Link href="/" className="inline-block rounded-md text-[1.22rem]" aria-label="selbst-verkauf.de, zur Startseite">
          <Wordmark />
        </Link>
      </header>
      <main id="inhalt" className="container-page max-w-3xl pb-24 pt-10">
        <h1 className="font-heading text-h2 opsz-display text-ink">Datenschutz</h1>
        <div className="mt-8 rounded-3xl border border-line/70 bg-paper p-8 shadow-soft">
          <p className="font-medium">Wird vor Veröffentlichung ergänzt.</p>
          <p className="mt-3 leading-relaxed text-ink-muted">
            Die vollständige Datenschutzerklärung folgt vor dem öffentlichen
            Start der Seite. Schon jetzt gilt: Der Live-Chat (Crisp) lädt erst,
            wenn Sie ihn aktiv anklicken. Vorher werden keine Daten an den
            Chat-Anbieter übertragen. Es laufen keine Tracking- oder
            Werbe-Skripte beim Seitenaufruf.
          </p>
        </div>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-md text-[0.95rem] font-medium text-primary transition-colors hover:text-primary-dark"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          Zurück zur Startseite
        </Link>
      </main>
    </div>
  );
}
