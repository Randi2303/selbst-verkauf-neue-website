/**
 * Eine Quelle für alle Objekt-Felder des Kontos.
 *
 * Hier stehen der vollständige Objekt-Typ (Spiegel der Tabelle objekte
 * nach Migration 0002) und alle festen Wertelisten mit deutschen
 * Beschriftungen. Erfassungs-Assistent, OpenImmo-Zuordnung, Probe-Export
 * und Bewertung lesen ausschließlich von hier, damit nichts doppelt
 * gepflegt wird.
 */

export type Objektart = "haus" | "wohnung" | "mehrfamilienhaus";

export type Objekt = {
  id?: string;
  user_id?: string;
  objektart: Objektart;
  objekttyp: string | null;
  // Adresse
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  bundesland: string | null;
  adresse_freigeben: boolean;
  /** Lage der Strasse vor dem Haus (0091, Katalog STRASSENLAGEN) */
  strassenlage: string | null;
  /**
   * Wahl des Verkaeufers (Migration 0038): true = ohne brauchbaren
   * Bonitaets- oder Finanzierungsnachweis kommt kein
   * Besichtigungstermin zustande. Standard false, dann ist der
   * Nachweis eine freundliche Bitte ohne Bedingung.
   */
  nachweis_vor_besichtigung: boolean;
  /**
   * Tag der Veroeffentlichung des Inserats (Migration 0039), setzt nur
   * das Team. Beginn der Schaltungs-Laufzeit, siehe lib/laufzeit.ts.
   */
  veroeffentlicht_am?: string | null;
  /**
   * Dazugekaufte Monate der Schaltung (Migration 0063). Sie
   * verlaengern das Ende, das schaltungEnde() rechnet.
   */
  schaltung_zusatz_monate?: number | null;
  /** Vom Kunden gesetzt: Verkauf abgeschlossen (Migration 0039) */
  verkauf_abgeschlossen_am?: string | null;
  /** Freiwillig beim Melden des Verkaufs (Migration 0061) */
  verkaufspreis?: number | null;
  /* Ende der Portalschaltung und die Aufgabe, die Inserate von Hand
     zurueckzuziehen (Migration 0061, lib/portal-schaltung.ts). */
  schaltung_beendet_am?: string | null;
  schaltung_beendet_grund?: string | null;
  portal_rueckzug_faellig_am?: string | null;
  portal_rueckzug_erledigt_am?: string | null;
  // Flächen und Räume
  wohnflaeche_qm: number | null;
  grundstuecksflaeche_qm: number | null;
  nutzflaeche_qm: number | null;
  zimmer: number | null;
  schlafzimmer: number | null;
  badezimmer: number | null;
  anzahl_wohneinheiten: number | null;
  etage: number | null;
  etagen_gesamt: number | null;
  keller: boolean;
  dachboden: boolean;
  // Gebäude und Zustand
  baujahr: number | null;
  zustand: string | null;
  modernisierung_jahr: number | null;
  bauphase: string | null;
  /** Bauweise des Gebaeudes (0091, Katalog BAUWEISEN) */
  bauweise: string | null;
  // Energie und Heizung
  energieausweis_typ: string | null;
  endenergie_kennwert: number | null;
  energieeffizienzklasse: string | null;
  heizung_baujahr: number | null;
  heizungsart: string | null;
  energietraeger: string[];
  /** Gedaemmte Bauteile (0091, Katalog DAEMMUNG_WERTE), Mehrfachauswahl */
  daemmung: string[];
  /** Jahr der Daemmung, nur mit mindestens einem daemmung-Eintrag (0091) */
  daemmung_jahr: number | null;
  /** Hersteller und Modell der Heizung, Freitext (0091) */
  heizung_hersteller: string | null;
  /** Einliegerwohnung vorhanden (OpenImmo flaechen > einliegerwohnung) */
  einliegerwohnung: boolean;
  /** Flaeche der Einliegerwohnung, nur bei einliegerwohnung (0091) */
  einliegerwohnung_flaeche_qm: number | null;
  /** Kellerflaeche (OpenImmo flaechen > kellerflaeche), nur mit Keller */
  kellerflaeche_qm: number | null;
  /** Dachbodenflaeche (OpenImmo flaechen > dachbodenflaeche), nur mit Dachboden */
  dachbodenflaeche_qm: number | null;
  /** Denkmalschutz (OpenImmo verwaltung_objekt > denkmalgeschuetzt) */
  denkmalgeschuetzt: boolean;
  /** Verbrauchskennwert enthaelt Warmwasser (OpenImmo energiepass > mitwarmwasser) */
  energie_warmwasser_enthalten: boolean;
  /** Ausstellungsdatum des Energieausweises (OpenImmo energiepass > ausstelldatum) */
  energieausweis_datum: string | null;
  // Ausstattung
  balkon: boolean;
  terrasse: boolean;
  garten: boolean;
  /** Balkon- und Terrassenflaeche zusammen (OpenImmo balkon_terrasse_flaeche) */
  balkon_terrasse_flaeche_qm: number | null;
  /** Gartenflaeche (OpenImmo gartenflaeche) */
  gartenflaeche_qm: number | null;
  /** Ausrichtung von Balkon und Terrasse (OpenImmo ausricht_balkon_terrasse) */
  balkon_terrasse_ausrichtung: string[];
  aufzug: boolean;
  einbaukueche: boolean;
  gaeste_wc: boolean;
  barrierefrei: boolean;
  kamin: boolean;
  /** Bad-Merkmale (OpenImmo ausstattung > bad: DUSCHE, WANNE, FENSTER) */
  bad: string[];
  /** Weitere Merkmale, je Wert ein eigenes OpenImmo-Element (WEITERE_AUSSTATTUNG) */
  weitere_ausstattung: string[];
  fussboden: string[];
  /**
   * Stellplaetze je Art mit eigener Anzahl, z. B.
   * { garage: 2, aussenstellplatz: 3 }. Nach OpenImmo werden die Arten
   * einzeln uebertragen (stp_garage, stp_freiplatz, ...), nicht als
   * eine Auswahl. Schluessel aus STELLPLATZ_ARTEN.
   */
  stellplaetze: Record<string, number>;
  ausstattungsqualitaet: string | null;
  // Kauf und Kosten
  angebotspreis: number | null;
  hausgeld: number | null;
  ruecklage_anteil: number | null;
  vermietet: boolean;
  /** Jahr, seit dem vermietet ist; nur bei vermietet (0091) */
  vermietet_seit: number | null;
  kaltmiete: number | null;
  mieteinnahmen_jahr: number | null;
  erbbaurecht: boolean;
  /**
   * Vom Verkaeufer mit dem Makler-Partner vereinbarte Innenprovision
   * als Text (OpenImmo preise > innen_courtage). NULL bedeutet keine,
   * das ist der Regelfall. Nur das Team setzt den Wert, siehe
   * lib/provision.ts und Migration 0022.
   */
  innen_courtage: string | null;
  // Verfügbarkeit und Texte
  bezugsfrei_typ: string | null;
  bezugsfrei_datum: string | null;
  beschreibung_objekt: string | null;
  beschreibung_lage: string | null;
  beschreibung_ausstattung: string | null;
  beschreibung_sonstiges: string | null;
  // Steuerung
  preisstrategie: string | null;
  erfassung_schritt: number;
  phase: number;
  // Unterlagen und Exposé (Migration 0005)
  wasserzeichen_an: boolean;
  expose_pfad: string | null;
  expose_stand: Record<string, unknown> | null;
  expose_erstellt_am: string | null;
  // Objektbezogene Anfragen-Adresse (Migration 0008), wird bei der
  // Exposé-Erzeugung angelegt
  anfragen_alias: string | null;
  // Fertiger 360-Grad-Rundgang (Migration 0045), gesetzt von der
  // Fertig-Meldung des Auftrags; Exposé und Export lesen ihn hier
  rundgang_link: string | null;
  /**
   * Verweis auf das Objektvideo (Migration 0103), der Zwilling von
   * rundgang_link. Gesetzt von der Fertig-Meldung des
   * Fotografie-Auftrags. Wir liefern kein Video selbst aus: Die
   * Master-Datei liegt als Ergebnis-Datei am Auftrag, oeffentlich
   * laeuft es ueber diesen Verweis (OpenImmo FILMLINK).
   */
  film_link: string | null;
  // Expose automatisch an neue Anfragen (Migration 0046), Standard an
  expose_auto_versand: boolean;
  /**
   * Wann zum ersten Mal ein Bonitaetsnachweis bestaetigt wurde
   * (Migration 0100). EIN EREIGNIS, KEIN ZUSTAND: Die Nachweise selbst
   * verschwinden nach 90 Tagen (bonitaetsnachweise.loeschen_ab), und
   * bis Runde 18 las der Checklisten-Punkt genau diesen Bestand. Der
   * Meilenstein waere damit ungefaehr dann wieder aufgegangen, wenn
   * der Verkaeufer beim Notar sitzt. Nur ein Zeitpunkt, ohne Namen und
   * ohne Verweis auf die Person.
   */
  bonitaet_geprueft_am: string | null;
  // Oeffentliche Objektseite (Migration 0047)
  seite_kennung: string | null;
  seite_freigegeben: boolean;
  seite_freigegeben_am: string | null;
  // Objektseiten-Ausbau (Migration 0050): einmal geokodierte Lage
  // (Karte laedt beim Besucher erst nach dem Zwei-Klick) und die Wahl,
  // den Makler mit Durchwahl zu zeigen (Standard aus)
  lage_lat: number | null;
  lage_lng: number | null;
  lage_quelle: string | null;
  // Umgebung (Migration 0088): wann zuletzt bei Overpass abgefragt
  // wurde; die Punkte selbst liegen in umgebungspunkte
  umgebung_abgefragt_am: string | null;
  // Quellen-Stempel der Adresse dieser Abfrage (Migration 0090);
  // weicht er ab, verwirft app/api/umgebung alle Punkte
  umgebung_quelle: string | null;
  // Archiv (Migration 0051): gesetzt = aus den aktiven Listen
  archiviert_am: string | null;
  archiviert_von: string | null;
  // KI-Texte (Migration 0048): gemerkter Stil und die pflegbare
  // Inserats-Ueberschrift (leer greift die Ableitung im Export)
  ki_stil: string | null;
  inserat_ueberschrift: string | null;
  // Erzaehl-Antworten (Migration 0089): woertlich, je Fragen-Kennung
  // aus config/erzaehlt.ts; Rohstoff der Text-Vorschlaege, nie
  // oeffentlich
  erzaehlt: Record<string, string>;
  created_at?: string;
  updated_at?: string;
};

