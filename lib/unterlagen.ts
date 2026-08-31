/**
 * Eine Quelle für den Unterlagen-Bereich: Dokumenttypen, Grenzen,
 * Qualitäts-Regeln für Fotos und die Exposé-Vorbelegung.
 */

export type UnterlagenTyp =
  | "grundbuchauszug"
  | "flurkarte"
  | "energieausweis"
  | "grundrisse"
  | "fotos"
  | "wohnflaechenberechnung"
  | "baulastenauskunft"
  | "teilungserklaerung"
  /* Eigene Arten seit Migration 0116 (29.08.2026): Beide werden als
     eigene Leistung verkauft und lagen bis dahin unter "sonstiges".
     Der Kunde sah dort einen Sammel-Topf und wusste nicht, was drin
     liegt. */
  | "verkehrswertgutachten"
  | "renditeuebersicht"
  | "sonstiges";

/** Zeile der Tabelle unterlagen */
export type Unterlage = {
  id: string;
  user_id: string;
  objekt_id: string;
  typ: UnterlagenTyp;
  datei_name: string;
  datei_pfad: string;
  mime: string;
  groesse: number | null;
  breite: number | null;
  hoehe: number | null;
  sortierung: number;
  im_expose: boolean;
  verbessert_pfad: string | null;
  verbessert_am: string | null;
  aktive_version: "original" | "verbessert";
  wz_pfad: string | null;
  wz_verbessert_pfad: string | null;
  /* Die Foto-KI (Migration 0087). Zustaende und Uebergaenge in
     lib/foto-ki-ablauf.ts; ki_bild_id bleibt auf dem Server. */
  ki_bild_id: string | null;
  ki_status: "laeuft" | "vorschau" | "wird_abgeholt" | "fertig" | "fehlgeschlagen" | null;
  ki_status_grund: string | null;
  /**
   * Betriebsmodus der Foto-KI im Moment der Uebernahme (Migration
   * 0112, Vorbild bewertungen.quelle). null: Altbestand von vor der
   * Spalte oder noch kein uebernommenes Ergebnis; die Anzeige faellt
   * dann auf den heutigen Schalter zurueck.
   */
  ki_quelle?: "mock" | "entwicklung" | "scharf" | null;
  ki_gestartet_am: string | null;
  ki_versuche: number;
  ki_reserviert: boolean;
  ki_einstellungen: Record<string, unknown> | null;
  ki_vorschau_pfad: string | null;
  /**
   * WOHER DIE DATEI STAMMT (Migration 0115).
   *
   * "auftrag": vom Team als Auftrags-Ergebnis geliefert. Die Zeile zeigt
   * dann auf DIESELBE Datei wie das Ergebnis am Auftrag, und der Kunde
   * kann sie nicht loeschen; sonst verloere er sein bezahltes Ergebnis.
   *
   * null: selbst hochgeladen ODER Altbestand von vor dieser Spalte.
   * Beides wird nicht auseinandergehalten und darf es nicht: Eine
   * erfundene Herkunft waere schlimmer als eine fehlende.
   */
  herkunft?: "auftrag" | null;
  /** Der liefernde Auftrag, solange es ihn gibt (on delete set null) */
  herkunft_auftrag_id?: string | null;
  erstellt_am: string;
};

/** Kam diese Unterlage vom Team und nicht vom Kunden? */
export function vomTeamGeliefert(u: Pick<Unterlage, "herkunft">): boolean {
  return u.herkunft === "auftrag";
}

