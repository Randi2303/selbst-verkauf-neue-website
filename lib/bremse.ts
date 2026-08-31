import "server-only";
import { createHash } from "node:crypto";

/**
 * Die Bremse fuer die oeffentlichen Wege (Bau-Runde 6, 17.08.2026).
 *
 * WARUM ES SIE GIBT: Die oeffentliche Anfrage hatte keine
 * Mengenbegrenzung. Gemessen waren elf Absendungen in sieben Sekunden,
 * jede davon eine Mail an den Verkaeufer, eine Team-Meldung und bei
 * einem veroeffentlichten Objekt ein weiterer gueltiger Expose-Zugang.
 * Die Adresse dazu haengt als QR-Code im Vorgarten.
 *
 * ALLE GRENZEN STEHEN HIER, in einer Datei. Wer eine Zahl aendern
 * will, aendert sie an genau einer Stelle. Die Zahlen sind bewusst so
 * gewaehlt, dass ein ehrlicher Mensch sie nie erreicht; jede Grenze
 * traegt ihre Begruendung als Kommentar.
 *
 * WIE GEZAEHLT WIRD, zwei Schichten mit Absicht:
 *
 * 1. LANGE FENSTER (24 Stunden) zaehlen ZEILEN, die es ohnehin gibt:
 *    anfragen je E-Mail und je Objekt, kuendigungs_eingaenge je
 *    E-Mail. Diese Zaehlung ueberlebt jeden Neustart, braucht keine
 *    neue Tabelle und keine Migration, und sie kann nicht von der
 *    Wirklichkeit abweichen, weil sie die Wirklichkeit selbst ist.
 *    Sie steht in den Routen, nicht hier.
 *
 * 2. KURZE FENSTER (Minuten bis Stunden) zaehlen im Speicher dieses
 *    Prozesses. Das ist absichtlich so und keine Sparsamkeit:
 *    - Das Zaehlen ist synchron. Zwei Absendungen desselben
 *      Doppelklicks laufen durch dieselbe Ereignisschleife, die
 *      zweite sieht die erste IMMER, auch wenn deren Datenbank-Zeile
 *      noch nicht geschrieben ist. Eine Datenbank-Zaehlung hat genau
 *      dieses Loch (siehe kontingentVerbrauchen, Befund 3.4).
 *    - Ein Neustart leert die kurzen Fenster. Das ist verkraftbar:
 *      Neustarts sind selten, und ein Angreifer gewinnt damit ein
 *      paar Minuten, kein Loch.
 *    - Die Anwendung laeuft als EIN Prozess (next start auf
 *      Hostinger). Sollte sie je auf mehrere Prozesse verteilt
 *      werden, gilt jede Speicher-Grenze je Prozess; sie wird
 *      dadurch weicher, nie falsch.
 *
 * WAS WER ZU SEHEN BEKOMMT, die zwei Regeln der Runde:
 * - Wer versehentlich gegen eine Grenze laeuft, bekommt einen
 *   freundlichen Satz und weiss, was er tun kann (BREMS_SAETZE).
 *   Ein Doppelklick auf Senden bekommt gar nichts zu sehen, er wird
 *   still als die eine Absendung behandelt, die er gemeint hat.
 * - Wer sie absichtlich reisst, erfaehrt nicht, wie sie
 *   funktioniert: kein Zaehlerstand, kein Fenster, kein Zeitpunkt,
 *   kein Retry-After-Kopf. Alle Saetze sind ohne Zahlen.
 */

/* ------------------------------------------------------------------ */
/* Die Grenzen                                                         */
/* ------------------------------------------------------------------ */

