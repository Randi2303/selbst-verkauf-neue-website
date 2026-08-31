"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
// Nutzt Layout-Features (layoutId der Umschalt-Pille), die im schlanken LazyMotion-Modus
// (domAnimation) fehlen: deshalb bewusst der volle motion-Import statt m.
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, LifeBuoy, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { textMitMarken } from "@/components/ui/PartnerName";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { setPackageBase } from "@/lib/cart-store";
import { getService } from "@/lib/cart-rules";
import { PAKET_MINDESTLAUFZEIT_MONATE, SCHALTUNG_MONATE } from "@/lib/laufzeit";
import PortalLogos from "@/components/ui/PortalLogos";
import { cn, formatMenge, formatNumber } from "@/lib/utils";
import { siteConfig, type SitePackage } from "@/site.config";

type Billing = "monthly" | "once";

/**
 * Die Zeile unter dem Preis, die sagt, wie lange die befristbaren
 * Leistungen dieses Pakets laufen.
 *
 * ---------------------------------------------------------------------
 * SIE IST DIE EINZIGE STELLE DER KARTE, DIE DEN UMSCHALTER KENNT
 * ---------------------------------------------------------------------
 * Die Merkmalsliste darunter wird fuer beide Zahlweisen identisch
 * gezeichnet. Deshalb stand "sechs Monate Laufzeit ab Online-Gang" bis
 * zum 30.08.2026 auch vor einem monatlichen Kunden, dessen Schaltung
 * gar nicht endet. Was von der Zahlweise abhaengt, gehoert hierher und
 * nicht in die gemeinsame Liste.
 *
 * Fuer die Antwortvorschlaege gab es diese Zeile seit dem 10.08.2026
 * schon, in zwei getrennten Bloecken. Jetzt tragen beide Leistungen
 * EINE Zeile, weil sie beim Einmalkauf am selben Tag enden
 * (Entscheidung des Inhabers, 30.08.2026): zwei Zeilen mit demselben
 * Datum sind zweimal dieselbe Auskunft.
 */
function LaufzeitZeile({ pkg, billing }: { pkg: SitePackage; billing: Billing }) {
  const drin = (id: string) => pkg.includedServiceIds.some((e) => e.id === id);
  const hatSchaltung = drin("portal-schaltung");
  const hatVorschlaege = drin("ki-anfragenmanagement");
  if (!hatSchaltung && !hatVorschlaege) return null;
  /* Der Numerus haengt daran, wie viele Leistungen die Zeile nennt.
     Ohne diese Unterscheidung stuende dort "Portalschaltung laufen",
     sobald ein Paket nur eine der beiden enthaelt. */
  const [was, laeuft] =
    hatSchaltung && hatVorschlaege
      ? ["Portalschaltung und KI-Antwortvorschläge", "laufen"]
      : hatSchaltung
        ? ["Portalschaltung", "läuft"]
        : ["KI-Antwortvorschläge", "laufen"];
  return (
    <p className="mt-1.5 text-[0.82rem] leading-snug text-ink-muted">
      {billing === "once"
        ? `${was}: ${formatMenge(SCHALTUNG_MONATE, "Monate")} ab Veröffentlichung`
        : `${was} ${laeuft}, solange Ihr Paket läuft`}
    </p>
  );
}

/**
 * Pakete: Umschalter monatlich/einmalig mit animiertem Toggle,
 * die Preise blenden weich um. Preise kommen aus site.config.ts.
 */
