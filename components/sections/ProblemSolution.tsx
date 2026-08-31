"use client";

import { CheckCircle2, FileStack, HelpCircle, Percent, PhoneIncoming } from "lucide-react";
import BrandName from "@/components/ui/BrandName";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { siteConfig } from "@/site.config";
import { PORTALE_AUFZAEHLUNG } from "@/config/portale";

const PROBLEMS = [
  {
    icon: FileStack,
    text: "Grundbuch, Energieausweis, Grundrisse. Unterlagen sammeln sich nicht von selbst.",
  },
  {
    icon: HelpCircle,
    text: "Welcher Preis ist realistisch? Zu hoch schreckt ab, zu niedrig verschenkt Geld.",
  },
  {
    icon: PhoneIncoming,
    text: "Anrufe von Fremden zu jeder Tageszeit, ohne zu wissen, wer wirklich kaufen kann.",
  },
  {
    icon: Percent,
    text: "Oder doch ein Makler? Dann sind bis zu 3,57 % Verkäuferprovision fällig.",
  },
];

const SOLUTIONS = [
  "Geführter Ablauf mit Checklisten und Erinnerungen",
  "Realistische Preisspanne auf Datenbasis",
  `Veröffentlichung auf ${PORTALE_AUFZAEHLUNG}`,
  /* Der Nachweis ist freiwillig, die Entscheidung liegt beim
     Verkaeufer (Inhaber, 24.08.2026) */
  "Wenn Sie es wollen: nur Interessenten mit Bonitätsnachweis",
  "Makler auf Abruf, Übernahme jederzeit möglich",
];

/**
 * Problem und Lösung: zwei Blöcke, die beim Scrollen von links und
 * rechts einschieben. Mobil stehen sie untereinander.
 */
export default function ProblemSolution() {
  return (
    // overflow-hidden: Die seitlich einschiebenden Karten dürfen nie eine
    // horizontale Scrollbar erzeugen
    <section className="section-pad overflow-hidden">
      <div className="container-page">
        <SectionHeading
          eyebrow={
            <>
              Warum <BrandName />
            </>
          }
          lines={[
            "Ein Immobilienverkauf ist groß.",
            <>
              Mit <span className="text-accent">System</span> wird er machbar.
            </>,
          ]}
          sub="Viele Eigentümer möchten ihr Haus oder ihre Wohnung privat verkaufen und zögern trotzdem. Meist fehlt nicht der Wille, sondern Struktur und Rückendeckung."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Links: das Problem */}
          <Reveal x={-44} y={0} className="h-full">
            <div className="h-full rounded-3xl border border-line/70 bg-surface p-8 shadow-card md:p-10">
              <h3 className="font-heading text-h3 text-ink">
                Allein fühlt sich ein Verkauf schnell zu groß an
              </h3>
              <ul className="mt-7 space-y-5">
                {PROBLEMS.map((item) => (
                  <li key={item.text} className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/70 bg-background text-ink-muted">
                      <item.icon size={19} strokeWidth={1.5} />
                    </span>
                    <p className="text-[0.98rem] leading-relaxed text-ink-muted">{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Rechts: die Lösung */}
          <Reveal x={44} y={0} className="h-full">
            <div className="h-full rounded-3xl border border-primary/10 bg-surface-tint p-8 shadow-card md:p-10">
              <h3 className="font-heading text-h3 text-ink">
                Mit <BrandName /> haben Sie ein System im Rücken
              </h3>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-muted">
                Die geführte Plattform übernimmt die Struktur, vom ersten Foto
                bis zum Notartermin. Und wenn Sie eine Frage haben, ist ein
                echter Makler nur einen Anruf entfernt.
              </p>
              <ul className="mt-6 space-y-3.5">
                {SOLUTIONS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={19} strokeWidth={1.8} className="mt-0.5 shrink-0 text-success" />
                    <p className="text-[0.98rem] leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-8 rounded-2xl border border-line/60 bg-paper px-5 py-4 text-[0.95rem]">
                Festpreis ab{" "}
                <strong className="font-semibold text-accent-deep">
                  {siteConfig.packages[0].monthly} € im Monat
                </strong>
                , statt Provision beim Verkauf.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
