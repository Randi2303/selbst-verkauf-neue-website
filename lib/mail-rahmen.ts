/**
 * Gemeinsames Grundgeruest aller E-Mail-Vorlagen.
 *
 * EINE Quelle fuer beide Versandwege:
 * - lib/mail-vorlagen.ts (eigener Versand ueber Resend)
 * - docs/mail-vorlagen/*.html (Rueckfallebene ueber Supabase), die aus
 *   lib/mail-vorlagen-supabase.ts erzeugt werden
 *
 * Eine Aenderung hier wirkt damit in ALLEN Vorlagen, und neue Vorlagen
 * bringen Kopf, Fuss, Logo und Dunkelmodus automatisch mit. Nach jeder
 * Aenderung `npm run mail:vorlagen` laufen lassen, damit die
 * Supabase-Dateien nachziehen.
 *
 * E-Mail-tauglich gebaut: Tabellen-Layout, alle Stile inline, keine
 * Web-Fonts (Fraunces ist in Mail-Programmen nicht verlaesslich,
 * Georgia ist der ruhige Serifen-Ersatz mit gleicher Anmutung). Die
 * Farbwerte stammen aus site.config.ts (eine Farbquelle).
 *
 * ================================================================
 * GRUNDSATZ: Die Mail muss auch dann ordentlich aussehen, wenn das
 * Empfangsprogramm unsere Dunkelmodus-Regeln IGNORIERT und die Mail
 * selbst umfaerbt.
 * ================================================================
 *
 * Nachgewiesen am 07.08.2026 in der Gmail-App auf dem Handy: Die App
 * wertet prefers-color-scheme in vielen Fassungen nicht aus. Sie
 * dunkelt die Mail selbst ab. Was sich darauf verlaesst, dass das
 * Programm den Dunkelmodus meldet, greift dort also nie.
 *
 * Daraus folgen drei Regeln, die hier durchgaengig gelten:
 *
 * 1. FLAECHEN, TEXTFARBEN UND DER KNOPF bekommen ausdrueckliche Werte,
 *    nie Standardwerte. Ein Programm, das umfaerbt, hat dann wenigstens
 *    einen bekannten Ausgangspunkt.
 * 2. DAS LOGO verlaesst sich auf gar nichts. Seine helle Flaeche steckt
 *    in der Bilddatei (public/marke/wortmarke-mail-*.png). Bildpunkte
 *    faerbt kein Mail-Programm um.
 * 3. ADRESSEN UND DOMAINS im Fliesstext werden von uns selbst als
 *    Verweis ausgezeichnet. Sonst erkennt das Programm sie und macht
 *    daraus einen Link in seinem eigenen Blau, das weder zur Marke
 *    passt noch im Dunkelmodus lesbar ist. Das erledigt
 *    adressenAuszeichnen() zentral, siehe dort.
 *
 * Die Regeln unter prefers-color-scheme bleiben zusaetzlich bestehen.
 * Sie helfen bei allen Programmen, die sie auswerten (Apple Mail,
 * Outlook fuer macOS, Gmail im Browser).
 */
import { siteConfig } from "@/site.config";

const F = {
  hintergrund: siteConfig.colors.background,
  karte: siteConfig.colors.paper,
  text: siteConfig.colors.ink,
  gedaempft: "#5E6367",
  petrol: siteConfig.colors.primary,
  petrolTief: siteConfig.colors.primaryDark,
  terrakotta: siteConfig.colors.accent,
  linie: "#E7E1D6",
};

/**
 * Dunkelmodus-Palette: bewusst warm gehalten (leichter Gruenstich statt
 * neutralem Grau), damit die Mail auch dunkel nach unserer Marke
 * aussieht und nicht nach Systemvorgabe.
 *
 * Zwei verschiedene Petrol-Werte, und zwar aus einem gemessenen Grund:
 * - petrol (#1F7A70) ist die KNOPF-FLAECHE. Sie traegt weissen Text mit
 *   5,15:1 und hebt sich mit 2,82:1 von der Karte ab.
 * - petrolText (#4BA79B) ist die TEXTFARBE fuer Verweise und Zahlen.
 *   #1F7A70 als Text auf der dunklen Karte kaeme nur auf 2,82:1 und
 *   waere damit zu blass; #4BA79B erreicht 5,05:1.
 * Vorher stand beides auf demselben Wert, die Verweise waren also
 * unterhalb der Lesbarkeitsgrenze. Gemessen am 07.08.2026.
 */
