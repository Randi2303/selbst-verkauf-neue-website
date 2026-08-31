import type { UnterlagenTyp } from "@/lib/unterlagen";
import { SERVICES, type ServiceId } from "@/site.config";

/**
 * WER ERBRINGT WELCHE LEISTUNG: die Anwendung oder ein Mensch?
 *
 * ---------------------------------------------------------------------
 * WARUM DIESE DATEI UMGEBAUT WURDE (16.08.2026)
 * ---------------------------------------------------------------------
 * Bis heute stand hier eine Liste `HAND_LEISTUNGEN` mit fünf Einträgen,
 * NEBEN dem Katalog in site.config.ts. Genau das ist die Bauart, die
 * auseinanderläuft, und sie ist auseinandergelaufen: Elf verkaufte
 * Leistungen brauchen einen Menschen und standen nicht darin. Wer einen
 * Grundbuchauszug kaufte, wartete auf ein Amt, das nie gefragt wurde.
 *
 * LÄSST SICH DAS ABLEITEN? Aus den vorhandenen Katalogfeldern nicht.
 * Preis, Phase, Zählbarkeit und Varianten sagen nichts darüber, wer die
 * Arbeit macht: 249 Euro Exposé erzeugt die Anwendung, 49 Euro
 * Grundbuchauszug holt ein Mensch beim Amt. Es gibt kein Feld, aus dem
 * das folgt, und ein erfundenes wäre geraten.
 *
 * WAS STATTDESSEN GILT: Die Liste ist an den Katalog GEBUNDEN. `ERBRINGUNG`
 * ist ein `Record<ServiceId, …>` über ALLE Leistungen. Eine neue Leistung
 * in site.config.ts lässt den Bau scheitern, bis hier eine Zeile steht.
 * Vergessen ist damit keine Möglichkeit mehr, sondern ein Fehler beim
 * Übersetzen. `HAND_LEISTUNGEN` gibt es weiter, es wird jetzt aber
 * ABGELEITET und nicht gepflegt.
 *
 * JEDE Zeile trägt einen Grund, auch die mit `system`. Ein Eintrag ohne
 * Begründung ist eine Falle für den, der nach uns kommt: Er sieht nicht,
 * ob jemand nachgedacht hat oder ob die Zeile nur abgeschrieben wurde.
 *
 * ---------------------------------------------------------------------
 * DIE DREI ARTEN
 * ---------------------------------------------------------------------
 *   system    Die Anwendung erbringt es. Kein Auftrag, kein Mensch.
 *   hand      Ein Mensch erbringt es. Der Kauf erzeugt einen Auftrag.
 *   buendel   Mehrere Leistungen in einer. Der Kauf erzeugt je einen
 *             Auftrag für die enthaltenen, und WELCHE das sind, steht
 *             nicht hier, sondern in `covers` im Katalog.
 */

export type AuftragErgebnisArt = "link" | "dateien" | "bericht" | "zuweisung";

