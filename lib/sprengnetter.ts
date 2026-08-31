/**
 * Sprengnetter Report-API: der eine Adapter für Markteinschätzungen.
 *
 * NUR SERVER-SEITIG VERWENDEN (API-Routen und Server-Komponenten).
 * Die Zugangsdaten sind Server-Geheimnisse ohne NEXT_PUBLIC-Präfix,
 * sie erreichen niemals den Browser und werden niemals committet.
 *
 * Grundlage ist die OpenAPI-Spezifikation (Report API 1.0.0):
 * https://api.report.sprengnetter.de/swagger/v1/swagger.json
 * - Ein Endpunkt: POST /service/api/immowertreport
 * - Authentifizierung: HTTP Basic Auth (Benutzername und Passwort)
 * - Server: Produktion https://api.report.sprengnetter.de,
 *   Test https://api.test.report.sprengnetter.de (Standard hier,
 *   per SPRENGNETTER_API_URL umschaltbar)
 * - Query-Parameter format: PDF (Standard), DOCX, HTML, SRC
 *
 * Format-Strategie: SRC (Rohdaten) für die Anzeige auf der Seite UND
 * PDF für die Unterlagen. TODO Vertrag: klären, ob zwei Format-Abrufe
 * je Bewertung doppelt berechnet werden. Falls ja, auf einen Abruf
 * umstellen und SRC plus selbst gerendertes bzw. eingebettetes HTML
 * abwägen.
 *
 * TODO Vertrag (Recht): klären, welche Darstellungsformen der Daten in
 * unserer Oberfläche lizenziert sind, insbesondere Vergleichsangebote
 * und Karten. Bis zur Klärung bewusst KEINE Kartendarstellung der
 * Vergleichsobjekte.
 *
 * Kosten-Disziplin: Jeder echte Abruf kostet Geld. Der Aufruf passiert
 * ausschließlich über die API-Route nach explizitem Klick, nie
 * automatisch. Obergrenze MAX_ABRUFE_JE_TAG je Objekt und Tag.
 */
import { type Objekt } from "@/lib/objekt-felder";
import { ohneUmbruch } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/** Test-Umgebung als Standard für die Entwicklung, siehe Kopfkommentar */
const STANDARD_API_URL = "https://api.test.report.sprengnetter.de";

/** Höchstens so viele Abrufe je Objekt und Tag (Kostenschutz) */
export const MAX_ABRUFE_JE_TAG = 3;

/** Spannen-Parameter laut Spezifikation: 5, 10, 15 oder 20 Prozent */
const SPANNE_PROZENT = 10;

/** Halbe Spannen-Breite der Mock-Einschätzung um den Mittelwert */
const MOCK_SPANNE = 0.065;

export function sprengnetterMockAktiv(): boolean {
  return process.env.SPRENGNETTER_MOCK === "true";
}

/** Zugangsdaten vorhanden oder Mock aktiv? */
export function sprengnetterKonfiguriert(): boolean {
  if (sprengnetterMockAktiv()) return true;
  return Boolean(
    process.env.SPRENGNETTER_API_USER && process.env.SPRENGNETTER_API_PASSWORD
  );
}

/**
 * Komplett bereit? Zusätzlich zum API-Zugang braucht das Speichern der
 * Bewertung und des PDFs den Service-Role-Schlüssel von Supabase
 * (Tabelle bewertungen ist für Browser-Clients bewusst nicht
 * beschreibbar). Fehlt etwas, verhält sich der Bewertungs-Bereich
 * exakt wie ohne Anbindung.
 */
