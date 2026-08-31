"use client";

import Image from "next/image";
import { m, useScroll, useTransform } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Kennzeichen } from "@/components/mockups/Geraete";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";
import { scrollToId } from "@/lib/scroll";
import { siteConfig } from "@/site.config";

/*
 * Vier Haken, vier Einwände in Erzählreihenfolge: Was kostet es
 * (Festpreis), sieht mich jemand (Portale), wer hilft mir (Makler),
 * wie komme ich raus (Bindung). Die Portal-Zeile spiegelt das
 * Dashboard daneben mit den Aufrufen je Portal.
 *
 * DER VIERTE HAKEN HIESS BIS ZUM 15.08.2026 "Monatlich kündbar", und
 * das war an dieser Stelle falsch: Für monatliche Pakete gelten drei
 * Monate Mindestlaufzeit (PAKET_MINDESTLAUFZEIT_HINWEIS). Es gibt drei
 * verschiedene Sachverhalte, und alle anderen Stellen halten sie
 * auseinander: Pakete mit Mindestlaufzeit, die Makler-Begleitung ohne,
 * und einmalige Leistungen ganz ohne Laufzeit. Der Haken warf alle
 * drei in einen Satz.
 *
 * WARUM ER NICHT ERSATZLOS FÄLLT: Er beantwortet den Einwand "wie
 * komme ich wieder raus", und der wiegt bei jemandem, der schon
 * einmal an einen Makler gebunden war, am schwersten.
 *
 * "Kein Alleinauftrag" beantwortet denselben Einwand, stimmt für alle
 * drei Vertragsarten und enthält keine Zahl, die bei der nächsten
 * Änderung zurückbleiben könnte. Geprüft am 15.08.2026 gegen alle
 * sieben Vertragstexte, den Katalog, die Fragen-Liste und das
 * Lexikon: Nirgends bindet ein Text den Kunden. Das Lexikon erklärt
 * den Begriff bereits ("Wer selbst verkauft, braucht ihn nicht").
 *
 * ACHTUNG BEI DEN AGB: Sie fehlen noch und schreibt der Anwalt. Heute
 * stimmt der Satz, weil nichts Gegenteiliges vereinbart ist. Wer die
 * AGB verfasst, muss ihn ausdrücklich abdecken, sonst wird aus einem
 * richtigen Satz nachträglich ein falscher.
 */
const HERO_CHECKS = [
  "Festpreis statt Provision",
  "Auf den drei großen Portalen",
  "Echte Makler auf Abruf",
  "Kein Alleinauftrag",
];

