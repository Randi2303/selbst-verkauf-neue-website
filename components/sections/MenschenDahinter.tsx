"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { mitBetonung } from "@/components/ui/Betont";
import BrandName from "@/components/ui/BrandName";
import PlatzhalterMuster from "@/components/ui/PlatzhalterMuster";
import PortraetKreis from "@/components/ui/PortraetKreis";
import SectionHeading from "@/components/ui/SectionHeading";
import { GRUENDUNG, GRUPPEN_CHIP, HALTUNG, MENSCHEN } from "@/config/menschen";
import { portraetFokus } from "@/lib/bildausschnitt";
import type { MenschenBilder } from "@/lib/menschen-bilder";
import { istPasswortschutz } from "@/lib/passwortschutz";
import { cn } from "@/lib/utils";

/*
 * "Die Menschen dahinter": ersetzt seit Runde 31 den früheren
 * Makler-Partner-Kasten an derselben Stelle der Startseite (zwischen
 * Vergleich und Stimmen, dort beginnt die Vertrauensphase) und trägt
 * beides: die Haltung des Hauses und die sechs Gesichter, Team und
 * begleitende Makler.
 *
 * LINKS die Haltung mit dem Kernsatz, RECHTS die Porträts als leicht
 * gefächerter Stapel: eine Person vorn, die anderen sichtbar dahinter,
 * darunter Name, Bezeichnung und ein Satz zur Person. Die Idee "eine
 * Person zur Zeit, die anderen dahinter" ist übernommen; Ausführung,
 * Material und Bedienung sind eigene: Fotoabzüge mit Papierrand statt
 * dunkler Karten, das Namensschild liegt UNTER dem Bild statt darauf
 * (kein Text auf Foto, kein Kontrastrisiko), gewechselt wird über
 * runde Porträt-Knöpfe mit einer Trennlinie zwischen Team und Maklern.
 *
 * BEWEGUNG NUR MIT BEDEUTUNG (Auflagen des Inhabers, Runde 31):
 *
 * - Beim Hereinscrollen fächert sich der Stapel EINMAL auf: erst
 *   liegen die Abzüge deckungsgleich aufeinander, dann spreizen sie
 *   sich. Die Bewegung erzählt "hier stehen mehrere Menschen".
 * - Der Personenwechsel schiebt das vordere Foto zurück in den Stapel
 *   und holt das nächste nach vorn; Schild und Satz blenden mit um.
 * - Ohne Zutun wechselt die Person alle sieben Sekunden, aber nur
 *   solange die Sektion im Bild ist, niemand darüber schwebt oder
 *   darin fokussiert, der Tab sichtbar ist und der Besucher noch nie
 *   selbst gewählt hat. Ein einziger eigener Klick beendet den
 *   Selbstlauf dauerhaft: Wer die Hand hebt, behält sie.
 *
 * HYDRATION-SICHER nach dem Vorbild der Randnotiz aus Runde 27: Der
 * Server liefert den fertig gefächerten Stapel VOLLSTÄNDIG SICHTBAR
 * aus, und der erste Client-Render ist mit dem Server-HTML identisch
 * (Zustand "ruhe"). Erst NACH dem Mount, und nur wenn keine reduzierte
 * Bewegung gewünscht ist, legt der Stapel die Abzüge zusammen
 * ("gestapelt") und fächert sie beim Hereinscrollen einmalig auf
 * ("gefaechert"). Die Übergangs-Klassen hängen NUR am Zustand
 * "gefaechert", damit der Sprung von "ruhe" zu "gestapelt" nicht
 * selbst animiert. Wer reduzierte Bewegung wünscht oder ohne
 * JavaScript liest, sieht immer den vollständigen Fächer, und der
 * Personenwechsel schaltet dann ohne Übergang um (alle
 * Übergangs-Klassen tragen zusätzlich motion-safe).
 *
 * NICHTS SPRINGT: Der Stapel hat über das Seitenverhältnis eine feste
 * Höhe, Namensschild und Personen-Satz liegen als Gitter-Stapel
 * übereinander, ihre Höhe bestimmt der längste Eintrag. Ein Wechsel
 * ändert kein einziges Maß.
 *
 * OHNE MAUS: Die Porträt-Knöpfe sind echte Buttons mit Namen im
 * aria-label und aria-current; das Namensschild steht in einer
 * aria-live-Region, ein Vorlesegerät sagt also, wer gerade vorn
 * steht. Die Fotos im Stapel selbst sind für Hilfstechnik verborgen
 * (aria-hidden), damit dieselbe Person nicht doppelt vorkommt.
 */

