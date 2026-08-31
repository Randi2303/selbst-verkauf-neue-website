"use client";

import { Phone, Video } from "lucide-react";
import { useState } from "react";
import PortraetKreis from "@/components/ui/PortraetKreis";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { GESPRAECH, gespraechScharf, videoFlaeche } from "@/config/gespraech-buchen";
import { MENSCHEN } from "@/config/menschen";
import type { MenschenBilder } from "@/lib/menschen-bilder";

/*
 * "Was möchten Sie vorher wissen?" Das kurze Gespräch vor der
 * Entscheidung, unmittelbar hinter Paketen und Vergleich.
 *
 * WARUM GENAU HIER: Der Zweifel entsteht am Preis, nicht am Seitenende.
 * Die Pakete stellen die Frage "will ich das ausgeben", der Vergleich
 * beantwortet sie in Zahlen, und dieser Abschnitt beantwortet den Rest,
 * den keine Zahl beantwortet.
 *
 * DER TON TRÄGT SICH SELBST, er wird nicht behauptet. Vier Dinge
 * beweisen, dass hier kein Verkaufsgespräch wartet, und alle vier sind
 * sichtbare Gegenstände, keine Beteuerungen: WER da sitzt (Randolph
 * Niermann mit Namen und Gesicht, aus config/menschen.ts), WAS NICHT
 * passiert (der große Satz), eine GRENZE (fünfzehn Minuten, keine
 * Vorbereitung, keine Angaben zur Immobilie) und ECHTE FRAGEN.
 *
 * =====================================================================
 * DIE ORDNUNG DER FLÄCHE (Umbau nach Inhaber-Befund, 26.08.2026:
 * "zu brav, wirkt unruhig, gerade weil alles gleich aussieht")
 * =====================================================================
 * Vorher stand unter der Überschrift alles in einer Größe: Unterzeile,
 * Person, Versprechen, Grenze, Knöpfe. Fünf Dinge auf einer Stufe sind
 * keine Ordnung, sondern eine Aufzählung, und das Auge sucht sich dann
 * selbst etwas aus. Jetzt gibt es drei klare Stufen und einen Bruch:
 *
 *   1  DER KOPF, allein und schmal: Augenbraue, Überschrift, und
 *      darunter DER EINE GROSSE SATZ ("Hier wird Ihnen nichts
 *      verkauft."). Er ist die These des Abschnitts und steht in
 *      derselben Rolle wie der Kernsatz der Menschen-Sektion. Die
 *      frühere Unterzeile ist ersatzlos weg: Sie sagte dasselbe wie
 *      die Überschrift, nur länger.
 *   2  DAS BAND darunter, zweispaltig: links wer, wie lange und wohin,
 *      rechts das Video. Hier ist alles gleich groß, und das ist
 *      richtig, denn es sind gleichrangige Angaben.
 *   3  DIE FRAGEN, über die ganze Breite, mit einer großen und vier
 *      kleinen. Sie sind der Kern des Abschnitts und bekommen deshalb
 *      als einzige Fläche wieder eine große Type.
 *
 * DAS VIDEO STEHT IN EINER FLUCHT MIT NAMEN UND BESCHREIBUNG
 * (ausdrückliche Vorgabe des Inhabers). Deshalb liegt es nicht neben
 * der Überschrift, sondern im selben Rasterband wie die Person: Beide
 * beginnen auf derselben Linie, weil sie in derselben Rasterzeile
 * stehen. Das ist nicht mit einem Abstand nachgestellt, es ist Struktur,
 * und es hält deshalb bei jeder Textlänge.
 *
 * ZWEI GLEICHWERTIGE WEGE. Video und Telefon stehen nebeneinander,
 * gleich groß, gleiche Farbe. Viele Eigentümer möchten kein Video; das
 * darf nicht wie die zweite Wahl aussehen.
 *
 * SICHTBAR IM SERVER-HTML. Der Abschnitt nutzt nur SectionHeading und
 * Reveal, und die liefern seit Runde 32 sichtbar aus (lib/einblenden.ts).
 * Eigene Deckkraft-Null-Zustände hat er keine, und wer reduzierte
 * Bewegung eingestellt hat, sieht alles sofort und unbewegt.
 */