/**
 * =====================================================================
 * DARF DIESE ART ÜBERHAUPT ÖFFENTLICH GEZEIGT WERDEN?
 * =====================================================================
 * Entscheidung des Inhabers vom 23.08.2026 (Punkt 3), hier an EINER
 * Stelle, weil sie an einer Stelle stehen muss: Was der Verkäufer
 * versehentlich freigibt, bekommt er nicht zurück.
 *
 * ZWEI STUFEN, und die Reihenfolge ist entscheidend:
 *
 *   1. DIE ART entscheidet, ob es überhaupt zur Wahl steht. Diese
 *      Entscheidung trifft nicht der Kunde, sondern diese Datei.
 *   2. Innerhalb der erlaubten Arten entscheidet der VERKÄUFER je
 *      Datei (Spalte im_expose).
 *
 * Eine Art auf `false` bedeutet: Kein Haken der Welt zeigt diese Datei
 * öffentlich. Die Sperre steht dreifach, weil eine einzelne Sperre
 * genau einmal übersehen werden muss:
 *   - die Oberfläche zeigt den Schalter gar nicht erst,
 *   - `oeffentlichZeigbar()` unten filtert jede Ausgabe,
 *   - ein Trigger in Migration 0106 setzt im_expose beim Schreiben
 *     zurück, also auch auf Wegen, die es noch nicht gibt.
 *
 * ---------------------------------------------------------------------
 * DIE BEGRÜNDUNG JE ART
 * ---------------------------------------------------------------------
 * NEIN, grundbuchauszug: nennt Eigentümer, Grundschulden und
 *   Belastungen. Wer sein Grundbuch öffentlich stellt, zeigt fremden
 *   Menschen seine Schulden. Vorgabe des Inhabers: niemals.
 *
 * NEIN, baulastenauskunft: nennt Verpflichtungen gegenüber Dritten und
 *   Nachbarn. Vorgabe des Inhabers: niemals.
 *
 * NEIN, teilungserklaerung: nennt Miteigentumsanteile, Sondernutzungs-
 *   rechte und oft die Namen der übrigen Eigentümer, also Daten von
 *   Menschen, die gar nicht verkaufen. Vorgabe des Inhabers: niemals.
 *
 * NEIN, flurkarte: keine Vorgabe des Inhabers, deshalb hier begründet.
 *   Sie enthält keine Personendaten, verrät aber Flurstück und Lage
 *   metergenau. Das Objekt hat eine eigene Entscheidung darüber, ob
 *   die Adresse überhaupt genannt wird (adresse_freigeben). Eine
 *   Flurkarte hebelte diese Entscheidung aus, ohne dass jemand den
 *   Zusammenhang sieht. Wer sie doch zeigen will, hebt das hier auf
 *   und weiss dann, was er tut.
 *
 * NEIN, verkehrswertgutachten: nennt einen Wert, den der Verkäufer im
 *   Gespräch selbst einordnen will. Ein Interessent, der die Zahl vorab
 *   kennt, verhandelt gegen sie.
 *
 * NEIN, renditeuebersicht: legt Mieteinnahmen, Betriebskosten und
 *   Rücklagen offen, also die Zahlen, aus denen ein Käufer seinen
 *   eigenen Preis rechnet. Sie gehören an den Verhandlungstisch, nicht
 *   auf eine öffentliche Seite.
 *
 * NEIN, sonstiges: die Art, die alles sein kann. Genau deshalb darf
 *   sie nichts sein: Eine pauschale Freigabe für "unbekannt" ist keine
 *   Entscheidung, sondern deren Abwesenheit. Wer etwas zeigen will,
 *   gibt der Datei ihre richtige Art.
 *
 * JA, fotos: der Zweck der Sache.
 * JA, grundrisse: Vorgabe des Inhabers.
 * JA, energieausweis: Vorgabe des Inhabers, ausdrücklich als
 *   Entscheidung des Verkäufers. Standard bleibt AUS: Die
 *   GEG-Pflichtangaben liefert das Objekt selbst, das Dokument ist ein
 *   Zusatz.
 * JA, wohnflaechenberechnung: Raumaufstellung und Maße, keine
 *   Personendaten, für Käufer die häufigste Rückfrage. Standard AUS.
 *
 * WER EINE NEUE ART EINFÜHRT, entscheidet hier ausdrücklich. Das Feld
 * hat mit Absicht keinen Standardwert.
 */
