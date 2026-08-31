/**
 * DAS VORFUEHRKONTO, FEST AUFGESCHRIEBEN.
 *
 * =====================================================================
 * WARUM ES DIESE DATEI GIBT (Auftrag des Inhabers, 31.08.2026)
 * =====================================================================
 * Der Riegel, der Post aus dem Vorfuehrkonto zurueckhaelt, fragte bis
 * heute die Datenbank: `istVorfuehrkonto()` liest `profiles`. Fehlt
 * der Dienst-Zugang, liefert die Funktion `false`, und der Riegel
 * laesst durch.
 *
 * GEMESSEN AM 31.08.2026, nicht vermutet: Ohne Dienst-Schluessel lief
 * der Aufruf bis zu Resend durch und wurde nur dort abgewiesen, weil
 * der Schluessel fuer diesen Nachweis absichtlich unbrauchbar gemacht
 * war. Mit einem echten waere die Mail hinausgegangen, und das
 * Versandprotokoll haette sie nicht einmal vermerken koennen: Es
 * haengt an derselben Rolle.
 *
 * Der Satz des Inhabers dazu: "Der Preis ist, dass der Riegel
 * ausgerechnet dann offen ist, wenn etwas nicht stimmt. Das ist das
 * Gegenteil von dem, was wir bei der Rollenpruefung entschieden
 * haben."
 *
 * =====================================================================
 * DIE REGEL, DIE DARAUS FOLGT
 * =====================================================================
 * WO DAS WISSEN FEST IST, GEHOERT ES IN DIE KONFIGURATION, und die
 * Abfrage bleibt als ZWEITE Schicht daneben. Das Vorfuehrkonto ist ein
 * einziges, bekanntes Konto; danach muss niemand fragen.
 *
 *   1. Diese Datei. Kann nicht ausfallen, denn es gibt nichts, was
 *      ausfallen koennte.
 *   2. Die Abfrage in lib/vorfuehrkonto.ts. Faengt ein ZWEITES Konto
 *      mit dem Kennzeichen und eine gewechselte Kennung.
 *
 * Zu, wenn EINES VON BEIDEN ja sagt. Vorher war es: offen, sobald die
 * Abfrage ausfaellt.
 *
 * =====================================================================
 * WAS DAGEGEN SPRACH, UND WIE ES GELOEST IST
 * =====================================================================
 * `npm run vorfuehrkonto:entfernen` loescht das Konto; ein neues
 * Anlegen gibt eine NEUE Kennung. Stuende die alte hier allein, waere
 * der Riegel danach still auf ein Konto gerichtet, das es nicht mehr
 * gibt.
 *
 * DESHALB BRICHT DAS ANLEGE-SKRIPT AB, wenn die Kennung hier nicht mehr
 * zur Datenbank passt (scripts/vorfuehrkonto.mjs). Es bricht damit
 * GENAU DORT, wo die Abweichung entsteht, und dort steht immer jemand
 * daneben. Zusaetzlich prueft `npm run wege` es bei jedem Lauf mit,
 * und damit auch der Riegel vor dem Push.
 *
 * KEIN BAU-BRUCH, und das ist kein Versehen: Alle 46 Pruefungen der
 * Baukette lesen Dateien und brauchen keine Datenbank. Ein Bau, der
 * ohne Netz und Schluessel nicht mehr durchliefe, waere der groessere
 * Schaden. Was der Bau OHNE Datenbank pruefen kann, prueft er
 * (scripts/vorfuehr-kennung-pruefen.mts): dass hier ueberhaupt eine
 * wohlgeformte Kennung steht.
 *
 * =====================================================================
 * WARUM DIE ADRESSE NICHT GENUEGT
 * =====================================================================
 * Naheliegend waere gewesen, nur die Adresse zu fuehren, so wie das
 * Netz gegen `@vorfuehrung.selbst-verkauf.de`. Sie reicht nicht: Der
 * Riegel greift am EIGENTUEMER des Vorgangs, nicht am Empfaenger. Eine
 * Mail des Vorfuehrkontos an das TEAM hat eine Team-Adresse, und die
 * ist weder .invalid noch eine Vorfuehr-Adresse.
 *
 * Genau dieser Fall ist am 20.08.2026 eingetreten: Die unbeantwortete
 * Unterhaltung des Vorfuehrkontos mahnte alle vier Stunden das Team
 * an, mit echtem Versand und echtem Kontingent.
 *
 * Die Adresse steht hier trotzdem, aber fuer etwas anderes: als die
 * eine Stelle, an der der Name des Kontos steht.
 */