const D = {
  hintergrund: "#161918",
  karte: "#262A29",
  linie: "#3A403E",
  text: "#F1EDE6",
  gedaempft: "#A9A79F",
  // Knopfflaeche im Dunkeln. Bewusst NICHT aufgehellt: Weiss auf
  // #17615B ergibt 7,25 statt 5,15, die Beschriftung traegt damit
  // deutlich besser. Ein helleres Mint wuerde die weisse Schrift
  // schwaechen und genau den blassen Eindruck erzeugen.
  petrol: "#17615B",
  petrolText: "#4BA79B",
  terrakotta: "#E58F62",
};

/**
 * SERIF IST SEIT DEM 29.08.2026 NUR NOCH DIE WORTMARKE.
 *
 * Er steht ausschliesslich am Ersatztext des Logo-Bildes, also an der
 * Stelle, an der ein Mailprogramm die Wortmarke schreibt, wenn es das
 * Bild nicht laedt. Ueberschriften laufen mit der Anwendung auf den
 * Sans-Stapel mit.
 *
 * ================================================================
 * WAS EIN EMPFAENGER TATSAECHLICH SIEHT
 * ================================================================
 * In keiner Fassung Inter, weder vorher noch nachher. Mails laden
 * keine Web-Fonts; wir haben nie eine mitgeschickt und tun es auch
 * jetzt nicht. Was ankommt, ist immer eine Schrift des Geraets:
 *
 *   Apple Mail, iPhone, iPad   San Francisco (ueber -apple-system)
 *   Outlook unter Windows      Segoe UI
 *   Gmail im Browser           die Geraeteschrift, also SF oder Segoe UI
 *   alles Aeltere              Helvetica, sonst Arial
 *
 * INTER STEHT BEWUSST NICHT VORNE IM STAPEL. Es waere fuer die
 * wenigen Empfaenger, die Inter auf dem Rechner haben, ein Treffer
 * und fuer alle anderen ein Unterschied mehr. Eine Mail soll ueberall
 * gleich aussehen, nicht bei einzelnen ein bisschen besser.
 *
 * FOLGE FUER DIE UNTERSCHEIDUNG: Vorher trennte Georgia gegen den
 * Sans-Stapel, also die FORM. Das faellt weg. Es tragen jetzt Groesse
 * (24 gegen 15 Punkt) und Staerke (700 gegen 400), siehe ueberschrift().
 */
