import { vollerName } from "@/lib/name";
import { siteConfig } from "@/site.config";
import { ANFRAGEN_EINMALKAUF_HINWEIS } from "@/config/vertragstexte";
import type { CartItem } from "@/lib/cart-store";
import {
  cartLineLabel,
  cartTotals,
  formatEuroBetrag,
  instantDiscountAmount,
  instantDiscountPercentLabel,
  isMonthlyItem,
  paketEigeneMonatsposten,
  paketZuItem,
} from "@/lib/preise";

/**
 * Zentrale Abschluss-Funktion für das Wunsch-Paket.
 *
 * HEUTE: Baut aus Warenkorb und Kontaktdaten eine Bestellung als
 * mailto:-Nachricht an die Kontakt-E-Mail aus site.config.ts und öffnet
 * das E-Mail-Programm des Besuchers; die Auftragsbestätigung mit den
 * Zahlungsinformationen kommt danach per E-Mail. Die Nachricht spiegelt
 * exakt die Warenkorb-Struktur: Paket-Basis mit Zahlungsart, zusätzliche
 * einmalige und monatliche Posten getrennt, Summen nie vermischt.
 *
 * SEIT 12.08.2026 IST STRIPE ANGEBUNDEN (Elements-Weg): Mit
 * hinterlegten Schluesseln rechnet /api/checkout die Bestellung
 * serverseitig (lib/bestellung.ts, KEINE Preis-Kennungen in Stripe,
 * price_data aus site.config.ts) und die Kasse zeigt das Payment
 * Element. Dieser mailto-Weg hier bleibt bewusst als Rueckfallebene
 * fuer den Zustand OHNE Schluessel und wird sonst nie betreten.
 * Die stripePriceId-Felder im Katalog sind seither ohne Funktion.
 */

/**
 * Build-Zeit-Schalter für die Kasse: Sobald in den Umgebungsvariablen
 * ein NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY hinterlegt ist (Hostinger-App-
 * Einstellungen, danach neu deployen), gilt Stripe als angebunden. Der
 * Zahlungsbereich lädt dann das Payment Element und der Abschluss-Button
 * wechselt die Beschriftung. NEXT_PUBLIC-Variablen inlinet Next.js
 * automatisch ins Client-Bundle, hier steht kein Geheimnis.
 */
export const stripeBereit = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/** Beschriftung des Abschluss-Buttons, zentral und situationsabhängig */
export const BESTELL_BUTTON_LABEL = stripeBereit
  ? "Kostenpflichtig bestellen"
  : "Bestellung absenden";

export type ContactData = {
  /*
   * NAME IN ZWEI TEILEN, und das ist keine Kosmetik.
   *
   * Ein einziges Feld "Ihr Name" liefert "Anna Meier", "Meier, Anna",
   * "Dr. A. Meier-Schulz" und "anna". Aus so einem Wert laesst sich
   * hinterher weder eine Anrede bauen noch eine Rechnung adressieren,
   * und Stripe erwartet die Rechnungsanschrift mit einem sauberen
   * Namen. Wer den Namen einmal zerlegt bekommt, muss nie raten.
   *
   * Nur diese beiden Teile werden gespeichert. Den vollen Namen setzt
   * vollerName() bei Bedarf zusammen; er liegt nirgends ein zweites
   * Mal, sonst laufen die beiden Fassungen frueher oder spaeter
   * auseinander.
   */
  vorname: string;
  nachname: string;
  email: string;
  /** Optional */
  phone: string;
  category: string;
  /** Adresse der Immobilie */
  objektStrasse: string;
  objektPlz: string;
  objektStadt: string;
  /** Rechnungsadresse, standardmäßig identisch mit der Objektadresse */
  rechnungWieObjekt: boolean;
  rechnungStrasse?: string;
  rechnungPlz?: string;
  rechnungStadt?: string;
};

/**
 * Der vollstaendige Name eines Kontakts. Setzt nur zusammen, was
 * lib/name.ts vorgibt; die Regel steht dort, damit Kasse, Konto und
 * Admin nicht drei eigene Fassungen bekommen.
 */
export function kontaktName(kontakt: Pick<ContactData, "vorname" | "nachname">): string {
  return vollerName(kontakt.vorname, kontakt.nachname);
}

