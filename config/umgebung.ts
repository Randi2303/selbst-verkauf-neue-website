/**
 * DER KATALOG DER UMGEBUNGSPUNKTE, an EINER Stelle wie die Checklisten
 * und die KI-Vorgaben: Was in der Umgebung eines Objekts abgefragt,
 * dem Verkäufer zur Bestätigung vorgelegt und danach ausgespielt wird.
 *
 * Die Auswahl folgt dem, wonach Käufer wirklich fragen, in dieser
 * Reihenfolge: Familie, Alltag, Weg zur Arbeit, Freizeit. Bewusst
 * NICHT alles, was OpenStreetMap kennt: Eine Liste, die der Verkäufer
 * in zwei Minuten durchgehen kann, schlägt eine vollständige.
 *
 * Eine neue Sorte ist EIN Eintrag hier plus ein Selektor in
 * lib/umgebung.ts (der Overpass-Teil ist Serversache und bleibt aus
 * dem Browser-Paket heraus). KEINE Migration nötig: Die Tabelle
 * umgebungspunkte prüft die Kategorie mit Absicht nicht selbst,
 * damit der Katalog ohne Schema-Änderung wachsen kann; die Anwendung
 * validiert gegen diese Liste (siehe app/api/umgebung).
 *
 * ENTFERNUNGEN sind LUFTLINIE und werden überall so beschriftet.
 * Begründung: Die Luftlinie ist ehrlich berechenbar; ein "Fußweg"
 * wäre eine Schätzung aus einem Routing-Dienst, den wir nicht
 * befragen, und eine erfundene Gehminute ist genau die Sorte Angabe,
 * die wir nirgendwo dulden. Gerundet wird unter einem Kilometer auf
 * 50 m, darüber auf 100 m (umgebungsEntfernung unten).
 */

export type UmgebungsGruppeId = "familie" | "alltag" | "arbeitsweg" | "freizeit";

export type UmgebungsKategorieId =
  | "kindergarten"
  | "grundschule"
  | "weiterfuehrende_schule"
  | "spielplatz"
  | "supermarkt"
  | "baecker"
  | "apotheke"
  | "arzt"
  | "post"
  | "bushaltestelle"
  | "bahnhof"
  | "autobahn"
  | "park_wald"
  | "sport_schwimmbad"
  | "restaurant_cafe";

export const UMGEBUNGS_GRUPPEN: { id: UmgebungsGruppeId; titel: string }[] = [
  { id: "familie", titel: "Für Familien" },
  { id: "alltag", titel: "Für den Alltag" },
  { id: "arbeitsweg", titel: "Für den Weg zur Arbeit" },
  { id: "freizeit", titel: "Für die Freizeit" },
];

export type UmgebungsKategorie = {
  id: UmgebungsKategorieId;
  gruppe: UmgebungsGruppeId;
  /** Anzeige in Liste, Exposé und Objektseite, Einzahl */
  label: string;
  /** Suchradius der Abfrage in Metern (Luftlinie um das Objekt) */
  radiusM: number;
  /** Wie viele nächstgelegene Treffer vorgelegt werden */
  hoechstens: number;
  /**
   * Ersatzname, wenn OpenStreetMap keinen Namen kennt. null heißt:
   * ohne Namen wird der Treffer verworfen, weil erst der Name die
   * Angabe prüfbar macht (ein "Restaurant, 400 m" ohne Namen ist
   * nichts, wofür jemand geradestehen kann).
   */
  ohneNamen: string | null;
  /**
   * Woerter, mit denen ein Text diese Gattung meinen kann, ohne das
   * Label zu verwenden. Nur fuer die Widerspruchs-Pruefung
   * (config/text-widersprueche.ts): Sie muss "Grundschule und
   * Einkaufsmoeglichkeiten sind zu Fuss erreichbar" der Gattung
   * zuordnen koennen, um die bestaetigte Entfernung dagegenzuhalten.
   *
   * KLEINGESCHRIEBEN und ohne Endungen, verglichen wird auf
   * Wortanfang. "schul" trifft Schule, Schulen, Schulweg; das ist
   * gewollt breit, denn eine Behauptung zu viel zu pruefen kostet
   * einen Hinweis, eine zu wenig kostet die Pruefung.
   */
  woerter?: string[];
};

