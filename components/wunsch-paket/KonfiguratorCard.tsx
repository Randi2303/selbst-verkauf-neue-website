"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { SERVICE_ICONS } from "@/components/leistungen/serviceIcons";
import InfoTipp from "@/components/ui/InfoTipp";
import PortalLogos from "@/components/ui/PortalLogos";
import { cn } from "@/lib/utils";
import { servicePriceLabel, type SiteService } from "@/site.config";

/**
 * "generell"  allgemeine Empfehlung aus site.config.ts
 * "check"     der Kunde hat im Schnell-Check verneint, es fehlt ihm
 * "vorhanden" der Kunde hat bejaht, er hat es bereits
 */
type Empfehlung = null | "generell" | "check" | "vorhanden";

type KonfiguratorCardProps = {
  service: SiteService;
  selected: boolean;
  variant: string | null;
  quantity: number;
  empfehlung: Empfehlung;
  /** Leistung ist Teil des gewählten Basis-Pakets */
  imPaket?: boolean;
  /**
   * Karte ist nicht einzeln wählbar, weil die Leistung schon anderweitig
   * enthalten ist (Komplett-Leistung oder Paket-Basis)
   */
  gesperrt?: boolean;
  /** Kurze Erklärung zur Sperre, z. B. "Bereits enthalten im ..." */
  gesperrtHinweis?: string | null;
  /** Begründung aus der Regel (reason), erscheint unter dem Sperr-Hinweis */
  gesperrtGrund?: string | null;
  onToggle: () => void;
  onVariantChange: (variant: string) => void;
  onQuantityChange: (quantity: number) => void;
};

/**
 * Auswahlkarte im Konfigurator: Klick wählt an und ab (Häkchen-Zustand),
 * Varianten und Anzahl werden in der Karte eingestellt. Empfohlene
 * Leistungen tragen ein kleines grünes Badge in der Kartenecke.
 */