/** Was ein Mensch für diese Leistung liefert */
export type HandLeistung = {
  /** Leistungs-ID aus site.config.ts */
  leistungId: ServiceId;
  ergebnisArt: AuftragErgebnisArt;
  /**
   * NUR bei ergebnisArt "bericht": Erscheint der Bericht ZUSAETZLICH
   * auf der Termin-Seite?
   *
   * WARUM ES DIESE FRAGE GIBT (31.08.2026): Runde 35 hat die Berichte
   * auf die Termin-Seite geholt und die Liste aus `ergebnisArt ===
   * "bericht"` abgeleitet. Die Ableitung war zu grob, denn "bericht"
   * traegt zwei Bedeutungen: ein Bericht UEBER EINEN TERMIN
   * (Besichtigung, Notartermin) und ein Bericht ueber erledigte Arbeit
   * (Social-Media-Kampagne). Der Kampagnen-Bericht stand damit
   * zwischen den Terminen, wo er nicht hingehoert; beim Kunden lesbar
   * ist jeder Bericht ohnehin unter Leistungen an der bestellten
   * Arbeit (bausteine.tsx zeigt `ergebnis_text` an jedem fertigen
   * Auftrag).
   *
   * PFLICHTANTWORT fuer jede Bericht-Leistung, wie bei ergebnisAblage:
   * Der Uebersetzer erzwingt das Feld nicht (es bleibt optional, weil
   * es nur Bericht-Leistungen betrifft), deshalb bricht
   * scripts/ergebnis-ablage-pruefen.mts den Bau, wenn eine
   * Bericht-Leistung schweigt oder eine andere Art das Feld setzt.
   * Ein fehlender Eintrag waere sonst ein stiller Ausfall: Der Bericht
   * bliebe dann nur unter Leistungen sichtbar, und niemand merkte es.
   */
  berichtBeiTerminen?: boolean;
  /** Kurze Arbeitsanweisung fuer das Team, sichtbar im Admin */
  teamHinweis: string;
  /** Was der Kunde als Ergebnis erwartet, sichtbar im Konto */
  ergebnisText: string;
  /**
   * Wie lange es üblicherweise dauert, in Sie-Form und ohne Zusage.
   * Steht beim Kunden am offenen Auftrag. Pflicht bei allem, was bei
   * einem Amt liegt: Dort wartet er sonst auf etwas, das er nicht
   * einordnen kann, und ruft nach drei Tagen an.
   */
  dauerHinweis?: string;
  /**
   * WIRD DAS ERGEBNIS EINE UNTERLAGE, und wenn ja, welche?
   *
   * PFLICHTFELD, und das ist die Änderung vom 28.08.2026. Bis dahin
   * hieß es `unterlagenTyp?` und war optional. Eine neue Hand-Leistung
   * ohne diese Zeile wurde still nicht übernommen: kein Fehler, keine
   * Meldung, nur eine bezahlte Datei, die im Unterlagen-Bereich nie
   * ankommt. Genau dieselbe Bauart hat die Foto-Übernahme schon einmal
   * für zehn Tage abgeschaltet (siehe bei `fotografie`).
   *
   * Jetzt gilt dieselbe Ordnung wie für `ERBRINGUNG` selbst: Die Frage
   * MUSS beantwortet werden. "Keine" ist eine gültige Antwort, aber nur
   * mit Begründung. Wer eine Leistung hinzufügt und schweigt, bekommt
   * einen Übersetzungsfehler statt eines stillen Ausfalls.
   *
   * `scripts/ergebnis-ablage-pruefen.mts` hält das zusätzlich gegen
   * den Katalog, damit auch eine Begründung wie "" auffällt.
   */
  ergebnisAblage:
    | { art: "unterlage"; typ: UnterlagenTyp }
    | { art: "keine"; grund: string };
  /**
   * DIESE LEISTUNG BRAUCHT EINE FAHRT ZUM OBJEKT, und der Satz sagt
   * dem Verkäufer, was dabei gemacht wird.
   *
   * ES IST DIE EINE QUELLE für den Vor-Ort-Termin. Was an einem Termin
   * geschieht, steht nirgends gespeichert; es wird aus den offenen
   * Aufträgen zu den Leistungen mit diesem Merkmal gerechnet
   * (lib/vor-ort.ts). Wer beides bucht, bekommt EINEN Termin mit zwei
   * Zeilen, wer später nachbucht, sieht die Zeile beim nächsten
   * Aufschlagen dabeistehen. Kein Abgleich, keine zweite Wahrheit.
   *
   * ABSICHTLICH NICHT GESETZT sind Energieausweis (nur der
   * Bedarfsausweis braucht die Aufnahme vor Ort), Wohnflächenberechnung
   * (nur mit Bemaßung), Verkehrswertgutachten (Ortstermin des
   * Sachverständigen, nicht unserer) und der Besichtigungs-Service
   * (der hat seine eigene Termin-Art, weil ein Interessent dabei ist).
   * Bei den ersten dreien hängt es an der gebuchten Variante; ob sie
   * mit auf diesen Termin sollen, entscheidet der Auftraggeber und
   * nicht dieses Verzeichnis.
   */
  vorOrt?: string;
  /**
   * Das Ergebnis ist ein Verweis, der an das OBJEKT gehört, nicht an
   * den Auftrag: Von dort lesen ihn Objektseite, Exposé und
   * Portal-Export.
   *
   * BIS RUNDE 20 STAND DAS ALS `if (leistung_id === "rundgang")` im
   * Kode (lib/auftraege.ts). Genau diese Bauart hat schon einmal eine
   * tote Hälfte hinterlassen: Als die Foto-Übernahme vom Sonderfall in
   * den Katalog wanderte, blieb die Katalog-Zeile leer, und die
   * bezahlten Fotos landeten seit dem 16.08.2026 nirgends. Was am
   * Objekt landet, gehört deshalb hierher.
   *
   * `pflicht` sagt, ob die Fertig-Meldung ohne diesen Verweis
   * abgelehnt wird. Beim Rundgang ja, denn er IST das Ergebnis. Beim
   * Video nein: Ob es eines gibt, hängt am Wetter und am Wunsch des
   * Kunden, und ein Riegel dort hielte fertige Fotos zurück.
   */
  objektLink?: {
    /** Spalte in `objekte`, siehe config/schreibrechte.ts */
    feld: "rundgang_link" | "film_link";
    /** Beschriftung des Feldes im internen Bereich */
    label: string;
    /** Was der Kunde nach der Fertig-Meldung anklickt */
    kundenLabel: string;
    pflicht: boolean;
  };
};

