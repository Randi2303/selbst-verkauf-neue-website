"use client";

import { m } from "framer-motion";
import { ohneAblauf, useEinblendung } from "@/lib/einblenden";
import { Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TelefonRahmen } from "@/components/mockups/Geraete";

/*
 * Schritt 1 im Zeitstrahl: die Erfassung im Gespraech, als MOMENT.
 * Die Szene zeigt die echte Mechanik des Produkts: Die KI schlaegt
 * vor, der Kunde bestaetigt mit "Uebernehmen", nichts landet
 * ungeprueft in der Maske. Kopfzeile und Zusicherung sind die
 * Woerter aus components/konto/erfassung/ChatErfassung.tsx.
 *
 * DIE SZENE LAEUFT GENAU EINMAL (Inhaber-Auflage): beim ersten
 * Sichtbarwerden baut sie sich auf, dann steht der Endzustand.
 *
 * DER AUFBAU KOMMT VON UNTEN (Inhaber, Feinschliff 24.08.2026, zweite
 * Ansage): Der Ausschnitt beginnt LEER und waechst wie ein echtes
 * Gespraech. Nichts ist vorher halb sichtbar, nichts rutscht
 * nachtraeglich an seinen Platz, und der Telefonrahmen aendert seine
 * Hoehe nie (die traegt das feste Seitenverhaeltnis in Geraete.tsx).
 * Technisch: Jede Zeile ist eine Rasterzeile, die von 0fr auf 1fr
 * waechst; die frueheren unsichtbar mitgezeichneten Blasen (opacity 0
 * im Fluss) waren der Grund fuer den angeschnittenen Anfang.
 *
 * DIE SCHREIB-ANDEUTUNG steht NUR vor einer Nachricht, die noch
 * kommt, und verschwindet mit ihr; am Ende des Gespraechs stehen
 * keine Punkte mehr (Inhaber, dieselbe Ansage). Einmal tippt die KI
 * vor ihrer Frage, einmal der Verkaeufer vor seiner Antwort.
 */

/**
 * Phasen: 0 leer, 1 die KI tippt, 2 Frage, 3 der Verkaeufer tippt,
 * 4 Antwort, 5 Vorschlags-Karte, 6 Haken gezeichnet und Uebernommen.
 */
const PHASEN_TAKT_MS = [600, 900, 700, 1100, 700, 800];

/** Die drei Punkte, dieselbe Klasse wie im Assistenten (Runde 19) */
function TippPunkte({ hell = false }: { hell?: boolean }) {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`typing-dot h-1.5 w-1.5 rounded-full ${hell ? "bg-background/80" : "bg-ink-muted"}`}
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Eine Gespraechszeile, die von unten in den Fluss waechst: Raster
 * von 0fr auf 1fr, dazu die Deckkraft. Der Abstand zur Zeile darueber
 * liegt IM Inhalt (pt), damit eine zusammengeklappte Zeile wirklich
 * nichts misst und auch keine Rasterluecke hinterlaesst.
 */
function Zeile({
  sichtbar,
  sofort,
  children,
}: {
  sichtbar: boolean;
  /** Ohne Uebergang, fuer reduzierte Bewegung */
  sofort: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        sofort
          ? "grid"
          : "grid transition-[grid-template-rows,opacity] duration-300 ease-out"
      }
      style={{ gridTemplateRows: sichtbar ? "1fr" : "0fr", opacity: sichtbar ? 1 : 0 }}
    >
      {/* justify-end: Die Blase steigt beim Wachsen von UNTEN auf,
          wie eine echte Nachricht, statt von oben abzurollen */}
      <div className="flex min-h-0 flex-col justify-end overflow-hidden">
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}

