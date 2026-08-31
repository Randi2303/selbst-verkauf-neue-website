/**
 * Zuordnung der Erfassungs-Felder zum OpenImmo-Standard und zu den
 * Pflichtangaben der Portale (ImmoScout24, Kleinanzeigen, Immowelt,
 * jeweils Wohnimmobilien zum Kauf).
 *
 * OpenImmo ist das Übergabeformat der deutschen Immobilienportale
 * (Version 1.2.7). Jedes Feld unten nennt sein Ziel-Element im
 * OpenImmo-Baum, damit die spätere Portal-Anbindung reine Fleißarbeit
 * ist und keine Feldlücken mehr auftauchen können.
 *
 * Die Pflicht-Markierungen bilden ab, was die Portale beim Einstellen
 * eines Kauf-Inserats wirklich verlangen, plus die gesetzlichen
 * Energie-Pflichtangaben nach GEG Paragraf 87 (gelten in jeder
 * Immobilienanzeige, sobald ein Energieausweis vorliegt). Für
 * ImmoScout24 am 06.08.2026 gegen das offizielle Offer-XSD geprüft
 * (Pflicht dort: title, address, livingSpace, numberOfRooms, courtage,
 * beim Haus zusätzlich plotArea; Details docs/immoscout24-api.md).
 *
 * Daneben verlangt das OpenImmo-XSD selbst eine Reihe von Elementen,
 * die NICHT vom Kunden kommen, sondern die der Export automatisch
 * liefert (Systempflichten, geprüft gegen openimmo_127d.xsd):
 *   uebertragung[art, umfang, version, sendersoftware, senderversion],
 *   anbieter > firma + openimmo_anid,
 *   immobilie > objektkategorie (nutzungsart[WOHNEN, GEWERBE],
 *     vermarktungsart[KAUF, MIETE_PACHT], objektart),
 *   immobilie > geo (mindestens plz ODER ort ODER geokoordinaten),
 *   immobilie > kontaktperson (ein Kontaktweg, z. B. email_zentrale,
 *     plus name),
 *   immobilie > verwaltung_techn (objektnr_extern, aktion,
 *     openimmo_obid, stand_vom).
 * Diese Liste pflegt lib/portale/openimmo.ts; die Pflicht-Markierungen
 * hier betreffen nur Angaben, die der Kunde erfassen muss. Der
 * objekttyp ist im XSD zwar optional (haustyp/wohnungtyp-Attribut),
 * bleibt bei uns aber Pflicht, weil ein Objekt ohne Typ bei den
 * Portalen in der falschen Kategorie landen kann; der Export bricht
 * ohne Typ bewusst ab.
 */
import { PORTALE as PORTAL_QUELLE, type PortalKennung } from "@/config/portale";
import { provisionsAngabe } from "@/lib/provision";
import {
  AUSWEIS_OHNE_DATEN,
  feldSichtbar,
  type Objekt,
  type Objektart,
} from "@/lib/objekt-felder";

/* Kennungen und Namen kommen aus der EINEN Quelle config/portale.ts
   (Feinschliff 24.08.2026); dieser Baustein behaelt nur seine alte
   Form fuer die vielen Abnehmer der Pflichtfeld-Zuordnung. */
export type PortalId = PortalKennung;

export const PORTALE: { id: PortalId; name: string }[] = PORTAL_QUELLE.map((p) => ({
  id: p.kennung,
  name: p.name,
}));

export type FeldZuordnung = {
  /** Spaltenname in der Tabelle objekte */
  feld: keyof Objekt & string;
  /** Deutsche Beschriftung, identisch zum Erfassungs-Assistenten */
  label: string;
  /** Ziel im OpenImmo-Baum, Schreibweise wie im Standard */
  openimmo: string;
  /** Schritt des Erfassungs-Assistenten, in dem das Feld liegt */
  schritt: number;
  /** Portale, für die das Feld beim Kauf-Inserat Pflicht ist */
  pflicht: PortalId[];
  /** Gesetzliche Energie-Pflichtangabe nach GEG */
  geg?: boolean;
  /**
   * Ziel-Parameter der Sprengnetter Report-API (ReportRequest), sofern
   * das Feld in die Markteinschätzung einfließt. Die Übersetzung der
   * Wertelisten übernimmt lib/sprengnetter.ts (baueReportRequest).
   */
  sprengnetter?: string;
};