export const UMGEBUNGS_KATEGORIEN: UmgebungsKategorie[] = [
  /* ---------- Für Familien ---------- */
  { id: "kindergarten", gruppe: "familie", label: "Kindergarten", radiusM: 2000, hoechstens: 2, ohneNamen: "Kindergarten", woerter: ["kindergarten", "kita", "krippe", "kindertages"] },
  { id: "grundschule", gruppe: "familie", label: "Grundschule", radiusM: 3000, hoechstens: 2, ohneNamen: null, woerter: ["grundschule", "schule", "schulen"] },
  { id: "weiterfuehrende_schule", gruppe: "familie", label: "Weiterführende Schule", radiusM: 8000, hoechstens: 2, ohneNamen: null, woerter: ["gymnasium", "realschule", "oberschule", "gesamtschule", "weiterführende"] },
  { id: "spielplatz", gruppe: "familie", label: "Spielplatz", radiusM: 1500, hoechstens: 1, ohneNamen: "Spielplatz", woerter: ["spielplatz", "spielplätze"] },

  /* ---------- Für den Alltag ---------- */
  { id: "supermarkt", gruppe: "alltag", label: "Supermarkt", radiusM: 3000, hoechstens: 2, ohneNamen: null, woerter: ["supermarkt", "supermärkte", "einkauf", "einkaufsmöglichkeit", "lebensmittel", "nahversorgung", "versorgung"] },
  { id: "baecker", gruppe: "alltag", label: "Bäckerei", radiusM: 2000, hoechstens: 1, ohneNamen: null, woerter: ["bäcker", "bäckerei"] },
  { id: "apotheke", gruppe: "alltag", label: "Apotheke", radiusM: 3000, hoechstens: 1, ohneNamen: "Apotheke", woerter: ["apotheke"] },
  { id: "arzt", gruppe: "alltag", label: "Arztpraxis", radiusM: 3000, hoechstens: 1, ohneNamen: "Arztpraxis", woerter: ["arzt", "ärzte", "arztpraxis", "hausarzt", "praxen"] },
  { id: "post", gruppe: "alltag", label: "Post und Paket", radiusM: 3000, hoechstens: 1, ohneNamen: "Poststelle", woerter: ["post", "paketshop", "postfiliale"] },

  /* ---------- Für den Weg zur Arbeit ---------- */
  { id: "bushaltestelle", gruppe: "arbeitsweg", label: "Bushaltestelle", radiusM: 1000, hoechstens: 1, ohneNamen: "Bushaltestelle", woerter: ["bushaltestelle", "bushalt", "bus"] },
  { id: "bahnhof", gruppe: "arbeitsweg", label: "Bahnhof", radiusM: 10000, hoechstens: 1, ohneNamen: null, woerter: ["bahnhof", "bahn", "haltepunkt", "zug"] },
  { id: "autobahn", gruppe: "arbeitsweg", label: "Autobahnauffahrt", radiusM: 15000, hoechstens: 1, ohneNamen: "Autobahnauffahrt", woerter: ["autobahn", "auffahrt", "anschlussstelle", "a1", "a30", "a33"] },

  /* ---------- Für die Freizeit ---------- */
  { id: "park_wald", gruppe: "freizeit", label: "Park oder Wald", radiusM: 2500, hoechstens: 2, ohneNamen: null, woerter: ["park", "wald", "grünanlage", "naherholung"] },
  { id: "sport_schwimmbad", gruppe: "freizeit", label: "Sport und Schwimmbad", radiusM: 5000, hoechstens: 2, ohneNamen: null, woerter: ["sport", "sporthalle", "schwimmbad", "hallenbad", "freibad"] },
  { id: "restaurant_cafe", gruppe: "freizeit", label: "Restaurant oder Café", radiusM: 2000, hoechstens: 2, ohneNamen: null, woerter: ["restaurant", "café", "cafe", "gastronomie", "gaststätte", "lokal"] },
];

/**
 * WIE EIN UMGEBUNGSPUNKT ANGEZEIGT WIRD, an EINER Stelle entschieden.
 *
 * Bis zum 20.08.2026 stand die Regel dreimal wortgleich in drei
 * Dateien (Objektseite, Konto-Karte, Exposé) und lautete: Zeige
 * "Gattung: Name", ausser der Name IST die Gattung. Sie war für den
 * namenlosen Fall gedacht und griff bei "Grundschule Lechtingen"
 * nicht, weil "Grundschule" nicht gleich "Grundschule Lechtingen"
 * ist. Auf der Objektseite stand deshalb "Grundschule: Grundschule
 * Lechtingen", und die Zuführung an die KI hatte gar keine Regel und
 * schickte sogar "Kindergarten: Kindergarten" ans Modell.
 *
 * ES WIRD NICHTS AM GESPEICHERTEN NAMEN GEÄNDERT. Diese Funktion
 * entscheidet nur, was angezeigt wird. Der Kartenname bleibt, wie er
 * ist, denn er ist unser Beleg dafür, dass wir nichts erfunden haben.
 */
