import type { CartItem } from "@/lib/cart-store";
import { cartTotals, formatEuroBetrag } from "@/lib/preise";
import { siteConfig, type SitePackage } from "@/site.config";

/**
 * Ehrlicher Paketvergleich: Deckt die aktuelle Einzelauswahl alle
 * Leistungen eines Standard-Pakets ab und ist dabei teurer, weisen wir
 * ruhig darauf hin und bieten den Wechsel an.
 *
 * Verglichen wird sauber getrennt: einmalige Leistungen gegen den
 * Einmalpreis des Pakets, monatliche gegen den Monatspreis. Das Paket
 * gilt nur dann als günstiger, wenn es in keiner der beiden Sphären
 * teurer ist und in mindestens einer spart.
 *
 * TODO Vergleichslogik fachlich prüfen, sobald finale Preise stehen:
 * - Abgedeckt wird auf Leistungs-Ebene (id) geprüft, die Variante bleibt
 *   außen vor (das Paket enthält z. B. immer die Multi-Portal-Variante).
 * - Mengen zählen mit dem Zeilenbetrag aus dem Warenkorb.
 * - Mit den aktuellen Beispielpreisen liegt die Summe der enthaltenen
 *   Einzel-Leistungen einmalig UNTER dem Paket-Einmalpreis, der Hinweis
 *   erscheint dann rechnerisch korrekt nicht. Ob das mit finalen Preisen
 *   so bleiben soll, ist eine Preis-Entscheidung.
 */

export type PaketVergleich = {
  paket: SitePackage;
  /** Warenkorb-Einträge, die das Paket ersetzen würde */
  abgedeckt: readonly CartItem[];
  ersparnisEinmalig: number;
  ersparnisMonatlich: number;
};

/**
 * Bestes günstigeres Paket zur aktuellen Einzelauswahl, sonst null.
 * Sind mehrere Pakete günstiger, gewinnt die größte Gesamtersparnis.
 */
export function findePaketVergleich(cart: readonly CartItem[]): PaketVergleich | null {
  const serviceItems = cart.filter((item) => item.type === "leistung");
  let bester: PaketVergleich | null = null;
  for (const paket of siteConfig.packages) {
    if (paket.includedServiceIds.length === 0) continue;
    const abgedeckt = paket.includedServiceIds.map((e) =>
      serviceItems.find((item) => item.id === e.id)
    );
    // Nur wenn die Auswahl wirklich ALLE Paket-Leistungen enthält
    if (abgedeckt.some((item) => item === undefined)) continue;
    const items = abgedeckt as CartItem[];
    const totals = cartTotals(items);
    const ersparnisEinmalig = totals.einmalig - paket.once;
    const ersparnisMonatlich = totals.monatlich - paket.monthly;
    if (ersparnisEinmalig < 0 || ersparnisMonatlich < 0) continue;
    if (ersparnisEinmalig + ersparnisMonatlich <= 0) continue;
    if (
      !bester ||
      ersparnisEinmalig + ersparnisMonatlich >
        bester.ersparnisEinmalig + bester.ersparnisMonatlich
    ) {
      bester = { paket, abgedeckt: items, ersparnisEinmalig, ersparnisMonatlich };
    }
  }
  return bester;
}

/** Ersparnis als Text, z. B. "149 € einmalig und 49 € je Monat" */
export function ersparnisLabel(v: PaketVergleich): string {
  const teile: string[] = [];
  if (v.ersparnisEinmalig > 0) teile.push(`${formatEuroBetrag(v.ersparnisEinmalig)} einmalig`);
  if (v.ersparnisMonatlich > 0) teile.push(`${formatEuroBetrag(v.ersparnisMonatlich)} je Monat`);
  return teile.join(" und ");
}

/**
 * Paketpreis als Text, z. B. "899 € einmalig oder 169 € je Monat".
 * ODER, nicht "plus": Der Kunde waehlt EINE Zahlungsart der Basis
 * (paymentMode). Das fruehere "plus" behauptete, beide Preise fielen
 * zusammen an, und genau so eine Zeile findet ein Kunde.
 */
export function paketPreisLabel(paket: SitePackage): string {
  return `${formatEuroBetrag(paket.once)} einmalig oder ${formatEuroBetrag(paket.monthly)} je Monat`;
}
