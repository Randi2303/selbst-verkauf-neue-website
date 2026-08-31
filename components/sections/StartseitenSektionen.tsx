"use client";

import dynamic from "next/dynamic";
import { gespraechSichtbar } from "@/config/gespraech-buchen";
import type { MenschenBilder } from "@/lib/menschen-bilder";

/*
 * Sektionen unterhalb des ersten Bildschirms laden als eigene Chunks,
 * das Server-Rendering bleibt aktiv (Standard ssr: true), das HTML ist
 * also unverändert vollständig und Reveal rendert serverseitig sichtbar
 * (initial={false}). Sichtbar ändert sich nichts, nur die Hydration von
 * Hero und Navigation wartet nicht mehr auf Rechner, Zeitstrahl (GSAP),
 * Carousel und Co.
 *
 * Wichtig: Dieser Wrapper ist bewusst eine Client-Komponente. Nur dort
 * greift das Code-Splitting von next/dynamic; aus Server-Komponenten
 * heraus wird ein dynamisch importierter Client-Baustein NICHT
 * gesplittet (siehe Next-Doku, Guide "Lazy Loading").
 */
const ProcessTimeline = dynamic(() => import("@/components/sections/ProcessTimeline"));
const ArbeitsblattSektion = dynamic(() => import("@/components/sections/ArbeitsblattSektion"));
const ValuationSection = dynamic(() => import("@/components/sections/ValuationSection"));
const AnfragenSektion = dynamic(() => import("@/components/sections/AnfragenSektion"));
const FeatureGrid = dynamic(() => import("@/components/sections/FeatureGrid"));
const FuehrungSektion = dynamic(() => import("@/components/sections/FuehrungSektion"));
const Pricing = dynamic(() => import("@/components/sections/Pricing"));
const Vergleich = dynamic(() => import("@/components/sections/Vergleich"));
const GespraechSektion = dynamic(() => import("@/components/sections/GespraechSektion"));
const MenschenDahinter = dynamic(() => import("@/components/sections/MenschenDahinter"));
const Testimonials = dynamic(() => import("@/components/sections/Testimonials"));
const Faq = dynamic(() => import("@/components/sections/Faq"));
const FinalCta = dynamic(() => import("@/components/sections/FinalCta"));

/** Alle Startseiten-Sektionen unterhalb von Hero und Problem/Lösung */
export default function StartseitenSektionen({ menschenBilder }: { menschenBilder: MenschenBilder }) {
  return (
    <>
      {/* Die Menschen dahinter GANZ VORN, direkt nach Problem und
          Lösung (Inhaber, Runde 31: einer der wichtigsten Punkte der
          Seite): Die Haltung "Wir haben selbst-verkauf.de gegründet,
          weil..." schließt unmittelbar an das Versprechen an, und wer
          dahintersteckt, ist geklärt, BEVOR die Seite in die
          Einzelheiten geht. Die abgenommenen Paarungen (Zeitstrahl vor
          Arbeitsblatt, Führung vor Preisen, Preise vor Vergleich)
          bleiben unangetastet. */}
      <MenschenDahinter bilder={menschenBilder} />
      <ProcessTimeline />
      {/* Direkt nach den vier Schritten: Dort ist die Frage "schaffe
          ich das alles?" am lautesten, und das Arbeitsblatt ist die
          Antwort als Gegenstand */}
      <ArbeitsblattSektion />
      <ValuationSection />
      {/* Der Moment "Finanzierung bestätigt" mit der einen Randnotiz
          der Seite */}
      <AnfragenSektion />
      <FeatureGrid />
      {/* Die Fuehrung direkt vor den Paketen: Beruhigung genau vor der
          Preisentscheidung */}
      <FuehrungSektion />
      <Pricing />
      {/* Der ehrliche Vergleich DIREKT unter den Paketen: Genau hier
          entsteht der Einwand "woanders ist ein Inserat billiger", und
          genau hier wird er beantwortet statt versteckt. */}
      <Vergleich />
      {/* Das kurze Gespräch, unmittelbar hinter dem Preisblock: Der
          Zweifel entsteht an den Paketen, der Vergleich beantwortet
          die Zahlenseite, und was keine Zahl beantwortet, fängt dieser
          Abschnitt auf. Zwischen Pakete und Vergleich darf er NICHT,
          das Paar ist in Runde 25 abgenommen und begründet (siehe
          Vergleich.tsx). Öffentlich erscheint er erst mit
          hinterlegtem Buchungslink, in der Entwicklung immer. */}
      {gespraechSichtbar() ? <GespraechSektion bilder={menschenBilder} /> : null}
      {/* Die Stimmen folgen direkt auf den Vergleich; ihre letzte
          Karte verweist nach oben auf die Menschen-Sektion */}
      <Testimonials bilder={menschenBilder} />
      <Faq />
      <FinalCta />
    </>
  );
}
