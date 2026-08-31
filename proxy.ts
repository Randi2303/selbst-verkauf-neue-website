import { NextResponse, type NextRequest } from "next/server";
import { basisPruefen } from "@/lib/basis-pruefung";
import { instanzRolle } from "@/lib/instanz";

/**
 * Drei Aufgaben, in dieser Reihenfolge:
 *
 * 1. ROLLEN-PRUEFUNG. Seit der Unterdomain-Runde (24.08.2026) laeuft
 *    dieselbe Software als zwei Hostinger-Anwendungen: die oeffentliche
 *    Seite auf selbst-verkauf.de und der Anmeldebereich auf
 *    app.selbst-verkauf.de. Welche Rolle diese Instanz hat, sagt
 *    AUSSCHLIESSLICH die Variable INSTANZ_ROLLE ("oeffentlich" oder
 *    "app"). Der Host-Kopf der Anfrage wird dafuer NIE gelesen: Hinter
 *    dem Proxy des Hosters steht dort die interne Adresse, das ist der
 *    Befund aus lib/basis-adresse.ts.
 *
 *    AUFLAGE DES INHABERS (24.08.2026): Eine Anwendung, die nicht
 *    weiss, wer sie ist, liefert lieber gar nichts aus. Ist APP_URL
 *    gesetzt (der Umzug also gewollt) und die Rolle fehlt oder ist
 *    unlesbar, antwortet ALLES hier mit 503 und einem neutralen Satz.
 *    Die von aussen gerufenen Maschinen-Wege (api/auftrag, api/stripe,
 *    api/foto-ki) sind vom matcher ausgenommen und laufen weiter; sie
 *    tragen ihren eigenen Schutz.
 *
 * 2. DIE WEICHE. Die oeffentliche Instanz leitet die Konto-Pfade zur
 *    App-Basis, die App-Instanz leitet alles Oeffentliche zur
 *    Haupt-Basis. Dauerhaft gedacht, gebaut aber mit 307 statt 308
 *    (WEICHE_STATUS unten): 308 merken sich Browser, und eine falsch
 *    weitergeleitete Adresse bliebe dann auch nach dem Rueckweg falsch.
 *    Auf 308 wird erst umgestellt, wenn die Weiche einige Tage
 *    unauffaellig gelaufen ist, mit Ansage an den Inhaber.
 *    Pfad, Parameter und Anker bleiben bei der Weiterleitung erhalten;
 *    eingeloest wird dabei nichts, die Einmal-Wege loesen erst per
 *    POST auf ihrer Zielseite ein (app/auth/bestaetigen/page.tsx).
 *    Die Weiche steht VOR dem Passwortschutz: Sie gibt keinen Inhalt
 *    preis und erspart das doppelte Anmeldefenster auf dem falschen
 *    Host. Ohne brauchbare APP_URL, mit unbrauchbarer Gegen-Basis oder
 *    wenn beide Basen gleich sind (Fehlkonfiguration, waere eine
 *    Weiterleitungs-Schleife) bleibt die Weiche aus.
 *
 * 3. VORLAUNCH-PASSWORTSCHUTZ (HTTP Basic Auth) mit Freigabe-Link.
 *
 * WICHTIG: Das ist ein Vorlaunch-Schutz gegen neugierige Besucher und
 * Crawler, KEIN Hochsicherheits-Login. Der echte Kundenlogin laeuft
 * ueber die App.
 *
 * Zwei getrennte Schalter, beide in den Hostinger-App-Einstellungen:
 * - PASSWORD_PROTECT: steuert NUR den Passwortschutz. SEIT DER
 *   UNTERDOMAIN-RUNDE FAIL-CLOSED (Auflage des Inhabers): Der Schutz
 *   ist AN, solange nicht ausdruecklich "false" dasteht. Eine frisch
 *   angelegte Anwendung ohne Variablen ist damit ZU statt offen, und
 *   eine versehentlich geloeschte Variable oeffnet nichts. Lokal
 *   gehoert PASSWORD_PROTECT=false in die .env.local (steht in
 *   .env.local.example), sonst antwortet der Entwicklungs-Server nur
 *   noch mit 401. Die Client-Seite (Prefetch, Service-Worker) liest
 *   denselben Schalter ueber lib/passwortschutz.ts in derselben
 *   Lesart.
 * - SITE_PRELAUNCH steuert NUR die Indexierung (siehe lib/prelaunch.ts)
 *   und bleibt hier bewusst komplett aussen vor.
 *
 * Haertung, damit ohne Anmeldung wirklich NICHTS sichtbar ist:
 * - Jede 401-Antwort traegt nur einen neutralen Satz, nie Seiteninhalt.
 * - Solange der Schutz aktiv ist, bekommt JEDE Antwort (401 wie
 *   erfolgreich) Cache-Control: no-store, damit weder Browser noch CDN
 *   Inhalte zwischenspeichern und spaeter am Schutz vorbei ausliefern.
 *   Statische Assets unter _next/static bleiben cachebar (Ausnahme im
 *   matcher), sie enthalten keine Inhalte ohne die Seite drumherum.
 * - Router-Prefetches werden zentral hier abgewiesen, damit keine
 *   Inhalte auf Vorrat im Client landen, bevor die Anmeldung steht.
 * - Der passende Service-Worker-Schutz sitzt im Root-Layout
 *   (ServiceWorkerBereinigung), gesteuert ueber lib/passwortschutz.ts.
 *
 * Zugang bei aktivem Schutz:
 * 1. Basic Auth gegen BASIC_AUTH_USER und BASIC_AUTH_PASSWORD, der
 *    Browser zeigt sein natives Anmeldefenster und merkt sich die
 *    Eingabe fuer die Sitzung.
 * 2. Freigabe-Link: Eine beliebige URL mit ?zugang=[SHARE_TOKEN] setzt
 *    ein httpOnly-Cookie (7 Tage) und leitet auf dieselbe URL ohne den
 *    Parameter weiter. Das Cookie speichert einen Ableitungswert
 *    (SHA-256) des Tokens: Wird SHARE_TOKEN geaendert, verlieren alle
 *    verteilten Links und Cookies sofort ihre Gueltigkeit. Beide
 *    Cookies sind host-gebunden, auf jeder der beiden Adressen ist die
 *    Freigabe einmal faellig.
 *
 * Anmerkung zur Datei: Die Konvention hiess frueher middleware.ts und
 * wurde von Next.js in proxy.ts umbenannt, die Funktion ist dieselbe
 * (laeuft serverseitig vor jeder passenden Anfrage).
 */