export function bewertungsAnbindungBereit(): boolean {
  return (
    sprengnetterKonfiguriert() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}

/* ------------------------------------------------------------------ */
/* Normalisiertes Ergebnis-Format für Anzeige und Speicherung          */
/* ------------------------------------------------------------------ */

export type AusstattungsVariante = {
  stufe: "einfach" | "mittel" | "gehoben" | "stark_gehoben";
  label: string;
  wert: number;
};

export type Vergleichsangebot = {
  preis: number | null;
  preisProQm: number | null;
  entfernungKm: number | null;
  baujahr: number | null;
  wohnflaecheQm: number | null;
};

export type WertentwicklungsPunkt = { jahr: number; wert: number };

/** Die normalisierten Strukturdaten eines Reports (Spalte quelle_daten) */
export type SrcErgebnis = {
  kaufpreis: { mittel: number; min: number; max: number };
  mieteMonat: { min: number; max: number } | null;
  jahresEntwicklungProzent: number | null;
  ausstattungsVarianten: AusstattungsVariante[];
  vergleichsangebote: Vergleichsangebot[];
  wertentwicklung: WertentwicklungsPunkt[];
};

export type Markteinschaetzung = {
  spanneMin: number;
  spanneMax: number;
  quelle: "sprengnetter" | "sprengnetter-mock";
  quelleDaten: SrcErgebnis;
  /** Report als PDF für die Unterlagen, im Mock ein Beispiel-Dokument */
  pdf: Uint8Array | null;
};

/** Freundliche Fehler für die Oberfläche, Technisches nur ins Log */
export class SprengnetterFehler extends Error {
  nutzerMeldung: string;
  constructor(nutzerMeldung: string, technisch?: string) {
    super(technisch ?? nutzerMeldung);
    this.nutzerMeldung = nutzerMeldung;
  }
}

/* ------------------------------------------------------------------ */
/* Grenzwerte der Spezifikation, VOR dem Abruf freundlich geprüft      */
/* ------------------------------------------------------------------ */

const WOHNFLAECHE_MAX: Record<string, number> = {
  wohnung: 500,
  haus: 1000,
  mehrfamilienhaus: 2000,
};

/**
 * Verstößt das Objekt gegen die API-Grenzwerte, kommt hier ein
 * verständlicher Hinweis zurück statt später ein API-Fehler.
 */
export function grenzwertHinweis(objekt: Objekt): string | null {
  const maxWohnen = WOHNFLAECHE_MAX[objekt.objektart];
  if (objekt.wohnflaeche_qm && objekt.wohnflaeche_qm > maxWohnen) {
    return `Für die automatische Markteinschätzung ist die Wohnfläche auf ${ohneUmbruch(`${maxWohnen} m²`)} begrenzt. Ihr Objekt liegt darüber, wir erstellen die Einschätzung deshalb persönlich für Sie. Melden Sie sich kurz im Chat oder telefonisch.`;
  }
  if (objekt.grundstuecksflaeche_qm && objekt.grundstuecksflaeche_qm > 5000) {
    return "Für die automatische Markteinschätzung ist die Grundstücksfläche auf 5000 m² begrenzt. Ihr Grundstück liegt darüber, wir erstellen die Einschätzung deshalb persönlich für Sie. Melden Sie sich kurz im Chat oder telefonisch.";
  }
  if (objekt.baujahr && (objekt.baujahr < 1800 || objekt.baujahr > 2027)) {
    return "Für die automatische Markteinschätzung muss das Baujahr zwischen 1800 und 2027 liegen. Bitte prüfen Sie die Angabe im Bereich Mein Objekt.";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Feld-Zuordnung Objektmaske zu ReportRequest (siehe auch die         */
/* sprengnetter-Spalte in lib/openimmo-mapping.ts)                     */
/* ------------------------------------------------------------------ */

/**
 * category laut Spezifikation: ETW, EFH, MFH, GRD. Eine eigene
 * Kategorie für das Zweifamilienhaus gibt es NICHT (Spec geprüft am
 * 04.08.2026). Das Zweifamilienhaus läuft bewusst als EFH: Die
 * deutsche Bewertungspraxis führt Ein- und Zweifamilienhäuser als
 * eine Gebäudeklasse (Vergleichs- und Sachwertverfahren), ein
 * Ertragsobjekt ist erst das Mehrfamilienhaus ab drei Wohneinheiten.
 * TODO Sprengnetter-Gespräch: Zuordnung bestätigen lassen. Die Spec
 * kennt außerdem KEIN Feld für die Anzahl der Wohneinheiten, sie
 * kann daher nicht übermittelt werden.
 */
const KATEGORIE: Record<string, string> = {
  wohnung: "ETW",
  haus: "EFH",
  mehrfamilienhaus: "MFH",
};

/**
 * construction je Kategorie laut Spezifikation:
 * EFH/MFH: DOPPELHAUS, FREISTEHEND, REIHEN_ENDHAUS, REIHEN_MITTELHAUS
 * ETW: LOFT, PENTHOUSE, SOUTERRAIN, ERDGESCHOSSWOHNUNG, ETAGENWOHNUNG,
 *      HOCHPARTERRE, MAISONETTE, TERRASSENWOHNUNG, DACHGESCHOSS
 */
const CONSTRUCTION: Record<string, string> = {
  einfamilienhaus: "FREISTEHEND",
  zweifamilienhaus: "FREISTEHEND",
  doppelhaushaelfte: "DOPPELHAUS",
  reihenmittelhaus: "REIHEN_MITTELHAUS",
  reihenendhaus: "REIHEN_ENDHAUS",
  villa: "FREISTEHEND",
  bungalow: "FREISTEHEND",
  mehrfamilienhaus: "FREISTEHEND",
  etagenwohnung: "ETAGENWOHNUNG",
  erdgeschosswohnung: "ERDGESCHOSSWOHNUNG",
  dachgeschosswohnung: "DACHGESCHOSS",
  maisonette: "MAISONETTE",
  penthouse: "PENTHOUSE",
  souterrain: "SOUTERRAIN",
};

/** Ausstattungs-Qualität auf das Gesamt-Level der API */
const EQUIPMENT_LEVEL: Record<string, string> = {
  einfach: "EINFACH",
  normal: "MITTEL",
  gehoben: "GEHOBEN",
  luxus: "STARK_GEHOBEN",
};

/**
 * Heizungsart der Objektmaske auf die API-Werteliste
 * (FUSSBODENHEIZUNG, EINZELOEFEN, ZENTRALHEIZUNG, SONSTIGE).
 * Etagen- und Fernheizung sind fachlich zentrale Wärmeversorgungen.
 */
const HEIZUNG: Record<string, string> = {
  fussbodenheizung: "FUSSBODENHEIZUNG",
  zentralheizung: "ZENTRALHEIZUNG",
  etagenheizung: "ZENTRALHEIZUNG",
  fernheizung: "ZENTRALHEIZUNG",
  ofenheizung: "EINZELOEFEN",
};

/**
 * Zustand auf die Modernisierungs-Klasse der API. Erstbezug und
 * neuwertig bleiben bewusst ohne Klasse, dort spricht das Baujahr für
 * sich und eine Modernisierungs-Angabe würde verzerren.
 */
const MODERNISIERUNG: Record<string, string> = {
  voll_saniert: "EXTENSIVE",
  modernisiert: "PREDOMINANT",
  gepflegt: "AVERAGE",
  renovierungsbeduerftig: "NONE",
};

/** Bodenbeläge: den hochwertigsten vorhandenen Belag melden */
function bodenBelag(objekt: Objekt): string | null {
  const f = objekt.fussboden;
  if (f.some((b) => ["parkett", "dielen", "stein"].includes(b)))
    return "PARKETT_NATURSTEIN";
  if (f.includes("fliesen")) return "FLIESEN";
  if (f.some((b) => ["teppich", "laminat"].includes(b))) return "TEPPICH_LAMINAT";
  if (f.includes("vinyl")) return "KUNSTSTOFF_PVC";
  return null;
}

/** "Lindenweg 12" in Straße und Hausnummer trennen */
function adresseTeilen(strasse: string | null): {
  street: string | null;
  house_number: string | null;
} {
  const wert = strasse?.trim() ?? "";
  const treffer = wert.match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z]?)$/);
  if (!treffer) return { street: wert || null, house_number: null };
  return { street: treffer[1], house_number: treffer[2].replace(/\s/g, "") };
}

/**
 * Den ReportRequest laut Spezifikation aus der Objektmaske bauen.
 * Nur eines von address, coordinates, address_geocoded ist nötig,
 * wir übergeben die Adresse und lassen die API geokodieren.
 */
export function baueReportRequest(objekt: Objekt): Record<string, unknown> {
  const kategorie = KATEGORIE[objekt.objektart];
  const istWohnung = objekt.objektart === "wohnung";
  const adresse = adresseTeilen(objekt.strasse);

  // Ausstattung: entweder Gesamt-Level ODER Detail-Matrix, laut
  // Spezifikation ignoriert ein gesetztes value alle Detailfelder
  const equipment: Record<string, unknown> = {};
  if (objekt.ausstattungsqualitaet) {
    equipment.value = EQUIPMENT_LEVEL[objekt.ausstattungsqualitaet];
  } else {
    const heizung = objekt.heizungsart ? HEIZUNG[objekt.heizungsart] ?? "SONSTIGE" : null;
    const boden = bodenBelag(objekt);
    if (heizung) equipment.heating = heizung;
    if (boden) equipment.floor = boden;
    equipment.guest_toilet = objekt.gaeste_wc ? "GAESTE_WC" : "KEIN_GAESTE_WC";
    equipment.residential_area =
      objekt.balkon || objekt.terrasse ? "BALKON_UNTER_10" : "KEINBALKON";
  }

  // Ueberdachte Arten zaehlen als Garage, offene als Aussenstellplatz
  const arten = objekt.stellplaetze ?? {};
  const garage = ["garage", "tiefgarage", "duplex", "parkhaus"].some(
    (art) => (arten[art] ?? 0) > 0
  );
  const aussenstellplatz = ["carport", "aussenstellplatz"].some(
    (art) => (arten[art] ?? 0) > 0
  );

  const request: Record<string, unknown> = {
    category: kategorie,
    address: {
      nation: "DE",
      street: adresse.street,
      house_number: adresse.house_number,
      zip: objekt.plz,
      town: objekt.stadt,
    },
    construction: objekt.objekttyp ? CONSTRUCTION[objekt.objekttyp] ?? null : null,
    construction_year: objekt.baujahr,
    refurbishment_year: objekt.modernisierung_jahr,
    living_area: objekt.wohnflaeche_qm,
    plot_area: istWohnung ? null : objekt.grundstuecksflaeche_qm,
    rooms: objekt.zimmer,
    // floor gilt laut Spezifikation nur für ETW,
    // floor_number nur für EFH und MFH
    floor: istWohnung ? objekt.etage : null,
    floor_number: istWohnung ? null : objekt.etagen_gesamt,
    elevator: istWohnung ? objekt.aufzug : null,
    garages: garage,
    outdoor_parking_space: aussenstellplatz,
    equipment,
    modernization_class: objekt.zustand
      ? MODERNISIERUNG[objekt.zustand] ?? null
      : null,
    // Die 10 ähnlichsten Objekte für den Preisvergleich mitliefern
    compare_prices: true,
    range: SPANNE_PROZENT,
    // White-Label: unser Absender auf dem Report.
    // TODO Logo: agent.logo als Bild ergänzen, sobald eine
    // Logo-Bilddatei vorliegt (die Wortmarke ist bisher reiner Text).
    agent: {
      name: "selbst-verkauf.de",
      tel: siteConfig.contact.phone,
      email: siteConfig.contact.email,
      intro:
        "Ihre Markteinschätzung, erstellt über selbst-verkauf.de. Verkaufen ohne Provision, mit echter Begleitung.",
    },
    // TODO Objektfoto: image mit dem Foto des Kunden befüllen, sobald
    // der Unterlagen-Upload existiert.
  };

  // Wunschpreis des Kunden für die Einordnung im Report.
  // Hinweis: meta ist in der Spezifikation als deprecated markiert,
  // die Werte erscheinen in der Antwort unter calc. Beim ersten echten
  // Abruf prüfen, ob asking_price weiterhin ankommt.
  if (objekt.angebotspreis) {
    request.meta = {
      asking_price: {
        date: new Date().toISOString(),
        value: objekt.angebotspreis,
      },
    };
  }

  // Leere Werte weglassen, die API erwartet nullable-Felder nur bei Bedarf
  return JSON.parse(JSON.stringify(request));
}

/* ------------------------------------------------------------------ */
/* Mock-Modus: kompletter Ablauf testbar ohne Vertrag                  */
/* ------------------------------------------------------------------ */

const rundeAufTausend = (wert: number) => Math.round(wert / 1000) * 1000;

/**
 * Realistische Beispiel-Antwort: plausible Spanne rund um die
 * Preisvorstellung des Kunden (ersatzweise eine Flächen-Heuristik).
 * Die Quelle ist klar als sprengnetter-mock gekennzeichnet, die
 * Oberfläche zeigt dazu das Testdaten-Badge.
 */
function mockEinschaetzung(objekt: Objekt): Markteinschaetzung {
  const qmPreis =
    objekt.objektart === "wohnung" ? 3400 : objekt.objektart === "haus" ? 3100 : 2400;
  const basis =
    objekt.angebotspreis ?? (objekt.wohnflaeche_qm ?? 120) * qmPreis;
  const mittel = rundeAufTausend(basis);
  const min = rundeAufTausend(mittel * (1 - MOCK_SPANNE));
  const max = rundeAufTausend(mittel * (1 + MOCK_SPANNE));

  const flaeche = objekt.wohnflaeche_qm ?? 120;
  const mieteMitte = Math.round((mittel * 0.0034) / 5) * 5;
  const jahr = new Date().getFullYear();
  const entwicklung = 3.2;

  const wertentwicklung: WertentwicklungsPunkt[] = [];
  for (let i = 5; i >= 0; i--) {
    wertentwicklung.push({
      jahr: jahr - i,
      wert: rundeAufTausend(mittel / Math.pow(1 + entwicklung / 100, i)),
    });
  }

  const vergleichsBasis = mittel / flaeche;
  const vergleichsangebote: Vergleichsangebot[] = [
    { faktor: 0.94, km: 0.6, alter: -3, qm: -14 },
    { faktor: 1.03, km: 1.1, alter: 5, qm: 9 },
    { faktor: 0.98, km: 1.8, alter: -8, qm: -2 },
    { faktor: 1.08, km: 2.4, alter: 11, qm: 18 },
    { faktor: 0.9, km: 3.2, alter: -15, qm: -22 },
    { faktor: 1.01, km: 4.5, alter: 2, qm: 5 },
  ].map((v) => {
    const qm = Math.max(45, Math.round(flaeche + v.qm));
    const proQm = Math.round(vergleichsBasis * v.faktor);
    return {
      preis: rundeAufTausend(proQm * qm),
      preisProQm: proQm,
      entfernungKm: v.km,
      baujahr: (objekt.baujahr ?? 1995) + v.alter,
      wohnflaecheQm: qm,
    };
  });

  const quelleDaten: SrcErgebnis = {
    kaufpreis: { mittel, min, max },
    mieteMonat: {
      min: Math.round((mieteMitte * 0.92) / 5) * 5,
      max: Math.round((mieteMitte * 1.08) / 5) * 5,
    },
    jahresEntwicklungProzent: entwicklung,
    ausstattungsVarianten: [
      { stufe: "einfach", label: "Einfach", wert: rundeAufTausend(mittel * 0.88) },
      { stufe: "mittel", label: "Mittel", wert: mittel },
      { stufe: "gehoben", label: "Gehoben", wert: rundeAufTausend(mittel * 1.12) },
      {
        stufe: "stark_gehoben",
        label: "Stark gehoben",
        wert: rundeAufTausend(mittel * 1.22),
      },
    ],
    vergleichsangebote,
    wertentwicklung,
  };

  return {
    spanneMin: min,
    spanneMax: max,
    quelle: "sprengnetter-mock",
    quelleDaten,
    pdf: mockPdf(objekt, quelleDaten),
  };
}


/** Umlaute für das schlichte Beispiel-PDF in ASCII übersetzen */
function ascii(text: string): string {
  return text
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss").replace(/[^\x20-\x7e]/g, "?");
}

/**
 * Kleines, gültiges Beispiel-PDF für den kompletten Unterlagen-Fluss
 * im Mock-Modus (eine Seite, Helvetica, korrekte Querverweis-Tabelle).
 */
function mockPdf(objekt: Objekt, daten: SrcErgebnis): Uint8Array {
  const zeilen = [
    "Markteinschaetzung (Testdaten)",
    ascii(`${objekt.strasse ?? ""}, ${objekt.plz ?? ""} ${objekt.stadt ?? ""}`),
    `Marktpreisspanne: ${daten.kaufpreis.min.toLocaleString("en-US")} bis ${daten.kaufpreis.max.toLocaleString("en-US")} EUR`,
    "Dieses Dokument stammt aus dem Mock-Modus von selbst-verkauf.de.",
    "Nach Vertragsabschluss steht hier der echte Sprengnetter-Report.",
  ];
  const inhalt = zeilen
    .map(
      (z, i) =>
        `BT /F1 ${i === 0 ? 16 : 11} Tf 50 ${770 - i * 28} Td (${z.replace(/[()\\]/g, "")}) Tj ET`
    )
    .join("\n");
  const teile = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    `5 0 obj<</Length ${inhalt.length}>>stream\n${inhalt}\nendstream endobj`,
  ];
  // Byte-Position jedes Objekts für die Querverweis-Tabelle
  const offsets: number[] = [];
  let position = 0;
  for (const teil of teile) {
    offsets.push(position);
    position += teil.length + 1;
  }
  const kopf = teile.join("\n") + "\n";
  const xref =
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
      .join("");
  const datei =
    kopf + xref + `trailer<</Size 6/Root 1 0 R>>\nstartxref\n${kopf.length}\n%%EOF`;
  return new TextEncoder().encode(datei);
}

