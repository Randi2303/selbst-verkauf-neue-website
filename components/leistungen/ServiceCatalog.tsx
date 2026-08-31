"use client";

import Link from "next/link";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ServiceCard from "@/components/leistungen/ServiceCard";
import Reveal from "@/components/ui/Reveal";
import { navPrefetch } from "@/lib/passwortschutz";
import { scrollToId } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { SERVICES, siteConfig, type ServiceCategoryId, type ServicePhaseId } from "@/site.config";

/**
 * Leistungskatalog in drei Phasen: reine Informations- und Katalogseite
 * (kompakte Phasen-Leiste, Objektart-Filter, Karten mit Preisen).
 * Zusammengestellt wird bewusst NUR im Wunsch-Paket-Konfigurator; der
 * Weg dorthin steht in der Leiste, auf jeder Karte und in der Box am
 * Seitenende.
 */
export default function ServiceCatalog() {
  const [category, setCategory] = useState<ServiceCategoryId>("haus");
  const [activePhase, setActivePhase] = useState<ServicePhaseId>("aufbereitung");
  const sectionRefs = useRef<Partial<Record<ServicePhaseId, HTMLElement | null>>>({});
  const reduced = useReducedMotion();

  // Scroll-Spy: die Phase, deren Abschnitt zuletzt die obere Marke passiert hat
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const line = window.scrollY + window.innerHeight * 0.35;
        let current: ServicePhaseId = "aufbereitung";
        for (const phase of siteConfig.servicePhases) {
          const el = sectionRefs.current[phase.id];
          if (el && el.offsetTop <= line) current = phase.id;
        }
        setActivePhase((prev) => (prev === current ? prev : current));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* Phasen-Leiste, bleibt beim Scrollen sichtbar */}
      <div className="sticky top-[64px] z-30 -mx-5 px-5 py-3 sm:top-[68px]">
        <div className="flex flex-wrap items-center gap-3">
          <nav
            aria-label="Phasen des Verkaufs"
            className="inline-flex rounded-full border border-line bg-background/85 p-1.5 shadow-soft backdrop-blur-lg"
          >
            {siteConfig.servicePhases.map((phase) => (
              <button
                key={phase.id}
                type="button"
                aria-current={activePhase === phase.id}
                onClick={() => scrollToId(`phase-${phase.id}`)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-[0.88rem] font-medium transition-colors duration-200",
                  activePhase === phase.id ? "bg-primary text-background" : "text-ink-muted hover:text-ink"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[0.72rem] font-semibold tabular-nums",
                    activePhase === phase.id ? "bg-background/20" : "bg-surface"
                  )}
                >
                  {phase.nr}
                </span>
                <span className="hidden sm:inline">{phase.label}</span>
              </button>
            ))}
          </nav>

          {/* Objektart-Filter */}
          {/* MIT UMBRUCH, sonst passt "Mehrfamilienhaus" nicht mehr:
              Die drei Knöpfe brauchen zusammen rund 310 px, auf einem
              320 px breiten Bildschirm bleiben abzüglich der Ränder 280.
              Ein inline-flex ohne Umbruch schiebt die Seite dann seitlich
              auf. Der Radius ist bewusst rounded-3xl statt rounded-full:
              in einer Zeile sieht das bei dieser Höhe gleich aus, in zwei
              Zeilen bleibt die Form heil.
              DIESELBE STELLE GIBT ES IM KONFIGURATOR, siehe
              components/wunsch-paket/Konfigurator.tsx. */}
          <div
            role="group"
            aria-label="Objektart wählen"
            className="inline-flex max-w-full flex-wrap rounded-3xl border border-line bg-background/85 p-1.5 shadow-soft backdrop-blur-lg"
          >
            {siteConfig.serviceCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={category === cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[0.85rem] font-medium transition-colors duration-200",
                  category === cat.id ? "bg-surface-tint text-primary" : "text-ink-muted hover:text-ink"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Der klare Weg zum Zusammenstellen, dauerhaft sichtbar */}
          <Link
            prefetch={navPrefetch}
            href="/wunsch-paket"
            className="btn-primary ml-auto hidden !px-5 !py-2.5 text-[0.88rem] md:inline-flex"
          >
            Zum Wunsch-Paket
            <ArrowRight size={15} strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      {/* Bruttopreise für Verbraucher, Text zentral in site.config.ts */}
      <p className="mt-2 text-[0.8rem] text-ink-muted">{siteConfig.vatNote}</p>

      {/* Drei Phasen-Abschnitte */}
      {siteConfig.servicePhases.map((phase) => {
        const phaseServices = SERVICES.filter(
          (service) => service.phase === phase.id && service.categories.includes(category)
        );
        return (
          <section
            key={phase.id}
            id={`phase-${phase.id}`}
            ref={(el) => {
              sectionRefs.current[phase.id] = el;
            }}
            className="scroll-mt-40 pt-14 md:pt-16"
          >
            <Reveal>
              <div className="max-w-2xl">
                <p className="eyebrow">Phase {phase.nr}</p>
                <h2 className="mt-2 font-heading text-h3 text-ink">{phase.label}</h2>
                <p className="mt-2.5 leading-relaxed text-ink-muted">{phase.intro}</p>
              </div>
            </Reveal>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`${phase.id}-${category}`}
                className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -6 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {phaseServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </m.div>
            </AnimatePresence>
          </section>
        );
      })}

      {/* Hinweis-Box zum Konfigurator */}
      <Reveal className="mt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-4xl border border-primary/10 bg-surface-tint p-8 shadow-card md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="font-heading text-h3 text-ink">Ihr Wunsch-Paket, Ihr Tempo</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-ink-muted">
              Stellen Sie sich Ihr Wunsch-Paket zusammen, Sie erhalten Ihr
              persönliches Angebot innerhalb von 24 Stunden.
            </p>
          </div>
          <Link href="/wunsch-paket" className="btn-primary shrink-0">
            Zum Wunsch-Paket
            <ArrowRight size={16} strokeWidth={1.8} />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
