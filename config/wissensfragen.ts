/**
 * DER ASSISTENT: wer er ist, was er sagt, und wovon er die Finger
 * lässt. Diese Datei trägt die SPERRLISTE und alle festen Sätze.
 *
 * ---------------------------------------------------------------------
 * HERKUNFT
 * ---------------------------------------------------------------------
 * Runde 14 baute den Wissens-Fragen-Kanal als Nebenprodukt der
 * Erfassung im Gespräch, mit vier Sicherungen übereinander. Runde 19
 * macht daraus etwas, das man an jeder Stelle des Kontos benutzen
 * kann, und ändert zwei Dinge grundlegend: die Grenze der Sperrliste
 * und den Ton.
 *
 * ---------------------------------------------------------------------
 * DIE GRENZE (Entscheidung des Inhabers, 21.08.2026)
 * ---------------------------------------------------------------------
 * Vorher sperrte "rechtlich" alles, was nach Vertrag, Frist oder
 * Kündigung klang. Gemessen am 21.08.2026: "Wie kündige ich die
 * Makler-Begleitung" bekam die Rechtsberatungs-Absage, obwohl die
 * Antwort wörtlich in unseren eigenen Vertragstexten steht. Ein
 * Assistent, der so etwas abweist, wirkt nutzlos, und die Leute
 * benutzen ihn nach dem dritten Mal nicht mehr.
 *
 * DIE NEUE GRENZE VERLÄUFT NICHT AM THEMA, SONDERN AM
 * VERTRAGSPARTNER:
 *
 *   ERLAUBT   Was zwischen UNS und dem Kunden gilt. Preis, Umfang,
 *             Laufzeit, Kündigung bei uns, Dauer einer Leistung, was
 *             nach einer Kündigung bleibt. Alles Dinge, die wir selbst
 *             festgelegt und aufgeschrieben haben.
 *   GESPERRT  Was zwischen dem Kunden und einem DRITTEN gilt (Käufer,
 *             Mieter, Finanzamt, Notar, Nachbar, Behörde) oder was das
 *             GESETZ sagt. Ebenso alles Steuerliche und jede
 *             Einschätzung zu Wert und Preis einer Immobilie.
 *
 * DER WIDERRUF IST DER EINE GRENZFALL und bleibt gesperrt: Er betrifft
 * unseren Vertrag, ist aber gesetzlicher Natur, und unser Text dazu
 * trägt "TODO Anwalt". Ihn hier durchzulassen hieße, eine
 * Arbeitsfassung als Auskunft auszuliefern.
 *
 * Zu allen vier gesperrten Gruppen antwortet NIE das Modell, sondern
 * immer wörtlich einer der Sätze unten. Auch die Absage "dazu steht
 * nichts in unseren Erklärungen" ist eine Konstante, damit kein frei
 * formulierter Absage-Satz nebenbei doch eine Aussage trifft.
 *
 * ---------------------------------------------------------------------
 * DER TON (Auflage des Inhabers, 21.08.2026)
 * ---------------------------------------------------------------------
 * "Wer eine Frage stellt und dreimal hintereinander abgewiesen wird,
 * hört auf zu fragen." Die Sätze unten sagen dasselbe wie vorher, nur
 * wärmer: Sie sagen zuerst, warum die Auskunft hier nicht sinnvoll
 * wäre, dann wer sie verlässlich gibt, und dann, dass ein Mensch
 * erreichbar ist.
 *
 * TON wie überall: kurze Sätze, Sie-Form, keine Gedankenstriche,
 * keine Ausrufezeichen, ehrlich sagen, was der nächste Schritt ist.
 */

/* ------------------------------------------------------------------ */
/* Wer antwortet                                                       */
/* ------------------------------------------------------------------ */

