/**
 * Gemeinsame Typen und Regeln des Bieterverfahrens.
 *
 * Die rechtlich relevanten TEXTE stehen bewusst nicht hier, sondern in
 * config/bieterverfahren.ts, damit sie nach der anwaltlichen Prüfung
 * an einer Stelle getauscht werden können.
 */
import { GEBOTE_LOESCHFRIST_TAGE } from "@/config/bieterverfahren";

export type VerfahrenStatus = "vorbereitet" | "laufend" | "beendet" | "abgebrochen";

export type GebotStatus =
  | "eingegangen"
  | "zurueckgezogen"
  | "angenommen"
  | "abgelehnt"
  | "ungueltig";

export type Bieterverfahren = {
  id: string;
  objekt_id: string;
  user_id: string;
  startpreis: number;
  frist: string;
  status: VerfahrenStatus;
  regeln_text: string;
  zweite_runde_vorgesehen: boolean;
  aktuelle_runde: number;
  angelegt_am: string;
  gestartet_am: string | null;
  beendet_am: string | null;
  abbruch_grund: string | null;
  loeschen_ab: string | null;
  /** Wann zuletzt eine Gebotsmail rausging, siehe lib/gebots-meldung.ts */
  gebots_mail_zuletzt_am: string | null;
  /** Gebote, die seither in der Ruhezeit aufgelaufen sind */
  gebots_mail_offen: number;
};

export type Gebot = {
  id: string;
  verfahren_id: string;
  user_id: string;
  anfrage_id: string | null;
  betrag: number;
  name: string;
  email: string;
  telefon: string | null;
  finanzierungsart: string | null;
  bonitaetsnachweis_id: string | null;
  runde: number;
  status: GebotStatus;
  ungueltig_grund: string | null;
  abgegeben_am: string;
  geaendert_am: string | null;
};

/** Anzeigetexte der Zustände, für Badges und Listen */
export const VERFAHREN_STATUS_LABEL: Record<VerfahrenStatus, string> = {
  vorbereitet: "Vorbereitet",
  laufend: "Läuft",
  beendet: "Beendet",
  abgebrochen: "Abgebrochen",
};

export const GEBOT_STATUS_LABEL: Record<GebotStatus, string> = {
  eingegangen: "Eingegangen",
  zurueckgezogen: "Zurückgezogen",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  ungueltig: "Ungültig",
};

/**
 * Ist die Frist abgelaufen? Bewusst eine reine Funktion statt einer
 * gespeicherten Kennzeichnung: Ein Zeitpunkt vergeht von selbst, und
 * eine Spalte, die jemand aktualisieren müsste, wäre irgendwann falsch.
 */
export function fristAbgelaufen(verfahren: {
  frist: string;
  status: VerfahrenStatus;
}): boolean {
  if (verfahren.status !== "laufend") return verfahren.status === "beendet";
  return new Date(verfahren.frist).getTime() <= Date.now();
}

/**
 * Nimmt das Verfahren gerade Gebote an? Das ist die einzige Stelle,
 * an der diese Frage beantwortet wird, damit Oberfläche und Route
 * nicht auseinanderlaufen können.
 */
export function nimmtGeboteAn(verfahren: {
  frist: string;
  status: VerfahrenStatus;
}): boolean {
  return verfahren.status === "laufend" && !fristAbgelaufen(verfahren);
}

/**
 * Nur Gebote, die zählen: zurückgezogene und ungültige nicht.
 *
 * Generisch über den Status, damit auch Stellen sie nutzen können,
 * die nur wenige Spalten laden (etwa der Gebote-Zähler der
 * Interessenten-Liste). Eine zweite Fassung dieser Regel darf es
 * nicht geben; genau so eine zählte dort ein zurückgezogenes Gebot
 * als "1 Gebot" weiter mit (Befund aus Runde 25, behoben 25.08.2026).
 */
export function gueltigeGebote<T extends { status: GebotStatus }>(gebote: T[]): T[] {
  return gebote.filter(
    (g) => g.status !== "zurueckgezogen" && g.status !== "ungueltig"
  );
}

/**
 * Gebote der gerade laufenden Runde.
 *
 * In einer zweiten Runde bieten alle neu. Die Gebote der ersten Runde
 * bleiben als Verlauf erhalten, sie dürfen aber weder in die Kennzahlen
 * noch in die Anzahl einfließen: Sonst stünde in Runde 2 ein Höchstgebot,
 * das gerade niemand abgegeben hat.
 */
export function ausRunde(gebote: Gebot[], runde: number): Gebot[] {
  return gebote.filter((g) => g.runde === runde);
}

/** Gebote aus abgeschlossenen Runden, nur noch als Verlauf */
export function ausFruehererRunde(gebote: Gebot[], runde: number): Gebot[] {
  return gebote.filter((g) => g.runde < runde);
}

/**
 * Kennzahlen für die Verkäufer-Ansicht.
 *
 * "hoechstes" ist bewusst nur eine Zahl, keine Empfehlung und keine
 * Hervorhebung eines Bieters. Der Verkäufer entscheidet frei.
 */
export function kennzahlen(gebote: Gebot[], startpreis: number) {
  const gueltig = gueltigeGebote(gebote);
  const betraege = gueltig.map((g) => g.betrag);
  const hoechstes = betraege.length > 0 ? Math.max(...betraege) : null;
  return {
    anzahl: gueltig.length,
    hoechstes,
    ueberStartpreis: hoechstes !== null ? hoechstes - startpreis : null,
  };
}

/** Verbleibende Zeit in Teilen, für einen ruhigen Countdown */
export function verbleibend(fristIso: string, jetzt = Date.now()) {
  const ms = Math.max(0, new Date(fristIso).getTime() - jetzt);
  return {
    abgelaufen: ms <= 0,
    tage: Math.floor(ms / 86_400_000),
    stunden: Math.floor((ms % 86_400_000) / 3_600_000),
    minuten: Math.floor((ms % 3_600_000) / 60_000),
    sekunden: Math.floor((ms % 60_000) / 1000),
  };
}

/** Wann die Bieterdaten dieses Verfahrens automatisch verschwinden */
export function loeschzeitpunkt(beendetAm: Date = new Date()): string {
  return new Date(
    beendetAm.getTime() + GEBOTE_LOESCHFRIST_TAGE * 24 * 60 * 60 * 1000
  ).toISOString();
}

/** Einheitliche Euro-Darstellung, überall dieselbe */
export function euro(betrag: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(betrag);
}
