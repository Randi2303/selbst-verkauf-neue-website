"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { SERVICE_ICONS } from "@/components/leistungen/serviceIcons";
import PortalLogos from "@/components/ui/PortalLogos";
import { navPrefetch } from "@/lib/passwortschutz";
import { formatEuro } from "@/lib/utils";
import { servicePrice, servicePriceLabel, type SiteService } from "@/site.config";

/**
 * Kontextuelle Zusatz-Links für einzelne Leistungen (interne Verlinkung
 * ins Lexikon, sparsame externe Links auf offizielle Quellen).
 */
const SERVICE_LINKS: Record<string, ReactNode> = {
  energieausweis: (
    <Link href="/lexikon#lexikon-E" className="font-medium text-primary transition-colors hover:text-primary-dark">
      Mehr zum Energieausweis im Lexikon
    </Link>
  ),
  grundrisse: (
    <Link href="/lexikon#lexikon-G" className="font-medium text-primary transition-colors hover:text-primary-dark">
      Mehr zum Grundriss im Lexikon
    </Link>
  ),
  "notar-koordination": (
    <a
      href="https://www.bundesnotarkammer.de/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary transition-colors hover:text-primary-dark"
    >
      Infos der Bundesnotarkammer
      <span className="sr-only"> (öffnet eine externe Seite in neuem Fenster)</span>
    </a>
  ),
};

/**
 * Leistungskarte auf /leistungen: reine Katalog-Karte zum Informieren
 * (Beschreibung, Preise, weiterführende Links). Ausgewählt und
 * zusammengestellt wird bewusst NUR im Wunsch-Paket-Konfigurator, der
 * Weg dorthin steht auf jeder Karte. Feste Slot-Struktur wie überall:
 * Icon, Titel, Beschreibung, flexibler Zwischenraum, Preisblock,
 * Link-Zeile.
 */
export default function ServiceCard({ service }: { service: SiteService }) {
  const Icon = SERVICE_ICONS[service.id];
  const extraLink = SERVICE_LINKS[service.id];

  /** Bei Varianten: Einstiegspreis plus transparente Varianten-Liste */
  const variantenPreise = service.variants
    ? service.variants
        .map((variant) => ({ variant, preis: servicePrice(service, variant) }))
        .filter((v): v is { variant: string; preis: number } => v.preis !== null)
    : [];
  const einstieg = variantenPreise.length
    ? Math.min(...variantenPreise.map((v) => v.preis))
    : null;

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-line/70 bg-paper p-6 shadow-soft transition-[transform,box-shadow] duration-300 ease-swift hoverable:-translate-y-1.5 hoverable:shadow-lift">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-tint text-primary transition-transform duration-300 ease-swift group-hoverable:-rotate-3 group-hoverable:scale-110">
        {Icon ? <Icon size={22} strokeWidth={1.5} /> : null}
      </div>
      <h3 className="mt-4 font-heading text-[1.12rem] font-semibold leading-snug tracking-[-0.01em]">
        {service.name}
      </h3>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">
        {service.description}
        {extraLink ? <span className="mt-1.5 block text-[0.85rem]">{extraLink}</span> : null}
      </p>
      {/* DIE GRENZE STEHT ABGESETZT, nicht im selben Absatz wie das
          Versprechen. Sie ist wichtig und ehrlich und soll bleiben,
          aber wer beides mischt, bekommt keines von beiden gelesen. */}
      {service.einschraenkung ? (
        <p className="mt-2 border-l-2 border-line pl-3 text-[0.83rem] leading-relaxed text-ink-muted">
          {service.einschraenkung}
        </p>
      ) : null}
      {/* Wo veroeffentlicht wird, ohne den Text lesen zu muessen */}
      {service.id === "portal-schaltung" ? (
        <PortalLogos className="mt-3" />
      ) : null}

      {/* Preisblock, durch mt-auto reihenweise auf einer Linie */}
      <div className="mt-auto pt-4">
        {variantenPreise.length > 1 ? (
          <>
            <p className="text-[1.08rem] font-semibold tabular-nums">
              ab {einstieg !== null ? formatEuro(einstieg) : ""}
            </p>
            <ul className="mt-1.5 space-y-1">
              {variantenPreise.map((v) => (
                <li
                  key={v.variant}
                  className="flex items-baseline justify-between gap-3 text-[0.8rem] text-ink-muted"
                >
                  <span className="min-w-0">{v.variant}</span>
                  <span className="shrink-0 font-medium tabular-nums text-ink">
                    {formatEuro(v.preis)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : servicePriceLabel(service, service.variants?.[0] ?? null) ? (
          <p className="text-[1.08rem] font-semibold tabular-nums">
            {servicePriceLabel(service, service.variants?.[0] ?? null)}
          </p>
        ) : null}
        {/* DER HINWEIS ZUM PREIS STEHT BEIM PREIS. Im Beschreibungstext
            war er ein vierter Gedanke in einem Absatz und wurde dort
            von niemandem gelesen. */}
        {service.preisHinweis ? (
          <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
            {service.preisHinweis}
          </p>
        ) : null}
      </div>

      {/* Der eine klare Weg: zusammengestellt wird im Konfigurator */}
      <p className="mt-3 border-t border-line/50 pt-3 text-[0.85rem]">
        <Link
          prefetch={navPrefetch}
          href="/wunsch-paket"
          className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary-dark"
        >
          Im Wunsch-Paket wählen
          <ArrowRight size={14} strokeWidth={1.8} />
        </Link>
      </p>
    </article>
  );
}