const ZUGANG_PARAM = "zugang";
const ZUGANG_COOKIE = "sv-zugang";
const COOKIE_LAUFZEIT_SEKUNDEN = 7 * 24 * 60 * 60;

/**
 * 307, nicht 308, bis die Weiche sich einige Tage bewiesen hat
 * (Auflage des Inhabers, 24.08.2026). Browser merken sich 308 dauerhaft
 * und fragen dann nicht mehr nach; ein Fehler in den Pfadlisten waere
 * mit 308 auch nach dem Rueckweg noch in den Browsern der Besucher.
 * Die Umstellung auf 308 ist eine Aenderung genau dieser Konstante und
 * wird vorher angesagt.
 */
const WEICHE_STATUS = 307;

/**
 * Die Pfade des Anmeldebereichs. Die oeffentliche Instanz leitet sie
 * zur App-Basis; die App-Instanz liefert sie selbst aus.
 */
const KONTO_PFADE = ["/konto", "/admin", "/login", "/passwort-setzen", "/auth"];

/**
 * Was die App-Instanz DARUEBER HINAUS selbst ausliefert, statt es zur
 * Haupt-Basis zu leiten:
 *
 * - /kasse: Die einzige vom Inhaber genehmigte Ausnahme von der Regel
 *   "auf der App liegt nur der Anmeldebereich" (24.08.2026). Grund:
 *   Der Warenkorb liegt im localStorage und der ist strikt an den Host
 *   gebunden. Ein angemeldeter Kunde, der im Konto Leistungen in den
 *   Korb legt, stuende an einer Haupt-Kasse vor einem leeren Korb.
 *   Auflagen dazu: Die App-Instanz liefert ohnehin alles mit noindex
 *   aus (siehe unten), und kein Link von aussen zeigt auf die
 *   App-Kasse; das sichert `npm run adressen:pruefen`.
 * - /api: Die Browser-Aufrufe des Kontos laufen relativ zum Host. Die
 *   drei Maschinen-Wege von aussen kommen hier ohnehin nie an (matcher)
 *   und sind auf der App-Instanz zusaetzlich AUS, weil ihre Geheimnisse
 *   dort bewusst nicht gesetzt werden (config/variablen.ts).
 * - /_next: Bild-Optimierung und RSC-Anfragen des eigenen Hosts.
 */
