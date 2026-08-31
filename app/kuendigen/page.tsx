import type { Metadata } from "next";
import KuendigungsFormular from "@/components/kuendigung/KuendigungsFormular";
import Wordmark from "@/components/layout/Wordmark";
import StartseitenLink from "@/components/layout/StartseitenLink";
import {
  KUENDIGUNG_SEITE_EINLEITUNG,
  KUENDIGUNG_SEITE_TITEL,
} from "@/config/vertragstexte";

/**
 * Die oeffentliche Kuendigungs-Stelle.
 *
 * OHNE ANMELDUNG, staendig verfuegbar, unmittelbar auffindbar (Link im
 * Fuss jeder Seite): So verlangt es das Gesetz fuer laufende
 * Vertraege, und eine Kuendigung nur im eingeloggten Bereich reicht
 * dafuer nicht. Der Weg im Konto bleibt daneben bestehen, er ist der
 * bequemere fuer Angemeldete.
 *
 * Bewusst ohne Kopf- und Fussmenue der Website: Die Seite hat genau
 * eine Aufgabe.
 */

export const metadata: Metadata = {
  title: `${KUENDIGUNG_SEITE_TITEL} | selbst-verkauf.de`,
  robots: { index: false, follow: false },
};

export default function KuendigenSeite() {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-7 px-5 py-10 sm:px-8 sm:py-14"
      /* SCHRIFT DER ANWENDUNG (Runde 37, Freigabe des Inhabers vom
         29.08.2026: die Zwischenseiten kommen mit). Diese Seite steht
         unter oeffentlicher Adresse, gehoert aber zur Anwendung.
         Erklaerung der Regel in app/globals.css. */
      data-bereich="anwendung"
    >
      <StartseitenLink className="inline-block self-start rounded-md">
        <Wordmark className="text-[1.1rem]" />
      </StartseitenLink>

      <div>
        <h1 className="text-balance font-heading text-h2 opsz-display text-ink">
          {KUENDIGUNG_SEITE_TITEL}
        </h1>
        <p className="mt-3 max-w-[62ch] text-pretty leading-relaxed text-ink-muted">
          {KUENDIGUNG_SEITE_EINLEITUNG}
        </p>
      </div>

      <KuendigungsFormular />
    </main>
  );
}
