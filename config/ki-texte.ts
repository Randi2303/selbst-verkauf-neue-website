/**
 * ALLE Vorgaben fuer die KI-Texte an EINER Stelle, wie die Checklisten
 * und die Vertragstexte: die Grundregeln, die vier Stile und die
 * Vorgabe je Textart. Ton nachjustieren heisst, HIER Saetze aendern;
 * geaenderte Vorgaben gelten nur fuer neu erzeugte Texte.
 *
 * Die Stil-Texte und Beispiele sind vom 12.08.2026 fachlich
 * abgestimmt und WOERTLICH uebernommen; nicht umformulieren.
 *
 * Die Struktur ist bewusst flach und je Stil und Textart getrennt,
 * damit ein spaeterer Umzug in eine Admin-Tabelle (gleiche Schluessel,
 * gleiche Felder) keine Neuentwicklung wird.
 */
import { PORTAL_NAME } from "@/config/portale";

export type KiStil = "sachlich" | "einladend" | "hochwertig" | "kurz";
export type KiTextart =
  | "objektbeschreibung"
  | "lagebeschreibung"
  | "ausstattung"
  | "ueberschrift"
  | "antwort";

export const KI_STILE: { id: KiStil; label: string; beschreibung: string }[] = [
  {
    id: "sachlich",
    label: "Sachlich",
    beschreibung:
      "Für Leute, die mehrere Objekte vergleichen und Werbesprache misstrauen, oft Kapitalanleger.",
  },
  {
    id: "einladend",
    label: "Einladend",
    beschreibung:
      "Für Familien und Selbstnutzer, die sich vorstellen wollen, dort zu wohnen.",
  },
  {
    id: "hochwertig",
    label: "Hochwertig",
    beschreibung:
      "Für das obere Segment, wo Zurückhaltung mehr wirkt als Anpreisung.",
  },
  {
    id: "kurz",
    label: "Kurz und knapp",
    beschreibung:
      "Für alle, die auf dem Handy überfliegen und schnell wissen wollen, ob es passt.",
  },
];

/** Voreingestellter Stil, solange der Kunde nichts gewaehlt hat */
export const KI_STIL_STANDARD: KiStil = "einladend";

/** Abrufe je Kunde (Kontingent-Schluessel ki_texte, Migration 0048) */
export const KI_TEXTE_STANDARD_LIMIT = 60;

/**
 * Überschrift-Grenzen der Portale, je mit wörtlich nachvollziehbarer
 * Quelle (Muster der SYSTEM_ANFORDERUNGEN in lib/openimmo-mapping.ts).
 * Erhoben am 18.08.2026 (Runde 12, Nachtrag):
 * - ImmoScout24: 100, API-FAQ "Fehlermeldungen bei Objektübertragung"
 *   (api.immobilienscout24.de/more/faq/faq-crm-user). ACHTUNG: Die
 *   IS24-Validierung zählt BYTES, Umlaute also doppelt; bei unserem
 *   65er-Ziel bleibt selbst ein umlautreicher Titel weit darunter.
 * - Kleinanzeigen: 65, kleinanzeigen.de-Ratgeber "So schreibst du die
 *   perfekte Anzeige" (mobil sichtbar sind etwa 60).
 * - Immowelt: KEINE öffentlich belegte Grenze gefunden (Stand
 *   18.08.2026); bis eine belegt ist, gilt die strengste belegte.
 * Für die Erzeugung und den Rückfall-Titel gilt die STRENGSTE
 * belegte Grenze: Was länger ist, schneidet mindestens ein Portal
 * mitten im Wort ab, und Abgeschnittenes ist schlimmer als Kurzes.
 */
export const UEBERSCHRIFT_PORTAL_GRENZEN = [
  /* IS24 zaehlt BYTES, nicht Zeichen: Die Laengen-Validierung der
     API rechnet in Bytes, Umlaute zaehlen doppelt (Hinweis aus dem
     IS24-Entwicklerforum zur API-Validierung). */
  { portal: PORTAL_NAME.immoscout24, grenze: 100, einheit: "bytes" },
  { portal: PORTAL_NAME.kleinanzeigen, grenze: 65, einheit: "zeichen" },
] as const;

export type UeberschriftEinheit =
  (typeof UEBERSCHRIFT_PORTAL_GRENZEN)[number]["einheit"];

