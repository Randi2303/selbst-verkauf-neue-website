/**
 * OpenImmo-Export (Version 1.2.7).
 *
 * Erzeugt aus einem erfassten Objekt die XML-Datei, die Kleinanzeigen
 * und Immowelt als Übergabeformat erwarten. Geprüft wird jeder Export
 * gegen das offizielle Schema (npm run openimmo:pruefen, siehe
 * scripts/openimmo-validierung.mjs). ImmoScout24 wird später über die
 * eigene REST-API beliefert (lib/portale/immoscout24.ts); beide Wege
 * lesen ausschließlich dasselbe Feldmodell aus lib/objekt-felder.ts.
 *
 * Systempflichten laut openimmo_127d.xsd, die der Export selbst
 * liefert (unabhängig von den Kundenangaben):
 *   uebertragung[art, umfang, version, sendersoftware, senderversion]
 *   anbieter > firma, openimmo_anid
 *   immobilie > objektkategorie (nutzungsart[WOHNEN, GEWERBE],
 *     vermarktungsart[KAUF, MIETE_PACHT], objektart)
 *   immobilie > geo (mindestens plz oder ort)
 *   immobilie > kontaktperson (email_zentrale + name)
 *   immobilie > verwaltung_techn (objektnr_extern, aktion,
 *     openimmo_obid, stand_vom)
 * Die ELEMENT-REIHENFOLGE in jedem Block folgt exakt der XSD-Sequenz,
 * sie ist validierungsrelevant.
 */
import { portalHinweis } from "@/config/bieterverfahren";
import { ueberschriftUeberschreitungen } from "@/config/ki-texte";
import {
  bestaetigteUmgebung,
  schulform,
  type Umgebungspunkt,
} from "@/config/umgebung";
import { exportDateiName, portalTitel } from "@/lib/dateiname";
import { oeffentlichZeigbar, sortierteFotos, type Unterlage } from "@/lib/unterlagen";
import {
  BAUWEISEN,
  DAEMMUNG_WERTE,
  STRASSENLAGEN,
  objekttypLabel,
  stellplaetzeGesamt,
  wertLabel,
  ZUSTAND_WERTE,
  type Objekt,
} from "@/lib/objekt-felder";
import { provisionsAngabe } from "@/lib/provision";

/** XML-Sonderzeichen sichern */
function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ein Element nur ausgeben, wenn ein Wert vorhanden ist */
function el(name: string, wert: string | number | null | undefined): string {
  if (wert === null || wert === undefined || wert === "") return "";
  return `<${name}>${xml(String(wert))}</${name}>`;
}

function jaNein(wert: boolean): string {
  return wert ? "true" : "false";
}

/**
 * Objekttyp auf die OpenImmo-Attributwerte abbilden.
 *
 * Jeder Wert stammt EXAKT aus dem haustyp-Enum der offiziellen
 * openimmo_127d.xsd (geprüft am 06.08.2026). Achtung Standard-Eigenheit:
 * Die Reihenhaus-Werte heißen REIHENMITTEL und REIHENEND, NICHT
 * REIHENMITTELHAUS oder REIHENENDHAUS. Es gibt bewusst keinen
 * Sammel- oder Fallback-Wert: ein Typ ohne Eintrag hier darf in
 * lib/objekt-felder.ts gar nicht erst wählbar sein, openImmoTyp()
 * unten wirft sonst einen Fehler statt still etwas Falsches zu senden.
 */
const HAUSTYP: Record<string, string> = {
  einfamilienhaus: "EINFAMILIENHAUS",
  zweifamilienhaus: "ZWEIFAMILIENHAUS",
  doppelhaushaelfte: "DOPPELHAUSHAELFTE",
  reihenmittelhaus: "REIHENMITTEL",
  reihenendhaus: "REIHENEND",
  villa: "VILLA",
  bungalow: "BUNGALOW",
  mehrfamilienhaus: "MEHRFAMILIENHAUS",
};

/** Werte exakt aus dem wohnungtyp-Enum der openimmo_127d.xsd */
const WOHNUNGTYP: Record<string, string> = {
  etagenwohnung: "ETAGE",
  erdgeschosswohnung: "ERDGESCHOSS",
  dachgeschosswohnung: "DACHGESCHOSS",
  maisonette: "MAISONETTE",
  penthouse: "PENTHOUSE",
  souterrain: "SOUTERRAIN",
};

/**
 * Standard-Wert zum gewählten Objekttyp, streng: Ein unbekannter oder
 * fehlender Typ bricht den Export ab, damit niemals ein Objekt in der
 * falschen Portal-Kategorie landet.
 */
function openImmoTyp(tabelle: Record<string, string>, typ: string | null): string {
  const wert = typ ? tabelle[typ] : undefined;
  if (!wert) {
    throw new Error(
      `Für den Objekttyp "${typ ?? "ohne Angabe"}" gibt es keine OpenImmo-Zuordnung. Bitte den Objekttyp im Schritt Objektart wählen.`
    );
  }
  return wert;
}

/**
 * Werte exakt aus dem zustand_art-Enum der openimmo_127d.xsd (geprüft
 * am 06.08.2026 gegen das offizielle Schema in docs/openimmo-1.2.7).
 * Renovierungsbedürftig heißt im Standard TEIL_VOLLRENOVIERUNGSBED,
 * Sanierungsbedürftig hat seit 1.2.5 den eigenen Wert
 * SANIERUNGSBEDUERFTIG (Abgrenzung Substanz gegen Oberflächen).
 */
const ZUSTAND_ART: Record<string, string> = {
  erstbezug: "ERSTBEZUG",
  neuwertig: "NEUWERTIG",
  modernisiert: "MODERNISIERT",
  voll_saniert: "VOLL_SANIERT",
  teil_saniert: "TEIL_SANIERT",
  renoviert: "TEIL_VOLLRENOVIERT",
  gepflegt: "GEPFLEGT",
  renovierungsbeduerftig: "TEIL_VOLLRENOVIERUNGSBED",
  sanierungsbeduerftig: "SANIERUNGSBEDUERFTIG",
  rohbau: "ROHBAU",
  abrissobjekt: "ABRISSOBJEKT",
};

/**
 * Attribute der befeuerung exakt aus der openimmo_127d.xsd. GAS meint
 * dort Erdgas (leitungsgebunden), FLUESSIGGAS den eigenen Tank; ein
 * unscharfes "Gas" gibt es bei uns deshalb nicht mehr. Die generische
 * Wärmepumpe wird als LUFTWP übertragen (Luft-Wasser, der häufigste
 * Fall), die Sole-Wasser-Wärmepumpe steckt im eigenen Wert erdwaerme.
 */