export const GRENZEN = {
  anfrage: {
    /** Dieselbe Absendung (Objekt, E-Mail, Nachricht) noch einmal:
     *  15 Minuten lang still als Erfolg behandeln. Das ist der
     *  Doppelklick und der Reload mit erneutem Absenden. */
    doppeltFensterSekunden: 15 * 60,
    /** Je E-Mail und Objekt in 24 Stunden. Drei verschiedene
     *  Nachrichten an denselben Verkaeufer an einem Tag sind das
     *  Aeusserste, was ehrlich vorkommt; die vierte ist Laerm. */
    jeEmailUndObjekt24h: 3,
    /** Je Anschluss (IP) ueber alle Objekte, kurzes Fenster. Zehn in
     *  zehn Minuten lassen einen Tag der offenen Tuer hinter einem
     *  Mobilfunk-NAT durch (jeder Gast einmal) und stoppen die
     *  gemessene Elf-in-sieben-Sekunden-Schleife. */
    jeAdresseKurz: { limit: 10, fensterSekunden: 10 * 60 },
    /** Je Anschluss, laengeres Fenster: dreissig je Stunde. Ein
     *  Buerohaus hinter EINER Adresse, in dem dreissig Menschen
     *  binnen einer Stunde dasselbe Haus anfragen, gibt es ehrlich
     *  nicht; ein Skript schafft die dreissig in Sekunden. */
    jeAdresseStunde: { limit: 30, fensterSekunden: 60 * 60 },
    /** Je Objekt in 24 Stunden, die Notbremse gegen verteilte
     *  Absender. AB HIER WIRD NICHTS ABGEWIESEN: Die Anfrage wird
     *  weiter gespeichert und steht im Posteingang, nur Mails und
     *  Team-Meldungen je Anfrage setzen aus, und das Team bekommt
     *  beim Kippen genau eine Meldung. Ein ehrlicher Interessent
     *  Nummer 51 verliert also nichts als die Mail an den
     *  Verkaeufer, und dessen Postfach bleibt brauchbar. */
    jeObjekt24h: 50,
  },

  /** Die Tueren mit Token, je Link (einmal_links.id) in 24 Stunden.
   *  Ehrliche Nutzung liegt bei einer Handvoll Handlungen am Tag;
   *  die Grenzen deckeln, was ein Token-Inhaber an Mails und Zeilen
   *  ausloesen kann. */
  tueren: {
    /** Nachweis-Upload: je Upload zwei Mails, eine Team-Meldung und
     *  zwei Einwilligungs-Zeilen. Wer sich vertan hat, laedt zweimal
     *  neu hoch, nicht fuenfzehnmal. */
    nachweisJeToken24h: 15,
    /** Gebot: je Speichern eine Mail an die angegebene Adresse und
     *  eine Team-Meldung. Zwanzig, damit auch ein hitziges Bieten
     *  am letzten Tag nie anstoesst. */
    gebotJeToken24h: 20,
    /** Zu- oder Absage einer Besichtigung: je Wechsel Mails an den
     *  Verkaeufer und Chronik-Zeilen. */
    besichtigungJeToken24h: 15,
    /** Selbst eine Zeit buchen oder verschieben: je Erfolg zwei
     *  Mails samt Kalendereintrag und eine Team-Meldung. */
    terminBuchenJeToken24h: 15,
    /** Die freien Zeiten nachladen: nur Rechenzeit, deshalb weit.
     *  Die Seite laedt sie einmal beim Aufbau und nach jedem
     *  Buchungsversuch, ehrlich sind das unter zwanzig am Tag. */
    terminFreiJeToken24h: 200,
    /** Das Expose-PDF: mehrere Megabyte je Abruf aus dem Speicher.
     *  Vierzig Oeffnungen am Tag liest kein Mensch, eine
     *  Herunterlade-Schleife schon. */
    exposeDateiJeToken24h: 40,
    /** "Upload-Link erneut zusenden" auf der Terminseite (Bau-Runde 5):
     *  je ZUGESTELLTE Mail an die hinterlegte Adresse. Wer den Link
     *  zweimal verlegt, bekommt ihn dreimal; mehr am selben Tag ist
     *  keine Vergesslichkeit mehr.
     *
     *  DIESE ZAHL TRAEGT DEN SATZ, nicht die Tuer (Bau-Runde 17).
     *  Gezaehlt wird erst NACH belegtem Versand, deshalb ist der Satz
     *  "heute bereits zugesandt" wahr, wenn sie greift. Die Tuer
     *  daneben steht in nachweisMailVersucheJeToken24h. */
    nachweisMailJeToken24h: 3,
    /** Dieselbe Strecke, aber auf VERSUCHE, und vor allen
     *  Fehlerwegen gezaehlt. Sie ist die eigentliche Tuer.
     *
     *  WARUM ZWEI ZAEHLUNGEN (Bau-Runde 17, 21.08.2026): Vorher gab
     *  es nur die knappe Zahl oben, und sie zaehlte vor fuenf
     *  Fehlerwegen mit. Nach drei Fehlschlaegen las ein Interessent,
     *  der NIE eine Mail bekommen hatte, der Link sei ihm heute
     *  bereits zugesandt worden, und war fuer den Tag ausgesperrt.
     *  Nur bei Erfolg zu zaehlen waere die andere Falle gewesen: Wer
     *  den Versand zuverlaessig scheitern laesst, koennte die Strecke
     *  dann beliebig oft anstossen.
     *
     *  Fuenfzehn ist die Groessenordnung der uebrigen Token-Tueren.
     *  Die Mail geht ausschliesslich an die hinterlegte Adresse, also
     *  an den Token-Inhaber selbst; diese Grenze schuetzt unser
     *  Versand-Kontingent, nicht einen Dritten vor Post. Ihr Satz
     *  behauptet nichts (nachweisMailNichtMoeglich). */
    nachweisMailVersucheJeToken24h: 15,
  },

  kuendigung: {
    /** Je E-Mail-Adresse in 24 Stunden, gezaehlt an den gespeicherten
     *  Eingaengen. Wer sich vertippt hat, schickt eine zweite und
     *  eine dritte Erklaerung; die vierte am selben Tag ist keine
     *  Kuendigung mehr. Der Satz dazu nennt den Ausweich-Weg per
     *  E-Mail, denn dieser Weg darf nie versperrt sein. */
    jeEmail24h: 3,
    /** Je Anschluss je Stunde, gegen Schleifen mit wechselnden
     *  Adressen: jede Absendung erzeugt eine Mail an eine frei
     *  waehlbare Adresse. */
    jeAdresseStunde: { limit: 10, fensterSekunden: 60 * 60 },
  },

  /** Passwort vergessen und Einladung anfordern: beide antworten
   *  IMMER neutral mit ok, deshalb sind diese Grenzen unsichtbar.
   *  Sie begrenzen, wie viele Mails ein Fremder einem BEKANNTEN
   *  Konto in den Posteingang werfen kann. */
  zugangsMails: {
    jeEmail24h: 4,
    jeAdresseStunde: { limit: 10, fensterSekunden: 60 * 60 },
  },

  /** Die vier Exposé-Textarten sind seit Runde 11 (Teil 2) FREI,
   *  ohne Kontingent: Uebernommen wird ohnehin nichts ohne Klick,
   *  und ein Verkaeufer, der an seinen eigenen Texten feilt, ist
   *  kein Missbrauch. Diese Bremse schuetzt nur unser OpenAI-Konto
   *  vor einer Schleife. Sechzig Erzeugungen an einem Tag probiert
   *  kein Mensch mit vier Feldern und vier Stilen; ein Skript schafft
   *  sie in Minuten. Ein Neustart leert das Fenster, das ist bei
   *  einer Missbrauchs-Bremse verkraftbar (siehe Kopf der Datei). */
  kiTexte: {
    erzeugenJeKonto24h: { limit: 60, fensterSekunden: 24 * 60 * 60 },
  },

  /**
   * DER ASSISTENT (Runde 19). Zwei Grenzen mit zwei verschiedenen
   * Aufgaben, und die Trennung ist der Kern:
   *
   * DIESE BREMSE SCHUETZT UNS und zaehlt JEDEN Abruf, auch den, der in
   * einer Absage endet. Sonst koennte ein Skript unser OpenAI-Konto
   * beliebig oft anstossen, solange es nur gesperrte Fragen stellt.
   * Dreissig Fragen an einem Tag stellt kein Verkaeufer; wer wirklich
   * so viel wissen will, ist beim Menschen besser aufgehoben, und
   * genau dorthin fuehrt der Satz.
   *
   * DAS KONTINGENT assistent_fragen ist die faire Grenze fuer den
   * Kunden und zaehlt nur GELIEFERTE Antworten (lib/kontingente.ts).
   *
   * DER KURZE WEG ZAEHLT AUF KEINE VON BEIDEN: Er kostet keinen Abruf
   * und bleibt deshalb offen, auch wenn hier Schluss ist. Ein
   * Assistent, der ploetzlich ganz schweigt, waere schlechter als
   * einer, der sagt, was noch geht.
   */
  assistent: {
    fragenJeKonto24h: { limit: 30, fensterSekunden: 24 * 60 * 60 },
  },
} as const;

