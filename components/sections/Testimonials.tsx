"use client";

import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { BadgeCheck, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import BrandName from "@/components/ui/BrandName";
import PartnerName from "@/components/ui/PartnerName";
import PortraetKreis from "@/components/ui/PortraetKreis";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { MENSCHEN } from "@/config/menschen";
import type { MenschenBilder } from "@/lib/menschen-bilder";
import { scrollToId } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * Die beiden begleitenden Makler für die Karte am Ende des Sliders,
 * aus der einen Menschen-Quelle (config/menschen.ts).
 */
const MAKLER = MENSCHEN.filter((mensch) => mensch.gruppe === "makler");

/** Wartezeit zwischen den automatischen Slider-Wechseln, leicht änderbar */
const AUTOPLAY_TAKT_MS = 4500;

/** Deutlich als Beispiel markierte Stimmen, Situationen aus der Maklerpraxis */
const VOICES = [
  {
    quote:
      "Wir wussten nicht, wo wir anfangen sollen. Die Checkliste und die Preisspanne haben uns Ruhe gegeben, der Rest kam Schritt für Schritt.",
    name: "Familie M. aus Wiesbaden",
    context: "verkaufte ein Reihenhaus",
  },
  {
    quote:
      "Dass die Plattform Anfragen vorsortiert, hat alles verändert. Wir haben nur noch mit Menschen gesprochen, die wirklich kaufen wollten.",
    name: "Beate K. aus Mainz",
    context: "verkaufte eine Eigentumswohnung",
  },
  {
    quote:
      "Beim Preisgespräch war unser Makler per Video dabei. Verkauft haben wir selbst, und genau so hat es sich auch angefühlt.",
    name: "Jonas und Lea T. aus Hanau",
    context: "verkauften ein Einfamilienhaus",
  },
];

/**
 * Vertrauens-Slider: horizontales Karussell (Embla) mit Beispielstimmen
 * und einer Karte zum Maklerteam dahinter. Wischen, Ziehen und Pfeile.
 * Die Bild-Existenz der Makler-Porträts kommt als Prop aus der
 * Server-Seite (lib/menschen-bilder.ts).
 */
export default function Testimonials({ bilder }: { bilder: MenschenBilder }) {
  /*
   * containScroll "trimSnaps": Die letzte Scroll-Position richtet sich
   * am Container-ENDE aus, die letzte Karte steht damit vollständig im
   * sichtbaren Bereich statt rechts angeschnitten zu bleiben.
   */
  /*
   * WheelGestures: Erst damit lässt sich der Slider auch mit dem
   * Trackpad bzw. Mausrad horizontal in einem Zug durchwischen; ohne
   * das Modul reagiert Embla nur auf Klick und Ziehen. Vertikales
   * Scrollen der Seite bleibt unberührt (dominante Achse entscheidet).
   */
  /*
   * duration ist bei Embla ein Dämpfungsfaktor, keine Zeit: Kurze
   * Pfeil-Sprünge bleiben zackig, die lange Autoplay-Fahrt über alle
   * Karten gleitet ruhig.
   */
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: "start", containScroll: "trimSnaps", duration: 38 },
    [WheelGesturesPlugin()]
  );
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  /*
   * Punkte entsprechen den tatsächlich anfahrbaren Positionen
   * (scrollSnapList), nicht der Kartenanzahl: Je nach Fensterbreite sind
   * mehrere Karten gleichzeitig sichtbar und es gibt weniger Snaps.
   */
  const [snaps, setSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    setSnaps(emblaApi.scrollSnapList());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // Initialen Zustand im nächsten Frame setzen, danach über Embla-Events
    const frame = requestAnimationFrame(onSelect);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  /**
   * Automatisches Pendeln: Nach jeder Wartezeit fährt der Slider in
   * einer flüssigen Bewegung bis ganz ans Ende (letzte Karte voll
   * sichtbar) und beim nächsten Takt genauso zurück zum Anfang. Hover
   * und Berührung pausieren, jede Bewegung (auch manuelle Pfeile und
   * Punkte) stellt den Takt neu, damit direkt nach einer Bedienung
   * nichts weiterspringt. Bei prefers-reduced-motion läuft gar kein
   * Autoplay.
   */
  const autoplayPausiert = useRef(false);
  useEffect(() => {
    if (!emblaApi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;
    const stelleTakt = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, AUTOPLAY_TAKT_MS);
    };
    const tick = () => {
      if (!autoplayPausiert.current) {
        const ende = emblaApi.scrollSnapList().length - 1;
        const aktuell = emblaApi.selectedScrollSnap();
        // Pendel: unterwegs oder am Anfang geht es ans Ende, vom Ende zurück
        emblaApi.scrollTo(aktuell >= ende ? 0 : ende);
      }
      stelleTakt();
    };

    const pausiere = () => {
      autoplayPausiert.current = true;
    };
    const weiter = () => {
      autoplayPausiert.current = false;
      stelleTakt();
    };

    const wurzel = emblaApi.rootNode();
    wurzel.addEventListener("mouseenter", pausiere);
    wurzel.addEventListener("mouseleave", weiter);
    emblaApi.on("pointerDown", pausiere);
    emblaApi.on("pointerUp", weiter);
    emblaApi.on("select", stelleTakt);
    stelleTakt();

    return () => {
      window.clearTimeout(timer);
      wurzel.removeEventListener("mouseenter", pausiere);
      wurzel.removeEventListener("mouseleave", weiter);
      emblaApi.off("pointerDown", pausiere);
      emblaApi.off("pointerUp", weiter);
      emblaApi.off("select", stelleTakt);
    };
  }, [emblaApi]);


  return (
    /* overflow-x-clip auf ABSCHNITTS-Ebene (Runde 31, Befund aus dem
       echten Safari des Inhabers, per Mess-Sonde: 246 px Ueberstand
       bei 1324 px Fenster): Die Erzaehler-Spur des Karussells ist
       bauartbedingt breiter als die Seite; ihr Kapp-Rahmen haelt das
       ein, aber solange der Einblende-Umschlag darueber seinen
       Anfahr-Versatz traegt, verrechnet Safari die Kappung falsch und
       zaehlt die volle Spur zur Seitenbreite; die Seite wird seitlich
       schiebbar, bis die Einblendung ausloest. Chrome rechnet
       korrekt. Die Kappung HIER, oberhalb des Umschlags, stellt
       Safaris Rechnung in jedem Zustand richtig; optisch aendert sich
       nichts, und die Breiten-Messung bleibt fuer echte Flucht
       ausserhalb dieses Abschnitts sehend. */
    <section className="section-pad overflow-x-clip">
      <div className="container-page">
        <SectionHeading
          eyebrow="Vertrauen"
          /* KEINE Pilotphase mehr im Text: Es gab keine, also koennen
             keine Situationen daraus stammen (Inhaber, 24.08.2026).
             Die Situationen kommen aus der Maklerpraxis des Partners. */
          lines={["Drei Situationen", "aus der Praxis"]}
          sub="Wie wir sie aus der täglichen Maklerarbeit kennen, als Beispiele aufbereitet und klar markiert. Echte Kundenstimmen ergänzen wir zum Start."
        />

        <Reveal className="mt-12">
          <div
            aria-roledescription="Karussell"
            aria-label="Drei Situationen aus der Praxis"
            className="overflow-hidden"
            ref={emblaRef}
          >
            <div className="-ml-5 flex touch-pan-y">
              {VOICES.map((voice) => (
                <div
                  key={voice.name}
                  className="min-w-0 flex-[0_0_88%] pl-5 sm:flex-[0_0_58%] lg:flex-[0_0_36%]"
                >
                  <figure className="flex h-full flex-col rounded-3xl border border-line/70 bg-paper p-7 shadow-soft">
                    <div className="flex items-start justify-between gap-4">
                      <Quote size={26} strokeWidth={1.5} className="text-primary/50" />
                      <span className="rounded-full border border-accent-deep/30 bg-accent/10 px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-accent-deep">
                        Beispiel
                      </span>
                    </div>
                    <blockquote className="mt-4 flex-1 text-[1.02rem] leading-relaxed">
                      „{voice.quote}“
                    </blockquote>
                    <figcaption className="mt-6">
                      <p className="text-[0.95rem] font-semibold">{voice.name}</p>
                      <p className="mt-0.5 text-[0.85rem] text-ink-muted">{voice.context}</p>
                    </figcaption>
                  </figure>
                </div>
              ))}

              {/* Karte zum Maklerteam */}
              <div className="min-w-0 flex-[0_0_88%] pl-5 sm:flex-[0_0_58%] lg:flex-[0_0_36%]">
                <div className="flex h-full flex-col rounded-3xl border border-primary/15 bg-surface-tint p-7 shadow-soft">
                  {/* Seit Runde 31 die ECHTEN Porträts der beiden
                      begleitenden Makler statt des früheren
                      Unsplash-Platzhalters: zwei überlappende Kreise,
                      dieselben Bilder wie in der Menschen-Sektion */}
                  <div className="flex items-center -space-x-3">
                    {MAKLER.map((makler) => (
                      <PortraetKreis
                        key={makler.name}
                        mensch={makler}
                        bilder={bilder}
                        sizes="64px"
                        className="h-16 w-16 ring-4 ring-surface-tint"
                        initialenKlasse="font-heading text-[1.05rem]"
                      />
                    ))}
                  </div>
                  <h3 className="mt-5 font-heading text-[1.3rem] font-semibold tracking-[-0.01em]">
                    Echte Makler dahinter
                  </h3>
                  {/* "Hinter X steht Y" klang, als sei der Partner die
                      Firma hinter der Plattform. Er gehört nicht dazu,
                      er kommt dazu (Inhaber, Runde 31). */}
                  <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-ink-muted">
                    Die <PartnerName /> aus dem Münsterland ist der begleitende
                    Makler-Partner von <BrandName />. Sie gehört nicht zur
                    Plattform, sie kommt dazu, wenn Sie sie rufen.
                  </p>
                  <p className="mt-3 text-[0.88rem]">
                    <a
                      href="#menschen"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToId("menschen");
                      }}
                      className="font-medium text-primary transition-colors hover:text-primary-dark"
                    >
                      Mehr zu den Menschen dahinter
                    </a>
                  </p>
                  <p className="mt-5 flex items-center gap-2 text-[0.85rem] font-medium text-primary">
                    <BadgeCheck size={17} strokeWidth={1.8} />
                    {siteConfig.brokerPartner.combinedExperience}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Steuerung */}
          <div className="mt-8 flex items-center justify-between">
            {/* Punkte mit unsichtbar vergrößerter Trefferfläche (44px hoch):
                Die sichtbare Optik und die Abstände bleiben identisch,
                vollwertige 44px-Ziele stehen daneben (Pfeiltasten) */}
            <div className="-mx-1 flex">
              {snaps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Zu Karte ${i + 1} wechseln`}
                  aria-current={selected === i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className="group flex h-11 items-center px-1"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      selected === i ? "w-6 bg-primary" : "w-2 bg-line group-hover:bg-ink-muted/40"
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                aria-label="Vorherige Karte"
                disabled={!canPrev}
                onClick={() => emblaApi?.scrollPrev()}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-ink shadow-soft transition-all duration-200 disabled:opacity-35 hoverable:bg-surface"
              >
                <ChevronLeft size={19} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Nächste Karte"
                disabled={!canNext}
                onClick={() => emblaApi?.scrollNext()}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-ink shadow-soft transition-all duration-200 disabled:opacity-35 hoverable:bg-surface"
              >
                <ChevronRight size={19} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