/**
 * Der Name des Assistenten, entschieden am 21.08.2026.
 *
 * ER DARF KEINEM MENSCHEN IM TEAM GEHÖREN (Auflage des Inhabers).
 * Sonst schreibt irgendwann jemand "Andreas hat mir gesagt", und
 * niemand weiß mehr, ob das der Makler war oder die Maschine. Vor
 * einer Umbenennung gegen siteConfig.brokerPartner.brokers prüfen.
 *
 * DIE BEDINGUNG ZUM VORNAMEN: Die Worte "virtueller Assistent" stehen
 * immer unmittelbar daneben, in der Kopfzeile des Fensters und im
 * ersten Satz. Ein Vorname allein täuschte einen Menschen vor, ein
 * Vorname mit dieser Zeile daneben täuscht niemanden.
 */
export const ASSISTENT_NAME = "Theo";
export const ASSISTENT_ROLLE = "Virtueller Assistent";

/**
 * DIE ERSTE NACHRICHT, bei JEDEM Öffnen neu. EIN Satzpaar, mehr nicht.
 *
 * ---------------------------------------------------------------------
 * WARUM SIE SO KURZ IST (Entscheidung des Inhabers, 21.08.2026)
 * ---------------------------------------------------------------------
 * Sie war einmal dreimal so lang und trug auch die Grenze ("zu Recht,
 * Steuern und zum Wert sage ich nichts") und den Weg zum Menschen.
 * Beides ist herausgenommen, und das ist KEIN Rückzug von der
 * Kennzeichnung, sondern eine bessere Verteilung:
 *
 *   Was er ist        steht in der Kopfzeile, dauerhaft:
 *                     "Virtueller Assistent", direkt neben dem Namen.
 *   Woher es kommt    steht an JEDER Antwort, als Kennzeichnung mit
 *                     den Quellen-Titeln.
 *   Der Weg zum       hat eine eigene Zeile über dem Eingabefeld,
 *   Menschen          immer sichtbar, nie am Ende eines Trichters.
 *
 * Die Auskunft ist also dreifach da, nur eben dort, wo man sie
 * braucht.
 *
 * DIE GRENZE ERKLÄRT SICH IN DEM AUGENBLICK AM BESTEN, IN DEM JEMAND
 * DANACH FRAGT. Dafür gibt es die festen Absagen unten. Vorher steht
 * sie nur im Weg und macht den ersten Eindruck kleinlich.
 */
export const ASSISTENT_EROEFFNUNG = [
  `Hallo, ich bin ${ASSISTENT_NAME}, der virtuelle Assistent von selbst-verkauf.de.`,
  "Ich sage Ihnen gern, wo etwas in Ihrem Konto liegt, wie ein Schritt geht und was eine Leistung kostet.",
];

/**
 * Die Fragen zum Antippen unter der ersten Nachricht.
 *
 * WER EIN LEERES FELD SIEHT, FRAGT NICHTS. Wer "Wo lade ich Fotos
 * hoch" liest, versteht in einer Sekunde, wofür das Ding gut ist.
 *
 * DREI, UND JEDE STEHT FÜR EINE ANDERE SORTE: ein Ort, der eigene
 * Stand, eine Auskunft über unser Angebot. Zusammen zeigen sie die
 * Spannweite, ohne dass jemand sie erklären muss. Die dritte ist mit
 * Bedacht genau die Frage, die der Kanal bis zum 21.08.2026 abgewiesen
 * hat.
 */
export const ASSISTENT_VORSCHLAEGE = [
  "Wo lade ich Fotos hoch?",
  "Was fehlt mir noch?",
  "Wie lange läuft mein Paket?",
];

/** Beschriftung des Wegs zum Menschen, immer sichtbar, nie am Ende eines Trichters */
export const ASSISTENT_ZUM_MENSCHEN = "Lieber einen Menschen? Zu den Nachrichten";
export const ASSISTENT_ZUM_MENSCHEN_ZIEL = "/konto/nachrichten";