/* ------------------------------------------------------------------ */
/* Echter API-Abruf                                                    */
/* ------------------------------------------------------------------ */

function basisUrl(): string {
  return (process.env.SPRENGNETTER_API_URL ?? "").trim() || STANDARD_API_URL;
}

function basicAuth(): string {
  const user = process.env.SPRENGNETTER_API_USER ?? "";
  const pass = process.env.SPRENGNETTER_API_PASSWORD ?? "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function reportAbruf(
  request: Record<string, unknown>,
  format: "SRC" | "PDF"
): Promise<Response> {
  const antwort = await fetch(
    `${basisUrl()}/service/api/immowertreport?format=${format}`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      // Bewertungen dürfen nie aus einem Cache kommen
      cache: "no-store",
    }
  );
  if (antwort.status === 401 || antwort.status === 403) {
    throw new SprengnetterFehler(
      "Die Markteinschätzung ist gerade nicht erreichbar. Wir kümmern uns darum, bitte versuchen Sie es später noch einmal.",
      `Sprengnetter-Auth fehlgeschlagen (${antwort.status})`
    );
  }
  if (antwort.status === 400) {
    const text = await antwort.text();
    throw new SprengnetterFehler(
      "Für diese Adresse konnte keine Markteinschätzung erstellt werden. Bitte prüfen Sie Straße, Hausnummer, Postleitzahl und Ort im Bereich Mein Objekt.",
      `Sprengnetter 400: ${text.slice(0, 500)}`
    );
  }
  if (antwort.status === 429) {
    throw new SprengnetterFehler(
      "Das Kontingent für Markteinschätzungen ist im Moment erschöpft. Bitte versuchen Sie es später noch einmal.",
      "Sprengnetter 429"
    );
  }
  if (!antwort.ok) {
    throw new SprengnetterFehler(
      "Die Markteinschätzung ist gerade nicht erreichbar. Bitte versuchen Sie es in ein paar Minuten noch einmal.",
      `Sprengnetter ${antwort.status}: ${(await antwort.text()).slice(0, 500)}`
    );
  }
  return antwort;
}