const ALLE: PortalId[] = ["immoscout24", "kleinanzeigen", "immowelt"];
/** Nur ImmoScout24, aus dem offiziellen Offer-XSD bzw. der API-Doku belegt */
const NUR_IS24: PortalId[] = ["immoscout24"];
/** ImmoScout24 und Kleinanzeigen, beide Quellen belegen die Angabe */
const IS24_UND_KA: PortalId[] = ["immoscout24", "kleinanzeigen"];

/**
 * Die vollständige Zuordnungstabelle. Reihenfolge wie im
 * Erfassungs-Assistenten (Schritte 1 bis 7).
 */
export const FELD_ZUORDNUNGEN: FeldZuordnung[] = [
  // Schritt 1: Objektart und Typ
  {
    feld: "objektart",
    sprengnetter: "category (ETW | EFH | MFH)",
    label: "Objektart",
    openimmo: "objektkategorie > objektart (haus | wohnung)",
    schritt: 1,
    pflicht: ALLE,
  },
  {
    feld: "objekttyp",
    sprengnetter: "construction (FREISTEHEND, REIHEN_MITTELHAUS, ETAGENWOHNUNG, ...)",
    label: "Objekttyp",
    openimmo: "objektart > haus[haustyp] bzw. wohnung[wohnungtyp]",
    schritt: 1,
    pflicht: ALLE,
  },
  // Schritt 2: Adresse
  {
    // Belegt: ImmoScout24 führt street und houseNumber als
    // Pflichtangaben (api-docs/import-export/introduction). Bei
    // Kleinanzeigen und Immowelt nicht belegt.
    feld: "strasse",
    sprengnetter: "address.street + address.house_number",
    label: "Straße und Hausnummer",
    openimmo: "geo > strasse + hausnummer",
    schritt: 2,
    pflicht: NUR_IS24,
  },
  {
    feld: "plz",
    sprengnetter: "address.zip",
    label: "Postleitzahl",
    openimmo: "geo > plz",
    schritt: 2,
    pflicht: ALLE,
  },
  {
    feld: "stadt",
    sprengnetter: "address.town",
    label: "Ort",
    openimmo: "geo > ort",
    schritt: 2,
    pflicht: ALLE,
  },
  {
    feld: "bundesland",
    label: "Bundesland",
    openimmo: "geo > bundesland",
    schritt: 2,
    pflicht: [],
  },
  {
    feld: "adresse_freigeben",
    label: "Adresse im Inserat zeigen",
    openimmo: "verwaltung_objekt > objektadresse_freigeben",
    schritt: 2,
    pflicht: [],
  },
  {
    // Runde 13 (0091): kein OpenImmo-Element, geht als Freitext mit;
    // ihr eigentlicher Wert ist der Lage-Text (Runde-12-Befund: beide
    // Makler-Beispiele eroeffnen die Lage mit dieser Tatsache)
    feld: "strassenlage",
    label: "Straßenlage",
    openimmo: "freitexte > sonstige_angaben (kein eigenes Element)",
    schritt: 2,
    pflicht: [],
  },
  // Schritt 3: Flächen und Räume
  {
    // Belegt für ImmoScout24 (livingSpace Pflicht im Offer-XSD). Für
    // die anderen beiden nicht belegt, wir führen sie dort trotzdem
    // als Basis: Ein Kauf-Inserat ohne Wohnfläche ist keins.
    feld: "wohnflaeche_qm",
    sprengnetter: "living_area (ETW bis 500, EFH bis 1000, MFH bis 2000)",
    label: "Wohnfläche",
    openimmo: "flaechen > wohnflaeche",
    schritt: 3,
    pflicht: ALLE,
  },
  {
    // Belegt nur für ImmoScout24 (plotArea ist bei houseBuy Pflicht,
    // Offer-XSD). Sichtbar ohnehin nur bei Haus und Mehrfamilienhaus.
    feld: "grundstuecksflaeche_qm",
    sprengnetter: "plot_area (bis 5000)",
    label: "Grundstücksfläche",
    openimmo: "flaechen > grundstuecksflaeche",
    schritt: 3,
    pflicht: NUR_IS24,
  },
  {
    feld: "nutzflaeche_qm",
    label: "Nutzfläche",
    openimmo: "flaechen > nutzflaeche",
    schritt: 3,
    pflicht: [],
  },
  {
    // Belegt für ImmoScout24 (numberOfRooms Pflicht) und Kleinanzeigen
    // (Anzahl der Zimmer, Hilfeseite Schnittstellen)
    feld: "zimmer",
    sprengnetter: "rooms",
    label: "Zimmer",
    openimmo: "flaechen > anzahl_zimmer",
    schritt: 3,
    pflicht: ALLE,
  },
  {
    feld: "schlafzimmer",
    label: "Schlafzimmer",
    openimmo: "flaechen > anzahl_schlafzimmer",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "badezimmer",
    label: "Badezimmer",
    openimmo: "flaechen > anzahl_badezimmer",
    schritt: 3,
    pflicht: [],
  },
  {
    // Nur beim Mehrfamilienhaus sichtbar (feldSichtbar), dort Pflicht.
    // Beim Zweifamilienhaus setzt der Export fest den Wert 2. Die
    // Sprengnetter-Spezifikation kennt kein Wohneinheiten-Feld.
    feld: "anzahl_wohneinheiten",
    label: "Anzahl Wohneinheiten",
    openimmo: "flaechen > anzahl_wohneinheiten",
    schritt: 3,
    pflicht: ALLE,
  },
  {
    // Keine Portal-Pflicht: floor ist im offiziellen IS24-Schema
    // minOccurs=0 (geprüft am 06.08.2026), bleibt empfohlene Angabe
    feld: "etage",
    sprengnetter: "floor (nur ETW)",
    label: "Etage",
    openimmo: "geo > etage",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "etagen_gesamt",
    sprengnetter: "floor_number (nur EFH und MFH)",
    label: "Etagen im Haus",
    openimmo: "geo > anzahl_etagen",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "keller",
    label: "Keller",
    openimmo: "ausstattung > unterkellert",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "kellerflaeche_qm",
    label: "Kellerfläche",
    openimmo: "flaechen > kellerflaeche",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "dachboden",
    label: "Dachboden",
    openimmo: "ausstattung > dachboden",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "dachbodenflaeche_qm",
    label: "Dachbodenfläche",
    openimmo: "flaechen > dachbodenflaeche",
    schritt: 3,
    pflicht: [],
  },
  {
    feld: "einliegerwohnung",
    label: "Einliegerwohnung",
    openimmo: "flaechen > einliegerwohnung",
    schritt: 3,
    pflicht: [],
  },
  {
    // Runde 13 (0091): OpenImmo kennt fuer die Einliegerwohnung nur
    // das Ja-Nein-Element, die Flaeche geht als Freitext mit
    feld: "einliegerwohnung_flaeche_qm",
    label: "Fläche der Einliegerwohnung",
    openimmo: "freitexte > sonstige_angaben (einliegerwohnung ist im Standard boolesch)",
    schritt: 3,
    pflicht: [],
  },
  // Schritt 4: Gebäude und Zustand
  {
    feld: "baujahr",
    sprengnetter: "construction_year (1800 bis 2027)",
    label: "Baujahr",
    openimmo: "zustand_angaben > baujahr",
    schritt: 4,
    pflicht: ALLE,
    geg: true,
  },
  {
    feld: "zustand",
    sprengnetter: "modernization_class (EXTENSIVE, PREDOMINANT, AVERAGE, NONE)",
    label: "Zustand",
    openimmo: "zustand_angaben > zustand[zustand_art]",
    schritt: 4,
    pflicht: [],
  },
  {
    feld: "modernisierung_jahr",
    sprengnetter: "refurbishment_year",
    label: "Letzte Modernisierung",
    openimmo: "zustand_angaben > letztemodernisierung",
    schritt: 4,
    pflicht: [],
  },
  {
    // ALTBAU wird bewusst nie gesetzt: "Bestand" ist keine Aussage
    // über Alt- oder Neubau, nur in_bau wird als NEUBAU übertragen
    feld: "bauphase",
    label: "Bauphase",
    openimmo: "zustand_angaben > alter[alter_attr=NEUBAU] (nur im Bau)",
    schritt: 4,
    pflicht: [],
  },
  {
    // Runde 13 (0091): massiv und klinker gehen als MASSIV,
    // holzstaender und fachwerk als HOLZ, fertighaus als FERTIGTEILE;
    // die genaue Wortwahl (Klinker, Fachwerk) traegt der Freitext
    feld: "bauweise",
    label: "Bauweise",
    openimmo: "ausstattung > bauweise[MASSIV|FERTIGTEILE|HOLZ] + sonstige_angaben",
    schritt: 4,
    pflicht: [],
  },
  {
    feld: "denkmalgeschuetzt",
    label: "Denkmalschutz",
    openimmo: "verwaltung_objekt > denkmalgeschuetzt",
    schritt: 4,
    pflicht: [],
  },
  // Schritt 5: Energie und Heizung
  {
    feld: "energieausweis_typ",
    label: "Energieausweis-Art",
    openimmo: "zustand_angaben > energiepass > epart",
    schritt: 5,
    pflicht: ALLE,
    geg: true,
  },
  {
    feld: "endenergie_kennwert",
    label: "Endenergie-Kennwert",
    openimmo: "energiepass > endenergiebedarf bzw. energieverbrauchkennwert",
    schritt: 5,
    pflicht: ALLE,
    geg: true,
  },
  {
    // GEG Paragraf 87 verlangt die Effizienzklasse in jeder Anzeige
    // für ein Wohngebäude, sobald ein Energieausweis vorliegt
    // (gesetze-im-internet.de/geg/__87.html). Gilt damit für alle
    // Portale, nicht als Portal-Vorgabe, sondern als Gesetz.
    feld: "energieeffizienzklasse",
    label: "Effizienzklasse",
    openimmo: "energiepass > wertklasse",
    schritt: 5,
    pflicht: ALLE,
    geg: true,
  },
  {
    feld: "energie_warmwasser_enthalten",
    label: "Kennwert enthält Warmwasser",
    openimmo: "energiepass > mitwarmwasser",
    schritt: 5,
    pflicht: [],
  },
  {
    feld: "energieausweis_datum",
    label: "Ausstellungsdatum des Ausweises",
    openimmo: "energiepass > ausstelldatum (+ abgeleitet jahrgang)",
    schritt: 5,
    pflicht: [],
  },
  {
    // Kein GEG-Pflichtfeld: Paragraf 87 verlangt das Baujahr des
    // GEBÄUDES laut Ausweis, nicht das der Heizung. Das Feld bleibt
    // als freiwillige Angabe und wird als Freitext übertragen, das
    // OpenImmo-Element energiepass > baujahr meint ebenfalls das
    // Gebäude-Baujahr laut Ausweis.
    feld: "heizung_baujahr",
    label: "Baujahr der Heizung",
    openimmo: "nicht im Standard, Übertragung in freitexte > sonstige_angaben",
    schritt: 5,
    pflicht: [],
  },
  {
    feld: "heizungsart",
    sprengnetter: "equipment.heating (FUSSBODENHEIZUNG, ZENTRALHEIZUNG, EINZELOEFEN, SONSTIGE)",
    label: "Heizungsart",
    openimmo: "ausstattung > heizungsart",
    schritt: 5,
    pflicht: [],
  },
  {
    // Runde 13 (0091): der Eigennamen-Effekt der Beschreibungs-Runde
    // ("Solvis SolarMax" traegt einen Satz); kein Standard-Element
    feld: "heizung_hersteller",
    label: "Heizung, Hersteller und Modell",
    openimmo: "freitexte > sonstige_angaben (kein eigenes Element)",
    schritt: 5,
    pflicht: [],
  },
  {
    // Runde 13 (0091): kein OpenImmo-Element fuer gedaemmte Bauteile,
    // geht als Freitext mit; grosser Erzaehlwert fuer die Energie-Texte
    feld: "daemmung",
    label: "Dämmung",
    openimmo: "freitexte > sonstige_angaben (kein eigenes Element)",
    schritt: 5,
    pflicht: [],
  },
  {
    feld: "daemmung_jahr",
    label: "Jahr der Dämmung",
    openimmo: "freitexte > sonstige_angaben (kein eigenes Element)",
    schritt: 5,
    pflicht: [],
  },
  {
    feld: "energietraeger",
    label: "Wesentlicher Energieträger",
    openimmo: "ausstattung > befeuerung",
    schritt: 5,
    pflicht: ALLE,
    geg: true,
  },
  // Schritt 6: Ausstattung
  {
    feld: "balkon",
    sprengnetter: "equipment.residential_area",
    label: "Balkon",
    openimmo: "flaechen > anzahl_balkone",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "terrasse",
    sprengnetter: "equipment.residential_area",
    label: "Terrasse",
    openimmo: "flaechen > anzahl_terrassen",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "garten",
    label: "Garten oder Gartennutzung",
    openimmo: "ausstattung > gartennutzung",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "balkon_terrasse_flaeche_qm",
    label: "Balkon- und Terrassenfläche",
    openimmo: "flaechen > balkon_terrasse_flaeche",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "gartenflaeche_qm",
    label: "Gartenfläche",
    openimmo: "flaechen > gartenflaeche",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "balkon_terrasse_ausrichtung",
    label: "Ausrichtung Balkon und Terrasse",
    openimmo: "ausstattung > ausricht_balkon_terrasse",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "bad",
    label: "Bad-Merkmale",
    openimmo: "ausstattung > bad[WANNE, DUSCHE, FENSTER]",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "weitere_ausstattung",
    label: "Weitere Ausstattung",
    openimmo:
      "ausstattung > klimatisiert, rolladen, abstellraum, fahrradraum, wasch_trockenraum, wintergarten, sauna, swimmingpool",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "aufzug",
    sprengnetter: "elevator (nur ETW)",
    label: "Aufzug",
    openimmo: "ausstattung > fahrstuhl[PERSONEN]",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "einbaukueche",
    label: "Einbauküche",
    openimmo: "ausstattung > kueche[EBK]",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "gaeste_wc",
    sprengnetter: "equipment.guest_toilet",
    label: "Gäste-WC",
    openimmo: "ausstattung > gaestewc",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "barrierefrei",
    label: "Barrierefrei",
    openimmo: "ausstattung > barrierefrei",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "kamin",
    label: "Kamin",
    openimmo: "ausstattung > kamin",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "fussboden",
    sprengnetter: "equipment.floor (PARKETT_NATURSTEIN, FLIESEN, TEPPICH_LAMINAT, KUNSTSTOFF_PVC)",
    label: "Fußböden",
    openimmo: "ausstattung > boden",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "stellplaetze",
    sprengnetter: "garages bzw. outdoor_parking_space",
    label: "Stellplätze",
    openimmo: "preise > stp_garage/stp_tiefgarage/stp_carport/stp_freiplatz/stp_parkhaus/stp_duplex [anzahl]",
    schritt: 6,
    pflicht: [],
  },
  {
    feld: "ausstattungsqualitaet",
    sprengnetter: "equipment.value (EINFACH, MITTEL, GEHOBEN, STARK_GEHOBEN)",
    label: "Ausstattungs-Qualität",
    openimmo: "ausstattung > ausstatt_kategorie",
    schritt: 6,
    pflicht: [],
  },
  // Schritt 7: Preis, Kosten, Verfügbarkeit, Texte
  {
    // Belegt für ImmoScout24 (price.value und currency) und
    // Kleinanzeigen (Kaufpreis, mindestens 1 Euro)
    feld: "angebotspreis",
    sprengnetter: "meta.asking_price (Wunschpreis für die Einordnung)",
    label: "Angebotspreis",
    openimmo: "preise > kaufpreis",
    schritt: 7,
    pflicht: ALLE,
  },
  {
    // Keine Portal-Pflicht: serviceCharge ist im offiziellen
    // IS24-Schema minOccurs=0 (geprüft am 06.08.2026)
    feld: "hausgeld",
    label: "Hausgeld je Monat",
    openimmo: "preise > hausgeld",
    schritt: 7,
    pflicht: [],
  },
  {
    // Der Standard kennt seit 1.2.6 preise > ruecklagenetto, die
    // offizielle Beispieldatei markiert die 1.2.6-Kostenelemente aber
    // als "erst nach Zertifizierung". Bis das geklärt ist, übertragen
    // wir den Betrag als Freitext (siehe docs/openimmo-abgleich.md).
    feld: "ruecklage_anteil",
    label: "Anteil Instandhaltungs-Rücklage",
    openimmo: "preise > ruecklagenetto (derzeit Freitext in sonstige_angaben)",
    schritt: 7,
    pflicht: [],
  },
  {
    feld: "vermietet",
    label: "Aktuell vermietet",
    openimmo: "verwaltung_objekt > vermietet",
    schritt: 7,
    pflicht: [],
  },
  {
    // Runde 13 (0091): lange Mietdauer ist ein Qualitaetsbeleg
    // (Runde-12-Befund am Makler-Beispiel "Erstmieter seit 1972")
    feld: "vermietet_seit",
    label: "Vermietet seit",
    openimmo: "freitexte > sonstige_angaben (kein eigenes Element)",
    schritt: 7,
    pflicht: [],
  },
  {
    feld: "kaltmiete",
    label: "Aktuelle Kaltmiete",
    openimmo: "preise > mieteinnahmen_ist (Monat)",
    schritt: 7,
    pflicht: [],
  },
  {
    feld: "mieteinnahmen_jahr",
    label: "Mieteinnahmen je Jahr",
    openimmo: "preise > mieteinnahmen_ist[periode=JAHR]",
    schritt: 7,
    pflicht: [],
  },
  {
    // Provisions-Aussage: Der Wert kommt nicht aus der Objektmaske,
    // sondern aus lib/provision.ts (Regelfall provisionsfrei, im
    // Sonderfall die vom Team gesetzte Innen-Courtage). Er steht hier,
    // damit die Zusammenfassung ihn zeigt und die Portal-Prüfung ihn
    // als Pflichtangabe führen kann.
    feld: "innen_courtage",
    label: "Provision",
    openimmo:
      "preise > provisionspflichtig + aussen_courtage + innen_courtage + courtage_hinweis",
    schritt: 7,
    // KEINE Kunden-Pflicht: Der Regelfall (provisionsfrei) ist bereits
    // eine vollständige Aussage, hier fehlt nie etwas. Dass die Angabe
    // im Export tatsächlich ankommt, prüft SYSTEM_ANFORDERUNGEN.
    pflicht: [],
  },
  {
    // preise > erbpacht ist im Standard ein BETRAG (die laufende
    // Erbpacht), kein Kennzeichen. Die Kennzeichnung läuft über das
    // Attribut ERBPACHT der vermarktungsart, plus Hinweis im Freitext.
    feld: "erbbaurecht",
    label: "Erbbaurecht",
    openimmo: "objektkategorie > vermarktungsart[ERBPACHT] + sonstige_angaben",
    schritt: 7,
    pflicht: [],
  },
  {
    feld: "bezugsfrei_typ",
    label: "Bezugsfrei",
    openimmo: "verwaltung_objekt > verfuegbar_ab",
    schritt: 7,
    pflicht: [],
  },
  // Schritt 8: Die Texte fürs Inserat (Runde 13, eigener Schritt)
  {
    // NICHT von den Portalen belegt, sondern unsere eigene
    // redaktionelle Vorgabe: Ein Inserat ohne Beschreibungstext
    // verkauft nicht. Bewusst gekennzeichnet, damit niemand sie für
    // eine Portal-Anforderung hält.
    feld: "beschreibung_objekt",
    label: "Objektbeschreibung",
    openimmo: "freitexte > objektbeschreibung",
    schritt: 8,
    pflicht: ALLE,
  },
  {
    feld: "beschreibung_lage",
    label: "Lagebeschreibung",
    openimmo: "freitexte > lage",
    schritt: 8,
    pflicht: [],
  },
  {
    feld: "beschreibung_ausstattung",
    label: "Ausstattungs-Beschreibung",
    openimmo: "freitexte > ausstatt_beschr",
    schritt: 8,
    pflicht: [],
  },
  {
    feld: "beschreibung_sonstiges",
    label: "Sonstige Angaben",
    openimmo: "freitexte > sonstige_angaben",
    schritt: 8,
    pflicht: [],
  },
];

