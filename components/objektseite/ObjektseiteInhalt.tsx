import { CheckCircle2, Download, FileCheck2, Mail } from "lucide-react";
import AnfrageFormular from "@/components/objektseite/AnfrageFormular";
import Galerie from "@/components/objektseite/Galerie";
import Karte from "@/components/objektseite/Karte";
import MedienEinbettung from "@/components/objektseite/MedienEinbettung";
import { webVerweis } from "@/lib/verweis";
import SeitenNav from "@/components/objektseite/SeitenNav";
import StartseitenLink from "@/components/layout/StartseitenLink";
import Wordmark from "@/components/layout/Wordmark";
import {
  AUSSTATTUNGSQUALITAETEN,
  BAD_MERKMALE,
  BEZUGSFREI_TYPEN,
  ENERGIEAUSWEIS_TYPEN,
  ENERGIETRAEGER,
  FUSSBODEN_WERTE,
  HEIZUNGSARTEN,
  OBJEKTART_LABELS,
  objekttypLabel,
  stellplaetzeText,
  WEITERE_AUSSTATTUNG,
  wertLabel,
  ZUSTAND_WERTE,
  type Objekt,
} from "@/lib/objekt-felder";
import { anzeigeName } from "@/lib/dateiname";
import {
  BILD_BREITEN,
  gespeicherteBreite,
  kleineAdresse,
  kleineAdressen,
  volleAdressen,
} from "@/lib/bild-adressen";
import { provisionsAngabe } from "@/lib/provision";
import {
  UMGEBUNGS_GRUPPEN,
  bestaetigteUmgebung,
  umgebungsAnzeige,
  umgebungsEntfernung,
  umgebungsKategorie,
  type Umgebungspunkt,
} from "@/config/umgebung";
import {
  exportPfad,
  oeffentlichZeigbar,
  sortierteFotos,
  typLabel,
  type Unterlage,
} from "@/lib/unterlagen";
import { formatEuro, formatNumber, ohneUmbruch } from "@/lib/utils";
import { supabaseService } from "@/lib/supabase/service";
/* EINE Quelle fuer den Inseratstitel, dieselbe wie Portale und Expose. */
import { inseratsTitel } from "@/lib/portale/openimmo";

/**
 * DIE Objektseite, einmal gebaut fuer alle drei Wege hinein: die
 * oeffentliche Adresse (/o/<kennung>, mit Anfrage-Formular), der
 * persoenliche Interessenten-Link und der Teilen-Link des Verkaeufers
 * (beide /expose/<token>, mit PDF-Download statt Formular) sowie die
 * Vorschau des Verkaeufers (/vorschau/objektseite). Das PDF ist nur
 * eine andere Form derselben Seite.
 *
 * GRUNDSAETZE dieser Seite:
 * - KEINE Telefonnummer, von niemandem: Der Weg zum Eigentuemer ist
 *   IMMER das Formular bzw. die Mail-Antwort. KEIN MAKLER, nirgends
 *   (Festlegung des Inhabers, 25.08.2026): Auf der Objektseite steht
 *   der Verkaeufer; der begleitende Makler existiert ausschliesslich
 *   im Konto des Kunden. Der fruehere Schalter makler_auf_seite ist
 *   ersatzlos gefallen.
 * - Dokumente NIEMALS oeffentlich: keine Dateien, keine Links, nur die
 *   ruhige Zeile, WAS vorliegt (Grundbuch traegt Eigentuemer und
 *   Grundschulden). Grundrisse sind die bewusste Ausnahme, als Bilder
 *   in Export-Fassung.
 * - Adresse und Karte folgen dem Freigabe-Schalter: ohne Freigabe nur
 *   Ort und Umkreis.
 */

/** Ein Bild einer Galerie: volle Adresse (Grundlage und Rueckfall) und Beschriftung */
export type GalerieBild = { voll: string; name: string };

/**
 * Die Quellen einer Galerie in den Anzeige-Groessen aus
 * lib/bild-adressen.ts (Ladezeiten-Runde, 18.08.2026):
 *
 * - `bilder` traegt die VOLLEN Adressen, als Rueckfall bei einem
 *   Ausfall der Umrechnung und als Vollbild ab Rechnerbreite.
 * - `titelUrl` ist die 1600er des ersten Bilds, synchron signiert,
 *   denn sie ist das Erste, was die Seite zeigt.
 * - `ansichtUrls` (2000) und `miniUrls` (320) sind noch NICHT
 *   eingeloeste Versprechen: Sie braucht nur, wer die Ansicht
 *   oeffnet, und die Seite darf nicht auf ihr Signieren warten. Das
 *   Versprechen geht ungeloest bis in die Galerie und loest sich
 *   waehrend des Ausliefern. Scheitert es, nimmt die Ansicht die
 *   vollen Dateien, langsam, aber nichts ist kaputt.
 */
export type GalerieQuellen = {
  bilder: GalerieBild[];
  titelUrl: string | null;
  ansichtUrls: Promise<(string | null)[]>;
  miniUrls: Promise<(string | null)[]>;
};

export const LEERE_GALERIE: GalerieQuellen = {
  bilder: [],
  titelUrl: null,
  ansichtUrls: Promise.resolve([]),
  miniUrls: Promise.resolve([]),
};