/**
 * Die eine Person dieses Abschnitts, aus derselben Quelle wie überall
 * (config/menschen.ts). Fehlt sie dort, bricht es beim Bau statt still
 * einen leeren Kreis zu zeigen.
 */
function randolph() {
  const mensch = MENSCHEN.find((m) => m.name === "Randolph Niermann");
  if (!mensch) {
    throw new Error(
      'components/sections/GespraechSektion.tsx erwartet "Randolph Niermann" in config/menschen.ts.'
    );
  }
  return mensch;
}
const RANDOLPH = randolph();

const WEG_ZEICHEN = { video: Video, telefon: Phone } as const;

/**
 * Abstand zwischen zwei einlaufenden Fragen, in Sekunden.
 *
 * 70 ms, und der Wert ist nicht gegriffen: Unter etwa 30 ms sieht es
 * aus, als käme alles gleichzeitig, über etwa 80 ms zerfällt die Reihe
 * und man wartet auf die letzte. Die Bewegung hat hier eine Aufgabe,
 * sie ist keine Zier: Fünf nacheinander eintreffende Sätze lesen sich
 * wie fünf Äußerungen, fünf gleichzeitig erscheinende wie ein Block
 * Text.
 */
const FRAGEN_TAKT = 0.07;

export default function GespraechSektion({ bilder }: { bilder: MenschenBilder }) {
  const scharf = gespraechScharf();
  const flaeche = videoFlaeche();
  /* Nur im unscharfen Zustand (Entwicklung ohne Link) belegt: der
     Hinweis, dass der Knopf noch nirgendwohin führt. Er steht AUS DEM
     FLUSS HERAUS unter der Knopfreihe, damit ein Klick die Gestaltung
     nicht verändert und nichts nachrutscht. */
  const [hinweis, setHinweis] = useState(false);

  const [leitfrage, ...weitereFragen] = GESPRAECH.fragen;

  return (
    <section id="gespraech" className="section-pad scroll-mt-24">
      <div className="container-page">
        {/* ---- 1. Der Kopf: Überschrift und der eine große Satz ---- */}
        <div className="max-w-[36rem]">
          <SectionHeading
            eyebrow="Vor der Entscheidung"
            lines={["Was möchten Sie", "vorher wissen?"]}
          />
          <Reveal delay={0.05} className="mt-7">
            <p className="max-w-[20ch] text-balance font-heading text-h3 text-ink opsz-display">
              {GESPRAECH.versprechenGross}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-4">
            <p className="max-w-[46ch] text-pretty leading-relaxed text-ink-muted">
              {GESPRAECH.versprechen}
            </p>
          </Reveal>
        </div>

        {/* ---- 2. Das Band: links wer und wohin, rechts das Video ----
            Beide Spalten beginnen in DERSELBEN Rasterzeile; damit steht
            das Video in einer Flucht mit Namen und Bezeichnung, ohne
            dass irgendwo ein Abstand nachgerechnet wird. */}
        <div
          className={
            flaeche === "keine"
              ? /* Ohne Video keine leere zweite Spalte, sondern EINE
                   Spalte in der Breite des Kopfblocks darueber. Sonst
                   stuenden Person, Grenze und Knoepfe allein in einem
                   1200 px breiten Feld und die Flucht nach oben waere
                   weg. Dieser Fall tritt nur im Betrieb ein, solange
                   kein Video hinterlegt ist. */
                "mt-14 max-w-[36rem]"
              : "mt-14 grid gap-10 lg:grid-cols-[1fr,0.9fr] lg:items-start lg:gap-16"
          }
        >
          <div className="min-w-0">
            {/* Wer da sitzt: ein Mensch mit Namen, kein Postfach */}
            <div className="flex items-center gap-3.5">
              <PortraetKreis
                mensch={RANDOLPH}
                bilder={bilder}
                sizes="56px"
                className="h-14 w-14 shrink-0 ring-1 ring-line"
                initialenKlasse="font-heading text-[1rem]"
              />
              <span className="min-w-0">
                <span className="block text-[0.98rem] font-medium text-ink">{RANDOLPH.name}</span>
                <span className="block text-[0.85rem] leading-snug text-ink-muted">
                  {RANDOLPH.bezeichnung}
                </span>
              </span>
            </div>

            {/* Die Grenze, drei Angaben nebeneinander. GETRENNT DURCH
                ABSTAND, NICHT DURCH ZEICHEN: Zwischen den Angaben
                standen zuerst feine Punkte, und beim Umbruch rutschte
                der Punkt an den ZEILENANFANG (gemessen bei 1024 und
                390 px). Ein Trennzeichen, das eine Zeile anführt, sieht
                aus wie ein Aufzählungspunkt und ist keiner. Ein Abstand
                kann nicht verrutschen. */}
            <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[0.9rem] text-ink-muted">
              {GESPRAECH.grenzen.map((grenze) => (
                <li key={grenze}>{grenze}</li>
              ))}
            </ul>

            {/* Die zwei Wege. relative, damit der Hinweis unter der
                Reihe schweben kann, ohne etwas zu verschieben. */}
            <div className="relative mt-8">
              <p className="mb-3 text-[0.85rem] font-medium text-ink-muted">
                {GESPRAECH.terminZeile}
              </p>
              {/* GLEICH GROSS, NICHT NUR GLEICH GESTALTET. Zwei
                  gleichwertige Wege duerfen nicht verschieden gross
                  aussehen, deshalb dieselbe Mindestbreite, dieselbe
                  Gestaltung und KEIN Umbruch im Text. Die langen
                  Fassungen ("Telefongespraech vereinbaren") brachen ab
                  1024 px in der halben Spalte um, die kurze daneben
                  nicht; das Verb steht deshalb einmal in der Zeile
                  darueber. Fuer Vorlesegeraete traegt jeder Knopf
                  trotzdem den ganzen Satz. */}
              <div className="flex flex-wrap gap-3">
                {GESPRAECH.wege.map((weg) => {
                  const Zeichen = WEG_ZEICHEN[weg.id];
                  const inhalt = (
                    <>
                      <Zeichen size={17} strokeWidth={1.8} aria-hidden="true" />
                      {weg.label}
                    </>
                  );
                  /* Scharf: ein echter Verweis, neuer Tab, kein
                     eingebettetes Fenster eines fremden Dienstes.
                     Unscharf: derselbe Knopf, dieselbe Gestaltung, sagt
                     aber beim Drücken, dass er noch nirgendwohin führt. */
                  return scharf ? (
                    <a
                      key={weg.id}
                      href={`${GESPRAECH.buchungslink}${weg.anhang}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      /* Der neue Tab steht im aria-label und nicht auf
                         der Fläche: Ein Vorlesegerät sagt ihn dann an,
                         und die Knopfbeschriftung bleibt kurz. */
                      aria-label={`${weg.lang}, öffnet den Terminplan in einem neuen Tab`}
                      className="btn-primary min-w-[13rem] whitespace-nowrap"
                    >
                      {inhalt}
                    </a>
                  ) : (
                    <button
                      key={weg.id}
                      type="button"
                      onClick={() => setHinweis(true)}
                      aria-label={weg.lang}
                      className="btn-primary min-w-[13rem] whitespace-nowrap"
                    >
                      {inhalt}
                    </button>
                  );
                })}
              </div>
              <p
                aria-live="polite"
                className="pointer-events-none absolute inset-x-0 top-full mt-3 text-[0.85rem] leading-snug text-ink-muted"
              >
                {hinweis
                  ? "Noch kein Terminplan hinterlegt. Dieser Knopf öffnet ihn später in einem neuen Tab."
                  : ""}
              </p>
            </div>
          </div>

          {/* Das Video, oder der Platz dafür */}
          {flaeche === "keine" ? null : (
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
              {flaeche === "video" ? (
                /* Eigene Datei, kein fremder Dienst. preload="none":
                   Vor dem ersten Klick wird nichts geladen. */
                <video
                  className="h-full w-full bg-surface object-cover"
                  controls
                  preload="none"
                  playsInline
                  poster={GESPRAECH.videoStandbild || undefined}
                  src={GESPRAECH.video}
                >
                  {/* Untertitel, sobald die Datei da ist. Ein Video, in
                      dem jemand spricht, trägt Inhalt; ohne Spur ist er
                      für Gehörlose nicht vorhanden. */}
                  {GESPRAECH.videoUntertitel ? (
                    <track
                      kind="captions"
                      srcLang="de"
                      label="Deutsch"
                      default
                      src={GESPRAECH.videoUntertitel}
                    />
                  ) : null}
                </video>
              ) : (
                /* DER PLATZHALTER, und er sagt die Wahrheit: Er sieht
                   nicht aus wie ein ladendes Video, er trägt kein
                   Abspiel-Zeichen, und er ist nicht anklickbar. Er hat
                   Größe und Ort des späteren Videos, damit beim
                   Einsetzen nichts springt. */
                <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 rounded-3xl border border-dashed border-line bg-surface/50 px-6 text-center">
                  <p className="max-w-[30ch] text-[0.92rem] leading-relaxed text-ink-muted">
                    Hier kommt ein kurzes Video, in dem {RANDOLPH.name} erklärt, worum es in
                    dem Gespräch geht.
                  </p>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-muted/70">
                    Platz reserviert, noch nichts hinterlegt
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---- 3. Die Fragen ----
            SIE SIND DER KERN DES ABSCHNITTS UND SEHEN JETZT AUCH SO AUS
            (Inhaber, 26.08.2026: "stehen da wie eine Liste, sollen
            wirken wie Fragen echter Menschen").

            DREI MITTEL, UND KEINES DAVON IST EIN ZUGEKAUFTER BAUSTEIN:

            GRÖSSE  Eine Frage steht groß und allein links, vier stehen
                    klein rechts. Damit gibt es einen Anfang statt fünf
                    gleichberechtigter Punkte. Welche groß steht,
                    entscheidet die Reihenfolge in config/gespraech-buchen.ts.
            ANORDNUNG  Zwei ungleiche Spalten (die linke schmaler als
                    die rechte), die große Frage spannt alle vier
                    Zeilen. Kein Kasten, keine Karte, kein Zeichen
                    davor: Ein Aufzählungspunkt macht aus einem Satz
                    einen Listeneintrag.
            BEWEGUNG  Die fünf laufen NACHEINANDER ein, im Takt von
                    70 ms, wenn die Fläche ins Bild kommt. Das ist der
                    ganze Zweck: Fünf nacheinander eintreffende Sätze
                    lesen sich wie fünf Äußerungen. Sie nutzt den
                    Einblende-Haken des Hauses (Reveal), also dieselbe
                    Kurve und dieselbe Dauer wie überall, und wer
                    reduzierte Bewegung eingestellt hat, sieht alle fünf
                    sofort und unbewegt.

            KEINE ANFÜHRUNGSZEICHEN, KEINE NAMEN, KEINE GESICHTER.
            Warum, steht ausführlich in config/gespraech-buchen.ts bei
            `fragen`. Kurz: Genau daran erkennt man ein erfundenes
            Kundenzitat, und das hier sind keine. */}
        <div className="mt-20 md:mt-24">
          <Reveal>
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {GESPRAECH.fragenLabel}
            </p>
          </Reveal>

          <ul className="mt-7 grid gap-x-12 gap-y-6 lg:grid-cols-[0.95fr,1.05fr] lg:gap-x-20">
            {/* self-center: Die grosse Frage spannt alle vier Zeilen der
                rechten Spalte und stand oben, mit einem Loch darunter.
                Mittig gestellt haelt sie die vier kleinen in der Waage,
                und das Loch verschwindet. */}
            <li className="lg:row-span-4 lg:self-center">
              <Reveal y={16}>
                <p className="max-w-[20ch] text-balance font-heading text-h3 leading-[1.25] text-ink opsz-display">
                  {leitfrage}
                </p>
              </Reveal>
            </li>
            {weitereFragen.map((frage, i) => (
              <li key={frage}>
                <Reveal y={14} delay={0.12 + i * FRAGEN_TAKT}>
                  <p className="max-w-[42ch] text-pretty text-[1.05rem] leading-relaxed text-ink">
                    {frage}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={0.4} className="mt-12">
            <p className="max-w-[62ch] text-[0.9rem] leading-relaxed text-ink-muted">
              {GESPRAECH.fragenSchluss}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
