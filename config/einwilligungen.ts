/**
 * Einwilligungstexte, nach Fassungen nummeriert.
 *
 * ================================================================
 * ANWALTLICH ZU PRUEFEN. Jeder Wortlaut in dieser Datei.
 * ================================================================
 *
 * WARUM FASSUNGEN:
 * Eine Einwilligung ist nur wirksam, wenn sie bestimmt, informiert,
 * freiwillig und nachweisbar ist (Art. 4 Nr. 11 und Art. 7 DSGVO). Wer
 * spaeter belegen will, WOZU jemand zugestimmt hat, braucht den
 * Wortlaut, den dieser Mensch damals gesehen hat. Aendern wir den Text,
 * darf das nicht rueckwirkend die alte Zustimmung umdeuten.
 *
 * Deshalb zwei Dinge:
 * 1. Jede Fassung bleibt hier stehen, auch die abgeloesten. Nichts
 *    wird ueberschrieben, es kommt nur eine neue Fassung dazu.
 * 2. Beim Absenden wird der volle Wortlaut mit der Fassungsnummer in
 *    die Tabelle einwilligungen geschrieben (Migration 0027), nicht nur
 *    ein Verweis auf diese Datei.
 *
 * FASSUNGSNUMMER: Jahr-Monat-Buchstabe, also "2026-08-A", danach
 * "2026-08-B" und so weiter. Aufsteigend, nie wiederverwendet.
 */
import { siteConfig } from "@/site.config";

export type EinwilligungsZweck = "verarbeitung" | "auskunftei";

export type Einwilligung = {
  /** Der Text, den der Interessent sieht und der gespeichert wird */
  wortlaut: string;
  /**
   * Freiwillig im Sinne von: Ohne diese Zustimmung geht es trotzdem
   * weiter. Das steht so auch im Wortlaut, weil eine Einwilligung, die
   * man geben MUSS, keine ist.
   */
  freiwillig: boolean;
};

/**
 * Alle Fassungen. Die aelteste steht oben, damit man die Entwicklung
 * lesen kann. NICHTS HIER LOESCHEN.
 */
export const EINWILLIGUNGS_FASSUNGEN: Record<
  string,
  Record<EinwilligungsZweck, Einwilligung>
> = {
  "2026-08-A": {
    verarbeitung: {
      freiwillig: false,
      wortlaut:
        `Ich bin damit einverstanden, dass die von mir hochgeladene Unterlage an den Eigentümer der Immobilie weitergegeben und ausschließlich für die Prüfung meiner Kaufanfrage verarbeitet wird. ` +
        `Die Unterlage wird spätestens 90 Tage nach dem Hochladen automatisch gelöscht. ` +
        `Ich kann diese Einwilligung jederzeit widerrufen, indem ich an ${siteConfig.mailAbsender.antwort} schreibe; die Unterlage wird dann umgehend gelöscht. ` +
        `Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt davon unberührt.`,
    },
    auskunftei: {
      freiwillig: true,
      wortlaut:
        `Freiwillig, zusätzlich: Ich bin damit einverstanden, dass zu meiner Kaufanfrage eine Auskunft über meine Zahlungsfähigkeit bei einer Wirtschaftsauskunftei eingeholt wird, etwa der SCHUFA Holding AG oder einem vergleichbaren Dienstleister. ` +
        `Übermittelt werden dafür ausschließlich mein Vor- und Nachname sowie meine Anschrift. Das Ergebnis wird nur dem Eigentümer dieser Immobilie mitgeteilt und für keinen anderen Zweck verwendet. ` +
        `Diese Einwilligung ist freiwillig. Wenn ich sie nicht erteile, entsteht mir kein Nachteil: Meine Unterlage wird trotzdem angenommen und meine Anfrage ganz normal weiterbearbeitet. ` +
        `Ich kann diese Einwilligung jederzeit für die Zukunft widerrufen, indem ich an ${siteConfig.mailAbsender.antwort} schreibe. ` +
        `Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt davon unberührt.`,
    },
  },
};

/** Welche Fassung neuen Interessenten gezeigt wird */
export const AKTUELLE_FASSUNG = "2026-08-A";

export function einwilligung(zweck: EinwilligungsZweck): Einwilligung {
  return EINWILLIGUNGS_FASSUNGEN[AKTUELLE_FASSUNG][zweck];
}

/**
 * Die Adresse fuer den Widerruf. Steht ausdruecklich getrennt, damit
 * die Oberflaeche sie auch ausserhalb des Wortlauts nennen kann.
 */
export const WIDERRUF_ADRESSE = siteConfig.mailAbsender.antwort;