/** Ist der Wert eines Feldes inhaltlich gefüllt? */
export function feldGefuellt(objekt: Objekt, feld: keyof Objekt & string): boolean {
  const wert = objekt[feld];
  if (wert === null || wert === undefined) return false;
  if (typeof wert === "string") return wert.trim().length > 0;
  if (Array.isArray(wert)) return wert.length > 0;
  // Objekt-Felder wie die Stellplaetze zaehlen mit mindestens einem Eintrag
  if (typeof wert === "object") return Object.keys(wert).length > 0;
  // boolean zählt als beantwortet, auch bei Nein
  return true;
}

/**
 * Gilt die Pflicht dieses Feldes für dieses Objekt überhaupt?
 * Bündelt die fachlichen Ausnahmen an einem Ort:
 * - bedingte Felder je Objektart (siehe feldSichtbar)
 * - Energie-Kennwert und Klasse entfallen bei GEG-Befreiung
 * - Energie-Pflichtangaben entfallen für Objekte in Planung
 */
export function pflichtGilt(
  zuordnung: FeldZuordnung,
  objekt: Objekt
): boolean {
  if (!feldSichtbar(zuordnung.feld, objekt.objektart as Objektart)) return false;
  /* Ohne vorliegenden Ausweis (GEG-Befreiung oder "liegt zur
     Besichtigung vor", Runde 13) gibt es Kennwert, Klasse und
     Ausstellungsdatum nicht; GEG Paragraf 87 knuepft die
     Anzeigenpflicht ans Vorliegen. Der Energietraeger bleibt bewusst
     Pflicht: Womit geheizt wird, weiss der Verkaeufer auch ohne
     Ausweis, und die Portale erwarten die Angabe. */
  const ohneAusweis = AUSWEIS_OHNE_DATEN.includes(
    objekt.energieausweis_typ ?? ""
  );
  if (
    ohneAusweis &&
    ["endenergie_kennwert", "energieeffizienzklasse", "energieausweis_datum"].includes(
      zuordnung.feld
    )
  ) {
    return false;
  }
  if (objekt.bauphase === "in_planung" && zuordnung.geg) return false;
  return true;
}