const APP_LIEFERT_SELBST = [...KONTO_PFADE, "/kasse", "/api", "/_next"];

/** Liegt der Pfad in der Liste, auf ganzer Segmentgrenze? */
function trifft(pfad: string, liste: readonly string[]): boolean {
  return liste.some((p) => pfad === p || pfad.startsWith(`${p}/`));
}

/**
 * Kein Zwischenspeichern, solange der Schutz aktiv ist: Weder der
 * Browser noch der Hostinger-CDN duerfen Seiteninhalte aufheben und
 * spaeter ohne Anmeldung ausliefern.
 */
const CACHE_SPERRE: ReadonlyArray<readonly [string, string]> = [
  ["Cache-Control", "no-store, no-cache, must-revalidate"],
  ["Pragma", "no-cache"],
];

function mitCacheSperre<T extends Response>(antwort: T): T {
  for (const [name, wert] of CACHE_SPERRE) antwort.headers.set(name, wert);
  return antwort;
}

/** Neutraler 401: nur ein Satz auf leerer Seite, niemals Seiteninhalt */
function verweigern(mitAnmeldefenster: boolean): NextResponse {
  const headers = new Headers();
  headers.set("Content-Type", "text/plain; charset=utf-8");
  if (mitAnmeldefenster) {
    headers.set("WWW-Authenticate", 'Basic realm="Vorschau selbst-verkauf.de", charset="UTF-8"');
  }
  return mitCacheSperre(
    new NextResponse("Anmeldung erforderlich.", { status: 401, headers })
  );
}

/** SHA-256 des Share-Tokens als Hex, je Token einmal berechnet */
let gemerkterToken: string | null = null;
let gemerkterHash: string | null = null;
async function tokenAbleitung(token: string): Promise<string> {
  if (gemerkterToken === token && gemerkterHash) return gemerkterHash;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  gemerkterToken = token;
  gemerkterHash = hash;
  return hash;
}

/** Konfigurations-Fehler nur einmal je Serverstart ins Log schreiben */
let konfigFehlerGeloggt = false;
let rollenFehlerGeloggt = false;
let weichenFehlerGeloggt = false;

