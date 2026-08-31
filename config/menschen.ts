import type { Bildmittelpunkt } from "@/lib/bildausschnitt";
import { siteConfig, type SiteBroker } from "@/site.config";

/**
 * DIE MENSCHEN HINTER selbst-verkauf.de, an EINER Stelle.
 *
 * Startseite (Sektion "Die Menschen dahinter") und Team-Seite lesen
 * beide aus dieser Datei: dieselben Namen, dieselben Bezeichnungen,
 * dieselben Zahlen, dieselbe Reihenfolge. Wer hier etwas ändert,
 * ändert es überall; auseinanderlaufen können die beiden Seiten damit
 * nicht mehr (Auftrag des Inhabers, Runde 31).
 *
 * ZWEI GRUPPEN, UND DER UNTERSCHIED IST INHALT, NICHT KOSMETIK:
 * Das Team baut die Plattform. Die begleitenden Makler sind KEINE
 * Angestellten von selbst-verkauf.de, sondern die Makler der
 * WerteImmobilien GmbH, die einen Verkauf auf Wunsch begleiten. Jede
 * Fläche, die Menschen zeigt, muss diese Trennung erkennbar halten.
 *
 * Die Stammdaten der beiden Makler (Name, Foto, E-Mail für das Exposé)
 * bleiben in site.config.ts (brokerPartner): Dort hängen Exposé,
 * JSON-LD und die Kommunikationsgrenze dran. Diese Datei LIEST sie von
 * dort und ergänzt nur die Darstellungstexte der Menschen-Flächen.
 *
 * DIE DREISSIG JAHRE stehen bei beiden Maklern, aber bewusst nicht
 * wortgleich ("seit rund 30 Jahren" / "drei Jahrzehnte"): Zweimal
 * derselbe Satz liest sich wie ein Textbaustein und entwertet die
 * Zahl (Inhaber, Runde 31). Wer die Texte anfasst, erhält diesen
 * Unterschied.
 */

export type MenschenGruppe = "team" | "makler";

export type Mensch = {
  /** Voller Name, identisch mit site.config.ts bei den Maklern */
  name: string;
  /** Für den Platzhalter-Kreis, falls ein Foto fehlt */
  initialen: string;
  /**
   * Kurze Rolle unter dem Namen. Bei Randolph Niermann trägt sie
   * BEIDES, Führung und Erreichbarkeit: Wer anruft oder schreibt, hat
   * ihn am anderen Ende (ausdrückliche Vorgabe des Inhabers).
   */
  bezeichnung: string;
  /**
   * Ein bis zwei Sätze zur Person, auf Startseite und Team-Seite
   * identisch. **…** markiert die eine erlaubte Betonung im Satz
   * (mitBetonung in components/ui/Betont.tsx), heute nur für die
   * Erfahrungs-Angabe der Makler.
   */
  beschreibung: string;
  /** Nur Team-Seite: ein weiterer Satz aus dem Steckbrief */
  mehr?: string;
  /** Webpfad unter /public */
  bild: string;
  /**
   * WO DAS GESICHT IM BILD LIEGT, drei am Bild abgelesene Zahlen.
   * Sie ersetzen seit Runde 34 die frühere object-position-Zeichenkette
   * `fokus`, denn die konnte nur verschieben, nicht heranholen.
   *
   * `x`      waagerechte Mitte des Kopfes, in Prozent der BILDBREITE
   * `augen`  Höhe der Augenlinie, in Prozent der BILDHÖHE, von oben
   * `kopf`   Kopfhöhe von Scheitel bis Kinn, in Prozent der BILDHÖHE
   *
   * Aus diesen drei Zahlen rechnet lib/bildausschnitt.ts BEIDE
   * Ausschnitte: den runden (Augen auf einer Höhe, Kopf gleich groß)
   * und den Abzug (nur verschoben, nie herangeholt). Wer eine Person
   * nachjustieren will, ändert hier ihre Zahlen; im Baustein steht
   * kein Sonderfall und es gibt keine zweite Liste.
   *
   * NACHMESSEN: `npm run gesichter:pruefen` zeigt für jede Person, wo
   * Augen und Kopf im Kreis und im Abzug landen.
   */
  mittelpunkt: Bildmittelpunkt;
  gruppe: MenschenGruppe;
};

/**
 * Die Makler-Stammdaten aus site.config.ts, über den Namen gefunden.
 * Wirft beim Bau, wenn der Name dort nicht mehr steht: Ein leises
 * Auseinanderlaufen der beiden Quellen soll laut scheitern.
 */