export default function KonfiguratorCard({
  service,
  selected,
  variant,
  quantity,
  empfehlung,
  imPaket = false,
  gesperrt = false,
  gesperrtHinweis = null,
  gesperrtGrund = null,
  onToggle,
  onVariantChange,
  onQuantityChange,
}: KonfiguratorCardProps) {
  const reduced = useReducedMotion();
  const Icon = SERVICE_ICONS[service.id];

  /*
   * GENAU EIN Status-Chip je Karte, mit klarer Priorität: Die
   * Paket-Zugehörigkeit schlägt den Abdeckungs-Hinweis (beides zusammen
   * wäre doppelt gesagt), die Begründung wandert in den Tooltip.
   * "Empfohlen" erscheint nur auf freien Karten, auf gesperrten ist die
   * Empfehlung ohnehin erfüllt. So drängt sich nie eine Badge-Reihe
   * über den Titel.
   */
  const statusChip = imPaket
    ? { text: "Im Paket enthalten", grund: gesperrtGrund }
    : gesperrt && !selected && gesperrtHinweis
      ? { text: gesperrtHinweis, grund: gesperrtGrund }
      : null;
  const zeigeEmpfehlung = empfehlung && empfehlung !== "vorhanden" && !statusChip;
  /* "Haben Sie schon" ist KEINE Empfehlung und sieht deshalb auch nicht
     so aus: keine Signalfarbe, nur eine ruhige Notiz. Die Karte bleibt
     vollstaendig waehlbar, ein "Ja" im Schnell-Check ist eine Auskunft
     und kein Verbot. */
  const zeigeVorhanden = empfehlung === "vorhanden" && !statusChip;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border transition-all duration-300 ease-swift",
        gesperrt
          ? "border-line/60 bg-surface/60"
          : selected
            ? "border-primary/45 bg-surface-tint shadow-soft"
            : "border-line/70 bg-paper hover:border-primary/30 hover:shadow-soft"
      )}
    >
      {/* Genau ein dezenter Chip in der Kartenecke, absolut positioniert
          und damit ohne Einfluss auf die Kartenhöhe */}
      {statusChip || zeigeEmpfehlung || zeigeVorhanden ? (
        <span className="absolute -top-2.5 left-4 flex max-w-[calc(100%-2rem)]">
          {zeigeVorhanden ? (
            <span className="whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-0.5 text-[0.68rem] font-medium leading-tight text-ink-muted shadow-soft">
              Haben Sie laut Schnell-Check schon
            </span>
          ) : statusChip ? (
            <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-primary/25 bg-surface-tint py-0.5 pl-2.5 pr-2.5 text-[0.68rem] font-semibold leading-tight text-primary shadow-soft">
              <span className="truncate">{statusChip.text}</span>
              {statusChip.grund ? (
                <InfoTipp text={statusChip.grund} className="relative -mr-1.5" />
              ) : null}
            </span>
          ) : (
            <span className="rounded-full bg-success px-2.5 py-0.5 text-[0.68rem] font-semibold leading-tight text-background shadow-soft">
              Empfohlen
              {empfehlung === "check" ? (
                <span className="block font-normal opacity-90">liegt noch nicht vor</span>
              ) : null}
            </span>
          )}
        </span>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        disabled={gesperrt}
        aria-pressed={selected}
        className={cn(
          "flex w-full flex-1 items-stretch gap-3.5 p-5 pr-14 text-left",
          gesperrt && "cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl transition-colors duration-300",
            gesperrt
              ? "bg-surface text-ink-muted/70"
              : selected
                ? "bg-paper text-primary"
                : "bg-surface-tint text-primary"
          )}
        >
          {Icon ? <Icon size={19} strokeWidth={1.5} /> : null}
        </span>
        <span
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-opacity duration-300",
            gesperrt && "opacity-60"
          )}
        >
          <span className="block font-heading text-[1.02rem] font-semibold leading-snug tracking-[-0.01em]">
            {service.name}
          </span>
          <span className="mt-1 block text-[0.85rem] leading-relaxed text-ink-muted">
            {service.description}
          </span>
          {/* Die Grenze abgesetzt, wie im Katalog: Sie soll bleiben,
              aber nicht im selben Absatz wie das Versprechen. */}
          {service.einschraenkung ? (
            <span className="mt-1.5 block border-l-2 border-line pl-2.5 text-[0.79rem] leading-relaxed text-ink-muted">
              {service.einschraenkung}
            </span>
          ) : null}
          {/* Wo veroeffentlicht wird, auf einen Blick */}
          {service.id === "portal-schaltung" ? (
            <PortalLogos className="mt-2.5" />
          ) : null}
          {/* Preiszeile bleibt in jedem Zustand stehen (bei Sperre nur
              gedimmt) und sitzt durch mt-auto reihenweise auf einer Linie */}
          {servicePriceLabel(service, variant) ? (
            <span className="mt-auto block pt-2 text-[0.95rem] font-semibold tabular-nums text-ink">
              {servicePriceLabel(service, variant)}
            </span>
          ) : null}
          {/* Der Hinweis gehoert zum Preis, nicht in die Beschreibung */}
          {service.preisHinweis ? (
            <span className="mt-0.5 block text-[0.74rem] leading-relaxed text-ink-muted">
              {service.preisHinweis}
            </span>
          ) : null}
        </span>
      </button>

      {/* Häkchen-Zustand rechts oben, bei gesperrten Karten gedimmt bzw. ausgeblendet */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200",
          selected ? "border-primary bg-primary text-background" : "border-line bg-background text-transparent",
          gesperrt && (selected ? "opacity-50" : "opacity-0")
        )}
      >
        <m.span
          initial={false}
          animate={{ scale: selected ? 1 : 0.4, opacity: selected ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 22 }}
          className="flex"
        >
          <Check size={13} strokeWidth={2.6} />
        </m.span>
      </span>

      {/* Variante und Anzahl, sichtbar sobald die Leistung frei gewählt ist */}
      <AnimatePresence initial={false}>
        {selected && !gesperrt && (service.variants || service.countable) ? (
          <m.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="space-y-3 px-5 pb-5">
              {service.variants ? (
                <label className="block">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Variante
                  </span>
                  <select
                    value={variant ?? ""}
                    onChange={(e) => onVariantChange(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2 text-[0.85rem]"
                  >
                    {service.variants.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {service.countable ? (
                <div className="flex items-center justify-between">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Anzahl {service.unit}
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Weniger ${service.unit}`}
                      onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-background text-ink transition-colors hover:bg-surface"
                    >
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <span className="w-7 text-center font-semibold tabular-nums">{quantity}</span>
                    <button
                      type="button"
                      aria-label={`Mehr ${service.unit}`}
                      onClick={() => onQuantityChange(Math.min(20, quantity + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-background text-ink transition-colors hover:bg-surface"
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </span>
                </div>
              ) : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
