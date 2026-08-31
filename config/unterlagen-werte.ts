import { PORTAL_NAME } from "@/config/portale";
import type { UnterlagenTyp } from "@/lib/unterlagen";

/**
 * MIT DER DATEI IST ES NICHT GETAN: Welche Unterlage verlangt danach
 * noch eine Eintragung durch den Verkaeufer?
 *
 * =====================================================================
 * DER BEFUND DAHINTER (Inhaber, 28.08.2026)
 * =====================================================================
 * "Der Verkaeufer hat dann das Dokument im Konto und glaubt, die Sache
 * sei erledigt. Sein Inserat bleibt trotzdem unvollstaendig, weil die
 * Pflichtangaben fehlen."
 *
 * Gemessen am Energieausweis: Der Checklisten-Punkt hakt sich ab,
 * sobald die Unterlage da ist, und die drei GEG-Pflichtangaben stehen
 * weiterhin leer. Der Verkaeufer sieht einen Haken und ist fertig; sein
 * Inserat ist angreifbar.
 *
 * WIR LESEN AUS KEINER DATEI ETWAS AUS. Das ist die ausdrueckliche
 * Vorgabe des Inhabers, und sie bleibt: Wir legen ab, mehr nicht. Was
 * aus einem Dokument in die Objektdaten gehoert, traegt der Verkaeufer
 * selbst ein. Umso wichtiger ist, dass er im richtigen Moment erfaehrt,
 * dass er dran ist, und wo.
 *
 * =====================================================================
 * WORAN DIE LISTE HAENGT
 * =====================================================================
 * Die Felder stammen aus lib/openimmo-mapping.ts (FELD_ZUORDNUNGEN);
 * `pflicht: ALLE` heisst dort, dass jedes Portal die Angabe verlangt.
 * Sie ist NICHT abgeleitet, und das hat einen Grund: Aus der
 * Feld-Zuordnung folgt nicht, aus WELCHEM Dokument eine Angabe stammt.
 * Dass der Endenergie-Kennwert aus dem Energieausweis kommt und die
 * Wohnflaeche aus der Wohnflaechenberechnung, weiss kein Feld.
 *
 * scripts/unterlagen-werte-pruefen.mts haelt die Feldnamen gegen die
 * Feld-Zuordnung und bricht den Bau, wenn eines davon verschwindet
 * oder aufhoert, Pflicht zu sein.
 *
 * =====================================================================
 * ZWEI STUFEN, seit dem 29.08.2026
 * =====================================================================
 * Beim Bau am 28.08. standen hier zwei Kategorien, und drei weitere
 * als Kommentar mit dem Satz "der Inhaber entscheidet, ob sie
 * dazusollen". Er hat entschieden: Sie sollen.
 *
 * Sie sind aber NICHT dasselbe, und das darf die Meldung nicht
 * einebnen:
 *
 *   "pflicht"   Ohne diesen Wert ist das Inserat unvollstaendig oder
 *               sogar angreifbar. Energieausweis (GEG Paragraf 87) und
 *               Wohnflaeche (jedes Portal).
 *   "hilfreich" Das Inserat geht ohne ihn hinaus, wird mit ihm aber
 *               besser. Der Ton der Meldung ist entsprechend leiser,
 *               und die Checkliste warnt nicht.
 *
 * WARUM DER UNTERSCHIED ZAEHLT: Eine Glocke, die bei jeder Kleinigkeit
 * mahnt, sieht bald niemand mehr an. "Ihre Anzeige ist angreifbar" und
 * "das koennte noch dazu" duerfen nicht gleich klingen.
 *
 * =====================================================================
 * WAS AUCH JETZT NICHT DRINSTEHT
 * =====================================================================
 * Grundbuchauszug, Baulastenauskunft, Verkehrswertgutachten,
 * Grundrisse und Fotos verlangen gar keine Eintragung. Aus einem
 * Gutachten koennte man den Wert in `angebotspreis` uebernehmen, aber
 * das waere ein Vorschlag zum PREIS, und den macht der Verkaeufer
 * allein.
 */

export type WerteNachtrag = {
  /**
   * Wie dringend. Siehe der Block oben; steuert den Ton der Meldung
   * und ob die Checkliste warnt.
   */
  gewicht: "pflicht" | "hilfreich";
  /** Spalten in `objekte`, die danach noch gefuellt werden muessen */
  felder: string[];
  /**
   * Der Schritt der Objektmaske, auf den die Meldung fuehrt. MITTEN IN
   * DIE MASKE und nicht auf die Uebersicht: "Er soll nicht suchen
   * muessen" (Inhaber).
   */
  schritt: number;
  /** Was in der Meldung steht. Eine Zeile, in Sie-Form. */
  meldungsZeile: string;
  /**
   * Was an der Checkliste steht, wenn das Dokument da ist und die Werte
   * fehlen. Nur bei `gewicht: "pflicht"`; ein hilfreicher Wert bekommt
   * keine Warnung, sonst stuende an der Checkliste dauerhaft etwas,
   * das kein Fehler ist.
   */
  checklistenWarnung?: string;
  /**
   * Gilt der Nachtrag ueberhaupt fuer dieses Objekt? Ohne Angabe immer.
   * Die Renditeuebersicht etwa ist nur bei vermieteten Objekten
   * sinnvoll; wer sein selbstbewohntes Haus verkauft, soll nicht nach
   * Mieteinnahmen gefragt werden, die es nicht gibt.
   */
  giltFuer?: (objekt: Record<string, unknown>) => boolean;
};