/** Leeres Objekt als Ausgangspunkt für die Erfassung */
export function leeresObjekt(objektart: Objektart = "haus"): Objekt {
  return {
    objektart,
    objekttyp: null,
    strasse: null,
    plz: null,
    stadt: null,
    bundesland: null,
    adresse_freigeben: false,
    strassenlage: null,
    nachweis_vor_besichtigung: false,
    wohnflaeche_qm: null,
    grundstuecksflaeche_qm: null,
    nutzflaeche_qm: null,
    zimmer: null,
    schlafzimmer: null,
    badezimmer: null,
    anzahl_wohneinheiten: null,
    etage: null,
    etagen_gesamt: null,
    keller: false,
    dachboden: false,
    baujahr: null,
    zustand: null,
    modernisierung_jahr: null,
    /* Vorbelegung nach Entscheidung des Inhabers vom 19.08.2026: Fast
       jeder private Verkaeufer verkauft Bestand; wer wirklich baut,
       waehlt bewusst um. In der Maske ist die Auswahl nicht mehr
       abwaehlbar. */
    bauphase: "bestand",
    bauweise: null,
    energieausweis_typ: null,
    endenergie_kennwert: null,
    energieeffizienzklasse: null,
    heizung_baujahr: null,
    heizungsart: null,
    energietraeger: [],
    daemmung: [],
    daemmung_jahr: null,
    heizung_hersteller: null,
    einliegerwohnung: false,
    einliegerwohnung_flaeche_qm: null,
    kellerflaeche_qm: null,
    dachbodenflaeche_qm: null,
    denkmalgeschuetzt: false,
    energie_warmwasser_enthalten: false,
    energieausweis_datum: null,
    balkon: false,
    terrasse: false,
    garten: false,
    balkon_terrasse_flaeche_qm: null,
    gartenflaeche_qm: null,
    balkon_terrasse_ausrichtung: [],
    aufzug: false,
    einbaukueche: false,
    gaeste_wc: false,
    barrierefrei: false,
    kamin: false,
    bad: [],
    weitere_ausstattung: [],
    fussboden: [],
    stellplaetze: {},
    ausstattungsqualitaet: null,
    angebotspreis: null,
    hausgeld: null,
    ruecklage_anteil: null,
    vermietet: false,
    vermietet_seit: null,
    kaltmiete: null,
    mieteinnahmen_jahr: null,
    erbbaurecht: false,
    innen_courtage: null,
    bezugsfrei_typ: null,
    bezugsfrei_datum: null,
    beschreibung_objekt: null,
    beschreibung_lage: null,
    beschreibung_ausstattung: null,
    beschreibung_sonstiges: null,
    preisstrategie: null,
    erfassung_schritt: 1,
    phase: 1,
    wasserzeichen_an: true,
    expose_pfad: null,
    expose_stand: null,
    expose_erstellt_am: null,
    anfragen_alias: null,
    rundgang_link: null,
    film_link: null,
    expose_auto_versand: true,
    bonitaet_geprueft_am: null,
    seite_kennung: null,
    seite_freigegeben: false,
    seite_freigegeben_am: null,
    lage_lat: null,
    lage_lng: null,
    lage_quelle: null,
    umgebung_abgefragt_am: null,
    umgebung_quelle: null,
    archiviert_am: null,
    archiviert_von: null,
    ki_stil: null,
    inserat_ueberschrift: null,
    erzaehlt: {},
  };
}

