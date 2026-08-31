/**
 * DIE VIER TERMIN-ARTEN, an EINER Stelle.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT (Runde 20, 22.08.2026)
 * ---------------------------------------------------------------------
 * Die Zuordnung von Kennung zu Beschriftung stand fünfmal im Haus:
 * lib/kalender-datei.ts, app/admin/termine, app/api/admin/termine,
 * components/konto/TermineBereich und als Bedingungskette auf der
 * Kundenseite im internen Bereich.
 *
 * Vier davon stimmten. Die fünfte war
 *
 *     t.art === "video" ? "Video-Gespräch"
 *       : t.art === "rueckruf" ? "Rückruf"
 *       : "Fototermin"
 *
 * und beschriftete seit Migration 0045 JEDE Besichtigung mit Makler als
 * Fototermin. Eine Liste, die an fünf Stellen gepflegt wird, ist an
 * vier Stellen gepflegt und an einer abgeschrieben. Deshalb steht sie
 * jetzt hier, und die fünf Stellen lesen.
 *
 * ---------------------------------------------------------------------
 * DIE NAMEN, UND WARUM SIE SO HEISSEN (Migration 0103)
 * ---------------------------------------------------------------------
 * `videogespraech` und nicht `video`: Das blosse Wort `video` meinte im
 * Haus drei Dinge, nämlich das Beratungsgespräch, die Erklärvideos der
 * Videothek (config/videos.ts) und ab dieser Runde die Videoaufnahme
 * des Objekts. Eine Abfrage `art = 'video'` sah dabei jedes Mal gleich
 * aus. Die Aufnahme heisst im Haus `film`, nach dem OpenImmo-Standard.
 *
 * `vor_ort` und nicht `fototermin`: Es ist EINE Fahrt für Fotografie,
 * Video, Drohne UND den 360-Grad-Rundgang. Wer nur den Rundgang bucht,
 * bekäme sonst einen Termin, dessen Name von Fotos spricht.
 *
 * WAS BEI EINEM VOR-ORT-TERMIN GEMACHT WIRD, steht nicht hier: Es
 * hängt an den gebuchten Leistungen und wird gerechnet, siehe
 * lib/vor-ort.ts und das Merkmal `vorOrt` in config/auftraege.ts.
 */
import { siteConfig } from "@/site.config";

export type TerminArt = "videogespraech" | "rueckruf" | "vor_ort" | "besichtigung";

export type TerminArtEintrag = {
  /** Beschriftung überall, im Konto wie im internen Bereich */
  label: string;
  /** Wie lange der Termin dauert, wenn nichts anderes bekannt ist */
  dauerMinuten: number;
  /**
   * Wer terminiert. Der Makler bedient seine zwei Gesprächs-Wege, alles
   * Bezahlte terminiert das Team. Die Grenze aus Bau-Runde 4 steht
   * ausserdem im Trigger (Migration 0082/0103); hier steht sie für die
   * Oberfläche, damit ein Makler keinen Knopf sieht, den der Server
   * ablehnt.
   */
  terminiert: "team" | "makler";
  /** Findet der Termin beim Objekt statt? Entscheidet über den Ort im Kalender */
  beimObjekt: boolean;
  /**
   * Vorlauf der Kalender-Erinnerung in Stunden. Wer aufräumen muss,
   * braucht mehr als eine Stunde.
   */
  erinnerungStunden: number;
  /** Beispiel-Platzhalter für Thema und Zeitraum im Anfrage-Formular */
  beispiel: { thema: string; zeitraum: string };
  /** Satz in der Kalenderdatei */
  kalenderText: string;
};

export const TERMIN_ARTEN: Record<TerminArt, TerminArtEintrag> = {
  videogespraech: {
    label: "Video-Gespräch",
    dauerMinuten: 30,
    terminiert: "makler",
    beimObjekt: false,
    erinnerungStunden: 1,
    beispiel: {
      thema: "z. B. Fragen zur Preisstrategie",
      zeitraum: "z. B. Dienstag oder Donnerstag ab 17 Uhr",
    },
    kalenderText: `Video-Gespräch mit Ihrem Team von ${siteConfig.name}.`,
  },
  rueckruf: {
    label: "Rückruf",
    dauerMinuten: 15,
    terminiert: "makler",
    beimObjekt: false,
    erinnerungStunden: 1,
    beispiel: {
      thema: "z. B. Rückfrage zu meiner Anfrage",
      zeitraum: "z. B. werktags zwischen 9 und 12 Uhr",
    },
    kalenderText: "Wir rufen Sie zur vereinbarten Zeit an.",
  },
  vor_ort: {
    label: "Termin vor Ort",
    /* NEUNZIG MINUTEN, unverändert aus der Fototermin-Zeit. Kommt der
       360-Grad-Rundgang dazu, wird es länger; wie viel, wissen wir
       ohne einen einzigen gefahrenen Termin nicht, und geraten wird
       nicht. Die Dauer im Kalender ist ohnehin nur ein Vorschlag, den
       das Team beim Bestätigen überschreibt. */
    dauerMinuten: 90,
    terminiert: "team",
    beimObjekt: true,
    erinnerungStunden: 24,
    beispiel: {
      thema: "z. B. Außenaufnahmen bei gutem Wetter",
      zeitraum: "z. B. vormittags, wenn Licht im Garten ist",
    },
    kalenderText:
      "Aufnahmen bei Ihrer Immobilie. Bitte sorgen Sie dafür, dass alle Räume zugänglich und aufgeräumt sind.",
  },
  besichtigung: {
    label: "Besichtigung mit Makler",
    dauerMinuten: 60,
    terminiert: "team",
    beimObjekt: true,
    erinnerungStunden: 24,
    beispiel: {
      thema: "z. B. Besichtigung mit Familie Sommer führen",
      zeitraum: "z. B. Samstag zwischen 10 und 14 Uhr",
    },
    kalenderText:
      "Besichtigung bei Ihrer Immobilie, geführt von Ihrem Makler.",
  },
};

export const TERMIN_ARTEN_LISTE = Object.keys(TERMIN_ARTEN) as TerminArt[];

/**
 * Beschriftung zu einer Kennung. Nimmt `string` und nicht `TerminArt`,
 * damit auch Daten aus der Datenbank ohne Umweg hineingehen; eine
 * unbekannte Kennung liefert sich selbst zurück statt einer falschen
 * Beschriftung. GENAU DAS war der Fehler auf der Kundenseite: Dort
 * bekam alles Unbekannte den Namen einer bestimmten Art.
 */
export function terminArtLabel(art: string): string {
  return TERMIN_ARTEN[art as TerminArt]?.label ?? art;
}

/** Terminiert diese Art der zuständige Makler, oder nur das Team? */
export function maklerTerminiert(art: string): boolean {
  return TERMIN_ARTEN[art as TerminArt]?.terminiert === "makler";
}

/** Die Arten, die der Makler bedienen darf; auch der Trigger prüft sie */
export const MAKLER_TERMIN_ARTEN = TERMIN_ARTEN_LISTE.filter((a) =>
  maklerTerminiert(a)
);

/** Die Arten, die das Team terminiert (Vor-Ort und Besichtigungs-Service) */
export const TEAM_TERMIN_ARTEN = TERMIN_ARTEN_LISTE.filter(
  (a) => !maklerTerminiert(a)
);