type Erbringung =
  | { art: "system"; grund: string }
  | { art: "buendel"; grund: string }
  | ({ art: "hand" } & Omit<HandLeistung, "leistungId">);

/**
 * WIE LANGE ES DAUERT, an einer Stelle.
 *
 * TODO Dauer: VORSCHLAGSWERTE vom 16.08.2026, Freigabe des Auftraggebers
 * steht aus. Sie stammen aus den üblichen Bearbeitungszeiten und
 * schwanken je nach Amt und Bundesland erheblich; die Baulastenauskunft
 * gibt es in Bayern und Brandenburg in dieser Form gar nicht. Jeder Satz
 * nennt deshalb eine Spanne und verspricht nichts.
 */
const AMT_DAUER = {
  grundbuch:
    "Das Grundbuchamt braucht dafür erfahrungsgemäß ein bis zwei Wochen. Wir fragen an, sobald der Auftrag in Arbeit geht, und melden uns, wenn der Auszug da ist.",
  kataster:
    "Das Katasteramt braucht dafür erfahrungsgemäß ein bis zwei Wochen. Sie müssen nichts tun, wir melden uns, sobald die Karte vorliegt.",
  baulasten:
    "Die Bauaufsichtsbehörde braucht dafür erfahrungsgemäß zwei bis vier Wochen, je nach Landkreis auch länger. Wir bleiben dran und melden uns, sobald die Auskunft da ist.",
  teilung:
    "Das Grundbuchamt braucht dafür erfahrungsgemäß ein bis drei Wochen. Wir melden uns, sobald die beglaubigte Abschrift vorliegt.",
} as const;

/**
 * WER ERBRINGT WAS. Eine Zeile je Leistung, ohne Ausnahme.
 *
 * Die Reihenfolge folgt dem Katalog (Aufbereitung, Vermarktung,
 * Verkauf), damit sich beide Dateien nebeneinander lesen lassen.
 */