export const WERTE_NACHTRAG: Partial<Record<UnterlagenTyp, WerteNachtrag>> = {
  energieausweis: {
    gewicht: "pflicht",
    /* Alle drei mit `pflicht: ALLE` und `geg: true` in der
       Feld-Zuordnung. Paragraf 87 GEG verlangt sie in JEDER Anzeige,
       sobald ein Ausweis vorliegt; das ist keine Portal-Vorgabe,
       sondern Gesetz. Ein Inserat ohne sie ist angreifbar, und es kann
       ein Bussgeld geben. */
    felder: ["energieausweis_typ", "endenergie_kennwert", "energieeffizienzklasse"],
    schritt: 5,
    meldungsZeile:
      "Ihr Energieausweis liegt in den Unterlagen. Die Kennwerte daraus müssen noch in Ihre Anzeige, sonst darf sie nicht vollständig erscheinen.",
    checklistenWarnung:
      "Der Ausweis liegt vor. Die Kennwerte daraus fehlen noch in Ihrer Anzeige; das Gesetz verlangt sie dort.",
  },
  wohnflaechenberechnung: {
    gewicht: "pflicht",
    /* `wohnflaeche_qm` ist bei ALLEN Portalen Pflicht. Der zweite
       scharfe Fall neben dem Energieausweis, gefunden bei der Messung
       am 28.08.2026: Wer die Berechnung kauft, hat danach das Dokument
       und immer noch kein vollstaendiges Inserat. */
    felder: ["wohnflaeche_qm"],
    schritt: 3,
    meldungsZeile:
      "Ihre Wohnflächenberechnung liegt in den Unterlagen. Tragen Sie die Quadratmeter noch in Ihre Angaben ein, sonst fehlt Ihrer Anzeige eine Pflichtangabe.",
    checklistenWarnung:
      "Die Berechnung liegt vor. Die Wohnfläche fehlt noch in Ihren Angaben; jedes Portal verlangt sie.",
  },

  /* ---------------------------------------------------------------- */
  /* Die drei hilfreichen (Entscheidung des Inhabers, 29.08.2026)      */
  /* ---------------------------------------------------------------- */
  flurkarte: {
    /* GRENZFALL, und deshalb "hilfreich" und nicht "pflicht":
       `grundstuecksflaeche_qm` verlangt NUR ImmoScout24, nicht jedes
       Portal (lib/openimmo-mapping.ts, pflicht: NUR_IS24). Wer nicht
       ueber dieses eine Portal inseriert, hat kein unvollstaendiges
       Inserat.

       DER PORTALNAME KOMMT AUS DER QUELLE und steht nicht hier: Er
       heisst an EINER Stelle so, wie er heisst (config/portale.ts),
       und scripts/portalnamen-pruefen.mts bricht den Bau, wer ihn
       abschreibt. Sie hat diesen Satz beim ersten Bau gefangen. */
    gewicht: "hilfreich",
    felder: ["grundstuecksflaeche_qm"],
    schritt: 3,
    meldungsZeile: `Ihre Flurkarte liegt in den Unterlagen. Wenn Sie mögen, tragen Sie die Grundstücksfläche daraus in Ihre Angaben ein; ${PORTAL_NAME.immoscout24} fragt danach.`,
  },
  teilungserklaerung: {
    gewicht: "hilfreich",
    felder: ["hausgeld"],
    schritt: 6,
    meldungsZeile:
      "Ihre Teilungserklärung liegt in den Unterlagen. Das monatliche Hausgeld daraus ist die häufigste Rückfrage von Käufern; Sie können es in Ihren Angaben ergänzen.",
  },
  renditeuebersicht: {
    gewicht: "hilfreich",
    felder: ["kaltmiete", "mieteinnahmen_jahr"],
    schritt: 6,
    meldungsZeile:
      "Ihre Renditeübersicht liegt in den Unterlagen. Die Mietzahlen daraus gehören in Ihre Angaben, sonst rechnet ein Kapitalanleger sie sich selbst zusammen.",
    /* NUR BEI VERMIETETEN OBJEKTEN. Wer sein selbstbewohntes Haus
       verkauft, hat keine Mieteinnahmen, und eine Meldung danach waere
       eine Frage nach etwas, das es nicht gibt. */
    giltFuer: (objekt) => objekt.vermietet === true,
  },
};

/** Verlangt diese Kategorie nach der Datei noch eine Eintragung? */
export function werteNachtrag(typ: UnterlagenTyp): WerteNachtrag | null {
  return WERTE_NACHTRAG[typ] ?? null;
}

/**
 * Fehlt an diesem Objekt noch mindestens einer der Werte?
 *
 * Ein Wert gilt als da, wenn er weder null noch leer ist. Die Null
 * selbst ZAEHLT als Angabe: Ein Endenergie-Kennwert von 0 ist
 * unwahrscheinlich, aber er waere eine Aussage, und wir wuerden sonst
 * jemanden mahnen, der geantwortet hat.
 */
export function werteFehlen(
  nachtrag: WerteNachtrag,
  objekt: Record<string, unknown>
): string[] {
  /* Gilt der Nachtrag fuer dieses Objekt ueberhaupt? Siehe giltFuer. */
  if (nachtrag.giltFuer && !nachtrag.giltFuer(objekt)) return [];
  return nachtrag.felder.filter((f) => {
    const wert = objekt[f];
    return wert === null || wert === undefined || wert === "";
  });
}
