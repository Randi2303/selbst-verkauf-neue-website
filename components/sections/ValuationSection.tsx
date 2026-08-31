"use client";

import Link from "next/link";
import { m, useInView } from "framer-motion";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";
import { CheckCircle2, MapPin } from "lucide-react";
import { useRef } from "react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Kennzeichen } from "@/components/mockups/Geraete";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { siteConfig } from "@/site.config";

/* DIE VIER ZAHLEN-KACHELN SIND GEFALLEN (Inhaber, 24.08.2026): Es
   waren Werbezahlen des Bewertungspartners neben unserer
   Leistungsbehauptung, ohne dass ein Vertrag besteht. Sie kommen erst
   mit dem Vertrag zurueck, dann mit Beleg. */

/* DER AVM-SATZ IST GEFALLEN (Inhaber, Runde 27): "KI-gestuetztes
   Bewertungsmodell (AVM), DSGVO-konform auf deutschen Servern" traf
   den Partner nicht, und was wir nicht belegen koennen, schreiben wir
   nicht hin. Die Punkte reden ueber die Qualitaet, nicht die Technik;
   jeder ist aus dem Produkt belegbar (Report mit Vergleichsobjekten
   und Marktdaten, Spanne mit den drei Strategien). */
const PUNKTE = [
  "Ein vollständiger Bewertungsreport statt einer Sofort-Zahl, berechnet aus Ihren konkreten Objektdaten",
  "Echte Vergleichsobjekte und Marktentwicklung aus Ihrer Region",
  "Eine realistische Preisspanne als Verhandlungsgrundlage: vorsichtig, empfohlen oder ambitioniert",
];

/**
 * Bewertungs-Sektion: erklärt, woher die Preisspanne kommt. Der
 * Partnername kommt aus site.config.ts (valuationPartner) und lässt
 * sich dort auf eine neutrale Formulierung umschalten.
 */