export const ERBRINGUNG: Record<ServiceId, Erbringung> = {
  /* ---------------------------------------------------------------- */
  /* Phase 1: Aufbereitung                                             */
  /* ---------------------------------------------------------------- */
  "unterlagen-komplett": {
    art: "buendel",
    grund:
      "Der Komplett-Service beschafft mehrere Unterlagen. Er wird als je EIN Auftrag je Unterlage erbracht, damit der Kunde sieht, was schon da ist und was noch fehlt; genau das verspricht sein Verkaufstext. Welche Unterlagen dazugehören, steht in `covers` im Katalog und nicht hier, sonst gäbe es wieder zwei Listen.",
  },
  grundbuchauszug: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Aktuellen Auszug beim zuständigen Grundbuchamt anfordern (Eigentümer, Lasten und Beschränkungen). Die Datei hier ablegen; sie erscheint danach automatisch im Unterlagen-Bereich des Kunden.",
    ergebnisText: "Ihr aktueller Grundbuchauszug",
    dauerHinweis: AMT_DAUER.grundbuch,
    ergebnisAblage: { art: "unterlage", typ: "grundbuchauszug" },
  },
  flurkarte: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Amtlichen Kartenauszug beim Katasteramt anfordern (Grundstücksgrenzen und Flurstücksnummer). Die Datei hier ablegen; sie erscheint danach automatisch im Unterlagen-Bereich des Kunden.",
    ergebnisText: "Ihre amtliche Flurkarte",
    dauerHinweis: AMT_DAUER.kataster,
    ergebnisAblage: { art: "unterlage", typ: "flurkarte" },
  },
  baulastenauskunft: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Auskunft aus dem Baulastenverzeichnis bei der Bauaufsichtsbehörde anfordern. In Bayern und Brandenburg gibt es kein Baulastenverzeichnis; dort stattdessen die Grunddienstbarkeiten aus Abteilung II des Grundbuchs zusammenstellen und das im Ergebnis erklären.",
    ergebnisText: "Ihre Baulastenauskunft",
    dauerHinweis: AMT_DAUER.baulasten,
    ergebnisAblage: { art: "unterlage", typ: "baulastenauskunft" },
  },
  teilungserklaerung: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Beglaubigte Abschrift der Teilungserklärung samt Aufteilungsplan beim Grundbuchamt anfordern. Prüfen, ob Nachträge bestehen, und diese mitbestellen.",
    ergebnisText: "Ihre Teilungserklärung",
    dauerHinweis: AMT_DAUER.teilung,
    ergebnisAblage: { art: "unterlage", typ: "teilungserklaerung" },
  },
  grundrisse: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Vorlagen des Kunden sichten (alte Pläne, Skizzen, Fotos), fehlende Maße erfragen und je Geschoss einen sauberen Grundriss zeichnen lassen. Menge der Buchung beachten.",
    ergebnisText: "Ihre digitalen Grundrisse",
    dauerHinweis:
      "Das Zeichnen dauert üblicherweise drei bis fünf Werktage, gerechnet ab dem Tag, an dem uns Ihre Vorlagen vollständig vorliegen.",
    ergebnisAblage: { art: "unterlage", typ: "grundrisse" },
  },
  energieausweis: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Variante der Buchung beachten. Bei 'Liegt bereits vor, nur prüfen' den vorhandenen Ausweis auf Gültigkeit, Typ und Pflichtangaben prüfen und das Ergebnis kurz vermerken. Sonst den passenden Ausweis über den Aussteller beauftragen; der Bedarfsausweis vor Ort braucht einen Termin beim Kunden.",
    ergebnisText: "Ihr Energieausweis",
    dauerHinweis:
      "Ein Verbrauchsausweis liegt meist in wenigen Werktagen vor, ein Bedarfsausweis dauert länger; für die Aufnahme vor Ort stimmen wir vorher einen Termin mit Ihnen ab.",
    ergebnisAblage: { art: "unterlage", typ: "energieausweis" },
  },
  wohnflaechenberechnung: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Variante der Buchung beachten (nach WoFlV, mit Bemaßung, mit Nutzfläche). Für die Bemaßung ist ein Aufmaß vor Ort nötig; den Termin über die Termin-Anfrage abstimmen.",
    ergebnisText: "Ihre Wohnflächenberechnung",
    dauerHinweis:
      "Nach dem Aufmaß dauert die Berechnung üblicherweise fünf bis zehn Werktage. Ist ein Termin vor Ort nötig, stimmen wir ihn vorher mit Ihnen ab.",
    ergebnisAblage: { art: "unterlage", typ: "wohnflaechenberechnung" },
  },
  verkehrswertgutachten: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Zertifizierten Sachverständigen beauftragen, Ortstermin abstimmen und die vorhandenen Unterlagen des Kunden weiterreichen. Das fertige Gutachten hier ablegen; es erscheint danach im Unterlagen-Bereich des Kunden.",
    ergebnisText: "Ihr Verkehrswertgutachten",
    dauerHinweis:
      "Ein vollständiges Gutachten braucht üblicherweise drei bis sechs Wochen, davon der größte Teil nach dem Ortstermin. Wir stimmen den Termin vorher mit Ihnen ab.",
    /* Eigene Kategorie seit Migration 0116 (29.08.2026); bis dahin lag
       es im Sammel-Topf "sonstiges", und der Kunde sah dort nicht, was
       er gekauft hat. */
    ergebnisAblage: { art: "unterlage", typ: "verkehrswertgutachten" },
  },
  renditeuebersicht: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Mietaufstellung, Betriebskosten und Rücklagen beim Kunden erfragen, Rendite und Kennzahlen aufbereiten und die Übersicht hier ablegen. Bei unvollständiger Mietaufstellung zuerst nachfragen, statt zu schätzen.",
    ergebnisText: "Ihre Renditeübersicht",
    dauerHinweis:
      "Die Aufbereitung dauert üblicherweise fünf bis zehn Werktage, gerechnet ab dem Tag, an dem uns Ihre Mietaufstellung vollständig vorliegt.",
    /* Eigene Kategorie seit Migration 0116, siehe Verkehrswertgutachten. */
    ergebnisAblage: { art: "unterlage", typ: "renditeuebersicht" },
  },

  /* ---------------------------------------------------------------- */
  /* Phase 2: Vermarktung                                              */
  /* ---------------------------------------------------------------- */
  "web-expose": {
    art: "system",
    grund:
      "Die Anwendung erzeugt das PDF und die Objektseite aus den Angaben des Kunden (lib/expose.ts). Niemand gestaltet ein Exposé von Hand.",
  },
  fotografie: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Termin vor Ort ueber die Termin-Anfrage abstimmen, danach die fertigen Fotos und Drohnenaufnahmen hier ablegen; sie erscheinen mit der Fertig-Meldung im Foto-Bereich des Kunden. Das Video gehoert NICHT als Datei auf die Objektseite: Es kommt zum Anbieter (nicht gelistet hochladen) und der Verweis in das Feld Videolink. Die Master-Datei zusaetzlich hier ablegen, bis 50 MB, damit der Kunde sie behaelt.",
    ergebnisText: "Ihre fertigen Aufnahmen",
    dauerHinweis:
      "Nach dem Termin vor Ort liegen die bearbeiteten Aufnahmen üblicherweise in fünf bis sieben Werktagen bei Ihnen. Den Termin selbst stimmen wir vorher mit Ihnen ab.",
    /* DIE ZEILE, DIE AM 16.08.2026 VERLORENGING. Bis dahin stand die
       Foto-Uebernahme fest verdrahtet in lib/auftraege.ts; beim Umzug
       in den Katalog blieb dieses Feld leer, und seitdem lagen die
       bezahlten Fotos nur am Auftrag: nicht in der Galerie, nicht im
       Exposé, nicht im Portal-Export, ohne Foto-KI. Der teamHinweis
       versprach die ganze Zeit das Gegenteil. */
    ergebnisAblage: { art: "unterlage", typ: "fotos" },
    vorOrt:
      "Fotos von innen und aussen, Drohnenaufnahmen von Grundstück und Lage, dazu das kurze Video.",
    objektLink: {
      feld: "film_link",
      label: "Videolink (nicht gelistet beim Video-Anbieter)",
      kundenLabel: "Video ansehen",
      /* KEIN RIEGEL: Ob ein Video entsteht, haengt am Wetter und am
         Wunsch des Kunden. Ein Pflichtfeld hielte hier fertige Fotos
         zurueck, und das waere schlimmer als ein fehlender Verweis. */
      pflicht: false,
    },
  },
  rundgang: {
    art: "hand",
    ergebnisArt: "link",
    teamHinweis:
      "360-Grad-Aufnahme beim Objekt erstellen lassen (auf demselben Termin vor Ort wie die Fotografie, wenn beides gebucht ist), Rundgang beim Anbieter anlegen und den oeffentlichen Link hinterlegen. Der Link erscheint danach automatisch auf der Objektseite, im Exposé und im Portal-Export.",
    ergebnisText: "Der Link zu Ihrem 360-Grad-Rundgang",
    dauerHinweis:
      "Nach der Aufnahme vor Ort ist Ihr Rundgang üblicherweise in fünf bis sieben Werktagen online. Den Aufnahmetermin stimmen wir vorher mit Ihnen ab.",
    ergebnisAblage: {
      art: "keine",
      grund:
        "Das Ergebnis ist ein Link beim Rundgang-Anbieter, keine Datei. Er gehört an das OBJEKT und steht deshalb unter objektLink; von dort lesen ihn Objektseite, Exposé und Portal-Export.",
    },
    vorOrt: "Die 360-Grad-Aufnahme aller Räume für Ihren Rundgang.",
    objektLink: {
      feld: "rundgang_link",
      label: "Ergebnis-Link zum Rundgang",
      kundenLabel: "Rundgang öffnen",
      /* PFLICHT, denn der Link IST das Ergebnis dieser Leistung. Die
         Fertig-Meldung lehnt ohne ihn ohnehin ab (ergebnis_art link). */
      pflicht: true,
    },
  },
  homestaging: {
    art: "hand",
    ergebnisArt: "dateien",
    teamHinweis:
      "Zu bearbeitende Raeume mit dem Kunden klaeren, virtuelles Staging beauftragen und die fertigen Bilder hier abliegen. Gestagte Bilder muessen als virtuell moebliert gekennzeichnet sein.",
    ergebnisText: "Ihre virtuell eingerichteten Bilder",
    dauerHinweis:
      "Sobald wir mit Ihnen geklärt haben, welche Räume eingerichtet werden, dauert es üblicherweise drei bis fünf Werktage.",
    /* Dieselbe verlorene Zeile wie bei der Fotografie, siehe dort. */
    ergebnisAblage: { art: "unterlage", typ: "fotos" },
  },
  "foto-aufbereitung": {
    art: "system",
    grund:
      "Die KI verbessert die Bilder, in Sekunden. Der Kauf hebt das Kontingent (lib/freischaltung.ts), den Rest löst der Kunde selbst aus.",
  },
  "social-media": {
    art: "hand",
    ergebnisArt: "bericht",
    /* NICHT bei den Terminen: Der Kampagnen-Bericht handelt von
       Reichweite und Anfragen, nicht von einem Termin. Er steht beim
       Kunden unter Leistungen an der bestellten Arbeit. */
    berichtBeiTerminen: false,
    teamHinweis:
      "Kampagne aus den Objektdaten und Fotos aufsetzen, nach Abschluss den kurzen Ergebnis-Bericht (Laufzeit, Reichweite, Anfragen) hier eintragen.",
    ergebnisText: "Der Bericht zu Ihrer Kampagne",
    dauerHinweis:
      "Die Kampagne startet üblicherweise innerhalb von fünf Werktagen. Den Bericht mit Laufzeit, Reichweite und Anfragen bekommen Sie nach ihrem Ende.",
    ergebnisAblage: {
      art: "keine",
      grund:
        "Reichweite und Anfragen einer Kampagne sind ein Bericht über unsere Arbeit, kein Dokument zur Immobilie. Kein Käufer und keine Bank will ihn sehen, und im Unterlagen-Bereich stünde er zwischen Grundbuchauszug und Energieausweis, wo er nicht hingehört.",
    },
  },
  "portal-schaltung": {
    art: "system",
    grund:
      "Der Export an die Portale läuft über OpenImmo, ausgelöst vom Online-Gang des Kunden. Was daran noch fehlt, sind die Verträge mit den Portalen und keine Handarbeit.",
  },
  "laufzeit-verlaengerung": {
    art: "system",
    grund:
      "Die bezahlten Monate schreibt die Freischaltung dem Objekt gut (schaltung_verlaengern, Migration 0077).",
  },

  /* ---------------------------------------------------------------- */
  /* Phase 3: Verkauf                                                  */
  /* ---------------------------------------------------------------- */
  "ki-anfragenmanagement": {
    art: "system",
    grund:
      "Die Antwortvorschläge kommen aus der KI und erscheinen mit der Buchung an jeder Anfrage (app/konto/anfragen).",
  },
  bonitaetscheck: {
    art: "system",
    grund:
      "Die Buchung schaltet den Anforderungs-Weg frei (hatBonitaetscheck); den Nachweis lädt der Interessent selbst hoch. Die Prüfung des hochgeladenen Nachweises macht der Verkäufer, nicht wir.",
  },
  bieterverfahren: {
    art: "system",
    grund:
      "Das Verfahren führt die Anwendung: Frist, Gebote, Nachweise und Rangfolge. Der Verkäufer entscheidet, wir tun nichts.",
  },
  "besichtigungs-service": {
    art: "hand",
    ergebnisArt: "bericht",
    /* BEI DEN TERMINEN: Wer da war und wie die Rueckmeldung ausfiel,
       gehoert zur Besichtigung; der Kunde sucht es dort, wo seine
       Termine stehen (Anlass der Runde 35). */
    berichtBeiTerminen: true,
    teamHinweis:
      "Makler einteilen, Termin über die Termin-Anfrage (art besichtigung) mit Verkäufer und Interessenten abstimmen, Besichtigung durchführen. Danach hier kurz festhalten, wer da war und wie die Rückmeldung ausfiel. Menge der Buchung beachten, sie gilt je Termin.",
    ergebnisText: "Ihr Bericht zur Besichtigung",
    dauerHinweis:
      "Wir teilen einen Makler ein und melden uns bei Ihnen, um den Termin abzustimmen. Ihren Bericht bekommen Sie im Anschluss an die Besichtigung.",
    ergebnisAblage: {
      art: "keine",
      grund:
        "Wer da war und wie die Rückmeldung ausfiel, gehört zur Besichtigung, nicht zur Immobilie. Der Bericht wandert deshalb in die Besichtigungs-Zeile (lib/auftraege.ts, berichtAblegen) und nicht in die Unterlagen.",
    },
  },
  "verhandlungs-begleitung": {
    art: "hand",
    /* ZUWEISUNG UND NICHT BERICHT, obwohl am Ende ein Gespräch steht:
       Ohne zugewiesenen Makler hat der Kunde keinen Draht zu einem
       Menschen, und die Karte im Konto bleibt bei "Wir stellen Ihnen
       gerade jemanden an die Seite". Der erste und unverzichtbare
       Schritt ist deshalb derselbe wie bei der Makler-Begleitung. */
    ergebnisArt: "zuweisung",
    teamHinweis:
      "Makler zuweisen (auf der Kundenseite unter Betreuer), dann mit dem Kunden klären, wann das Preisgespräch ansteht, und den Termin vormerken. Mit der Zuweisung wird dieser Auftrag von selbst fertig.",
    ergebnisText: "Ihr Makler für das Preisgespräch",
    dauerHinweis:
      "Wir stellen Ihnen einen Makler an die Seite, in der Regel innerhalb eines Werktags. Danach stimmen wir mit Ihnen ab, wann das Preisgespräch ansteht.",
    ergebnisAblage: {
      art: "keine",
      grund:
        "Das Ergebnis ist ein Mensch. Er steht in profiles.betreuer_id und erscheint als Makler-Karte im Konto; eine Datei entsteht dabei nicht.",
    },
  },
  "notar-koordination": {
    art: "hand",
    ergebnisArt: "bericht",
    /* BEI DEN TERMINEN: Das Ergebnis ist ein abgestimmter Termin, und
       der gehoert in den Terminkalender des Kunden (Runde 35). */
    berichtBeiTerminen: true,
    teamHinweis:
      "Notartermin mit Verkaeufer, Kaeufer und Notariat abstimmen, Unterlagen an das Notariat geben, den Entwurf pruefen lassen und den Termin bestaetigen. Danach hier kurz festhalten, wann der Termin stattfindet und was bis dahin noch fehlt.",
    ergebnisText: "Ihr abgestimmter Notartermin",
    dauerHinweis:
      "Wir nehmen innerhalb weniger Werktage Kontakt zum Notariat auf. Wann der Termin stattfindet, hängt vom Notariat und von Ihrem Käufer ab; Sie hören von uns, sobald er steht.",
    ergebnisAblage: {
      art: "keine",
      grund:
        "Das Ergebnis ist ein Termin, kein Dokument. Der Kaufvertrags-Entwurf liegt beim Notariat und geht von dort an beide Seiten; er läuft nie über uns.",
    },
  },
  ansprechpartner: {
    art: "hand",
    ergebnisArt: "zuweisung",
    teamHinweis:
      "Makler zuweisen (auf der Kundenseite unter Betreuer). Erst damit beginnt die Begleitung, erst damit startet die Abrechnung, und erst damit sieht der Kunde Name und Durchwahl. Mit der Zuweisung wird dieser Auftrag von selbst fertig.",
    ergebnisText: "Ihr persönlicher Ansprechpartner",
    dauerHinweis:
      "Wir stellen Ihnen Ihren persönlichen Ansprechpartner an die Seite, in der Regel innerhalb eines Werktags. Bis dahin zahlen Sie nichts.",
    ergebnisAblage: {
      art: "keine",
      grund:
        "Das Ergebnis ist ein Mensch, siehe verhandlungs-begleitung. Mit der Zuweisung beginnt zugleich die Laufzeit und die Abrechnung, und genau deshalb bekommt der Kunde davon eine Meldung (lib/kunden-meldung.ts, makler.zugewiesen).",
    },
  },
};