export const SERIF = `Georgia, 'Times New Roman', serif`;
export const SANS = `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;

/**
 * Wortmarke fuer Mails: 452x119 in der Datei (bzw. 904x239 in der
 * doppelten Aufloesung), gezeigt auf 200x53. Die helle Flaeche ist
 * eingebacken, Begruendung siehe scripts/mail-logo-erzeugen.mjs.
 */
const LOGO_BREITE = 200;
const LOGO_HOEHE = 53;

/**
 * Fassungsnummer der Bildadresse.
 *
 * WARUM DAS HIER STEHT, gemessen am 07.08.2026:
 * Die gesamte Seite liegt im Vorlaunch hinter einem Passwortschutz und
 * antwortet mit 401. Nur der Ordner /marke/ ist ausgenommen (proxy.ts,
 * matcher). Solange diese Ausnahme noch nicht ausgerollt war, bekam
 * jeder Abruf des Logos eine 401 zurueck, auch der Bild-Proxy von
 * Gmail. Und dieser Proxy merkt sich sein Ergebnis je Adresse: Ist eine
 * Adresse einmal als nicht ladbar vermerkt, bleibt das Bild kaputt,
 * selbst wenn der Server laengst richtig antwortet.
 *
 * Die Fassungsnummer bricht das auf: Eine geaenderte Adresse ist fuer
 * jeden Zwischenspeicher eine neue Adresse. Bei jeder kuenftigen
 * Aenderung an der Wortmarke wird sie hochgezaehlt, dann kann dasselbe
 * nicht noch einmal unbemerkt passieren.
 */
const LOGO_FASSUNG = 2;

/**
 * Die Marken-Dateien liegen unter /marke/ und sind absolut verlinkt.
 * Relative Adressen kann ein Mail-Programm nicht aufloesen, und
 * localhost gaebe es beim Empfaenger nicht.
 *
 * WICHTIG: /marke/ ist im Vorlaunch-Passwortschutz ausgenommen
 * (proxy.ts), sonst bekommt das Mail-Programm die Anmelde-Abfrage
 * statt des Bildes und zeigt nur den Ersatztext. Die Ausnahme greift
 * auch mit Abfragezeichenfolge, nachgemessen.
 */
export function logoUrl(datei: string): string {
  return `${siteConfig.domain}/marke/${datei}?v=${LOGO_FASSUNG}`;
}

/**
 * Der Rahmen gibt auf schmalen Bildschirmen nach.
 *
 * ================================================================
 * DIE URSACHE SCHLECHTER UMBRUECHE STEHT NICHT IN DEN VORLAGEN,
 * SONDERN HIER: Die Abstaende waren fest.
 * ================================================================
 *
 * Gemessen am 13.08.2026 auf einem 320 Pixel breiten Bildschirm:
 * 16 px Rand aussen, 32 px Innenabstand der Karte und 1 px Rahmen,
 * beidseitig, ergaben 98 px Beiwerk. Fuer den Text blieben 222 px,
 * also gut zwei Drittel. Ein Wort wie "Besichtigungstermin" ist in
 * der Ueberschrift breiter als das; die Zeile "Ihr Besichtigungs-
 * termin steht" stand deshalb mit einem Wort je Zeile da, und
 * Absaetze endeten reihenweise mit einem einzelnen Wort.
 *
 * Die Regeln stehen als Abfrage nach der Breite und nicht inline,
 * und zwar in dieser Richtung: Der eingebaute Wert ist der WEITE
 * (Schreibtisch), die Abfrage macht ihn schmal. Programme, die
 * Stilbloecke ignorieren (Outlook auf dem Rechner), zeigen immer
 * ein breites Fenster und brauchen die Verengung gar nicht. Umgekehrt
 * herum waere es falsch.
 *
 * Trennstriche nur schmal und nur in der Ueberschrift: Dort stehen
 * die langen zusammengesetzten Woerter, und ein getrenntes Wort ist
 * besser als eine Zeile, die nur aus ihm besteht. Im Fliesstext
 * waeren Trennstriche unruhig, dort genuegt der gewonnene Platz.
 *
 * KEINE SILBENTRENNUNG, auch hier nicht (13.08.2026): Die Ueberschrift
 * trug unter 480 px "hyphens: auto". In einer Mail steht dort oft ein
 * Name oder eine Adresse, und ein Trennstrich mitten im Namen ist in
 * einer Mail noch schwerer zu ertragen als auf der Seite, weil man sie
 * ausdruckt und weiterleitet.
 */
const SCHMAL = `
  @media only screen and (max-width: 480px) {
    .sv-rand { padding-left: 8px !important; padding-right: 8px !important; padding-top: 24px !important; }
    .sv-karte { padding: 26px 18px !important; }
    .sv-h1 { font-size: 20px !important; }
    .sv-zitat { padding-left: 12px !important; padding-right: 12px !important; }
    .sv-knopf a { padding-left: 18px !important; padding-right: 18px !important; }
  }
