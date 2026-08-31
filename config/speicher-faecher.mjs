/**
 * DIE NAMEN DER SPEICHER-FAECHER, AN EINER STELLE.
 *
 * ================================================================
 * WARUM DIESE DATEI .mjs IST UND NICHT .ts
 * ================================================================
 * Befund der Werkzeug-Runde vom 22.08.2026: Siebzehn Werkzeuge
 * sprachen ein Fach als nackte Zeichenkette an ("unterlagen",
 * "bonitaet"), und KEIN EINZIGES holte die Konstante. Die Konstanten
 * lagen in Typescript, die Werkzeuge laufen mit blossem node, und node
 * liest kein Typescript. Der bequeme Weg war, den Namen hinzuschreiben.
 *
 * DREI DAVON SIND ABBAU-SKRIPTE. Wird ein Fach jemals umbenannt,
 * raeumen sie stillschweigend nichts mehr weg und melden trotzdem
 * fertig. Das ist ein Merker vor seiner Wirkung, und auf genau diese
 * Skripte berufen wir uns nach jeder Runde mit dem Satz, die
 * Pruefdaten seien restlos abgebaut.
 *
 * Als .mjs liest diese Datei beides: node ohne Umschweife, und
 * Typescript ueber allowJs. Deshalb steht der Name jetzt einmal hier
 * und nirgends sonst.
 *
 * ================================================================
 * WER EIN FACH UMBENENNT
 * ================================================================
 * aendert den Namen hier UND legt eine Migration an, die das Fach in
 * Supabase umbenennt. Der Name in dieser Datei ist der Name in der
 * Datenbank; es gibt keine Uebersetzung dazwischen.
 */

/** Objekt-Dokumente des Verkaeufers, privat */
export const UNTERLAGEN_BUCKET = "unterlagen";

/** Bonitaetsnachweise der Interessenten, privat, 90-Tage-Frist */
export const BONITAET_BUCKET = "bonitaet";

/** Dokumente an einer Interessenten-Akte (Migration 0056), privat */
export const INTERESSENTEN_BUCKET = "interessenten";

/** Originaldateien der Portal-Eingaenge (Migration 0062), privat */
export const EINGANG_BUCKET = "portal-eingaenge";

/**
 * Portraets der Makler, OEFFENTLICH (Migration 0035). Sie stehen auf
 * der Website und an der Makler-Karte im Konto.
 *
 * ====================================================================
 * DAS EINZIGE FACH AUSSERHALB VON ALLE_FAECHER, UND ZWAR MIT ABSICHT
 * ====================================================================
 * Es steht bewusst NICHT in der Liste darunter, denn die ist die
 * Abbau-Liste: Was dort steht, raeumt scripts/aufraeumen.mjs ab.
 * Portraets sind keine Pruefdaten, sondern Team-Bilder; ein Abbau
 * loeschte die Gesichter von der Website.
 *
 * WARUM ES BIS ZUM 29.08.2026 GAR NICHT HIER STAND: Es hat niemand
 * bemerkt. Die Bau-Pruefung scripts/speicher-faecher-pruefen.mts
 * konnte es nicht bemerken, denn sie beanstandet nur Namen, die sie
 * KENNT (ihre Zeile "ein anderes Fach, nicht unser Fall"), und sie
 * gleicht ALLE_FAECHER gegen die Konstanten derselben Datei ab, also
 * gegen sich selbst. Gefunden hat es erst die Datenprobe
 * scripts/faecher-bestand-pruefen.mts, die Supabase fragt statt den
 * Quelltext.
 */
export const MAKLER_BUCKET = "makler";

/**
 * Alle vier zusammen, fuer Werkzeuge, die ueber alle Faecher laufen
 * (Waisen suchen, abbauen, nachzaehlen). Wer ein Fach ergaenzt und
 * diese Liste vergisst, laesst genau dort Dateien liegen.
 *
 * MAKLER_BUCKET GEHOERT NICHT HIEREIN, siehe dort. Diese Liste heisst
 * "alle" und meint "alle, die abgeraeumt werden"; der Unterschied
 * steht seit dem 29.08.2026 in FACH_ERWARTUNG, damit ihn niemand
 * erraten muss.
 */
export const ALLE_FAECHER = [
  UNTERLAGEN_BUCKET,
  BONITAET_BUCKET,
  INTERESSENTEN_BUCKET,
  EINGANG_BUCKET,
];