/**
 * Zählt ein LEERES Feld für dieses Objekt als offene Angabe?
 *
 * Der Runde-13-Befund: Kopfzeile und Blöcke zählten Felder als offen,
 * die der Kunde gar nicht schließen kann. Am Prüfobjekt stand
 * "noch 2 Angaben offen" für die Kaltmiete (das Feld erscheint nur
 * bei vermietet) und die Innenprovision (pflegt allein das Team, die
 * Maske hat kein Feld). Ein Zähler, dessen Rest sich nicht auflösen
 * lässt, ist der Widerspruch, der Kunden anrufen lässt.
 *
 * Deshalb trennt diese Funktion die ZÄHLUNG von der ANZEIGE:
 * pflichtGilt bestimmt weiter, welche GEFÜLLTEN Angaben gezeigt
 * werden (eine gesetzte Provision bleibt sichtbar); hier steht, ob
 * ihr FEHLEN dem Kunden als Lücke vorgehalten wird. Folge-Angaben
 * zählen nur, wenn ihre Voraussetzung angekreuzt ist.
 */
export function angabeErwartet(
  zuordnung: FeldZuordnung,
  objekt: Objekt
): boolean {
  if (!pflichtGilt(zuordnung, objekt)) return false;
  const feld = zuordnung.feld;
  // Vom Team gepflegt, nie eine offene Angabe des Kunden
  if (feld === "innen_courtage") return false;
  // Miet-Angaben nur, wenn wirklich vermietet ist
  if (["kaltmiete", "mieteinnahmen_jahr", "vermietet_seit"].includes(feld)) {
    return objekt.vermietet === true;
  }
  // Folge-Angaben nur mit ihrer Voraussetzung
  if (feld === "kellerflaeche_qm") return objekt.keller === true;
  if (feld === "dachbodenflaeche_qm") return objekt.dachboden === true;
  if (feld === "einliegerwohnung_flaeche_qm") return objekt.einliegerwohnung === true;
  if (feld === "daemmung_jahr") return (objekt.daemmung ?? []).length > 0;
  if (feld === "balkon_terrasse_flaeche_qm" || feld === "balkon_terrasse_ausrichtung") {
    return objekt.balkon || objekt.terrasse;
  }
  if (feld === "gartenflaeche_qm") return objekt.garten === true;
  return true;
}