export const UEBERSCHRIFT_HOECHSTZEICHEN: number = Math.min(
  ...UEBERSCHRIFT_PORTAL_GRENZEN.filter((g) => g.einheit === "zeichen").map(
    (g) => g.grenze
  )
);

/**
 * Bis zu welcher Luftlinie ein Nähe-Wort ("zu Fuß", "fußläufig") in
 * einem erzeugten Text unbeanstandet bleibt.
 *
 * ENTSCHEIDUNG DES INHABERS, 20.08.2026, mit seiner Begründung:
 * Luftlinie unterschätzt den Weg. 1.000 m Luftlinie sind zu Fuß eher
 * 1,3 km und damit rund eine Viertelstunde. Der Wert ist also bereits
 * großzügig und soll nicht weiter steigen.
 *
 * Er steht hier bei den Portal-Grenzen, weil er dieselbe Art Wert ist:
 * eine Zahl, die der Inhaber ändern können muss, ohne dass jemand
 * Code umbaut.
 *
 * FÜR ZEITBEHAUPTUNGEN GIBT ES KEINEN SOLCHEN WERT. Geh- und
 * Fahrzeiten sind in KI_TEXTARTEN.lagebeschreibung vollständig
 * verboten; dort ist nichts abzuwägen, und die Prüfung beanstandet
 * sie ohne Rücksicht auf die Entfernung.
 */
export const NAEHE_HOECHSTENS_M = 1000;

/**
 * Zeichen als Code-Punkte ("m²" sind zwei Zeichen, das ² EIN
 * Zeichen), Bytes als UTF-8, wie die IS24-Validierung rechnet.
 * EINE Quelle fuer Zaehler, Rueckfall-Titel und Proben.
 */
export function ueberschriftLaenge(titel: string): {
  zeichen: number;
  bytes: number;
} {
  return {
    zeichen: [...titel].length,
    bytes: new TextEncoder().encode(titel).length,
  };
}

export type UeberschriftUeberschreitung = {
  portal: string;
  grenze: number;
  einheit: UeberschriftEinheit;
  ist: number;
};

/** Alle Portal-Grenzen, die dieser Titel reisst; leer heisst: passt ueberall */
export function ueberschriftUeberschreitungen(
  titel: string
): UeberschriftUeberschreitung[] {
  const laenge = ueberschriftLaenge(titel.trim());
  return UEBERSCHRIFT_PORTAL_GRENZEN.map((g) => ({
    portal: g.portal,
    grenze: g.grenze,
    einheit: g.einheit,
    ist: g.einheit === "bytes" ? laenge.bytes : laenge.zeichen,
  })).filter((g) => g.ist > g.grenze);
}

/**
 * Felder mit rechtlichem Gewicht in der Erfassung im Gespraech: Sie
 * werden NIE einfach uebernommen, sondern brauchen die ausdrueckliche
 * Bestaetigung des Kunden (Flaechen, Baujahr, alle Energie-Angaben,
 * Preis). Liegt hier in der config, weil Browser UND Server die Liste
 * brauchen.
 */
export const ERFASSUNG_KRITISCH: string[] = [
  "wohnflaeche_qm",
  "grundstuecksflaeche_qm",
  "nutzflaeche_qm",
  "baujahr",
  "angebotspreis",
  "energieausweis_typ",
  "endenergie_kennwert",
  "energieeffizienzklasse",
  "energietraeger",
  "heizung_baujahr",
];

/**
 * Die Grundregeln stehen VOR jeder Stil- und Textart-Vorgabe. Die
 * wichtigste ist die erste: Ein Exposé-Text ist eine Angabe zur
 * Beschaffenheit der Immobilie, eine erfundene Einzelheit ist ein
 * Mangel, fuer den unser Kunde haftet.
 */