export async function proxy(request: NextRequest) {
  const antwort = await proxyKern(request);
  /* Die App-Instanz traegt auf JEDER Antwort ein hartes noindex,
     unabhaengig von SITE_PRELAUNCH und dauerhaft auch nach dem Launch:
     Der Anmeldebereich gehoert nie in einen Suchindex. Die Hauptdomain
     behaelt ihr Verhalten aus lib/prelaunch.ts. */
  if (instanzRolle() === "app") {
    antwort.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return antwort;
}

async function proxyKern(request: NextRequest): Promise<NextResponse> {
  const rolle = instanzRolle();
  const appUrlGesetzt = Boolean((process.env.APP_URL ?? "").trim());

  /* AUFLAGE: Ist der Umzug gewollt (APP_URL steht da) und diese
     Anwendung kennt ihre Rolle nicht, liefert sie NICHTS aus. Ein 503
     faellt binnen Minuten auf; eine falsch zugeordnete Seite faellt
     erst auf, wenn ein Kunde sie sieht. */
  if (appUrlGesetzt && rolle === null) {
    if (!rollenFehlerGeloggt) {
      rollenFehlerGeloggt = true;
      console.error(
        "[instanz] APP_URL ist gesetzt, aber INSTANZ_ROLLE fehlt oder ist unlesbar (gueltig: \"oeffentlich\" oder \"app\"). Alle Seiten antworten mit 503, bis die Variable in den Hostinger-App-Einstellungen stimmt und neu ausgerollt wurde."
      );
    }
    return mitCacheSperre(
      new NextResponse("Diese Anwendung ist gerade nicht richtig eingerichtet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }

  /* DIE WEICHE. Nur aktiv, wenn beide Basen brauchbar und verschieden
     sind; sonst bleibt alles beim heutigen Verhalten. */
  if (rolle !== null) {
    const app = basisPruefen(process.env.APP_URL);
    const oeffentlich = basisPruefen(process.env.SITE_URL);
    const weicheAktiv = app.ok && oeffentlich.ok && app.basis !== oeffentlich.basis;
    if (!weicheAktiv && appUrlGesetzt && !weichenFehlerGeloggt) {
      weichenFehlerGeloggt = true;
      console.error(
        "[instanz] Die Weiche ist aus:",
        !app.ok ? `APP_URL: ${app.grund}` : !oeffentlich.ok ? `SITE_URL: ${oeffentlich.grund}` : "APP_URL und SITE_URL zeigen auf dieselbe Adresse."
      );
    }
    if (weicheAktiv) {
      const pfad = request.nextUrl.pathname;
      const suche = request.nextUrl.search;
      if (rolle === "oeffentlich" && trifft(pfad, KONTO_PFADE)) {
        return NextResponse.redirect(new URL(`${pfad}${suche}`, app.basis), WEICHE_STATUS);
      }
      if (rolle === "app" && !trifft(pfad, APP_LIEFERT_SELBST)) {
        return NextResponse.redirect(new URL(`${pfad}${suche}`, oeffentlich.basis), WEICHE_STATUS);
      }
    }
  }

  // FAIL-CLOSED: Der Schutz laeuft, solange nicht ausdruecklich
  // PASSWORD_PROTECT=false dasteht. Nur dann geht alles ungeprueft
  // und ungebremst durch.
  if (process.env.PASSWORD_PROTECT === "false") {
    return NextResponse.next();
  }

  /*
   * Router-Prefetches zentral abweisen (statt prefetch={false} an jedem
   * einzelnen Link): Der Next-Router laedt sonst Seiten auf Vorrat in den
   * Client. Solange der Schutz aktiv ist, gibt es dafuer grundsaetzlich
   * keinen Inhalt; die echte Navigation laedt dann frisch und geprueft.
   * Ohne WWW-Authenticate, damit Hintergrund-Anfragen kein
   * Anmeldefenster ausloesen.
   */
  const zweck = request.headers.get("purpose") ?? request.headers.get("sec-purpose") ?? "";
  if (request.headers.get("next-router-prefetch") !== null || zweck.includes("prefetch")) {
    return verweigern(false);
  }

  const shareToken = process.env.SHARE_TOKEN;

  // Freigabe-Link: ?zugang=[SHARE_TOKEN] setzt das Cookie und leitet
  // auf dieselbe URL ohne den Parameter weiter
  const parameter = request.nextUrl.searchParams.get(ZUGANG_PARAM);
  if (parameter !== null && shareToken && parameter === shareToken) {
    const ziel = request.nextUrl.clone();
    ziel.searchParams.delete(ZUGANG_PARAM);
    const antwort = mitCacheSperre(NextResponse.redirect(ziel));
    antwort.cookies.set(ZUGANG_COOKIE, await tokenAbleitung(shareToken), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_LAUFZEIT_SEKUNDEN,
    });
    return antwort;
  }

  // Gueltiges Freigabe-Cookie: ohne Passwort-Abfrage durchlassen
  const cookieWert = request.cookies.get(ZUGANG_COOKIE)?.value;
  if (shareToken && cookieWert === (await tokenAbleitung(shareToken))) {
    return mitCacheSperre(NextResponse.next());
  }

  // Sicherer Standard: Ohne hinterlegte Zugangsdaten bleibt alles zu,
  // statt die Seite versehentlich offen zu lassen
  const user = process.env.BASIC_AUTH_USER;
  const passwort = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !passwort) {
    if (!konfigFehlerGeloggt) {
      konfigFehlerGeloggt = true;
      console.error(
        "[Passwortschutz] Der Schutz ist aktiv (PASSWORD_PROTECT steht nicht auf \"false\"), aber BASIC_AUTH_USER oder BASIC_AUTH_PASSWORD fehlt. Alle Anfragen werden mit 401 geblockt. Beide Variablen in den Hostinger-App-Einstellungen setzen und neu deployen; lokal gehoert PASSWORD_PROTECT=false in die .env.local."
      );
    }
    return verweigern(false);
  }

  // HTTP Basic Auth: "Basic base64(user:passwort)"
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      if (zugangStimmt(auth.slice(6), user, passwort)) {
        // Auch erfolgreiche Antworten nicht zwischenspeichern lassen,
        // sonst koennte ein Cache sie spaeter Unangemeldeten ausliefern
        return mitCacheSperre(NextResponse.next());
      }
    } catch {
      // Kaputter Header: wie fehlende Anmeldung behandeln
    }
  }

  return verweigern(true);
}

