/**
 * Ein Schreibvorgang mit NUTZER-Recht, der nicht still scheitern kann.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT
 * ---------------------------------------------------------------------
 * Ein update oder delete, das die Datenbank-Regel nicht freigibt,
 * meldet KEINEN Fehler. Es trifft null Zeilen, und PostgREST antwortet
 * mit Erfolg. Im Code sieht das so aus:
 *
 *     const { error } = await supabaseBrowser()
 *       .from("objekte").update({ ... }).eq("id", objektId);
 *     if (error) { ... }        // error ist null. Es passiert nichts.
 *
 * Der Schalter bleibt umgelegt, der Haken bleibt gesetzt, die Meldung
 * bleibt aus, und niemand erfaehrt, dass nichts geschehen ist. Genau
 * so sind in diesem Projekt sieben Faelle entstanden, vom
 * Veroeffentlichen-Knopf bis zur Bestaetigung eines Bonitaetsnachweises,
 * und jeder einzelne wurde durch Zufall gefunden.
 *
 * Diese Stelle macht aus der Stille eine Meldung. Sie zaehlt, WIE VIELE
 * Zeilen wirklich getroffen wurden, und behandelt null wie einen Fehler.
 *
 * ---------------------------------------------------------------------
 * WIE MAN SIE BENUTZT
 * ---------------------------------------------------------------------
 * Die Abfrage muss mit .select() enden, sonst gibt PostgREST die
 * getroffenen Zeilen gar nicht zurueck und es gaebe nichts zu zaehlen.
 *
 *     const { ok } = await schreibe(
 *       supabaseBrowser().from("objekte")
 *         .update({ nachweis_vor_besichtigung: neu })
 *         .eq("id", objektId)
 *         .select("id")
 *     );
 *     if (!ok) { ...die vorhandene Meldung... }
 *
 * AN DER ANZEIGE AENDERT SICH NICHTS. Die Aufrufer behalten ihre
 * bisherigen Meldungen, sie erscheinen jetzt nur auch dann, wenn der
 * Schreibvorgang lautlos nichts getan hat.
 *
 * ---------------------------------------------------------------------
 * WANN NULL ZEILEN IN ORDNUNG SIND
 * ---------------------------------------------------------------------
 * Nicht ueberall ist null ein Fehler. Wer eine Markierung entfernt, die
 * gar nicht gesetzt war, oder Ungelesenes abhakt, wo nichts ungelesen
 * ist, trifft ebenfalls null Zeilen und hat trotzdem recht. Dafuer gibt
 * es nullOk. Wer es setzt, schreibt DAZU, warum, sonst ist es nur ein
 * bequemer Weg, die Pruefung wieder abzuschalten.
 */

/** Was eine Supabase-Abfrage mit .select() zurueckgibt */
type MitZeilen = PromiseLike<{
  data: unknown[] | null;
  error: { message: string; code?: string } | null;
  status?: number;
}>;

export type SchreibErgebnis = {
  /** false heisst: Fehler ODER null Zeilen ohne nullOk */
  ok: boolean;
  /** Wie viele Zeilen wirklich getroffen wurden */
  zeilen: number;
  /** Gesetzt bei einem echten Datenbank-Fehler, sonst null */
  fehler: string | null;
  /** true, wenn es KEINEN Fehler gab und trotzdem nichts geschah */
  lautlos: boolean;
};

export async function schreibe(
  abfrage: MitZeilen,
  optionen: { nullOk?: boolean } = {}
): Promise<SchreibErgebnis> {
  const { data, error } = await abfrage;
  if (error) {
    return { ok: false, zeilen: 0, fehler: error.message, lautlos: false };
  }
  const zeilen = Array.isArray(data) ? data.length : 0;
  if (zeilen === 0 && !optionen.nullOk) {
    /* INS PROTOKOLL, nicht nur in die Oberflaeche. Ein lautloser
       Schreibvorgang ist fast immer ein fehlendes Recht, und das will
       man in den Server-Protokollen wiederfinden, wenn ein Kunde
       anruft. */
    console.error("[schreiben] Schreibvorgang traf null Zeilen");
    return { ok: false, zeilen: 0, fehler: null, lautlos: true };
  }
  return { ok: true, zeilen, fehler: null, lautlos: false };
}