export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const router = useRouter();

  /*
   * "Paket wählen": legt das Paket mit der aktuell gewählten Zahlungsart
   * als Basis in den Warenkorb und führt direkt zur Kasse. Der Weg über
   * den Konfigurator bleibt daneben als "oder individuell erweitern".
   */
  const waehlePaket = (pkg: SitePackage) => {
    setPackageBase({
      id: pkg.id,
      name: pkg.name,
      paymentMode: billing === "once" ? "once" : "monthly",
    });
    router.push("/kasse");
  };

  return (
    <section id="pakete" className="section-pad scroll-mt-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Pakete"
          lines={[
            <>
              Ein <span className="text-accent">Festpreis</span>
            </>,
            "statt Provision",
          ]}
          sub="Drei Pakete, ein Prinzip: Sie wissen vorher, was es kostet. Monatlich oder einmalig, wie es Ihnen passt."
        />

        {/* Umschalter */}
        <Reveal className="mt-10">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <div
              role="group"
              aria-label="Abrechnung wählen"
              className="inline-flex rounded-full border border-line bg-paper p-1.5 shadow-soft"
            >
              {(
                [
                  { id: "monthly", label: "monatlich" },
                  { id: "once", label: "einmalig" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={billing === option.id}
                  onClick={() => setBilling(option.id)}
                  className={cn(
                    "relative rounded-full px-5 py-2 text-[0.92rem] font-medium transition-colors duration-200",
                    billing === option.id ? "text-background" : "text-ink-muted hover:text-ink"
                  )}
                >
                  {billing === option.id ? (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative z-10">{option.label}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={billing}
                className="text-[0.85rem] text-ink-muted"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {billing === "monthly"
                  ? `${PAKET_MINDESTLAUFZEIT_MONATE} Monate Mindestlaufzeit, danach monatlich kündbar.`
                  : "Eine Zahlung, keine laufenden Kosten."}
              </motion.p>
            </AnimatePresence>
            {/* Der Unterschied der beiden Modelle in einem Satz, als
                Hilfe und nicht als Warnung: Beim Umschalten soll nie
                der Eindruck entstehen, ein Modell enthielte weniger. */}
            <p className="max-w-xl text-center text-[0.85rem] leading-relaxed text-ink-muted lg:text-left">
              Beide Modelle enthalten dieselben Leistungen. Einmalig zahlen
              Sie einmal mit festen Leistungszeiträumen, monatlich läuft
              alles so lange, wie Ihr Paket läuft.
            </p>
          </div>
        </Reveal>

        {/* Paketkarten */}
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {siteConfig.packages.map((pkg, i) => (
            <Reveal key={pkg.id} delay={i * 0.08} className="h-full">
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-4xl border p-8 transition-shadow duration-300",
                  pkg.highlighted
                    ? "border-primary/30 bg-paper shadow-lift"
                    : "border-line/70 bg-surface/60 shadow-soft"
                )}
              >
                {pkg.badge ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-deep px-4 py-1 text-[0.78rem] font-semibold text-background shadow-soft">
                    {pkg.badge}
                  </span>
                ) : null}

                <h3 className="font-heading text-[1.4rem] font-semibold tracking-[-0.01em]">{pkg.name}</h3>
                <p className="mt-1 text-[0.9rem] text-ink-muted">{pkg.tagline}</p>

                <div className="mt-6 min-h-[64px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={billing}
                      className="flex items-baseline gap-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <span className="text-[2.3rem] font-semibold tabular-nums tracking-tight">
                        {formatNumber(billing === "monthly" ? pkg.monthly : pkg.once)} €
                      </span>
                      <span className="text-[0.9rem] text-ink-muted">
                        {billing === "monthly" ? "pro Monat" : "einmalig"}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                  {/* Die Makler-Begleitung ist IMMER monatlich
                      (10.08.2026): Beim Einmalpreis steht sie ehrlich
                      daneben, im Monatspreis ist sie enthalten. */}
                  {billing === "once" &&
                  pkg.includedServiceIds.some(
                    (e) => getService(e.id)?.eigenstaendigMonatlich
                  ) ? (
                    <p className="mt-1.5 text-[0.82rem] leading-snug text-ink-muted">
                      plus {getService("ansprechpartner")?.name ?? "Makler-Begleitung"}{" "}
                      {formatNumber(getService("ansprechpartner")?.price ?? 149)} €
                      je Monat, monatlich kündbar
                    </p>
                  ) : null}
                  <LaufzeitZeile pkg={pkg} billing={billing} />
                </div>

                <ul className="mt-6 space-y-3 border-t border-line/60 pt-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[0.93rem] leading-relaxed">
                      <Check size={17} strokeWidth={2.2} className="mt-[3px] shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Die Logos beantworten die Merkmalszeile "auf den
                    drei grossen Portalen", deshalb stehen sie NUR bei
                    Selbst & Sicher: Dort nennt die Liste die Portale,
                    bei Rundum steht nur "Alles aus Selbst & Sicher",
                    ohne Anker wirkten die Logos wie ein Rest. Eine
                    Zeile, gleichmaessig verteilt, mit Luft zur Liste.
                    Nur Tatsachenangabe, keine Partnerschaft. */}
                {pkg.id === "selbst-sicher" ? (
                  <PortalLogos einzeilig className="mt-6" />
                ) : null}

                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    onClick={() => waehlePaket(pkg)}
                    className={cn("w-full", pkg.highlighted ? "btn-primary" : "btn-secondary")}
                  >
                    Paket wählen
                  </button>
                  {/* Dezenter Weg in den Konfigurator */}
                  <p className="mt-3 text-center">
                    <Link
                      href={`/wunsch-paket?paket=${pkg.id}&zahlung=${billing === "once" ? "einmalig" : "monatlich"}`}
                      className="text-[0.85rem] font-medium text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-primary"
                    >
                      oder individuell erweitern
                    </Link>
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Bruttopreise für Verbraucher, Text zentral in site.config.ts */}
        <p className="mt-4 text-center text-[0.8rem] text-ink-muted">{siteConfig.vatNote}</p>

        {/* Vierte, gleichwertige Option: das Wunsch-Paket */}
        <Reveal className="mt-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-4xl border-2 border-dashed border-primary/30 bg-paper p-8 md:flex-row md:items-center md:p-10">
            <div className="flex items-start gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary">
                <SlidersHorizontal size={22} strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-heading text-[1.4rem] font-semibold tracking-[-0.01em]">
                  Individuell zusammenstellen
                </h3>
                <p className="mt-1.5 max-w-xl text-[0.97rem] leading-relaxed text-ink-muted">
                  Nur das buchen, was Sie wirklich brauchen. Stellen Sie Ihr
                  Wunsch-Paket aus über 20 Einzelleistungen zusammen.
                </p>
              </div>
            </div>
            <Link href="/wunsch-paket" className="btn-secondary shrink-0">
              Wunsch-Paket starten
              <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          </div>
        </Reveal>

        {/* Übernahme-Banner */}
        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-4xl bg-primary px-8 py-10 text-background shadow-card md:px-12">
            {/* Dezente Linien als Dekor */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 text-background/10"
              viewBox="0 0 200 200"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <circle cx="100" cy="100" r="96" />
              <circle cx="100" cy="100" r="72" />
              <circle cx="100" cy="100" r="48" />
            </svg>
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/10 p-3">
                <LifeBuoy size={26} strokeWidth={1.5} />
              </span>
              <div>
                <p className="font-heading text-[1.45rem] font-semibold leading-snug tracking-[-0.01em]">
                  {siteConfig.takeover.title}
                </p>
                <p className="mt-1.5 text-[0.98rem] text-background/85">
                  {/* Partner-Link in heller Optik für die dunkle Fläche */}
                  {textMitMarken(siteConfig.takeover.text, true)}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
