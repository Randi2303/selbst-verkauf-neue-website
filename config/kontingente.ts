/**
 * Die Foto-Aufbereitung: was enthalten ist und was dazugekauft wird.
 *
 * WARUM DIESE ZAHLEN HIER STEHEN und nicht verstreut: Sie erscheinen
 * an vier Stellen, im Leistungstext, im Konto, in der Freischaltung
 * und in der Meldung bei erschöpftem Kontingent. Wer eine davon
 * ändert, ändert sie hier einmal.
 *
 * WARUM ES ÜBERHAUPT EIN KONTINGENT IST: Jedes aufbereitete Bild
 * kostet uns Geld beim Anbieter. Bis zum 13.08.2026 hing die Funktion
 * an einer Umgebungsvariablen, war also entweder gar nicht da oder
 * unbegrenzt. Beides ist falsch.
 */
export const FOTO_AUFBEREITUNG = {
  /**
   * Bilder, die in jedem Paket mit Exposé stecken.
   *
   * ZWANZIG, weil ein Inserat typischerweise fünfzehn bis
   * fünfundzwanzig Fotos zeigt und ein Einfamilienhaus damit
   * vollständig abgedeckt ist. Wer weniger hochlädt, merkt die Grenze
   * nie; wer mehr hat, kauft gezielt nach.
   *
   * AM 18.08.2026 BESTÄTIGT, mit der Rechnung des Inhabers: Zwanzig
   * Bilder kosten uns im Anbieter-Abo rund 5,40 Dollar, freigeschaltet
   * werden sie mit dem Exposé für 249 Euro; rund zwei Prozent
   * zurückzugeben ist es wert. Eine Kürzung auf zehn sparte 2,70
   * Dollar und schwächte ein Argument, das beim Buchen hilft.
   */
  inklusive: 20,

  /**
   * Woran das enthaltene Kontingent hängt.
   *
   * AM EXPOSÉ, nicht am Paket: "Pakete mit Exposé" ist genau die
   * Menge, die web-expose abdeckt, ob als Paket oder einzeln gebucht.
   * Wer ein neues Paket schnürt, muss hier nichts nachtragen.
   */
  enthaltenMit: "web-expose",

  /** Leistungs-ID zum Dazukaufen */
  leistungId: "foto-aufbereitung",

  /** Bilder je gekaufter Einheit */
  jeEinheit: 1,

  /**
   * Preis je weiterem Bild in Euro.
   *
   * TODO Preis: VORSCHLAG, Freigabe des Auftraggebers steht aus. Zwei
   * Euro tragen die Kosten je Abruf um ein Vielfaches und bleiben
   * niedrig genug, dass sich niemand für ein großes Haus bestraft
   * fühlt. Zehn weitere Bilder kosten zwanzig Euro, und diese Rechnung
   * versteht man ohne nachzudenken.
   */
  preisJeBild: 2,
} as const;