/* ------------------------------------------------------------------ */
/* Die Saetze                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ein Satz je Tuer, alle ohne Zahlen, ohne Fenster, ohne Zeitpunkt.
 * "Bitte versuchen Sie es spaeter noch einmal" sagt, was zu tun ist,
 * und verraet nicht, wann es wieder geht.
 */
export const BREMS_SAETZE = {
  anfrageBereitsDa:
    "Ihre Anfrage ist bereits beim Eigentümer angekommen, er meldet sich bei Ihnen. Ein weiteres Absenden ist nicht nötig.",
  anfrageSpaeter:
    "Das Absenden ist gerade nicht möglich. Bitte versuchen Sie es später noch einmal.",
  nachweis:
    "Das Hochladen ist gerade nicht möglich. Bitte versuchen Sie es später noch einmal.",
  gebot:
    "Ihr Gebot lässt sich gerade nicht speichern. Bitte versuchen Sie es später noch einmal.",
  besichtigung:
    "Ihre Antwort lässt sich gerade nicht speichern. Bitte versuchen Sie es später noch einmal.",
  terminBuchen:
    "Das Buchen ist gerade nicht möglich. Bitte versuchen Sie es später noch einmal.",
  terminFrei:
    "Die freien Zeiten lassen sich gerade nicht laden. Bitte laden Sie die Seite später neu.",
  exposeDatei:
    "Das Exposé lässt sich gerade nicht öffnen. Bitte versuchen Sie es später noch einmal.",
  nachweisMail:
    "Der Link wurde Ihnen heute bereits zugesandt. Bitte sehen Sie in Ihrem Postfach nach, auch im Spam-Ordner.",
  nachweisMailNichtMoeglich:
    "Das lässt sich gerade nicht anstoßen. Antworten Sie bitte kurz auf eine der E-Mails zu Ihrer Anfrage, dann meldet sich die Verkäuferseite mit dem Upload-Link.",
  /* DER SATZ BEHAUPTET NICHTS MEHR (Bau-Runde 17). Er lautete "Sie
     haben heute ungewöhnlich viele Vorschläge erzeugt", und diese
     Bremse zaehlt jeden VERSUCH, auch den, bei dem das Modell nichts
     lieferte. Wer sechzigmal in einen Ausfall lief, las also, er habe
     sechzig Vorschlaege erzeugt, ohne einen einzigen bekommen zu
     haben. Die andere Loesung waere gewesen, nur gelungene Abrufe zu
     zaehlen; dann koennte ein Skript unser OpenAI-Konto beliebig oft
     anstossen, solange es scheitert, und genau davor schuetzt diese
     Bremse. Also bleibt die Zaehlung streng und der Satz wird
     ehrlich: Er nennt die Grenze, nicht eine Leistung. */
  kiTexteErzeugen:
    "Für heute ist die Grenze für Text-Vorschläge erreicht. Bitte versuchen Sie es morgen noch einmal; Ihre übernommenen Texte bleiben erhalten.",
} as const;

