"use client";

import Image from "next/image";
import { m, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AnfragenMoment from "@/components/mockups/AnfragenMoment";
import { Kennzeichen } from "@/components/mockups/Geraete";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/*
 * Die Anfragen-Sektion traegt die EINE Randnotiz der Seite (Inhaber:
 * eine Beobachtung, kein Muster) und seit Runde 31 den
 * Geraete-Uebergang: Ab sm steht das MacBook mit der echten
 * Anfragen-Ansicht, und beim Weiterscrollen schiebt sich das gebaute
 * Telefon von unten davor. Kein Verwandeln, kein Ueberblenden, nur
 * eine Verschiebung. Unter sm bleibt die abgenommene
 * Nur-Telefon-Darstellung: Ein MacBook-Bild ist dort fast unlesbar,
 * und das Bild wird dort auch nicht geladen.
 *
 * DIE GERAETE-GRUPPE SITZT AN DER RECHTEN CONTAINERKANTE (Inhaber,
 * 26.08.2026): Der Abstand der Gruppe zur rechten Kante entspricht dem
 * des Textblocks zur linken, und zwischen Text und Geraeten bleibt
 * Luft. Die fruehere Seiten-Randnotiz rechts NEBEN dem Geraet ist
 * dafuer gefallen: Sie stahl der Gruppe rund 170 Pixel Spaltenbreite.
 * Die Notiz steht jetzt auf allen Breiten UNTER dem Telefon,
 * angebunden durch die kurze Linie von der Geraetekante herab (die
 * Form, die der Inhaber am 24.08.2026 fuer die schmalen Breiten
 * abgenommen hat).
 *
 * HYDRATION-SICHER, zweifach nach dem Randnotiz-Muster:
 *
 * 1. Die NOTIZ: Der Server liefert sie vollstaendig sichtbar, der
 *    erste Client-Render ist identisch (Zustand "ruhe"). Erst nach dem
 *    Mount, und nur ohne reduzierte Bewegung, wird sie versteckt und
 *    beim Hinsehen einmalig eingeblendet (Strich zeichnet sich herab,
 *    der Text folgt). Uebergangs-Klassen haengen NUR am Zustand "an".
 * 2. Der SCHIEBE-UEBERGANG: Server und erster Client-Render tragen
 *    KEINEN Transform (Telefon steht an seinem Platz). Erst nach dem
 *    Mount, und nur ohne reduzierte Bewegung, uebernimmt der
 *    Scroll-Wert. Die fruehere Fassung rechnete die reduzierte
 *    Bewegung in den Serverwert hinein und erzeugte damit GENAU EINE
 *    Hydration-Meldung bei Systemen mit reduzierter Bewegung
 *    (Inhaber-Befund 26.08.2026, "Turbopack zeigt 1 issue").
 *
 * Der Nachweis ist FREIWILLIG und die Entscheidung liegt beim
 * Verkaeufer, nicht bei uns: Die Notiz sagt deshalb "Sie legen fest".
 * Formulierung vom Inhaber abgenommen. Im Weg links steht der
 * Nachweis seit Runde 27 bewusst NICHT mehr (Inhaber: die Dopplung
 * mit der Randnotiz fiel auf); Station drei ist der Antwortvorschlag.
 */

/** Der Weg einer Anfrage, drei Stationen (Inhaber-Freigabe Runde 27) */
const STATIONEN = [
  {
    titel: "Die Anfrage kommt an",
    text: "Von den Portalen oder Ihrer Objektseite, gebündelt bei Ihnen. Ihre private E-Mail-Adresse bleibt verborgen.",
  },
  {
    titel: "Sie wird eine Akte",
    text: "Verlauf, Stand und nächster Schritt zu jeder Person. Nichts geht verloren, auch nach Wochen nicht.",
  },
  {
    titel: "Antworten ohne leeres Blatt",
    text: "Zu jeder Anfrage schlägt Ihnen die Plattform eine passende Antwort vor. Sie ändern, was Sie möchten, und senden.",
  },
];

export default function AnfragenSektion() {
  /* "ruhe": Server-HTML und erster Client-Render, vollstaendig
     sichtbar. "versteckt": nach dem Mount, wartet auf den Scroll.
     "an": einmaliges Einblenden laeuft. */
  const [notiz, setNotiz] = useState<"ruhe" | "versteckt" | "an">("ruhe");
  const notizRef = useRef<HTMLDivElement>(null);

  /* Der Schiebe-Uebergang uebernimmt erst nach dem Mount und nie bei
     reduzierter Bewegung; bis dahin steht das Telefon ohne Transform
     an seinem Platz (siehe Kopf-Kommentar, Punkt 2). */
  const [schiebt, setSchiebt] = useState(false);
  const geraeteRef = useRef<HTMLDivElement>(null);
  /* Langer Laufweg (bis die Gruppe das obere Drittel erreicht), damit
     der Uebergang beim normalen Scrollen wirklich SICHTBAR ablaeuft */
  const { scrollYProgress } = useScroll({
    target: geraeteRef,
    offset: ["start 96%", "start 34%"],
  });
  const telefonWeg = useTransform(scrollYProgress, [0, 1], [
    "translateY(24%)",
    "translateY(0%)",
  ]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSchiebt(true);
    const el = notizRef.current;
    if (!el) return;
    setNotiz("versteckt");
    const beobachter = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) {
          setNotiz("an");
          beobachter.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  /* overflow-x-clip auf Abschnitts-Ebene wie bei den Stimmen: Das
     Telefon traegt seit der Vereinheitlichung (Inhaber, 26.08.2026)
     den geraete-schatten als FILTER, und Safari zaehlt Filter-
     Malflaechen zum scrollbaren Bereich; unter sm liegt der
     Containerrand (20 px) unter der Schatten-Reichweite (27 px). Die
     Kappung schneidet nur, was ueber die volle Fensterbreite
     hinausmalt, und laesst die Breiten-Messung ausserhalb sehend. */
  return (
    <section className="section-pad overflow-x-clip">
      {/* Der kurze Text sitzt MITTIG zum hohen Geraet (Inhaber,
          Feinschliff 24.08.2026). Die Geraete-Spalte ist bewusst die
          breitere (Inhaber, Runde 31: die Flaeche wirklich fuellen). */}
      <div className="container-page grid gap-10 lg:grid-cols-[0.85fr,1.15fr] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <Reveal>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-accent-deep">
              Anfragen
            </p>
            <h2 className="mt-2.5 font-heading text-h2">
              Sie sehen sofort, wer es ernst meint.
            </h2>
            {/* Der Weg einer Anfrage als nummerierte Stationen
                (Inhaber-Freigabe Runde 27, Vorschlag B): Die Nummern
                stehen hier, weil der Weg wirklich eine Reihenfolge
                ist; die Linie verbindet, was nacheinander geschieht. */}
            <div className="relative mt-6 max-w-[52ch]">
              <span
                aria-hidden="true"
                className="absolute bottom-4 left-[13px] top-4 w-[2px] rounded-full bg-line"
              />
              {STATIONEN.map((s, i) => (
                <div
                  key={s.titel}
                  className={cn(
                    "relative flex items-start gap-3.5",
                    i < STATIONEN.length - 1 && "pb-5"
                  )}
                >
                  <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-line bg-paper text-[0.8rem] font-semibold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[0.95rem] font-semibold text-ink">{s.titel}</p>
                    <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-muted">
                      {s.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="min-w-0">
          {/* BEWUSST OHNE Einblende-Umschlag (Runde 31): Die Geraete
              stehen sofort, und die EINE Bewegung der Stelle ist das
              Telefon, das sich beim Scrollen vor den Laptop schiebt. */}
          {/* An der rechten Containerkante (ml-auto), siehe
              Kopf-Kommentar. lg:pr-8 bis 1279: Im Band 1024 bis 1279
              endet der Container 32 px vor der Fensterkante, der
              Geraete-Schatten malt bis 63 px nach rechts; Safari
              zaehlt die Malflaeche zum scrollbaren Bereich und macht
              die Seite schiebbar, Chrome nicht (Inhaber-Befund
              26.08.2026, Geometrie gemessen). Ab 1280 reicht der
              Buehnen-Abstand von selbst, die Kanten-Gleichheit bei
              1440 (152 zu 152) bleibt exakt. */}
          <div className="mx-auto w-full max-w-[660px] sm:min-w-0 lg:mx-0 lg:ml-auto lg:pr-8 min-[1280px]:pr-0">
            {/* Unter sm nur das Telefon (abgenommene Form) */}
            <div className="sm:hidden">
              <AnfragenMoment />
            </div>
            {/* Ab sm: MacBook mit echter Anfragen-Ansicht, das
                Telefon schiebt sich beim Scrollen davor. Die ganze
                Gruppe ist Illustration (aria-hidden im Telefon,
                leeres alt am Bild), Zeiger-Ereignisse laufen durch.
                pb reserviert den Ueberhang des Telefons. */}
            {/* pb-14 reserviert den Telefon-Ueberhang unter der
                Geraetebasis: Die v4-Leinwand (Weg-3-Entscheid des
                Inhabers, 26.08.2026) endet wieder exakt an der
                Geraetebasis und der rechten Geraetekante (beide 0 px
                Abstand, gemessen), der Schatten kommt als gerechneter
                geraete-schatten aus derselben Stelle wie im
                Kopfbereich. */}
            <div
              ref={geraeteRef}
              className="relative hidden select-none pb-14 sm:block"
            >
              {/* v4 vom 26.08.2026 (Neu-Export ohne Canva-Hintergrund): Bild
                  OHNE eingebauten Schatten, der gerechnete
                  geraete-schatten ist wieder AN und folgt der
                  Geraeteform statt der Bildkante. Neuer Name wegen der
                  Ein-Jahr-Kopfzeile. Die Dunkel-Fassung liegt NUR als
                  Quelle in assets/mockup-quellen/: Die oeffentliche
                  Seite hat genau eine Fassung (dunkel gibt es nur im
                  Konto und Admin, lib/farbmodus.ts), eine nie
                  abgerufene Datei hat in public/ nichts verloren
                  (Inhaber, 26.08.2026). */}
              <Image
                src="/images/mockups/anfragen-hell-macbook-v4.webp"
                alt=""
                width={2158}
                height={1285}
                sizes="(max-width: 1023px) 88vw, 660px"
                className="geraete-schatten h-auto w-full"
              />
              <m.div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1 right-0 w-[302px]"
                style={schiebt ? { transform: telefonWeg } : undefined}
              >
                <div className="origin-bottom-right scale-[0.56] lg:scale-[0.62]">
                  <AnfragenMoment />
                </div>
              </m.div>
            </div>
            {/* Die Randnotiz: unter dem Telefon, angebunden durch die
                kurze Linie von der Geraetekante herab. Am Telefon
                mittig unter dem Geraet, ab sm unter dem Telefon
                rechts. Einblendung einmalig beim Hinsehen (Zustaende
                siehe Kopf-Kommentar, Punkt 1). */}
            <div
              ref={notizRef}
              aria-hidden="true"
              className="sm:flex sm:justify-end"
            >
              <div className="text-center sm:w-[230px]">
                <span
                  className={cn(
                    "mx-auto block h-4 w-[2px] origin-top bg-accent opacity-75",
                    notiz === "an" && "transition-transform duration-[450ms] ease-swift",
                    notiz === "versteckt" ? "scale-y-0" : "scale-y-100"
                  )}
                />
                <p
                  className={cn(
                    "mx-auto mt-1.5 max-w-[300px] text-center text-[0.88rem] leading-normal text-accent-deep",
                    notiz === "an" &&
                      "transition-[opacity,transform] delay-100 duration-[450ms] ease-swift",
                    notiz === "versteckt"
                      ? "translate-y-1 opacity-0"
                      : "translate-y-0 opacity-100"
                  )}
                >
                  Sie legen fest: keine Besichtigung ohne Nachweis
                </p>
              </div>
            </div>
            {/* Gleiche Sprache wie unter dem Hero-Geraet (Inhaber,
                26.08.2026, Vereinheitlichung). AUSNAHME unter sm mit
                Ansage: Dort steht nur das GEBAUTE Telefon, und "eine
                echte Ansicht" waere gelogen; der abgenommene
                Beispiel-Satz bleibt dort stehen. */}
            <Kennzeichen className="sm:hidden">Beispielansicht mit Beispieldaten</Kennzeichen>
            <Kennzeichen className="hidden sm:block">
              Eine echte Ansicht aus der Anwendung, mit Beispieldaten.
            </Kennzeichen>
          </div>
        </div>
      </div>
    </section>
  );
}