export type ObjektseiteDaten = {
  fotos: GalerieQuellen;
  grundrisse: GalerieQuellen;
  /** Deutsche Labels der vorliegenden Unterlagen, ohne Dateien */
  dokumente: string[];
  koordinaten: { lat: number; lng: number; genau: boolean } | null;
  /** Nur gesetzt, wenn Makler-Begleitung gebucht und Schalter an */
  /** Der Verkaeufer als Ansprechweg, nur der gepflegte Profilname */
  verkaeufer: { name: string } | null;
  /** NUR die vom Eigentümer bestätigten Umgebungspunkte (0088) */
  umgebung: Umgebungspunkt[];
};

export const LEERE_SEITEN_DATEN: ObjektseiteDaten = {
  fotos: LEERE_GALERIE,
  grundrisse: LEERE_GALERIE,
  dokumente: [],
  koordinaten: null,
  verkaeufer: null,
  umgebung: [],
};

/**
 * Fotos in Export-Fassung: Speicherpfad und Beschriftung, in
 * Galerie-Reihenfolge.
 *
 * DAS ERSTE IST DAS TITELBILD, ohne Umsortieren. Hier stand bis zum
 * 14.08.2026 ein Griff, der ein markiertes Titelbild nach vorn zog;
 * seit die Reihenfolge das allein bestimmt (Migration 0067), ist der
 * Griff genau die Doppelung, die wir abgeschafft haben.
 */
async function fotoZeilen(
  objekt: Objekt
): Promise<{ pfad: string; name: string; quellBreite: number | null }[]> {
  const service = supabaseService();
  if (!service || !objekt.id) return [];
  const { data: unterlagen } = await service
    .from("unterlagen")
    .select("*")
    .eq("objekt_id", objekt.id)
    .eq("typ", "fotos")
    .order("sortierung", { ascending: true })
    .returns<Unterlage[]>();
  return sortierteFotos(unterlagen ?? [])
    .filter(oeffentlichZeigbar)
    .map((f) => ({
      pfad: exportPfad(f, objekt.wasserzeichen_an, "objektseite"),
      name: anzeigeName(f.datei_name),
      quellBreite: gespeicherteBreite(f),
    }));
}

/**
 * Aus Speicherpfaden die Galerie-Quellen bauen, fuer Fotos wie
 * Grundrisse derselbe Weg. Signiert wird ueber lib/bild-adressen.ts
 * (Wiederverwendung im Halbstunden-Raster): die vollen Adressen im
 * Buendel, die 1600er des Titelbilds synchron, die 2000er und die
 * Leisten-Fassungen als ungeloeste Versprechen (Begruendung am Typ
 * GalerieQuellen). kleineAdressen scheitert nie laut, gescheiterte
 * Eintraege sind null und die Ansicht nimmt dann die volle Datei.
 */
export async function galerieQuellen(
  zeilen: { pfad: string; name: string; quellBreite?: number | null }[]
): Promise<GalerieQuellen> {
  if (zeilen.length === 0) return LEERE_GALERIE;
  const karte = await volleAdressen(zeilen.map((z) => z.pfad));
  const da = zeilen.filter((z) => karte.has(z.pfad));
  if (da.length === 0) return LEERE_GALERIE;
  const breiten = da.map((z) => z.quellBreite ?? null);
  return {
    bilder: da.map((z) => ({ voll: karte.get(z.pfad)!, name: z.name })),
    titelUrl: await kleineAdresse(da[0].pfad, BILD_BREITEN.titel, breiten[0]),
    ansichtUrls: kleineAdressen(
      da.map((z) => z.pfad),
      BILD_BREITEN.ansicht,
      breiten
    ),
    miniUrls: kleineAdressen(
      da.map((z) => z.pfad),
      BILD_BREITEN.leiste,
      breiten
    ),
  };
}

export async function ladeObjektFotos(objekt: Objekt): Promise<GalerieQuellen> {
  return galerieQuellen(await fotoZeilen(objekt));
}

/**
 * Grundrisse (nur Bilder, in Export-Fassung) und die Liste der
 * vorliegenden Unterlagen als blosse Labels. BEWUSST keine Adressen
 * oder Dateien fuer Dokumente.
 */