/**
 * WELCHE SAETZE EINE VOLLZOGENE WIRKUNG BEHAUPTEN, als Prueftvertrag.
 *
 * WOZU (Bau-Runde 17, 21.08.2026): Ein Satz wie "Der Link wurde Ihnen
 * heute bereits zugesandt" ist eine Tatsachenbehauptung ueber etwas,
 * das WIR getan haben sollen. Wer ihn ausgibt, muss dafuer einstehen:
 * Der Zaehler dahinter darf nur zaehlen, was tatsaechlich hinausging,
 * ODER die Funktion nimmt ihre Zaehlung im Fehlerfall wieder zurueck
 * (bremseZuruecknehmen). Sonst liest ein Mensch, dem nie etwas
 * zugestellt wurde, er habe es bereits bekommen, und sucht in seinem
 * Postfach nach einer Mail, die es nicht gibt.
 *
 * DIESE LISTE PRUEFT scripts/wirkung-pruefen.mjs. Sie tut zweierlei:
 * Jede Fundstelle, die einen Satz von hier ausgibt, braucht die
 * Ruecknahme in derselben Funktion; und jeder Satz in BREMS_SAETZE,
 * der nach einer Wirkungs-Behauptung KLINGT und hier fehlt, bricht den
 * Bau ebenfalls. Ein neuer Satz kann sich also nicht daran vorbei
 * schleichen, indem er nicht eingetragen wird.
 *
 * AUSNAHME, die keine ist: Wer den Satz ausgibt, nachdem er die Zahl
 * hinter der belegten Wirkung gezaehlt hat (nachweisMail seit
 * Runde 17), erfuellt den Vertrag ohne Ruecknahme. Das steht dann als
 * `wirkung: gewollt` am Fundort, mit dem Grund.
 */
