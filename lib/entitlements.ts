/**
 * Berechtigungen aus Buchungen ableiten (Entitlements).
 *
 * Die Tabelle buchungen hält, welche Pakete und Einzel-Leistungen ein
 * Konto gebucht hat. Hier steht die Auswertung: welche Leistungen sind
 * damit abgedeckt, und hat das Konto Anspruch auf den direkten
 * Makler-Kontakt?
 *
 * Pilotphase: Buchungen werden nach Zahlungseingang von Hand im
 * Supabase-Dashboard auf status aktiv gesetzt. TODO Stripe: der
 * Zahlungs-Webhook übernimmt das später automatisch.
 */
import { FOTO_AUFBEREITUNG } from "@/config/kontingente";
import { SERVICES, siteConfig } from "@/site.config";

/** Zeile der Tabelle buchungen */
export type Buchung = {
  id: string;
  user_id: string;
  leistung_id: string;
  art: "paket" | "leistung";
  status: "bestellt" | "aktiv" | "beendet";
  gebucht_am: string;
  /**
   * Beginn der Leistung (Migration 0039). Bei der Makler-Begleitung
   * die Zuweisung des Ansprechpartners, nicht die Buchung.
   */
  beginn_am?: string | null;
  /** Zum Ende dieses Tages endet die laufende Leistung (Monatsende) */
  gekuendigt_zum?: string | null;
  /** Bei Paketen die gewaehlte Zahlungsart der Basis (Migration 0039) */
  zahlweise?: "einmalig" | "monatlich";
  /**
   * Was der Kunde aus diesem Paket abgewaehlt hat (Migration 0119).
   * null oder fehlend heisst: nichts abgewaehlt, der Normalfall.
   */
  abgewaehlt?: string[] | null;
};

/**
 * Laeuft diese Buchung monatlich? Pakete nach ihrer gewaehlten
 * Zahlweise, Einzel-Leistungen nach dem Katalog (monthly).
 */
export function istMonatlicheBuchung(b: Buchung): boolean {
  if (b.art === "paket") return b.zahlweise === "monatlich";
  if (b.zahlweise === "monatlich") return true;
  return Boolean(SERVICES.find((s) => s.id === b.leistung_id)?.monthly);
}

/**
 * Leistungen mit persönlicher Makler-Begleitung. Wer eine davon aktiv
 * gebucht hat (einzeln oder über ein Paket), sieht die Makler-Karte
 * mit direktem Kontakt. Exportiert, damit der Leistungen-Bereich die
 * passende Gruppe ankern kann (Freischalten-Sprung).
 */
export const MAKLER_LEISTUNGEN = [
  "ansprechpartner",
  "verhandlungs-begleitung",
  /* Entschieden am 10.08.2026: besichtigungs-service und
     notar-koordination schalten die Makler-Karte NICHT mehr frei. Es
     sind punktuelle Dienstleistungen, kein laufender Draht zum
     Makler; wer nur den Notartermin koordiniert bekommt, soll keine
     Rueckruf-Karte mit Dauer-Erreichbarkeit sehen. */
];

/** Sprungziel im Konto zu den Leistungen mit Makler-Begleitung */
export const MAKLER_LEISTUNGEN_ANKER = "/konto/leistungen#makler-leistungen";

/** Nur bezahlte, laufende Buchungen zählen für Berechtigungen */
export function aktiveBuchungen(buchungen: Buchung[]): Buchung[] {
  return buchungen.filter((b) => b.status === "aktiv");
}

/** Bestellte, noch nicht freigeschaltete Buchungen (Zahlung unterwegs) */
export function offeneBestellungen(buchungen: Buchung[]): Buchung[] {
  return buchungen.filter((b) => b.status === "bestellt");
}

/** Das aktiv gebuchte Paket, falls vorhanden */
export function aktivesPaket(buchungen: Buchung[]) {
  const paketBuchung = aktiveBuchungen(buchungen).find((b) => b.art === "paket");
  if (!paketBuchung) return null;
  return (
    siteConfig.packages.find((p) => p.id === paketBuchung.leistung_id) ?? null
  );
}

/**
 * Alle abgedeckten Leistungs-IDs: direkt gebuchte Leistungen plus die
 * in einem aktiven Paket enthaltenen Leistungen (includedServiceIds
 * aus site.config), ABZUEGLICH dessen, was der Kunde abgewaehlt hat.
 *
 * ---------------------------------------------------------------------
 * DIE ABWAHL WIRD SEIT DEM 30.08.2026 ABGEZOGEN (Migration 0119)
 * ---------------------------------------------------------------------
 * Vorher gab diese Funktion alles zurueck, was im Paket steht. Bei den
 * meisten Leistungen war das harmlos: Abwaehlen aendert den Paketpreis
 * nicht, es ist eine Notiz an sich selbst. Bei der Makler-Begleitung
 * nicht: Sie traegt `eigenstaendigMonatlich` und wird beim Einmalkauf
 * separat berechnet, wer sie abwaehlt zahlt die 149 Euro im Monat
 * wirklich nicht. Er bekam sie trotzdem, weil die Buchung von der
 * Abwahl nichts wusste.
 *
 * Die Abwahl gilt nur fuer PAKETE. Eine einzeln gebuchte Leistung
 * abzuwaehlen gibt es nicht; man bucht sie dann gar nicht erst.
 */