export async function ladeGrundrisseUndDokumente(
  objekt: Objekt
): Promise<{ grundrisse: GalerieQuellen; dokumente: string[] }> {
  const service = supabaseService();
  if (!service || !objekt.id) return { grundrisse: LEERE_GALERIE, dokumente: [] };
  const { data: unterlagen } = await service
    .from("unterlagen")
    .select("*")
    .eq("objekt_id", objekt.id)
    .neq("typ", "fotos")
    .returns<Unterlage[]>();
  const liste = unterlagen ?? [];

  /* DER HAKEN DES VERKAEUFERS GILT AUCH HIER (Befund vom 23.08.2026).
     Bis dahin stand hier nur `u.typ === "grundrisse"`, ohne im_expose.
     Fotos wurden gefiltert, Grundrisse nicht: Ein Grundriss, dessen
     Haken nie gesetzt war, stand damit auf der oeffentlichen
     Objektseite. Gemessen an einem Pruefobjekt mit im_expose = false.

     oeffentlichZeigbar prueft BEIDES, erst die Art, dann den Haken. */
  const grundrissBilder = liste.filter(
    (u) => u.typ === "grundrisse" && u.mime.startsWith("image/") && oeffentlichZeigbar(u)
  );
  const grundrisse = await galerieQuellen(
    grundrissBilder.map((g) => ({
      pfad: exportPfad(g, objekt.wasserzeichen_an, "objektseite"),
      name: anzeigeName(g.datei_name),
      quellBreite: gespeicherteBreite(g),
    }))
  );

  /* DIE FREIGABE GILT AUCH FUER DIE BLOSSE NENNUNG (Befund vom
     29.08.2026).

     Hier stand bis heute weder eine Pruefung der ART noch des HAKENS.
     Gemessen am Vorfuehrobjekt nannte die Zeile "Unterlagen liegen
     vor: ..." acht Arten, darunter VIER, die laut lib/unterlagen.ts
     nie oeffentlich duerfen: Grundbuchauszug, Flurkarte,
     Baulastenauskunft und Sonstiges. Es ging keine Datei hinaus, nur
     ihr Name; aber "Baulastenauskunft liegt vor" ist eine Aussage
     ueber das Objekt, die der Verkaeufer nicht freigegeben hat.

     ES IST DERSELBE FEHLER WIE AM 23.08.2026 bei den Grundrissen, nur
     eine Zeile weiter unten. Die Bau-Pruefung fing ihn damals nicht,
     weil sie nach FALSCHEN Filtern suchte und hier gar keiner stand
     (AGENTS.md, "Eine Suche sichert die Schreibweise, nicht die
     Vollstaendigkeit"). Seit dem 29.08. prueft
     scripts/unterlagen-oeffentlich-pruefen.mts auch die andere
     Richtung.

     FOTOS FALLEN MIT WEG, und das ist eine zweite Berichtigung: Sie
     standen als "Fotos" in der Liste der Dokumente, obwohl sie in der
     Galerie darueber schon zu sehen sind. Eine Unterlage sind sie
     nicht. */
  const dokumentTypen = Array.from(
    new Set(
      liste
        .filter((u) => u.typ !== "grundrisse" && u.typ !== "fotos" && oeffentlichZeigbar(u))
        .map((u) => u.typ)
    )
  );
  const dokumente = dokumentTypen.map((t) => typLabel(t));
  if (
    liste.some(
      (u) => u.typ === "grundrisse" && !u.mime.startsWith("image/") && oeffentlichZeigbar(u)
    )
  ) {
    dokumente.unshift("Grundrisse");
  }
  return { grundrisse, dokumente };
}

/** Was eine Seite nach dem Verkauf noch sagt: nichts als das */
export function ObjektVerkauft() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <StartseitenLink className="inline-block rounded-md">
        <Wordmark />
      </StartseitenLink>
      <CheckCircle2 size={34} strokeWidth={1.5} className="text-success" />
      <h1 className="font-heading text-[1.6rem] font-semibold tracking-[-0.01em] text-ink">
        Dieses Objekt ist verkauft.
      </h1>
      <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
        Vielen Dank für Ihr Interesse. Wenn Sie selbst verkaufen möchten,
        begleiten wir Sie gern: selbst-verkauf.de.
      </p>
    </main>
  );
}

/** Freundliche Ansicht fuer alte QR-Codes und zurueckgezogene Links */
export function ObjektNichtVerfuegbar() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <StartseitenLink className="inline-block rounded-md">
        <Wordmark />
      </StartseitenLink>
      <h1 className="font-heading text-[1.6rem] font-semibold tracking-[-0.01em] text-ink">
        Dieses Objekt wird gerade nicht angeboten.
      </h1>
      <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
        Vielleicht ist die Seite noch nicht freigegeben oder das Angebot
        wurde beendet. Wenn Sie den Weg über einen Aushang oder eine E-Mail
        gefunden haben, fragen Sie gern direkt beim Anbieter nach.
      </p>
    </main>
  );
}

type Zeile = { label: string; wert: string };
const zeile = (label: string, wert: string | null | undefined): Zeile | null =>
  wert ? { label, wert } : null;
const echteZeilen = (liste: (Zeile | null)[]): Zeile[] =>
  liste.filter((z): z is Zeile => z !== null);