/**
 * DARF DER ASSISTENT DEN STAND DES EIGENEN OBJEKTS AN DAS MODELL
 * GEBEN? NEIN, und das ist ein Schalter, kein Versehen.
 *
 * WORAN ER HÄNGT (Auflage des Inhabers, 21.08.2026): Das OpenAI-Konto
 * läuft auf die WerteImmobilien GmbH. Solange das so ist, gehen keine
 * echten Kundendaten an das Modell. Der Weg ist gebaut
 * (lib/assistent.ts, objektStandErlaubt), er ist nur nicht scharf.
 *
 * WAS TROTZDEM GEHT, und warum das kein Widerspruch ist: "Was fehlt
 * mir noch" beantwortet der kurze Weg (lib/kurzer-weg.ts) vollständig
 * ohne Modell, aus lib/aufgaben.ts. Diese Antwort entsteht im Haus und
 * verlässt es nie. Der Schalter hier betrifft ausschließlich den Fall,
 * dass Objektdaten IN EINEN ABRUF gelegt würden.
 *
 * VOR DEM EINSCHALTEN zu klären: eigenes Konto beim Anbieter,
 * Auftragsverarbeitung, und ob der Umfang der übergebenen Felder in
 * die Datenschutzerklärung gehört.
 */
export const ASSISTENT_KENNT_OBJEKT = false;

/* ------------------------------------------------------------------ */
/* Die Sperrliste                                                      */
/* ------------------------------------------------------------------ */

export const WISSENS_SPERRGRUENDE = [
  "rechtlich",
  "steuerlich",
  "wert",
  "widerruf",
] as const;
export type WissensSperrgrund = (typeof WISSENS_SPERRGRUENDE)[number];

export const WISSENS_ABSAGEN: Record<WissensSperrgrund, string> = {
  rechtlich:
    "Bei Rechtsfragen möchte ich Sie nicht mit einer halbrichtigen Auskunft losschicken. Verlässlich beantwortet Ihnen das ein Notar oder ein Anwalt.\n\nZu allem, was Ihren Verkauf bei uns betrifft, bin ich gern für Sie da, und über die Nachrichten erreichen Sie jederzeit einen Menschen aus unserem Team.",
  steuerlich:
    "Steuerfragen hängen stark an Ihrem Einzelfall, und raten möchte ich dabei nicht. Verlässlich beantwortet Ihnen das eine Steuerberatung.\n\nZu allem rund um Ihren Verkauf bei uns bin ich gern für Sie da, und über die Nachrichten erreichen Sie einen Menschen aus unserem Team.",
  wert:
    "Was Ihre Immobilie wert ist, sage ich Ihnen lieber nicht aus dem Bauch heraus.\n\nDafür gibt es die Markteinschätzung in Ihrem Konto, sie liefert eine Preisspanne aus echten Marktdaten. Über die Preisstrategie sprechen Sie danach am besten mit Ihrem Makler.",
  widerruf:
    "Zum Widerrufsrecht steht der verbindliche Wortlaut in Ihrer Auftragsbestätigung, im Abschnitt Widerrufsbelehrung. Ich gebe ihn hier bewusst nicht aus zweiter Hand wieder.\n\nWenn Sie ihn nicht finden, schickt Ihnen unser Team ihn über die Nachrichten gern noch einmal.",
};

/**
 * Ehrliche Absage, wenn die Erklärungen die Frage nicht hergeben.
 *
 * DER LETZTE SATZ IST WÖRTLICH WAHR und keine Beruhigung: Genau diese
 * Absage landet in der Ablage `assistent_absagen` und wird im internen
 * Bereich gezeigt. Er darf nur so lange stehen, wie das stimmt.
 */
export const WISSENS_ABSAGE_KEINE_QUELLE =
  "Dazu finde ich in unseren Erklärungen nichts, und raten möchte ich nicht.\n\nSchreiben Sie die Frage gern über die Nachrichten, dann antwortet Ihnen ein Mensch aus unserem Team persönlich. Ich notiere außerdem, dass diese Erklärung bei uns fehlt.";

/** Ehrliche Absage, wenn der Antwort-Dienst gerade nicht antwortet */
export const WISSENS_ABSAGE_TECHNIK =
  "Gerade komme ich an unsere Erklärungen nicht heran.\n\nVersuchen Sie es in einem Moment noch einmal, oder schreiben Sie uns über die Nachrichten, dann antwortet Ihnen ein Mensch.";