const BEFEUERUNG: Record<string, string> = {
  erdgas: "GAS",
  fluessiggas: "FLUESSIGGAS",
  oel: "OEL",
  fernwaerme: "FERN",
  nahwaerme: "NAHWAERME",
  strom: "ELEKTRO",
  waermepumpe: "LUFTWP",
  erdwaerme: "ERDWAERME",
  solar: "SOLAR",
  pellets: "PELLET",
  holz: "HOLZ",
};

const HEIZUNGSART_ATTR: Record<string, string> = {
  zentralheizung: "ZENTRAL",
  etagenheizung: "ETAGE",
  fussbodenheizung: "FUSSBODEN",
  ofenheizung: "OFEN",
  fernheizung: "FERN",
};

const BODEN_ATTR: Record<string, string> = {
  fliesen: "FLIESEN",
  parkett: "PARKETT",
  laminat: "LAMINAT",
  teppich: "TEPPICH",
  vinyl: "KUNSTSTOFF",
  dielen: "DIELEN",
  stein: "STEIN",
};

/** Attribute des Elements bad (Mehrfachauswahl) */
const BAD_ATTR: Record<string, string> = {
  wanne: "WANNE",
  dusche: "DUSCHE",
  fenster: "FENSTER",
};

/** Attribute von ausricht_balkon_terrasse (Mehrfachauswahl) */
const AUSRICHTUNG_ATTR: Record<string, string> = {
  nord: "NORD",
  nordost: "NORDOST",
  ost: "OST",
  suedost: "SUEDOST",
  sued: "SUED",
  suedwest: "SUEDWEST",
  west: "WEST",
  nordwest: "NORDWEST",
};

/**
 * Weitere Ausstattung: je Wert ein eigenes boolesches Element in der
 * ausstattung. Die Liste steht in XSD-SEQUENZ-Reihenfolge, klimatisiert
 * kommt vor den Elementen nach stellplatzart, der Rest folgt weiter
 * hinten (siehe Aufbau in openImmoXml).
 */
const WEITERE_ELEMENTE: { wert: string; element: string }[] = [
  { wert: "sauna", element: "sauna" },
  { wert: "swimmingpool", element: "swimmingpool" },
  { wert: "wasch_trockenraum", element: "wasch_trockenraum" },
  { wert: "wintergarten", element: "wintergarten" },
];

const WEITERE_NACH_UNTERKELLERT: { wert: string; element: string }[] = [
  { wert: "abstellraum", element: "abstellraum" },
  { wert: "fahrradraum", element: "fahrradraum" },
  { wert: "rollaeden", element: "rolladen" },
];

/**
 * Stellplaetze nach OpenImmo: je Art ein eigenes stp_-Element unter
 * preise mit Attribut anzahl (xsd:int). Die REIHENFOLGE entspricht
 * exakt der XSD-Sequenz (validierungsrelevant): stp_carport,
 * stp_duplex, stp_freiplatz, stp_garage, stp_parkhaus, stp_tiefgarage.
 * Zusaetzlich nennt die ausstattung die Arten als stellplatzart-Flags
 * und die flaechen die Gesamtanzahl (anzahl_stellplaetze), beides laut
 * XSD-Doku die einfachen Alternativen zu den stp_-Elementen.
 */
const STP_SEQUENZ: { art: string; element: string; flag: string }[] = [
  { art: "carport", element: "stp_carport", flag: "CARPORT" },
  { art: "duplex", element: "stp_duplex", flag: "DUPLEX" },
  { art: "aussenstellplatz", element: "stp_freiplatz", flag: "FREIPLATZ" },
  { art: "garage", element: "stp_garage", flag: "GARAGE" },
  { art: "parkhaus", element: "stp_parkhaus", flag: "PARKHAUS" },
  { art: "tiefgarage", element: "stp_tiefgarage", flag: "TIEFGARAGE" },
];

const AUSSTATT_KATEGORIE: Record<string, string> = {
  einfach: "STANDARD",
  normal: "STANDARD",
  gehoben: "GEHOBEN",
  luxus: "LUXUS",
};

/**
 * Bauweise (Runde 13): Das XSD kennt am Element bauweise genau die
 * Attribute MASSIV, FERTIGTEILE und HOLZ. Klinker ist massiv gebaut,
 * Fachwerk ist eine Holzkonstruktion; die genaue Wortwahl geht
 * zusaetzlich als Freitext mit (sonstige_angaben).
 */
const BAUWEISE_ATTR: Record<string, string> = {
  massiv: "MASSIV",
  klinker: "MASSIV",
  holzstaender: "HOLZ",
  fachwerk: "HOLZ",
  fertighaus: "FERTIGTEILE",
};

/**
 * wertklasse ist im XSD freier Text; die offizielle Beispieldatei
 * nutzt die Klartext-Schreibweise des Ausweises ("C"), deshalb "A+"
 * statt eines erfundenen Codes wie A_PLUS.
 */
const WERTKLASSE: Record<string, string> = {
  a_plus: "A+",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  e: "E",
  f: "F",
  g: "G",
  h: "H",
};

/** Grammatisches Geschlecht je Objekttyp für die Adjektiv-Endung im Titel */
const GENUS: Record<string, "m" | "f" | "n"> = {
  etagenwohnung: "f",
  erdgeschosswohnung: "f",
  dachgeschosswohnung: "f",
  maisonette: "f",
  penthouse: "n",
  souterrain: "n",
  einfamilienhaus: "n",
  zweifamilienhaus: "n",
  doppelhaushaelfte: "f",
  reihenmittelhaus: "n",
  reihenendhaus: "n",
  villa: "f",
  bungalow: "m",
  mehrfamilienhaus: "n",
};

/**
 * Zustaende, deren Label ein Hauptwort ist: sie taugen nicht als
 * vorangestelltes Adjektiv und werden stattdessen angehaengt
 * ("Einfamilienhaus in Ahlen, Rohbau, 140 m²").
 */
const ZUSTAND_HAUPTWORT = ["erstbezug", "rohbau", "abrissobjekt"];