export type WertEintrag = { wert: string; label: string; erklaerung?: string };

/**
 * Objekttypen je Objektart, Werte wie in der Datenbank-Werteliste.
 *
 * Jeder Typ hat genau EINE Entsprechung im OpenImmo-Standard
 * (siehe HAUSTYP und WOHNUNGTYP in lib/portale/openimmo.ts). Neue Typen
 * dürfen nur aufgenommen werden, wenn der Standard einen exakten Wert
 * dafür kennt, sonst landet das Objekt bei den Portalen in der
 * falschen Kategorie.
 *
 * Abgrenzung nach Wohneinheiten: Einfamilienhaus hat eine Wohneinheit
 * (eine Einliegerwohnung ändert daran nichts), Zweifamilienhaus hat
 * genau zwei abgeschlossene Wohneinheiten, Mehrfamilienhaus hat drei
 * oder mehr.
 */
export const OBJEKTTYPEN: Record<Objektart, WertEintrag[]> = {
  wohnung: [
    {
      wert: "etagenwohnung",
      label: "Etagenwohnung",
      erklaerung: "Wohnung in einem Ober- oder Zwischengeschoss.",
    },
    {
      wert: "erdgeschosswohnung",
      label: "Erdgeschosswohnung",
      erklaerung: "Wohnung zu ebener Erde.",
    },
    {
      wert: "dachgeschosswohnung",
      label: "Dachgeschosswohnung",
      erklaerung: "Wohnung unter dem Dach.",
    },
    {
      wert: "maisonette",
      label: "Maisonette",
      erklaerung: "Wohnung über zwei Ebenen mit Innentreppe.",
    },
    {
      wert: "penthouse",
      label: "Penthouse",
      erklaerung: "Wohnung im obersten Geschoss, meist mit Dachterrasse.",
    },
    {
      wert: "souterrain",
      label: "Souterrain",
      erklaerung: "Wohnung teilweise unter dem Geländeniveau.",
    },
  ],
  haus: [
    {
      wert: "einfamilienhaus",
      label: "Einfamilienhaus",
      erklaerung:
        "Eine Wohneinheit. Eine Einliegerwohnung ändert daran nichts.",
    },
    {
      wert: "zweifamilienhaus",
      label: "Zweifamilienhaus",
      erklaerung: "Genau zwei abgeschlossene Wohneinheiten.",
    },
    {
      wert: "doppelhaushaelfte",
      label: "Doppelhaushälfte",
      erklaerung: "Eine Hälfte eines Doppelhauses, Wand an Wand.",
    },
    {
      wert: "reihenmittelhaus",
      label: "Reihenmittelhaus",
      erklaerung: "Haus in der Mitte einer Häuserreihe.",
    },
    {
      wert: "reihenendhaus",
      label: "Reihenendhaus",
      erklaerung: "Haus am Anfang oder Ende einer Häuserreihe.",
    },
    {
      wert: "villa",
      label: "Villa",
      erklaerung: "Großzügiges, freistehendes Wohnhaus.",
    },
    {
      wert: "bungalow",
      label: "Bungalow",
      erklaerung: "Alle Wohnräume auf einer Ebene.",
    },
  ],
  mehrfamilienhaus: [
    {
      wert: "mehrfamilienhaus",
      label: "Mehrfamilienhaus",
      erklaerung: "Drei oder mehr Wohneinheiten, egal ob drei oder dreißig.",
    },
  ],
};