/**
 * Ehrliche Absage, wenn eine Antwort zwar kam, die mechanische
 * Nachprüfung sie aber verworfen hat (Sicherung 3). Der Kunde sieht
 * NIE den verworfenen Text, immer nur diesen Satz.
 */
export const WISSENS_ABSAGE_UNSICHER =
  "Hier bin ich mir nicht sicher genug, und eine unsichere Auskunft hilft Ihnen nicht weiter.\n\nSchreiben Sie die Frage gern über die Nachrichten, dann antwortet Ihnen ein Mensch aus unserem Team persönlich.";

/**
 * Absage, wenn die Grenze für heute erreicht ist (Runde 19, Punkt 8).
 *
 * EIN ASSISTENT, DER PLÖTZLICH SCHWEIGT, IST SCHLECHTER ALS EINER,
 * DER SAGT, WIE ES WEITERGEHT. Deshalb nennt der Satz beides: dass
 * die kostenlosen Wege offen bleiben und wo ein Mensch sitzt.
 */
export const WISSENS_ABSAGE_GRENZE =
  "Für heute habe ich meine Runde voll, das ist eine Grenze zum Schutz vor Missbrauch und kein Fehler bei Ihnen.\n\nWo etwas liegt und was Ihnen noch fehlt, sage ich Ihnen weiterhin sofort. Für alles andere schreiben Sie uns gern über die Nachrichten.";

/**
 * Kennzeichnung jeder gelieferten Antwort im Gespräch (Sicherung 4):
 * Der Kunde sieht, dass die Antwort aus unseren Erklärungen stammt
 * und nicht aus freiem Modellwissen.
 */
export const WISSENS_KENNZEICHEN = "Aus unseren Erklärungen";

/**
 * Deckel der Antwortlänge in Zeichen (mechanische Nachprüfung,
 * Sicherung 3). Die Vorgabe verlangt höchstens vier Sätze; der Deckel
 * fängt Ausreißer, bevor sie den Kunden erreichen.
 *
 * SEIT RUNDE 19 GILT ER NICHT FÜR WÖRTLICHE ZITATE: Ein Vertragstext
 * ist so lang, wie er ist, und er ist von uns geschrieben, nicht vom
 * Modell. Der Deckel schützt vor Ausreißern des Modells, und dort gibt
 * es keine.
 */
export const WISSENS_ANTWORT_HOECHSTLAENGE = 800;

/** Höchstens so viele Einträge wählt die Erkennung je Frage aus */
export const WISSENS_EINTRAEGE_JE_FRAGE = 3;

/**
 * WENDUNGEN, DIE DAS RATEN SPRACHLICH VERKLEIDEN (Runde 19, Auflage
 * des Inhabers: "So ist es üblich oder in der Regel gilt kommt nicht
 * vor").
 *
 * Eine Anweisung an ein Modell ist eine Bitte, eine Prüfung ist eine
 * Regel. Enthält eine Antwort eine dieser Wendungen, wird sie
 * VERWORFEN, und der Kunde sieht die ehrliche Konstante.
 *
 * GENAU WIE BEI DEN ZAHLEN GILT: Steht die Wendung WÖRTLICH in einem
 * der benutzten Einträge, ist sie erlaubt. `config/auftraege.ts`
 * schreibt selbst "Das Grundbuchamt braucht dafür erfahrungsgemäß",
 * und dieser Satz ist von uns. Verboten ist das Hinzuerfinden, nicht
 * das Zitieren.
 *
 * KLEINGESCHRIEBEN, geprüft wird gegen den kleingeschriebenen Text.
 */
export const WISSENS_VERBOTENE_WENDUNGEN = [
  "in der regel",
  "üblicherweise",
  "meistens",
  "normalerweise",
  "in aller regel",
  "erfahrungsgemäß",
  "grundsätzlich gilt",
] as const;