export const SAETZE_MIT_WIRKUNGSBEHAUPTUNG = [
  "anfrageBereitsDa",
  "nachweisMail",
] as const satisfies readonly (keyof typeof BREMS_SAETZE)[];

/* ------------------------------------------------------------------ */
/* Der Zaehler                                                         */
/* ------------------------------------------------------------------ */

/** Je Schluessel die Zeitpunkte der letzten Ereignisse */
const zaehler = new Map<string, number[]>();

/** Nichts lebt laenger als das groesste Fenster */
const GROESSTES_FENSTER_MS = 24 * 60 * 60 * 1000;

/** Aufraeumen hoechstens alle zehn Minuten, nebenbei beim Zaehlen */
const REINIGUNGS_ABSTAND_MS = 10 * 60 * 1000;
let zuletztGereinigt = 0;

/**
 * Obergrenze der Schluessel im Speicher. Sie schuetzt den Prozess
 * selbst: Wer mit wechselnden Adressen Schluessel erzeugt, fuellt
 * sonst den Speicher statt des Postfachs. Beim Ueberlauf fliegen die
 * aeltesten Eintraege; das lockert im schlimmsten Fall eine Grenze,
 * es sperrt nie jemanden zusaetzlich aus.
 */
const HOECHSTENS_SCHLUESSEL = 50_000;

function reinigen(jetzt: number): void {
  if (jetzt - zuletztGereinigt < REINIGUNGS_ABSTAND_MS) return;
  zuletztGereinigt = jetzt;
  const verfallen = jetzt - GROESSTES_FENSTER_MS;
  for (const [schluessel, zeiten] of zaehler) {
    if (zeiten.length === 0 || zeiten[zeiten.length - 1] < verfallen) {
      zaehler.delete(schluessel);
    }
  }
  if (zaehler.size > HOECHSTENS_SCHLUESSEL) {
    const nachAlter = [...zaehler.entries()].sort(
      (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0)
    );
    for (const [schluessel] of nachAlter.slice(0, zaehler.size - HOECHSTENS_SCHLUESSEL)) {
      zaehler.delete(schluessel);
    }
  }
}