/**
 * DIE KENNUNG des Vorfuehrkontos in auth.users und profiles.
 *
 * Sie gilt fuer BEIDE Anwendungen: config/variablen.ts fuehrt
 * NEXT_PUBLIC_SUPABASE_URL mit der Geltung "beide", und "beide" heisst
 * dort ausdruecklich GLEICHER WERT. Hauptdomain und Unterdomain
 * arbeiten auf derselben Datenbank.
 *
 * WER SIE AENDERT, hat das Konto neu angelegt. Dann sagt
 * `npm run vorfuehrkonto` dieser Datei, welche Kennung einzutragen
 * ist; von Hand geraten wird sie nie.
 */
export const VORFUEHR_KENNUNG = "2e08de06-8876-473f-ba3d-67181ef65e33";

/**
 * DIE ADRESSE des Kontos. Sie stand bis zum 31.08.2026 in
 * scripts/vorfuehr-kern.mjs; hier ist sie fuer alle lesbar, auch fuer
 * die Anwendung.
 */
export const VORFUEHR_EMAIL = "r.niermann@hsretail.de";

/**
 * =====================================================================
 * DIE ZWEI WERTE, DIE EIN ENTFERNEN UEBERLEBEN MUESSEN
 * =====================================================================
 * Auftrag des Inhabers, 31.08.2026: "Ja, ein alter QR-Code soll auf das
 * neue Objekt zeigen. Genau darum geht es. Die Zettel sind gedruckt,
 * und wenn die Kennung wechselt, sind sie tot."
 *
 * DER BEFUND DAHINTER: `npm run vorfuehrkonto:entfernen` nimmt das
 * Objekt mit, und mit ihm beide Werte. Die Sperre gegen das
 * Neuwuerfeln, die seit dem 23.08.2026 im Kern steht, greift dabei
 * NICHT: Sie vergleicht gegen einen Bestand, und den gibt es nach dem
 * Entfernen nicht mehr. Es warnte also niemand.
 *
 * NIEMAND TIPPT SIE AB. Das Entfernen legt sie hier ab, bevor es
 * loescht; der Aufbau liest sie und nimmt sie, statt zu wuerfeln.
 * Dieselbe Bauart wie `merkliste:schreiben`, `wirkung:bestand` und
 * `typ-bestand:schreiben`: Ein Skript schreibt, ein anderes liest.
 *
 * DASS ES OHNE MIGRATION GEHT, ist gemessen: Der Trigger aus 0058
 * laesst einen VORGEGEBENEN anfragen_alias stehen ("if ... is not null
 * then return new"), und die seite_kennung vergibt ohnehin das Skript.
 *
 * `null` heisst: noch keiner abgelegt, dann wird gewuerfelt wie bisher.
 */

/** Die Kennung der Objektseite. Steht auf dem QR-Druckblatt. */
export const VORFUEHR_SEITE_KENNUNG = "scl2vmUGG3we";

/** Die Schutz-Adresse des Objekts. Steht in Mails und im Portal-Export. */
export const VORFUEHR_ANFRAGEN_ALIAS = "anfragen-dc6a46@selbst-verkauf.de";

/** Sieht ein Wert ueberhaupt wie eine Kennung aus? */
export function kennungWohlgeformt(wert) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(wert ?? "")
  );
}