/**
 * Zustands-Werte nach OpenImmo 1.2.7 (Attribut zustand_art), jeweils
 * mit kurzer Erklaerzeile, damit vor allem der Unterschied zwischen
 * renovierungsbeduerftig (Oberflaechen) und sanierungsbeduerftig
 * (Substanz und Technik) verstaendlich ist.
 */
export const ZUSTAND_WERTE: WertEintrag[] = [
  {
    wert: "erstbezug",
    label: "Erstbezug",
    erklaerung: "Neubau oder Kernsanierung, noch nie bewohnt.",
  },
  {
    wert: "neuwertig",
    label: "Neuwertig",
    erklaerung: "Bewohnt, aber praktisch wie neu, kaum Gebrauchsspuren.",
  },
  {
    wert: "modernisiert",
    label: "Modernisiert",
    erklaerung: "Auf heutigen Stand gebracht, etwa Heizung, Fenster oder Bäder erneuert.",
  },
  {
    wert: "voll_saniert",
    label: "Voll saniert",
    erklaerung: "Substanz und Technik wurden umfassend erneuert.",
  },
  {
    wert: "teil_saniert",
    label: "Teilsaniert",
    erklaerung: "Einzelne Bereiche der Substanz oder Technik wurden erneuert.",
  },
  {
    wert: "renoviert",
    label: "Renoviert",
    erklaerung: "Oberflächen frisch gemacht, etwa Böden, Wände und Türen.",
  },
  {
    wert: "gepflegt",
    label: "Gepflegt",
    erklaerung: "Regelmäßig instand gehalten, altersgerechter guter Zustand.",
  },
  {
    wert: "renovierungsbeduerftig",
    label: "Renovierungsbedürftig",
    erklaerung: "Oberflächen sind abgewohnt: streichen, Böden, Kleinigkeiten.",
  },
  {
    wert: "sanierungsbeduerftig",
    label: "Sanierungsbedürftig",
    erklaerung: "Substanz oder Technik müssen ran, etwa Dach, Leitungen oder Heizung.",
  },
  {
    wert: "rohbau",
    label: "Rohbau",
    erklaerung: "Gebäudehülle steht, Ausbau fehlt noch.",
  },
  {
    wert: "abrissobjekt",
    label: "Abrissobjekt",
    erklaerung: "Das Gebäude ist wirtschaftlich nicht mehr zu erhalten, zählt das Grundstück.",
  },
];