/**
 * Anforderungen, die NICHT aus einem Kundenfeld kommen, sondern die
 * der Export selbst erfüllt. Sie stehen hier, damit ein künftiger
 * Umbau sie nicht still verliert: Jede wird bei der Portal-Prüfung
 * mitgeprüft und taucht auf, wenn sie fehlt.
 */
export type SystemAnforderung = {
  titel: string;
  /** Woher die Anforderung stammt, wörtlich nachvollziehbar */
  quelle: string;
  /** Portale, für die sie gilt */
  portale: PortalId[];
  erfuellt: (objekt: Objekt) => boolean;
  /** Was zu tun wäre, falls sie einmal nicht erfüllt ist */
  fehlt: string;
};

export const SYSTEM_ANFORDERUNGEN: SystemAnforderung[] = [
  {
    titel: "Provisions-Aussage",
    quelle:
      "ImmoScout24: courtage mit hasCourtage ist im Offer-XSD Pflicht. Für alle Portale zusätzlich der Suchfilter provisionsfrei, unser stärkstes Verkaufsargument.",
    portale: ALLE,
    // Liefert lib/provision.ts, im Regelfall provisionsfrei. Kann nur
    // leer sein, wenn dort jemand die Texte entfernt.
    erfuellt: (o) => provisionsAngabe(o).aussenCourtage.trim().length > 0,
    fehlt: "Im Export fehlt die Courtage-Angabe (siehe lib/provision.ts).",
  },
  {
    titel: "Kontaktweg für Anfragen",
    quelle:
      "OpenImmo: kontaktperson ist Pflicht und verlangt mindestens einen Kontaktweg. ImmoScout24 nennt fehlende Kontakt-E-Mail als typischen Fehler.",
    portale: ALLE,
    // Der Export setzt die objektbezogene Schutz-Adresse, sonst das
    // Team-Postfach; beides ist immer vorhanden.
    erfuellt: () => true,
    fehlt: "Es ist keine Anfragen-Adresse hinterlegt.",
  },
];