`;

const STILE = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  /* Apple erkennt Adressen und Daten selbst und faerbt sie blau an.
     Diese Regel gibt ihnen die Farbe der Umgebung zurueck. Gegen die
     Gmail-App hilft sie nicht, dagegen wirkt adressenAuszeichnen(). */
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  /* Umbrueche, die kein einzelnes Wort stehen lassen. Fliesstext zieht
     bei Bedarf ein Wort in die vorletzte Zeile, Ueberschriften und
     Knopfbeschriftungen werden auf gleich lange Zeilen verteilt. Wo ein
     Programm das nicht kennt, bricht es wie bisher um, es geht also
     nichts verloren.
     REIHENFOLGE BEACHTEN: Die Ueberschrift traegt beide Klassen
     (sv-text sv-h1). Stuende balance oben, gewaenne bei gleichem
     Gewicht die spaetere Regel, und die Ueberschrift bekaeme pretty. */
  .sv-text, .sv-gedaempft { text-wrap: pretty; }
  h1.sv-h1, .sv-knopf a { text-wrap: balance; }
${SCHMAL}
  @media (prefers-color-scheme: dark) {
    .sv-flaeche { background-color: ${D.hintergrund} !important; }
    .sv-karte { background-color: ${D.karte} !important; border-color: ${D.linie} !important; }
    .sv-text { color: ${D.text} !important; }
    .sv-gedaempft, .sv-gedaempft a { color: ${D.gedaempft} !important; }
    .sv-akzent { color: ${D.terrakotta} !important; }
    .sv-petrol, .sv-adresse { color: ${D.petrolText} !important; }
    .sv-knopf { background-color: ${D.petrol} !important; border-color: ${D.petrol} !important; }
    .sv-knopf a { background-color: ${D.petrol} !important; color: #FFFFFF !important; }
    .sv-zitat { background-color: ${D.hintergrund} !important; border-left-color: ${D.petrolText} !important; }
  }
`;

/**
 * Kopf mit der Wortmarke.
 *
 * EINE Fassung, kein Umschalter. Die helle Flaeche steckt in der Datei,
 * damit die Wortmarke auch dort lesbar bleibt, wo das Programm den
 * Dunkelmodus nicht meldet, sondern einfach selbst umfaerbt. Der
 * frueher hier stehende Tausch ueber prefers-color-scheme griff in der
 * Gmail-App nie, sichtbar blieb nur das Terrakotta-".de".
 *
 * Der Ersatztext steht bewusst da: Viele Programme blockieren Bilder
 * grundsaetzlich, dann soll trotzdem ordentlich "selbst-verkauf.de"
 * dastehen statt eines leeren Kastens.
 */
function kopf(): string {
  // KEINE feste Hoehe am Bild: Wird es blockiert oder laesst es sich
  // nicht laden, faellt der Kasten zusammen und uebrig bleibt der
  // Ersatztext. Ein leerer Rahmen mit Fragezeichen sieht kaputter aus
  // als gar kein Bild. Die Hoehe steht nur im height-Attribut, das
  // Mail-Programme fuer die Vorab-Reservierung nutzen und beim
  // Fehlschlag ignorieren.
  //
  // Der Ersatztext ist bewusst in der Anzeigeschrift und in der
  // Textfarbe gesetzt: Wo das Bild fehlt, steht dann ordentlich
  // "selbst-verkauf.de" statt eines grauen Platzhalters.
  return `<tr><td align="center" style="padding-bottom:24px;">
<img src="${logoUrl("wortmarke-mail-800.png")}" width="${LOGO_BREITE}" height="${LOGO_HOEHE}" alt="selbst-verkauf.de" style="display:block;width:${LOGO_BREITE}px;max-width:${LOGO_BREITE}px;border:0;outline:none;text-decoration:none;font-family:${SERIF};font-size:19px;font-weight:600;letter-spacing:-0.01em;color:${F.text};">
</td></tr>`;
}

/**
 * Absenderart, steuert nur den Zusatz in der Fusszeile.
 * "noreply" sind die Anmelde- und Sicherheits-Mails, "antwortbar" die
 * Benachrichtigungen aus dem Konto (Absender hallo@).
 */
export type MailAbsenderArt = "noreply" | "antwortbar";

/**
 * Fusszeile, gleich aufgebaut in JEDER Vorlage.
 *
 * WERTEIMMOBILIEN STEHT HIER BEWUSST NICHT.
 *
 * Anbieter ist selbst-verkauf.de. Der Makler-Partner erscheint
 * ausschliesslich dort, wo die Makler-Begleitung tatsaechlich gebucht
 * ist: im Makler-Absatz des Exposés (lib/expose.ts, hinter
 * maklerGebucht) und in der Makler-Karte des Kontos. In Anmelde- und
 * Systemmails hat er nichts zu suchen, das vermischt die Rollen.
 * Auf der oeffentlichen Website ist die Nennung dagegen gewollt, siehe
 * README, Abschnitt "Wer wo genannt wird".
 */
