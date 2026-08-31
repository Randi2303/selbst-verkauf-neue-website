"use client";

import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderOpen,
  MonitorPlay,
  Play,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

type Feature = { icon: LucideIcon; title: string; text: string };

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "KI-Erfassung im Gespräch",
    text: "Erzählen Sie von Ihrer Immobilie, wie in einer Unterhaltung, gern auch diktiert. Die KI füllt daraus die Objektmaske, und Sie bestätigen jeden Wert, bevor er gilt.",
  },
  {
    icon: FileText,
    title: "Exposé als PDF und online",
    text: "Professionell gestaltet, mit allen Pflichtangaben nach GEG. Als hochwertiges PDF zum Teilen und als Online-Exposé auf den Portalen.",
  },
  /* Die Bonitaets-Karte ist in die eigene Anfragen-Sektion
     aufgegangen (Schaufenster-Runde 24.08.2026): dort traegt der
     Moment im Telefon die Botschaft, statt dass eine Karte sie
     behauptet. */
  {
    icon: CalendarDays,
    title: "Terminplaner",
    /* AM 15.08.2026 AUF DEN STAND GEBRACHT. Vorher stand hier
       "Interessenten buchen Besichtigungen in Zeitfenstern, die Sie
       vorgeben". Das war einmal richtig und beschreibt heute nur noch
       einen von vier Wegen: Es gibt Einzeltermine, Zeitfenster,
       Gruppentermine und die Selbstbuchung aus hinterlegten Zeiten
       (lib/besichtigungen.ts, lib/verfuegbarkeit-server.ts). Der
       Kunde entscheidet also freier, als der Text sagte. */
    text: "Sie legen Ihre Zeiten einmal fest, Interessenten suchen sich selbst eine freie aus. Einzeltermine, Zeitfenster und Gruppentermine sind möglich. Einladungen, Erinnerungen und Absagen verwaltet die Plattform für Sie.",
  },
  {
    icon: BarChart3,
    title: "Statistiken zu Ihrem Verkauf",
    /* EHRLICH FORMULIERT (24.08.2026): Die Portal-Aufrufe sind noch an
       keine Schnittstelle angebunden; im Konto steht woertlich
       "sobald Ihr Inserat online ist", und genau das sagt auch das
       Schaufenster. Die alte Karte versprach "Sie sehen jederzeit,
       wie oft ...", und das war heute nicht wahr. */
    text: "Termine, Anfragen und Meilensteine in Zahlen. Die Aufrufe je Portal kommen dazu, sobald Ihr Inserat online ist.",
  },
  {
    icon: FolderOpen,
    title: "Unterlagen mit Checkliste",
    text: "Grundbuchauszug, Energieausweis, Grundrisse. Alles liegt an einem Ort, mit einer Liste, die Ihnen sagt, was noch fehlt und wofür es gebraucht wird.",
  },
  {
    icon: Video,
    title: "Makler per Video und Telefon",
    text: "Echte Makler mit regionaler Erfahrung beantworten Ihre Fragen persönlich. Vom Preisgespräch bis zur Verhandlung, genau dann, wenn Sie möchten.",
  },
];

/**
 * Funktions-Grid: sechs Karten mit Icon, Titel und zwei Sätzen.
 * Hover hebt die Karte an (nur auf Geräten mit Maus), das Icon bewegt
 * sich kurz. Beim Scrollen faden die Karten gestaffelt ein.
 */
export default function FeatureGrid() {
  return (
    <section id="funktionen" className="section-pad scroll-mt-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Funktionen"
          lines={[
            "Alles, was der Verkauf braucht,",
            <>
              an <span className="text-accent">einem Ort</span>
            </>,
          ]}
          sub="Wer privat verkauft, hat hier für Haus wie Wohnung die Werkzeuge, die sonst nur Profis nutzen."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.08}>
              <article className="group h-full rounded-3xl border border-line/70 bg-paper p-7 shadow-soft transition-all duration-300 ease-swift hoverable:-translate-y-1.5 hoverable:shadow-lift">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-tint text-primary transition-transform duration-300 ease-swift group-hoverable:-rotate-3 group-hoverable:scale-110">
                  <feature.icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-heading text-[1.3rem] font-semibold tracking-[-0.01em]">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-muted">{feature.text}</p>
              </article>
            </Reveal>
          ))}

          {/* Breite Karte für die Erklärvideos, mit Thumbnail-Platzhalter */}
          <Reveal className="sm:col-span-2 lg:col-span-3" delay={0.08}>
            <article className="group grid overflow-hidden rounded-3xl border border-line/70 bg-paper shadow-soft transition-all duration-300 ease-swift hoverable:-translate-y-1.5 hoverable:shadow-lift md:grid-cols-[1fr,340px]">
              <div className="p-7 md:p-9">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-tint text-primary transition-transform duration-300 ease-swift group-hoverable:-rotate-3 group-hoverable:scale-110">
                  <MonitorPlay size={22} strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-heading text-[1.3rem] font-semibold tracking-[-0.01em]">
                  Erklärvideos zu jedem Schritt
                </h3>
                <p className="mt-2.5 max-w-[52ch] text-[0.95rem] leading-relaxed text-ink-muted">
                  Kurz und verständlich erklärt, was als Nächstes zu tun ist. Auf
                  Wunsch geht ein Berater die Schritte persönlich mit Ihnen durch.
                </p>
              </div>
              {/* TODO: echte Videos einbinden, bis dahin nur Thumbnail-Platzhalter */}
              <div aria-hidden="true" className="relative m-7 mt-0 overflow-hidden rounded-2xl bg-gradient-to-br from-surface-tint via-surface to-surface md:m-6 md:ml-0 md:mt-6">
                <svg
                  className="absolute inset-0 h-full w-full text-primary/10"
                  viewBox="0 0 340 190"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <path d="M40 120 110 60l70 60" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M58 105v52h104v-52" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="262" cy="58" r="34" />
                  <path d="M212 157h96" strokeLinecap="round" />
                </svg>
                <div className="relative flex aspect-video items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-background shadow-lift transition-transform duration-300 ease-swift group-hoverable:scale-110">
                    <Play size={20} strokeWidth={2} className="ml-1" />
                  </span>
                </div>
                <span className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-[0.72rem] font-medium text-ink">
                  Schritt 01: Einfach starten
                </span>
                <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.72rem] font-medium tabular-nums text-background">
                  2:40
                </span>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