export function umgebungsAnzeige(punkt: {
  kategorie: string;
  name: string;
}): {
  /** Die Gattung, immer gesetzt */
  gattung: string;
  /** true, wenn der Name die Gattung bereits anführt */
  gattungImNamen: boolean;
  /** true, wenn in der Karte gar kein Name stand */
  ohneNamen: boolean;
  /** Der Name, wie er gespeichert ist. null bei ohneNamen. */
  name: string | null;
  /**
   * Der Name ohne die führende Gattung, für Darstellungen, die die
   * Gattung ohnehin danebenstellen (die Spalte der Objektseite).
   * Fällt auf den vollen Namen zurück, wenn das Kürzen zu wenig
   * übrig liesse.
   */
  nameOhneGattung: string | null;
  /**
   * Eine Zeile für Fliesstext, Exposé, Konto-Karte und die Zuführung
   * an die KI. Enthält die Gattung genau einmal.
   */
  einzeilig: string;
} {
  const kat = umgebungsKategorie(punkt.kategorie);
  const gattung = kat?.label ?? punkt.kategorie;
  const name = (punkt.name ?? "").trim();

  if (kat?.ohneNamen && name === kat.ohneNamen) {
    return {
      gattung,
      gattungImNamen: true,
      ohneNamen: true,
      name: null,
      nameOhneGattung: null,
      einzeilig: gattung,
    };
  }

  const gattungImNamen = name.toLowerCase().startsWith(`${gattung.toLowerCase()} `);
  /* Nur kürzen, wenn danach noch ein tragfähiges Wort steht. Aus
     "Grundschule Lechtingen" wird "Lechtingen", aus einem
     hypothetischen "Bäckerei am" nichts. */
  const rest = gattungImNamen ? name.slice(gattung.length).trim() : "";
  const nameOhneGattung = rest.length >= 3 ? rest : name;

  return {
    gattung,
    gattungImNamen,
    ohneNamen: false,
    name,
    nameOhneGattung,
    einzeilig: gattungImNamen ? name : `${gattung}: ${name}`,
  };
}

export function umgebungsKategorie(
  id: string
): UmgebungsKategorie | undefined {
  return UMGEBUNGS_KATEGORIEN.find((k) => k.id === id);
}

/* ------------------------------------------------------------------ */
/* Die Schulregel, an EINER Stelle fuer Abfrage und Portalexport       */
/* ------------------------------------------------------------------ */

/**
 * Was die Karte als Schule fuehrt, ist nicht immer eine Schule im
 * Sinne eines Kaeufers (Befund des Inhabers vom 18.08.2026: ein
 * "Studienseminar ... fuer die Lehraemter an Grund-, Haupt- und
 * Realschulen" ist eine Ausbildungsstaette fuer Referendare, kein
 * Vorschlag fuers Kind). Diese Begriffe schliessen einen Treffer aus,
 * BEVOR isced oder Namensregel greifen. Bewusst eng gefasst
 * ("studienseminar", nicht "seminar"): Eine echte "Grundschule
 * Seminarstrasse" darf nicht mit ausfliegen.
 */
const KEINE_SCHULE = [
  "studienseminar",
  "priesterseminar",
  "lehramt",
  "lehrämter",
  "lehraemter",
  "volkshochschule",
  "musikschule",
  "fahrschule",
  "tanzschule",
  "sprachschule",
  "ballettschule",
  "kunstschule",
  "schwimmschule",
  "nachhilfe",
  "hochschule",
  "universität",
  "universitaet",
  "akademie",
  "berufsschule",
  "berufskolleg",
  "fachschule",
  // Verwaltungsnotiz der Karte; der Hauptstandort steht als eigener
  // Punkt in der Liste
  "ausweichstandort",
];

/**
 * Grundschule oder weiterfuehrend? Zuerst die Ausschlussliste, dann
 * isced:level (1 = Primarstufe, 2/3 = Sekundarstufe), zuletzt der
 * Name. Was sich nicht eindeutig zuordnen laesst, wird NICHT geraten:
 * Ein Vorschlag, den man wegstreichen muss, ist schlechter als einer,
 * der gar nicht erst kommt.
 */