export const BAUPHASEN: WertEintrag[] = [
  { wert: "bestand", label: "Bestand, fertig gebaut" },
  { wert: "in_bau", label: "Im Bau" },
  { wert: "in_planung", label: "In Planung" },
];

/**
 * Bauweise des Gebaeudes (0091). Kein OpenImmo-Element mit fester
 * Werteliste; die Uebertragung laeuft als Freitext in
 * sonstige_angaben. Der Wert ist vor allem Text-Stoff: "massive
 * Klinkerbauweise" traegt einen ganzen Exposé-Satz.
 */
export const BAUWEISEN: WertEintrag[] = [
  { wert: "massiv", label: "Massiv", erklaerung: "Gemauerte Wände, etwa Ziegel oder Kalksandstein." },
  { wert: "klinker", label: "Massiv mit Klinker", erklaerung: "Gemauert mit Klinker-Fassade." },
  { wert: "holzstaender", label: "Holzständer", erklaerung: "Tragendes Holzgerüst, oft beim Neubau." },
  { wert: "fertighaus", label: "Fertighaus", erklaerung: "Aus vorgefertigten Teilen errichtet." },
  { wert: "fachwerk", label: "Fachwerk", erklaerung: "Sichtbares oder verputztes Holz-Fachwerk." },
];

/**
 * Lage der Strasse vor dem Haus (0091). Die Beschreibungs-Runde 12
 * fand: Beide Makler-Beispiele EROEFFNEN ihre Lage mit genau dieser
 * Tatsache; sie ist die billigste starke Lage-Angabe, die es gibt.
 */
export const STRASSENLAGEN: WertEintrag[] = [
  { wert: "sackgasse", label: "Sackgasse" },
  { wert: "spielstrasse", label: "Spielstraße" },
  { wert: "verkehrsberuhigt", label: "Verkehrsberuhigte Wohnstraße" },
  { wert: "wohnstrasse", label: "Wohnstraße" },
  { wert: "durchgangsstrasse", label: "Durchgangsstraße" },
  { wert: "hauptstrasse", label: "Hauptstraße" },
];