function maklerAusConfig(name: string): SiteBroker {
  const makler = siteConfig.brokerPartner.brokers.find((m) => m.name === name);
  if (!makler) {
    throw new Error(
      `config/menschen.ts nennt "${name}", site.config.ts (brokerPartner.brokers) kennt diesen Namen nicht.`
    );
  }
  return makler;
}

const HANSJOERG = maklerAusConfig("Hansjörg Niermann");
const ANDREAS = maklerAusConfig("Andreas Hanneken");

/**
 * Reihenfolge ist Absicht und gilt überall: erst das Team in der
 * Reihenfolge des Inhaber-Auftrags, dann die beiden Makler.
 */
export const MENSCHEN: readonly Mensch[] = [
  {
    name: "Randolph Niermann",
    initialen: "RN",
    bezeichnung: "Geschäftsführer und Ihr Ansprechpartner",
    /* Zwei Absaetze, kein Doppelpunkt: Ein Satz, der einen neuen
       Gedanken anfaengt, bekommt einen eigenen Absatz (STEHENDE REGEL
       des Inhabers, 26.08.2026). Die Renderer trennen an \n\n. */
    beschreibung:
      "Führt selbst-verkauf.de und ist zugleich Ihr Ansprechpartner.\n\nWer anruft oder schreibt, hat ihn am anderen Ende.",
    mehr: "Und wenn eine Frage einmal offen bleibt, landet sie bei ihm.",
    bild: "/images/team/randolph-niermann.webp",
    mittelpunkt: { x: 51, augen: 41, kopf: 43 },
    gruppe: "team",
  },
  {
    name: "Johannes Niermann",
    initialen: "JN",
    bezeichnung: "Informatiker, Entwicklung",
    beschreibung:
      "Entwickelt als Informatiker den Kern der Plattform: die Abläufe, die aus Ihren Angaben Exposé und Inserat machen.",
    bild: "/images/team/johannes-niermann.webp",
    mittelpunkt: { x: 50, augen: 47, kopf: 24 },
    gruppe: "team",
  },
  {
    name: "Kevin Gutfreund",
    initialen: "KG",
    bezeichnung: "Entwicklung, Oberfläche",
    beschreibung:
      "Baut die Oberfläche: die Seiten, Masken und Ansichten, mit denen Sie auf der Plattform arbeiten.",
    bild: "/images/team/kevin-gutfreund.webp",
    mittelpunkt: { x: 51, augen: 23, kopf: 31 },
    gruppe: "team",
  },
  {
    name: "René Breuer",
    initialen: "RB",
    bezeichnung: "Entwicklung, Technik im Hintergrund",
    beschreibung:
      "Kümmert sich um die Technik dahinter, vom sicheren Ablegen Ihrer Unterlagen bis zum zuverlässigen Betrieb.",
    bild: "/images/team/rene-breuer.webp",
    mittelpunkt: { x: 50, augen: 50, kopf: 47 },
    gruppe: "team",
  },
  {
    name: HANSJOERG.name,
    initialen: HANSJOERG.initials,
    bezeichnung: "Begleitender Makler",
    beschreibung:
      "**Seit rund 30 Jahren** in der Immobilienbranche, davon über 20 Jahre selbstständig. Er begleitet Ihren Verkauf, wenn Sie einen Makler dazuholen.",
    mehr: "Er versteht sich als Brückenbauer zwischen Immobilien und Menschen und betreut seine Kunden auch in schwierigen Lebenslagen.",
    bild: HANSJOERG.image,
    mittelpunkt: { x: 42, augen: 26, kopf: 27 },
    gruppe: "makler",
  },
  {
    name: ANDREAS.name,
    initialen: ANDREAS.initials,
    bezeichnung: "Begleitender Makler und Bankkaufmann",
    beschreibung:
      "**Drei Jahrzehnte** Erfahrung in Finanzierung, Objektvermittlung und Hausverwaltung. Sein klarer Blick hilft, wenn es um Zahlen geht.",
    mehr: "Als gelernter Bankkaufmann und Fachberater für Finanzdienstleistungen steht er für Struktur und Verlässlichkeit.",
    bild: ANDREAS.image,
    mittelpunkt: { x: 54, augen: 26, kopf: 26 },
    gruppe: "makler",
  },
];

/**
 * Kurzer Gruppen-Name am Porträt (Zeile über dem Namen). Beim Makler
 * steht hier die FIRMA, nicht die Rolle: Die Rolle "Begleitender
 * Makler" trägt schon die Bezeichnung darunter, und zweimal derselbe
 * Text übereinander wäre genau der Textbaustein-Eindruck, den diese
 * Runde vermeiden soll.
 */
export const GRUPPEN_CHIP: Record<MenschenGruppe, string> = {
  team: "selbst-verkauf.de",
  makler: "WerteImmobilien GmbH",
};