/** Wartezeit des Selbstlaufs zwischen zwei Personen (Inhaber,
 *  26.08.2026: etwa alle vier bis fuenf Sekunden; vorher 7000) */
const SELBSTLAUF_TAKT_MS = 4500;

/**
 * Die Lagen des Fächers, relativ zur vorderen Person (Lage 0). Drei
 * Abzüge sind sichtbar dahinter, die übrigen liegen unsichtbar im
 * Stapel. Volle transform-Zeichenketten, damit der Browser die
 * Bewegung auf der Grafikkarte rechnet.
 */
const LAGEN = [
  { transform: "rotate(0deg) translate3d(0, 0, 0) scale(1)", opacity: 1 },
  { transform: "rotate(-6.5deg) translate3d(-11%, 3.5%, 0) scale(0.94)", opacity: 0.95 },
  { transform: "rotate(6deg) translate3d(11%, 3%, 0) scale(0.92)", opacity: 0.9 },
  { transform: "rotate(-2deg) translate3d(0.5%, -4%, 0) scale(0.9)", opacity: 0.55 },
] as const;

const LAGE_VERBORGEN = {
  transform: "rotate(0deg) translate3d(0, 0, 0) scale(0.88)",
  opacity: 0,
} as const;

/** Alle Abzüge deckungsgleich: der Zustand vor dem Auffächern */
const LAGE_GESTAPELT = {
  transform: "rotate(0deg) translate3d(0, 0, 0) scale(1)",
  opacity: 1,
} as const;