/**
 * Stimmen Benutzer und Passwort? IN BEIDEN LESARTEN.
 *
 * DER BEFUND (15.08.2026, auf der ausgerollten Seite gemessen).
 * Vorher stand hier `atob(...)` allein, und `atob` gibt je Byte ein
 * Zeichen zurueck, liest die Bytes also als Latin-1. Der Kopf
 * WWW-Authenticate kuendigt daneben `charset="UTF-8"` an (siehe
 * verweigern()), und genau daran halten sich Chrome und Firefox: Sie
 * schicken ein "ö" als zwei Bytes. Aus denen macht `atob` zwei
 * Zeichen, der Vergleich scheitert, und der Mensch liest nur
 * "falsches Passwort".
 *
 * GEMESSEN, derselbe Zugang, nur anders kodiert: UTF-8 gab 401,
 * Latin-1 gab 200. Betroffen ist JEDES Passwort mit einem Zeichen
 * ausserhalb ASCII.
 *
 * WARUM BEIDE LESARTEN GELTEN und nicht nur die angekuendigte: Safari
 * schickt bei Basic Auth weiterhin Latin-1, auch wenn charset="UTF-8"
 * dabeisteht. Wer heute hineinkommt, kaeme mit einer reinen
 * UTF-8-Pruefung morgen nicht mehr hinein. Ein Vorlaunch-Schutz, der
 * den Inhaber aussperrt, ist schlechter als gar keiner.
 *
 * WARUM NICHT EINFACH EIN ASCII-PASSWORT: Das wuerde den Fehler
 * verdecken und nicht beheben. Beim naechsten Umlaut waere er zurueck,
 * und niemand wuesste mehr, warum.
 *
 * KEIN Buffer: Der Proxy laeuft je nach Umgebung auch dort, wo es die
 * Node-Bausteine nicht gibt. TextDecoder und Uint8Array gibt es
 * ueberall.
 */
function zugangStimmt(base64: string, user: string, passwort: string): boolean {
  /* Die rohen Bytes. atob liefert sie als Zeichenkette, ein Zeichen je
     Byte; das ist genau die Latin-1-Lesart. */
  const roh = atob(base64);
  const bytes = Uint8Array.from(roh, (z) => z.charCodeAt(0));
  const alsUtf8 = new TextDecoder("utf-8").decode(bytes);

  /* Der Doppelpunkt trennt. Er ist in UTF-8 ein einzelnes Byte (0x3A)
     und kann nie Teil eines mehrbytigen Zeichens sein; die Trennung
     stimmt deshalb in beiden Lesarten. */
  const teile = (wert: string) => {
    const i = wert.indexOf(":");
    return i < 0 ? null : { user: wert.slice(0, i), passwort: wert.slice(i + 1) };
  };

  for (const lesart of [teile(alsUtf8), teile(roh)]) {
    if (lesart && lesart.user === user && lesart.passwort === passwort) return true;
  }
  return false;
}

