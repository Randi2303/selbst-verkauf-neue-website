import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";
import BrandName from "@/components/ui/BrandName";

export const metadata: Metadata = {
  title: "Impressum | selbst-verkauf.de",
  description: "Impressum von selbst-verkauf.de. Die Angaben werden vor Veröffentlichung ergänzt.",
  robots: { index: false, follow: false },
};

/** Platzhalter, wird vor Veröffentlichung ergänzt */
export default function ImpressumPage() {
  return (
    <div className="min-h-dvh">
      <header className="container-page py-6">
        <Link href="/" className="inline-block rounded-md text-[1.22rem]" aria-label="selbst-verkauf.de, zur Startseite">
          <Wordmark />
        </Link>
      </header>
      <main id="inhalt" className="container-page max-w-3xl pb-24 pt-10">
        <h1 className="font-heading text-h2 opsz-display text-ink">Impressum</h1>
        <div className="mt-8 rounded-3xl border border-line/70 bg-paper p-8 shadow-soft">
          <p className="font-medium">Wird vor Veröffentlichung ergänzt.</p>
          <p className="mt-3 leading-relaxed text-ink-muted">
            Angaben gemäß § 5 DDG, Anbieter, Anschrift, Vertretungsberechtigte
            und Kontaktdaten folgen vor dem öffentlichen Start der Seite.
          </p>
        </div>

        {/* Nachweise für alle Fremd-Assets, Details in LIZENZEN.md im Projekt */}
        <h2 className="mt-12 font-heading text-h3 text-ink">
          Bild-, Icon- und Schriftnachweise
        </h2>
        <div className="mt-5 rounded-3xl border border-line/70 bg-paper p-8 shadow-soft">
          <ul className="space-y-4 text-[0.95rem] leading-relaxed text-ink-muted">
            <li>
              <strong className="font-semibold text-ink">Icons:</strong> Lucide,{" "}
              <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" className="font-medium text-primary transition-colors hover:text-primary-dark">
                lucide.dev
              </a>
              , ISC-Lizenz.
            </li>
            <li>
              <strong className="font-semibold text-ink">Schriften:</strong>{" "}
              Fraunces und Inter, Google Fonts,{" "}
              <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary transition-colors hover:text-primary-dark">
                fonts.google.com
              </a>
              , SIL Open Font License 1.1. Beide Schriften werden lokal von
              unserem Server ausgeliefert, beim Seitenaufruf findet keine
              Verbindung zu Google statt.
            </li>
            <li>
              <strong className="font-semibold text-ink">Fotos:</strong>{" "}
              Einzelne Platzhalterfotos von Unsplash,{" "}
              <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary transition-colors hover:text-primary-dark">
                unsplash.com
              </a>
              , Unsplash-Lizenz.
            </li>
            <li>
              <strong className="font-semibold text-ink">Live-Chat:</strong>{" "}
              Crisp,{" "}
              <a href="https://crisp.chat" target="_blank" rel="noopener noreferrer" className="font-medium text-primary transition-colors hover:text-primary-dark">
                crisp.chat
              </a>
              . Das Chat-Widget mit den Assets des Anbieters lädt erst, wenn
              Sie den Chat aktiv anklicken.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Illustrationen und Produkt-Mockups:
              </strong>{" "}
              Eigene Darstellungen, © <BrandName />.
            </li>
          </ul>
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