export default function ValuationSection() {
  const partner = siteConfig.valuationPartner;
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: "-15% 0px" });
  /* Hydrationssicherer Haken (Runde 31), siehe lib/reduzierte-bewegung.ts */
  const reduced = nutztReduzierteBewegung();

  return (
    <section id="bewertung" className="section-pad scroll-mt-24">
      {/* Kopf und Punkte links, Karte rechts UNTEN BUENDIG zum Text
          (Inhaber, Runde 27): Die mittige Lage aus Runde 25 halbierte
          das Loch nur, die Karte endete weiter 93 px vor dem Text und
          hing sichtbar zu hoch. Unten buendig schliessen Karte und
          Text auf einer Kante zur Fusszeile ab; die Luft sitzt oben
          neben der Ueberschrift, wo sie hingehoert. */}
      <div className="container-page grid gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-end lg:gap-14">
        <div>
          <SectionHeading
          eyebrow="Fundierte Bewertung statt Bauchgefühl"
          lines={["Keine Schätzung. Eine Bewertung,", "wie Banken sie nutzen."]}
          /* Formulierung vom Inhaber abgenommen (Runde 27), bewusst in
             der schwaecheren Form "wie sie auch Banken und Finanzierer
             nutzen": Solange nicht belegt ist, was der Partner im
             Einzelnen tut, sagen wir lieber weniger. Der Vergleich
             beschreibt, WAS eine kostenlose Sofort-Schaetzung ist,
             nicht wer sie anbietet. */
          sub={
            partner.show ? (
              <>
                Eine kostenlose Sofort-Schätzung liefert nach drei Klicks eine
                grobe Zahl aus wenigen Eckdaten. Ihre Preisspanne entsteht
                anders: über die Report-Schnittstelle unseres
                Bewertungspartners Sprengnetter, mit Daten und Verfahren, wie
                sie auch Banken und Finanzierer nutzen.
              </>
            ) : (
              <>
                Eine kostenlose Sofort-Schätzung liefert nach drei Klicks eine
                grobe Zahl aus wenigen Eckdaten. Ihre Preisspanne entsteht
                anders: über die Report-Schnittstelle unseres
                Bewertungspartners, {partner.neutralLabel}, mit Daten und
                Verfahren, wie sie auch Banken und Finanzierer nutzen.
              </>
            )
          }
        />

          <div className="mt-8">
            {/* Drei kurze Punkte */}
            <ul className="space-y-3.5">
              {PUNKTE.map((punkt) => (
                <li key={punkt} className="flex items-start gap-3">
                  <CheckCircle2 size={19} strokeWidth={1.8} className="mt-0.5 shrink-0 text-success" />
                  <p className="text-[0.97rem] leading-relaxed">{punkt}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[0.9rem] text-ink-muted">
              Was hinter einer Wertermittlung steckt, erklärt{" "}
              <Link href="/lexikon#lexikon-W" className="font-medium text-primary transition-colors hover:text-primary-dark">
                unser Lexikon unter Wertermittlung
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Gecodete Bewertungskarte im Stil der bestehenden Mockups.
            Karte und Kennzeichnung teilen EINEN Rahmen von 440 px und
            stehen ab lg auf der rechten Randlinie: Die Ausrichtung
            liegt am Reveal, denn justify-self wirkt nur am direkten
            Rasterkind, an einem inneren Element verpufft sie (genau
            das war der zu grosse Rechtsabstand, 24.08.2026). */}
        <Reveal
          delay={0.1}
          className="w-full max-w-[440px] justify-self-center lg:justify-self-end"
        >
          <div ref={cardRef} aria-hidden="true" className="select-none">
              <div className="rounded-3xl border border-line/70 bg-paper p-6 shadow-card sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[0.9rem] font-medium">
                    <MapPin size={15} strokeWidth={1.8} className="text-primary" />
                    Musterstraße 12, Frankfurt
                  </p>
                  <span className="rounded-full bg-surface-tint px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-primary">
                    Bewertung
                  </span>
                </div>

                <p className="mt-5 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Realistische Preisspanne
                </p>
                <p className="mt-1.5 font-heading text-[1.7rem] font-semibold tabular-nums tracking-[-0.01em]">
                  <AnimatedNumber value={460_000} duration={1.5} delay={0.2} /> bis{" "}
                  <AnimatedNumber value={510_000} duration={1.5} delay={0.35} /> €
                </p>

                {/* Spanne mit Markierung */}
                <div className="relative mt-5 h-2 rounded-full bg-surface">
                  <m.div
                    className="absolute inset-y-0 left-[14%] rounded-full bg-primary/75"
                    initial={false}
                    animate={
                      reduced
                        ? { width: "72%" }
                        : { width: inView ? "72%" : "6%" }
                    }
                    transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                  />
                  <span className="absolute left-[56%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-paper bg-accent shadow-soft" />
                </div>
                <div className="mt-2 flex justify-between text-[0.7rem] text-ink-muted">
                  <span>vorsichtig</span>
                  <span>empfohlen</span>
                  <span>ambitioniert</span>
                </div>

                {/* KEINE erfundenen Vergleichsobjekte mehr: Die Spanne
                    hier ist ein Beispiel, und genau das steht dran */}
                <p className="mt-5 border-t border-line/60 pt-4 text-[0.85rem] leading-relaxed text-ink-muted">
                  Ihre Spanne rechnen wir mit Marktdaten, sobald Sie starten.
                </p>
                <p className="mt-2 text-[0.75rem] text-ink-muted">
                  Datenbasis: {partner.show ? partner.name : "unser Bewertungspartner"}
                </p>
            </div>
            <Kennzeichen>Beispielwerte</Kennzeichen>
          </div>
        </Reveal>

        {/* Dezente Fußzeile, ueber beide Spalten */}
        <Reveal className="mt-12 lg:col-span-2">
          <p className="max-w-3xl text-[0.85rem] leading-relaxed text-ink-muted">
            Die automatisierte Bewertung ersetzt kein Verkehrswertgutachten.
            Auf Wunsch vermitteln wir Ihnen{" "}
            <Link href="/leistungen" className="font-medium text-primary transition-colors hover:text-primary-dark">
              ein vollständiges Gutachten über unsere Leistungen
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