function fuss(art: MailAbsenderArt): string {
  const antwortHinweis =
    art === "noreply"
      ? `Auf diese Nachricht können Sie nicht antworten. Schreiben Sie uns an <a href="mailto:${siteConfig.mailAbsender.antwort}" style="color:${F.gedaempft};text-decoration:underline;">${siteConfig.mailAbsender.antwort}</a>.<br>`
      : "";
  return `<tr><td align="center" class="sv-gedaempft" style="padding-top:24px;font-family:${SANS};font-size:12px;line-height:1.6;color:${F.gedaempft};">
<a href="${siteConfig.domain}" style="color:${F.gedaempft};text-decoration:none;">selbst-verkauf.de</a> &middot; Festpreis statt Provision<br>
${antwortHinweis}<a href="${siteConfig.domain}/impressum" style="color:${F.gedaempft};text-decoration:underline;">Impressum</a>
&nbsp;&middot;&nbsp;
<a href="${siteConfig.domain}/datenschutz" style="color:${F.gedaempft};text-decoration:underline;">Datenschutz</a>
</td></tr>`;
}

/* ------------------------------------------------------------------ */
/* Adressen im Fliesstext selbst auszeichnen                           */
/* ------------------------------------------------------------------ */

/**
 * Domains, die in unseren Texten vorkommen duerfen.
 *
 * Bewusst eine Liste statt eines allgemeinen Musters: Ein Muster wie
 * "irgendwas.de" wuerde frueher oder spaeter auch Versionsnummern oder
 * Dateinamen erwischen und daraus Links machen. Kommt eine neue Domain
 * hinzu, gehoert sie hierher.
 */
const DOMAINS = ["selbst-verkauf.de"];

/**
 * Platzhalter der Supabase-Vorlagen, die zur Sendezeit durch eine
 * E-Mail-Adresse ersetzt werden.
 *
 * Die muessen mit, und zwar genau deshalb: Beim Erzeugen der Vorlage
 * steht hier nur "{{ .Email }}", die echte Adresse setzt Supabase erst
 * beim Versand ein. Wer nur nach dem @-Zeichen sucht, findet sie also
 * nie und wundert sich spaeter ueber einen blauen Link. Genau das war
 * der Befund vom 07.08.2026.
 */
const PLATZHALTER = ["Email", "NewEmail", "OldEmail"];

/**
 * Die Reihenfolge der Alternativen ist WICHTIG.
 *
 * Die vollstaendige Adresse steht zuerst. Sonst greift die
 * Domain-Alternative mitten in einer URL: Aus
 * "https://selbst-verkauf.de/besichtigung/abc" wurde ein Verweis auf
 * "selbst-verkauf.de" mit dem Pfad als nacktem Text daneben, und der
 * Empfaenger landete auf der Startseite statt auf seiner Seite.
 * Gefunden am 08.08.2026 mit der Vorschau im Admin-Bereich.
 */
const ADRESS_MUSTER = new RegExp(
  [
    `https?://[^\\s<>"']+`,
    `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}`,
    `\\{\\{\\s*\\.(?:${PLATZHALTER.join("|")})\\s*\\}\\}`,
    DOMAINS.map((d) => d.replace(/[.]/g, "\\.")).join("|"),
  ].join("|"),
  "g"
);

/**
 * Zeichnet E-Mail-Adressen und unsere Domains im Fliesstext als
 * Verweise mit eigener Farbe aus.
 *
 * WARUM: Mail-Programme erkennen Adressen selbst und verlinken sie in
 * ihrem eigenen Blau. In der Gmail-App wurde daraus im Dunkelmodus ein
 * kaum lesbares Blau, das ausserdem nicht zur Marke passt. Ein Text,
 * der bereits IN einem Verweis steht, wird nicht noch einmal verlinkt.
 * Also machen wir es selbst und bestimmen die Farbe.
 *
 * Der Durchlauf arbeitet auf dem fertigen HTML und laesst zwei Bereiche
 * in Ruhe:
 * - alles innerhalb von Tags (sonst wuerden href und style zerlegt)
 * - alles innerhalb eines bereits vorhandenen <a> (kein Verweis im
 *   Verweis, das ist ungueltiges HTML)
 *
 * In Ueberschriften bekommt der Verweis die Farbe der Ueberschrift und
 * keine Unterstreichung: Der Zweck ist dort allein, die eigenmaechtige
 * Verlinkung zu verhindern, nicht ein Link mitten in der Zeile.
 */
