"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronUp, Info, Package, ShieldCheck, TicketPercent, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import AuswahlHinweis from "@/components/ui/AuswahlHinweis";
import KonfiguratorCard from "@/components/wunsch-paket/KonfiguratorCard";
import { getService } from "@/lib/cart-rules";
import {
  addCartItem,
  removeCartItem,
  removeCartItemsById,
  setInstantPayment,
  updateCartItem,
  useInstantPayment,
  type CartItem,
} from "@/lib/cart-store";
import { ersparnisLabel, findePaketVergleich, paketPreisLabel } from "@/lib/paket-vergleich";
import { OBJEKTART_ERKLAERUNGEN, type Objektart } from "@/lib/objekt-felder";
import { navPrefetch } from "@/lib/passwortschutz";
import { useLeistungsAuswahl } from "@/lib/use-leistungs-auswahl";
import {
  cartLineLabel,
  cartLinePrice,
  cartMengeLabel,
  cartTotals,
  formatEuroBetrag,
  instantDiscountAmount,
  instantDiscountPercentLabel,
  isMonthlyItem,
  paketEigeneMonatsposten,
} from "@/lib/preise";
import { cn, formatMenge } from "@/lib/utils";
import { PAKET_MINDESTLAUFZEIT_MONATE } from "@/lib/laufzeit";
import {
  ANFRAGEN_EINMALKAUF_HINWEIS,
  ANFRAGEN_MONATLICH_HINWEIS,
} from "@/config/vertragstexte";
import { SERVICES, servicePrice, siteConfig, type ServiceCategoryId } from "@/site.config";

/**
 * Schnell-Check: drei Fragen, die BEIDE Antworten auswerten.
 *
 * WAS VORHER NICHT STIMMTE (gefunden am 08.08.2026): "Nein" setzte eine
 * Empfehlung, "Ja" bewirkte gar nichts, und zwei der drei Leistungen
 * liegen in einer spaeteren Phase als der Check selbst. Wer alle drei
 * Fragen beantwortete, sah auf seinem Bildschirm hoechstens EINE
 * Aenderung, und die auch nur, wenn er genau hinsah. Ein Fragebogen,
 * der nicht antwortet, ist schlimmer als keiner: Man beantwortet ihn
 * einmal und glaubt der Seite danach nichts mehr.
 *
 * Jetzt gilt: "Nein" empfiehlt die Leistung, "Ja" nimmt sie aus den
 * Empfehlungen heraus und sagt das auch, und jede Antwort bekommt
 * unter der Frage eine Zeile, die die Folge benennt. Damit wirkt die
 * Antwort auch dann sichtbar, wenn die Karte dazu erst in Phase 2
 * auftaucht.
 *
 * Die Leistung bleibt in JEDEM Fall sichtbar und buchbar. Ein "Ja" ist
 * eine Auskunft, kein Verbot.
 */
const QUICK_CHECK: Array<{
  serviceId: string;
  frage: string;
  /** Folge bei "Nein", ein Satz */
  beiNein: string;
  /** Folge bei "Ja", ein Satz */
  beiJa: string;
}> = [
  {
    serviceId: "grundrisse",
    frage: "Liegen Ihnen digitale Grundrisse vor?",
    beiNein: "Dann ist Digitale Grundrisse für Sie empfohlen, ohne Grundriss springen viele Interessenten ab.",
    beiJa: "Gut, dann nehmen wir Digitale Grundrisse aus Ihren Empfehlungen. Buchbar bleibt die Leistung.",
  },
  {
    serviceId: "energieausweis",
    frage: "Haben Sie einen gültigen Energieausweis?",
    beiNein: "Dann ist Energieausweis für Sie empfohlen, er ist gesetzlich vorgeschrieben und muss schon in der Anzeige stehen.",
    beiJa: "Gut, dann nehmen wir Energieausweis aus Ihren Empfehlungen. Prüfen Sie nur kurz, ob er noch keine zehn Jahre alt ist.",
  },
  {
    serviceId: "fotografie",
    frage: "Haben Sie professionelle Fotos?",
    beiNein: "Dann ist Immobilienfotografie für Sie empfohlen, die Bilder entscheiden über die Klicks auf Ihre Anzeige.",
    beiJa: "Gut, dann nehmen wir Immobilienfotografie aus Ihren Empfehlungen. Buchbar bleibt die Leistung.",
  },
];

/** Die Antworten ueberdauern das Neuladen, ohne Konto und ohne Server */
const CHECK_SPEICHER = "sv-schnellcheck";

/** localStorage ändert sich hier nur durch diese Seite, kein Abo nötig */
const abonniereNichts = () => () => {};

const STEPS = [
  ...siteConfig.servicePhases.map((phase) => ({ id: phase.id as string, label: `Phase ${phase.nr}` })),
  { id: "uebersicht", label: "Übersicht" },
];

/** Kauf-Ablauf nach der Übersicht, als echte Reihenfolge nummeriert */
const ABLAUF = [
  {
    titel: "Zusammenstellung prüfen",
    text: "Alles liegt vor Ihnen, jeder Posten lässt sich hier noch ändern.",
  },
  {
    // TODO Stripe: Mit der Anbindung wird hieraus die direkte Online-Zahlung
    titel: "Bestellen und bezahlen",
    text: "Die Zahlungsinformationen erhalten Sie mit der Auftragsbestätigung per E-Mail.",
  },
  {
    titel: "Loslegen",
    text: "Ihr Zugang und die gebuchten Leistungen starten direkt nach Zahlungseingang.",
  },
] as const;

/**
 * Betrag mit weicher Zähl-Animation (tabellarische Ziffern, ganze Euro).
 * Wird nur clientseitig gerendert, da die Zusammenfassung erst nach dem
 * Laden des Warenkorbs erscheint.
 */
function AnimierteSumme({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 170, damping: 26 });
  const text = useTransform(spring, (v) => formatEuroBetrag(Math.round(v)));
  useEffect(() => {
    if (reduced) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, reduced, spring]);
  return <m.span className={cn("tabular-nums", className)}>{text}</m.span>;
}

/**
 * Der Konfigurator: drei Phasen-Schritte plus Übersicht, alles schreibt
 * in den zentralen Warenkorb. Mit klaren Preisen je Leistung, bestellt
 * wird an der Kasse.
 */