/**
 * Gedaemmte Bauteile (0091), Mehrfachauswahl. Drei Haekchen mit
 * grossem Energie-Erzaehlwert; das Jahr dazu ist freiwillig.
 */
export const DAEMMUNG_WERTE: WertEintrag[] = [
  { wert: "dach", label: "Dach gedämmt" },
  { wert: "fassade", label: "Fassade gedämmt" },
  { wert: "kellerdecke", label: "Kellerdecke gedämmt" },
];

export const ENERGIEAUSWEIS_TYPEN: WertEintrag[] = [
  { wert: "bedarf", label: "Bedarfsausweis" },
  { wert: "verbrauch", label: "Verbrauchsausweis" },
  /* Runde 13, Entscheidung des Inhabers vom 19.08.2026: der bei
     Privatverkaeufern haeufige Fall, dass der Ausweis erst beantragt
     ist. OpenImmo kennt dafuer jahrgang=bei_besichtigung,
     ImmoScout24 energyCertificateAvailability=NOT_AVAILABLE_YET.
     Der Wortlaut am Feld bleibt bewusst schlicht und ohne rechtliche
     Zusicherung; den endgueltigen Text schreibt der Anwalt. */
  { wert: "bei_besichtigung", label: "Liegt zur Besichtigung vor" },
  { wert: "befreiung", label: "Nicht nötig, Ausnahme nach GEG" },
];

/**
 * Ausweis-Typen, bei denen KEINE Ausweis-Daten vorliegen (Kennwert,
 * Klasse, Ausstellungsdatum): die GEG-Befreiung und der noch nicht
 * vorliegende Ausweis. Eine Quelle fuer Maske, Zaehlung, Luecken und
 * Export.
 */
export const AUSWEIS_OHNE_DATEN = ["befreiung", "bei_besichtigung"];

export const ENERGIEKLASSEN: WertEintrag[] = [
  { wert: "a_plus", label: "A+" },
  { wert: "a", label: "A" },
  { wert: "b", label: "B" },
  { wert: "c", label: "C" },
  { wert: "d", label: "D" },
  { wert: "e", label: "E" },
  { wert: "f", label: "F" },
  { wert: "g", label: "G" },
  { wert: "h", label: "H" },
];

export const HEIZUNGSARTEN: WertEintrag[] = [
  { wert: "zentralheizung", label: "Zentralheizung" },
  { wert: "etagenheizung", label: "Etagenheizung" },
  { wert: "fussbodenheizung", label: "Fußbodenheizung" },
  { wert: "ofenheizung", label: "Ofenheizung" },
  { wert: "fernheizung", label: "Fernheizung" },
];

/**
 * Energietraeger nach OpenImmo 1.2.7 (Attribute der befeuerung).
 * Erdgas und Fluessiggas sind im Standard getrennte Werte (GAS meint
 * Erdgas, FLUESSIGGAS den eigenen Tank), "Gas" allein ist zu unscharf.
 * Mehrfachauswahl bleibt moeglich, wie im Energieausweis ueblich.
 */
export const ENERGIETRAEGER: WertEintrag[] = [
  { wert: "erdgas", label: "Erdgas" },
  { wert: "fluessiggas", label: "Flüssiggas" },
  { wert: "oel", label: "Öl" },
  { wert: "fernwaerme", label: "Fernwärme" },
  { wert: "nahwaerme", label: "Nahwärme" },
  { wert: "strom", label: "Strom" },
  { wert: "waermepumpe", label: "Wärmepumpe" },
  { wert: "erdwaerme", label: "Erdwärme" },
  { wert: "solar", label: "Solar" },
  { wert: "pellets", label: "Holzpellets" },
  { wert: "holz", label: "Holz" },
];

/**
 * Bad-Merkmale nach OpenImmo 1.2.7 (Attribute des Elements bad),
 * Mehrfachauswahl erlaubt.
 */
export const BAD_MERKMALE: WertEintrag[] = [
  { wert: "wanne", label: "Badewanne" },
  { wert: "dusche", label: "Dusche" },
  { wert: "fenster", label: "Fenster im Bad" },
];

/**
 * Weitere Ausstattungs-Merkmale, je Wert ein eigenes boolesches
 * Element in der OpenImmo-ausstattung (siehe openImmoXml). Bewusst
 * auf die für Wohnimmobilien üblichen Merkmale begrenzt.
 */