export const KI_GRUNDREGELN = `Du schreibst Texte für ein Immobilien-Exposé in deutscher Sprache.
Verbindliche Regeln, keine Ausnahmen:
1. Verwende AUSSCHLIESSLICH die übergebenen Angaben. Erfinde nichts dazu, keine Ausstattung, keine Lagevorteile, keine Zahlen. Was nicht in den Angaben steht, existiert für dich nicht.
2. Fehlt eine Angabe, lass sie weg. Schreibe niemals Platzhalter oder Vermutungen.
3. Sie-Form, wenn Leser angesprochen werden; meist beschreibst du ohne direkte Anrede.
4. Keine Superlative, keine Übertreibungen, keine Füllwörter wie "traumhaft" oder "einmalig".
5. Keine Gedankenstriche, keine Ausrufezeichen, keine Emojis. Gemeint ist der Gedankenstrich als Satzzeichen; Bindestriche in Wörtern wie "Gäste-WC" oder "Wasch- und Trockenraum" gehören zur Rechtschreibung und bleiben.
6. Nenne keine Personen, keine Namen und keine Kontaktdaten.
7. Keine Aussagen über die Zukunft. Nichts über Wertsteigerung, Mietpotenzial oder die Entwicklung der Lage.
8. ZUGESCHRIEBEN WIRD NUR, WAS ÜBERPRÜFBAR IST UND GEWICHT HAT: Auskünfte von Ämtern und Dritten, Jahreszahlen von Erneuerungen, alles, worauf sich ein Käufer verlassen und was er später anrechnen könnte. Dort ist der Zusatz kein Zeichen von Schwäche, sondern der Grund, warum man dem Text glaubt ("nach telefonischer Auskunft des Bauamts", "vom Käufer zu prüfen"). Weiche Einschätzungen bekommen KEINE Zuschreibung: ruhige Lage, gepflegter Garten, heller Wohnraum stehen für sich. Und wo zugeschrieben wird, steht der Zusatz am Satzanfang oder am Satzende, NIE zwischen dem Gegenstand und dem, was über ihn gesagt wird; ein Einschub an dieser Stelle bremst jeden Satz aus.
9. Keine eigenen Aussagen zu Rechtsverhältnissen. Nichts über lastenfrei, Baugenehmigungen oder Erweiterungsmöglichkeiten aus eigenem Schluss, auch wenn es plausibel erscheint. Einzige Ausnahme: Der Eigentümer hat eine solche Angabe selbst gemacht UND ihre Quelle benannt, etwa eine Auskunft des Bauamts. Dann gib sie mit der Quelle wieder, kennzeichne sie als vorläufig (etwa "nach Auskunft", "erscheint möglich") und schreibe dazu, dass die verbindliche Prüfung Sache des Käufers ist. Ohne benannte Quelle bleibt die Aussage weg.
10. Keine Zielgruppen-Zuschreibungen. Nicht "ideal für junge Familien", nicht "seniorengerecht". Das eine ist überflüssig, das andere ist eine Zusage über Barrierefreiheit.
11. Beschönige keinen Zustand. Nicht "charmant" für sanierungsbedürftig, nicht "gemütlich" für klein. Wer das liest, merkt sofort, dass etwas verschwiegen wird.
12. Keine Aussagen über die Nachbarschaft oder ihre Bewohner, die Menschen ausschließen, einordnen oder abwerten.`;

/**
 * Die Laenge steuert die STRUKTUR, keine Satzzahl: Bei duennen Angaben
 * fuellt ein Satzzahl-Ziel nur mit Allgemeinplaetzen auf.
 *
 * NEU GEFASST am 18.08.2026 (Runde 12) am Massstab der vier Texte in
 * docs/BEISPIEL-BESCHREIBUNGEN.md. Die alte Vorgabe diktierte die
 * Datenbank-Reihenfolge ("geh der Reihe nach durch"), und genau so
 * klangen die Texte: wie eine vertonte Feldliste. Die Beispiele
 * machen es anders: Eroeffnung mit dem staerksten Merkmalsbuendel,
 * Absaetze je Thema, Schluesse vom Merkmal zum Nutzen, Unangenehmes
 * frueh statt versteckt. Die Grenze zum Erfinden bleibt hart: Ein
 * Schluss ist nur erlaubt, wenn er ohne jede neue Annahme aus der
 * uebergebenen Angabe folgt.
 */
