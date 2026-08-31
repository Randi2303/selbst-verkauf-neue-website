"use client";

import { AnimatePresence, m, useScroll, useTransform } from "framer-motion";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registriereScrollAbnehmer } from "@/lib/scroll-sync";
import { ChevronDown, MessageSquareText, Play, Send, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import AppointmentCard from "@/components/mockups/AppointmentCard";
import ChatTelefon from "@/components/mockups/ChatTelefon";
import { Kennzeichen } from "@/components/mockups/Geraete";
import PortaleBereitKarte from "@/components/mockups/PortaleBereitKarte";
import PriceRangeCard from "@/components/mockups/PriceRangeCard";
import HandDrawnUnderline from "@/components/ui/HandDrawnUnderline";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";
import { PORTALE_AUFZAEHLUNG } from "@/config/portale";

type Step = {
  nr: string;
  icon: LucideIcon;
  title: string;
  text: string;
  /** Die echten Einzelschritte hinter dem Schritt, aufklappbar */
  details: string[];
  visual: (active: boolean) => ReactNode;
  /** Kennzeichnung unter dem Ausschnitt, wo Beispieldaten zu sehen sind */
  kennzeichen?: string;
};

const STEPS: Step[] = [
  {
    nr: "01",
    icon: MessageSquareText,
    title: "Einfach starten",
    text: "Erfassen Sie Ihr Objekt im Gespräch oder im Formular und laden Sie Ihre Unterlagen hoch. Die KI schlägt die Werte vor, Sie bestätigen jeden einzelnen, bevor er gilt.",
    details: [
      "Objektdaten erfassen",
      "Unterlagen-Checkliste durchgehen",
      "Grundbuchauszug und Energieausweis organisieren, mit Unterstützung",
      "Fotos planen",
    ],
    visual: () => <ChatTelefon />,
    kennzeichen: "Beispielansicht mit Beispieldaten",
  },
  {
    nr: "02",
    icon: TrendingUp,
    title: "Wert kennen",
    text: "Sie erhalten eine realistische Preisspanne, berechnet über die Datenschnittstelle unseres Bewertungspartners. Damit wählen Sie in Ruhe die Preisstrategie, die zu Ihren Zielen passt.",
    details: [
      "Marktdaten und Vergleichsobjekte ansehen",
      "Preisspanne verstehen",
      "Preisstrategie festlegen: vorsichtig, empfohlen oder ambitioniert",
    ],
    visual: () => <PriceRangeCard />,
    kennzeichen: "Beispielwerte",
  },
  {
    nr: "03",
    icon: Send,
    title: "Sichtbar werden",
    text: `Aus Ihren Angaben entsteht ein professionelles Exposé, als gestaltetes PDF und online. Mit einem Klick veröffentlichen Sie es auf ${PORTALE_AUFZAEHLUNG}.`,
    details: [
      "Exposé-Texte und Pflichtangaben nach GEG",
      "Fotos und Grundriss einbinden",
      "Veröffentlichung auf den Portalen",
      "Laufzeit im Blick behalten",
    ],
    visual: (active) => <PortaleBereitKarte active={active} />,
  },
  {
    nr: "04",
    icon: ShieldCheck,
    title: "Sicher verkaufen",
    text: "Sie entscheiden, ob Interessenten vor der Besichtigung einen Bonitätsnachweis einreichen. Besichtigungen planen Sie im Terminplaner, und wenn Sie möchten, ist Ihr Makler per Video oder Telefon dabei, bis zum Notartermin.",
    details: [
      "Anfragen beantworten und vorsortieren",
      "Bonitätsnachweis anfordern",
      "Besichtigungen führen",
      "Verhandeln",
      "Kaufvertrag und Notartermin",
      "Übergabe mit Protokoll",
    ],
    visual: () => <AppointmentCard />,
    kennzeichen: "Beispielansicht mit Beispieldaten",
  },
];

/** Abstand vom Listenanfang bis zur Mitte der Marker (h-11 / 2) */
const MARKER_CENTER = 22;

/** Platz am Linienende für den Schlusspunkt (halbe Punkthöhe) */
const SCHLUSSPUNKT_INSET = 7;

/**
 * Bühne für die Mockups: sanfte Parallax (das Mockup scrollt minimal
 * langsamer als der Text) und für das iPhone eine leichte
 * Perspektiv-Neigung, die sich beim Heranscrollen zur Frontalansicht
 * aufrichtet. Nur transform und opacity, bei reduzierter Bewegung
 * steht alles still.
 */
function MockupBuehne({
  active,
  kippen = false,
  kennzeichen,
  children,
}: {
  active: boolean;
  kippen?: boolean;
  kennzeichen?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /* Hydrationssicherer Haken (Runde 31): perspective- und
     transform-Stile der Buehne stehen im Server-HTML und duerfen erst
     nach dem Mount auf die Einstellung reagieren. */
  const reduced = nutztReduzierteBewegung();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [26, -26]);
  const rotateY = useTransform(scrollYProgress, [0, 0.45], [-9, 0], { clamp: true });
  const rotateX = useTransform(scrollYProgress, [0, 0.45], [3, 0], { clamp: true });

  /* Unter lg stehen Ausschnitt und Kennzeichnung MITTIG: mittig wirkt
     platziert, links wirkt gerutscht (Inhaber, 24.08.2026). Die
     Karten-Ausschnitte tragen dafuer mx-auto, das Kennzeichen
     zentriert von sich aus. */
  /* ACHSEN-REGEL DES ZEITSTRAHLS (Inhaber, Runde 27): Alle
     Ausschnitte stehen auf EINER senkrechten Achse, der Mitte der
     Ausschnitt-Spalte. Ein Ausschnitt ist mal breiter und mal
     schmaler, seine Mitte wandert nicht. Vorher stand die Buehne ab
     lg auf w-auto und rechtsbuendig: Die Mitten lagen gemessen auf
     drei Achsen (1137, 1113 und 1128 bei 1440 Pixeln). Deshalb fuellt
     die Buehne jetzt die Spalte (lg:w-full), und der innere Kasten
     zentriert; die Spalte selbst ist so breit wie der breiteste
     Ausschnitt (350), der damit weiter auf der Container-Randlinie
     endet. */
  return (
    <div
      ref={ref}
      style={kippen && !reduced ? { perspective: 1100 } : undefined}
      className={cn(
        "w-full max-w-[350px] justify-self-center transition-all duration-500 ease-swift sm:max-w-none lg:w-full lg:self-center",
        active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-40"
      )}
    >
      <m.div
        style={
          reduced
            ? undefined
            : kippen
              ? { y, rotateY, rotateX, transformStyle: "preserve-3d" }
              : { y }
        }
      >
        <div className="flex justify-center">{children}</div>
        {kennzeichen ? <Kennzeichen>{kennzeichen}</Kennzeichen> : null}
      </m.div>
    </div>
  );
}

/**
 * Ablauf-Zeitstrahl: Die Fortschrittslinie füllt sich exakt mit dem
 * Scroll-Fortschritt (GSAP ScrollTrigger, scrub: true) und läuft beim
 * Hochscrollen rückwärts. Jeder Schritt aktiviert sich, sobald die
 * Linienspitze seinen Marker erreicht, und deaktiviert sich wieder.
 */
export default function ProcessTimeline() {
  const listRef = useRef<HTMLOListElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** Der Schlusspunkt füllt sich, sobald die Linie unten ankommt */
  const [endeErreicht, setEndeErreicht] = useState(false);
  const [openStep, setOpenStep] = useState<number | null>(null);
  const hasToggledRef = useRef(false);
  const reducedMotion = nutztReduzierteBewegung();

  // Nach dem Auf- oder Zuklappen ändern sich die Höhen im Zeitstrahl,
  // deshalb wird die Scroll-Geometrie neu vermessen. Beim ersten Mount
  // bewusst nicht, sonst bricht ein gerade laufender Anker-Scroll ab.
  useEffect(() => {
    if (openStep === null && !hasToggledRef.current) return;
    hasToggledRef.current = true;
    const timer = setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => clearTimeout(timer);
  }, [openStep]);

  useEffect(() => {
    const list = listRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    if (!list || !track || !fill) return;

    const geometry = { centers: [] as number[], trackTop: 0, trackHeight: 1, listHeight: 1 };

    // Marker-Positionen relativ zur Liste vermessen (auch nach Resize/Refresh)
    const measure = () => {
      const items = itemRefs.current.filter(Boolean) as HTMLLIElement[];
      if (items.length < 2) return;
      geometry.centers = items.map((li) => li.offsetTop + MARKER_CENTER);
      geometry.trackTop = geometry.centers[0];
      geometry.listHeight = list.offsetHeight;
      /*
       * Die Linie endet nicht am letzten Marker, sondern begleitet auch
       * den Inhalt des letzten Schritts bis ganz nach unten (gerade auf
       * dem Handy steht der Inhalt UNTER dem Marker) und schließt dort
       * mit dem Schlusspunkt ab.
       */
      geometry.trackHeight = Math.max(
        1,
        geometry.listHeight - geometry.trackTop - SCHLUSSPUNKT_INSET
      );
      track.style.top = `${geometry.trackTop}px`;
      track.style.height = `${geometry.trackHeight}px`;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Ohne Animation: Linie voll, alle Schritte aktiv
      measure();
      fill.style.transform = "scaleY(1)";
      const frame = requestAnimationFrame(() => {
        setActiveIndex(STEPS.length - 1);
        setEndeErreicht(true);
      });
      window.addEventListener("resize", measure);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", measure);
      };
    }

    gsap.registerPlugin(ScrollTrigger);

    // Lenis-Scrolls an ScrollTrigger melden: Die Kopplung liegt hier
    // (nicht im globalen SmoothScroll-Provider), damit GSAP nur mit
    // dieser Sektion geladen wird
    const scrollAbmelden = registriereScrollAbnehmer(ScrollTrigger.update);

    // Linie und aktive Schritte aus dem Scroll-Fortschritt ableiten
    const applyProgress = (progress: number) => {
      const tip = progress * geometry.listHeight;
      const scale = Math.min(1, Math.max(0, (tip - geometry.trackTop) / geometry.trackHeight));
      gsap.set(fill, { scaleY: scale });

      let idx = -1;
      for (let i = 0; i < geometry.centers.length; i++) {
        if (tip >= geometry.centers[i] - 2) idx = i;
      }
      setActiveIndex((prev) => (prev === idx ? prev : idx));
      const fertig = scale >= 0.995;
      setEndeErreicht((prev) => (prev === fertig ? prev : fertig));
    };

    const ctx = gsap.context(() => {
      measure();
      gsap.set(fill, { scaleY: 0, transformOrigin: "top center" });

      ScrollTrigger.create({
        trigger: list,
        // Start und Ende referenzieren dieselbe Viewport-Linie (70 %),
        // dadurch trifft die Linienspitze die Marker exakt beim Passieren.
        start: "top 70%",
        end: "bottom 70%",
        scrub: true,
        // Nach Resize oder Font-Nachladen neu vermessen und sofort anwenden,
        // damit der Zustand nicht erst beim nächsten Scroll stimmt.
        onRefresh: (self) => {
          measure();
          applyProgress(self.progress);
        },
        onUpdate: (self) => applyProgress(self.progress),
      });

      /* wirkung: gewollt still, dies frischt nach dem Laden der
         Schriften nur die MASSE des Zeitstrahls auf. Bleibt es aus,
         sitzen die Punkte ein paar Pixel neben ihrer Linie, bis der
         Besucher weiterrollt oder das Fenster aendert; dann rechnet
         ScrollTrigger ohnehin neu. Fuer einen Versatz von Pixeln eine
         Meldung zu zeigen, waere die groessere Stoerung. */
      // Nach dem Laden der Schriften stimmen die Maße wieder
      // wirkung: gewollt still, der Grund steht im Kommentar darueber
      document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
    }, list);

    return () => {
      scrollAbmelden();
      ctx.revert();
    };
  }, []);

  return (
    /* overflow-x-clip: Das Telefon der Buehne traegt seit der
       Vereinheitlichung (26.08.2026) den geraete-schatten als
       Filter; Kappung auf Abschnitts-Ebene wie bei Stimmen und
       Anfragen, damit Safari die Malflaeche nie zur Seitenbreite
       zaehlt. */
    <section id="so-funktionierts" className="section-pad scroll-mt-24 overflow-x-clip">
      <div className="container-page">
        <SectionHeading
          eyebrow="So funktioniert’s"
          lines={[
            "So verkaufen Sie Ihre Immobilie",
            <HandDrawnUnderline key="u">ohne Makler</HandDrawnUnderline>,
          ]}
          sub={
            <>
              Vier Schritte, eine Linie. Sie bestimmen das Tempo, die Plattform
              behält den Überblick.
              <span className="mt-3 block">
                Ein Verkauf besteht aus über 20 Einzelschritten. Sie sehen immer
                genau den, der gerade dran ist, den Rest sortiert die Plattform.
              </span>
            </>
          }
        />

        <ol ref={listRef} className="relative mt-16 md:mt-20">
          {/* Fortschrittslinie: Spur plus füllender Balken, unten der
              Schlusspunkt als bewusstes Ende des Weges */}
          {/* Linie und Marker gibt es erst ab lg: Unterhalb stehen die
              Motive auf der Viewport-Mitte, und mit eingerueckter
              Linie standen sie 32 px daneben (Achsen-Durchgang,
              24.08.2026, wie im freigegebenen Entwurf) */}
          <div
            ref={trackRef}
            aria-hidden="true"
            className="absolute left-[21px] top-[22px] hidden w-[2px] rounded-full bg-line lg:block"
          >
            <div ref={fillRef} className="absolute inset-0 origin-top rounded-full bg-primary" />
            <span
              className={cn(
                "absolute -bottom-[13px] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 transition-all duration-500 ease-swift",
                endeErreicht
                  ? "scale-110 border-primary bg-primary shadow-soft"
                  : "border-line bg-paper"
              )}
            />
          </div>

          {STEPS.map((step, i) => {
            const active = activeIndex >= i;
            return (
              <li
                key={step.nr}
                id={`schritt-${i + 1}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="relative scroll-mt-28 pb-12 last:pb-0 md:pb-14 lg:pl-20"
              >
                {/* Marker auf der Linie */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-0 z-10 hidden h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-500 ease-swift lg:flex",
                    active
                      ? "scale-105 border-primary bg-primary text-background shadow-soft"
                      : "border-line bg-paper text-ink-muted"
                  )}
                >
                  <step.icon size={19} strokeWidth={1.5} />
                </span>

                {/* minmax(0,1fr) statt der Voreinstellung: Ein Rasterfeld ist von
                    sich aus mindestens so breit wie sein laengstes Wort. Bei
                    320 px schob die Ueberschrift dieses Schritts das Feld auf
                    250 px, obwohl daneben nur 216 px Platz sind, und die ganze
                    Startseite liess sich seitlich wischen. */}
                {/* 350 statt 360: Die Spalte ist exakt so breit wie der
                    breiteste Ausschnitt, damit dessen Kante auf der
                    Container-Randlinie liegt und die gemeinsame Achse
                    (siehe MockupBuehne) zugleich die Spaltenmitte ist. */}
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[1fr,350px] lg:gap-14">
                  {/* Text des Schritts */}
                  <div
                    className={cn(
                      "origin-left transition-all duration-500 ease-swift",
                      active ? "opacity-100" : "opacity-50"
                    )}
                  >
                    <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-accent-deep">
                      Schritt {step.nr}
                    </p>
                    <h3
                      className={cn(
                        "mt-2 font-heading text-h3 transition-transform duration-500 ease-swift",
                        active ? "scale-[1.02]" : "scale-100"
                      )}
                      style={{ transformOrigin: "left center" }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[46ch] leading-relaxed text-ink-muted">{step.text}</p>

                    {/* Hinweis auf das Erklärvideo zu diesem Schritt */}
                    <p className="mt-4 flex items-center gap-2 text-[0.85rem] font-medium text-primary">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-tint">
                        <Play size={11} strokeWidth={2} className="ml-0.5" />
                      </span>
                      Erklärvideo zu diesem Schritt inklusive
                    </p>

                    {/* Aufklappbarer Blick auf die echten Einzelschritte */}
                    <button
                      type="button"
                      onClick={() => setOpenStep(openStep === i ? null : i)}
                      aria-expanded={openStep === i}
                      aria-controls={`schritt-details-${i}`}
                      className="mt-4 flex items-center gap-2 rounded-md text-[0.9rem] font-medium transition-colors hover:text-primary"
                    >
                      Was dahinter steckt
                      <m.span
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-ink-muted"
                        animate={{ rotate: openStep === i ? 180 : 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                      >
                        <ChevronDown size={13} strokeWidth={2} />
                      </m.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {openStep === i ? (
                        <m.div
                          id={`schritt-details-${i}`}
                          className="overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                        >
                          <ul className="max-w-[46ch] space-y-2 pt-4">
                            {step.details.map((detail) => (
                              <li key={detail} className="flex items-start gap-2.5 text-[0.92rem] leading-relaxed text-ink-muted">
                                <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </m.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Passendes Mockup zum Schritt, vertikal zentriert für
                      einen gleichmäßigen Rhythmus; das iPhone (Schritt 1)
                      bekommt zusätzlich die Perspektiv-Neigung */}
                  <MockupBuehne active={active} kippen={i === 0} kennzeichen={step.kennzeichen}>
                    {step.visual(active)}
                  </MockupBuehne>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