/** Zahl aus mehreren möglichen Pfaden eines unbekannten JSON ziehen */
function zahlAus(quelle: unknown, pfade: string[][]): number | null {
  for (const pfad of pfade) {
    let wert: unknown = quelle;
    for (const schluessel of pfad) {
      if (wert && typeof wert === "object" && schluessel in (wert as object)) {
        wert = (wert as Record<string, unknown>)[schluessel];
      } else {
        wert = undefined;
        break;
      }
    }
    if (typeof wert === "number" && Number.isFinite(wert)) return wert;
  }
  return null;
}

/**
 * Die SRC-Rohdaten in unser Format bringen.
 *
 * WICHTIG: Die OpenAPI-Spezifikation beschreibt die Struktur der
 * SRC-Antwort nicht (IActionResult ist leer definiert). Dieser
 * Normalisierer greift deshalb defensiv auf plausible Pfade zu und
 * legt die kompletten Rohdaten zusätzlich in quelle_daten.roh ab.
 * TODO beim ersten echten Abruf: Rohdaten ansehen und die Pfade hier
 * exakt nachziehen, die Anzeige liest NUR das normalisierte Format.
 */
function normalisiereSrc(roh: unknown): SrcErgebnis {
  const mittel =
    zahlAus(roh, [
      ["calc", "value"],
      ["value"],
      ["result", "value"],
      ["valuation", "value"],
    ]) ?? 0;
  const min =
    zahlAus(roh, [
      ["calc", "range", "min"],
      ["range", "min"],
      ["result", "range", "min"],
    ]) ?? (mittel ? rundeAufTausend(mittel * 0.93) : 0);
  const max =
    zahlAus(roh, [
      ["calc", "range", "max"],
      ["range", "max"],
      ["result", "range", "max"],
    ]) ?? (mittel ? rundeAufTausend(mittel * 1.07) : 0);

  if (!min || !max) {
    throw new SprengnetterFehler(
      "Die Antwort der Markteinschätzung war unvollständig. Wir schauen uns das an, bitte versuchen Sie es später noch einmal.",
      `SRC-Antwort ohne Spanne: ${JSON.stringify(roh).slice(0, 800)}`
    );
  }

  const ergebnis: SrcErgebnis & { roh?: unknown } = {
    kaufpreis: { mittel: mittel || rundeAufTausend((min + max) / 2), min, max },
    mieteMonat: null,
    jahresEntwicklungProzent: zahlAus(roh, [
      ["calc", "development", "yearly_percent"],
      ["development", "yearly_percent"],
    ]),
    ausstattungsVarianten: [],
    vergleichsangebote: [],
    wertentwicklung: [],
    roh,
  };
  return ergebnis;
}