export type PortalStatus = {
  portal: (typeof PORTALE)[number];
  bereit: boolean;
  /** Fehlende Angaben aus der Objektmaske */
  fehlend: FeldZuordnung[];
  /** Fehlende Systemangaben, im Normalbetrieb leer */
  fehlendeSystem: SystemAnforderung[];
  /**
   * Für dieses Portal gibt es keine öffentlich belegte Feldliste. Die
   * Prüfung stützt sich dann nur auf die gemeinsame Basis, und das
   * sagen wir auch statt Vollständigkeit zu behaupten.
   */
  nurBasis: boolean;
};

/**
 * Portale, für die es keine öffentlich belegte Pflichtfeld-Liste gibt.
 * Recherche vom 06.08.2026: Immowelt hat keine erreichbare
 * Import-Dokumentation mehr (support.immowelt.de ist offline, die
 * öffentliche API ist eine reine Such-API). Für diese Portale prüfen
 * wir die gemeinsame Basis und weisen sichtbar darauf hin, statt eine
 * Vollständigkeit zu behaupten, die niemand belegen kann.
 */
export const PORTALE_OHNE_BELEGTE_LISTE: PortalId[] = ["immowelt"];

/**
 * "Portal-bereit"-Status je Portal: welche Pflichtangaben fehlen noch?
 *
 * Die Liste ist dreiteilig aufgebaut: eine gemeinsame Basis (OpenImmo
 * plus die gesetzlichen Angaben nach GEG Paragraf 87) und je Portal
 * eigene Zusätze, alles über das Feld pflicht in FELD_ZUORDNUNGEN.
 * Ein Portal meldet nur dann "Bereit", wenn ALLE seine Anforderungen
 * vorliegen.
 */