/** Überschriften der beiden Gruppen auf der Team-Seite */
export const GRUPPEN_TITEL: Record<MenschenGruppe, string> = {
  team: "Das Team",
  makler: "Die begleitenden Makler",
};

/**
 * DIE HALTUNG, formuliert aus der Vorgabe des Inhabers (Runde 31).
 * Sie steht auf der Startseite in der Menschen-Sektion und auf der
 * Team-Seite, beide Male aus dieser einen Quelle. Der Kernsatz ist
 * die eine große Zeile der Sektion.
 */
export const HALTUNG = {
  /* Ohne Doppelpunkt zwischen zwei Gedanken (STEHENDE REGEL des
     Inhabers, 26.08.2026); der Doppelpunkt nach "überzeugt sind"
     bleibt, weil der Folgesatz die Überzeugung selbst IST, kein
     neuer Gedanke. */
  absatz1:
    "Wir haben selbst-verkauf.de gegründet, weil wir überzeugt sind: Wer seine Immobilie verkauft, soll selbst entscheiden, was er dabei braucht. Die Abläufe dafür haben wir nicht am Schreibtisch erfunden. Sie stammen aus dem echten Makler-Alltag, dort erprobt und für den Selbstverkauf angepasst.",
  kernsatz: "Jeder kann alles, niemand muss.",
  absatz2:
    "Und wer möchte, hat Immobilienfachleute an seiner Seite, per Nachricht, am Telefon und im Videogespräch. Sie stehen zu keinem Zeitpunkt allein da.",
} as const;

/**
 * DIE GRÜNDUNGSGESCHICHTE, Wortlaut des Inhabers (26.08.2026),
 * unverändert übernommen. Absätze trennt \n\n; die Startseiten-Sektion
 * zeigt sie zwischen Kernsatz und Unterschrift. Auf der Startseite
 * ERSETZT sie den Haltungs-Absatz 1 (sonst erzählte die Spalte zweimal,
 * warum es uns gibt); die Team-Seite trägt weiter die HALTUNG.
 *
 * Die Unterschrift darunter ist so gebaut, dass sie ohne Bild nicht
 * kaputt aussieht: Die Namenszeile steht immer, das Unterschrift-Bild
 * erscheint erst, wenn die Datei wirklich in public/ liegt
 * (lib/menschen-bilder.ts prüft zur Bauzeit).
 */
export const GRUENDUNG = {
  text: [
    "Die Idee ist älter als die Plattform.",
    "Hansjörg Niermann verkauft seit dreißig Jahren Immobilien. In dieser Zeit ist er immer wieder Eigentümern begegnet, die vieles selbst machen wollten und auch gekonnt hätten. Nur gab es dazwischen nichts. Entweder man gibt alles ab, oder man steht allein da.",
    "Gebaut haben wir sie dann als Familie und Freunde. Vier Leute, die Technik können, haben sie geschrieben. Zwei, die den Immobilienmarkt seit dreißig Jahren aus der Praxis kennen, haben gesagt, wie es in Wirklichkeit läuft, und begleiten heute die Eigentümer, die das möchten.",
    "Was heute in der Plattform steckt, ist nichts Ausgedachtes. Es sind die Abläufe aus dem Makleralltag, Schritt für Schritt so umgebaut, dass ein Eigentümer sie selbst gehen kann.",
  ].join("\n\n") as string | null,
  /*
   * Freigestellte Fassung, erzeugt aus der Inhaber-Datei
   * assets/mockup-quellen/unterschrift-randolph-niermann.svg (dort lag
   * die Geste als eingebettetes PNG schwarz auf DECKEND weissem Grund;
   * Helligkeit wurde zu Durchsichtigkeit). Gerendert wird sie als
   * CSS-Maske, deren Farbe vom ink-Token kommt: Damit ist sie auf
   * hellem Grund anthrazit und waere auf dunklem automatisch hell,
   * mit EINER Datei. Seitenverhaeltnis 1100 zu 250.
   */
  unterschriftBild: "/images/unterschriften/unterschrift-randolph-niermann.webp",
  unterschriftName: "Randolph Niermann",
  unterschriftRolle: "Geschäftsführer",
};

/**
 * Die Abgrenzung zwischen Team und begleitenden Maklern, als EIN Satzpaar
 * für beide Seiten. Wird mit textMitMarken gerendert, damit der
 * Firmenname wie überall dezent zur Partner-Website verlinkt.
 */
export const ABGRENZUNG =
  "Vier von uns bauen die Plattform. Hansjörg Niermann und Andreas Hanneken sind die begleitenden Makler der WerteImmobilien GmbH aus Ennigerloh, keine Angestellten von selbst-verkauf.de. Sie kommen dazu, wenn Sie es möchten.";