/**
 * Alle Leistungen, die ein Mensch erbringt. ABGELEITET aus ERBRINGUNG,
 * nicht gepflegt: Wer eine neue Hand-Leistung braucht, setzt dort die
 * Art auf "hand", und sie steht hier.
 */
export const HAND_LEISTUNGEN: HandLeistung[] = Object.entries(ERBRINGUNG)
  .filter(([, e]) => e.art === "hand")
  .map(([leistungId, e]) => ({
    ...(e as Extract<Erbringung, { art: "hand" }>),
    leistungId: leistungId as ServiceId,
  }));

export function handLeistung(leistungId: string): HandLeistung | null {
  return HAND_LEISTUNGEN.find((h) => h.leistungId === leistungId) ?? null;
}

/**
 * In welche Unterlagen-Kategorie das Ergebnis dieser Leistung gehört,
 * oder null, wenn es keine wird.
 *
 * EIN AUSPACKER FÜR ALLE, damit `ergebnisAblage.art === "unterlage"`
 * nicht an jeder Aufrufstelle steht. Wer die Form der Zuordnung
 * ändert, ändert sie hier und nirgends sonst.
 */
export function ablageTyp(leistungId: string): UnterlagenTyp | null {
  const eintrag = handLeistung(leistungId)?.ergebnisAblage;
  return eintrag?.art === "unterlage" ? eintrag.typ : null;
}

