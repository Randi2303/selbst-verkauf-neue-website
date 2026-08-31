"use client";

import { m, useInView } from "framer-motion";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";
import { Compass, HeartHandshake } from "lucide-react";
import { useRef } from "react";
import ZaehlZahl from "@/components/konto/ZaehlZahl";
import BrandName from "@/components/ui/BrandName";
import Reveal from "@/components/ui/Reveal";
import { ohneUmbruch } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * "Warum wir das machen" auf der Team-Seite.
 *
 * Der Abschnitt traegt das Vertrauen der ganzen Seite, deshalb bekommt
 * er einen eigenen Auftritt statt der ueblichen Karten-Reihe.
 *
 * Gestalterische Entscheidungen und ihr Grund:
 *
 * - GRUND: warmes Leinen (surface) statt des kuehlen Petrol-Tints. Der
 *   Tint fiel als einzige kalte Flaeche aus der Palette heraus. Kein
 *   Karten-Schatten, nur eine feine Kante: Das wirkt hochwertiger als
 *   ein weicher Kasten.
 * - GEGENUEBERSTELLUNG: EIN Feld, geteilt von einer Haarlinie, mit dem
 *   Wort "oder" darauf. Zwei getrennte Kaesten sind eine Aufzaehlung,
 *   die geteilte Flaeche ist eine Wahl. Genau darum geht es hier.
 * - TERRAKOTTA: bewusst nur an zwei Stellen, und beide Male
 *   strukturell, nicht schmueckend: das "oder" auf der Trennlinie und
 *   der kurze Strich vor dem Kernsatz.
 * - KERNSATZ: steht am Ende mit eigenem Raum. Er ist die Folgerung aus
 *   dem Abschnitt, nicht seine Ankuendigung.
 * - LINIENMOTIV: zwei Haeuser auf einer gemeinsamen Grundlinie,
 *   symmetrisch zur Trennlinie und vollstaendig im Feld. Vorher war es
 *   angeschnitten und wirkte wie versehentlich stehen geblieben.
 *   Es zeichnet sich einmal, wenn der Abschnitt ins Bild kommt: der
 *   eine gestaltete Moment des Abschnitts.
 */

/** Die zwei Wege, bewusst gleichwertig nebeneinander */
const WEGE = [
  {
    icon: Compass,
    titel: "Sie machen es selbst.",
    text: "Hier finden Sie alles für den ganzen Verkauf: von der Erfassung über die Bewertung bis zum Inserat auf den großen Portalen. Zu festen Konditionen, ohne Provision und ohne dass Ihnen jemand über die Schulter schaut.",
  },
  {
    icon: HeartHandshake,
    titel: "Sie holen Unterstützung dazu.",
    text: "Erfahrene Makler übernehmen einzelne Schritte oder begleiten den ganzen Weg. Sie entscheiden, was Sie buchen. Wer die Begleitung nicht braucht, bucht sie nicht und zahlt sie auch nicht.",
  },
];

/**
 * Linienmotiv am Fuss des Feldes: zwei Haeuser auf einer gemeinsamen
 * Grundlinie, mittig, klein gehalten und vollstaendig im Feld.
 *
 * Es liegt NICHT hinter dem Text, sondern in einem eigenen Streifen:
 * Das Feld hat unten so viel Innenabstand, dass das Motiv darunter
 * Platz hat. So kann es sich mit keiner Textlaenge und in keiner
 * Bildschirmbreite mit dem Kernsatz ueberschneiden.
 *
 * Die Reihenfolge der Pfade ist die Zeichen-Reihenfolge: erst der
 * Boden, dann das linke Haus, dann das rechte.
 */
const MOTIV_PFADE = [
  "M0 112H400",
  "M46 70 84 40l38 30",
  "M54 64v48",
  "M114 64v48",
  "M74 112V92h20v20",
  "M278 70 316 40l38 30",
  "M286 64v48",
  "M346 64v48",
  "M306 112V92h20v20",
];

function HausMotiv() {
  const halter = useRef<SVGSVGElement>(null);
  const imBild = useInView(halter, { once: true, margin: "-15% 0px -10% 0px" });
  /* Hydrationssicher (Runde 31): Der Zweig unten waehlt je nach
     Einstellung einen anderen Baum; der Haken meldet sie erst nach
     dem Mount. */
  const reduziert = nutztReduzierteBewegung();

  return (
    <svg
      ref={halter}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] w-full text-primary/[0.16] sm:h-[116px] md:h-[140px]"
      viewBox="0 0 400 130"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {MOTIV_PFADE.map((d, i) =>
        reduziert ? (
          <path key={d} d={d} />
        ) : (
          <m.path
            key={d}
            d={d}
            initial={false}
            animate={{ pathLength: imBild ? 1 : 0 }}
            transition={
              imBild
                ? { duration: 1.1, delay: 0.25 + i * 0.09, ease: [0.22, 0.61, 0.36, 1] }
                : { duration: 0 }
            }
          />
        )
      )}
    </svg>
  );
}

/**
 * Der Anker neben der Ueberschrift: die Zahl, um die es im ganzen
 * Abschnitt geht, gegen das gestellt, was wir stattdessen tun.
 *
 * Bewusst OHNE Euro-Betrag. Der Prozentsatz ist belegt (er steht als
 * uebliches Verkaeufer-Anteil in site.config.ts und wird auf der
 * Startseite genauso benannt), ein Beispielpreis waere dagegen
 * erfunden. Das Argument steckt ohnehin im Unterschied selbst: ein
 * Anteil waechst mit dem Verkaufspreis, ein Festpreis nicht.
 *
 * Die Karte ist zugleich die zweite Ebene im Abschnitt: Sie liegt
 * heller auf dem Leinen und nimmt dem Einstieg die Flaechigkeit.
 */