/**
 * WAS IN JEDEM FACH LIEGEN DARF, und ob es abgeraeumt wird.
 *
 * ====================================================================
 * WOZU DAS BRAUCHT ES (Befund vom 29.08.2026)
 * ====================================================================
 * Der Quelltext konnte bis dahin nur sich selbst pruefen. Dass in
 * Supabase ein FUENFTES Fach liegt, das keine Liste kennt, war von
 * hier aus unsichtbar. Diese Erwartung ist die Soll-Seite, gegen die
 * scripts/faecher-bestand-pruefen.mts den echten Bestand haelt: in
 * beide Richtungen, samt Sichtbarkeit und Inhalt.
 *
 * JEDES FACH BRAUCHT EINEN EINTRAG. Der Record ueber die Namen
 * erzwingt es beim Uebersetzen; wer ein Fach ergaenzt und die Frage
 * nicht beantwortet, kommt nicht durch den Bau. Dieselbe Ordnung wie
 * config/auftraege.ts und config/schreibrechte.ts.
 *
 * DIE MUSTER SIND NAEHERUNGEN, keine Vertraege. Sie fangen die grobe
 * Verwechslung (eine PDF im Portraet-Fach, eine Datei ohne Ordner),
 * nicht den Inhalt einer Datei.
 */
export const FACH_ERWARTUNG = {
  [UNTERLAGEN_BUCKET]: {
    beschreibung:
      "Dokumente und Fotos des Verkaeufers, unter <konto>/<objekt>/ oder <konto>/auftraege/<auftrag>/",
    oeffentlich: false,
    abraeumen: true,
    grund: "Pruefdaten des Vorfuehrkontos liegen hier; der Abbau muss sie erreichen.",
    pfadMuster: /^[0-9a-f-]{36}\/.+/,
    mimeMuster: /^(image\/|application\/pdf|video\/)/,
  },
  [BONITAET_BUCKET]: {
    /* ZWEI FORMEN, und die zweite ist Absicht: Die Vorfuehrung legt
       ihre Beispiel-Nachweise unter "vorfuehrung/" ab, damit sie ein
       Zuruecksetzen ueberleben (scripts/vorfuehr-kern.mjs, BLEIBT_
       STEHEN). Gemessen am 29.08.2026 lagen dort zwei Dateien, und die
       erste Fassung dieses Musters meldete beide faelschlich. */
    beschreibung:
      "Bonitaetsnachweise der Interessenten unter <konto>/, dazu die Vorfuehr-Beispiele unter vorfuehrung/",
    oeffentlich: false,
    abraeumen: true,
    grund: "Personendaten mit Frist; der Abbau muss sie erreichen.",
    pfadMuster: /^([0-9a-f-]{36}|vorfuehrung)\/.+/,
    mimeMuster: /^(image\/|application\/pdf)/,
  },
  [INTERESSENTEN_BUCKET]: {
    beschreibung: "Dokumente an einer Interessenten-Akte",
    oeffentlich: false,
    abraeumen: true,
    grund: "Personendaten; der Abbau muss sie erreichen.",
    pfadMuster: /^[0-9a-f-]{36}\/.+/,
    mimeMuster: /^(image\/|application\/pdf)/,
  },
  [EINGANG_BUCKET]: {
    /* FLACH, OHNE ORDNER: Der Pfad ist "<eingang-id>.xml"
       (lib/openimmo-feedback.ts). Die erste Fassung stand hier auf
       /.+/ und liess damit alles durch; die Gegenprobe der Datenprobe
       hat das am 29.08.2026 sofort gemeldet, und sie hatte recht: Ein
       Muster, das nichts abweist, ist kein Muster. */
    beschreibung: "Originaldateien der Portal-Eingaenge als <kennung>.xml, 12-Monats-Frist",
    oeffentlich: false,
    abraeumen: true,
    grund: "Belege mit Frist; der Abbau muss sie erreichen.",
    pfadMuster: /^[0-9a-f-]{36}\.xml$/i,
    mimeMuster: /^(application|text)\/(xml|plain)/,
  },
  [MAKLER_BUCKET]: {
    beschreibung: "Portraets der Makler, unter <konto>/portrait-<zeit>.<endung>",
    oeffentlich: true,
    abraeumen: false,
    grund:
      "Team-Bilder, keine Pruefdaten. Ein Abbau loeschte die Gesichter von der Website.",
    pfadMuster: /^[0-9a-f-]{36}\/portrait-\d+\.(png|jpe?g|webp)$/i,
    mimeMuster: /^image\//,
  },
};

/** @typedef {keyof typeof FACH_ERWARTUNG} FachName */