/**
 * Inserats-Überschrift: Seit Migration 0048 pflegt der Kunde sie als
 * eigenes Feld (mit KI-Vorschlag); die Ableitung aus den Daten bleibt
 * der Rueckfall fuer leere Felder.
 *
 * SEIT RUNDE 12 haelt der Rueckfall die strengste belegte
 * Portal-Grenze ein (UEBERSCHRIFT_HOECHSTZEICHEN, Kleinanzeigen 65),
 * und zwar BAUSTEINWEISE: Erst faellt die Zimmerzahl weg, dann die
 * Flaeche, dann der Zustand, zuletzt der Ort. Nie mitten im Wort,
 * denn abgeschnitten wird sonst beim Portal, und Abgeschnittenes ist
 * schlimmer als Kurzes. Ein selbst gepflegter Titel wird NICHT
 * angefasst: Kundentext bleibt Kundentext.
 */
export function inseratsTitel(objekt: Objekt): string {
  const eigener = objekt.inserat_ueberschrift?.trim();
  if (eigener) return eigener;
  const typ = objekttypLabel(objekt.objekttyp) || "Immobilie";
  const genus = GENUS[objekt.objekttyp ?? ""] ?? "f";
  const endung = genus === "n" ? "es" : genus === "m" ? "er" : "e";
  const hauptwort = objekt.zustand && ZUSTAND_HAUPTWORT.includes(objekt.zustand);
  // Adjektivische Zustands-Labels stehen in Grundform voran, die
  // Hauptwoerter (Erstbezug, Rohbau, Abrissobjekt) werden angehaengt
  const zustandAdjektiv =
    objekt.zustand && !hauptwort
      ? `${wertLabel(ZUSTAND_WERTE, objekt.zustand)}${endung} `
      : "";
  const ort = objekt.stadt ? ` in ${objekt.stadt}` : "";
  const zusatz = hauptwort ? `, ${wertLabel(ZUSTAND_WERTE, objekt.zustand)}` : "";
  const flaeche = objekt.wohnflaeche_qm ? `, ${objekt.wohnflaeche_qm} m²` : "";
  const zimmer = objekt.zimmer ? `, ${objekt.zimmer} Zimmer` : "";
  // Vom Vollbild zur knappsten Form; die erste Stufe, die passt, gilt
  const stufen = [
    `${zustandAdjektiv}${typ}${ort}${zusatz}${flaeche}${zimmer}`,
    `${zustandAdjektiv}${typ}${ort}${zusatz}${flaeche}`,
    `${zustandAdjektiv}${typ}${ort}${zusatz}`,
    `${typ}${ort}`,
    typ,
  ];
  for (const stufe of stufen) {
    const titel = stufe.replace(/^\s+/, "");
    /* Prueft BEIDE Grenzarten: die 65 Zeichen von Kleinanzeigen und
       die 100 IS24-Bytes (Umlaute zaehlen dort doppelt) */
    if (ueberschriftUeberschreitungen(titel).length === 0) return titel;
  }
  return typ;
}

/** Bezugsfrei-Angabe als Text, wie sie die Portale zeigen */
function verfuegbarAb(objekt: Objekt): string {
  if (objekt.bezugsfrei_typ === "sofort") return "sofort";
  if (objekt.bezugsfrei_typ === "nach_vereinbarung") return "nach Vereinbarung";
  if (objekt.bezugsfrei_typ === "zum_datum" && objekt.bezugsfrei_datum) {
    const [jahr, monat, tag] = objekt.bezugsfrei_datum.split("-");
    return `${tag}.${monat}.${jahr}`;
  }
  return "";
}

/**
 * Straße und Hausnummer trennen: OpenImmo führt beide als eigene
 * Elemente. Erkannt wird ein abschließender Nummernblock wie "5",
 * "12a" oder "3-5"; ohne Treffer bleibt alles in strasse, das ist
 * schema-gültig (hausnummer ist optional).
 */