export function abgedeckteLeistungsIds(buchungen: Buchung[]): Set<string> {
  const ids = new Set<string>();
  for (const b of aktiveBuchungen(buchungen)) {
    if (b.art === "leistung") ids.add(b.leistung_id);
    if (b.art === "paket") {
      const paket = siteConfig.packages.find((p) => p.id === b.leistung_id);
      const abgewaehlt = new Set(b.abgewaehlt ?? []);
      for (const inc of paket?.includedServiceIds ?? []) {
        if (abgewaehlt.has(inc.id)) continue;
        ids.add(inc.id);
      }
    }
  }
  return ids;
}

/**
 * Wie lange laeuft die Portalschaltung dieses Kontos?
 *
 * "befristet"  Sie endet rechnerisch, sechs Monate nach der
 *              Veroeffentlichung plus gekaufte Zusatzmonate.
 * "mit-paket"  Sie laeuft, solange das monatliche Paket laeuft, und
 *              endet erst mit der Kuendigung. Kein Ablaufdatum.
 * "keine"      Keine aktive Buchung deckt die Schaltung ab.
 */
export type SchaltungsLaufzeit = "befristet" | "mit-paket" | "keine";

/**
 * Die Laufzeit-Lage eines Kontos an EINER Stelle, damit Erinnerung,
 * Glocke und Sperre dieselbe Antwort lesen.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DAS GIBT (30.08.2026, Runde 45)
 * ---------------------------------------------------------------------
 * schaltungsErinnerungen waehlte allein aus `objekte` aus. Die Tabelle
 * weiss nichts von der Zahlweise, also ging die Pflicht-Mail "Ihre
 * Portalschaltung endet am ..." auch an monatliche Kunden, deren
 * Schaltung gar nicht endet. Wer die Frage aus den Buchungen
 * beantwortet, muss sie nur EINMAL richtig beantworten.
 *
 * ENTSCHEIDUNG DES INHABERS ZU DEN ANTWORTVORSCHLAEGEN: Sie laufen
 * mit, wenn sie zum Paket gehoeren, und enden dann nicht frueher als
 * die Schaltung; eine gekaufte Verlaengerung verlaengert beide. Wer
 * sie EINZELN dazugebucht hat, behaelt seine eigene Laufzeit, denn das
 * ist eine andere Leistung mit eigenem Preis.
 */
export type LaufzeitLage = {
  schaltung: SchaltungsLaufzeit;
  /** Aus einem Einmal-Paket, endet zusammen mit der Schaltung */
  vorschlaegeAusPaket: boolean;
  /** Einzeln gebucht, laeuft mit eigener Laufzeit weiter */
  vorschlaegeEinzeln: boolean;
};

export function laufzeitLage(buchungen: Buchung[]): LaufzeitLage {
  let befristet = false;
  let mitPaket = false;
  let vorschlaegeAusPaket = false;
  let vorschlaegeEinzeln = false;
  for (const b of aktiveBuchungen(buchungen)) {
    if (b.art === "leistung") {
      /* Die Schaltung traegt im Katalog kein monthly; einzeln gekauft
         ist sie immer die befristete Fassung. */
      if (b.leistung_id === "portal-schaltung") befristet = true;
      if (b.leistung_id === "ki-anfragenmanagement") vorschlaegeEinzeln = true;
      continue;
    }
    const paket = siteConfig.packages.find((p) => p.id === b.leistung_id);
    /* ABZUEGLICH DER ABWAHL, wie abgedeckteLeistungsIds. Ohne das
       warnte die Erinnerung jemanden vor dem Ende einer Leistung, die
       er abgewaehlt hat und gar nicht besitzt. */
    const abgewaehlt = new Set(b.abgewaehlt ?? []);
    const enthalten = new Set(
      (paket?.includedServiceIds ?? [])
        .map((e) => e.id)
        .filter((id) => !abgewaehlt.has(id))
    );
    const monatlich = istMonatlicheBuchung(b);
    if (enthalten.has("portal-schaltung")) {
      if (monatlich) mitPaket = true;
      else befristet = true;
    }
    /* Im MONATLICHEN Paket laufen die Vorschlaege mit dem Paket, dort
       gibt es nichts, was mit der Schaltung enden koennte. */
    if (enthalten.has("ki-anfragenmanagement") && !monatlich) {
      vorschlaegeAusPaket = true;
    }
  }
  return {
    /* Ein monatliches Paket schlaegt eine befristete Buchung: Wer
       beides hat, verliert sein Inserat nicht, solange er zahlt. */
    schaltung: mitPaket ? "mit-paket" : befristet ? "befristet" : "keine",
    vorschlaegeAusPaket,
    vorschlaegeEinzeln,
  };
}

