"use client";

import { Film, Rotate3d } from "lucide-react";
import { useState } from "react";
import { webVerweis } from "@/lib/verweis";
import { einbettAdresse } from "@/lib/video-einbettung";

/**
 * Rundgang und Video auf der Objektseite, mit demselben Zwei-Klick-Weg
 * wie die Karte: Erst nach dem Klick lädt der Browser Inhalte des
 * fremden Anbieters, und der Satz darunter sagt vorher, was dabei
 * passiert.
 *
 * EINE KOMPONENTE FÜR BEIDES (Runde 20). Sie hieß RundgangEinbettung
 * und war bis auf drei Wörter genau das, was das Video auch braucht.
 * Eine zweite Kopie daneben wäre der Anfang des nächsten
 * Auseinanderlaufens: Wer den Zwei-Klick-Satz einmal ändert, ändert
 * ihn dann an einer von zwei Stellen.
 *
 * DER RÜCKFALL IST EIN KNOPF, KEIN LEERES RECHTECK. Beim Video kennen
 * wir nicht jeden Anbieter (lib/video-einbettung.ts). Erkennen wir
 * keinen, wird nichts eingebettet, sondern in einem neuen Fenster
 * geöffnet. Ein geratener Rahmen wäre ein schwarzes Feld auf der
 * Objektseite eines Kunden.
 *
 * UND ZUERST WIRD GEPRÜFT, OB DER VERWEIS ÜBERHAUPT EINER IST.
 * Beide Spalten sind vom Kunden beschreibbar (config/schreibrechte.ts),
 * und diese Seite ist öffentlich. Ein `javascript:`-Wert wäre hier
 * fremder Kode für jeden Besucher, sowohl als iframe-Quelle als auch
 * als Ziel eines Links. lib/verweis.ts lässt nur http und https durch;
 * alles andere lässt den Block ganz verschwinden.
 */

const SORTEN = {
  rundgang: {
    sinnbild: Rotate3d,
    titel: "360-Grad-Rundgang durch das Objekt",
    knopf: "Rundgang starten",
    /* Immer einbetten: Rundgang-Anbieter liefern von sich aus eine
       Einbett-Adresse, und der Auftrag hinterlegt genau die. */
    einbetten: (link: string) => link,
    hinweis:
      "Beim Starten werden Inhalte des Rundgang-Anbieters geladen; dabei erhält der Anbieter Ihre IP-Adresse.",
    neuesFenster: "Rundgang in neuem Fenster öffnen",
  },
  film: {
    sinnbild: Film,
    titel: "Video zum Objekt",
    knopf: "Video ansehen",
    einbetten: einbettAdresse,
    hinweis:
      "Beim Starten werden Inhalte des Video-Anbieters geladen; dabei erhält der Anbieter Ihre IP-Adresse.",
    neuesFenster: "Video in neuem Fenster öffnen",
  },
} as const;

export type MedienSorte = keyof typeof SORTEN;

export default function MedienEinbettung({
  link,
  sorte,
}: {
  link: string;
  sorte: MedienSorte;
}) {
  const [aktiv, setAktiv] = useState(false);
  const s = SORTEN[sorte];
  const Sinnbild = s.sinnbild;
  /* ERST DIE PRUEFUNG, DANN ALLES ANDERE: Was kein http- oder
     https-Verweis ist, wird nirgends ausgeliefert, weder im Rahmen
     noch als Link. */
  const sicher = webVerweis(link);
  const rahmenAdresse = sicher ? s.einbetten(sicher) : null;

  if (!sicher) return null;

  if (!aktiv || !rahmenAdresse) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line/70 bg-surface/60 px-6 py-12 text-center">
        <Sinnbild size={22} strokeWidth={1.7} className="text-primary" />
        <p className="text-[0.92rem] font-medium text-ink">{s.titel}</p>
        {rahmenAdresse ? (
          <button
            type="button"
            onClick={() => setAktiv(true)}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-medium text-background transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {s.knopf}
          </button>
        ) : (
          /* Kein erkannter Anbieter: öffnen statt einbetten. */
          <a
            href={sicher}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-medium text-background transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {s.neuesFenster}
          </a>
        )}
        <p className="max-w-sm text-[0.78rem] leading-relaxed text-ink-muted">
          {s.hinweis}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={rahmenAdresse}
        title={s.titel}
        allowFullScreen
        className="aspect-[16/10] w-full rounded-3xl border border-line/70 bg-surface"
      />
      <a
        href={sicher}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit text-[0.82rem] text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
      >
        {s.neuesFenster}
      </a>
    </div>
  );
}