export default function ObjektseiteInhalt({
  objekt,
  daten,
  formularKennung,
  pdfPfad,
}: {
  objekt: Objekt;
  daten: ObjektseiteDaten;
  /** Gesetzt auf der oeffentlichen Seite: zeigt das Anfrage-Formular */
  formularKennung: string | null;
  /** Gesetzt auf persoenlichen Links: das Expose als PDF daneben */
  pdfPfad: string | null;
}) {
  /**
   * DIE ÜBERSCHRIFT KOMMT AUS inseratsTitel() UND NIRGENDWO SONST
   * (Entscheidung des Inhabers, 29.08.2026).
   *
   * WAS HIER STAND: derselbe Vorrang für die eigene Überschrift des
   * Verkäufers, aber ein EIGENER Rückfall darunter ("Objektart in
   * Stadt"). Damit gab es zwei Leitern für dieselbe Sache. Wer keine
   * Überschrift schreibt, bekam auf dieser Seite "Einfamilienhaus in
   * Wallenhorst" und auf den Portalen "Gepflegtes Einfamilienhaus in
   * Wallenhorst, 148 m², 5 Zimmer". Zwei Rückfälle an zwei Stellen
   * sind genau das Doppelte, das später auseinanderläuft.
   *
   * inseratsTitel() prüft zuerst die eigene Überschrift, baut sonst
   * eine aus Objekttyp, Zustand, Ort, Fläche und Zimmerzahl und hält
   * dabei die strengste Portal-Grenze ein. Sie gibt nie etwas Leeres
   * zurück; der frühere Notnagel "Immobilie" steckt als letzte Stufe
   * bereits darin.
   */
  const bezeichnung = inseratsTitel(objekt);

  const adresse = objekt.adresse_freigeben
    ? [objekt.strasse, [objekt.plz, objekt.stadt].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
    : [objekt.plz, objekt.stadt].filter(Boolean).join(" ");

  const beschreibungen = echteZeilen([
    zeile("Das Objekt", objekt.beschreibung_objekt),
    zeile("Die Ausstattung", objekt.beschreibung_ausstattung),
    zeile("Sonstiges", objekt.beschreibung_sonstiges),
  ]).map((z) => ({ titel: z.label, text: z.wert }));

  /* Objektdaten in Gruppen, zweispaltig; nur belegte Zeilen */
  const flaeche = (wert: number | null) =>
    wert ? ohneUmbruch(`${formatNumber(wert)} m²`) : null;
  const jaWenn = (wert: boolean) => (wert ? "ja" : null);
  const gruppen: { titel: string; zeilen: Zeile[] }[] = [
    {
      titel: "Objekt",
      zeilen: echteZeilen([
        zeile("Objektart", objekttypLabel(objekt.objekttyp) || OBJEKTART_LABELS[objekt.objektart]),
        zeile("Baujahr", objekt.baujahr ? String(objekt.baujahr) : null),
        zeile("Zustand", objekt.zustand ? wertLabel(ZUSTAND_WERTE, objekt.zustand) : null),
        zeile(
          "Letzte Modernisierung",
          objekt.modernisierung_jahr ? String(objekt.modernisierung_jahr) : null
        ),
        zeile(
          "Ausstattungsqualität",
          objekt.ausstattungsqualitaet
            ? wertLabel(AUSSTATTUNGSQUALITAETEN, objekt.ausstattungsqualitaet)
            : null
        ),
        zeile("Denkmalschutz", jaWenn(objekt.denkmalgeschuetzt)),
        zeile("Erbbaurecht", jaWenn(objekt.erbbaurecht)),
      ]),
    },
    {
      titel: "Flächen und Räume",
      zeilen: echteZeilen([
        zeile("Wohnfläche", flaeche(objekt.wohnflaeche_qm)),
        objekt.objektart !== "wohnung"
          ? zeile("Grundstück", flaeche(objekt.grundstuecksflaeche_qm))
          : null,
        zeile("Nutzfläche", flaeche(objekt.nutzflaeche_qm)),
        zeile("Zimmer", objekt.zimmer ? formatNumber(objekt.zimmer) : null),
        zeile("Schlafzimmer", objekt.schlafzimmer ? String(objekt.schlafzimmer) : null),
        zeile("Badezimmer", objekt.badezimmer ? String(objekt.badezimmer) : null),
        objekt.objektart === "wohnung"
          ? zeile("Etage", objekt.etage !== null ? String(objekt.etage) : null)
          : null,
        zeile(
          "Etagen im Haus",
          objekt.etagen_gesamt ? String(objekt.etagen_gesamt) : null
        ),
        zeile(
          "Wohneinheiten",
          objekt.objektart === "mehrfamilienhaus" && objekt.anzahl_wohneinheiten
            ? String(objekt.anzahl_wohneinheiten)
            : null
        ),
        zeile("Keller", jaWenn(objekt.keller)),
        zeile("Dachboden", jaWenn(objekt.dachboden)),
      ]),
    },
    {
      titel: "Außenflächen und Stellplätze",
      zeilen: echteZeilen([
        zeile(
          "Balkon oder Terrasse",
          objekt.balkon || objekt.terrasse
            ? (flaeche(objekt.balkon_terrasse_flaeche_qm) ?? "ja")
            : null
        ),
        zeile("Garten", objekt.garten ? (flaeche(objekt.gartenflaeche_qm) ?? "ja") : null),
        zeile("Stellplätze", stellplaetzeText(objekt.stellplaetze ?? {}) || null),
      ]),
    },
    {
      titel: "Heizung",
      zeilen: echteZeilen([
        zeile(
          "Heizungsart",
          objekt.heizungsart ? wertLabel(HEIZUNGSARTEN, objekt.heizungsart) : null
        ),
        zeile(
          "Baujahr der Heizung",
          objekt.heizung_baujahr ? String(objekt.heizung_baujahr) : null
        ),
      ]),
    },
    {
      titel: "Verfügbarkeit und Kosten",
      zeilen: echteZeilen([
        zeile("Vermietet", jaWenn(objekt.vermietet)),
        objekt.objektart === "mehrfamilienhaus" && objekt.mieteinnahmen_jahr
          ? zeile("Mieteinnahmen im Jahr", formatEuro(objekt.mieteinnahmen_jahr))
          : null,
        objekt.objektart === "wohnung" && objekt.hausgeld
          ? zeile("Hausgeld", `${formatEuro(objekt.hausgeld)} je Monat`)
          : null,
        !objekt.vermietet && objekt.bezugsfrei_typ
          ? zeile(
              "Bezugsfrei",
              objekt.bezugsfrei_typ === "zum_datum" && objekt.bezugsfrei_datum
                ? `zum ${objekt.bezugsfrei_datum}`
                : wertLabel(BEZUGSFREI_TYPEN, objekt.bezugsfrei_typ)
            )
          : null,
      ]),
    },
  ].filter((g) => g.zeilen.length > 0);

  /* Ausstattungs-Merkmale als ruhige Chips */
  const merkmale = [
    ...[
      [objekt.balkon, "Balkon"],
      [objekt.terrasse, "Terrasse"],
      [objekt.garten, "Garten"],
      [objekt.aufzug, "Aufzug"],
      [objekt.einbaukueche, "Einbauküche"],
      [objekt.gaeste_wc, "Gäste-WC"],
      [objekt.kamin, "Kamin"],
      [objekt.einliegerwohnung, "Einliegerwohnung"],
    ]
      .filter(([an]) => an)
      .map(([, label]) => String(label)),
    ...(objekt.bad ?? []).map((w) => `Bad: ${wertLabel(BAD_MERKMALE, w)}`),
    ...(objekt.fussboden ?? []).map((w) => wertLabel(FUSSBODEN_WERTE, w)),
    ...(objekt.weitere_ausstattung ?? []).map((w) => wertLabel(WEITERE_AUSSTATTUNG, w)),
  ];

  const energie = echteZeilen([
    zeile(
      "Energieausweis",
      objekt.energieausweis_typ
        ? wertLabel(ENERGIEAUSWEIS_TYPEN, objekt.energieausweis_typ)
        : null
    ),
    zeile(
      "Endenergie-Kennwert",
      objekt.endenergie_kennwert
        ? `${formatNumber(objekt.endenergie_kennwert)} kWh/(m²·a)`
        : null
    ),
    zeile(
      "Effizienzklasse",
      objekt.energieeffizienzklasse ? objekt.energieeffizienzklasse.toUpperCase() : null
    ),
    objekt.energietraeger.length > 0
      ? zeile(
          "Wesentlicher Energieträger",
          objekt.energietraeger.map((t) => wertLabel(ENERGIETRAEGER, t)).join(", ")
        )
      : null,
    zeile(
      "Baujahr laut Ausweis",
      objekt.heizung_baujahr ? String(objekt.heizung_baujahr) : null
    ),
  ]);

  /* RUNDGANG UND VIDEO NUR, WENN SIE AUSLIEFERBAR SIND. Beide Spalten
     sind vom Kunden beschreibbar (config/schreibrechte.ts), und diese
     Seite ist oeffentlich; lib/verweis.ts laesst nur http und https
     durch. Die GEPRUEFTEN Werte entscheiden auch ueber die Sprungmarke,
     sonst fuehrte sie auf einen Abschnitt, in dem nichts steht. */
  const rundgangVerweis = webVerweis(objekt.rundgang_link);
  const filmVerweis = webVerweis(objekt.film_link);

  const marken = [
    { id: "ueberblick", label: "Überblick" },
    beschreibungen.length > 0 || rundgangVerweis || filmVerweis
      ? { id: "beschreibung", label: "Beschreibung" }
      : null,
    { id: "objektdaten", label: "Objektdaten" },
    daten.koordinaten || objekt.beschreibung_lage || daten.umgebung.length > 0
      ? { id: "lage", label: "Lage" }
      : null,
    { id: "kontakt", label: "Kontakt" },
  ].filter((m): m is { id: string; label: string } => m !== null);

  const kontaktKnopf = formularKennung ? (
    <a
      href="#kontakt"
      className="inline-flex w-fit items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-medium text-background transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Mail size={15} strokeWidth={1.9} />
      Anfrage stellen
    </a>
  ) : null;

  return (
    /* ZWEI BREITEN, UND SIE HABEN EINEN GRUND.
       Der Rahmen ist breit (max-w-6xl, 1152 px): Er traegt die
       Galerie, die drei Kennzahlen-Karten und die tabellarischen
       Objektdaten. Das sind Dinge, die man ueberfliegt; Enge nimmt
       ihnen die Wirkung, und die Karten stuenden gequetscht.
       Fliesstext bleibt schmal (max-w-2xl, 672 px, siehe unten an den
       Beschreibungen). Eine Zeile mit hundert Zeichen liest sich
       schlecht, weil das Auge am Zeilenende die naechste nicht mehr
       findet. Was man wirklich liest, waechst deshalb nicht mit. */
    <main
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10"
      /* SCHRIFT DER ANWENDUNG (Runde 37, 29.08.2026). Die Objektseite
         steht unter einer oeffentlichen Adresse, gehoert aber zur
         Anwendung: Sie entsteht aus den Daten des Kunden und ist die
         Ausgabe, die der Interessent zu sehen bekommt. Sie traegt
         darum dasselbe Merkmal wie Konto und Admin.

         DAS MERKMAL SITZT HIER UND NICHT AN DEN DREI SEITEN, die
         diesen Baustein rendern (/o/[kennung], /expose/[token],
         /vorschau/objektseite). Eine Stelle statt drei, und eine
         vierte Seite braeuchte spaeter nichts nachzutragen.

         Die Wortmarke gleich darunter bleibt davon unberuehrt: Sie
         traegt `font-marke` (siehe components/layout/Wordmark.tsx). */
      data-bereich="anwendung"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Die Wortmarke fuehrt zur Startseite: Interessenten, die hier
            landen, sollen uns mit einem Klick finden koennen. Der Weg
            zurueck zur Objektseite bleibt der Zurueck-Knopf. */}
        <StartseitenLink className="inline-block rounded-md">
          <Wordmark />
        </StartseitenLink>
        <p className="text-[0.82rem] text-ink-muted">
          Privater Verkauf, provisionsfrei begleitet
        </p>
      </div>

      <SeitenNav marken={marken} />

      {/* DER KOPF DER OBJEKTSEITE (Entwurf C, vom Inhaber freigegeben
          am 20.08.2026): Titel mittig in der Hausfarbe, darunter ein
          feiner Strich in Terrakotta, darunter die Anschrift, und
          erst dann das Bild.

          Vorher stand hier ein linksbuendiger Titel in Anthrazit.
          Diese Seite ist das Erste, was ein Interessent von uns
          sieht, und sie darf beim Oeffnen etwas hermachen.

          DER STRICH IST NICHT NUR ZIERAT: Er trennt Titel und
          Anschrift, ohne eine Zeile zu kosten, und setzt unsere
          zweite Farbe an eine Stelle, an der sie etwas tut. Deshalb
          aria-hidden, er traegt keine Aussage fuer ein
          Vorleseprogramm.

          clamp statt einer Stufe bei sm: So waechst der Titel
          stufenlos mit der Breite, genau wie im vorgelegten Bild.
          Bei 390 Pixeln steht er auf 2rem, ab etwa 940 Pixeln auf
          seinen 2,7rem. */}
      <header
        id="ueberblick"
        className="flex scroll-mt-16 flex-col items-center gap-2 text-center"
      >
        <h1 className="font-heading text-[clamp(2rem,4.6vw,2.7rem)] font-semibold leading-tight tracking-[-0.015em] text-primary">
          {bezeichnung}
        </h1>
        <span aria-hidden="true" className="block h-0.5 w-16 rounded-full bg-accent" />
        <p className="text-[0.95rem] text-ink-muted">{adresse}</p>
      </header>

      <Galerie quellen={daten.fotos} bezeichnung={bezeichnung} />

      {/* Drei Karten unter den Bildern: Zahlen, Ansprechweg, Schritt */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-3xl border border-line/70 bg-paper p-5">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Auf einen Blick
          </h2>
          {objekt.angebotspreis ? (
            <p className="font-heading text-[1.5rem] font-semibold text-primary">
              {formatEuro(objekt.angebotspreis)}
            </p>
          ) : null}
          <dl className="flex flex-col gap-1 text-[0.88rem]">
            {echteZeilen([
              zeile("Zimmer", objekt.zimmer ? formatNumber(objekt.zimmer) : null),
              zeile("Wohnfläche", flaeche(objekt.wohnflaeche_qm)),
              objekt.objektart !== "wohnung"
                ? zeile("Grundstück", flaeche(objekt.grundstuecksflaeche_qm))
                : null,
            ]).map((z) => (
              <div key={z.label} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{z.label}</dt>
                <dd className="font-medium text-ink">{z.wert}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-auto pt-1 text-[0.78rem] text-ink-muted">
            {provisionsAngabe(objekt).kurz}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-3xl border border-line/70 bg-paper p-5">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Ihr Ansprechweg
          </h2>
          {/* IMMER DER VERKAEUFER (Festlegung des Inhabers,
              25.08.2026): Der begleitende Makler taucht nach aussen
              nirgends auf. Keine Telefonnummer, keine Mailadresse;
              der Weg ist das Anfrageformular dieser Seite. */}
          {daten.verkaeufer ? (
            <>
              <p className="text-[0.95rem] font-medium text-ink">
                {daten.verkaeufer.name}
              </p>
              <p className="text-[0.85rem] leading-relaxed text-ink-muted">
                Verkauft diese Immobilie privat und antwortet Ihnen
                persönlich. Ihre Anfrage über diese Seite kommt geschützt
                an, ohne dass private Kontaktdaten im Netz stehen.
              </p>
            </>
          ) : (
            <p className="text-[0.88rem] leading-relaxed text-ink-muted">
              Der Eigentümer verkauft privat und antwortet Ihnen persönlich.
              Ihre Anfrage erreicht ihn geschützt über selbst-verkauf.de.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2.5 rounded-3xl border border-line/70 bg-paper p-5">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Der nächste Schritt
          </h2>
          {formularKennung ? (
            <>
              <p className="text-[0.88rem] leading-relaxed text-ink-muted">
                Stellen Sie Ihre Anfrage, das vollständige Exposé kommt als
                Antwort.
              </p>
              {kontaktKnopf}
            </>
          ) : pdfPfad ? (
            <>
              <p className="text-[0.88rem] leading-relaxed text-ink-muted">
                Laden Sie das vollständige Exposé mit allen Angaben als PDF.
              </p>
              <a
                href={pdfPfad}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/50 px-4 py-2 text-[0.88rem] font-medium text-primary transition-colors hover:bg-surface-tint"
              >
                <Download size={14} strokeWidth={1.9} />
                Exposé als PDF
              </a>
            </>
          ) : (
            <p className="text-[0.88rem] leading-relaxed text-ink-muted">
              Antworten Sie einfach auf die E-Mail, über die Sie diese Seite
              erreicht haben.
            </p>
          )}
        </div>
      </section>

      {(beschreibungen.length > 0 || rundgangVerweis || filmVerweis) && (
        <section id="beschreibung" className="flex scroll-mt-16 flex-col gap-8">
          {beschreibungen.map((b) => (
            <div key={b.titel} className="flex flex-col gap-2">
              <h2 className="font-heading text-[1.25rem] font-semibold text-ink">
                {b.titel}
              </h2>
              <p className="max-w-2xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
                {b.text}
              </p>
            </div>
          ))}
          {rundgangVerweis ? (
            <MedienEinbettung link={rundgangVerweis} sorte="rundgang" />
          ) : null}
          {filmVerweis ? <MedienEinbettung link={filmVerweis} sorte="film" /> : null}
        </section>
      )}

      <section id="objektdaten" className="flex scroll-mt-16 flex-col gap-5">
        <h2 className="font-heading text-[1.25rem] font-semibold text-ink">
          Objektdaten
        </h2>
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
          {gruppen.map((g) => (
            <div key={g.titel} className="flex flex-col gap-1.5">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {g.titel}
              </h3>
              <dl className="flex flex-col">
                {g.zeilen.map((z) => (
                  <div
                    key={z.label}
                    className="flex justify-between gap-4 border-b border-line/40 py-1.5 text-[0.9rem] last:border-b-0"
                  >
                    <dt className="text-ink-muted">{z.label}</dt>
                    <dd className="text-right text-ink">{z.wert}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {merkmale.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Ausstattung
            </h3>
            <ul className="flex flex-wrap gap-2">
              {merkmale.map((m) => (
                <li
                  key={m}
                  className="rounded-full border border-line/70 bg-paper px-3 py-1 text-[0.82rem] text-ink"
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {energie.length > 0 ? (
          <div className="rounded-2xl border border-primary/25 bg-surface-tint/60 p-5">
            <h3 className="font-heading text-[1.05rem] font-semibold text-primary">
              Energieangaben nach GEG
            </h3>
            <dl className="mt-3 flex flex-col gap-1.5">
              {energie.map((z) => (
                <div
                  key={z.label}
                  className="flex flex-wrap justify-between gap-x-4 text-[0.9rem]"
                >
                  <dt className="text-ink-muted">{z.label}</dt>
                  <dd className="text-ink">{z.wert}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {daten.grundrisse.bilder.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Grundrisse
            </h3>
            <Galerie quellen={daten.grundrisse} bezeichnung="Grundriss" />
          </div>
        ) : null}

        {daten.dokumente.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-line/60 bg-paper px-4 py-3.5 text-[0.88rem] leading-relaxed text-ink">
            <FileCheck2 size={17} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
            {/* Zwei Aussagen, zwei Absaetze (Inhaber, Runde 27): WAS
                vorliegt und WIE man herankommt sind verschiedene
                Saetze; angehaengt las sich der zweite wie ein Nachsatz
                der Aufzaehlung. */}
            <div className="flex flex-col gap-1.5">
              <p>
                <span className="font-medium">Unterlagen liegen vor:</span>{" "}
                {daten.dokumente.join(", ")}.
              </p>
              <p className="text-ink-muted">
                Einsicht erhalten ernsthafte Interessenten auf Anfrage direkt
                vom Eigentümer.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {daten.koordinaten || objekt.beschreibung_lage || daten.umgebung.length > 0 ? (
        <section id="lage" className="flex scroll-mt-16 flex-col gap-4">
          <h2 className="font-heading text-[1.25rem] font-semibold text-ink">
            Die Lage
          </h2>
          {objekt.beschreibung_lage ? (
            <p className="max-w-2xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
              {objekt.beschreibung_lage}
            </p>
          ) : null}
          {daten.umgebung.length > 0 ? (
            <UmgebungsListe punkte={daten.umgebung} />
          ) : null}
          {daten.koordinaten ? (
            <Karte
              lat={daten.koordinaten.lat}
              lng={daten.koordinaten.lng}
              genau={daten.koordinaten.genau && objekt.adresse_freigeben}
              adresse={adresse}
            />
          ) : null}
        </section>
      ) : null}

      <section id="kontakt" className="scroll-mt-16">
        {formularKennung ? (
          <div className="rounded-3xl border border-line/70 bg-paper p-5 sm:p-8">
            <h2 className="font-heading text-[1.45rem] font-semibold text-ink">
              Interesse? Schreiben Sie dem Eigentümer.
            </h2>
            <p className="mt-1.5 max-w-xl text-[0.9rem] leading-relaxed text-ink-muted">
              Ihre Anfrage geht über selbst-verkauf.de direkt an den
              Eigentümer. Sie erhalten das vollständige Exposé mit allen
              Angaben als Antwort.
            </p>
            <div className="mt-5">
              <AnfrageFormular kennung={formularKennung} />
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-line/60 bg-paper px-4 py-3.5 text-[0.88rem] leading-relaxed text-ink-muted">
            Fragen oder Interesse an einer Besichtigung? Antworten Sie einfach
            auf die E-Mail, über die Sie diese Seite erreicht haben.
          </p>
        )}
      </section>

      <footer className="border-t border-line/60 pt-5 text-[0.8rem] leading-relaxed text-ink-muted">
        Diese Seite stellt der Eigentümer über selbst-verkauf.de bereit. Für
        die inhaltlichen Angaben zu Objekt und Ausstattung ist der anbietende
        Eigentümer verantwortlich.
      </footer>
    </main>
  );
}

/**
 * Die vom Eigentümer BESTÄTIGTE Umgebung, gruppiert wie in der
 * Bestätigungs-Liste des Kontos. Entfernungen sind Luftlinie und
 * stehen genau einmal so beschriftet darunter, zusammen mit der
 * OpenStreetMap-Quelle (ODbL verlangt die Nennung auch für die
 * Daten, nicht nur für die Karten-Kacheln).
 */
function UmgebungsListe({ punkte }: { punkte: Umgebungspunkt[] }) {
  const bestaetigt = bestaetigteUmgebung(punkte);
  if (bestaetigt.length === 0) return null;
  /* Je Gruppe die Punkte, gebündelt nach Gattung. Die Reihenfolge aus
     bestaetigteUmgebung bleibt erhalten (Kategorie, dann Entfernung),
     deshalb genügt das Zusammenfassen aufeinanderfolgender Punkte. */
  const gruppen = UMGEBUNGS_GRUPPEN.map((gruppe) => {
    const baender: {
      gattung: string;
      stuecke: {
        id: string;
        anzeige: ReturnType<typeof umgebungsAnzeige>;
        entfernung: string | null;
      }[];
    }[] = [];
    for (const p of bestaetigt) {
      if (umgebungsKategorie(p.kategorie)?.gruppe !== gruppe.id) continue;
      const anzeige = umgebungsAnzeige(p);
      const stueck = {
        id: p.id,
        anzeige,
        entfernung: umgebungsEntfernung(p.entfernung_m),
      };
      const letztes = baender[baender.length - 1];
      if (letztes && letztes.gattung === anzeige.gattung) letztes.stuecke.push(stueck);
      else baender.push({ gattung: anzeige.gattung, stuecke: [stueck] });
    }
    return { gruppe, baender };
  }).filter((g) => g.baender.length > 0);
  return (
    /* ENTWURF B, vom Inhaber freigegeben am 20.08.2026.

       WAS VORHER WAR und warum es weg musste: ein zweispaltiges
       Raster, in dem jede GRUPPE eine Zelle war. Eine Rasterzeile ist
       so hoch wie ihre höchste Zelle, deshalb stand neben der kurzen
       Alltags-Gruppe ein Loch, die Trennlinien links und rechts lagen
       auf verschiedenen Höhen, und die eine Säule endete lange vor der
       anderen. Innerhalb der Zeilen trieb justify-between den Namen
       nach links und die Zahl nach rechts; gemessen lagen dazwischen
       bis zu 188 Pixel Leere, und bei einem vierzeiligen Namen schwebte
       die Zahl oben rechts daneben, ohne erkennbar dazuzugehören.

       WAS JETZT GILT: Die Gattung steht in einer festen linken Spalte
       und damit genau einmal, die Orte stehen rechts daneben, und die
       Entfernung klebt unmittelbar am Namen, den sie meint. Alles
       fluchtet auf zwei Kanten, auch bei mehrzeiligen Namen. Eine
       Spalte über die Breite, also kann es weder Löcher noch zwei
       ungleich lange Säulen geben.

       SCHMAL rückt die Gattung über die Orte, statt die Kante zu
       halten; unter etwa 640 Pixeln bliebe für die Orte sonst zu
       wenig übrig. */
    <div className="flex max-w-3xl flex-col gap-6">
      {gruppen.map(({ gruppe, baender }) => (
        <div key={gruppe.id} className="flex flex-col gap-1.5">
          <h3 className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-muted">
            {gruppe.titel}
          </h3>
          <dl className="flex flex-col">
            {baender.map((band) => (
              <div
                key={band.gattung}
                className="grid gap-x-4 border-t border-line/50 py-1.5 text-[0.9rem] sm:grid-cols-[11rem_minmax(0,1fr)]"
              >
                <dt className="text-ink-muted">{band.gattung}</dt>
                <dd className="min-w-0 leading-relaxed text-ink">
                  {band.stuecke.map((stueck, i) => (
                    <span key={stueck.id}>
                      {i > 0 ? (
                        <span className="text-line" aria-hidden="true">
                          {"  ·  "}
                        </span>
                      ) : null}
                      {stueck.anzeige.ohneNamen ? (
                        <span className="text-ink-muted">
                          ohne Namen in der Karte
                        </span>
                      ) : (
                        stueck.anzeige.nameOhneGattung
                      )}
                      {stueck.entfernung ? (
                        <span className="whitespace-nowrap text-ink-muted">
                          {" "}
                          {stueck.entfernung}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <p className="text-[0.75rem] leading-relaxed text-ink-muted/80">
        Entfernungen Luftlinie, vom Eigentümer bestätigt. Kartendaten ©
        OpenStreetMap-Mitwirkende.
      </p>
    </div>
  );
}