function ProvisionsAnker() {
  const prozent = siteConfig.commission.rate * 100;
  return (
    <div className="rounded-3xl border border-line bg-paper px-6 py-6 lg:w-[16.5rem]">
      <p className="text-[0.78rem] leading-snug text-ink-muted">
        Übliche Maklerprovision
      </p>
      <p className="mt-1 font-heading text-[2.6rem] font-semibold leading-none tracking-[-0.02em] text-accent-deep opsz-display">
        <ZaehlZahl
          wert={prozent}
          format={(n) =>
            ohneUmbruch(
              `${n.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} %`
            )
          }
        />
      </p>
      <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink-muted">
        Verkäuferanteil, gerechnet auf den Verkaufspreis
      </p>

      <span aria-hidden="true" className="my-5 block h-px bg-line" />

      <p className="text-[0.78rem] leading-snug text-ink-muted">
        Bei <BrandName />
      </p>
      <p className="mt-1 font-heading text-[1.5rem] font-semibold leading-tight tracking-[-0.015em] text-ink">
        Ein Festpreis
      </p>
      <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink-muted">
        Unabhängig davon, wie teuer Ihre Immobilie ist
      </p>
    </div>
  );
}

/** Einer der beiden Wege, ohne eigenen Kasten */
function Weg({
  icon: Icon,
  titel,
  text,
}: {
  icon: typeof Compass;
  titel: string;
  text: string;
}) {
  return (
    <div>
      <Icon size={20} strokeWidth={1.6} className="text-primary/70" aria-hidden="true" />
      <h3 className="mt-3.5 text-balance font-heading text-[1.08rem] font-semibold tracking-[-0.01em] text-ink">
        {titel}
      </h3>
      <p className="mt-2 max-w-[42ch] text-pretty text-[0.93rem] leading-relaxed text-ink-muted">
        {text}
      </p>
    </div>
  );
}

export default function WarumWirDasMachen() {
  return (
    <section className="container-page mt-14 md:mt-16">
      {/* Der grosse Innenabstand unten ist der Streifen fuer das
          Linienmotiv, siehe HausMotiv */}
      <div className="relative overflow-hidden rounded-4xl border border-line bg-surface px-6 pb-[7.5rem] pt-11 sm:px-10 sm:pb-[9rem] md:px-14 md:pb-[11rem] md:pt-14">
        <HausMotiv />

        <div className="relative mx-auto max-w-3xl">
          {/* Einstieg: links die Aussage, rechts der Anker mit der
              Zahl, um die es geht. Der rechte Bereich stand vorher
              leer, und die Ueberschrift hatte nichts, was sie traegt. */}
          <div className="grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-12">
            <div>
              {/* Kein Versal-Label, sondern die Frage, auf die der
                  Abschnitt antwortet. Sie markiert den Einstieg und
                  sagt zugleich etwas. */}
              <Reveal>
                <p className="text-[0.95rem] text-ink-muted">
                  Warum machen wir das?
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-2 max-w-[19ch] text-balance font-heading text-h2 opsz-display text-ink">
                  Die <span className="text-accent">Provision</span> ist der
                  häufigste Grund, warum Eigentümer zögern.
                </h2>
              </Reveal>

              {/* Bewusst schmaler und ruhiger gesetzt als die Überschrift,
                  damit die Überschrift den Abschnitt trägt */}
              <Reveal delay={0.16}>
                <p className="mt-5 max-w-[52ch] text-pretty leading-relaxed text-ink-muted">
                  In fast jedem Verkaufsgespräch geht es irgendwann um dieses
                  eine Thema. Wir sind selbst Makler und kennen die Frage gut.
                  Dieses Werkzeug ist unsere Antwort darauf.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.24} className="lg:pt-1">
              <ProvisionsAnker />
            </Reveal>
          </div>

          {/* Die Wahl: EIN Feld, geteilt von einer Haarlinie. Der
              Trenner ist eine eigene Rasterspalte, damit das "oder"
              genau auf der Linie sitzt und sie sauber unterbricht.
              Schmal liegt er waagerecht zwischen den Wegen, ab md
              senkrecht. */}
          <Reveal delay={0.16}>
            <div className="mt-10 grid items-stretch md:mt-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <Weg {...WEGE[0]} />
              <div className="relative my-8 flex items-center justify-center md:mx-9 md:my-0 lg:mx-12">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line md:inset-x-auto md:inset-y-0 md:left-1/2 md:h-auto md:w-px md:-translate-x-1/2 md:translate-y-0"
                />
                <span className="relative bg-surface px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-deep">
                  oder
                </span>
              </div>
              <Weg {...WEGE[1]} />
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-10 max-w-[54ch] text-pretty text-[0.95rem] leading-relaxed text-ink-muted md:mt-12">
              So ist <BrandName /> mit Absicht gebaut. Jeder soll seine
              Immobilie verkaufen können, unabhängig vom Vorwissen. Die einen
              brauchen dabei mehr Unterstützung, die anderen weniger. Beides ist
              vorgesehen.
            </p>
          </Reveal>

          {/* Der Kernsatz als Folgerung, mit eigenem Raum */}
          <Reveal delay={0.32}>
            <div className="mt-12 md:mt-16">
              <span
                aria-hidden="true"
                className="block h-[2px] w-10 rounded-full bg-accent"
              />
              <p className="mt-6 max-w-[20ch] text-balance font-heading text-[1.65rem] font-semibold leading-[1.2] tracking-[-0.02em] text-ink opsz-display sm:max-w-[24ch] sm:text-[2rem] md:text-[2.35rem]">
                Selbst verkaufen heißt bei uns nicht allein verkaufen.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