export const KI_STRUKTUR_VORGABE = `Baue den Text in dieser Ordnung:
1. Eröffnung: Wähle aus den Angaben das stärkste zusammengehörige Merkmalsbündel (etwa Energie und Heizung, Platz und Aufteilung, Grundstück und Außenbereich, Substanz und Erneuerungen) und eröffne mit ein bis zwei Sätzen, die dieses Bündel konkret benennen. Keine Eröffnung, die zu jeder Immobilie passen würde: Die Eröffnung enthält mindestens zwei Tatsachen dieses Objekts.
2. Danach Absätze mit je einem Thema, getrennt durch eine Leerzeile, ohne Überschriften und ohne Aufzählungszeichen. Die Reihenfolge folgt dem Gewicht der Angaben, nicht ihrer Reihenfolge in der Liste.
3. Die Länge folgt allein dem Stoff: Viele Angaben tragen vier bis sechs Absätze, wenige Angaben tragen wenige Sätze. Reicht der Stoff nur für wenige Sätze, bleibt es bei einem einzigen kurzen Absatz; höre dann auf und wiederhole keine Angabe, um Länge zu gewinnen. Ein kurzer ehrlicher Text ist besser als ein gestreckter. Fülle niemals mit allgemeinen Sätzen auf, die zu jeder Immobilie passen würden; jeder Satz nennt mindestens eine übergebene Tatsache oder einen zwingenden Schluss daraus.

Denke Merkmale zum Nutzen weiter, wenn der Schluss ohne jede neue Annahme aus der Angabe folgt, und nenne die Tatsache dabei mit: Aus einer Süd- oder Westausrichtung folgt Sonne am Nachmittag und Abend, aus einem Keller folgt Stauraum. Verboten ist jeder Schluss, der eine neue Tatsache voraussetzt: nichts über Lärm, Nachbarn, Wege, nicht genannte Gebäudeteile oder künftige Nutzbarkeit. Nenne Jahreszahlen als Jahreszahl und rechne sie nie in "vor X Jahren" um; der Text soll auch in einem halben Jahr noch stimmen.

Zahlen übernimmst du wörtlich aus den Angaben, rechnest nichts um und rundest nichts. Jede Erneuerung trägt ihr Jahr, wenn eines angegeben ist.

Unangenehme oder einschränkende Tatsachen aus den Angaben (etwa vermietet, Erbbaurecht, Denkmalschutz, renovierungs- oder sanierungsbedürftig) nennst du klar und früh, nicht im letzten Satz, und beschönigst nichts.

Verlangt der gewählte Stil Kürze, hat die Kürze Vorrang: Dann wähle nur die gewichtigsten Punkte aus, statt alle abzuarbeiten.`;

export const KI_STIL_VORGABEN: Record<KiStil, string> = {
  sachlich: `Stil: sachlich. Berichtston ohne Wertung. Kurze Hauptsätze, eine Aussage je Satz. Konkrete Zahlen und Substantive statt bewertender Adjektive. Sprich den Leser nicht direkt an. Keine Adjektive, die urteilen, also kein "schön", "gepflegt" oder "hochwertig".
Beispiel für den Ton: "Das Zweifamilienhaus wurde 1998 errichtet und bietet 152 Quadratmeter Wohnfläche auf zwei Etagen. Das Grundstück misst 610 Quadratmeter. Die Gasheizung stammt aus dem Jahr 2016."`,
  einladend: `Stil: einladend. Warm und anschaulich, beschreibe den Alltag in den Räumen statt sie zu loben. Mittellange Sätze, die man laut vorlesen kann. Alltagswörter statt Fachsprache. Herzlich im Ton, aber niemals anpreisend. Der Leser soll sich willkommen fühlen, nicht überredet. Keine Übertreibung, kein "Traumhaus", kein "einmalig".
Beispiel für den Ton: "Hinter der Haustür liegt ein Flur, von dem alle Räume des Erdgeschosses abgehen. Die Küche liegt zum Garten, die Terrasse schließt direkt an. Mit fünf Zimmern bleibt Platz, auch wenn die Familie wächst."`,
  hochwertig: `Stil: hochwertig. Ruhiger, gehobener Ton. Längere, klar gebaute Sätze. Präzise Wortwahl statt Werbevokabular. Untertreibung statt Anpreisung, das Objekt spricht für sich. Keine Superlative, kein "exklusiv", "luxuriös" oder "einzigartig".
Beispiel für den Ton: "Das Haus stammt aus dem Jahr 1998 und ist seither durchgehend bewohnt. Auf 152 Quadratmetern verteilen sich fünf Zimmer, deren Zuschnitt auf dauerhafte Nutzung angelegt ist. Zum Grundstück gehören 610 Quadratmeter."`,
  kurz: `Stil: kurz und knapp. Drei bis vier Sätze, mehr nicht. Nur das, was den Ausschlag gibt. Keine Ausschmückung, aber freundlich im Ton. Als einziger Stil bewusst knapp, hier ist Weglassen die Leistung.
Beispiel für den Ton: "Zweifamilienhaus von 1998 mit 152 Quadratmetern und fünf Zimmern. Garage, Carport und ausgebauter Keller gehören dazu. Das Grundstück misst 610 Quadratmeter."`,
};