export function portalBereitschaft(objekt: Objekt): PortalStatus[] {
  return PORTALE.map((portal) => {
    const fehlend = FELD_ZUORDNUNGEN.filter(
      (z) =>
        z.pflicht.includes(portal.id) &&
        angabeErwartet(z, objekt) &&
        !feldGefuellt(objekt, z.feld)
    );
    const fehlendeSystem = SYSTEM_ANFORDERUNGEN.filter(
      (a) => a.portale.includes(portal.id) && !a.erfuellt(objekt)
    );
    return {
      portal,
      bereit: fehlend.length === 0 && fehlendeSystem.length === 0,
      fehlend,
      fehlendeSystem,
      nurBasis: PORTALE_OHNE_BELEGTE_LISTE.includes(portal.id),
    };
  });
}

/**
 * Alle noch fehlenden Portal-Pflichtangaben, portalübergreifend und in
 * Assistenten-Reihenfolge. Die EINE Quelle für die Kennzeichnung in der
 * Zusammenfassung und den Zähler darüber; portalBereitschaft nutzt
 * dieselben Prädikate, dadurch bleiben Karte und Kennzeichnung
 * zwangsläufig konsistent.
 */
export function fehlendePortalPflicht(objekt: Objekt): FeldZuordnung[] {
  return FELD_ZUORDNUNGEN.filter(
    (z) =>
      z.pflicht.length > 0 &&
      angabeErwartet(z, objekt) &&
      !feldGefuellt(objekt, z.feld)
  );
}

/**
 * Vollständigkeit über alle Felder eines Schritts hinweg, für die
 * Zusammenfassung ("12 von 14 Angaben") und den Fortschritt.
 */
export function schrittVollstaendigkeit(
  objekt: Objekt,
  schritt: number
): { gefuellt: number; gesamt: number } {
  const felder = FELD_ZUORDNUNGEN.filter(
    (z) =>
      z.schritt === schritt &&
      feldSichtbar(z.feld, objekt.objektart as Objektart)
  );
  const gefuellt = felder.filter((z) => feldGefuellt(objekt, z.feld)).length;
  return { gefuellt, gesamt: felder.length };
}