export function strasseHausnummer(eingabe: string | null): {
  strasse: string | null;
  hausnummer: string | null;
} {
  const text = (eingabe ?? "").trim();
  if (!text) return { strasse: null, hausnummer: null };
  const treffer = text.match(
    /^(.*?)[,\s]+(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/
  );
  if (!treffer) return { strasse: text, hausnummer: null };
  return { strasse: treffer[1].trim(), hausnummer: treffer[2].trim() };
}

/**
 * energiepass > jahrgang aus dem Ausstellungsdatum ableiten. Laut
 * XSD-Kommentar: "2008" = ausgestellt vor dem 01.05.2014, "2014" = ab
 * dem 01.05.2014. Für den neuen Wert "2026" (Version 1.2.7d) ist die
 * Datumsgrenze nicht dokumentiert; ab dem 01.05.2026 ausgestellte
 * Ausweise werden deshalb OHNE jahrgang übertragen statt zu raten
 * (offener Punkt in docs/openimmo-abgleich.md).
 */
export function energiepassJahrgang(datum: string | null): string | null {
  if (!datum) return null;
  if (datum < "2014-05-01") return "2008";
  if (datum < "2026-05-01") return "2014";
  return null;
}

/**
 * Ein Bild oder Dokument für den anhaenge-Block des Exports.
 *
 * Die Gruppen stammen aus dem gruppe-Enum der openimmo_127d.xsd:
 * Das Titelbild wird als gruppe="TITELBILD" gekennzeichnet UND steht
 * an erster Stelle der Anhänge, weitere Fotos laufen als BILD,
 * Grundrisse als GRUNDRISS. So übernehmen die Portale verlässlich
 * das gewünschte Aufmacher-Bild.
 */
export type ExportAnhang = {
  dateiname: string;
  gruppe: "TITELBILD" | "BILD" | "GRUNDRISS" | "DOKUMENTE";
  titel?: string;
};

/**
 * Aus den Fotos und Grundrissen eines Objekts die Anhaenge bauen.
 *
 * DER NAME DES KUNDEN GEHT MIT, seit dem 14.08.2026. Das ist der
 * Grund, warum es diese Funktion gibt: In unserem Maklerprogramm
 * tragen die Bilder ihre Namen bis ins Portal, und bei uns soll es
 * genauso sein. Der Standard hat dafuer ein eigenes Element,
 * anhangtitel (xsd:string, ohne Laengenbegrenzung, Zeile 3270 der
 * openimmo_127d.xsd). Gekuerzt wird erst am Portal-Rand, weil
 * ImmoScout24 fuer Bildtitel 30 Zeichen annimmt.
 *
 * DIE ENDUNG GEHT NICHT MIT. Was als Beschriftung erscheint, heisst
 * "Wohnzimmer" und nicht "Wohnzimmer.jpg". Die DATEI behaelt ihre
 * Endung selbstverstaendlich, sie steht in daten > pfad und traegt
 * zusaetzlich die laufende Nummer, damit die Reihenfolge auch im
 * ausgepackten Paket steht (siehe exportDateiName).
 *
 * DAS ERSTE FOTO IST DAS TITELBILD, ohne Sonderregel: Die
 * Reihenfolge bestimmt es (Migration 0067), und ImmoScout24 haelt es
 * ueber die Anhang-Reihenfolge ohnehin genauso.
 */
export function portalAnhaenge(unterlagen: Unterlage[]): ExportAnhang[] {
  const fotos = sortierteFotos(unterlagen).filter(oeffentlichZeigbar);
  const grundrisse = unterlagen.filter(
    (u) => u.typ === "grundrisse" && oeffentlichZeigbar(u) && u.mime.startsWith("image/")
  );

  const bilder: ExportAnhang[] = fotos.map((f, i) => ({
    dateiname: exportDateiName(i + 1, f.datei_name),
    gruppe: i === 0 ? "TITELBILD" : "BILD",
    titel: portalTitel(f.datei_name) || undefined,
  }));

  const plaene: ExportAnhang[] = grundrisse.map((g, i) => ({
    dateiname: exportDateiName(fotos.length + i + 1, g.datei_name),
    gruppe: "GRUNDRISS",
    titel: portalTitel(g.datei_name) || undefined,
  }));

  return [...bilder, ...plaene];
}

/**
 * Rundgang und Video als Anhang, beide als VERWEIS.
 *
 * WAS DER STANDARD DAFUER VORSIEHT (OpenImmo 1.2.7, geprueft in
 * docs/openimmo-1.2.7/openimmo_127d.xsd):
 *
 *   gruppe="PANORAMA"   der 360-Grad-Rundgang
 *   gruppe="FILM"       ein BEILIEGENDES Video (eine Datei)
 *   gruppe="FILMLINK"   ein Link auf ein Video anderswo, laut dem
 *                       Kommentar im Schema ausdruecklich "z.b-
 *                       youtube, sevenload"
 *   geo/virtuelletour   reines Ja/Nein, ob es eine Tour gibt
 *   geo/luftbildern     reines Ja/Nein, ob es Luftbilder gibt
 *
 * Wir nehmen FILMLINK und nicht FILM. Ein Objektvideo wiegt 90 bis
 * 180 MB; das einer Portal-Uebertragung beizulegen ist gegenueber den
 * Portalen nicht durchzusetzen, und wir liefern Videos ohnehin nicht
 * selbst aus (lib/video-einbettung.ts).
 *
 * `location="REMOTE"` heisst im Standard "auf externem Server", die
 * Adresse steht laut Doku im anhangtitel UND im pfad.
 */
function verweisAnhangXml(
  link: string,
  gruppe: "PANORAMA" | "FILMLINK"
): string {
  return [
    `        <anhang location="REMOTE" gruppe="${gruppe}">`,
    `          ${el("anhangtitel", link)}`,
    `          ${el("format", "text/html")}`,
    `          <daten>`,
    `            ${el("pfad", link)}`,
    `          </daten>`,
    `        </anhang>`,
  ].join("\n");
}

/** anhaenge-Block, Titelbild immer zuerst; format ist Pflicht (MIME-Typ) */
function anhaengeXml(
  anhaenge: ExportAnhang[],
  rundgangLink?: string | null,
  filmLink?: string | null
): string {
  if (anhaenge.length === 0 && !rundgangLink && !filmLink) return "";
  const sortiert = [...anhaenge].sort(
    (a, b) => (a.gruppe === "TITELBILD" ? 0 : 1) - (b.gruppe === "TITELBILD" ? 0 : 1)
  );
  const eintraege = sortiert
    .map((a) => {
      const format = a.dateiname.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "image/jpeg";
      return [
        `        <anhang location="EXTERN" gruppe="${a.gruppe}">`,
        a.titel ? `          ${el("anhangtitel", a.titel)}` : "",
        `          ${el("format", format)}`,
        `          <daten>`,
        `            ${el("pfad", a.dateiname)}`,
        `          </daten>`,
        `        </anhang>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  const alle = [
    eintraege,
    rundgangLink ? verweisAnhangXml(rundgangLink, "PANORAMA") : "",
    filmLink ? verweisAnhangXml(filmLink, "FILMLINK") : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `      <anhaenge>\n${alle}\n      </anhaenge>`;
}

/**
 * Das komplette OpenImmo-Dokument für ein Objekt.
 * Leere Angaben werden weggelassen, so sieht man im Probe-Export
 * sofort, was noch fehlt. Die Anhänge (Fotos in Galerie-Reihenfolge,
 * Titelbild zuerst und als TITELBILD gekennzeichnet) übergibt die
 * Portal-Übertragung, TODO Portal-Anbindung: echte Dateien beilegen.
 */
/**
 * Welches Standard-Distanzfeld eine Katalog-Kategorie bedient.
 * Kategorien ohne Eintrag (Spielplatz, Baecker, Apotheke, Arzt, Post)
 * haben im OpenImmo-Standard KEIN Feld; sie erscheinen in Exposé und
 * Objektseite und spaeter im Lagetext, aber nicht in den Distanzen.
 */
const DISTANZ_ZIELE: Record<
  string,
  { element: "distanzen" | "distanzen_sport"; ziel: string } | undefined
> = {
  kindergarten: { element: "distanzen", ziel: "KINDERGAERTEN" },
  grundschule: { element: "distanzen", ziel: "GRUNDSCHULE" },
  supermarkt: { element: "distanzen", ziel: "EINKAUFSMOEGLICHKEITEN" },
  bushaltestelle: { element: "distanzen", ziel: "BUS" },
  /* Jeder railway=station/halt in Deutschland bedient Nahverkehr, das
     Feld US_BAHN (U-/S-/Nahverkehrsbahn) ist damit immer wahr.
     FERNBAHNHOF wird bewusst NIE gesetzt: Ob dort Fernzuege halten,
     geben unsere Daten nicht her, und geraten wird nicht. */
  bahnhof: { element: "distanzen", ziel: "US_BAHN" },
  autobahn: { element: "distanzen", ziel: "AUTOBAHN" },
  restaurant_cafe: { element: "distanzen", ziel: "GASTSTAETTEN" },
  park_wald: { element: "distanzen_sport", ziel: "NAHERHOLUNG" },
  sport_schwimmbad: { element: "distanzen_sport", ziel: "SPORTANLAGEN" },
};

/**
 * Das infrastruktur-Element aus den BESTÄTIGTEN Umgebungspunkten:
 * je Standard-Ziel der naechstgelegene Punkt, Angabe in Kilometern
 * (Luftlinie, wie ueberall). Hand-Eintraege ohne Entfernung koennen
 * hier nicht erscheinen, ein Distanzfeld ohne Distanz gibt es nicht.
 */
function infrastrukturXml(umgebung: Umgebungspunkt[]): string {
  const mitEntfernung = bestaetigteUmgebung(umgebung).filter(
    (p): p is Umgebungspunkt & { entfernung_m: number } => p.entfernung_m != null
  );
  const naechste = new Map<
    string,
    { element: "distanzen" | "distanzen_sport"; ziel: string; km: number }
  >();
  for (const punkt of mitEntfernung) {
    let feld = DISTANZ_ZIELE[punkt.kategorie];
    if (!feld && punkt.kategorie === "weiterfuehrende_schule") {
      /* Schulform aus config/umgebung.ts, mit derselben
         Ausschlussliste wie die Abfrage; sonst kein Eintrag */
      const ziel = schulform(punkt.name);
      if (ziel) feld = { element: "distanzen", ziel };
    }
    if (!feld) continue;
    const km = Math.max(0.1, Math.round(punkt.entfernung_m / 100) / 10);
    const schluessel = `${feld.element}:${feld.ziel}`;
    const bisher = naechste.get(schluessel);
    if (!bisher || km < bisher.km) {
      naechste.set(schluessel, { ...feld, km });
    }
  }
  if (naechste.size === 0) return "";
  const eintraege = [...naechste.values()];
  // XSD-Sequenz in infrastruktur: erst distanzen, dann distanzen_sport
  const zeilen = [
    ...eintraege
      .filter((e) => e.element === "distanzen")
      .map((e) => `        <distanzen distanz_zu="${e.ziel}">${e.km.toFixed(1)}</distanzen>`),
    ...eintraege
      .filter((e) => e.element === "distanzen_sport")
      .map(
        (e) =>
          `        <distanzen_sport distanz_zu_sport="${e.ziel}">${e.km.toFixed(1)}</distanzen_sport>`
      ),
  ];
  return [`      <infrastruktur>`, ...zeilen, `      </infrastruktur>`].join("\n");
}

export function openImmoXml(
  objekt: Objekt,
  anhaenge: ExportAnhang[] = [],
  /**
   * Laeuft fuer dieses Objekt ein Bieterverfahren? Dann traegt der
   * Export das im dafuer vorgesehenen Standard-Element, siehe unten.
   */
  bieterverfahren?: { frist: string; gestartet_am: string | null } | null,
  /** Umgebungspunkte (0088); in den Export gehen NUR bestaetigte */
  umgebung: Umgebungspunkt[] = [],
  /**
   * Die Verkaeuferin oder der Verkaeufer als Ansprechpartner des
   * Inserats (Festlegung des Inhabers, 25.08.2026). Nur der Name;
   * Mail ist IMMER die Schutz-Adresse, eine Telefonnummer geht
   * BEWUSST NIE mit hinaus.
   */
  verkaeufer: { vorname: string | null; nachname: string | null } | null = null
): string {
  const istWohnung = objekt.objektart === "wohnung";
  const heute = new Date().toISOString().slice(0, 10);

  const objektartXml = istWohnung
    ? `<wohnung wohnungtyp="${openImmoTyp(WOHNUNGTYP, objekt.objekttyp)}"/>`
    : `<haus haustyp="${openImmoTyp(HAUSTYP, objekt.objekttyp)}"/>`;

  // Wohneinheiten: beim Mehrfamilienhaus die erfasste Zahl, beim
  // Zweifamilienhaus per Definition zwei, sonst keine Angabe
  const wohneinheiten =
    objekt.objektart === "mehrfamilienhaus"
      ? objekt.anzahl_wohneinheiten
      : objekt.objekttyp === "zweifamilienhaus"
        ? 2
        : null;

  const adresse = strasseHausnummer(objekt.strasse);
  // Eine Quelle für Export, Exposé und Objektansicht
  const provision = provisionsAngabe(objekt);

  const befeuerungAttrs = objekt.energietraeger
    .map((t) => BEFEUERUNG[t])
    .filter(Boolean)
    .map((a) => `${a}="true"`)
    .join(" ");

  const bodenAttrs = objekt.fussboden
    .map((b) => BODEN_ATTR[b])
    .filter(Boolean)
    .map((a) => `${a}="true"`)
    .join(" ");

  const badAttrs = (objekt.bad ?? [])
    .map((b) => BAD_ATTR[b])
    .filter(Boolean)
    .map((a) => `${a}="true"`)
    .join(" ");

  const ausrichtungAttrs = (objekt.balkon_terrasse_ausrichtung ?? [])
    .map((r) => AUSRICHTUNG_ATTR[r])
    .filter(Boolean)
    .map((a) => `${a}="true"`)
    .join(" ");

  const weitere = new Set(objekt.weitere_ausstattung ?? []);

  const heizungAttr = objekt.heizungsart
    ? `${HEIZUNGSART_ATTR[objekt.heizungsart]}="true"`
    : "";

  // Element-Reihenfolge exakt nach der energiepass-Sequenz des XSD:
  // epart, energieverbrauchkennwert, mitwarmwasser, endenergiebedarf,
  // primaerenergietraeger, wertklasse, ausstelldatum, jahrgang,
  // gebaeudeart. Das Element baujahr dort meint das GEBÄUDE-Baujahr
  // laut Ausweis (nur bei Abweichung) und bleibt deshalb leer; das
  // Baujahr der Heizung hat im Standard keinen Platz und läuft als
  // Freitext in sonstige_angaben.
  const istVerbrauch = objekt.energieausweis_typ === "verbrauch";
  /* "Liegt zur Besichtigung vor" (Runde 13): Der Standard kennt dafuer
     jahrgang=bei_besichtigung ($V127b); der Pass traegt dann nur
     diese Aussage und die Gebaeudeart, keine Kennwerte. */
  const energiepass =
    objekt.energieausweis_typ === "bei_besichtigung"
      ? [
          "<energiepass>",
          el("jahrgang", "bei_besichtigung"),
          el("gebaeudeart", "wohn"),
          "</energiepass>",
        ]
          .join("\n          ")
          .replace("\n          </energiepass>", "\n        </energiepass>")
      : objekt.energieausweis_typ && objekt.energieausweis_typ !== "befreiung"
      ? [
          "<energiepass>",
          el("epart", objekt.energieausweis_typ === "bedarf" ? "BEDARF" : "VERBRAUCH"),
          istVerbrauch ? el("energieverbrauchkennwert", objekt.endenergie_kennwert) : "",
          istVerbrauch && objekt.energie_warmwasser_enthalten
            ? el("mitwarmwasser", "true")
            : "",
          !istVerbrauch ? el("endenergiebedarf", objekt.endenergie_kennwert) : "",
          // Nur bei genau einem gewählten Träger eindeutig; bei
          // mehreren trägt die befeuerung alle Werte
          objekt.energietraeger.length === 1
            ? el("primaerenergietraeger", BEFEUERUNG[objekt.energietraeger[0]])
            : "",
          el(
            "wertklasse",
            objekt.energieeffizienzklasse
              ? WERTKLASSE[objekt.energieeffizienzklasse]
              : null
          ),
          el("ausstelldatum", objekt.energieausweis_datum),
          el("jahrgang", energiepassJahrgang(objekt.energieausweis_datum)),
          el("gebaeudeart", "wohn"),
          "</energiepass>",
        ]
          .filter(Boolean)
          .join("\n          ")
          .replace("\n          </energiepass>", "\n        </energiepass>")
      : "";

  const zeilen = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<openimmo>`,
    `  <uebertragung art="OFFLINE" umfang="VOLL" modus="NEW" version="1.2.7" sendersoftware="selbst-verkauf.de" senderversion="1.0" techn_email="support@selbst-verkauf.de"/>`,
    `  <anbieter>`,
    `    <anbieternr>selbst-verkauf</anbieternr>`,
    `    <firma>selbst-verkauf.de</firma>`,
    `    <openimmo_anid>selbst-verkauf-de</openimmo_anid>`,
    `    <immobilie>`,
    `      <objektkategorie>`,
    `        <nutzungsart WOHNEN="true" GEWERBE="false"/>`,
    // ERBPACHT ist die Standard-Kennzeichnung für Erbbaurecht (das
    // Element preise > erbpacht wäre der laufende Pacht-BETRAG)
    `        <vermarktungsart KAUF="true" MIETE_PACHT="false"${objekt.erbbaurecht ? ` ERBPACHT="true"` : ""}/>`,
    `        <objektart>${objektartXml}</objektart>`,
    `      </objektkategorie>`,
    `      <geo>`,
    `        ${el("plz", objekt.plz)}`,
    `        ${el("ort", objekt.stadt)}`,
    `        ${el("strasse", adresse.strasse)}`,
    `        ${el("hausnummer", adresse.hausnummer)}`,
    `        ${el("bundesland", objekt.bundesland)}`,
    `        <land iso_land="DEU"/>`,
    `        ${istWohnung ? el("etage", objekt.etage) : ""}`,
    `        ${el("anzahl_etagen", objekt.etagen_gesamt)}`,
    // Standard-Flag: Es gibt eine virtuelle Tour (die URL steht im
    // Anhang gruppe="PANORAMA", das geo-Element ist nur ein Ja/Nein)
    `        ${objekt.rundgang_link ? `<virtuelletour>true</virtuelletour>` : ""}`,
    /* LUFTBILDERN BLEIBT LEER, UND DAS IST EINE ENTSCHEIDUNG.
       Der Standard hat direkt hinter virtuelletour ein zweites
       Ja/Nein-Feld <luftbildern>, und die Fotografie liefert
       Drohnenaufnahmen. Es waere verlockend, das Feld zu setzen,
       sobald die Leistung gebucht ist. Wir wissen aber nicht, ob am
       Ende wirklich Luftbilder dabei sind: Ein Drohnenflug faellt bei
       Wind, Regen oder in einer Flugverbotszone aus, und unseren
       Dateien sieht niemand an, ob sie von oben aufgenommen wurden.
       Ein Merkmal zu setzen, das wir nicht gemessen haben, waere eine
       Zusicherung im Portal-Suchfilter, die wir nicht tragen koennen.
       Wer es setzen will, braucht vorher eine Kennzeichnung am Bild. */
    `      </geo>`,
    /* Pflicht-Element laut XSD-Sequenz (nach geo, vor preise).
       DIE FESTLEGUNG (Inhaber, 25.08.2026): Anbieter des Inserats ist
       selbst-verkauf.de (anbieter-Block oben), ANSPRECHPARTNER ist
       die Verkaeuferin oder der Verkaeufer, mit Namen. Die Mail ist
       IMMER die objektbezogene Schutz-Adresse (Rueckfall das
       Team-Postfach, nie eine private Adresse), und eine
       TELEFONNUMMER geht BEWUSST NICHT hinaus: Eine private Nummer
       auf drei Portalen holt niemand je zurueck. Ohne gepflegten
       Namen traegt das Pflichtfeld den Anbieter. */
    `      <kontaktperson>`,
    `        ${el("email_zentrale", objekt.anfragen_alias ?? "hallo@selbst-verkauf.de")}`,
    `        ${el("name", verkaeufer?.nachname?.trim() || "selbst-verkauf.de")}`,
    `        ${el("vorname", verkaeufer?.vorname?.trim())}`,
    `      </kontaktperson>`,
    // Reihenfolge in preise laut XSD-Sequenz: kaufpreis, hausgeld,
    // provisionspflichtig, innen_courtage, aussen_courtage,
    // courtage_hinweis, mieteinnahmen_ist, danach die stp_-Elemente.
    //
    // Der Provisions-Block ist für uns der wichtigste Teil: Ohne
    // Courtage-Aussage fällt das Inserat aus dem Portal-Suchfilter
    // "provisionsfrei", also genau aus der Suche, in der es stehen
    // soll. Alle Werte kommen aus lib/provision.ts, damit Export,
    // Exposé und Objektansicht nie auseinanderlaufen.
    `      <preise>`,
    `        ${el("kaufpreis", objekt.angebotspreis)}`,
    `        ${istWohnung ? el("hausgeld", objekt.hausgeld) : ""}`,
    `        ${el("provisionspflichtig", jaNein(provision.kaeuferZahlt))}`,
    `        ${
      provision.innenCourtage
        ? `<innen_courtage mit_mwst="true">${xml(provision.innenCourtage)}</innen_courtage>`
        : ""
    }`,
    `        <aussen_courtage mit_mwst="true">${xml(provision.aussenCourtage)}</aussen_courtage>`,
    `        ${el("courtage_hinweis", provision.hinweis)}`,
    `        ${
      objekt.objektart === "mehrfamilienhaus" && objekt.mieteinnahmen_jahr
        ? `<mieteinnahmen_ist periode="JAHR">${objekt.mieteinnahmen_jahr}</mieteinnahmen_ist>`
        : objekt.vermietet && objekt.kaltmiete
          ? `<mieteinnahmen_ist periode="MONAT">${objekt.kaltmiete}</mieteinnahmen_ist>`
          : ""
    }`,
    // Stellplaetze je Art mit eigener Anzahl (stp_-Elemente in
    // XSD-Reihenfolge), nur erfasste Arten werden ausgegeben
    ...STP_SEQUENZ.map(({ art, element }) => {
      const anzahl = objekt.stellplaetze?.[art] ?? 0;
      return anzahl > 0 ? `        <${element} anzahl="${anzahl}"/>` : "";
    }),
    `      </preise>`,
    /*
     * Bieterverfahren: Das Schema hat dafuer ein EIGENES Element, in
     * der Sequenz direkt nach preise und vor versteigerung (Z. 144 im
     * XSD). Ein Umweg ueber die Beschreibungstexte ist also gar nicht
     * noetig.
     *
     * Bewusste Entscheidungen im Detail:
     *   ende_bietzeit ist xsd:DATE, nicht dateTime. Die Uhrzeit unserer
     *     Frist laesst sich hier also nicht abbilden, sie steht dafuer
     *     im Beschreibungstext.
     *   hoechstgebot_zeigen steht auf FALSE. Kein Bieter erfaehrt bei
     *     uns den Stand der anderen, und das Portal soll ihn erst
     *     recht nicht anzeigen.
     *   mindestpreis bleibt LEER. Unser Startpreis ist ein
     *     Einstiegspreis, keine Untergrenze. Ihn hier einzutragen
     *     waere eine falsche Aussage gegenueber Kaufinteressenten.
     *   Das Nachbarelement <versteigerung> wird NIE gesetzt. Es
     *     beschreibt eine echte Versteigerung mit Zuschlag, die es bei
     *     uns nicht gibt.
     */
    ...(bieterverfahren
      ? [
          `      <bieterverfahren>`,
          bieterverfahren.gestartet_am
            ? `        <beginn_bietzeit>${new Date(bieterverfahren.gestartet_am).toISOString().slice(0, 19)}</beginn_bietzeit>`
            : "",
          `        <ende_bietzeit>${bieterverfahren.frist.slice(0, 10)}</ende_bietzeit>`,
          `        <hoechstgebot_zeigen>false</hoechstgebot_zeigen>`,
          `      </bieterverfahren>`,
        ]
      : []),
    // Element-Reihenfolge exakt nach der flaechen-Sequenz des XSD
    `      <flaechen>`,
    `        ${el("wohnflaeche", objekt.wohnflaeche_qm)}`,
    `        ${el("nutzflaeche", objekt.nutzflaeche_qm)}`,
    `        ${!istWohnung ? el("grundstuecksflaeche", objekt.grundstuecksflaeche_qm) : ""}`,
    `        ${el("anzahl_zimmer", objekt.zimmer)}`,
    `        ${el("anzahl_schlafzimmer", objekt.schlafzimmer)}`,
    `        ${el("anzahl_badezimmer", objekt.badezimmer)}`,
    `        ${objekt.balkon ? el("anzahl_balkone", 1) : ""}`,
    `        ${objekt.terrasse ? el("anzahl_terrassen", 1) : ""}`,
    `        ${el("balkon_terrasse_flaeche", objekt.balkon_terrasse_flaeche_qm)}`,
    `        ${el("gartenflaeche", objekt.gartenflaeche_qm)}`,
    `        ${el("kellerflaeche", objekt.kellerflaeche_qm)}`,
    `        ${el("dachbodenflaeche", objekt.dachbodenflaeche_qm)}`,
    `        ${
      stellplaetzeGesamt(objekt.stellplaetze ?? {}) > 0
        ? el("anzahl_stellplaetze", stellplaetzeGesamt(objekt.stellplaetze ?? {}))
        : ""
    }`,
    `        ${el("anzahl_wohneinheiten", wohneinheiten)}`,
    `        ${objekt.einliegerwohnung ? el("einliegerwohnung", "true") : ""}`,
    `      </flaechen>`,
    // Element-Reihenfolge exakt nach der ausstattung-Sequenz des XSD;
    // kamin, gartennutzung, gaestewc und die weiteren Merkmale sind
    // dort xsd:boolean-Elemente und brauchen einen Wert
    `      <ausstattung>`,
    `        ${
      objekt.ausstattungsqualitaet
        ? el("ausstatt_kategorie", AUSSTATT_KATEGORIE[objekt.ausstattungsqualitaet])
        : ""
    }`,
    `        ${badAttrs ? `<bad ${badAttrs}/>` : ""}`,
    `        ${objekt.einbaukueche ? `<kueche EBK="true"/>` : ""}`,
    `        ${bodenAttrs ? `<boden ${bodenAttrs}/>` : ""}`,
    `        ${objekt.kamin ? `<kamin>true</kamin>` : ""}`,
    `        ${heizungAttr ? `<heizungsart ${heizungAttr}/>` : ""}`,
    `        ${befeuerungAttrs ? `<befeuerung ${befeuerungAttrs}/>` : ""}`,
    `        ${weitere.has("klimaanlage") ? `<klimatisiert>true</klimatisiert>` : ""}`,
    `        ${objekt.aufzug ? `<fahrstuhl PERSONEN="true"/>` : ""}`,
    `        ${(() => {
      const flags = STP_SEQUENZ.filter(
        ({ art }) => (objekt.stellplaetze?.[art] ?? 0) > 0
      )
        .map(({ flag }) => `${flag}="true"`)
        .join(" ");
      return flags ? `<stellplatzart ${flags}/>` : "";
    })()}`,
    `        ${objekt.garten ? `<gartennutzung>true</gartennutzung>` : ""}`,
    `        ${ausrichtungAttrs ? `<ausricht_balkon_terrasse ${ausrichtungAttrs}/>` : ""}`,
    `        ${objekt.barrierefrei ? `<barrierefrei>true</barrierefrei>` : ""}`,
    ...WEITERE_ELEMENTE.map(({ wert, element }) =>
      weitere.has(wert) ? `        <${element}>true</${element}>` : ""
    ),
    // Glasfaser (Runde 13): breitband_zugang steht laut XSD-Sequenz
    // zwischen den Merkmalen oben und unterkellert; art ist im
    // Standard freier Text
    `        ${weitere.has("glasfaser") ? `<breitband_zugang art="GLASFASER"/>` : ""}`,
    `        ${objekt.keller ? `<unterkellert keller="JA"/>` : ""}`,
    ...WEITERE_NACH_UNTERKELLERT.map(({ wert, element }) =>
      weitere.has(wert) ? `        <${element}>true</${element}>` : ""
    ),
    // Bauweise (Runde 13, 0091): massiv und klinker als MASSIV,
    // holzstaender und fachwerk als HOLZ, fertighaus als FERTIGTEILE;
    // die genaue Wortwahl traegt der Freitext in sonstige_angaben
    `        ${
      objekt.bauweise && BAUWEISE_ATTR[objekt.bauweise]
        ? `<bauweise ${BAUWEISE_ATTR[objekt.bauweise]}="true"/>`
        : ""
    }`,
    `        ${objekt.dachboden ? `<dachboden>true</dachboden>` : ""}`,
    `        ${objekt.gaeste_wc ? `<gaestewc>true</gaestewc>` : ""}`,
    `      </ausstattung>`,
    `      <zustand_angaben>`,
    `        ${el("baujahr", objekt.baujahr)}`,
    `        ${el("letztemodernisierung", objekt.modernisierung_jahr)}`,
    `        ${
      objekt.zustand
        ? `<zustand zustand_art="${ZUSTAND_ART[objekt.zustand]}"/>`
        : ""
    }`,
    // Nur ein Neubau im Bau wird gekennzeichnet. ALTBAU wird bewusst
    // nie gesetzt: "Bestand" heißt nicht Altbau, viele Portale zeigen
    // ALTBAU als Vorkriegs-Baujahr an.
    `        ${objekt.bauphase === "in_bau" ? `<alter alter_attr="NEUBAU"/>` : ""}`,
    `        ${energiepass}`,
    `      </zustand_angaben>`,
    // XSD-Sequenz: nach zustand_angaben (und bewertung, das wir nicht
    // fuehren) kommt infrastruktur, dann erst freitexte
    infrastrukturXml(umgebung),
    // Reihenfolge laut XSD: objekttitel, lage, ausstatt_beschr,
    // objektbeschreibung, sonstige_angaben
    `      <freitexte>`,
    `        ${el("objekttitel", inseratsTitel(objekt))}`,
    `        ${el("lage", objekt.beschreibung_lage)}`,
    `        ${el("ausstatt_beschr", objekt.beschreibung_ausstattung)}`,
    `        ${el("objektbeschreibung", objekt.beschreibung_objekt)}`,
    `        ${el(
      "sonstige_angaben",
      [
        // Zusaetzlich im Freitext, weil nicht jedes Portal das
        // bieterverfahren-Element auswertet. Der Satz kommt aus
        // config/bieterverfahren.ts, damit er nach der anwaltlichen
        // Pruefung an einer Stelle wechselt.
        bieterverfahren ? portalHinweis(bieterverfahren.frist) : "",
        objekt.beschreibung_sonstiges,
        objekt.heizung_baujahr ? `Baujahr der Heizung: ${objekt.heizung_baujahr}.` : "",
        /* Runde 13 (0091): die neuen Sachangaben ohne eigenes
           Standard-Element, als klare Saetze im Freitext */
        objekt.heizung_hersteller ? `Heizung: ${objekt.heizung_hersteller}.` : "",
        objekt.bauweise
          ? `Bauweise: ${wertLabel(BAUWEISEN, objekt.bauweise)}.`
          : "",
        (objekt.daemmung ?? []).length
          ? `Gedämmt: ${objekt.daemmung
              .map((d) => wertLabel(DAEMMUNG_WERTE, d))
              .join(", ")}${objekt.daemmung_jahr ? ` (${objekt.daemmung_jahr})` : ""}.`
          : "",
        objekt.strassenlage
          ? `Straßenlage: ${wertLabel(STRASSENLAGEN, objekt.strassenlage)}.`
          : "",
        objekt.einliegerwohnung && objekt.einliegerwohnung_flaeche_qm
          ? `Einliegerwohnung mit ${objekt.einliegerwohnung_flaeche_qm} m².`
          : "",
        objekt.vermietet && objekt.vermietet_seit
          ? `Vermietet seit ${objekt.vermietet_seit}.`
          : "",
        objekt.erbbaurecht ? "Grundstück im Erbbaurecht." : "",
        objekt.ruecklage_anteil
          /* Mit echtem Umlaut (31.08.2026): Der Satz geht als Freitext
             an die Portale, Kaufinteressenten lesen ihn im Inserat.
             Es war der einzige Anzeigetext dieser Datei in
             Ersatzschreibweise; die uebrigen ae/oe/ue-Treffer sind
             XSD-Elementnamen und Kennungen, die so heissen muessen. */
          ? `Anteil an der Instandhaltungsrücklage: ${objekt.ruecklage_anteil} Euro.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    )}`,
    `      </freitexte>`,
    // Reihenfolge laut XSD-Sequenz: freitexte, anhaenge, verwaltung_objekt
    anhaengeXml(anhaenge, objekt.rundgang_link, objekt.film_link),
    `      <verwaltung_objekt>`,
    `        ${el("objektadresse_freigeben", jaNein(objekt.adresse_freigeben))}`,
    `        ${el("verfuegbar_ab", verfuegbarAb(objekt))}`,
    `        ${objekt.vermietet ? `<vermietet>true</vermietet>` : ""}`,
    `        ${objekt.denkmalgeschuetzt ? `<denkmalgeschuetzt>true</denkmalgeschuetzt>` : ""}`,
    `      </verwaltung_objekt>`,
    // objektnr_extern ist laut XSD Pflicht, wir vergeben dieselbe Nummer
    `      <verwaltung_techn>`,
    `        ${el("objektnr_intern", objekt.id ?? "probe")}`,
    `        ${el("objektnr_extern", objekt.id ?? "probe")}`,
    `        <aktion aktionart="CHANGE"/>`,
    `        ${el("openimmo_obid", objekt.id ?? "probe")}`,
    `        ${el("stand_vom", heute)}`,
    `      </verwaltung_techn>`,
    `    </immobilie>`,
    `  </anbieter>`,
    `</openimmo>`,
  ];

  return zeilen
    .map((z) => (z.trim() === "" ? null : z))
    .filter((z): z is string => z !== null)
    .join("\n")
    .replace(/\n\s*\n/g, "\n");
}