/** Warenkorb als lesbaren Text aufbereiten (für mailto und später Logs) */
export function formatOrderText(
  items: readonly CartItem[],
  contact: ContactData,
  instantPayment: boolean,
  zusatzHinweise: readonly string[] = []
): string {
  const lines: string[] = [];
  lines.push("Bestellung über selbst-verkauf.de");
  lines.push("");
  lines.push(`Name: ${kontaktName(contact)}`);
  lines.push(`E-Mail: ${contact.email}`);
  if (contact.phone) lines.push(`Telefon: ${contact.phone}`);
  lines.push(`Objektart: ${contact.category}`);
  const adresse = (strasse?: string, plz?: string, stadt?: string) =>
    [strasse, [plz, stadt].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  lines.push(
    `Objektadresse: ${adresse(contact.objektStrasse, contact.objektPlz, contact.objektStadt)}`
  );
  lines.push(
    `Rechnungsadresse: ${
      contact.rechnungWieObjekt
        ? "entspricht der Objektadresse"
        : adresse(contact.rechnungStrasse, contact.rechnungPlz, contact.rechnungStadt)
    }`
  );
  lines.push("");
  // Gleiche Struktur wie die Warenkorb-Zusammenfassung: Paket-Basis,
  // dann zusätzliche Posten getrennt nach einmalig und monatlich
  const paketPosten = items.find((item) => item.type === "paket") ?? null;
  const paket = paketPosten ? paketZuItem(paketPosten) : null;
  if (paketPosten && paket) {
    lines.push(`Ihr Paket: ${paket.name}`);
    lines.push(
      `Zahlungsart: ${paketPosten.paymentMode === "once" ? "einmalig" : "monatlich"} (${cartLineLabel(paketPosten)})`
    );
    // Immer-monatliche Bestandteile beim Einmal-Kauf als eigene Position
    for (const posten of paketEigeneMonatsposten(paketPosten)) {
      lines.push(
        `Dazu als eigene monatliche Position: ${posten.service.name}, ${formatEuroBetrag(posten.preis)} je Monat, monatlich kündbar`
      );
    }
    // Einmalkauf: Umfang des Anfragenmanagements gehoert in die
    // Bestellbestaetigung, nicht nur auf die Website (10.08.2026)
    if (
      paketPosten.paymentMode === "once" &&
      paket.includedServiceIds.some((e) => e.id === "ki-anfragenmanagement") &&
      !(paketPosten.abgewaehlt ?? []).includes("ki-anfragenmanagement")
    ) {
      lines.push(ANFRAGEN_EINMALKAUF_HINWEIS);
    }
    lines.push("Enthalten:");
    const abgewaehlt = new Set(paketPosten.abgewaehlt ?? []);
    for (const eintrag of paket.includedServiceIds) {
      const service = siteConfig.services.find((s) => s.id === eintrag.id);
      if (!service) continue;
      lines.push(
        `- ${service.name} (${abgewaehlt.has(eintrag.id) ? "abgewählt" : "im Paket enthalten"})`
      );
    }
    lines.push("");
  }
  const zusatzEinmalig = items.filter((i) => i.type === "leistung" && !isMonthlyItem(i));
  const zusatzMonatlich = items.filter((i) => i.type === "leistung" && isMonthlyItem(i));
  const postenZeilen = (posten: readonly CartItem[]) => {
    for (const item of posten) {
      const teile = [item.name];
      if (item.variant) teile.push(`Variante: ${item.variant}`);
      if (item.quantity > 1) teile.push(`Anzahl: ${item.quantity}`);
      const betrag = cartLineLabel(item);
      if (betrag) teile.push(betrag);
      lines.push(`- ${teile.join(", ")}`);
    }
  };
  if (zusatzEinmalig.length) {
    lines.push("Zusätzliche Leistungen, einmalig:");
    postenZeilen(zusatzEinmalig);
    lines.push("");
  }
  if (zusatzMonatlich.length) {
    lines.push("Zusätzliche Leistungen, monatlich:");
    postenZeilen(zusatzMonatlich);
    lines.push("");
  }
  const totals = cartTotals(items);
  if (totals.hatEinmalig || totals.hatMonatlich) {
    if (totals.hatEinmalig) lines.push(`Einmalig gesamt: ${formatEuroBetrag(totals.einmalig)}`);
    if (totals.hatMonatlich)
      lines.push(`Monatlich gesamt: ${formatEuroBetrag(totals.monatlich)} je Monat`);
    lines.push(`Sofortzahlung gewählt: ${instantPayment ? "ja" : "nein"}`);
    if (instantPayment && totals.hatEinmalig) {
      const rabatt = instantDiscountAmount(totals.einmalig);
      lines.push(
        `Rabatt Sofortzahlung (${instantDiscountPercentLabel()}, nur auf einmalige Posten): ${formatEuroBetrag(rabatt)}`
      );
      lines.push(`Rabattierte Einmalsumme: ${formatEuroBetrag(totals.einmalig - rabatt)}`);
    }
    // Bruttopreise für Verbraucher nach PAngV, Text zentral in site.config.ts
    lines.push(siteConfig.vatNote);
  }
  // Kontext-Zeilen, z. B. gewählte Paket-Basis oder der Paketvergleich
  if (zusatzHinweise.length) {
    lines.push("");
    for (const zeile of zusatzHinweise) lines.push(zeile);
  }
  lines.push("");
  lines.push("Bitte senden Sie mir die Auftragsbestätigung mit den Zahlungsinformationen.");
  return lines.join("\n");
}

/** Einziger Einstiegspunkt für den Bestell-Abschluss (siehe Kommentar oben) */
export function submitOrder(
  items: readonly CartItem[],
  contact: ContactData,
  instantPayment = false,
  zusatzHinweise: readonly string[] = []
): void {
  const subject = "Bestellung über selbst-verkauf.de";
  const body = formatOrderText(items, contact, instantPayment, zusatzHinweise);
  const mailto = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}