export const UNTERLAGEN_TYPEN: {
  typ: UnterlagenTyp;
  label: string;
  /** Checklisten-Punkt, der beim ersten Upload automatisch abgehakt wird */
  checklistenPunkt?: string;
  /**
   * Darf diese Art überhaupt öffentlich erscheinen (Objektseite,
   * Exposé, Portale)? Siehe der Block darüber; ohne `true` hier hilft
   * dem Kunden kein Haken.
   */
  oeffentlichErlaubt: boolean;
  /**
   * Vorbelegung des Verkäufer-Hakens, nur bei erlaubten Arten von
   * Bedeutung: Fotos und Grundrisse an, alles andere aus.
   */
  exposeStandard: boolean;
  /**
   * WAS DER HAKEN BEI DIESER ART BEWIRKT, und deshalb, wie er heißt.
   *
   * =================================================================
   * DER BEFUND (Inhaber, 29.08.2026)
   * =================================================================
   * "Der Schalter bewirkt bei Energieausweis und Wohnflächenberechnung
   * nichts. Entweder er tut etwas oder er verschwindet."
   *
   * Gemessen stimmte das fast: Keine der drei öffentlichen Ausgaben
   * gibt eine Dokument-DATEI heraus. Das Exposé-PDF nimmt nur Fotos,
   * der Portal-Export nur Fotos und Grundriss-Bilder, die Objektseite
   * rendert nur Bilder. Ein Energieausweis wird nirgends zum
   * Herunterladen angeboten, und das ist richtig so.
   *
   * ER TUT ABER ETWAS, seit dem Fix vom selben Tag: Er entscheidet, ob
   * die Art auf der Objektseite überhaupt GENANNT wird ("Unterlagen
   * liegen vor: ..."). Das ist eine Aussage über das Objekt, und sie
   * gehört dem Verkäufer.
   *
   * FALSCH WAR DAMIT NICHT DER SCHALTER, SONDERN SEINE BESCHRIFTUNG.
   * Er hieß "öffentlich zeigen" und versprach damit, was er bei einem
   * Dokument nie tun wird: die Datei herausgeben. Wer ihn umlegt und
   * danach keine PDF auf seiner Objektseite findet, hält die Anwendung
   * für kaputt.
   *
   *   "datei"    Die Datei selbst erscheint (Galerie, Exposé, Portal).
   *              Fotos und Grundriss-Bilder.
   *   "nennung"  Nur der Name der Art erscheint, nie die Datei.
   *              Einsicht gibt es auf Anfrage beim Eigentümer.
   *
   * Bei Arten, die gar nicht öffentlich dürfen, steht "nennung" und
   * bedeutet nichts; dort gibt es keinen Schalter (artOeffentlichErlaubt).
   */
  oeffentlichAls: "datei" | "nennung";
}[] = [
  {
    typ: "fotos",
    label: "Fotos",
    oeffentlichErlaubt: true,
    exposeStandard: true,
    oeffentlichAls: "datei",
  },
  {
    typ: "grundrisse",
    label: "Grundrisse",
    checklistenPunkt: "grundrisse-gesucht",
    oeffentlichErlaubt: true,
    exposeStandard: true,
    /* Nur BILDER erscheinen wirklich; ein Grundriss-PDF wird genannt,
       nicht gezeigt (ObjektseiteInhalt.tsx). Die Art traegt trotzdem
       "datei", weil das der haeufige Fall ist und weil der Schalter
       beim PNG genau das tut, was er verspricht. */
    oeffentlichAls: "datei",
  },
  {
    typ: "grundbuchauszug",
    label: "Grundbuchauszug",
    checklistenPunkt: "grundbuch-gesucht",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  {
    typ: "flurkarte",
    label: "Flurkarte",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  {
    typ: "energieausweis",
    label: "Energieausweis",
    oeffentlichErlaubt: true,
    exposeStandard: false,
    /* NUR DIE NENNUNG. Die Datei geht nirgends hinaus, siehe der Block
       am Feld. Der Schalter entscheidet, ob "Energieausweis" auf der
       Objektseite steht. */
    oeffentlichAls: "nennung",
  },
  {
    typ: "wohnflaechenberechnung",
    label: "Wohnflächenberechnung",
    oeffentlichErlaubt: true,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  {
    typ: "baulastenauskunft",
    label: "Baulastenauskunft",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  /* Eigener Typ seit Migration 0044 (12.08.2026): Die Teilungserklärung
     wird als eigene Leistung verkauft und gehört nicht unter Sonstiges.
     Sichtbar nur bei Wohnungen (sichtbareTypen im UnterlagenBereich). */
  {
    typ: "teilungserklaerung",
    label: "Teilungserklärung",
    checklistenPunkt: "teilungserklaerung-gesucht",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  /* Eigene Arten seit Migration 0116 (29.08.2026), beide bis dahin
     unter "sonstiges". Sie werden als eigene Leistung verkauft.

     KEINE VON BEIDEN DARF OEFFENTLICH, und das ist die Entscheidung:
     Ein Gutachten nennt einen Wert, den der Verkaeufer im Gespraech
     selbst einordnen will; eine Renditeuebersicht legt seine
     Mieteinnahmen offen. Beides geht Interessenten erst dann etwas an,
     wenn er es ihnen gibt. */
  {
    typ: "verkehrswertgutachten",
    label: "Verkehrswertgutachten",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  {
    typ: "renditeuebersicht",
    label: "Renditeübersicht",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
  {
    typ: "sonstiges",
    label: "Sonstiges",
    oeffentlichErlaubt: false,
    exposeStandard: false,
    oeffentlichAls: "nennung",
  },
];

/**
 * Darf eine Datei dieser Art öffentlich erscheinen?
 *
 * EINE UNBEKANNTE ART IST NIE ÖFFENTLICH. Das ist keine Vorsicht,
 * sondern die einzig mögliche Antwort: Über eine Art, die diese Datei
 * nicht kennt, lässt sich nichts zusichern.
 */
/**
 * WIE DER SCHALTER BEI DIESER ART HEISSEN MUSS.
 *
 * Der Befund des Inhabers vom 29.08.2026 war nicht, dass der Schalter
 * nichts tut, sondern dass er mehr verspricht, als er tut: Er hiess
 * ueberall "Oeffentlich zeigen" und gab bei einem Dokument nie die
 * Datei heraus. Siehe `oeffentlichAls` an UNTERLAGEN_TYPEN.
 *
 * Die Beschriftung steht HIER und nicht in der Oberflaeche, weil sie
 * an der ART haengt und weil sie an zwei Stellen gebraucht wird
 * (schmale und breite Ansicht). Zwei Beschriftungen, die auseinander
 * laufen koennen, waeren genau die Bauart, gegen die dieses Haus
 * gebaut ist.
 */
export function schalterText(typ: UnterlagenTyp): { kurz: string; lang: string } {
  const art = UNTERLAGEN_TYPEN.find((t) => t.typ === typ);
  if (art?.oeffentlichAls === "datei") {
    return {
      kurz: "Öffentlich zeigen",
      lang: "Diese Datei erscheint auf Ihrer Objektseite, im Exposé und in den Portalen.",
    };
  }
  return {
    kurz: "Auf der Objektseite erwähnen",
    lang:
      "Auf Ihrer Objektseite steht dann, dass diese Unterlage vorliegt. " +
      "Die Datei selbst geben wir nie heraus; Einsicht bekommen Interessenten auf Anfrage von Ihnen.",
  };
}

export function artOeffentlichErlaubt(typ: string): boolean {
  return UNTERLAGEN_TYPEN.find((t) => t.typ === typ)?.oeffentlichErlaubt ?? false;
}

/** Die Objektarten, für die der Unterlagen-Bereich unterscheidet */
export const OBJEKTARTEN_FUER_UNTERLAGEN = [
  "haus",
  "wohnung",
  "mehrfamilienhaus",
] as const;

/**
 * WELCHE ARTEN DER UNTERLAGEN-BEREICH ANBIETET, je Objektart.
 *
 * =====================================================================
 * SIE STAND BIS ZUM 23.08.2026 IN DER KOMPONENTE
 * =====================================================================
 * Und damit konnte keine Prüfung sie lesen. Auf die Frage des Inhabers
 * "welche Arten hängen an der Objektart, und stimmt das jeweils"
 * musste man die Regel im Kopf nachvollziehen oder nachbauen — und
 * eine nachgebaute Regel misst nach der ersten Änderung die
 * Vergangenheit und meldet dabei grün.
 *
 * Jetzt liest `scripts/unterlagen-arten-pruefen.mts` DIESE Funktion,
 * also genau die, die auch die Ansicht zeichnet.
 *
 * =====================================================================
 * DIE RECHNUNG, NACH DER HIER ENTSCHIEDEN WIRD
 * =====================================================================
 * Entscheidung des Inhabers vom 23.08.2026, und sie gilt für jede
 * künftige Einschränkung an dieser Stelle:
 *
 *   "Ein angebotenes Feld, das leer bleibt, kostet nichts. Ein
 *   fehlendes kostet ein Dokument. Wer keine hat, lädt keine hoch."
 *
 * Eine Art wird also NUR dann bei einer Objektart weggelassen, wenn
 * sie dort gar nicht vorkommen KANN. "Kommt selten vor" reicht nicht,
 * "wir wissen nicht, ob dieses Objekt sie hat" erst recht nicht: Beides
 * sind Gründe, sie anzubieten, und nicht, sie wegzulassen.
 *
 * Der Anlass war die Teilungserklärung beim Mehrfamilienhaus, siehe
 * unten. Wer hier etwas einschränkt, trägt den Grund in
 * NUR_BEI_MIT_GRUND ein; die Bau-Prüfung besteht darauf.
 *
 * =====================================================================
 * DIE REGELN UND IHRE GRÜNDE
 * =====================================================================
 * FOTOS: nie, und das ist keine Objektart-Frage. Sie haben seit dem
 * 11.08.2026 einen eigenen Bereich (/konto/fotos). Unterlagen sind
 * Papiere für Notar und Bank.
 *
 * TEILUNGSERKLÄRUNG: bei Wohnung UND Mehrfamilienhaus, seit dem
 * 23.08.2026. Sie stand bis dahin nur bei der Wohnung, und das war ein
 * Mangel: Ein in Eigentumswohnungen AUFGETEILTES Mehrfamilienhaus hat
 * eine Teilungserklärung, und wer es als Ganzes verkauft, braucht sie
 * beim Notar. Er konnte sie nur unter "Sonstiges" ablegen und die
 * Leistung nicht einmal buchen.
 *
 * Ob ein bestimmtes Mehrfamilienhaus wirklich aufgeteilt ist, wissen
 * wir nicht — und fragen es auch nicht ab. Genau dafür ist die
 * Rechnung oben da: Das leere Feld kostet nichts.
 *
 * NICHT beim Einfamilienhaus. Das ist keine Vorsicht, sondern der
 * einzige Fall, in dem es die Urkunde nicht geben KANN: Wohnungseigentum
 * entsteht durch Aufteilung, und ein ungeteiltes Haus ist nicht
 * aufgeteilt. Wäre es aufgeteilt, wäre es bei uns ein
 * Mehrfamilienhaus.
 *
 * BAULASTENAUSKUNFT: bei allen dreien, seit dem 23.08.2026. Sie war
 * bei der Wohnung ausgenommen mit der Begründung, das sei Sache der
 * Verwaltung. Das hält der Rechnung oben nicht stand: Eine Baulast
 * liegt auf dem GRUNDSTÜCK, und beim Wohnungseigentum gehört das
 * Grundstück allen Eigentümern gemeinsam. Ein Wegerecht oder eine
 * Abstandsflächenbaulast betrifft die Wohnung also sehr wohl, und wer
 * die Auskunft hat, soll sie ablegen können. Wer keine hat, lädt keine
 * hoch.
 */
export function sichtbareUnterlagenTypen(
  objektart: string | null
): UnterlagenTyp[] {
  return UNTERLAGEN_TYPEN.filter((t) => {
    if (t.typ === "fotos") return false;
    if (t.typ === "teilungserklaerung")
      return objektart === null || objektart !== "haus";
    return true;
  }).map((t) => t.typ);
}

/**
 * JEDE EINSCHRÄNKUNG AUF BESTIMMTE OBJEKTARTEN, mit ihrem Grund.
 *
 * =====================================================================
 * WARUM DAS EINE EIGENE LISTE IST
 * =====================================================================
 * Bis zum 23.08.2026 stand eine Einschränkung einfach als Zeile in der
 * Funktion darüber, und die Bau-Prüfung nahm sie stillschweigend hin.
 * Damit hätte sie den Fall, den der Inhaber gerade beanstandet hat,
 * dauerhaft FESTGESCHRIEBEN: Sie prüfte, ob die verkaufte Leistung zur
 * Einschränkung passt, aber nie, ob die Einschränkung selbst stimmt.
 *
 * Die Prüfung sah also nur eine Richtung. Sie hätte gemeldet, wenn wir
 * eine Leistung verkauft hätten, deren Upload fehlt — aber nicht, dass
 * einem Verkäufer ein Dokument fehlt, das er beim Notar braucht.
 *
 * DER GRUND MUSS DIE RICHTIGE FRAGE BEANTWORTEN, nämlich: Kann diese
 * Art bei der ausgeschlossenen Objektart überhaupt VORKOMMEN? Wenn ja,
 * gehört sie angeboten, egal wie selten. "Braucht man selten" und "ist
 * Sache eines anderen" sind keine tragenden Gründe.
 */
export const NUR_BEI_MIT_GRUND: {
  typ: UnterlagenTyp;
  /** Objektarten, bei denen sie NICHT angeboten wird */
  ohne: string[];
  grund: string;
}[] = [
  {
    typ: "teilungserklaerung",
    ohne: ["haus"],
    grund:
      "Wohnungseigentum entsteht durch Aufteilung. Ein Einfamilienhaus " +
      "ist nicht aufgeteilt, es KANN also keine Teilungserklärung geben; " +
      "wäre es aufgeteilt, wäre es bei uns ein Mehrfamilienhaus.",
  },
];

/**
 * DER EINE FILTER FÜR JEDE ÖFFENTLICHE AUSGABE: Objektseite, Exposé,
 * Portal-Export, geteilter Link.
 *
 * Beide Bedingungen, immer in dieser Reihenfolge: erst die Art (die
 * entscheidet nicht der Kunde), dann der Haken des Verkäufers.
 *
 * WER EINE NEUE ÖFFENTLICHE AUSGABE BAUT, ruft diese Funktion. Sie
 * ersetzt jedes handgeschriebene `.filter((u) => u.im_expose)`; genau
 * so ein handgeschriebener Filter fehlte bis zum 23.08.2026 am
 * Grundriss-Weg der Objektseite, und damit stand ein Grundriss
 * öffentlich, dessen Haken nie gesetzt war.
 */
export function oeffentlichZeigbar(u: Pick<Unterlage, "typ" | "im_expose">): boolean {
  return artOeffentlichErlaubt(u.typ) && u.im_expose;
}

export function typLabel(typ: string): string {
  return UNTERLAGEN_TYPEN.find((t) => t.typ === typ)?.label ?? typ;
}

/** Erlaubte Dateiformate (HEIC wird beim Upload zu JPG gewandelt) */
export const ERLAUBTE_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];

/** Größen-Obergrenze je Datei */
export const MAX_DATEI_MB = 15;

/**
 * Foto-Qualität, an den üblichen Portal-Anforderungen orientiert:
 * Die großen Portale empfehlen mindestens etwa 1200 Pixel Breite,
 * dargestellt wird bevorzugt Querformat um 4:3. Wir weisen freundlich
 * hin und beschneiden NIEMALS automatisch.
 */
export const FOTO_MIN_BREITE = 1200;
export const FOTO_MIN_HOEHE = 800;
/** Seitenverhältnis-Grenzen (Breite geteilt durch Höhe) für den Hinweis */
export const FOTO_RATIO_MIN = 0.7;
export const FOTO_RATIO_MAX = 2.2;

export type FotoHinweis = "zu_klein" | "seitenverhaeltnis" | null;

/** Qualitäts-Hinweis für ein Bild, null bedeutet alles gut */
export function fotoHinweis(
  breite: number | null,
  hoehe: number | null
): FotoHinweis {
  if (!breite || !hoehe) return null;
  if (breite < FOTO_MIN_BREITE || hoehe < FOTO_MIN_HOEHE) return "zu_klein";
  const ratio = breite / hoehe;
  if (ratio < FOTO_RATIO_MIN || ratio > FOTO_RATIO_MAX) return "seitenverhaeltnis";
  return null;
}

/**
 * Wasserzeichen der Export-Versionen (Exposé und Portal-Inserate):
 * bewusst DEZENT, Wortmarke klein in der unteren rechten Ecke.
 * Zentrale Konstanten zum Nachjustieren. Das Original bleibt immer
 * unverändert, das Wasserzeichen liegt nur auf den Export-Kopien.
 *
 * FUER EXPOSÉ, OBJEKTSEITE UND PORTALE. Der Portal-Weg haengt an
 * einem eigenen Schalter, siehe PORTAL_WASSERZEICHEN weiter unten;
 * dort steht auch, warum es einen braucht.
 */
export const WASSERZEICHEN = {
  /** Breite der Wortmarke relativ zur Bildbreite */
  breitenAnteil: 0.18,
  /**
   * Deckkraft der Wortmarke.
   *
   * VON 0,55 AUF 0,8 am 14.08.2026: Bei 0,55 war sie auf hellem
   * Himmel kaum und auf weisser Wand gar nicht zu sehen. Sie soll
   * erkennbar sein, ohne das Foto zu beschaedigen; bei 0,55 tat sie
   * weder das eine noch das andere.
   */
  deckkraft: 0.8,

  /**
   * Ab welcher mittleren Helligkeit des Untergrunds die Marke DUNKEL
   * gesetzt wird statt hell. 0 ist schwarz, 1 ist weiss.
   *
   * 0,55 UND NICHT 0,5: Weisse Schrift traegt auf mittlerem Grund
   * etwas besser als dunkle, deshalb liegt die Kippstelle bewusst
   * ueber der Mitte.
   */
  helligkeitsGrenze: 0.55,

  /** Deckkraft des weichen Schattens in der Gegenfarbe */
  schattenDeckkraft: 0.55,

  /** Wie weich der Schatten ausläuft, in Pixeln */
  schattenWeichheit: 3,
  /** Abstand zum Rand relativ zur Bildbreite */
  randAnteil: 0.025,
  /**
   * DIE SEITENVERHAELTNISSE, IN DENEN DAS BILD BESCHNITTEN GEZEIGT
   * WIRD, vom schmalsten zum breitesten.
   *
   * WOFUER: Das Wasserzeichen ist in die Datei eingebrannt, die
   * Anzeige schneidet mit object-cover zu, und ein Zuschnitt schneidet
   * die Ecke ab. Auf der oeffentlichen Objektseite endete die
   * Wortmarke deshalb mitten im Wort (gemeldet am 13.08.2026). Ein
   * angeschnittenes Wasserzeichen ist schlimmer als keines: Es sieht
   * nach einem Fehler aus statt nach einer Kennzeichnung.
   *
   * Ein Zuschnitt mit object-cover ist MITTIG. Was in der Mitte liegt,
   * ueberlebt jeden Zuschnitt; je weiter aussen, desto eher faellt es
   * weg. Aus diesen beiden Zahlen rechnet lib/bilder.ts den Bereich
   * aus, der bei JEDEM unserer Zuschnitte sichtbar bleibt, und setzt
   * die Wortmarke in dessen untere rechte Ecke.
   *
   * WER EIN NEUES SEITENVERHAELTNIS EINFUEHRT, traegt es hier nach.
   * Heute in Gebrauch:
   *
   *   1/1  die Leiste in der geoeffneten Bildansicht (13.08.2026)
   *   4/3  die Foto-Ansicht im Konto
   *   3/2  das Titelbild im Kopf der Objektseite
   *
   * Die 21/9 im Kopf der Objektmaske zaehlt NICHT dazu: Dort sieht
   * der Verkaeufer sein eigenes Foto ohne Wasserzeichen.
   *
   * DAS QUADRAT KAM MIT DER NEUEN GALERIE DAZU und ist damit das
   * schmalste. Es kostet Platz: Je weiter die Spanne, desto kleiner
   * der Bereich, der jeden Zuschnitt ueberlebt, und desto weiter
   * rueckt die Wortmarke nach innen. Wer die Spanne noch weiter
   * aufmacht, sollte vorher nachsehen, ob die Marke dann nicht
   * mitten im Bild steht.
   *
   * DIE QUADRATE DER LEISTE SIND ECHTE QUADRATE, feste 60 mal 60 px,
   * kein gedehntes Rasterfeld. Das ist Absicht: Ein Feld, dessen
   * Hoehe sich aus dem Umfeld ergibt, ist nie genau 1/1, und dann
   * stimmt die Zahl hier nicht mehr mit der Wirklichkeit ueberein.
   * Ein Vorgaenger dieser Leiste, das Bildraster im Seitenkopf, hatte
   * genau das: nachgemessen 0,991 statt 1,0.
   */
  anzeigeSchmal: 1,
  anzeigeBreit: 3 / 2,
} as const;

/**
 * TRAEGT DAS BILD, DAS AN DIE PORTALE GEHT, UNSERE MARKE?
 *
 * JA, entschieden am 14.08.2026 vom Auftraggeber.
 *
 * DER STAND DER RECHERCHE, absichtlich stehen gelassen: ImmoScout24
 * raet in seinen Anwender-Tipps ausdruecklich von Wasserzeichen,
 * Rahmen und eingebauten Logos in Objektbildern ab, weil bei der
 * automatischen Skalierung so etwas angeschnitten wird. In den
 * Bildrichtlinien fuer Gewerbeimmobilien heisst es zusaetzlich, Bilder
 * mit Logos oder Textinhalten seien fuer die Ergebnisliste nicht
 * empfohlen. Ob und wie streng die drei Portale das im Wohnbereich
 * handhaben, ist NICHT geklaert; die Nachfrage laeuft ueber die
 * Vertragsgespraeche.
 *
 * WAS AUF DEM SPIEL STEHT: Ein Portal, das unsere Bilder
 * herunterstuft, trifft nicht ein Inserat, sondern alle gleichzeitig.
 * Und der Schaden faellt niemandem auf, weil man Sichtbarkeit nicht
 * vermisst, die man nie hatte.
 *
 * WENN EIN PORTAL WIDERSPRICHT: Hier auf false stellen, mehr ist
 * nicht noetig. Genau dafuer steht der Absatz oben noch da.
 *
 * Der Portal-Bildexport selbst ist heute noch nicht verdrahtet
 * (ExportAnhang in lib/portale/openimmo.ts wird nirgends befuellt);
 * wer ihn baut, muss exportPfad mit zweck "portal" rufen, sonst gilt
 * diese Entscheidung dort nicht.
 */
export const PORTAL_WASSERZEICHEN = true;

/** Wofuer eine Export-Fassung gebraucht wird */
export type ExportZweck = "expose" | "objektseite" | "portal";

/** Der aktuell gültige Original-Pfad (gewählte Version) einer Datei */
export function aktiverPfad(u: Unterlage): string {
  return u.aktive_version === "verbessert" && u.verbessert_pfad
    ? u.verbessert_pfad
    : u.datei_pfad;
}

/**
 * Der Export-Pfad: mit Wasserzeichen, wenn der Objekt-Schalter an ist
 * UND der Zweck es zulaesst UND eine Kopie existiert, sonst die
 * gewaehlte saubere Version.
 *
 * DER ZWECK ENTSCHEIDET MIT, seit dem 14.08.2026. Exposé und
 * Objektseite tragen die Marke immer. Der Weg zu den Portalen haengt
 * zusaetzlich an PORTAL_WASSERZEICHEN, damit er sich mit einer Zeile
 * abschalten laesst, falls ein Portal widerspricht.
 *
 * DER ZWECK IST NICHT OPTIONAL, mit Absicht: Wer eine neue Ausgabe
 * baut, muss sich entscheiden, wohin sie geht. Ein Standardwert waere
 * die Einladung, die Frage zu ueberspringen, und uebersprungen hiesse
 * hier: Marke an, auch zum Portal.
 */
export function exportPfad(
  u: Unterlage,
  wasserzeichenAn: boolean,
  zweck: ExportZweck
): string {
  const markeErlaubt = zweck === "portal" ? PORTAL_WASSERZEICHEN : true;
  if (wasserzeichenAn && markeErlaubt) {
    if (u.aktive_version === "verbessert" && u.wz_verbessert_pfad)
      return u.wz_verbessert_pfad;
    if (u.aktive_version === "original" && u.wz_pfad) return u.wz_pfad;
  }
  return aktiverPfad(u);
}

/** Fotos in Galerie-Reihenfolge */
export function sortierteFotos(unterlagen: Unterlage[]): Unterlage[] {
  return unterlagen
    .filter((u) => u.typ === "fotos")
    .sort((a, b) => a.sortierung - b.sortierung || a.erstellt_am.localeCompare(b.erstellt_am));
}

/**
 * Das Titelbild: schlicht das erste Foto in der Reihenfolge.
 *
 * EIN BEGRIFF WENIGER, seit dem 14.08.2026. Vorher gab es zusaetzlich
 * eine Markierung (Spalte titelbild, in der Oberflaeche ein Stern),
 * und beide konnten sich widersprechen: Foto fuenf trug den Stern und
 * stand trotzdem an fuenfter Stelle. Wer ein anderes Titelbild will,
 * zieht es jetzt nach vorne. Genau so halten es die Portale ohnehin,
 * ImmoScout24 macht das erste Bild der Anhang-Reihenfolge automatisch
 * zum Titelbild (docs/immoscout24-api.md).
 *
 * Die Funktion bleibt trotzdem stehen, statt ueberall [0] zu
 * schreiben: Sie traegt den BEGRIFF, und wenn er sich eines Tages
 * wieder aendert, aendert er sich hier.
 */
export function titelbild(unterlagen: Unterlage[]): Unterlage | null {
  return sortierteFotos(unterlagen)[0] ?? null;
}