export const config = {
  /*
   * Schutz fuer ALLE Inhaltsanfragen: alle Seitenrouten inklusive
   * Unterseiten, die RSC- und Prefetch-Anfragen des Next-Routers (das
   * sind dieselben Routen mit speziellen Headern, sie laufen ganz normal
   * hier durch), die Sitemap, die OpenGraph-Bilder und eventuelle
   * API-Routen. Ausgenommen sind NUR die technischen Pfade, die zum
   * Ausliefern gebraucht werden: Build-Assets (_next/static, cachebar,
   * enthalten keine Inhalte ohne die Seite drumherum), Favicon- und
   * Icon-Dateien sowie die robots.txt (damit Crawler den Disallow aus
   * dem Vorlaunch-Schutz weiterhin lesen koennen).
   *
   * Die Bild-Optimierung (_next/image) laeuft BEWUSST durch den Schutz:
   * Ihre URLs tragen keinen Inhalts-Hash, ein CDN wuerde bei einer
   * Ausnahme also auch veraltete oder fehlerhafte Antworten dauerhaft
   * aufheben (genau so blieben frueher gecachte Fehlbilder nach dem
   * Nachlegen der Makler-Fotos sichtbar). Der Browser sendet die
   * Anmeldung bei Bild-Anfragen automatisch mit; ohne Schutz bleibt
   * alles wie gehabt.
   *
   * images/ (Dateien aus public/images) MUSS ausgenommen sein: Der
   * Optimizer holt lokale Quellbilder ueber eine interne Anfrage an die
   * eigene Adresse. Ohne Ausnahme bekommt er die 401-Textseite statt
   * des Bildes und antwortet mit "isn't a valid image", die Fotos
   * bleiben leer. Die Dateien dort sind unkritisch (Portraets und Logo
   * des Makler-Partners, ohnehin oeffentlich).
   *
   * marke/ (Dateien aus public/marke) MUSS ebenfalls ausgenommen sein:
   * Die Wortmarke im Kopf jeder E-Mail wird vom Mail-Programm des
   * EMPFAENGERS geladen, und das kennt weder Passwort noch Freigabe-
   * Cookie. Ohne die Ausnahme bekommt es die 401-Abfrage statt des
   * Bildes und zeigt nur den Ersatztext. Die Dateien sind unkritisch
   * (unsere eigene Wortmarke und das Signet, ohnehin oeffentlich) und
   * verraten nichts ueber den Inhalt der Seite. Nach dem Launch ist die
   * Ausnahme wirkungslos, weil dann der ganze Schutz entfaellt; sie
   * darf trotzdem stehen bleiben.
   *
   * api/auftrag MUSS ausgenommen sein: Der Zeitplan ruft die Route von
   * aussen auf (Supabase pg_cron), und eine Schaltuhr kann sich nicht
   * an einem Anmeldefenster vorbeitippen. Ohne die Ausnahme bekommt
   * sie bis zum Launch alle 15 Minuten eine 401-Abfrage, und keine
   * einzige zeitgebundene Mail geht raus. Gefunden am 08.08.2026, beim
   * Einrichten des Zeitplans.
   *
   * Das ist unbedenklich, weil die Route ihren EIGENEN Schutz hat: Ohne
   * den richtigen Wert in x-api-key (AUFTRAG_API_KEY) antwortet sie mit
   * 401, und ohne gesetzte Variable ist sie ganz aus. Sie gibt nichts
   * preis und zeigt keinen Inhalt der Seite. Auf der App-Instanz wird
   * AUFTRAG_API_KEY bewusst nicht gesetzt (config/variablen.ts), dort
   * ist die Route damit dauerhaft aus.
   *
   * Dasselbe gilt sinngemaess fuer /api/n8n/antwort, sobald n8n
   * eingerichtet wird. Die Ausnahme fehlt dort noch, weil die
   * Anbindung noch nicht steht; wer sie einrichtet, muss sie hier
   * ergaenzen, sonst sucht er lange.
   *
   * api/stripe MUSS ausgenommen sein: Stripe stellt die Zahlungs-
   * Rueckmeldungen (Webhook) von aussen zu und kann sich an keinem
   * Anmeldefenster vorbeitippen. Ohne die Ausnahme erfaehrt das System
   * hinter dem Vorlaunch-Passwortschutz von keiner einzigen Zahlung.
   * Unbedenklich, weil die Route ihren EIGENEN Schutz hat: Die
   * Signaturpruefung (STRIPE_WEBHOOK_SECRET) weist alles ab, was nicht
   * nachweislich von Stripe kommt, und die Route gibt nichts preis.
   * Auf der App-Instanz fehlt das Geheimnis bewusst, dort ist die
   * Route aus.
   *
   * api/foto-ki MUSS aus demselben Grund ausgenommen sein: Autoenhance
   * stellt die Rueckrufe zur Bildverbesserung von aussen zu (webhook_
   * updated, image_processed) und wuerde am Passwortschutz mit 401
   * abprallen; dann hinge jedes Bild auf "wird verbessert", bis der
   * Nachfasser es holt, und die Kopfzeilen-Messung der Beglaubigung
   * kaeme nie an. Unbedenklich, weil die Route ihre EIGENE Beglaubigung
   * prueft (FOTO_KI_WEBHOOK_GEHEIMNIS, ohne den Wert ist sie ganz aus)
   * und nichts preisgibt. Auf der App-Instanz fehlt das Geheimnis
   * bewusst, dort ist die Route aus.
   */
  matcher: [
    "/((?!_next/static|images/|marke/|api/auftrag|api/stripe|api/foto-ki|favicon\\.ico|icon\\.svg|apple-icon|robots\\.txt).*)",
  ],
};
