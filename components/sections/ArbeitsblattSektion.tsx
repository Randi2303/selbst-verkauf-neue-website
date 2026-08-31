"use client";

import Image from "next/image";
import { Check, Printer } from "lucide-react";
import { Kennzeichen } from "@/components/mockups/Geraete";
import Reveal from "@/components/ui/Reveal";

/*
 * Die Arbeitsblaetter, direkt nach dem Zeitstrahl: Genau dort ist die
 * Frage "schaffe ich das alles?" am lautesten, und die Antwort ist ein
 * Gegenstand statt einer Behauptung (Inhaber, 24.08.2026).
 *
 * SEIT RUNDE 31 traegt die Stelle das iPad-Bild des Inhabers mit dem
 * ECHTEN Arbeitsblatt "Fotos vorbereiten": Das Blatt auf dem Schirm
 * ist das erzeugte PDF aus /api/checklisten/fotos (derselbe Katalog
 * wie Konto und Druck), oben scharf, nach unten ausblendend. Es
 * ersetzt das zuvor hier gebaute Papierblatt; dessen Staerken (jede
 * Breite scharf, Inhalt lebt mit dem Katalog mit, Haken zeichneten
 * sich) stehen im Rundenbericht, die Entscheidung liegt beim Inhaber.
 * Das Geraet zeigt, was der Text daneben verspricht: zum Abhaken auf
 * jedem Geraet.
 */
export default function ArbeitsblattSektion() {
  return (
    /* Voller Sektions-Rhythmus statt des frueheren knappen Kopfes:
       Mit 40 Pixeln Oberluft lag die Ueberschrift beim Scrollen halb
       unter der festen Kopfleiste (Inhaber-Befund 26.08.2026). Die
       Oberluft einer Sektion muss die Leistenhoehe uebersteigen. */
    /* overflow-x-clip: Der iPad-Schatten ist ein Filter, dessen
       Malflaeche Safari zum scrollbaren Bereich zaehlt; unter sm ist
       der Containerrand (20 px) kleiner als die Reichweite (27 px).
       Kappung wie bei Stimmen und Anfragen (26.08.2026). */
    <section className="section-pad overflow-x-clip">
      {/* items-center: Das Geraet steht mittig zur Textspalte; ab lg
          auf der LINKEN Randlinie (Regel vom 24.08.2026) */}
      <div className="container-page grid gap-9 lg:grid-cols-2 lg:items-center lg:gap-14">
        {/* max-w 330 am Telefon: laesst dem Geraete-Schatten (27 px
            Malflaeche) rechnerisch Luft zur Fensterkante. lg:ml-5 bis
            1279: Die volle Fassung malt auch 39 px nach LINKS, und
            das linksbuendige Geraet stand im Band 1024 bis 1279 nur
            25 px vor der Kante (Safari-Schiebe-Mechanik, siehe
            geraete-schatten in globals.css). */}
        <div className="order-1 mx-auto w-full min-w-0 max-w-[330px] sm:max-w-[380px] lg:mx-0 lg:ml-5 lg:justify-self-start min-[1280px]:ml-0">
          {/* Die leichte Schraeglage des frueheren Papierblatts kommt
              zurueck (Inhaber, Runde 31: schraeg wirkte eindrucksvoller,
              gerade wirkt flach) */}
          {/* v4 vom 26.08.2026 (Neu-Export ohne Canva-Hintergrund): Bild
              OHNE eingebauten Schatten, der gerechnete
              geraete-schatten ist wieder AN und folgt der Geraeteform
              statt der Bildkante. Neuer Name wegen der
              Ein-Jahr-Kopfzeile. */}
          <Image
            src="/images/mockups/checkliste-ipad-v4.webp"
            alt="Tablet mit dem Arbeitsblatt Fotos vorbereiten: Titel, Einleitung und die ersten Punkte zum Abhaken"
            width={1405}
            height={2039}
            sizes="(max-width: 639px) 308px, 380px"
            className="geraete-schatten h-auto w-full select-none lg:-rotate-[1.5deg]"
          />
          <Kennzeichen>Echtes Arbeitsblatt aus Ihrem Konto, gekürzt</Kennzeichen>
        </div>

        <div className="order-2 min-w-0">
          <Reveal>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-accent-deep">
              Für jeden Anlass ein Blatt
            </p>
            <h2 className="mt-2.5 font-heading text-h2">
              Sie müssen an nichts selbst denken.
            </h2>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-ink-muted">
              Fotos vorbereiten, Besichtigung vorbereiten, Unterlagen
              zusammensuchen: Für jeden dieser Momente liegt in Ihrem Konto ein
              Arbeitsblatt bereit. Zum Abhaken auf jedem Gerät, oder ausgedruckt
              am Küchentisch. Es ist die Liste, die ein Profi im Kopf hat, und
              Sie gehen sie einfach durch.
            </p>
            {/* Zwei ruhige Zeilen auf der Textkante statt der
                frueheren Chips: Die sahen aus wie Knoepfe, waren aber
                keine (keine Knoepfe ohne Funktion), standen mittig
                unter linksbuendigem Text und waren verschieden breit
                (Inhaber-Befund 26.08.2026, drei Ausrichtungen auf
                engem Raum). */}
            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-2.5 text-[0.92rem] text-ink">
                <Check size={15} strokeWidth={2} className="shrink-0 text-primary" aria-hidden="true" />
                Digital zum Abhaken, direkt in Ihrem Konto
              </li>
              <li className="flex items-center gap-2.5 text-[0.92rem] text-ink">
                <Printer size={15} strokeWidth={1.7} className="shrink-0 text-primary" aria-hidden="true" />
                Als PDF zum Ausdrucken
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