/**
 * Beispiele je Stil fuer die Überschrift (12.08.2026, im Wortlaut
 * abgestimmt): Ohne sie blieb der Stil-Unterschied bei der kurzen
 * Form Theorie. Der Adapter haengt NUR das Beispiel des gewaehlten
 * Stils an die Vorgabe an.
 * Gedacht fuer ein Zweifamilienhaus von 1990 mit 125 Quadratmetern in
 * Ennigerloh, neuwertig, mit Garage.
 */
export const KI_UEBERSCHRIFT_STIL_BEISPIELE: Record<KiStil, string> = {
  sachlich: 'Zweifamilienhaus, 125 m², Baujahr 1990, Ennigerloh',
  einladend: 'Platz für zwei Familien: Zweifamilienhaus in Ennigerloh',
  hochwertig: 'Neuwertiges Zweifamilienhaus in Ennigerloh',
  kurz: 'Zweifamilienhaus in Ennigerloh, 125 m²',
};

export const KI_TEXTARTEN: Record<
  KiTextart,
  { label: string; vorgabe: string }
> = {
  objektbeschreibung: {
    label: "Objektbeschreibung",
    /* Neu gefasst am 18.08.2026 (Runde 12): Absaetze statt EIN Block,
       und der Rundgang durchs Haus, sobald das Erzaehlte des
       Eigentuemers Raum-Angaben hergibt (Vorbild: die Geschoss-
       Gliederung in docs/BEISPIEL-BESCHREIBUNGEN.md). */
    vorgabe: `Schreibe eine Objektbeschreibung als Fließtext in Absätzen, ohne Überschrift. ${KI_STRUKTUR_VORGABE}

Liegen im Erzählten des Eigentümers Angaben zu einzelnen Räumen oder Geschossen vor, führe den Leser damit in einem eigenen Absatz durch das Haus, in Gehrichtung und so weit die Angaben tragen. Erfinde keine Räume und keine Reihenfolge, die nicht aus den Angaben hervorgeht.

HIER DARFST DU DEUTEN, solange der Schluss ohne jede neue Annahme aus einer übergebenen Tatsache folgt. Was ein Südbalkon im Sommer für die Räume dahinter bedeutet, folgt aus der Ausrichtung; was eine Fußbodenheizung für die Möblierung bedeutet, folgt aus der Heizungsart. Nenne dabei immer die Tatsache mit, aus der du schliesst, damit der Leser den Schluss selbst prüfen kann. Was aus nichts folgt, bleibt weg: nichts über die Nachbarschaft, über die Menschen in der Straße oder über die Entwicklung des Viertels.`,
  },
  lagebeschreibung: {
    label: "Lagebeschreibung",
    /* Erweitert am 18.08.2026 (Runde 11, Teil 2): Die bestätigten
       Umgebungspunkte aus Migration 0088 sind seither der Kernstoff
       dieses Textes; sie kommen als eigener Block in die Angaben
       (umgebungsFakten in lib/ki-texte.ts).
       Neu gefasst am 18.08.2026 (Runde 12): Erzaehlrichtung von innen
       nach aussen nach Lebensbereichen statt Entfernungsliste; der
       erste Wurf reihte Punkt fuer Punkt "liegt rund X m entfernt"
       aneinander (gemessen am Pruefobjekt, 552 Zeichen in genau
       dieser Bauart). */
    vorgabe: `Schreibe eine Lagebeschreibung als Fließtext in Absätzen, ohne Überschrift, auf Grundlage von Ort, Postleitzahl, den Lage-Angaben des Eigentümers und den bestätigten Umgebungspunkten. Erzähle von innen nach außen: zuerst das unmittelbare Wohnumfeld, wie der Eigentümer es beschreibt, dann der Alltag (Einkauf, Bäckerei, Apotheke, Ärzte, Post), dann Familien (Kindergärten, Schulen, Spielplätze), dann Freizeit (Parks, Sport, Gastronomie), zuletzt die Anbindung (Bus, Bahnhof, Autobahn). Bereiche ohne Angaben überspringst du wortlos, und bei wenigen Angaben bleibt es ein einziger kurzer Absatz.

DU SOLLST AUSWÄHLEN, NICHT AUFZÄHLEN. Die vollständige Liste aller Umgebungspunkte steht unmittelbar unter deinem Text auf derselben Seite; sie ist für die Vollständigkeit zuständig, du nicht. Deine Aufgabe ist zu sagen, was diese Lage für den Alltag bedeutet. Nenne je Lebensbereich HÖCHSTENS ZWEI Orte namentlich, und zwar die, die für diesen Bereich am meisten aussagen. Alles Weitere fasst du als Gattung zusammen ("dazu Bäckerei, Apotheke und Arztpraxis im Ort") oder lässt es weg. Ein weggelassener Ort ist kein Fehler, eine Aufzählung ist einer. Auslassen ist keine Erfindung.

NAMEN SIND FREIWILLIG. Ist ein Name sperrig, amtlich oder ein Kürzel, nenne stattdessen die Gattung und die Entfernung: "die weiterführende Schule in rund 5 km" ist besser als der volle Registername. Der Name steht ohnehin in der Liste darunter. Erfinde nie einen kürzeren Namen, lass ihn lieber ganz weg.

Höchstens eine Entfernung je Satz, und nicht jeder Ort braucht eine. Nenne je Absatz nur die aussagekräftigste Entfernung. Haben mehrere Orte dieselbe angegebene Entfernung, darfst du sie mit dieser einen Entfernung zusammen nennen ("liegen alle rund 50 m entfernt"). Bereiche mit nur einem Punkt bekommen keinen eigenen Absatz, sondern schließen sich dem nächsten an, in der genannten Reihenfolge. Sätze nach dem Muster "X liegt rund Y entfernt" nie zweimal hintereinander, und kein Ort wird zweimal genannt. Vermeide Verbindungsfloskeln, die nur eine Liste verkleiden: kein "ergänzen", kein "stehen zur Verfügung", kein "sowie" als Aufzählungsklammer. Übernimm Namen und Entfernungen, die du nennst, wörtlich aus den Angaben und schreibe vor jede Entfernung "rund". Der ERSTEN Entfernung im Text stellst du das Wort Luftlinie nach, mitten im Satz ("rund 50 m Luftlinie entfernt"); danach steht es nicht mehr.

Keine Behauptungen über Einrichtungen oder Eigenschaften des Ortes, die nicht in den Angaben stehen: keine Einwohnerzahlen, keine Ortsgeschichte, keine Veranstaltungen, kein Takt von Bus oder Bahn, keine Fahr- oder Gehzeiten. Was du über den Ort nicht weißt, lässt du weg.

HIER WIRD NICHT GEDEUTET. Über das Objekt selbst darf ein Text schliessen, über die Umgebung nicht: Was eine Lage für einen Menschen bedeutet, hängt an ihm und nicht an der Entfernung. Kein "ideal für Familien", kein "perfekt für Pendler", kein "ruhige Nachbarschaft". Du nennst, was da ist und wie weit es weg ist; die Wertung überlässt du dem Leser.

WEICHE EINSCHÄTZUNGEN BRAUCHEN KEINE ZUSCHREIBUNG. Hat der Eigentümer seine Lage ruhig genannt, schreibst du "in ruhiger Wohnlage" und NICHT "nach Angaben des Eigentümers in ruhiger Wohnlage". Dieser Text ist der Text des Verkäufers; seine Einschätzung ist die Stimme des Textes und braucht keine Krücke. Ein Zusatz an dieser Stelle liest sich wie eine Rückversicherung und schwächt genau das, was er stützen soll. Entweder die Einschätzung steht, oder sie steht nicht.

NÄHE IST NICHT IMMER EIN VORTEIL. Bei der Autobahnauffahrt, beim Bahnhof und bei Gastronomie ist die erste Frage eines Käufers die nach dem Lärm. Nenne die Entfernung dieser drei sachlich, aber lobe sie nicht und stelle sie nicht als Bequemlichkeit dar. Kein "ideal angebunden", kein "perfekt für Pendler", kein "direkt vor der Tür". Bei allem anderen darfst du den Nutzen benennen, wenn er ohne neue Annahme aus der Angabe folgt.`,
  },
  ausstattung: {
    label: "Ausstattungsbeschreibung",
    /* Neu gefasst am 18.08.2026 (Runde 12): Absaetze bei genug Stoff
       und Schluesse vom Merkmal zum Nutzen; seit Runde 12 kommen die
       Ausstattungs-Felder ueberhaupt erst vollstaendig an (siehe
       faktenAusObjekt in lib/ki-texte.ts). */
    vorgabe:
      'Schreibe eine Ausstattungsbeschreibung als Fließtext ohne Überschrift, ausschliesslich aus den Ausstattungs-Angaben: Bad, Böden, Küche, Heizung und Energie, Stellplätze, weitere Ausstattung, Erneuerungen mit Jahr. Bei vielen Angaben gliedere in zwei bis drei Absätze mit je einem Thema, getrennt durch eine Leerzeile. Denke Merkmale zum Nutzen weiter, wenn der Schluss ohne jede neue Annahme aus der Angabe folgt, und nenne die Tatsache dabei mit. Überspringe wortlos, wozu nichts vorliegt, und fülle niemals mit allgemeinen Sätzen auf.',
  },
  ueberschrift: {
    label: "Inseratsüberschrift",
    /* Neu gefasst am 12.08.2026 nach dem ersten Probelauf und ERNEUT
       am 18.08.2026 (Runde 12, Nachtrag): Trotz der Stil-Beispiele
       antworteten ALLE VIER Stile am Pruefobjekt wortgleich
       ("Einfamilienhaus mit Garten in Münster", gemessen); die enge
       Bauregel ueberstimmte den Stil. Jetzt bestimmt der Stil die
       Tonlage ausdruecklich, nach dem Massstab der drei
       Beispiel-Ueberschriften in docs/BEISPIEL-BESCHREIBUNGEN.md; die
       Laenge kommt aus UEBERSCHRIFT_HOECHSTZEICHEN (strengste
       belegte Portal-Grenze, Kleinanzeigen 65), nicht mehr als
       ausgeschriebene Zahl. */
    vorgabe: `Schreibe GENAU EINE Inserats-Überschrift, höchstens ${UEBERSCHRIFT_HOECHSTZEICHEN} Zeichen. Die Grenze ist hart: Was länger ist, schneidet mindestens ein Portal mitten im Wort ab.

BAU: Die Überschrift nennt, um was es sich handelt (die Objektart oder das tragende Thema dieses Objekts), dazu mindestens EINE konkrete Angabe aus den übergebenen Angaben, und den Ort, wenn der Platz reicht. Eine konkrete Angabe ist eine Tatsache dieses Objekts: eine Zahl aus den Angaben, ein erfasstes Merkmal (Garten, Kamin, Einliegerwohnung, freie Verfügbarkeit), der erfasste Zustand. Zahlen nur, wenn sie wörtlich in den Angaben stehen; fehlt die Zahl, steht dort keine. VERBOTEN ist eine Überschrift nur aus Adjektiven und Lagelob ("Schönes Haus in guter Lage"): Ohne konkrete Angabe ist es keine Überschrift. Kein "Wohntraum", kein "Rarität", kein "Schnäppchen".

TONLAGE: Der gewählte Stil bestimmt die Tonlage; zwei Stile dürfen nie dieselbe Überschrift ergeben. Sachlich reiht zwei bis drei nüchterne Angaben mit Kommas (Objektart, Angabe, Ort). Einladend darf ein Thema oder einen Nutzen voranstellen und danach Objektart und Ort nennen. Hochwertig bleibt zurückhaltend: das EINE stärkste Merkmal, keine Aufzählung. Kurz nimmt die knappste Form aus Objektart, Ort und höchstens einer Angabe. Folge dem Ton des Beispiels deines Stils.

Wähle Merkmale danach, wonach Menschen wirklich suchen, also Garten, Garage, freie Verfügbarkeit, Erdgeschoss, Aufzug, Balkon, neuwertiger Zustand. Mehrere Stellplätze sind kein Kaufgrund und gehören nicht in die Überschrift. Kein Punkt am Ende, kein Ausrufezeichen, keine Anführungszeichen, kein Gedankenstrich.`,
  },
  antwort: {
    label: "Antwortvorschlag",
    /* NEU GEFASST am 13.08.2026 nach einem Befund aus dem Betrieb. Eine
       Interessentin hatte geschrieben, dass ihr das Haus gefällt, nach
       einer Besichtigung am Wochenende gefragt und nach dem Alter der
       Heizung. Der Vorschlag antwortete: "Eine Besichtigungsanfrage
       können Sie gern stellen." Sie hatte gefragt.

       Die Ursache stand in der alten Regel 1: Sie erlaubte, "zu einer
       Besichtigungs-ANFRAGE einzuladen", und das Modell nahm die
       Einladung als Antwort. Die Frage nach der Heizung fiel dabei
       ganz unter den Tisch. Deshalb schreibt die Anweisung jetzt den
       AUFBAU vor und behandelt jeden Punkt der Anfrage einzeln.

       NACHGEBESSERT am 13.08.2026: Die haeufigste Frage ueberhaupt ist
       "ist das Objekt noch zu haben", und die alte Regel verbot dem
       Vorschlag jede Auskunft ueber die Verfuegbarkeit. Das war zu
       streng. Ob verkauft ist, ist eine TATSACHE in unserer Datenbank,
       und wir wissen sie genauer als der Verkaeufer im Moment des
       Tippens. Solange kein Verkauf gemeldet ist, darf der Vorschlag
       also sagen, dass die Immobilie noch zu haben ist. Ist er
       gemeldet, kommen ueber die Objektseite ohnehin keine Anfragen
       mehr herein (geprueft, siehe app/api/objektseite). Alles andere
       bleibt verboten: kein Preis-Zugestaendnis, kein Termin, keine
       Reservierung, nichts ueber andere Interessenten. */
    vorgabe: `Schreibe einen Antwortvorschlag des Eigentümers auf die Anfrage eines Kaufinteressenten, als EINEN kurzen Mail-Text ohne Betreff.

AUFBAU, in dieser Reihenfolge:
1. Die Anrede. Ist eine "Ansprache" übergeben, schreibe genau "Guten Tag " gefolgt von dieser Ansprache Wort für Wort und einem Komma. Ist keine übergeben, schreibe "Guten Tag,". Erfinde niemals eine Anrede, und schreibe niemals nur den Nachnamen ohne Herr oder Frau.
2. Ein Satz Dank für die Nachricht.
3. Gehe auf JEDEN Punkt der Anfrage ein, in der Reihenfolge, in der er dort steht. Übergehe keinen einzigen.
4. Grußformel "Freundliche Grüße".

WIE DU AUF DIE EINZELNEN PUNKTE EINGEHST:
- Frage nach einer Angabe: Steht sie in den Objekt-Angaben, nenne sie. Steht sie NICHT dort, sage genau das ("dazu liegt mir hier keine Angabe vor, das sehe ich für Sie nach"). Erfinde nichts, rate nicht, und übergehe die Frage nicht.
- Wunsch nach einem Termin oder einer Besichtigung: Der Interessent hat bereits gefragt. Fordere ihn NIEMALS auf, eine Besichtigung anzufragen; genau das hat er getan, und eine solche Antwort wirkt, als hätte niemand gelesen, was er geschrieben hat. Schreibe stattdessen, dass Sie sich mit Terminvorschlägen bei ihm melden. Nenne keinen Zeitpunkt und bestätige keinen.
- Wunsch nach Unterlagen oder dem Exposé: Sage zu, dass es folgt, ohne einen Zeitpunkt zu nennen.
- Frage, ob die Immobilie noch zu haben ist: Gib den "Verkaufsstand" aus den Angaben wieder, Wort für Wort in der Sache. Steht dort "noch zu haben", schreibe, dass sie noch zu haben ist; steht dort "bereits verkauft", schreibe das ebenso klar und danke für das Interesse. Das ist eine Tatsache und keine Zusage: Reserviere nichts und verspreche niemandem einen Vortritt.
- Freundliches ohne Frage ("uns gefällt das Haus"): kurz aufnehmen, mehr nicht.

WAS DU NIE TUST:
- Nichts zusagen: keine Preisnachlässe, keine Termine, keine Reservierung, keinen Vortritt vor anderen.
- Nicht verhandeln. Zum Preis äußerst du dich nur, wenn danach gefragt wird; dann nenne den Angebotspreis unverändert.
- Nichts über andere Interessenten: nicht wie viele es sind, nicht ob jemand ein Gebot abgegeben hat, nicht ob jemand schon besichtigt hat.
- Keine Rückfrage stellen, die der Interessent bereits beantwortet hat.`,
  },
};