export const WEITERE_AUSSTATTUNG: WertEintrag[] = [
  { wert: "klimaanlage", label: "Klimaanlage" },
  { wert: "rollaeden", label: "Rollläden" },
  { wert: "abstellraum", label: "Abstellraum" },
  { wert: "fahrradraum", label: "Fahrradraum" },
  { wert: "wasch_trockenraum", label: "Wasch- und Trockenraum" },
  { wert: "wintergarten", label: "Wintergarten" },
  { wert: "sauna", label: "Sauna" },
  { wert: "swimmingpool", label: "Swimmingpool" },
  /* Glasfaser (Runde 13): eine der ersten Kaeuferfragen ueberhaupt.
     OpenImmo kennt breitband_zugang; der Export uebersetzt den Wert
     dorthin statt in ein boolesches Einzel-Element. */
  { wert: "glasfaser", label: "Glasfaser-Anschluss" },
];

/**
 * Himmelsrichtungen fuer Balkon und Terrasse nach OpenImmo
 * (Attribute von ausricht_balkon_terrasse), Mehrfachauswahl erlaubt.
 */
export const AUSRICHTUNGEN: WertEintrag[] = [
  { wert: "nord", label: "Nord" },
  { wert: "nordost", label: "Nordost" },
  { wert: "ost", label: "Ost" },
  { wert: "suedost", label: "Südost" },
  { wert: "sued", label: "Süd" },
  { wert: "suedwest", label: "Südwest" },
  { wert: "west", label: "West" },
  { wert: "nordwest", label: "Nordwest" },
];

export const FUSSBODEN_WERTE: WertEintrag[] = [
  { wert: "parkett", label: "Parkett" },
  { wert: "laminat", label: "Laminat" },
  { wert: "fliesen", label: "Fliesen" },
  { wert: "vinyl", label: "Vinyl" },
  { wert: "teppich", label: "Teppich" },
  { wert: "dielen", label: "Dielen" },
  { wert: "stein", label: "Stein" },
];

/**
 * Stellplatz-Arten nach OpenImmo 1.2.7: je Art ein eigenes Element
 * mit Anzahl (stp_garage, stp_tiefgarage, stp_carport, stp_freiplatz,
 * stp_parkhaus, stp_duplex). Mehrere Arten gleichzeitig sind normal,
 * z. B. zwei Garagenplaetze und drei Aussenstellplaetze.
 */
export const STELLPLATZ_ARTEN: (WertEintrag & { mehrzahl: string })[] = [
  { wert: "garage", label: "Garage", mehrzahl: "Garagen" },
  { wert: "tiefgarage", label: "Tiefgaragen-Stellplatz", mehrzahl: "Tiefgaragen-Stellplätze" },
  { wert: "carport", label: "Carport", mehrzahl: "Carports" },
  { wert: "aussenstellplatz", label: "Außenstellplatz", mehrzahl: "Außenstellplätze" },
  { wert: "parkhaus", label: "Parkhaus-Stellplatz", mehrzahl: "Parkhaus-Stellplätze" },
  { wert: "duplex", label: "Duplex-Parker", mehrzahl: "Duplex-Parker" },
];

/** Gesamtzahl aller Stellplaetze ueber die Arten hinweg */
export function stellplaetzeGesamt(stellplaetze: Record<string, number>): number {
  return Object.values(stellplaetze).reduce((summe, n) => summe + (n > 0 ? n : 0), 0);
}

/**
 * Lesbare Zusammenfassung der Stellplaetze, z. B.
 * "2 Garagen, 3 Außenstellplätze". Leer, wenn keine erfasst sind.
 */
export function stellplaetzeText(stellplaetze: Record<string, number>): string {
  return STELLPLATZ_ARTEN.filter((art) => (stellplaetze[art.wert] ?? 0) > 0)
    .map((art) => {
      const anzahl = stellplaetze[art.wert];
      return `${anzahl} ${anzahl === 1 ? art.label : art.mehrzahl}`;
    })
    .join(", ");
}

export const AUSSTATTUNGSQUALITAETEN: WertEintrag[] = [
  { wert: "einfach", label: "Einfach" },
  { wert: "normal", label: "Normal" },
  { wert: "gehoben", label: "Gehoben" },
  { wert: "luxus", label: "Luxus" },
];

export const BEZUGSFREI_TYPEN: WertEintrag[] = [
  { wert: "sofort", label: "Sofort" },
  { wert: "nach_vereinbarung", label: "Nach Vereinbarung" },
  { wert: "zum_datum", label: "Zu einem Datum" },
];

