"use client";

import Image from "next/image";
import { KeyRound } from "lucide-react";
import { scrollToId } from "@/lib/scroll";
import HandDrawnUnderline from "@/components/ui/HandDrawnUnderline";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

/**
 * Abschluss-CTA: große, warme Sektion mit Foto und letztem Handlungsimpuls.
 */
export default function FinalCta() {
  return (
    <section className="section-pad pt-8 md:pt-10">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-4xl border border-line/60 bg-gradient-to-br from-surface via-background to-surface-tint px-6 py-14 shadow-card sm:px-12 md:px-16 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr,0.95fr]">
            <div>
              <SectionHeading
                eyebrow="Der erste Schritt"
                lines={["Bereit für den", "ersten Schritt?"]}
                sub={
                  <>
                    Starten Sie in <HandDrawnUnderline>Ihrem Tempo</HandDrawnUnderline>. Legen Sie
                    Ihr Objekt an, schauen Sie sich in Ruhe um und entscheiden Sie
                    dann, wie viel Unterstützung Sie möchten.
                  </>
                }
              />
              <Reveal delay={0.15} className="mt-9">
                <div>
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
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <div className="relative">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift">
                  {/* TODO: durch eigenes Foto ersetzen (Person am Küchentisch mit Laptop) */}
                  <Image
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1400&auto=format&fit=crop"
                    alt="Helles Wohnzimmer mit Sofa und warmem Licht"
                    fill
                    sizes="(max-width: 1024px) 92vw, 520px"
                    className="foto-warm object-cover"
                  />
                </div>
                {/* Kleine schwebende Karte für einen menschlichen Moment */}
                <div className="absolute -bottom-5 left-5 flex items-center gap-2.5 rounded-2xl border border-line/70 bg-paper py-3 pl-3.5 pr-5 shadow-lift">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-tint text-primary">
                    <KeyRound size={17} strokeWidth={1.5} />
                  </span>
                  <span>
                    <span className="block text-[0.85rem] font-semibold leading-tight">
                      Notartermin bestätigt
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
                      Übergabe in 6 Wochen
                    </span>
                  </span>
                </div>
                {/* Kennzeichnung wie an allen Ausschnitten: erfundene
                    Zahlen sind als Beispiel erkennbar (Inhaber,
                    24.08.2026: Kennzeichnung statt Neutralisierung) */}
                <p className="mt-9 text-center text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-ink-muted">
                  Beispiel mit Beispieldaten
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