/* ------------------------------------------------------------------ */
/* Die eine Schnittstelle                                              */
/* ------------------------------------------------------------------ */

/**
 * Erstellt die Markteinschätzung für ein Objekt: mappt die Felder der
 * Objektmaske auf den ReportRequest, ruft die Report-API serverseitig
 * ab (SRC für die Anzeige, PDF für die Unterlagen) und liefert das
 * normalisierte Ergebnis für die bewertungen-Tabelle.
 */
export async function erstelleMarkteinschaetzung(
  objekt: Objekt
): Promise<Markteinschaetzung> {
  const hinweis = grenzwertHinweis(objekt);
  if (hinweis) throw new SprengnetterFehler(hinweis, "Grenzwert verletzt");

  if (sprengnetterMockAktiv()) {
    return mockEinschaetzung(objekt);
  }

  const request = baueReportRequest(objekt);

  // TODO Vertrag: zwei Abrufe je Bewertung (SRC und PDF), siehe
  // Kopfkommentar. Bei Doppelberechnung auf einen Abruf umstellen.
  const srcAntwort = await reportAbruf(request, "SRC");
  const roh = await srcAntwort.json().catch(() => {
    throw new SprengnetterFehler(
      "Die Antwort der Markteinschätzung konnte nicht gelesen werden. Bitte versuchen Sie es später noch einmal.",
      "SRC-Antwort war kein JSON"
    );
  });
  const quelleDaten = normalisiereSrc(roh);

  let pdf: Uint8Array | null = null;
  try {
    const pdfAntwort = await reportAbruf(request, "PDF");
    pdf = new Uint8Array(await pdfAntwort.arrayBuffer());
  } catch (fehler) {
    // wirkung: gewollt, das PDF ist Beigabe: scheitert nur sein Abruf, bleibt die
    // Einschätzung nutzbar, und das Dokument lässt sich später nachholen
    console.error("[sprengnetter] PDF-Abruf fehlgeschlagen:", fehler);
  }

  return {
    spanneMin: quelleDaten.kaufpreis.min,
    spanneMax: quelleDaten.kaufpreis.max,
    quelle: "sprengnetter",
    quelleDaten,
    pdf,
  };
}

/** Anzeige-Hilfe: stammt eine Bewertung aus dem Mock-Modus? */
export function istMockQuelle(quelle: string): boolean {
  return quelle === "sprengnetter-mock";
}
