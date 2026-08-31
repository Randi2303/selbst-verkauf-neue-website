import Link from "next/link";
import { Compass } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";

/** Gestaltete 404-Seite im Ton der Marke */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page py-6">
        <Link href="/" className="inline-block rounded-md text-[1.22rem]" aria-label="selbst-verkauf.de, zur Startseite">
          <Wordmark />
        </Link>
      </header>

      <main id="inhalt" className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-xl rounded-4xl border border-line/70 bg-paper p-8 text-center shadow-card sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tint text-primary">
            <Compass size={24} strokeWidth={1.5} />
          </span>
          <p className="mt-6 eyebrow">Fehler 404</p>
          <h1 className="mt-3 font-heading text-h2 opsz-display text-ink">
            Diese Seite gibt es nicht.
            <span className="block">
              Ihr Verkauf <span className="text-accent">zum Glück</span> schon.
            </span>
          </h1>
          <p className="mt-4 leading-relaxed text-ink-muted">
            Die Adresse führt ins Leere, vielleicht ist sie veraltet oder
            vertippt. Auf der Startseite finden Sie alles Wichtige wieder.
          </p>
          <div className="mt-8">
            <Link href="/" className="btn-primary">
              Zur Startseite
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