export function adressenAuszeichnen(html: string): string {
  const teile = html.split(/(<[^>]+>)/g);
  let inVerweis = false;
  let inUeberschrift = false;

  return teile
    .map((teil) => {
      if (teil.startsWith("<")) {
        const name = teil.slice(1).replace(/^\//, "").split(/[\s>]/)[0].toLowerCase();
        if (name === "a") inVerweis = !teil.startsWith("</");
        if (name === "h1" || name === "h2") inUeberschrift = !teil.startsWith("</");
        return teil;
      }
      if (inVerweis || !teil) return teil;

      return teil.replace(ADRESS_MUSTER, (treffer) => {
        const istUrl = /^https?:\/\//.test(treffer);
        const istMail =
          !istUrl && (treffer.includes("@") || treffer.startsWith("{{"));
        const ziel = istUrl
          ? treffer
          : istMail
            ? `mailto:${treffer}`
            : `https://${treffer}`;
        const stil = inUeberschrift
          ? "color:inherit;text-decoration:none;"
          : `color:${F.petrol};text-decoration:underline;`;
        const klasse = inUeberschrift ? "" : ` class="sv-adresse"`;
        return `<a href="${ziel}"${klasse} style="${stil}">${treffer}</a>`;
      });
    })
    .join("");
}

/** Vollstaendige Mail: Kopf mit Wortmarke, Karte mit dem Inhalt, Fuss */
export function rahmen(
  inhalt: string,
  vorschau: string,
  art: MailAbsenderArt = "noreply"
): string {
  const koerper = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
${kopf()}
<tr><td class="sv-karte" style="background-color:${F.karte};border:1px solid ${F.linie};border-radius:18px;padding:34px 32px;">
${inhalt}
</td></tr>
${fuss(art)}
</table>`;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<title>selbst-verkauf.de</title>
<style>${STILE}</style>
</head>
<body class="sv-flaeche" style="margin:0;padding:0;background-color:${F.hintergrund};">
<div style="display:none;max-height:0;overflow:hidden;">${vorschau}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sv-flaeche" style="background-color:${F.hintergrund};">
<tr><td align="center" class="sv-rand" style="padding:36px 16px;">
${adressenAuszeichnen(koerper)}
</td></tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Die EINE Ordnung aller Vorlagen (vereinheitlicht am 13.08.2026)      */
/*                                                                     */
/* Zwei Textgroessen, klar getrennt: Haupttext 15px in Textfarbe        */
/* (absatz, zitat, liste), Erlaeuterung 12.5px gedaempft               */
/* (hinweiszeile, ersatzlink). Ueberschriften: die eine Serif-H1 oben,  */
/* Zwischenueberschriften als fette 15px-Zeile mit fester Luft.        */
/*                                                                     */
/* Abstaende: Jeder Baustein traegt seinen Abstand nach UNTEN selbst   */
/* (12 bis 16px); nur Zwischenueberschrift und Knopf bringen           */
/* zusaetzlich Luft nach OBEN mit (24px), weil dort ein neuer          */
/* Abschnitt beginnt. Benachbarte Abstaende fallen zusammen, es        */
/* gewinnt der groessere. Vorher hatte die hinweiszeile 18px oben und  */
/* NICHTS unten: Ein Absatz danach klebte an ihr, und fette Absaetze   */
/* als Zwischenueberschriften sassen ohne Luft auf dem Text davor.     */
/* ------------------------------------------------------------------ */

/**
 * DIE UEBERSCHRIFT DER MAIL.
 *
 * Sans statt Serif (29.08.2026) und 700 statt 600: Solange Georgia
 * dastand, trug die FORM den Unterschied zum Fliesstext. Ohne sie
 * muessen Groesse und Staerke ihn allein tragen, und 600 gegen 400
 * war dafuer zu wenig; 700 ist in jedem der genannten Stapel ein
 * echter fetter Schnitt und kein gerechneter.
 *
 * Die Zwischenueberschrift darunter steht ebenfalls auf 700, aber auf
 * 15 Punkt. Die beiden verwechselt niemand: Der Abstand ist eine
 * ganze Stufe.
 */
export function ueberschrift(text: string): string {
  return `<h1 class="sv-text sv-h1" style="margin:0 0 16px;font-family:${SANS};font-size:24px;line-height:1.3;font-weight:700;color:${F.text};">${text}</h1>`;
}

/** Fette Zwischenueberschrift mit fester Luft darueber und darunter */
export function zwischenueberschrift(text: string): string {
  return `<p class="sv-text" style="margin:24px 0 8px;font-family:${SANS};font-size:15px;line-height:1.4;font-weight:700;color:${F.text};">${text}</p>`;
}

export function absatz(text: string): string {
  return `<p class="sv-text" style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.65;color:${F.text};">${text}</p>`;
}

/** Aufzaehlung im Haupttext; die Zeilen kommen als fertige <li> */
export function liste(zeilenLi: string): string {
  return `<ul class="sv-text" style="margin:0 0 14px;padding-left:20px;font-family:${SANS};font-size:15px;line-height:1.65;color:${F.text};">
${zeilenLi}
</ul>`;
}

export function hinweiszeile(text: string): string {
  return `<p class="sv-gedaempft" style="margin:14px 0 12px;font-family:${SANS};font-size:12.5px;line-height:1.6;color:${F.gedaempft};">${text}</p>`;
}

/** Grosser Zahlencode, etwa fuer die Identitaets-Bestaetigung */
export function code(inhalt: string): string {
  return `<p class="sv-petrol" style="margin:20px 0 8px;font-family:${SANS};font-size:30px;font-weight:600;letter-spacing:0.12em;color:${F.petrol};">${inhalt}</p>`;
}

/**
 * Knopf.
 *
 * Beschriftung reinweiss und kraeftig gesetzt, Flaeche mit ausdruecklich
 * gesetzter Farbe UND Rahmen. Der Rahmen ist kein Schmuck: Faerbt ein
 * Programm die Flaeche eigenmaechtig auf, bleibt der Knopf durch die
 * Umrandung als Knopf erkennbar.
 *
 * Gemessen: Beschriftung auf der Flaeche 7,25:1 im hellen und 5,15:1 im
 * dunklen Modus, Flaeche gegen die Karte 7,01:1 hell.
 */
export function knopf(link: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;">
<tr><td class="sv-knopf" style="border-radius:999px;background-color:${F.petrol};border:1px solid ${F.petrolTief};">
<a href="${link}" style="display:inline-block;padding:13px 28px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">${label}</a>
</td></tr>
</table>`;
}

/**
 * Fremden Text fuer den HTML-Teil entschaerfen.
 *
 * WOZU: Alles, was in eine Mail geht und nicht von uns stammt, ist
 * fremder Text: die Nachricht des Verkaeufers an einen Interessenten,
 * die Rueckmeldung zu einer Absage, ein eingetippter Name. Ohne diese
 * Behandlung landet ein "<" unveraendert im HTML, und aus einer
 * Nachricht wird ungewollt Auszeichnung.
 *
 * Zeilenumbrueche bleiben erhalten: Wer seinen Text in Absaetze
 * gliedert, soll ihn beim Empfaenger auch so wiederfinden.
 */
export function schuetzeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, "<br>");
}

/** Zitierter Auszug, etwa die Nachricht des Teams */
export function zitat(inhalt: string): string {
  return `<blockquote class="sv-text sv-zitat" style="margin:0 0 14px;padding:12px 16px;border-left:3px solid ${F.petrol};background-color:${F.hintergrund};font-family:${SANS};font-size:14.5px;line-height:1.65;color:${F.text};">${inhalt}</blockquote>`;
}

export type BetragsZeile = {
  /** Bezeichnung links, darf umbrechen */
  label: string;
  /** Betrag rechts, bricht nie um. Ohne Betrag laeuft das Label durch. */
  betrag?: string | null;
  /** Zwischenzeile oder Summe, kraeftiger gesetzt */
  stark?: boolean;
  /** Erlaeuterung in Kleinschrift, ueber die volle Breite */
  leise?: boolean;
};

/**
 * Posten mit Betraegen, zweispaltig: Bezeichnung links, Betrag rechts.
 *
 * WARUM NICHT EINFACH "Name: 249,00 €" IN EINER ZEILE, wie es vorher
 * war: Auf einem schmalen Bildschirm bricht so eine Zeile hinter dem
 * Namen um, und der Betrag steht allein in der naechsten Zeile. Genau
 * das ist der schlimmste Fall eines einzelnen Wortes je Zeile, weil
 * ein Betrag ohne seine Bezeichnung nicht mehr zuzuordnen ist.
 *
 * Zwei Spalten loesen das grundsaetzlich: Der Betrag steht immer auf
 * Hoehe der ersten Zeile seiner Bezeichnung, egal wie schmal es wird,
 * und bricht selbst nie (white-space). Die Bezeichnung darf umbrechen,
 * das ist unkritisch. Nebenbei liest sich der Block wie eine Rechnung.
 */
/**
 * Der Betrag selbst haelt zusammen, die Einheit dahinter darf umziehen.
 *
 * "169 € je Monat" ist zweierlei: der Betrag und seine Einheit. Steht
 * die ganze Zeichenfolge unter Umbruchschutz, verlangt die Spalte
 * deren volle Breite, und daneben bleibt fuer die Bezeichnung so wenig
 * uebrig, dass "Monatlich gesamt" auf zwei Zeilen faellt. Geschuetzt
 * wird deshalb in zwei Stuecken: der Betrag bis zum Euro-Zeichen und
 * die Einheit dahinter, jedes fuer sich unteilbar. Wird es eng,
 * rutscht "je Monat" als Ganzes in die naechste Zeile und steht dort
 * rechtsbuendig unter seinem Betrag. Ohne die zweite Klammer bricht es
 * mitten in der Einheit ("169 € je" / "Monat"), und damit waere genau
 * der Fehler zurueck, den das hier verhindern soll.
 */
function geschuetzterBetrag(betrag: string): string {
  const halten = (t: string) => `<span style="white-space:nowrap;">${t}</span>`;
  const bis = betrag.indexOf("€");
  if (bis < 0) return halten(betrag);
  const einheit = betrag.slice(bis + 1).trim();
  return `${halten(betrag.slice(0, bis + 1))}${einheit ? ` ${halten(einheit)}` : ""}`;
}

export function betragsBlock(zeilen: BetragsZeile[]): string {
  const reihen = zeilen
    .map((z) => {
      const groesse = z.leise ? "12.5px" : "14.5px";
      const farbe = z.leise ? F.gedaempft : F.text;
      const klasse = z.leise ? "sv-gedaempft" : "sv-text";
      const stark = z.stark ? "font-weight:700;" : "";
      const zellStil = `padding:3px 0;font-family:${SANS};font-size:${groesse};line-height:1.55;color:${farbe};${stark}`;
      if (!z.betrag) {
        return `<tr><td colspan="2" class="${klasse}" style="${zellStil}">${z.label}</td></tr>`;
      }
      return `<tr><td class="${klasse}" style="${zellStil}padding-right:10px;">${z.label}</td><td align="right" valign="top" class="${klasse}" style="${zellStil}">${geschuetzterBetrag(z.betrag)}</td></tr>`;
    })
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
<tr><td class="sv-zitat" style="padding:12px 16px;border-left:3px solid ${F.petrol};background-color:${F.hintergrund};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${reihen}
</table>
</td></tr>
</table>`;
}

/** "Falls der Knopf nicht funktioniert" mit der Adresse zum Kopieren */
export function ersatzlink(link: string): string {
  return `<p class="sv-gedaempft" style="margin:0 0 12px;font-family:${SANS};font-size:12.5px;line-height:1.6;color:${F.gedaempft};word-break:break-all;">Falls der Knopf nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br><a href="${link}" class="sv-adresse" style="color:${F.petrol};text-decoration:underline;">${link}</a></p>`;
}