/**
 * Ein Ereignis zaehlen und den Stand im Fenster zurueckgeben.
 *
 * SYNCHRON MIT ABSICHT: Zwischen Pruefen und Zaehlen liegt kein
 * await, deshalb kann sich kein zweiter Aufruf dazwischenschieben.
 * Abgewiesene Versuche zaehlen mit; sonst waere Wiederholen gratis.
 */
export function bremseZaehlen(schluessel: string, fensterSekunden: number): number {
  const jetzt = Date.now();
  reinigen(jetzt);
  const grenze = jetzt - fensterSekunden * 1000;
  const bisher = zaehler.get(schluessel);
  const frisch = bisher ? bisher.filter((z) => z > grenze) : [];
  frisch.push(jetzt);
  zaehler.set(schluessel, frisch);
  return frisch.length;
}

/**
 * Der Stand im Fenster, OHNE zu zaehlen.
 *
 * WOFUER (Bau-Runde 17): Eine Zaehlung, die nur BELEGTE Wirkungen
 * zaehlt, darf beim Nachsehen nicht selbst hochlaufen. Sonst waere
 * jeder Blick auf den Zaehlerstand schon eine zugestellte Mail.
 * Gezaehlt wird dort erst nach dem Versand, gelesen hier davor.
 *
 * Kein reinigen(): Lesen soll nichts veraendern, auch nicht
 * nebenbei; die verfallenen Zeitpunkte werden ohnehin herausgefiltert.
 */
export function bremseStand(schluessel: string, fensterSekunden: number): number {
  const grenze = Date.now() - fensterSekunden * 1000;
  const bisher = zaehler.get(schluessel);
  return bisher ? bisher.filter((z) => z > grenze).length : 0;
}

/**
 * Das zuletzt gezaehlte Ereignis dieses Schluessels wieder streichen.
 *
 * WOFUER: Ein Merker, der VOR der Arbeit gesetzt wird, damit ein
 * zweiter Klick den ersten sieht, muss wieder weg, wenn die Arbeit
 * dann scheitert. Sonst gilt der gescheiterte Versuch als der
 * gelungene, und die Wiederholung wird als Doppelung verschluckt: Der
 * Mensch sieht "hat geklappt", und es steht nichts in der Datenbank.
 * Genau dieser Fall stand in der Anfrage-Strecke; die Fehlermeldung
 * dort bittet ausdruecklich darum, es noch einmal zu versuchen.
 *
 * NUR DAS LETZTE EREIGNIS und nur, wenn es wirklich das eigene ist:
 * gestrichen wird der juengste Zeitstempel. Laeuft parallel ein
 * echter zweiter Versuch, streicht dieser Aufruf im schlimmsten Fall
 * dessen Eintrag, und die Bremse ist einen Versuch lang lockerer.
 * Ein zu strenger Zaehler kostet eine Anfrage, ein zu lockerer eine
 * Mail zu viel.
 */
export function bremseZuruecknehmen(schluessel: string): void {
  const zeiten = zaehler.get(schluessel);
  if (!zeiten || zeiten.length === 0) return;
  zeiten.pop();
  if (zeiten.length === 0) zaehler.delete(schluessel);
  else zaehler.set(schluessel, zeiten);
}

/** true, wenn die Grenze mit diesem Ereignis gerissen ist */
export function bremseVoll(
  schluessel: string,
  grenze: { limit: number; fensterSekunden: number }
): boolean {
  return bremseZaehlen(schluessel, grenze.fensterSekunden) > grenze.limit;
}

/**
 * Schluessel aus Bestandteilen, als Abdruck statt im Klartext: Weder
 * eine E-Mail-Adresse noch ein Anschluss gehoeren lesbar in den
 * Speicher eines Prozesses, der sie sonst nirgends haelt.
 */