/**
 * Alle Leistungen, deren Ergebnis eine Unterlage wird. ABGELEITET,
 * nicht gepflegt. Die Vorlage für den Inhaber und die Grundlage der
 * Bau-Prüfung.
 */
export const UNTERLAGEN_LEISTUNGEN: (HandLeistung & {
  ergebnisAblage: { art: "unterlage"; typ: UnterlagenTyp };
})[] = HAND_LEISTUNGEN.filter(
  (h): h is HandLeistung & { ergebnisAblage: { art: "unterlage"; typ: UnterlagenTyp } } =>
    h.ergebnisAblage.art === "unterlage"
);

/**
 * Alle Leistungen, für die jemand zum Objekt fahren muss. ABGELEITET
 * aus dem Merkmal `vorOrt`, nicht gepflegt: Wer eine dritte Leistung
 * mit Kamera aufnimmt, setzt dort einen Satz, und sie steht hier, im
 * Termin-Bereich, im Aufgaben-Band und in der Verkaufscheckliste.
 *
 * KEINE ZWEITE LISTE. Genau daran ist HAND_LEISTUNGEN einmal
 * auseinandergelaufen (siehe Kopf dieser Datei); derselbe Fehler wäre
 * hier nur kleiner, nicht anders.
 */
export const VOR_ORT_LEISTUNGEN: (HandLeistung & { vorOrt: string })[] =
  HAND_LEISTUNGEN.filter(
    (h): h is HandLeistung & { vorOrt: string } => typeof h.vorOrt === "string"
  );