/**
 * Hero: einzige H1 der Seite, daneben das animierte Dashboard-Mockup.
 * Der Einstieg fadet gestaffelt per CSS ein (läuft auch ohne JavaScript),
 * das Mockup bekommt ein leichtes Parallax-Schweben beim Scrollen.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  /* Hydrationssicherer Haken (Runde 31): Der Parallax-Wert steht als
     Stil im Server-HTML; die Einstellung darf ihn erst nach dem Mount
     umschalten, sonst weicht der erste Client-Render ab. */
  const reduced = nutztReduzierteBewegung();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -52]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-40">
      {/* Ruhige Farbwolken im Hintergrund */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-40 -top-44 h-[560px] w-[560px] rounded-full bg-surface-tint opacity-80 blur-3xl" />
        <div className="absolute -left-32 bottom-[-180px] h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* min-w-0 an beiden Spalten: Grid-Kinder dürfen sonst nicht unter
          ihre Inhaltsbreite schrumpfen und schieben auf schmalen Geräten
          die ganze Spalte über den Viewport hinaus */}
      {/* items-start: Der Ausschnitt beginnt auf der Oberkante der
          Textspalte (Regel vom 24.08.2026) */}
      <div className="container-page grid items-start gap-16 lg:grid-cols-[1.04fr,0.96fr] lg:gap-10">
        <div className="min-w-0">
          <p className="anim-rise inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-1.5 text-[0.82rem] font-medium text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Für private Eigentümer in Deutschland
          </p>

          <h1 className="mt-6 font-heading text-display opsz-display text-ink">
            <span className="anim-rise block" style={{ "--rise-delay": "0.08s" } as React.CSSProperties}>
              Immobilie <span className="text-accent">selbst</span> verkaufen.
            </span>
            <span className="anim-rise block" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
              Die Provision bleibt bei Ihnen.
            </span>
          </h1>

          <p
            className="anim-rise mt-7 max-w-[34rem] text-[1.13rem] leading-relaxed text-ink-muted"
            style={{ "--rise-delay": "0.26s" } as React.CSSProperties}
          >
            Echte Makler begleiten Sie von der Bewertung bis zum Notartermin.
            Zum Festpreis ab {siteConfig.packages[0].monthly} € im Monat, statt
            oft <span className="whitespace-nowrap">über 17.000 €</span>{" "}
            Maklerprovision.
          </p>

          <div
            className="anim-rise mt-9 flex flex-wrap items-center gap-4"
            style={{ "--rise-delay": "0.36s" } as React.CSSProperties}
          >
            <a
              href="#pakete"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("pakete");
              }}
              className="btn-primary"
            >
              Jetzt starten
            </a>
            <a
              href="#so-funktionierts"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("so-funktionierts");
              }}
              className="btn-secondary"
            >
              So funktioniert’s
              <ChevronDown size={17} strokeWidth={1.8} />
            </a>
          </div>

          <ul
            className="anim-rise mt-10 flex flex-wrap gap-x-6 gap-y-2.5"
            style={{ "--rise-delay": "0.46s" } as React.CSSProperties}
          >
            {HERO_CHECKS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[0.92rem] text-ink-muted">
                <Check size={15} strokeWidth={2.2} className="text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Das MacBook mit der echten Konto-Uebersicht (Inhaber, Runde
            31: das Geraete-Bild ersetzt den gebauten Ausschnitt; den
            Baustein KontoAusschnitt hat der Inhaber am 26.08.2026 zur
            Loeschung freigegeben, er ist entfernt).
            Die Ansicht auf dem Schirm ist ein echtes Bildschirmfoto
            aus der Anwendung mit dem Vorfuehrkonto, nach unten
            ausblendend. Leichtes Parallax wie zuvor. Die zwei
            Kennzeichnungs-Saetze tragen dieselbe Aussage in zwei
            Laengen: bei 390 wuerde der lange in vier Zeilen brechen,
            deshalb steht dort die kurze Fassung (Inhaber, 24.08.2026) */}
        {/* lg:pr-8 bis 1279: Im Band 1024 bis 1279 endet der Container
            32 px vor der Fensterkante, der Geraete-Schatten malt aber
            bis 63 px nach rechts (Versatz 12 plus dreifache
            Streuung 17). Safari zaehlt diese Malflaeche zum
            scrollbaren Bereich und macht die Seite seitlich
            schiebbar, Chrome nicht (Inhaber-Befund 26.08.2026,
            Geometrie gemessen). Ab 1280 schafft die zentrierte
            Buehne von selbst Abstand. */}
        <m.div
          className="anim-rise relative mx-auto w-full min-w-0 max-w-[300px] px-2 sm:max-w-[480px] sm:px-6 lg:max-w-[600px] lg:pl-0 lg:pr-8 min-[1280px]:pr-0"
          style={{
            ...({ "--rise-delay": "0.3s" } as React.CSSProperties),
            y: reduced ? 0 : parallaxY,
          }}
        >
          {/* Das AUFRICHTEN sitzt auf diesem Wrapper, das Schweben auf
              dem Bild: zwei Elemente, kein Transform-Konflikt (Inhaber,
              26.08.2026; Auflagen und Begruendung am CSS in
              globals.css). Der Wrapper ist ein nackter Block um das
              Bild, das Layout ist mit und ohne ihn identisch. */}
          <div className="geraete-aufrichten">
            <Image
              src="/images/mockups/dashboard-hell-macbook.webp"
              alt="Laptop mit der Verkaufs-Übersicht der Anwendung: Begrüßung, anliegende Aufgaben und Verkaufsfortschritt"
              width={1800}
              height={1784}
              preload
              sizes="(max-width: 639px) 284px, (max-width: 1023px) 432px, 600px"
              className="geraete-schatten geraete-schwebt h-auto w-full select-none"
            />
          </div>
          {/* Der Umbruch gehoert ZWISCHEN die beiden Saetze, nie in
              einen hinein (Inhaber, 24.08.2026): deshalb je Satz ein
              Block */}
          <Kennzeichen className="hidden lg:block">
            <span className="block">Eine echte Ansicht aus der Anwendung, mit Beispieldaten.</span>
            <span className="mt-0.5 block">
              Ihr Konto hat mehr Bereiche und mehr Funktionen, als hier zu
              sehen sind.
            </span>
          </Kennzeichen>
          <Kennzeichen className="lg:hidden">
            <span className="block">Eine echte Ansicht aus der Anwendung, mit Beispieldaten.</span>
            <span className="mt-0.5 block">Ihr Konto kann deutlich mehr.</span>
          </Kennzeichen>
        </m.div>
      </div>
    </section>
  );
}