export function bremsSchluessel(...teile: (string | null | undefined)[]): string {
  /* DAS TRENNZEICHEN IST EIN NUL-BYTE, geschrieben als `\x00`.
     ------------------------------------------------------------------
     WOZU: Ohne Trenner ergaeben ["ab","c"] und ["a","bc"] denselben
     Schluessel, und zwei verschiedene Vorgaenge teilten sich einen
     Zaehler. Ein NUL-Byte kann in keinem der Teile vorkommen, ein
     Komma oder Doppelpunkt schon.

     ALS ESCAPE UND NICHT DIREKT (29.08.2026): Bis dahin stand hier
     das rohe Byte im Quelltext. Der Wert ist derselbe, aber die Datei
     galt damit als BINAER, und jedes Werkzeug mit dem Schalter -I
     ("Binaerdateien ueberspringen") ging still an ihr vorbei. Genau
     das ist passiert: Eine Suche meldete null Exporte in dieser Datei,
     obwohl zwoelf darin stehen, und zwar ohne ein Wort der Warnung.

     Dass die Schreibweise nichts am Ergebnis aendert, wurde an dieser
     Funktion nachgemessen, nicht angenommen: dieselben Schluessel fuer
     dieselben Eingaben. */
  return createHash("sha256")
    .update(teile.map((t) => t ?? "").join("\x00"))
    .digest("hex")
    .slice(0, 32);
}

/**
 * Die Grenze einer Token-Tuer: je Link (einmal_links.id) und Tag.
 * Der Schluessel haengt an der Link-KENNUNG, nicht am Token selbst;
 * die Kennung ist keine Geheimnis und steht ohnehin in der Datenbank.
 */
export function tuerVoll(tuer: string, linkId: string, limit: number): boolean {
  return bremseZaehlen(bremsSchluessel("tuer", tuer, linkId), 24 * 60 * 60) > limit;
}

/**
 * Dieselbe Tuer, aber nur NACHSEHEN (Bau-Runde 17).
 *
 * Fuer die zweite Zaehlung einer Strecke, die zwischen Versuch und
 * belegter Wirkung unterscheidet: Der Stand wird vor der Arbeit
 * gelesen und erst nach der Arbeit erhoeht (tuerZaehlen). So kann der
 * Satz an den Menschen die Wirkung behaupten, ohne zu luegen.
 */
export function tuerStandVoll(tuer: string, linkId: string, limit: number): boolean {
  return bremseStand(bremsSchluessel("tuer", tuer, linkId), 24 * 60 * 60) >= limit;
}

/** Eine belegte Wirkung an dieser Tuer vermerken (siehe tuerStandVoll) */
export function tuerZaehlen(tuer: string, linkId: string): void {
  bremseZaehlen(bremsSchluessel("tuer", tuer, linkId), 24 * 60 * 60);
}

/* ------------------------------------------------------------------ */
/* Der Anschluss                                                       */
/* ------------------------------------------------------------------ */

/**
 * Die Adresse des Anrufers, so gut sie zu haben ist.
 *
 * Genommen wird der LETZTE Eintrag in x-forwarded-for: Den haengt der
 * Proxy vor der Anwendung an, er ist der einzige, den der Absender
 * nicht selbst schreiben kann. Ein selbst geschickter Kopf verlaengert
 * die Liste nur vorn und laeuft ins Leere.
 *
 * Oertlich (ohne Proxy) fehlt der Kopf; dann gibt es keine Adresse
 * und die Anschluss-Grenzen setzen aus. Das ist richtig so: Eine
 * geratene Adresse wuerde alle Anrufer in einen Topf werfen, und
 * genau das soll diese Grenze nie tun. Die E-Mail- und
 * Objekt-Grenzen gelten unabhaengig davon weiter.
 */
export function klientAdresse(request: Request): string | null {
  const kopf = request.headers.get("x-forwarded-for");
  if (!kopf) return null;
  const teile = kopf.split(",").map((t) => t.trim()).filter(Boolean);
  return teile.length > 0 ? teile[teile.length - 1] : null;
}