export function schulArt(
  name: string | null | undefined,
  iscedLevel?: string | null
): "grundschule" | "weiterfuehrend" | null {
  const n = (name ?? "").toLowerCase();
  if (KEINE_SCHULE.some((begriff) => n.includes(begriff))) return null;
  const stufen = (iscedLevel ?? "").split(/[;,\-\s]+/).filter(Boolean);
  if (stufen.includes("1")) return "grundschule";
  if (stufen.includes("2") || stufen.includes("3")) return "weiterfuehrend";
  if (n.includes("grundschule")) return "grundschule";
  if (
    /(gymnasium|realschule|gesamtschule|hauptschule|oberschule|sekundarschule|stadtteilschule|gemeinschaftsschule)/.test(
      n
    )
  ) {
    return "weiterfuehrend";
  }
  return null;
}

/**
 * Die Schulform fuers OpenImmo-Distanzfeld, NUR aus dem Namen und nur
 * ueber die Ausschlussliste hinweg; sonst kein Eintrag statt geraten.
 */
export function schulform(
  name: string
): "GYMNASIUM" | "REALSCHULE" | "GESAMTSCHULE" | "HAUPTSCHULE" | null {
  if (schulArt(name) !== "weiterfuehrend") return null;
  const n = name.toLowerCase();
  if (n.includes("gymnasium")) return "GYMNASIUM";
  if (n.includes("realschule")) return "REALSCHULE";
  if (n.includes("gesamtschule")) return "GESAMTSCHULE";
  if (n.includes("hauptschule")) return "HAUPTSCHULE";
  return null;
}

/** Eine Zeile der Liste, wie Browser, Exposé und Export sie sehen */
export type Umgebungspunkt = {
  id: string;
  objekt_id: string;
  kategorie: string;
  name: string;
  /** Luftlinie in Metern, null bei Hand-Einträgen ohne Angabe */
  entfernung_m: number | null;
  status: "offen" | "bestaetigt" | "gestrichen";
  quelle: "osm" | "hand";
  osm_kennung: string | null;
  /**
   * Der Name, wie ihn die Karte liefert (Migration 0093). Unveraenderlich,
   * sobald gesetzt (Trigger aus 0094). Weicht name davon ab, hat der
   * Eigentuemer den Namen angepasst, und genau das bleibt sichtbar.
   * null bei Eintraegen von Hand: Dort gibt es keinen Kartennamen.
   */
  name_karte?: string | null;
};

/**
 * Entfernung fürs Lesen: unter 1 km auf 50 m gerundet ("650 m"),
 * darüber auf 100 m ("1,2 km"). Der Zusatz "Luftlinie" steht EINMAL
 * an der Liste, nicht an jeder Zeile.
 */
export function umgebungsEntfernung(meter: number | null): string | null {
  if (meter == null || !Number.isFinite(meter) || meter < 0) return null;
  /* Vor m und km steht ein GESCHUETZTES Leerzeichen (U+00A0, im Code
     unsichtbar), wie bei den Umbruch-Formern in lib/utils.ts: Zahl
     und Einheit brechen nie auseinander. Beim Bearbeiten nicht durch
     ein normales ersetzen. */
  if (meter < 1000) {
    const gerundet = Math.max(50, Math.round(meter / 50) * 50);
    return `${gerundet} m`;
  }
  const km = Math.round(meter / 100) / 10;
  return `${km.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/** Nur bestätigte Punkte, in Katalog-Reihenfolge, je Kategorie nach Nähe */
export function bestaetigteUmgebung(
  punkte: Umgebungspunkt[]
): Umgebungspunkt[] {
  const reihenfolge = new Map(
    UMGEBUNGS_KATEGORIEN.map((k, i) => [k.id as string, i])
  );
  return punkte
    .filter((p) => p.status === "bestaetigt")
    .sort((a, b) => {
      const ka = reihenfolge.get(a.kategorie) ?? 99;
      const kb = reihenfolge.get(b.kategorie) ?? 99;
      if (ka !== kb) return ka - kb;
      const ea = a.entfernung_m ?? Number.MAX_SAFE_INTEGER;
      const eb = b.entfernung_m ?? Number.MAX_SAFE_INTEGER;
      return ea - eb;
    });
}
