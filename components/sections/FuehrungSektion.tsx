"use client";

import { m, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BrowserFenster, Kennzeichen } from "@/components/mockups/Geraete";
import Reveal from "@/components/ui/Reveal";
import { FUEHRUNGEN } from "@/config/fuehrungen";

/*
 * "Der erste Tag": die Fuehrung aus Runde 22, direkt vor den Paketen.
 * Beruhigung genau vor der Preisentscheidung: Ihr Konto erklaert sich
 * selbst, und man sieht es hier, statt es glauben zu muessen.
 *
 * Titel, Text und Standzeile der Blase kommen aus config/fuehrungen.ts,
 * demselben Katalog, den das Konto abspielt. Die Bewegung ist die des
 * Produkts: Loch und Blase gleiten EINMAL zur Karte, mit der Kurve der
 * echten Fuehrung (easeInOutQuart), dann ist Ruhe.
 */

const UEBERSICHT = FUEHRUNGEN.find((f) => f.kennung === "uebersicht");
const SCHRITT_INDEX = Math.max(
  0,
  UEBERSICHT?.schritte.findIndex((s) => s.titel === "Das ist Ihr nächster Schritt.") ?? 0
);
const SCHRITT = UEBERSICHT?.schritte[SCHRITT_INDEX];
const SCHRITTE_GESAMT = UEBERSICHT?.schritte.length ?? 5;

/** Kurve der echten Fuehrung (easeInOutQuart, siehe components/fuehrung) */
const FUEHRUNGS_KURVE = [0.77, 0, 0.175, 1] as const;

function MiniNaechsteSchritte() {
  return (
    <div className="rounded-[14px] border border-line/70 bg-paper px-[15px] py-[13px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="whitespace-nowrap font-heading text-[0.88rem] font-semibold">
          Nächste Schritte
        </span>
        <span className="whitespace-nowrap text-[0.66rem] text-ink-muted">1 von 5</span>
      </div>
      <p className="mt-0.5 text-[0.72rem] text-ink-muted">Phase 3 von 5: Vermarktung</p>
      <div className="mt-2.5 rounded-xl bg-surface-tint px-[13px] py-[11px]">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-primary">
          Ihr nächster Schritt
        </p>
        <p className="mt-1 font-heading text-[0.86rem] font-semibold leading-snug">
          Eigene Fotos hochgeladen und ausgewählt
        </p>
      </div>
    </div>
  );
}