export default function ChatTelefon() {
  const ref = useRef<HTMLDivElement>(null);
  /* OHNE JAVASCRIPT STEHT DAS FERTIGE GESPRAECH (Runde 32): Die Phase
     kam frueher bei 0 zur Welt und wanderte erst nach dem Sichtkontakt
     weiter; im Server-HTML lagen damit fuenf Gespraechszeilen mit
     Rasterhoehe 0 und Deckkraft 0, und ohne JavaScript blieb der
     Ausschnitt fuer immer leer. In "ruhe" (Server, erster Aufbau,
     reduzierte Bewegung) steht deshalb die Endphase; erst nach dem
     Mount und nur ausserhalb des Blickfelds faengt die Szene bei null
     an, damit sie beim Hinsehen einmal ablaeuft. Siehe
     lib/einblenden.ts. */
  const zustand = useEinblendung(ref, "-15% 0px");
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (zustand !== "an" || phase >= PHASEN_TAKT_MS.length) return;
    const timer = setTimeout(() => setPhase((p) => p + 1), PHASEN_TAKT_MS[phase]);
    return () => clearTimeout(timer);
  }, [zustand, phase]);

  const p = ohneAblauf(zustand) ? PHASEN_TAKT_MS.length : phase;
  const sofort = ohneAblauf(zustand);

  return (
    <div ref={ref} aria-hidden="true" className="select-none">
      <TelefonRahmen>
        {/* Kopf des Gespraechs, Woerter aus dem Produkt */}
        <div className="mt-3 flex items-center gap-2.5 border-b border-line/60 px-[18px] pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-heading text-[13px] font-semibold text-background">
            s.
          </span>
          <span className="min-w-0">
            <span className="block text-[0.82rem] font-semibold">Erfassung im Gespräch</span>
            <span className="mt-0.5 block truncate text-[0.68rem] text-ink-muted">
              Alles Bestätigte steht sofort im Formular
            </span>
          </span>
        </div>

        {/* Der Gespraechsfluss: unten verankert, waechst nach oben */}
        <div className="flex flex-1 flex-col justify-end overflow-hidden px-3.5 pb-3.5 pt-1">
          {/* Die KI tippt ihre Frage */}
          <Zeile sichtbar={p === 1} sofort={sofort}>
            <span className="block w-fit rounded-2xl rounded-bl-md border border-line/60 bg-paper px-3.5 py-2 shadow-soft">
              <TippPunkte />
            </span>
          </Zeile>
          <Zeile sichtbar={p >= 2} sofort={sofort}>
            <span className="block w-fit max-w-[84%] rounded-2xl rounded-bl-md border border-line/60 bg-paper px-3.5 py-2 text-[0.84rem] leading-snug shadow-soft sm:py-2.5">
              Wie viele Zimmer hat Ihre Wohnung?
            </span>
          </Zeile>
          {/* Der Verkaeufer tippt seine Antwort */}
          <Zeile sichtbar={p === 3} sofort={sofort}>
            <span className="ml-auto block w-fit rounded-2xl rounded-br-md bg-primary px-3.5 py-2 shadow-soft">
              <TippPunkte hell />
            </span>
          </Zeile>
          <Zeile sichtbar={p >= 4} sofort={sofort}>
            <span className="ml-auto block w-fit max-w-[84%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[0.84rem] leading-snug text-background shadow-soft sm:py-2.5">
              3 Zimmer, 84 m², mit Balkon
            </span>
          </Zeile>
          <Zeile sichtbar={p >= 5} sofort={sofort}>
            <span className="block rounded-2xl border border-line/70 bg-paper p-3 shadow-soft sm:p-3.5">
              <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold">
                <Sparkles size={12} strokeWidth={1.6} className="text-accent-deep" />
                Vorschlag aus Ihren Worten
              </span>
              <span className="mt-2 flex items-center gap-2 text-[0.82rem]">
                {/* Der Haken zeichnet sich, wenn der Wert uebernommen ist */}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  className="text-success"
                >
                  <m.path
                    d="M4 12.5 9.5 18 20 6.5"
                    initial={false}
                    animate={{ pathLength: p >= 6 ? 1 : 0 }}
                    transition={sofort ? { duration: 0 } : { duration: 0.26, ease: "easeOut" }}
                  />
                </svg>
                <span className="text-ink-muted">Zimmer:</span>
                <span className="font-semibold">3</span>
                <m.span
                  className="ml-auto text-[0.68rem] text-ink-muted"
                  initial={false}
                  animate={{ opacity: p >= 6 ? 1 : 0 }}
                  transition={sofort ? { duration: 0 } : { duration: 0.3, delay: 0.15 }}
                >
                  Übernommen
                </m.span>
              </span>
              <span className="mt-2 block text-[0.82rem]">
                <span className="text-ink-muted">Wohnfläche:</span>{" "}
                <span className="font-semibold">84 m²</span>
              </span>
              {/* flex-wrap: bei 390 stiess "Verwerfen" sonst an die
                  Kartenkante und wurde angeschnitten */}
              <span className="mt-2 flex flex-wrap gap-2">
                {/* Knoepfe des echten Produkts, hier ohne Funktion und
                    deshalb als Flaechen, nicht als button */}
                <span className="inline-flex items-center rounded-full bg-primary px-[15px] py-1.5 text-[0.8rem] font-semibold text-background sm:py-2">
                  Übernehmen
                </span>
                <span className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[0.8rem] font-medium text-ink-muted sm:py-2">
                  Verwerfen
                </span>
              </span>
            </span>
          </Zeile>
        </div>

        {/* Die Eingabezeile gibt es erst ab sm: Auf dem kleinen Schirm
            schnitt sie die Frage-Blase oben an, und eine halbe Blase
            ist schlimmer als keine Eingabezeile */}
        <div className="hidden px-3.5 pb-4 sm:block">
          <div className="flex items-center justify-between rounded-full border border-line/70 bg-paper py-2.5 pl-4 pr-2 text-[0.8rem] text-ink-muted">
            Nachricht schreiben
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary text-background">
              <Plus size={12} strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </TelefonRahmen>
    </div>
  );
}