export default function MenschenDahinter({ bilder }: { bilder: MenschenBilder }) {
  const [aktiv, setAktiv] = useState(0);
  /* "ruhe": Server-HTML und erster Client-Render, fertiger Fächer.
     "gestapelt": nach dem Mount, wartet auf den Scroll.
     "gefaechert": einmaliges Auffächern gelaufen, Übergänge aktiv. */
  const [buehne, setBuehne] = useState<"ruhe" | "gestapelt" | "gefaechert">("ruhe");
  /* Nach dem Auffächern fallen die Staffel-Verzögerungen weg, sonst
     würde jeder spätere Personenwechsel gestaffelt nachziehen. */
  const [entfaltet, setEntfaltet] = useState(false);
  const [selbstlaufAus, setSelbstlaufAus] = useState(false);

  const stapelRef = useRef<HTMLDivElement>(null);
  const rechtsRef = useRef<HTMLDivElement>(null);
  const ruht = useRef(false);
  const imBild = useRef(false);

  /* Auffächern beim Hereinscrollen, einmalig, nie bei reduzierter
     Bewegung (siehe Kopf-Kommentar zur Hydration-Sicherheit) */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = stapelRef.current;
    if (!el) return;
    setBuehne("gestapelt");
    const beobachter = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) {
          setBuehne("gefaechert");
          beobachter.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  useEffect(() => {
    if (buehne !== "gefaechert") return;
    const t = window.setTimeout(() => setEntfaltet(true), 900);
    return () => window.clearTimeout(t);
  }, [buehne]);

  /* Selbstlauf: nur nach dem Auffächern (damit auch nie bei
     reduzierter Bewegung), nur im Bild, nur ohne Hand des Besuchers */
  useEffect(() => {
    if (buehne !== "gefaechert" || selbstlaufAus) return;
    const flaeche = rechtsRef.current;
    if (!flaeche) return;

    const sichtWaechter = new IntersectionObserver(
      (eintraege) => {
        imBild.current = eintraege.some((e) => e.isIntersecting);
      },
      { threshold: 0.3 }
    );
    sichtWaechter.observe(flaeche);

    const takt = window.setInterval(() => {
      if (ruht.current || !imBild.current || document.hidden) return;
      setAktiv((a) => (a + 1) % MENSCHEN.length);
    }, SELBSTLAUF_TAKT_MS);

    return () => {
      sichtWaechter.disconnect();
      window.clearInterval(takt);
    };
  }, [buehne, selbstlaufAus]);

  const waehle = (index: number) => {
    setSelbstlaufAus(true);
    setAktiv(index);
  };

  return (
    /* FASSUNG E, DER BEWUSSTE UMBRUCH (Inhaber-Entscheid 26.08.2026):
       Die Sektion bleibt ungekuerzt und darf laenger sein als ein
       Bildschirm, aber die Bildschirmkante faellt bei den gaengigen
       Fenstern in Luft statt durch Inhalt. Dafuer drei Stellungen:
       py-24 statt section-pad (96 px, die mobile Rhythmusstufe, statt
       128; damit fallen die Kanten 715 und 815 der Fenster 1324x800
       und 1440x900 in die Absatzfugen nach Absatz 3 und 4),
       items-start statt items-center (die rechte Karte haengt sonst an
       der Spaltenmitte und wandert mit jeder Textaenderung durch die
       Kanten), und die Karte rechts ist eng gestellt (Foto, Namen,
       Beschreibung, Porträt-Wahl mit je 12 px Fugen), damit sie bei
       1440x900 KOMPLETT ueber der Kante steht, Kreise eingeschlossen.
       Gemessene Kanten nach dem Umbau stehen im Rundenbericht; bei
       1324x800 schneidet die Kante die Beschreibungszeile der Karte,
       das laesst sich ohne Verkleinern nicht vermeiden (Ansage an den
       Inhaber). Die Unterschrifts-GESTE liegt frei von allen vier
       geprueften Kanten (715, 815, 915, 995). */
    <section id="menschen" className="py-24 scroll-mt-24">
      <div className="container-page grid gap-14 lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* Die Haltung. Sie steht wortgleich auch auf der Team-Seite,
            beide lesen config/menschen.ts. */}
        <div className="min-w-0">
          <SectionHeading
            eyebrow="Die Menschen dahinter"
            lines={[
              "Wer hinter",
              <span key="marke">
                <BrandName /> steht.
              </span>,
            ]}
          />
          {/* Der Kernsatz ist die EINE hervorgehobene Stelle der
              Sektion und steht als These direkt unter der Überschrift;
              die Gründungsgeschichte darunter erzählt, woher er kommt
              (Reihenfolge entschieden in Runde 31, der Inhaber hatte
              beide Plätze freigestellt). */}
          <p className="mt-7 max-w-[15ch] text-balance font-heading text-[1.75rem] font-semibold leading-[1.18] tracking-[-0.02em] text-ink opsz-display sm:text-[2.1rem]">
            {HALTUNG.kernsatz}
          </p>

          {/* Die Gründungsgeschichte, Wortlaut des Inhabers
              (config/menschen.ts), darunter die Unterschrift. Die
              Namenszeile steht immer und wirkt auch allein
              vollständig; das Unterschrift-Bild erscheint erst, wenn
              die Datei wirklich da ist. */}
          {GRUENDUNG.text ? (
            <div className="mt-7 max-w-[54ch] space-y-4">
              {GRUENDUNG.text.split("\n\n").map((absatz) => (
                <p key={absatz.slice(0, 24)} className="text-pretty leading-relaxed text-ink-muted">
                  {absatz}
                </p>
              ))}
              <div className="pt-2">
                {/* Die Unterschrift als CSS-Maske: Die Farbe kommt vom
                    ink-Token und folgt damit jeder Farbfassung von
                    selbst, mit EINER Datei. Eine Geste, kein Bild:
                    schmal (halbe Textzeile), mit Luft darueber und
                    darunter, ohne Kasten dahinter. Der Name steht
                    darunter in Textform, deshalb aria-hidden. */}
                {bilder.unterschriftVorhanden ? (
                  <span
                    aria-hidden="true"
                    className="mb-3 mt-1 block h-11 w-[194px] bg-ink"
                    style={{
                      WebkitMaskImage: `url(${GRUENDUNG.unterschriftBild})`,
                      maskImage: `url(${GRUENDUNG.unterschriftBild})`,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      WebkitMaskPosition: "left center",
                      maskPosition: "left center",
                    }}
                  />
                ) : null}
                <p className="text-[0.92rem] font-medium text-ink">
                  {GRUENDUNG.unterschriftName}
                </p>
                <p className="text-[0.85rem] text-ink-muted">{GRUENDUNG.unterschriftRolle}</p>
              </div>
            </div>
          ) : null}

          {/* Haltungs-Absätze und Makler-Abgrenzung stehen bewusst
              NICHT hier, sondern auf der Team-Seite (Inhaber, Runde
              31: die Spalte war zu voll; die Gründungsgeschichte
              erzählt das Warum jetzt selbst). Den Unterschied der
              Gruppen trägt die Fläche: Chip über dem Namen, Trennlinie
              in der Porträt-Wahl, die Beschreibungen der Makler. */}
          <p className="mt-7 text-[0.95rem]">
            <Link
              prefetch={istPasswortschutz ? false : undefined}
              href="/team"
              className="font-medium text-primary transition-colors hover:text-primary-dark"
            >
              Lernen Sie uns näher kennen
            </Link>
          </p>
        </div>

        {/* Der Stapel mit Schild und Porträt-Wahl. Schwebt jemand über
            der Fläche oder fokussiert darin, ruht der Selbstlauf. */}
        <div
          ref={rechtsRef}
          className="min-w-0"
          onPointerEnter={() => {
            ruht.current = true;
          }}
          onPointerLeave={() => {
            ruht.current = false;
          }}
          onFocus={() => {
            ruht.current = true;
          }}
          onBlur={() => {
            ruht.current = false;
          }}
        >
          {/* Die seitlichen Ränder lassen den gedrehten Abzügen Platz,
              damit bei 390 px nichts über den Bildschirm hinausragt */}
          {/* Enge Karte aus Fassung D, nach Live-Blick des Inhabers
              (26.08.2026) mit einem Hauch mehr Luft unterm Portraet
              (mb-4); oben dafuer mt-2, damit die Kreis-Reihe bei
              1440 auf 900 unter der Kante bleibt. */}
          <div
            ref={stapelRef}
            className="relative mx-auto mb-4 mt-2 w-[240px] sm:w-[300px] lg:w-[320px] xl:w-[350px]"
          >
            {/* isolate: eigener Stapel-Kontext. Die z-Ordnungen der
                Abzuege gelten NUR untereinander und treten nie gegen
                die feste Kopfleiste (z-40) an; ohne das schob sich
                der Stapel beim Scrollen uebers Menue (Inhaber-Befund,
                25.08.2026). */}
            <div className="relative isolate aspect-[3/4]">
              {MENSCHEN.map((mensch, i) => {
                const lage = (i - aktiv + MENSCHEN.length) % MENSCHEN.length;
                const sichtbar = lage < LAGEN.length;
                const ziel =
                  buehne === "gestapelt"
                    ? LAGE_GESTAPELT
                    : sichtbar
                      ? LAGEN[lage]
                      : LAGE_VERBORGEN;
                return (
                  <div
                    key={mensch.name}
                    aria-hidden="true"
                    onClick={sichtbar && lage !== 0 ? () => waehle(i) : undefined}
                    className={cn(
                      "absolute inset-0",
                      buehne === "gefaechert" &&
                        "motion-safe:transition-[transform,opacity] motion-safe:duration-[420ms] motion-safe:ease-swift",
                      sichtbar && lage !== 0 && "cursor-pointer",
                      !sichtbar && "pointer-events-none"
                    )}
                    style={{
                      ...ziel,
                      zIndex: 40 - lage * 5,
                      /* Gestaffelt nur beim einmaligen Auffächern */
                      transitionDelay: entfaltet ? "0ms" : `${lage * 70}ms`,
                    }}
                  >
                    {/* Fotoabzug: Papierrand, feine Kante, warmer Ton */}
                    <figure
                      className={cn(
                        "h-full w-full rounded-2xl bg-paper p-2 ring-1 ring-line/70",
                        lage === 0 ? "shadow-lift" : "shadow-soft"
                      )}
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-xl">
                        {bilder.fotos[mensch.name] ? (
                          <Image
                            src={mensch.bild}
                            alt=""
                            fill
                            sizes="(min-width: 1280px) 350px, (min-width: 1024px) 320px, (min-width: 640px) 300px, 240px"
                            className="foto-warm object-cover"
                            /* Der Abzug wird nur VERSCHOBEN, nie
                               herangeholt: Er zeigt einen Menschen, kein
                               Passbild. Der Wert kommt aus demselben
                               Bildmittelpunkt wie die Kreise unten
                               (lib/bildausschnitt.ts). */
                            style={{
                              objectPosition: bilder.masse[mensch.name]
                                ? portraetFokus(
                                    mensch.mittelpunkt,
                                    bilder.masse[mensch.name]!,
                                    3 / 4
                                  )
                                : "50% 50%",
                            }}
                          />
                        ) : (
                          <div className="relative flex h-full w-full items-center justify-center bg-surface">
                            <PlatzhalterMuster />
                            <span className="relative font-heading text-5xl font-semibold text-primary">
                              {mensch.initialen}
                            </span>
                          </div>
                        )}
                      </div>
                    </figure>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Namensschild UNTER dem Abzug, wie die Beschriftung unter
              einem gerahmten Foto. Gitter-Stapel: alle sechs Schilder
              liegen übereinander, das längste bestimmt die Höhe, ein
              Wechsel verschiebt nichts. */}
          <div className="mx-auto grid max-w-[430px] text-center" aria-live="polite">
            {MENSCHEN.map((mensch, i) => (
              <div
                key={mensch.name}
                aria-hidden={i !== aktiv}
                className={cn(
                  "col-start-1 row-start-1 motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-swift",
                  i === aktiv
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-1 opacity-0"
                )}
              >
                <p
                  className={cn(
                    "text-[0.72rem] font-semibold uppercase tracking-[0.09em]",
                    mensch.gruppe === "makler" ? "text-accent-deep" : "text-primary"
                  )}
                >
                  {GRUPPEN_CHIP[mensch.gruppe]}
                </p>
                <p className="mt-1.5 font-heading text-[1.3rem] font-semibold tracking-[-0.01em] text-ink">
                  {mensch.name}
                </p>
                <p className="mt-0.5 text-[0.9rem] text-ink-muted">{mensch.bezeichnung}</p>
              </div>
            ))}
          </div>

          {/* Der Satz zur Person, ebenfalls als Gitter-Stapel mit
              fester Höhe. Absätze trennt \n\n (neuer Gedanke = eigener
              Absatz, STEHENDE REGEL des Inhabers, 26.08.2026). */}
          <div className="mx-auto mt-3 grid max-w-[46ch] text-center">
            {MENSCHEN.map((mensch, i) => (
              <div
                key={mensch.name}
                aria-hidden={i !== aktiv}
                className={cn(
                  "col-start-1 row-start-1 space-y-1.5 motion-safe:transition-[opacity,transform] motion-safe:delay-75 motion-safe:duration-300 motion-safe:ease-swift",
                  i === aktiv
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-1 opacity-0"
                )}
              >
                {mensch.beschreibung.split("\n\n").map((absatz) => (
                  <p
                    key={absatz.slice(0, 24)}
                    className="text-pretty text-[0.92rem] leading-relaxed text-ink-muted"
                  >
                    {mitBetonung(absatz)}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* Die Wahl: sechs Porträt-Knöpfe, die Trennlinie hält Team
              und begleitende Makler auseinander */}
          <div
            role="group"
            aria-label="Person im Stapel wählen"
            className="mt-3 flex items-center justify-center"
          >
            {MENSCHEN.map((mensch, i) => (
              <span key={mensch.name} className="flex items-center">
                {/* Die Trennlinie steht VOR dem ersten Makler; etwas
                    mehr Abstand zwischen selbst-verkauf.de und
                    WerteImmobilien auf Inhaber-Wunsch (26.08.2026) */}
                {i > 0 && MENSCHEN[i - 1].gruppe !== mensch.gruppe && (
                  <span aria-hidden="true" className="mx-2.5 h-7 w-px bg-line sm:mx-3.5" />
                )}
                <button
                  type="button"
                  aria-label={`${mensch.name} nach vorn holen`}
                  aria-current={i === aktiv}
                  onClick={() => waehle(i)}
                  className="group flex h-11 w-11 items-center justify-center rounded-full"
                >
                  {/* Alle sechs Kreise gleich ausgeschnitten: Augen auf
                      einer Höhe, Kopf gleich groß. Siehe
                      components/ui/PortraetKreis.tsx. */}
                  <PortraetKreis
                    mensch={mensch}
                    bilder={bilder}
                    sizes="48px"
                    className={cn(
                      "h-9 w-9 transition-all duration-200 ease-swift",
                      i === aktiv
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "opacity-70 ring-1 ring-line group-hover:opacity-100"
                    )}
                  />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