export const PREISSTRATEGIEN: WertEintrag[] = [
  { wert: "vorsichtig", label: "Vorsichtig einsteigen" },
  { wert: "empfohlen", label: "Empfohlene Mitte" },
  { wert: "ambitioniert", label: "Ambitioniert starten" },
];

export const BUNDESLAENDER: string[] = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

/** Beschriftung zu einem Wert aus einer Werteliste, sonst der Rohwert */
export function wertLabel(liste: WertEintrag[], wert: string | null): string {
  if (!wert) return "";
  return liste.find((e) => e.wert === wert)?.label ?? wert;
}

/** Beschriftung des Objekttyps über alle Objektarten hinweg */
export function objekttypLabel(wert: string | null): string {
  if (!wert) return "";
  for (const liste of Object.values(OBJEKTTYPEN)) {
    const treffer = liste.find((e) => e.wert === wert);
    if (treffer) return treffer.label;
  }
  return wert;
}

export const OBJEKTART_LABELS: Record<Objektart, string> = {
  haus: "Haus",
  wohnung: "Wohnung",
  mehrfamilienhaus: "Mehrfamilienhaus",
};

/**
 * Wie eine Immobilie benannt wird, wenn ihre Adresse nichts zu suchen
 * hat: "Haus in Sendenhorst". Genau das steht in Mails an Interessenten
 * und auf den Seiten, die ohne Konto erreichbar sind.
 *
 * Fällt beides weg, bleibt "die Immobilie". Nie ein leerer String und
 * nie ein Platzhalter wie "Objekt 3": Der Empfänger soll einen Satz
 * lesen, keine Datenbankzeile.
 */
export function objektBezeichnung(objekt: {
  objektart?: string | null;
  stadt?: string | null;
}): string {
  const art = objekt.objektart
    ? OBJEKTART_LABELS[objekt.objektart as Objektart]
    : null;
  return [art, objekt.stadt].filter(Boolean).join(" in ") || "die Immobilie";
}

/**
 * Objektart mit bestimmtem Artikel im Dativ, für Sätze wie
 * "Ihr Interesse an dem Haus in Papenburg".
 *
 * Steht hier und nicht am Satz: Wer den Artikel an der Fundstelle
 * zusammenbaut, schreibt früher oder später "an der Haus".
 */
export const OBJEKTART_DATIV: Record<Objektart, string> = {
  haus: "dem Haus",
  wohnung: "der Wohnung",
  mehrfamilienhaus: "dem Mehrfamilienhaus",
};

/**
 * Kurze Abgrenzung je Objektart, sichtbar direkt an der Auswahl.
 * Dieselben Texte nutzt der Website-Konfigurator, damit die
 * Definition überall identisch ist.
 */
export const OBJEKTART_ERKLAERUNGEN: Record<Objektart, string> = {
  haus: "Wohnhaus mit einer oder zwei Wohneinheiten, vom Einfamilienhaus bis zur Doppelhaushälfte.",
  wohnung: "Eine einzelne Wohnung in einem Gebäude.",
  mehrfamilienhaus:
    "Wohnhaus mit drei oder mehr Wohneinheiten, egal ob drei oder dreißig.",
};

/**
 * Sichtbarkeit der bedingten Felder je Objektart, eine Quelle für
 * Assistent, Zusammenfassung und Portal-Prüfung.
 *
 * Wohnung: mit Etage, Hausgeld, Rücklage, ohne Grundstücksfläche.
 * Haus: mit Grundstück, Dachboden, ohne Etage und Hausgeld.
 * Mehrfamilienhaus: wie Haus, zusätzlich Mieteinnahmen je Jahr und
 * die Anzahl der Wohneinheiten (beim Zweifamilienhaus fest zwei,
 * darum dort kein Feld).
 */
export function feldSichtbar(feld: string, objektart: Objektart): boolean {
  const nurWohnung = ["etage", "hausgeld", "ruecklage_anteil", "aufzug"];
  const nurHausartig = [
    "grundstuecksflaeche_qm",
    "dachboden",
    "dachbodenflaeche_qm",
    "einliegerwohnung",
    "einliegerwohnung_flaeche_qm",
  ];
  const nurMfh = ["mieteinnahmen_jahr", "anzahl_wohneinheiten"];
  if (nurWohnung.includes(feld)) return objektart === "wohnung";
  if (nurHausartig.includes(feld)) return objektart !== "wohnung";
  if (nurMfh.includes(feld)) return objektart === "mehrfamilienhaus";
  return true;
}