export default function Konfigurator() {
  const instantPayment = useInstantPayment();
  const reduced = useReducedMotion();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);

  // "oder individuell erweitern": Paket aus dem Query-Parameter als Basis
  const basisPaket =
    siteConfig.packages.find((p) => p.id === searchParams.get("paket")) ?? null;
  const basisAngewendet = useRef(false);

  // Gemeinsame Auswahllogik (covers, requires, Sperren, Einblendungen),
  // identisch mit der Leistungsseite
  const {
    cart,
    isSelected,
    cartEntry,
    hinweis,
    zeigeHinweis,
    schliesseHinweis,
    toggleService,
    entferneMitAbhaengigen,
    changeVariant,
    changeQuantity,
    sperrInfo,
    imPaketIds,
    paketPosten,
    paketConfig,
  } = useLeistungsAuswahl(basisPaket);

  /*
   * Beim ersten Aufruf mit ?paket= wird das Paket als EIN Posten mit
   * echtem Paketpreis in den Korb gelegt (nicht mehr in Einzelleistungen
   * zerlegt). Die Zahlungsart kommt vom Umschalter der Startseite mit
   * (?zahlung=einmalig), Standard ist monatlich. Enthaltene Leistungen,
   * die bereits einzeln im Korb liegen, räumt die zentrale Bereinigung
   * im Auswahl-Hook auf.
   */
  useEffect(() => {
    if (!basisPaket || basisAngewendet.current) return;
    basisAngewendet.current = true;
    const zahlung = searchParams.get("zahlung") === "einmalig" ? "once" : "monthly";
    addCartItem({
      type: "paket",
      id: basisPaket.id,
      name: basisPaket.name,
      paymentMode: zahlung,
    });
  }, [basisPaket, searchParams]);
  const [category, setCategory] = useState<ServiceCategoryId>("haus");
  // Objektart merken, die Kasse füllt ihr Auswahlfeld damit vor
  useEffect(() => {
    window.localStorage.setItem("sv-objektart", category);
  }, [category]);
  /*
   * DIE ANTWORTEN UEBERDAUERN DAS NEULADEN, ohne Konto und ohne
   * Server: Der Konfigurator ist oeffentlich, und wer nach zwei Tagen
   * zurueckkommt, soll seine drei Antworten nicht noch einmal geben
   * muessen.
   *
   * Gelesen wird ueber useSyncExternalStore, wie die Objektart in der
   * Kasse: Der Server liefert null, der Browser den gespeicherten
   * Text. Eine eigene Antwort in diesem Besuch gewinnt immer.
   */
  const gespeicherterText = useSyncExternalStore(
    abonniereNichts,
    () => window.localStorage.getItem(CHECK_SPEICHER),
    () => null
  );
  const gespeicherteAntworten = useMemo(() => {
    const leer: Record<string, boolean | null> = {};
    for (const frage of QUICK_CHECK) leer[frage.serviceId] = null;
    if (!gespeicherterText) return leer;
    try {
      const gelesen = JSON.parse(gespeicherterText) as Record<string, unknown>;
      for (const frage of QUICK_CHECK) {
        const wert = gelesen[frage.serviceId];
        leer[frage.serviceId] = typeof wert === "boolean" ? wert : null;
      }
    } catch {
      // wirkung: gewollt still, ein unlesbarer Speicher kostet nur die Vorbelegung; der Konfigurator startet dann leer.
      // Unlesbarer Speicher: dann eben ohne Vorbelegung
    }
    return leer;
  }, [gespeicherterText]);
  const [eigeneAntworten, setEigeneAntworten] = useState<Record<
    string,
    boolean | null
  > | null>(null);
  const checkAnswers = eigeneAntworten ?? gespeicherteAntworten;
  /** Eine Antwort setzen; sie gilt sofort und ueberdauert das Neuladen */
  const antworte = (serviceId: string, antwort: boolean | null) => {
    setEigeneAntworten((prev) => {
      const neu = { ...(prev ?? gespeicherteAntworten), [serviceId]: antwort };
      try {
        window.localStorage.setItem(CHECK_SPEICHER, JSON.stringify(neu));
      } catch {
        // wirkung: gewollt still, die Antwort gilt fuer diesen Besuch auch ohne Speicher; sie ueberdauert dann nur das Neuladen nicht.
        // Kein Speicher verfuegbar: die Antwort gilt trotzdem fuer diesen Besuch
      }
      return neu;
    });
  };
  const [summaryOpen, setSummaryOpen] = useState(false);
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);

  /**
   * Bei jedem Phasenwechsel an den Anfang des Phasen-Bereichs scrollen.
   * Wird von onExitComplete der AnimatePresence aufgerufen: Der alte
   * Inhalt ist dann ausgeblendet, ein Frame später steht das neue Layout
   * endgültig. Der Fokus wandert für Tastatur und Screenreader auf die
   * Überschrift der neuen Phase.
   */
  const scrollToPhaseStart = () => {
    requestAnimationFrame(() => {
      const el = phaseHeadingRef.current;
      if (!el) return;
      const reducedNow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const top = el.getBoundingClientRect().top + window.scrollY - 110;
      if (window.__lenis && !reducedNow) {
        window.__lenis.scrollTo(top, { duration: 0.5 });
      } else {
        window.scrollTo({ top, behavior: "auto" });
      }
      el.focus({ preventScroll: true });
    });
  };

  /**
   * Der Empfehlungs-Zustand einer Leistung. BEIDE Antworten zaehlen:
   *   "check"     der Kunde hat verneint, die Leistung fehlt ihm
   *   "vorhanden" der Kunde hat bejaht, er hat es schon
   *   "generell"  keine Antwort, es gilt die allgemeine Empfehlung
   */
  const empfehlungFor = (id: string): null | "generell" | "check" | "vorhanden" => {
    if (checkAnswers[id] === false) return "check";
    if (checkAnswers[id] === true) return "vorhanden";
    const service = SERVICES.find((s) => s.id === id);
    return service?.recommended ? "generell" : null;
  };

  /** Reihenfolge: was fehlt zuerst, was schon da ist zuletzt */
  const empfehlungsRang = (id: string): number => {
    const e = empfehlungFor(id);
    if (e === "check") return 3;
    if (e === "generell") return 2;
    if (e === "vorhanden") return 0;
    return 1;
  };

  const router = useRouter();

  /**
   * Ehrlicher Paketvergleich: Nur ohne gewählte Paket-Basis prüfen, ob die
   * Einzelauswahl ein Standard-Paket komplett abdeckt und teurer ist.
   * Rein abgeleitet aus dem Warenkorb, verschwindet also von selbst,
   * sobald die Bedingung nicht mehr stimmt.
   */
  const vergleich = basisPaket || paketPosten ? null : findePaketVergleich(cart);

  /**
   * "Zum Paket wechseln": Die abgedeckten Einzel-Leistungen weichen der
   * Paket-Basis, alle zusätzlichen Leistungen bleiben unverändert im Korb.
   * Der Query-Parameter setzt die Basis, das Seeding samt Badge und
   * Basis-Zeile übernimmt der bestehende Effekt wie beim Einstieg über
   * "individuell erweitern".
   */
  const wechsleZuPaket = () => {
    if (!vergleich) return;
    const ersparnis = ersparnisLabel(vergleich);
    for (const eintrag of vergleich.paket.includedServiceIds) {
      removeCartItemsById("leistung", eintrag.id);
    }
    router.replace(`/wunsch-paket?paket=${vergleich.paket.id}`, { scroll: false });
    zeigeHinweis(`Auf Paket ${vergleich.paket.name} umgestellt, Sie sparen ${ersparnis}.`);
  };

  /** Wie viele Fragen des Schnell-Checks sind beantwortet */
  const beantwortet = QUICK_CHECK.filter(
    (q) => checkAnswers[q.serviceId] !== null && checkAnswers[q.serviceId] !== undefined
  ).length;

  /** Karten einer Phase, gefiltert nach Objektart, Empfohlenes zuerst */
  const phaseServices = (phaseId: string) =>
    SERVICES.filter((s) => s.phase === phaseId && s.categories.includes(category)).sort(
      (a, b) => empfehlungsRang(b.id) - empfehlungsRang(a.id)
    );

  const totals = cartTotals(cart);

  /** Zusätzliche Einzelleistungen, sauber nach ihrer Natur getrennt */
  const zusatzEinmalig = cart.filter((i) => i.type === "leistung" && !isMonthlyItem(i));
  const zusatzMonatlich = cart.filter((i) => i.type === "leistung" && isMonthlyItem(i));
  const summe = (posten: readonly CartItem[]) =>
    posten.reduce((s, i) => s + (cartLinePrice(i) ?? 0), 0);

  /** Aufgeklappte Warum-Info im Warenkorb (Schlüssel des Eintrags) */
  const [offeneInfo, setOffeneInfo] = useState<string | null>(null);

  /**
   * Einzelne Paket-Bestandteile abwählen: Das Paket bleibt als Basis
   * bestehen, der Preis ändert sich nicht. Der ehrliche Hinweis dazu
   * erscheint beim ersten Abwählen einmalig.
   */
  const abwahlHinweisGezeigt = useRef(false);
  const togglePaketLeistung = (serviceId: string) => {
    if (!paketPosten) return;
    const aktuelle = paketPosten.abgewaehlt ?? [];
    const istAbgewaehlt = aktuelle.includes(serviceId);
    updateCartItem(paketPosten.key, {
      abgewaehlt: istAbgewaehlt
        ? aktuelle.filter((x) => x !== serviceId)
        : [...aktuelle, serviceId],
    });
    if (!istAbgewaehlt && !abwahlHinweisGezeigt.current) {
      abwahlHinweisGezeigt.current = true;
      zeigeHinweis("Der Paketpreis bleibt gleich, Sie nutzen die Leistung nur nicht.");
    }
  };

  /**
   * Basis komplett entfernen: Der Korb zerfällt in Einzelleistungen mit
   * Einzelpreisen (abgewählte Bestandteile ausgenommen), der
   * Paket-Parameter verschwindet aus der Adresse.
   */
  const entfernePaketBasis = () => {
    if (!paketPosten || !paketConfig) return;
    const abgewaehlt = new Set(paketPosten.abgewaehlt ?? []);
    removeCartItem(paketPosten.key);
    for (const eintrag of paketConfig.includedServiceIds) {
      if (abgewaehlt.has(eintrag.id)) continue;
      const service = getService(eintrag.id);
      if (!service) continue;
      const variant = eintrag.variant ?? service.variants?.[0] ?? null;
      addCartItem({
        type: "leistung",
        id: service.id,
        name: service.name,
        variant,
        quantity: 1,
        price: servicePrice(service, variant),
        stripePriceId: service.stripePriceId,
      });
    }
    router.replace("/wunsch-paket", { scroll: false });
    zeigeHinweis(
      "Paket entfernt. Die enthaltenen Leistungen liegen jetzt einzeln mit Einzelpreisen im Korb."
    );
  };

  /** Einzelposten entfernen, Leistungen nehmen ihre Abhängigen mit */
  const entfernePosten = (item: CartItem) => {
    const service = getService(item.id);
    if (service) {
      entferneMitAbhaengigen(service);
    } else {
      removeCartItem(item.key);
    }
  };

  /** Zeile einer zusätzlichen Einzelleistung, in beiden Blöcken gleich */
  const postenZeile = (item: CartItem) => (
    <li key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-line/60 bg-background px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block text-[0.88rem] font-medium leading-snug">
          {item.name}
          {/* Automatisch mitgebucht: Begründung hinter dem Info-Icon */}
          {item.autoReason ? (
            <button
              type="button"
              aria-label={`Warum ist ${item.name} in Ihrer Auswahl?`}
              aria-expanded={offeneInfo === item.key}
              title={item.autoReason}
              onClick={() => setOffeneInfo((v) => (v === item.key ? null : item.key))}
              /* 24px-Trefferfläche, negative Ränder halten Zeilenhöhe
                 und Textfluss exakt wie zuvor */
              className="-my-1 ml-0.5 -mr-1 inline-flex h-6 w-6 -translate-y-[1px] items-center justify-center rounded-full align-middle text-primary transition-colors hover:bg-surface-tint"
            >
              <Info size={13} strokeWidth={2} />
            </button>
          ) : null}
        </span>
        {item.autoReason && offeneInfo === item.key ? (
          <span className="mt-1 block rounded-lg bg-surface-tint px-2.5 py-1.5 text-[0.75rem] leading-relaxed">
            {item.autoReason}
          </span>
        ) : null}
        {(item.variant || item.quantity > 1) && (
          <span className="mt-0.5 block text-[0.78rem] text-ink-muted">
            {[item.variant, cartMengeLabel(item)]
              .filter(Boolean)
              .join(", ")}
          </span>
        )}
        {cartLineLabel(item) ? (
          <span className="mt-0.5 block text-[0.82rem] font-semibold tabular-nums">
            {cartLineLabel(item)}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={`${item.name} entfernen`}
        onClick={() => entfernePosten(item)}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </li>
  );

  /**
   * Block 1: "Ihr Paket". EIN Posten mit echtem Paketpreis und
   * Zahlungsart-Umschalter, darunter die enthaltenen Leistungen ohne
   * Preise. Abgewählte Bestandteile bleiben sichtbar markiert, der
   * Paketpreis ändert sich dadurch nicht.
   */
  const paketBlock =
    paketPosten && paketConfig ? (
      <div className="rounded-xl border border-primary/20 bg-surface-tint px-3.5 py-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Ihr Paket
        </p>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <span className="flex items-center gap-2 text-[0.92rem] font-semibold">
            <Package size={15} strokeWidth={1.8} className="shrink-0 text-primary" />
            Paket {paketConfig.name}
          </span>
          <button
            type="button"
            aria-label={`Paket ${paketConfig.name} entfernen`}
            onClick={entfernePaketBasis}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-background hover:text-ink"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        {/* Zahlungsart-Umschalter, wechselt nur den Basis-Preis */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Zahlungsart des Pakets"
            className="inline-flex rounded-full border border-line bg-background p-0.5"
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
                aria-pressed={(paketPosten.paymentMode ?? "monthly") === option.id}
                onClick={() => updateCartItem(paketPosten.key, { paymentMode: option.id })}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.75rem] font-medium transition-colors",
                  (paketPosten.paymentMode ?? "monthly") === option.id
                    ? "bg-primary text-background"
                    : "text-ink-muted hover:text-ink"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="text-[0.95rem] font-semibold tabular-nums">
            <AnimierteSumme value={cartLinePrice(paketPosten) ?? 0} />{" "}
            <span className="text-[0.78rem] font-medium text-ink-muted">
              {paketPosten.paymentMode === "once" ? "einmalig" : "pro Monat"}
            </span>
          </span>
        </div>
        {/* Immer-monatliche Bestandteile beim Einmal-Kauf: eigene
            Position, damit niemand glaubt, die Makler-Begleitung
            stecke im Einmalpreis (Entscheidung vom 10.08.2026) */}
        {paketEigeneMonatsposten(paketPosten).map((posten) => (
          <p
            key={posten.service.id}
            className="mt-2 rounded-xl bg-background px-3 py-2 text-[0.78rem] leading-snug text-ink-muted"
          >
            {posten.service.name}: läuft als eigene monatliche Position mit{" "}
            <span className="font-semibold text-ink">
              {formatEuroBetrag(posten.preis)} je Monat
            </span>
            , monatlich kündbar. Im Monatspreis des Pakets wäre sie enthalten.
          </p>
        ))}
        {/* Einmalkauf: Umfang des Anfragenmanagements klar beziffern
            (10.08.2026), gleiche Dauer wie die Portalschaltung */}
        {paketConfig.includedServiceIds.some((e) => e.id === "ki-anfragenmanagement") &&
        !(paketPosten.abgewaehlt ?? []).includes("ki-anfragenmanagement") ? (
          <p className="mt-2 rounded-xl bg-background px-3 py-2 text-[0.78rem] leading-snug text-ink-muted">
            {/* Beide Modelle nennen den Umfang: Ohne die monatliche
                Zeile las sich der Wechsel auf monatlich wie ein
                Wegfall des Anfragenmanagements. */}
            {paketPosten.paymentMode === "once"
              ? ANFRAGEN_EINMALKAUF_HINWEIS
              : ANFRAGEN_MONATLICH_HINWEIS}
          </p>
        ) : null}
        {/* Enthaltene Leistungen, ohne eigene Preise */}
        <ul className="mt-2.5 space-y-1.5 border-t border-line/50 pt-2.5">
          {paketConfig.includedServiceIds.map((eintrag) => {
            const service = getService(eintrag.id);
            if (!service) return null;
            const abgewaehlt = (paketPosten.abgewaehlt ?? []).includes(eintrag.id);
            return (
              /*
               * Robustes Zeilen-Layout: Der Name links darf umbrechen
               * (min-w-0), rechts steht ein fester Bereich, in dem Status
               * und Aktion untereinander sitzen. So überlagert sich auch
               * bei schmaler Leiste und langen Namen nichts.
               */
              <li key={eintrag.id} className="flex items-start justify-between gap-3 pl-1">
                <span className={cn("flex min-w-0 flex-1 items-start gap-1.5 text-[0.8rem] leading-snug", abgewaehlt && "text-ink-muted")}>
                  <Check
                    size={13}
                    strokeWidth={2.2}
                    className={cn("mt-0.5 shrink-0", abgewaehlt ? "text-line" : "text-success")}
                  />
                  <span className={cn(abgewaehlt && "line-through decoration-ink-muted/60")}>
                    {service.name}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="whitespace-nowrap text-[0.7rem] leading-tight text-ink-muted">
                    {abgewaehlt ? "abgewählt" : "im Paket enthalten"}
                  </span>
                  <button
                    type="button"
                    aria-label={
                      abgewaehlt
                        ? `${service.name} wieder nutzen`
                        : `${service.name} abwählen`
                    }
                    onClick={() => togglePaketLeistung(eintrag.id)}
                    className="whitespace-nowrap rounded-md text-[0.72rem] font-medium leading-tight text-primary transition-colors hover:text-primary-dark"
                  >
                    {abgewaehlt ? "wieder nutzen" : "abwählen"}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  /*
   * Summenblock: Einmalig und monatlich strikt getrennt, niemals eine
   * vermischte Gesamtsumme. Der Sofortzahlungs-Rabatt gilt nur auf die
   * Summe der einmaligen Posten, die Bezugszeile benennt das klar.
   */
  const rabatt = instantPayment && totals.hatEinmalig ? instantDiscountAmount(totals.einmalig) : 0;
  const rabattBezug =
    paketPosten && paketPosten.paymentMode === "once"
      ? "auf den Paketpreis und alle einmaligen Leistungen"
      : paketPosten
        ? "auf die einmaligen Zusatzleistungen"
        : "auf alle Einmalkosten";
  const summaryTotals =
    totals.hatEinmalig || totals.hatMonatlich ? (
      <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3.5 text-[0.85rem] tabular-nums">
        {totals.hatEinmalig ? (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.95rem] font-semibold">Einmalig gesamt</span>
              <span className="text-right">
                {rabatt > 0 ? (
                  <>
                    <span className="block text-[0.78rem] text-ink-muted line-through">
                      {formatEuroBetrag(totals.einmalig)}
                    </span>
                    <AnimierteSumme
                      value={totals.einmalig - rabatt}
                      className="block text-[1.15rem] font-semibold leading-tight"
                    />
                  </>
                ) : (
                  <AnimierteSumme value={totals.einmalig} className="text-[0.95rem] font-semibold" />
                )}
              </span>
            </div>
            {rabatt > 0 ? (
              <p className="mt-0.5 text-right text-[0.82rem] font-semibold text-accent-deep">
                Sie sparen <AnimierteSumme value={rabatt} />
              </p>
            ) : null}
          </div>
        ) : null}
        {totals.hatMonatlich ? (
          <div>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[0.95rem] font-semibold">Monatlich gesamt</span>
              <span className="font-semibold">
                <AnimierteSumme value={totals.monatlich} />{" "}
                <span className="text-[0.78rem] font-medium text-ink-muted">je Monat</span>
              </span>
            </p>
            {/* Der eine ehrliche Satz zur Laufzeit schon HIER, nicht
                erst an der Kasse. Einzelheiten stehen dort
                (config/vertragstexte.ts), die Regeln in lib/laufzeit.ts. */}
            <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-muted">
              {paketPosten && paketPosten.paymentMode !== "once"
                ? `Monatliche Pakete: ${formatMenge(PAKET_MINDESTLAUFZEIT_MONATE, "Monate")} Mindestlaufzeit, danach monatlich kündbar. Weitere monatliche Leistungen sind jederzeit zum Monatsende kündbar.`
                : "Monatliche Leistungen sind zum Monatsende kündbar, Einzelheiten an der Kasse."}
            </p>
          </div>
        ) : null}
        {/* Sofortzahlungs-Rabatt, Satz aus site.config.ts */}
        {totals.hatEinmalig ? (
          <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-background px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={instantPayment}
              onChange={(e) => setInstantPayment(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-[0.85rem] leading-snug">
              Sofortzahlung: {instantDiscountPercentLabel()} Rabatt {rabattBezug}
            </span>
          </label>
        ) : null}
        {/* Bruttopreise für Verbraucher nach PAngV, Text zentral in site.config.ts */}
        <p className="pt-0.5 text-[0.75rem] text-ink-muted">{siteConfig.vatNote}</p>
      </div>
    ) : null;

  const summaryContent = (
    <>
      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        Ihre Auswahl
      </p>
      <p className="mt-1.5 text-[0.85rem] text-ink-muted">
        Objektart: {siteConfig.serviceCategories.find((c) => c.id === category)?.label}
      </p>
      <div className="mt-4">
        {cart.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-background px-3.5 py-4 text-[0.85rem] text-ink-muted">
            Noch nichts gewählt. Klicken Sie Leistungen an, um Ihr Wunsch-Paket
            zu füllen.
          </p>
        ) : (
          <>
            {/* Block 1: Paket-Basis mit Paketpreis und Zahlungsart */}
            {paketBlock}
            {/* Block 2: zusätzliche einmalige Leistungen mit Zwischensumme */}
            {zusatzEinmalig.length > 0 ? (
              <div className={cn(paketBlock && "mt-3")}>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Zusätzliche Leistungen, einmalig
                </p>
                <ul className="mt-1.5 space-y-2.5">{zusatzEinmalig.map(postenZeile)}</ul>
                <p className="mt-1.5 flex items-baseline justify-between gap-3 px-1 text-[0.8rem] tabular-nums text-ink-muted">
                  <span>Zwischensumme</span>
                  <span className="font-medium text-ink">{formatEuroBetrag(summe(zusatzEinmalig))}</span>
                </p>
              </div>
            ) : null}
            {/* Block 3: zusätzliche monatliche Leistungen mit Zwischensumme */}
            {zusatzMonatlich.length > 0 ? (
              <div className={cn((paketBlock || zusatzEinmalig.length > 0) && "mt-3")}>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Zusätzliche Leistungen, monatlich
                </p>
                <ul className="mt-1.5 space-y-2.5">{zusatzMonatlich.map(postenZeile)}</ul>
                <p className="mt-1.5 flex items-baseline justify-between gap-3 px-1 text-[0.8rem] tabular-nums text-ink-muted">
                  <span>Zwischensumme</span>
                  <span className="font-medium text-ink">{formatEuroBetrag(summe(zusatzMonatlich))} je Monat</span>
                </p>
              </div>
            ) : null}
            {summaryTotals}
            {/* Ehrlicher Paketvergleich: ruhige Box, kein Drängen */}
            {vergleich ? (
              <div className="mt-4 rounded-2xl border border-primary/15 bg-surface-tint p-4">
                <p className="flex items-start gap-2 text-[0.85rem] leading-relaxed">
                  <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
                  <span>
                    Mit dem Paket <strong>{vergleich.paket.name}</strong> für{" "}
                    {paketPreisLabel(vergleich.paket)} wären diese Leistungen{" "}
                    <strong className="tabular-nums text-accent-deep">
                      {ersparnisLabel(vergleich)}
                    </strong>{" "}
                    günstiger als Ihre Einzelauswahl.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={wechsleZuPaket}
                  className="mt-3 inline-flex items-center rounded-full border border-primary/25 px-4 py-1.5 text-[0.82rem] font-medium text-primary transition-colors hover:border-primary/60 hover:bg-background"
                >
                  Zum Paket wechseln
                </button>
              </div>
            ) : null}
            {/* Direkter Weg zur Kasse, aus jeder Phase heraus */}
            <Link
              prefetch={navPrefetch}
              href="/kasse"
              className="btn-primary mt-4 w-full !px-5 !py-3 text-[0.92rem]"
            >
              Zur Kasse
              <ArrowRight size={15} strokeWidth={1.8} />
            </Link>
          </>
        )}
      </div>
      {/* EINE ZEICHENSPALTE FUER ALLE DREI ZEILEN (Beanstandung des
          Inhabers, 20.08.2026, Punkt 9): Die beiden Hinweise tragen
          ein Zeichen und ruecken ihren Text dadurch ein, der Verweis
          darunter trug keines und begann buendig links. Gemessen
          waren das 23px Versatz. Als Raster mit fester erster Spalte
          stehen alle drei Texte auf derselben Kante, und die leere
          Zelle des Verweises braucht keine ausgerechnete Einrueckung,
          die beim naechsten Zeichenwechsel wieder falsch waere.

          WO KOMMT DER GUTSCHEINCODE HIN: Wer einen hat, sucht ihn hier,
          denn hier stehen die Betraege. Das Feld bleibt trotzdem allein
          an der Kasse; ein zweites waere eine zweite Pruefstelle fuer
          denselben Code. Also nur der Satz, der den Weg sagt. */}
      <div className="mt-4 grid grid-cols-[15px_minmax(0,1fr)] items-start gap-x-2 gap-y-2 text-[0.82rem] leading-relaxed text-ink-muted">
        <ShieldCheck size={15} strokeWidth={1.8} className="mt-0.5 text-primary" />
        <span>Verbindlich wird Ihre Bestellung erst an der Kasse.</span>
        {cart.length > 0 ? (
          <>
            <TicketPercent size={15} strokeWidth={1.8} className="mt-0.5 text-primary" />
            <span>Einen Gutscheincode geben Sie an der Kasse ein.</span>
          </>
        ) : null}
        <span aria-hidden="true" />
        <span>
          <Link href="/leistungen" className="font-medium text-primary transition-colors hover:text-primary-dark">
            Alle Details zu den Leistungen
          </Link>
        </span>
      </div>
    </>
  );

  return (
    /*
     * In der Übersicht (Schritt 4) entfällt die Seitenleiste: Der
     * Hauptbereich zeigt dort die komplette Zusammenstellung selbst,
     * eine zweite Kopie daneben würde nur doppeln.
     */
    <div className={cn(step < 3 && "lg:grid lg:grid-cols-[1fr,330px] lg:gap-10")}>
      <div>
        {/* Fortschrittsanzeige */}
        <nav aria-label="Schritte des Konfigurators" className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={step === i ? "step" : undefined}
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-[0.85rem] font-medium transition-colors duration-200",
                step === i
                  ? "border-primary bg-primary text-background"
                  : i < step
                    ? "border-primary/30 bg-surface-tint text-primary"
                    : "border-line bg-paper text-ink-muted hover:text-ink"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[0.72rem] font-semibold tabular-nums",
                  step === i ? "bg-background/20" : "bg-surface"
                )}
              >
                {i < step ? <CheckCircle2 size={13} strokeWidth={2.2} /> : i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Hinweis bei automatisch angepasster Auswahl, bleibt beim Scrollen sichtbar */}
        <AuswahlHinweis hinweis={hinweis} onClose={schliesseHinweis} className="sticky top-20 z-30" />

        {/* Objektart und Schnell-Check nur am Anfang */}
        {step === 0 ? (
          <div className="mt-8 space-y-5">
            <div>
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Ihre Objektart
              </p>
              {/* Umbruch erlaubt, sonst passt "Mehrfamilienhaus" bei
                  320 px nicht mehr in die Zeile und schiebt die Seite
                  seitlich auf. Dieselbe Stelle steckt im Leistungs-Katalog
                  (components/leistungen/ServiceCatalog.tsx). */}
              <div
                role="group"
                aria-label="Objektart wählen"
                className="mt-2.5 inline-flex max-w-full flex-wrap rounded-3xl border border-line bg-paper p-1.5 shadow-soft"
              >
                {siteConfig.serviceCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={category === cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "rounded-full px-4 py-2 text-[0.88rem] font-medium transition-colors duration-200",
                      category === cat.id ? "bg-primary text-background" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Dieselbe Abgrenzung wie im Erfassungs-Assistenten */}
              <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-muted">
                {OBJEKTART_ERKLAERUNGEN[category as Objektart]}
              </p>
            </div>

            {/* Optionaler Schnell-Check */}
            <div className="rounded-2xl border border-line/70 bg-paper p-5">
              <p className="font-medium">Kurzer Schnell-Check, optional</p>
              <p className="mt-1 text-[0.85rem] text-ink-muted">
                Drei Fragen, danach sind die Empfehlungen auf Ihre Lage
                zugeschnitten. Sie können jede Antwort jederzeit ändern.
              </p>
              <ul className="mt-4 space-y-3.5">
                {QUICK_CHECK.map((q) => {
                  const antwortWert = checkAnswers[q.serviceId];
                  return (
                    <li
                      key={q.serviceId}
                      className="border-t border-line/50 pt-3.5 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[0.9rem]">{q.frage}</span>
                        <span className="flex gap-1.5">
                          {[true, false].map((antwort) => (
                            <button
                              key={String(antwort)}
                              type="button"
                              aria-pressed={antwortWert === antwort}
                              onClick={() => antworte(q.serviceId, antwort)}
                              className={cn(
                                "rounded-full border px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors",
                                antwortWert === antwort
                                  ? "border-primary bg-primary text-background"
                                  : "border-line bg-background text-ink-muted hover:text-ink"
                              )}
                            >
                              {antwort ? "Ja" : "Nein"}
                            </button>
                          ))}
                        </span>
                      </div>
                      {/* DIE RUHIGE RUECKMELDUNG. Sie steht hier und nicht
                          nur an der Karte, weil zwei der drei Leistungen
                          erst in einer spaeteren Phase auftauchen. Ohne
                          diese Zeile bliebe die Antwort dort unsichtbar,
                          wo sie gegeben wurde. */}
                      {antwortWert !== null ? (
                        <p className="mt-1.5 max-w-prose text-[0.82rem] leading-relaxed text-ink-muted">
                          {antwortWert ? q.beiJa : q.beiNein}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {beantwortet > 0 ? (
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line/50 pt-3">
                  <p className="text-[0.82rem] text-ink-muted">
                    {beantwortet} von {QUICK_CHECK.length} beantwortet, Ihre
                    Empfehlungen sind angepasst.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      for (const q of QUICK_CHECK) antworte(q.serviceId, null);
                    }}
                    className="text-[0.82rem] font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
                  >
                    Antworten zurücksetzen
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Phasen-Schritte */}
        <AnimatePresence mode="wait" initial={false} onExitComplete={scrollToPhaseStart}>
          <m.div
            key={step}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-8"
          >
            {step < 3 ? (
              <>
                <h2 ref={phaseHeadingRef} tabIndex={-1} className="font-heading text-h3 text-ink">
                  {siteConfig.servicePhases[step].label}
                </h2>
                <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">
                  {siteConfig.servicePhases[step].intro}
                </p>
                <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 md:grid-cols-2">
                  {phaseServices(siteConfig.servicePhases[step].id).map((service) => {
                    // Sperr-Zustand und Begründung kommen aus der
                    // gemeinsamen Logik, identisch mit /leistungen
                    const sperre = sperrInfo(service.id);
                    return (
                      <KonfiguratorCard
                        key={service.id}
                        service={service}
                        selected={isSelected(service.id)}
                        variant={cartEntry(service.id)?.variant ?? service.variants?.[0] ?? null}
                        quantity={cartEntry(service.id)?.quantity ?? 1}
                        empfehlung={empfehlungFor(service.id)}
                        imPaket={imPaketIds.has(service.id)}
                        gesperrt={sperre.gesperrt}
                        gesperrtHinweis={sperre.hinweis}
                        gesperrtGrund={sperre.grund}
                        onToggle={() => toggleService(service.id)}
                        onVariantChange={(variant) => changeVariant(service.id, variant)}
                        onQuantityChange={(quantity) => changeQuantity(service.id, quantity)}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <h2 ref={phaseHeadingRef} tabIndex={-1} className="font-heading text-h3 text-ink">
                  Ihre Übersicht
                </h2>
                <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">
                  Prüfen Sie Ihre Auswahl in Ruhe. An der Kasse geben Sie Ihre
                  Daten an und schließen die Bestellung ab.
                </p>

                {cart.length === 0 ? (
                  <p className="mt-6 max-w-xl rounded-xl border border-dashed border-line bg-background px-4 py-3 text-[0.9rem] text-ink-muted">
                    Ihr Warenkorb ist noch leer. Wählen Sie in den Phasen
                    Leistungen aus, dann geht es hier zur Kasse.
                  </p>
                ) : (
                  <div className="mt-8 max-w-3xl">
                    {/* Die Zusammenstellung als großes Bestell-Dokument */}
                    <div className="rounded-4xl border border-line/70 bg-paper p-6 shadow-card sm:p-8">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h3 className="font-heading text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">
                          Ihre Zusammenstellung
                        </h3>
                        <p className="text-[0.88rem] text-ink-muted">
                          Objektart:{" "}
                          {siteConfig.serviceCategories.find((c) => c.id === category)?.label}
                        </p>
                      </div>

                      {/* Paket-Basis mit Zahlungsart und enthaltenen Leistungen */}
                      {paketPosten && paketConfig ? (
                        <div className="mt-5 rounded-2xl border border-primary/20 bg-surface-tint p-5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="flex items-center gap-2.5 text-[1.05rem] font-semibold">
                              <Package size={18} strokeWidth={1.8} className="shrink-0 text-primary" />
                              Paket {paketConfig.name}
                            </p>
                            <button
                              type="button"
                              aria-label={`Paket ${paketConfig.name} entfernen`}
                              onClick={entfernePaketBasis}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-background hover:text-ink"
                            >
                              <X size={15} strokeWidth={2} />
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div
                              role="group"
                              aria-label="Zahlungsart des Pakets"
                              className="inline-flex rounded-full border border-line bg-background p-0.5"
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
                                  aria-pressed={(paketPosten.paymentMode ?? "monthly") === option.id}
                                  onClick={() =>
                                    updateCartItem(paketPosten.key, { paymentMode: option.id })
                                  }
                                  className={cn(
                                    "rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors",
                                    (paketPosten.paymentMode ?? "monthly") === option.id
                                      ? "bg-primary text-background"
                                      : "text-ink-muted hover:text-ink"
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <p className="text-[1.25rem] font-semibold tabular-nums">
                              <AnimierteSumme value={cartLinePrice(paketPosten) ?? 0} />{" "}
                              <span className="text-[0.85rem] font-medium text-ink-muted">
                                {paketPosten.paymentMode === "once" ? "einmalig" : "pro Monat"}
                              </span>
                            </p>
                          </div>
                          {/* Immer-monatliche Bestandteile beim Einmal-Kauf:
                              derselbe Hinweis wie in der Auswahl-Leiste, sonst
                              zeigt die Uebersicht weniger als die Kasse */}
                          {paketEigeneMonatsposten(paketPosten).map((posten) => (
                            <p
                              key={posten.service.id}
                              className="mt-3 rounded-xl bg-background px-3.5 py-2.5 text-[0.82rem] leading-snug text-ink-muted"
                            >
                              {posten.service.name}: läuft als eigene monatliche Position mit{" "}
                              <span className="font-semibold text-ink">
                                {formatEuroBetrag(posten.preis)} je Monat
                              </span>
                              , monatlich kündbar. Im Monatspreis des Pakets wäre sie enthalten.
                            </p>
                          ))}
                          {/* Einmalkauf: Umfang des Anfragenmanagements,
                              gleiche Dauer wie die Portalschaltung */}
                          {paketConfig.includedServiceIds.some(
                            (e) => e.id === "ki-anfragenmanagement"
                          ) &&
                          !(paketPosten.abgewaehlt ?? []).includes("ki-anfragenmanagement") ? (
                            <p className="mt-3 rounded-xl bg-background px-3.5 py-2.5 text-[0.82rem] leading-snug text-ink-muted">
                              {paketPosten.paymentMode === "once"
                                ? ANFRAGEN_EINMALKAUF_HINWEIS
                                : ANFRAGEN_MONATLICH_HINWEIS}
                            </p>
                          ) : null}
                          <ul className="mt-4 grid gap-x-6 gap-y-2 border-t border-line/50 pt-4 sm:grid-cols-2">
                            {paketConfig.includedServiceIds.map((eintrag) => {
                              const service = getService(eintrag.id);
                              if (!service) return null;
                              const abgewaehlt = (paketPosten.abgewaehlt ?? []).includes(eintrag.id);
                              return (
                                <li key={eintrag.id} className="flex items-start justify-between gap-3">
                                  <span
                                    className={cn(
                                      "flex min-w-0 flex-1 items-start gap-2 text-[0.88rem] leading-snug",
                                      abgewaehlt && "text-ink-muted"
                                    )}
                                  >
                                    <Check
                                      size={14}
                                      strokeWidth={2.2}
                                      className={cn("mt-0.5 shrink-0", abgewaehlt ? "text-line" : "text-success")}
                                    />
                                    <span className={cn(abgewaehlt && "line-through decoration-ink-muted/60")}>
                                      {service.name}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={
                                      abgewaehlt
                                        ? `${service.name} wieder nutzen`
                                        : `${service.name} abwählen`
                                    }
                                    onClick={() => togglePaketLeistung(eintrag.id)}
                                    className="shrink-0 whitespace-nowrap rounded-md text-[0.78rem] font-medium text-primary transition-colors hover:text-primary-dark"
                                  >
                                    {abgewaehlt ? "wieder nutzen" : "abwählen"}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-muted">
                            Abgewählte Leistungen ändern den Paketpreis nicht,
                            Sie nutzen sie nur nicht.
                          </p>
                        </div>
                      ) : null}

                      {/* Zusätzliche Posten, einmalig und monatlich getrennt */}
                      {(
                        [
                          { titel: "Zusätzliche Leistungen, einmalig", posten: zusatzEinmalig, zusatz: "" },
                          { titel: "Zusätzliche Leistungen, monatlich", posten: zusatzMonatlich, zusatz: " je Monat" },
                        ] as const
                      ).map((block) =>
                        block.posten.length > 0 ? (
                          <div key={block.titel} className="mt-5">
                            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                              {block.titel}
                            </p>
                            <ul className="mt-1 divide-y divide-line/50">
                              {block.posten.map((item) => (
                                <li key={item.key} className="flex items-start justify-between gap-4 py-3">
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[0.95rem] font-medium leading-snug">
                                      {item.name}
                                    </span>
                                    {(item.variant || item.quantity > 1) && (
                                      <span className="mt-0.5 block text-[0.82rem] text-ink-muted">
                                        {[item.variant, cartMengeLabel(item)]
                                          .filter(Boolean)
                                          .join(", ")}
                                      </span>
                                    )}
                                    {item.autoReason ? (
                                      <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-ink-muted">
                                        {item.autoReason}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="flex shrink-0 items-start gap-1.5">
                                    <span className="text-[0.95rem] font-semibold tabular-nums">
                                      {formatEuroBetrag(cartLinePrice(item) ?? 0)}
                                      <span className="text-[0.78rem] font-medium text-ink-muted">{block.zusatz}</span>
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`${item.name} entfernen`}
                                      onClick={() => entfernePosten(item)}
                                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                    >
                                      <X size={14} strokeWidth={2} />
                                    </button>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null
                      )}

                      {/* Summen, strikt getrennt, mit Rabatt-Status */}
                      <div className="mt-5 space-y-2 border-t border-line/60 pt-4 tabular-nums">
                        {totals.hatEinmalig ? (
                          <div>
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-[1.02rem] font-semibold">Einmalig gesamt</span>
                              <span className="text-right">
                                {rabatt > 0 ? (
                                  <>
                                    <span className="block text-[0.82rem] text-ink-muted line-through">
                                      {formatEuroBetrag(totals.einmalig)}
                                    </span>
                                    <AnimierteSumme
                                      value={totals.einmalig - rabatt}
                                      className="block text-[1.35rem] font-semibold leading-tight"
                                    />
                                  </>
                                ) : (
                                  <AnimierteSumme
                                    value={totals.einmalig}
                                    className="text-[1.15rem] font-semibold"
                                  />
                                )}
                              </span>
                            </div>
                            {rabatt > 0 ? (
                              <p className="mt-0.5 text-right text-[0.85rem] font-semibold text-accent-deep">
                                Sie sparen <AnimierteSumme value={rabatt} />
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {totals.hatMonatlich ? (
                          <p className="flex items-baseline justify-between gap-4">
                            <span className="text-[1.02rem] font-semibold">Monatlich gesamt</span>
                            <span className="text-[1.15rem] font-semibold">
                              <AnimierteSumme value={totals.monatlich} />{" "}
                              <span className="text-[0.82rem] font-medium text-ink-muted">je Monat</span>
                            </span>
                          </p>
                        ) : null}
                        {totals.hatEinmalig ? (
                          <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-background px-4 py-3">
                            <input
                              type="checkbox"
                              checked={instantPayment}
                              onChange={(e) => setInstantPayment(e.target.checked)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                            />
                            <span className="text-[0.88rem] leading-snug">
                              Sofortzahlung: {instantDiscountPercentLabel()} Rabatt {rabattBezug}
                            </span>
                          </label>
                        ) : null}
                        {/* Bruttopreise für Verbraucher nach PAngV */}
                        <p className="pt-0.5 text-[0.78rem] text-ink-muted">{siteConfig.vatNote}</p>
                        {/* Dieselbe Zeile wie in der Seitenleiste, siehe
                            summaryContent. Sie steht hier ein zweites
                            Mal, weil die Uebersicht die Seitenleiste
                            ersetzt und der Kunde sonst nirgends mehr
                            erfaehrt, wo sein Code hingehoert. */}
                        <p className="flex items-start gap-2 pt-1 text-[0.82rem] leading-relaxed text-ink-muted">
                          <TicketPercent size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
                          <span>Einen Gutscheincode geben Sie an der Kasse ein.</span>
                        </p>
                      </div>

                      {/* Ehrlicher Paketvergleich, wie in der Seitenleiste */}
                      {vergleich ? (
                        <div className="mt-4 rounded-2xl border border-primary/15 bg-surface-tint p-4">
                          <p className="flex items-start gap-2 text-[0.88rem] leading-relaxed">
                            <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
                            <span>
                              Mit dem Paket <strong>{vergleich.paket.name}</strong> für{" "}
                              {paketPreisLabel(vergleich.paket)} wären diese Leistungen{" "}
                              <strong className="tabular-nums text-accent-deep">
                                {ersparnisLabel(vergleich)}
                              </strong>{" "}
                              günstiger als Ihre Einzelauswahl.
                            </span>
                          </p>
                          <button
                            type="button"
                            onClick={wechsleZuPaket}
                            className="mt-3 inline-flex items-center rounded-full border border-primary/25 px-4 py-1.5 text-[0.82rem] font-medium text-primary transition-colors hover:border-primary/60 hover:bg-background"
                          >
                            Zum Paket wechseln
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* So geht es weiter: der Ablauf in drei ruhigen Schritten */}
                    <div className="mt-6 rounded-3xl border border-line/70 bg-surface p-6 sm:p-7">
                      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        So geht es weiter
                      </p>
                      <ol className="mt-5 grid gap-6 sm:grid-cols-3 sm:gap-5">
                        {ABLAUF.map((schritt, i) => (
                          <li key={schritt.titel} className="flex items-start gap-3.5 sm:flex-col sm:gap-0">
                            <div className="flex items-center sm:mb-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-paper font-heading text-[0.95rem] font-semibold text-primary">
                                {i + 1}
                              </span>
                              {i < ABLAUF.length - 1 ? (
                                <span aria-hidden="true" className="ml-3 hidden h-px flex-1 bg-line sm:block" />
                              ) : null}
                            </div>
                            <div>
                              <p className="text-[0.92rem] font-semibold leading-snug">{schritt.titel}</p>
                              <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-muted">
                                {schritt.text}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}

                {/* Aktionen: Kasse im Mittelpunkt, Zurück dezent */}
                <div className="mt-8 flex flex-wrap items-center gap-5">
                  {cart.length > 0 ? (
                    <Link prefetch={navPrefetch} href="/kasse" className="btn-primary">
                      Weiter zur Kasse
                      <ArrowRight size={16} strokeWidth={1.8} />
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 rounded-md text-[0.92rem] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    <ArrowLeft size={15} strokeWidth={1.8} />
                    Zurück zu Phase 3
                  </button>
                </div>
              </>
            )}
          </m.div>
        </AnimatePresence>

        {/* Vor und zurück, in der Übersicht übernehmen deren eigene Aktionen */}
        {step < 3 ? (
          <div className="mt-10 flex flex-wrap items-center gap-4 pb-24 lg:pb-0">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary">
                <ArrowLeft size={16} strokeWidth={1.8} />
                Zurück
              </button>
            ) : null}
            <button type="button" onClick={() => setStep(step + 1)} className="btn-primary">
              {step === 2 ? "Zur Übersicht" : `Weiter zu Phase ${step + 2}`}
              <ArrowRight size={16} strokeWidth={1.8} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Desktop: ständig sichtbare Zusammenfassung rechts, außer in der Übersicht */}
      {step < 3 ? (
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-3xl border border-line/70 bg-paper p-6 shadow-soft">
            {summaryContent}
          </div>
        </aside>
      ) : null}

      {/* Mobil: aufklappbare Leiste unten, in der Übersicht überflüssig */}
      {step < 3 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <AnimatePresence>
          {summaryOpen ? (
            <m.div
              initial={reduced ? false : { y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: 30, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 0.61, 0.36, 1] }}
              className="mx-4 mb-2 max-h-[55vh] overflow-y-auto rounded-2xl border border-line bg-paper p-5 shadow-lift"
            >
              {summaryContent}
            </m.div>
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          aria-expanded={summaryOpen}
          onClick={() => setSummaryOpen((v) => !v)}
          className="flex w-full items-center justify-between border-t border-line bg-background/95 px-5 py-3.5 pr-24 backdrop-blur-lg"
        >
          <span className="text-[0.9rem] font-medium">
            Ihre Auswahl ({cart.length})
          </span>
          <ChevronUp
            size={17}
            strokeWidth={2}
            className={cn("transition-transform duration-300", summaryOpen && "rotate-180")}
          />
        </button>
        </div>
      ) : null}
    </div>
  );
}