/**
 * Wann die Buchung gekauft wurde, die die Schaltung abdeckt.
 *
 * Fuer die Start-Frist: Sie rechnet ab dem KAUF, nicht ab dem Konto.
 * Deckt mehr als eine Buchung die Schaltung ab, gilt die aelteste;
 * sonst verschoebe eine spaetere Zubuchung die Frist der ersten.
 */
export function schaltungGebuchtAm(buchungen: Buchung[]): Date | null {
  const daten = aktiveBuchungen(buchungen)
    .filter((b) => {
      if (b.art === "leistung") return b.leistung_id === "portal-schaltung";
      const paket = siteConfig.packages.find((p) => p.id === b.leistung_id);
      const abgewaehlt = new Set(b.abgewaehlt ?? []);
      return (paket?.includedServiceIds ?? []).some(
        (e) => e.id === "portal-schaltung" && !abgewaehlt.has(e.id)
      );
    })
    .map((b) => new Date(b.gebucht_am))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return daten[0] ?? null;
}

/** Anspruch auf direkten Makler-Kontakt? */
export function hatMaklerKontakt(buchungen: Buchung[]): boolean {
  const abgedeckt = abgedeckteLeistungsIds(buchungen);
  return MAKLER_LEISTUNGEN.some((id) => abgedeckt.has(id));
}

/** Leistungs-ID des Bonitaets- und Finanzierungschecks */
export const BONITAET_LEISTUNG = "bonitaetscheck";

/** Sprungziel im Konto zur Leistung, falls noch nicht gebucht */
export const BONITAET_LEISTUNGEN_ANKER = "/konto/leistungen";

/**
 * Darf dieses Konto einen Bonitaetsnachweis anfordern?
 *
 * Die Funktion ist an die Buchung gebunden, nicht nur die Anzeige:
 * Jede Server-Route prueft sie erneut, bevor sie einen Link erzeugt.
 */
export function hatBonitaetscheck(buchungen: Buchung[]): boolean {
  return abgedeckteLeistungsIds(buchungen).has(BONITAET_LEISTUNG);
}

/** Leistungs-ID des Web-Exposés */
export const EXPOSE_LEISTUNG = "web-expose";

/**
 * Darf dieses Konto sein Exposé erzeugen? Entschieden am 10.08.2026:
 * Das Exposé gehoert zu bestimmten Paketen oder wird einzeln gebucht;
 * ohne beides gibt es den ruhigen Hinweis zur Leistung, kein PDF.
 */
export function hatWebExpose(buchungen: Buchung[]): boolean {
  return abgedeckteLeistungsIds(buchungen).has(EXPOSE_LEISTUNG);
}

/**
 * Darf dieses Konto Bilder aufbereiten lassen?
 *
 * AN DER BUCHUNG, NICHT AN EINER UMGEBUNGSVARIABLEN. Bis zum
 * 13.08.2026 entschied FOTO_KI_MOCK darueber, ob der Knopf ueberhaupt
 * erschien; wo die Variable fehlte, verschwand die Funktion
 * kommentarlos, und wo sie stand, war sie unbegrenzt. Die Variable
 * sagt jetzt nur noch, ob der DIENST bereitsteht (Mock oder
 * Zugangsdaten); das Recht kommt von hier, und wie viele Bilder noch
 * offen sind, sagt das Kontingent.
 *
 * Enthalten ist es in allem, was das Exposé abdeckt; wer mehr braucht,
 * bucht die Leistung foto-aufbereitung dazu.
 */
export function hatFotoAufbereitung(buchungen: Buchung[]): boolean {
  const abgedeckt = abgedeckteLeistungsIds(buchungen);
  return (
    abgedeckt.has(FOTO_AUFBEREITUNG.enthaltenMit) ||
    abgedeckt.has(FOTO_AUFBEREITUNG.leistungId)
  );
}

/**
 * Gibt es ueberhaupt eine aktive Buchung? Entschieden am 10.08.2026:
 * Die Markteinschaetzung steckt in JEDEM Paket, ob vorgefertigt oder
 * individuell zusammengestellt. Ihre Pruefung ist deshalb nur diese
 * eine Frage; ein Konto ganz ohne Buchung (per Einladung angelegt,
 * noch nichts gekauft) bekommt den Hinweis zu den Paketen.
 */
export function hatAktiveBuchung(buchungen: Buchung[]): boolean {
  return aktiveBuchungen(buchungen).length > 0;
}