/** Braucht diese Leistung eine Fahrt zum Objekt? */
export function brauchtVorOrtTermin(leistungId: string): boolean {
  return VOR_ORT_LEISTUNGEN.some((h) => h.leistungId === leistungId);
}

/**
 * Welche Hand-Leistungen dieser Kauf auslöst.
 *
 * Ein Bündel löst sich in seine Bestandteile auf, und WELCHE das sind,
 * kommt aus `covers` im Katalog. Damit gibt es die Aufstellung genau
 * einmal: Sie entscheidet dort, was nicht doppelt gekauft werden kann,
 * und hier, was zu tun ist.
 */
export function handLeistungenZu(leistungId: string): HandLeistung[] {
  const eintrag = (ERBRINGUNG as Record<string, Erbringung | undefined>)[leistungId];
  if (!eintrag) return [];
  if (eintrag.art === "hand") {
    const einzeln = handLeistung(leistungId);
    return einzeln ? [einzeln] : [];
  }
  if (eintrag.art === "buendel") {
    const enthalten = SERVICES.find((s) => s.id === leistungId)?.covers?.ids ?? [];
    return enthalten
      .map((id) => handLeistung(id))
      .filter((h): h is HandLeistung => h !== null);
  }
  return [];
}

/**
 * Erbringt diese Leistung die Anwendung selbst? Nur für Berichte und
 * Prüfungen; der Bau fragt über handLeistungenZu.
 */
export function erbringtDieAnwendung(leistungId: string): boolean {
  return (
    (ERBRINGUNG as Record<string, Erbringung | undefined>)[leistungId]?.art === "system"
  );
}