export default function FuehrungSektion() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-18% 0px" });
  const reduced = useReducedMotion();
  /** false: Loch auf "Ihr Objekt", true: angekommen bei "Naechste Schritte" */
  const [angekommen, setAngekommen] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setAngekommen(true);
      return;
    }
    const timer = setTimeout(() => setAngekommen(true), 1100);
    return () => clearTimeout(timer);
  }, [inView, reduced]);

  return (
    <section className="section-pad">
      {/* Der kurze Text sitzt MITTIG zum hohen Ausschnitt (Inhaber,
          Feinschliff 24.08.2026): items-start liess links unter drei
          Zeilen Text ein totes Loch von 196 px stehen, und der fast
          bildschirmhohe Abschnitt wirkte unfertig. Gemeinsame
          Oberkante gilt weiter fuer nahezu gleich hohe Spalten. */}
      <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="min-w-0">
          <Reveal>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-accent-deep">
              Der erste Tag
            </p>
            <h2 className="mt-2.5 font-heading text-h2">Ihr Konto erklärt sich selbst.</h2>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-ink-muted">
              Beim ersten Öffnen führt Sie eine kurze Erklärung durch Ihr Konto,
              Schritt für Schritt, in Ihrem Tempo. Sie lässt sich jederzeit
              beenden und später wieder aufrufen.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="min-w-0">
          <Reveal delay={0.1}>
            <div aria-hidden="true" className="select-none">
              <BrowserFenster>
                {/* Breite Fassung: Konto-Miniatur unter der dunklen Lage */}
                <div className="relative hidden h-[340px] bg-surface lg:block">
                  <div className="absolute inset-0 grid grid-cols-2 gap-3.5 p-[18px]">
                    <MiniNaechsteSchritte />
                    <div>
                      <div className="rounded-[14px] border border-line/70 bg-paper px-[15px] py-[13px]">
                        <span className="font-heading text-[0.95rem] font-semibold">Ihr Objekt</span>
                        <p className="mt-1.5 text-[0.72rem] text-ink-muted">Angebotspreis</p>
                        <p className="text-[1rem] font-semibold tabular-nums">449.000 €</p>
                      </div>
                    </div>
                  </div>
                  {/* Die dunkle Lage mit dem Loch: gleitet einmal zur Karte */}
                  <m.div
                    className="absolute left-3 top-3 h-[208px] rounded-[14px]"
                    style={{
                      width: "calc(50% - 5px)",
                      boxShadow:
                        "0 0 0 2px rgb(var(--farbe-primary)), 0 0 0 9999px rgba(35, 39, 42, 0.72)",
                    }}
                    initial={false}
                    animate={
                      angekommen
                        ? { x: 0, height: 208 }
                        : { x: "calc(100% + 10px)", height: 96 }
                    }
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.3, ease: FUEHRUNGS_KURVE }
                    }
                  />
                  {/* Die Blase: verschwindet nie, gleitet mit */}
                  <m.div
                    className="absolute bottom-[18px] right-4 w-[272px] rounded-2xl bg-paper p-4"
                    style={{
                      boxShadow:
                        "0 2px 4px rgba(35, 39, 42, 0.05), 0 18px 44px rgba(35, 39, 42, 0.12)",
                    }}
                    initial={false}
                    animate={angekommen ? { x: 0 } : { x: 26 }}
                    transition={
                      reduced ? { duration: 0 } : { duration: 0.3, ease: FUEHRUNGS_KURVE }
                    }
                  >
                    <p className="text-[0.95rem] font-semibold">{SCHRITT?.titel}</p>
                    <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-muted">
                      {SCHRITT?.text}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[0.8rem]">
                      <span className="text-[0.73rem] text-ink-muted">
                        Schritt {SCHRITT_INDEX + 1} von {SCHRITTE_GESAMT}
                      </span>
                      <span className="font-medium">Beenden</span>
                      <span className="ml-auto rounded-full bg-primary px-4 py-1.5 text-[0.8rem] font-semibold text-background">
                        Weiter
                      </span>
                    </div>
                  </m.div>
                </div>

                {/* Schmale Fassung: Loch samt Inhalt und Blase, kein
                    geschrumpftes Konto (anders geschnitten, nicht kleiner) */}
                <div className="bg-[rgba(35,39,42,0.88)] px-4 pb-5 pt-6 lg:hidden">
                  <div
                    className="mx-auto max-w-[230px] rounded-[14px]"
                    style={{ boxShadow: "0 0 0 2px rgb(var(--farbe-primary))" }}
                  >
                    <MiniNaechsteSchritte />
                  </div>
                  <div
                    className="mx-auto mt-5 max-w-[340px] rounded-2xl bg-paper p-4"
                    style={{
                      boxShadow:
                        "0 2px 4px rgba(35, 39, 42, 0.05), 0 18px 44px rgba(35, 39, 42, 0.3)",
                    }}
                  >
                    <p className="text-[0.95rem] font-semibold">{SCHRITT?.titel}</p>
                    <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-muted">
                      {SCHRITT?.text}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[0.8rem]">
                      <span className="text-[0.73rem] text-ink-muted">
                        Schritt {SCHRITT_INDEX + 1} von {SCHRITTE_GESAMT}
                      </span>
                      <span className="font-medium">Beenden</span>
                      <span className="ml-auto rounded-full bg-primary px-4 py-1.5 text-[0.8rem] font-semibold text-background">
                        Weiter
                      </span>
                    </div>
                  </div>
                </div>
              </BrowserFenster>
            </div>
            <Kennzeichen>So begrüßt Sie Ihr Konto beim ersten Öffnen</Kennzeichen>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
