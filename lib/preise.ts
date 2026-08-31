import { SERVICES, servicePrice, siteConfig, type SiteService } from "@/site.config";
import type { CartItem } from "@/lib/cart-store";

/**
 * Preisrechnung für den Warenkorb. Die Beträge werden immer frisch aus
 * dem Katalog in site.config.ts berechnet (nicht aus gespeicherten
 * Einträgen), damit ältere localStorage-Stände keine falschen oder
 * fehlenden Preise zeigen.
 */

/**
 * Betrag mit Euro-Zeichen.
 *
 * DAS LEERZEICHEN VOR DEM € IST EIN GESCHUETZTES (U+00A0), und das ist
 * kein Feinschliff: Mit einem gewoehnlichen Leerzeichen darf jede
 * Zeile zwischen Zahl und Waehrung umbrechen. Auf einem schmalen
 * Bildschirm stand dann "649" am Zeilenende und "€" allein in der
 * naechsten Zeile. Intl setzt bei style "currency" von sich aus ein
 * geschuetztes Zeichen; hier wird es von Hand angehaengt, also muss es
 * hier auch geschuetzt sein.
 *
 * ACHTUNG: Das Zeichen ist im Quelltext unsichtbar und sieht aus wie
 * ein gewoehnliches Leerzeichen. Wer die Zeile neu tippt, tippt es
 * versehentlich weg. Dieselbe Stelle gibt es in lib/expose.ts,
 * site.config.ts, StatistikenBereich.tsx und Zusammenfassung.tsx.
 */
export function formatEuroBetrag(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value)} €`;
}

/** Paket aus site.config.ts zu einem Paket-Posten im Warenkorb */
export function paketZuItem(item: CartItem) {
  if (item.type !== "paket") return null;
  return siteConfig.packages.find((p) => p.id === item.id) ?? null;
}

/** Ist der Eintrag ein laufender Posten mit Monatspreis? */
export function isMonthlyItem(item: CartItem): boolean {
  if (item.type === "paket") {
    // Paket-Basis: die gewählte Zahlungsart entscheidet
    return item.paymentMode !== "once";
  }
  return Boolean(SERVICES.find((s) => s.id === item.id)?.monthly);
}

/** Zeilenbetrag eines Eintrags (Stückpreis mal Anzahl), null ohne Preis */
export function cartLinePrice(item: CartItem): number | null {
  if (item.type === "paket") {
    // Paketpreis immer frisch aus der Config, je nach Zahlungsart
    const paket = paketZuItem(item);
    if (!paket) return item.price;
    return item.paymentMode === "once" ? paket.once : paket.monthly;
  }
  const service = SERVICES.find((s) => s.id === item.id);
  if (!service) return item.price;
  const price = servicePrice(service, item.variant);
  if (price === null) return null;
  return price * Math.max(1, item.quantity);
}

/**
 * Anzeigetext zur Menge eines zaehlbaren Postens, mit der Einheit aus
 * dem Katalog: "2 Monate" statt "2x". Der Unterschied traegt bei der
 * Verlaengerung der Portallaufzeit: "(2x)" neben einem Monatspreis las
 * sich wie ein Abo, tatsaechlich werden die Monate einmal im Voraus
 * bezahlt. null bei Menge 1, dort steht nichts dabei.
 */
export function cartMengeLabel(item: CartItem): string | null {
  if (item.type !== "leistung" || item.quantity <= 1) return null;
  const service = SERVICES.find((s) => s.id === item.id);
  if (
    service?.countable &&
    service.unit &&
    !service.name.toLowerCase().includes(service.unit.toLowerCase())
  ) {
    return `${item.quantity} ${service.unit}`;
  }
  return `${item.quantity}x`;
}

/** Anzeigetext zum Zeilenbetrag, laufende Posten mit Zusatz */
export function cartLineLabel(item: CartItem): string | null {
  const price = cartLinePrice(item);
  if (price === null) return null;
  if (item.type === "paket") {
    return isMonthlyItem(item)
      ? `${formatEuroBetrag(price)} pro Monat`
      : `${formatEuroBetrag(price)} einmalig`;
  }
  return isMonthlyItem(item) ? `${formatEuroBetrag(price)} je Monat` : formatEuroBetrag(price);
}

export type CartTotals = {
  /** Summe aller einmaligen Leistungen */
  einmalig: number;
  /** Summe aller monatlichen Leistungen, je Monat */
  monatlich: number;
  hatEinmalig: boolean;
  hatMonatlich: boolean;
};

/** Rabattbetrag bei Sofortzahlung, gerundet auf ganze Euro */
export function instantDiscountAmount(einmalig: number): number {
  return Math.round(einmalig * siteConfig.instantPaymentDiscount);
}

/** Rabattsatz als Anzeigetext, z. B. "10 %" */
export function instantDiscountPercentLabel(): string {
  return `${Math.round(siteConfig.instantPaymentDiscount * 100)} %`;
}

/**
 * Enthaltene Leistungen eines EINMALIG gekauften Pakets, die trotzdem
 * monatlich laufen (eigenstaendigMonatlich, aktuell die
 * Makler-Begleitung). Entschieden am 10.08.2026: Sie stecken NIE im
 * Einmalpreis, sondern erscheinen als eigene monatliche Position.
 * Beim MONATLICHEN Paket sind sie dagegen im Monatspreis enthalten,
 * das ist der Paketvorteil.
 */
export function paketEigeneMonatsposten(
  item: CartItem
): { service: SiteService; preis: number }[] {
  if (item.type !== "paket" || item.paymentMode !== "once") return [];
  const paket = paketZuItem(item);
  if (!paket) return [];
  const abgewaehlt = new Set(item.abgewaehlt ?? []);
  return paket.includedServiceIds
    .filter((e) => !abgewaehlt.has(e.id))
    .map((e) => SERVICES.find((s) => s.id === e.id))
    .filter((s): s is SiteService => Boolean(s?.eigenstaendigMonatlich))
    .map((s) => ({ service: s, preis: servicePrice(s, null) ?? 0 }));
}

/** Zwischensummen: einmalige und monatliche Leistungen getrennt */
export function cartTotals(items: readonly CartItem[]): CartTotals {
  let einmalig = 0;
  let monatlich = 0;
  let hatEinmalig = false;
  let hatMonatlich = false;
  for (const item of items) {
    const price = cartLinePrice(item);
    if (price === null) continue;
    if (isMonthlyItem(item)) {
      monatlich += price;
      hatMonatlich = true;
    } else {
      einmalig += price;
      hatEinmalig = true;
    }
    // Die immer-monatlichen Bestandteile eines Einmal-Pakets laufen
    // als eigene monatliche Position mit (siehe oben)
    for (const posten of paketEigeneMonatsposten(item)) {
      monatlich += posten.preis;
      hatMonatlich = true;
    }
  }
  return { einmalig, monatlich, hatEinmalig, hatMonatlich };
}
