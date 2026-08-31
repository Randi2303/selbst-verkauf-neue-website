/**
 * Eigener E-Mail-Versand ueber Resend, selbst-aktivierend.
 *
 * NUR SERVER-SEITIG VERWENDEN. Die Zugangsdaten sind
 * Server-Geheimnisse ohne NEXT_PUBLIC-Praefix:
 *   RESEND_API_KEY   API-Schluessel aus dem Resend-Dashboard
 *   MAIL_FROM        Absenderadresse der Anmelde-Mails
 *
 * Warum MAIL_FROM und nicht MAIL_ABSENDER: Der Name MAIL_ABSENDER
 * liess sich bei Hostinger nicht speichern (die Aenderung blieb
 * ungespeichert und verschwand nach dem Anwenden), unter MAIL_FROM
 * klappt es. MAIL_ABSENDER wird weiterhin gelesen, damit bestehende
 * lokale Konfigurationen nicht brechen; MAIL_FROM hat Vorrang.
 *
 * Ohne diese Werte bleibt der bisherige Versand ueber Supabase aktiv
 * (Einladungen, Passwort-Links), mit ihnen laufen die eigenen
 * HTML-Vorlagen aus lib/mail-vorlagen.ts ueber die eigene
 * Absenderadresse. Warum Resend: schlanke HTTP-Schnittstelle ohne
 * zusaetzliche Abhaengigkeit, sofort nutzbarer Testbetrieb und ein
 * kostenfreies Kontingent, das fuer den Piloten reicht; Postmark
 * verlangt vor dem Versand eine manuelle Freigabe des Kontos.
 *
 * WICHTIG: Die Absenderadresse funktioniert erst, wenn die Domain bei
 * Resend verifiziert ist (SPF- und DKIM-Eintraege beim Hoster setzen,
 * siehe README Abschnitt "Eigener E-Mail-Versand").
 */
import { mailVermerken } from "@/lib/mail-protokoll";
import { istVorfuehrkonto } from "@/lib/vorfuehrkonto";
import { siteConfig } from "@/site.config";
import { basisAdresse } from "@/lib/basis-adresse";

/**
 * Sieht der Text wie eine brauchbare Adresse aus? Bewusst grosszuegig
 * (die endgueltige Pruefung macht Resend), aber streng genug, um einen
 * offensichtlich kaputten Wert zu erkennen.
 */
function istAdresse(text: string): boolean {
  return /^[^\s<>@,]+@[^\s<>@,]+\.[^\s<>@,]{2,}$/.test(text);
}

/**
 * Endet die Adresse auf .invalid?
 *
 * Die Endung ist per RFC 2606 fuer Unzustellbares reserviert: Kein DNS
 * loest sie auf, dort kann per Definition niemand etwas empfangen.
 * Unsere Pruefkonten liegen absichtlich genau dort (@pruef.invalid).
 * Solche Mails werden in sendeMail vollstaendig vermerkt und NICHT an
 * Resend gegeben. Ein Versuch waere ein sicherer Ruecklaeufer, der
 * trotzdem das geteilte Tageskontingent verbraucht; der Prueflauf der
 * Bau-Runde 6 hat es genau so an einem Vormittag geleert, und echte
 * Zeitplan-Mails scheiterten danach.
 */
export function istUnzustellbar(adresse: string): boolean {
  return /\.invalid$/i.test(adresse.trim());
}

/**
 * Liegt die Adresse auf der Vorfuehr-Interessenten-Domain?
 *
 * Die erfundenen Interessenten des Vorfuehrkontos wohnen alle auf
 * dieser Unterdomain unserer eigenen Domain (scripts/vorfuehrkonto.mjs).
 * Niemand empfaengt dort. Der Vorfuehr-Riegel weiter unten greift am
 * EIGENTUEMER des Vorgangs; dieses Netz hier greift an der ADRESSE
 * und faengt damit auch den Fall, in dem ein Weg den Vorgang einem
 * falschen oder gar keinem Eigentuemer zuordnet (Auftrag des
 * Inhabers, 24.08.2026: Der Riegel darf nicht an der Disziplin der
 * Aufrufer haengen).
 */
export function istVorfuehrAdresse(adresse: string): boolean {
  return /@vorfuehrung\.selbst-verkauf\.de$/i.test(adresse.trim());
}

/**
 * WORAN HAENGT ES, OB POST HINAUSGEHT: an der Basis-Adresse.
 *
 * WOZU (Auftrag des Inhabers, 21.08.2026): Bis hierher schuetzten
 * zwei Riegel, und beide sahen auf etwas anderes. Der eine prueft die
 * ADRESSE (.invalid), der andere das KONTO (Vorfuehrkonto). Der
 * Zeitplan schreibt aber an unsere eigenen Team-Adressen, und die
 * sind weder das eine noch das andere. Am 20.08.2026 ging deshalb
 * beim blossen Zuruecksetzen des Vorfuehrkontos eine echte
 * Erinnerung an eine Team-Adresse hinaus.
 *
 * WARUM DIE BASIS-ADRESSE UND NICHT NODE_ENV: Ein erster Bau haengte
 * die Entscheidung an NODE_ENV. Das war die falsche Wahl, und der
 * Inhaber hat den Grund benannt: Faellt diese Erkennung auf dem
 * Server anders aus als hier, verschickt die Plattform im Betrieb
 * ueberhaupt nichts mehr, und niemand merkt es, weil ein vermerkter
 * Versand genauso aussieht wie ein gelungener. NODE_ENV setzt die
 * Plattform, wir sehen es nicht und pruefen es nirgends.
 *
 * Die Basis-Adresse dagegen setzen WIR: SITE_URL, ersatzweise
 * siteConfig.domain (basisAdresse, siehe lib/basis-adresse.ts). Ihr
 * Falschstand faellt sofort auf anderem Weg auf: Aus ihr kommen die
 * Links in JEDER Mail. Eine Mail, deren Links auf localhost zeigen,
 * darf ohnehin nicht hinausgehen. Damit ist die Entscheidung an etwas
 * gehaengt, das nicht still falsch stehen kann.
 *
 * RICHTIGSTELLUNG (Befund des Inhabers, 24.08.2026): Bis zum
 * Umzugsabend war SITE_URL bei Hostinger NIE gesetzt, der fruehere
 * Satz "sie steht ohnehin in den Hostinger-Einstellungen" stimmte
 * nicht. Der Riegel hing damit faktisch an siteConfig.domain aus der
 * Ablage, was ihn nicht schwaechte: Auch dieser Wert ist von uns
 * gesetzt und kann nicht still falsch stehen. Seit dem Umzugsabend
 * ist SITE_URL auf beiden Anwendungen gesetzt (config/variablen.ts
 * fuehrt sie als Pflicht), mit demselben Wert, den die Ablage traegt;
 * am Verhalten hat sich dadurch nichts geaendert.
 *
 * MAIL_NUR_VERMERKEN uebersteuert in beide Richtungen:
 *   "an"  nichts geht hinaus, auch aus dem Betrieb nicht
 *   "aus" normaler Versand, auch von einem Entwicklungs-Rechner
 * Der zweite Fall ist der bewusste Sende-Nachweis am Tagesende.
 */
export type MailVersandLage = {
  /** Geht aus dieser Umgebung wirklich Post hinaus? */
  sendet: boolean;
  /** Ein Satz, der es erklaert. Steht im Admin und im Protokoll. */
  grund: string;
  /** Steht die Entscheidung ausdruecklich in MAIL_NUR_VERMERKEN? */
  ausdruecklich: boolean;
  /**
   * Sieht diese Umgebung nach Betrieb aus (echte Basis-Adresse)?
   * Wird sie es und sendet trotzdem nicht, ist das KEIN stiller
   * Vorgang: Der Vermerk gilt dann als Befund und landet als Aufgabe
   * beim Team.
   */
  wirktWieBetrieb: boolean;
};

export function mailVersandLage(): MailVersandLage {
  const basis = basisAdresse();
  const wirktWieBetrieb = Boolean(
    basis && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(basis)
  );
  const schalter = (process.env.MAIL_NUR_VERMERKEN ?? "").trim().toLowerCase();

  if (schalter === "an") {
    return {
      sendet: false,
      grund: "MAIL_NUR_VERMERKEN steht auf an: Es geht mit Absicht nichts hinaus.",
      ausdruecklich: true,
      wirktWieBetrieb,
    };
  }
  if (schalter === "aus") {
    return {
      sendet: true,
      grund: "MAIL_NUR_VERMERKEN steht auf aus: Es geht mit Absicht Post hinaus.",
      ausdruecklich: true,
      wirktWieBetrieb,
    };
  }
  if (wirktWieBetrieb) {
    return {
      sendet: true,
      grund: `Betrieb: Die Basis-Adresse (SITE_URL, ersatzweise die Ablage) zeigt auf ${basis}, Post geht hinaus.`,
      ausdruecklich: false,
      wirktWieBetrieb,
    };
  }
  return {
    sendet: false,
    grund: basis
      ? `Pruefbetrieb: Die Basis-Adresse zeigt auf ${basis}, also nicht auf die echte Adresse. Es geht nichts hinaus.`
      : "Pruefbetrieb: Es gibt keine brauchbare Basis-Adresse (SITE_URL oder Ablage). Es geht nichts hinaus.",
    ausdruecklich: false,
    wirktWieBetrieb,
  };
}

/** Kurzform fuer den Riegel im Versand */
export function mailNurVermerken(): boolean {
  return !mailVersandLage().sendet;
}

/** Zuletzt gemeldeter Fehlwert, damit das Log nicht bei jeder Mail volllaeuft */
let zuletztGemeldet: string | null = null;

/**
 * Absender der Anmelde-Mails aus der Umgebung, gesaeubert und in die
 * vollstaendige Form gebracht. null bedeutet: nicht gesetzt oder
 * unbrauchbar, dann bleibt der Versand ueber Supabase aktiv.
 *
 * Beim Hoster ist nicht sicher, ob Leerzeichen und spitze Klammern
 * unveraendert gespeichert werden. Deshalb werden drei Schreibweisen
 * akzeptiert:
 *   selbst-verkauf.de <noreply@selbst-verkauf.de>   unveraendert
 *   noreply@selbst-verkauf.de                       Anzeigename kommt dazu
 *   selbst-verkauf.de noreply@selbst-verkauf.de     Klammern gingen verloren
 * Der Anzeigename kommt in den letzten beiden Faellen aus
 * site.config.ts, damit im Postfach nie die nackte Adresse steht.
 */
export function anmeldeAbsender(): string | null {
  const roh = process.env.MAIL_FROM ?? process.env.MAIL_ABSENDER;
  if (!roh) return null;

  // Rand-Leerzeichen weg, danach Anfuehrungszeichen abstreifen, die den
  // GANZEN Wert umschliessen (die zulaessigen Anfuehrungszeichen um
  // einen Anzeigenamen bleiben dabei erhalten, weil der Wert dann auf
  // ">" endet und die Bedingung nicht zutrifft)
  let wert = roh.trim();
  while (wert.length >= 2 && /^(["'])[\s\S]*\1$/.test(wert)) {
    wert = wert.slice(1, -1).trim();
  }

  const melden = (grund: string): null => {
    if (zuletztGemeldet !== roh) {
      zuletztGemeldet = roh;
      console.error(
        `[mail] MAIL_FROM ist unbrauchbar (${grund}): ${JSON.stringify(roh)}. ` +
          `Erwartet wird "${siteConfig.mailAbsender.name} <${siteConfig.mailAbsender.noreply}>" ` +
          `oder nur "${siteConfig.mailAbsender.noreply}". ` +
          `Solange der Wert falsch ist, verschickt Supabase die Anmelde-Mails.`
      );
    }
    return null;
  };

  if (!wert) return melden("leer");

  // Vollstaendige Form mit spitzen Klammern
  const mitKlammern = /^(.*)<([^<>]*)>\s*$/.exec(wert);
  if (mitKlammern) {
    const adresse = mitKlammern[2].trim();
    if (!istAdresse(adresse)) return melden("Adresse in den Klammern");
    const name = mitKlammern[1].trim().replace(/^["']|["']$/g, "").trim();
    return name ? wert : `${siteConfig.mailAbsender.name} <${adresse}>`;
  }

  // Nur die Adresse
  if (istAdresse(wert)) {
    return `${siteConfig.mailAbsender.name} <${wert}>`;
  }

  // Name und Adresse durch Leerzeichen getrennt, die Klammern sind
  // beim Speichern verloren gegangen
  const teile = wert.split(/\s+/);
  const adresse = teile[teile.length - 1];
  if (teile.length > 1 && istAdresse(adresse)) {
    const name = teile.slice(0, -1).join(" ").replace(/^["']|["']$/g, "").trim();
    return `${name || siteConfig.mailAbsender.name} <${adresse}>`;
  }

  return melden("keine gueltige Adresse enthalten");
}

export function mailKonfiguriert(): boolean {
  return Boolean(process.env.RESEND_API_KEY) && anmeldeAbsender() !== null;
}

/**
 * Nimmt die objektbezogene Schutz-Adresse (objekte.anfragen_alias)
 * schon Post an?
 *
 * SELBSTAKTIVIEREND wie die uebrigen Anbindungen: Der Code ist fertig,
 * er wartet nur auf ANFRAGEN_INBOUND=an. Bis dahin geht die Nachricht
 * an einen Interessenten zwar bereits ueber die Schutz-Adresse raus,
 * seine ANTWORT wird aber an den Verkaeufer selbst zugestellt, sonst
 * liefe sie ins Leere. Das Konto sagt genau das auch, statt es zu
 * verschweigen.
 *
 * Sobald der Empfang steht, entfaellt die Rueckfallebene von allein,
 * ohne dass an dieser Stelle etwas umgebaut werden muss.
 */
export function anfragenEmpfangSteht(): boolean {
  return process.env.ANFRAGEN_INBOUND === "an";
}

/*
 * linkBasis(request) ist am 08.08.2026 ENTFALLEN.
 *
 * Sie las den Host aus der eingehenden Anfrage und lieferte hinter dem
 * Proxy des Hosters die interne Adresse. In einer Einladungsmail stand
 * daraufhin https://0.0.0.0:3000, und kein neuer Kunde kam an seinen
 * Zugang. Eine Anfrage sagt, wie jemand ZU UNS gekommen ist, nicht,
 * unter welcher Adresse wir fuer die Welt erreichbar sind.
 *
 * Ersatz: basisAdresse() in lib/basis-adresse.ts, ausschliesslich aus
 * der Konfiguration und mit Pruefung. Diesen Hinweis bitte stehen
 * lassen, damit niemand die alte Loesung wieder einbaut.
 */

/**
 * Absender je Art der Mail.
 *
 * "anmeldung" nutzt die noreply-Adresse (Einladung, Passwort,
 * Bestätigung, Sicherheits-Hinweise), "benachrichtigung" die
 * antwortbare Team-Adresse (Bewertung, Termine, Antworten,
 * Fehlermeldungen). Beide Adressen stehen in site.config.ts.
 *
 * Nur die Anmelde-Adresse kommt aus der Umgebung (MAIL_FROM), weil sie
 * zur bei Resend verifizierten Domain passen muss. Die antwortbare
 * Team-Adresse steht fest in site.config.ts.
 */
export type MailArt = "anmeldung" | "benachrichtigung";

/**
 * Die Domains, unter denen wir schreiben duerfen.
 *
 * ---------------------------------------------------------------------
 * ABGELEITET, NICHT VON HAND GEPFLEGT
 * ---------------------------------------------------------------------
 * Sie entstehen aus dem, was ohnehin feststeht: der eigenen Adresse
 * (siteConfig.domain), den beiden festen Absendern und der
 * Anmelde-Adresse aus MAIL_FROM, die zur bei Resend verifizierten
 * Domain passen muss. Eine getrennte Liste liefe auseinander, sobald
 * jemand eine davon aendert.
 *
 * UNTERDOMAINS SIND MIT DABEI (app.selbst-verkauf.de und was noch
 * kommt): geprueft wird auf Gleichheit ODER auf ".domain" am Ende.
 */
export function erlaubteAbsenderDomains(): string[] {
  const domains = new Set<string>();
  const nimm = (wert: string | null | undefined) => {
    const adresse = wert?.includes("<") ? wert.split("<")[1]?.split(">")[0] : wert;
    const d = adresse?.split("@")[1]?.trim().toLowerCase();
    if (d) domains.add(d);
  };
  try {
    nimm(`x@${new URL(siteConfig.domain).hostname}`);
  } catch {
    // wirkung: gewollt, eine unbrauchbare siteConfig.domain darf den Versand nicht umwerfen: die beiden festen Absender tragen die Liste, und ein leerer Eintrag wuerde hier nur die Liste verkuerzen, nie erweitern
  }
  nimm(siteConfig.mailAbsender.noreply);
  nimm(siteConfig.mailAbsender.antwort);
  nimm(anmeldeAbsender());
  return [...domains];
}

/**
 * Darf unter diesem Absender geschrieben werden?
 *
 * ---------------------------------------------------------------------
 * DER ANLASS (Auftrag des Inhabers, 30.08.2026, Runde 46)
 * ---------------------------------------------------------------------
 * "Ein Absender ausserhalb unserer eigenen Domains wird abgewiesen,
 *  nicht stillschweigend verschickt. Heute haelt der Trigger, aber er
 *  ist der einzige, und der naechste Weg, der einen Absender mitgibt,
 *  umgeht ihn ohne dass es jemand merkt."
 *
 * Der einzige Absender, der heute nicht fest im Kode steht, ist die
 * Schutz-Adresse eines Objekts (objekte.anfragen_alias). Sie vergibt
 * der Server, ein Kunde kann sie nicht setzen; gemessen am 30.08.2026.
 * Dieser Riegel ist die zweite Schicht darunter: Er fragt nicht, WOHER
 * ein Absender kommt, sondern nur, ob er zu uns gehoert.
 */
export function absenderErlaubt(von: string | null | undefined): boolean {
  if (!von) return true;
  const adresse = (von.includes("<") ? von.split("<")[1]?.split(">")[0] : von) ?? "";
  const domain = adresse.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  return erlaubteAbsenderDomains().some(
    (erlaubt) => domain === erlaubt || domain.endsWith(`.${erlaubt}`)
  );
}

function absenderFuer(art: MailArt): string {
  const { name, noreply, antwort } = siteConfig.mailAbsender;
  if (art === "anmeldung") {
    return anmeldeAbsender() ?? `${name} <${noreply}>`;
  }
  return `${name} <${antwort}>`;
}

/**
 * Eine E-Mail ueber die Resend-HTTP-Schnittstelle senden.
 * Liefert true bei Erfolg; Fehler landen im Server-Log und als false
 * beim Aufrufer, der dann eine ehrliche Meldung zeigen kann.
 *
 * JEDER VERSUCH WIRD PROTOKOLLIERT, und zwar HIER und nicht an den
 * ueber zwanzig Aufrufstellen. Das ist der ganze Sinn der Sache: Eine
 * Stelle, die man vergessen kann, wird irgendwann vergessen. So ist
 * jede Mail der App erfasst, auch jede kuenftige, ohne dass jemand
 * daran denken muss.
 *
 * KEINE AUTOMATISCHE WIEDERHOLUNG, und das ist eine Entscheidung:
 *
 * 1. Bei einer Zeitueberschreitung wissen wir nicht, ob die Mail
 *    draussen ist oder nicht. Ein zweiter Versuch riskiert also eine
 *    doppelte Mail, um eine vielleicht gar nicht fehlende zu ersetzen.
 * 2. Die Fehler, die tatsaechlich auftreten, sind Konfigurationsfehler:
 *    fehlender Schluessel, nicht verifizierte Domain, abgelehnte
 *    Absenderadresse. Kein Wiederholen der Welt behebt die.
 * 3. Bei den zeitgebundenen Mails waere ein spaeter Nachzuegler
 *    schaedlich. Eine Erinnerung an einen Termin, die nach dem Termin
 *    ankommt, ist schlechter als gar keine.
 *
 * Stattdessen ist jeder Fehlschlag im Protokoll sichtbar, mit Grund,
 * und laesst sich dort erkennen statt im Server-Log zu versanden.
 *
 * EINE AUSNAHME KENNT DAS HAUS SEIT BAU-RUNDE 8: Das
 * Erinnerungsverfahren (lib/wartet-lauf.ts) wiederholt eine
 * Erinnerung, wenn SICHER ist, dass nichts hinausging. Dafuer braucht
 * es mehr als true/false, naemlich die Unterscheidung unten in
 * MailBefund. sendeMail bleibt fuer alle uebrigen Aufrufer die
 * einfache Antwort.
 */

/** Was aus einem Sendeversuch wurde, fuer Aufrufer, die es genau brauchen */
export type MailBefund = {
  verschickt: boolean;
  /**
   * true, wenn SICHER ist, dass nichts hinausging: Der Dienst hat mit
   * einem Fehler-Status geantwortet, oder der Versuch wurde vor dem
   * Aufruf angehalten (.invalid, Vorfuehrkonto, kein Schluessel).
   * false bei einer Zeitueberschreitung oder einem Netzfehler: Dort
   * wissen wir NICHT, ob die Mail draussen ist, und eine Wiederholung
   * riskierte eine doppelte.
   */
  sicherNichtVerschickt: boolean;
  /**
   * true bei den gewollten Absagen (.invalid, Vorfuehrkonto, kein
   * Schluessel eingerichtet): kein Fehler, keine Wiederholung.
   */
  gewollt: boolean;
};

export async function sendeMail(
  eingaben: Parameters<typeof sendeMailMitBefund>[0]
): Promise<boolean> {
  return (await sendeMailMitBefund(eingaben)).verschickt;
}

export async function sendeMailMitBefund({
  an,
  weitere,
  betreff,
  html,
  text,
  art = "anmeldung",
  von,
  antwortAn,
  anhaenge,
  vorlage = "unbenannt",
  userId,
  ohneEigentuemer,
}: {
  an: string;
  /**
   * Weitere Empfaenger DERSELBEN Mail, heute nur fuer die Sammel-Mail
   * an das Team (lib/wartet-lauf.ts). Ein Aufruf mit mehreren
   * Empfaengern ist bei Resend EINE Mail und zaehlt einmal auf das
   * geteilte Tageskontingent; getrennte Aufrufe zaehlen je einzeln.
   * Fuer alles andere gilt weiterhin: eine Mail, ein Empfaenger.
   */
  weitere?: string[];
  betreff: string;
  html: string;
  text: string;
  /** Steuert die Absenderadresse, siehe MailArt */
  art?: MailArt;
  /**
   * Absenderadresse, die "art" ueberschreibt. Genau ein Fall braucht
   * das: die Nachricht des Verkaeufers an einen Interessenten, die
   * ueber die objektbezogene Schutz-Adresse rausgeht statt ueber eine
   * unserer festen Adressen. Die Adresse MUSS auf der bei Resend
   * verifizierten Domain liegen, sonst weist Resend sie ab.
   */
  von?: string | null;
  /**
   * Wohin eine Antwort geht, wenn nicht an den Absender. Ebenfalls fuer
   * die Nachricht an den Interessenten: Solange der Empfang auf der
   * Schutz-Adresse noch nicht steht, muss die Antwort den Verkaeufer
   * erreichen, sonst laeuft sie ins Leere.
   */
  antwortAn?: string | null;
  /**
   * Dateianhaenge: Kalenderdatei zu einem bestaetigten Termin und die
   * Rechnungs-PDF. Textinhalte kommen als "inhalt" und werden hier nach
   * Base64 gewandelt (der Aufrufer soll sich nicht mit der Kodierung
   * befassen muessen); Binaerinhalte wie die PDF kommen bereits als
   * Base64 in "inhaltBase64".
   */
  anhaenge?: { dateiname: string; inhalt?: string; inhaltBase64?: string }[];
  /**
   * Kennung fuer das Protokoll, moeglichst die aus lib/mail-katalog.ts.
   * Ohne Angabe steht dort "unbenannt", was beim Nachsehen sofort
   * auffaellt und zum Nachtragen auffordert.
   */
  vorlage?: string;
  /**
   * Wem der VORGANG gehoert, aus dem diese Mail entsteht. Seit dem
   * 24.08.2026 nicht mehr nur fuers Protokoll: Der Vorfuehr-Riegel
   * unten haengt daran, und OHNE EIGENTUEMER WIRD NICHT VERSCHICKT,
   * nur vermerkt. Eigentuemer ist der Kunde, um dessen Sache es geht,
   * nicht der Empfaenger: Bei einer Mail an einen Bieter ist es der
   * Verkaeufer des Verfahrens, bei einer Team-Mahnung der Kunde, um
   * den gemahnt wird. Nur so faengt der Riegel auch Post an Dritte
   * einer Vorfuehrung ab, etwa den begleitenden Makler samt
   * Vertretung.
   */
  userId?: string | null;
  /**
   * Die ausdrueckliche Ausnahme fuer Mails, die WIRKLICH keinen
   * Vorgangs-Eigentuemer haben. Der Grund landet im Protokoll. Wer
   * hier etwas eintraegt, uebernimmt die Aussage, dass diese Mail nie
   * zu einer Vorfuehrung gehoeren kann. Die Bau-Pruefung
   * (scripts/mail-eigentuemer-pruefen.mts) verlangt an jedem Aufruf
   * eine der beiden Angaben.
   */
  ohneEigentuemer?: { grund: string };
}): Promise<MailBefund> {
  const gewollteAbsage: MailBefund = {
    verschickt: false,
    sicherNichtVerschickt: true,
    gewollt: true,
  };
  /* ADRESSEN AUF .invalid GEHEN NIE AN RESEND (Auftrag vom 17.08.2026).
     Die Endung ist fuer Unzustellbares reserviert, siehe
     istUnzustellbar. Behandelt WIE DAS VORFUEHRKONTO: vollstaendig
     vermerkt, nicht verschickt. Der Versand-Beleg bleibt damit
     erhalten, das Kontingent bleibt unberuehrt.

     Die Pruefung steht VOR der Frage nach dem Schluessel, damit der
     Beleg auf jedem Rechner gleich aussieht: Ob ein Schluessel da ist,
     aendert nichts daran, dass diese Adresse nie empfangen kann.

     Bei einer Sammel-Mail werden nur die unzustellbaren Empfaenger
     aussortiert und vermerkt; an die uebrigen geht die Mail normal
     hinaus. */
  /* DER ABSENDER-RIEGEL STEHT GANZ VORN (Runde 46, 30.08.2026).
     Ein Absender ausserhalb unserer Domains geht NICHT hinaus, und er
     geht auch nicht still verloren: Er wird als Fehlschlag vermerkt,
     mit Grund, damit er im Versandprotokoll auffaellt. Das ist der
     Unterschied zu den drei Riegeln darunter, die gewollte Absagen
     sind.

     Heute kann ihn niemand ausloesen: Der einzige nicht fest
     verdrahtete Absender ist die Schutz-Adresse, die der Server
     vergibt. Der Riegel ist fuer den naechsten Weg da, der einen
     Absender mitgibt. */
  if (!absenderErlaubt(von)) {
    await mailVermerken({
      vorlage,
      empfaenger: [an, ...(weitere ?? [])].join(", "),
      betreff,
      erfolg: false,
      grund: `Absender "${von}" liegt ausserhalb unserer Domains (${erlaubteAbsenderDomains().join(", ")}): nicht verschickt`,
      userId,
    });
    console.error(
      `[mail] Absender abgewiesen: "${von}" gehoert zu keiner unserer Domains.`
    );
    return { verschickt: false, sicherNichtVerschickt: true, gewollt: false };
  }

  const alleEmpfaenger = [an, ...(weitere ?? [])];

  /* DER PRUEFBETRIEB-RIEGEL STEHT VOR ALLEN ANDEREN und deckt JEDE
     Adresse, auch unsere eigenen. Die beiden Riegel darunter sehen
     nur auf die Adresse beziehungsweise auf das Konto und lassen
     Team-Adressen durch; genau dort ist am 20.08.2026 eine Mail
     hinausgegangen. Vermerkt wird wie ueberall, damit der Beleg
     erhalten bleibt und in der Vorfuehrung sichtbar ist, was
     hinausgegangen WAERE. */
  const lage = mailVersandLage();
  if (!lage.sendet) {
    /* GEWOLLT NUR, WENN ES NICHT NACH BETRIEB AUSSIEHT. Vermerkt eine
       Umgebung mit echter Basis-Adresse, ist das entweder eine
       ausdrueckliche Ansage oder ein Fehlstand, und beides darf nicht
       still bleiben: gewollt=false macht daraus eine Aufgabe fuer das
       Team, sichtbar in /admin/meldungen. Genau daran fehlte es, als
       am 20.08. eine Mail hinausging, ohne dass es jemand bemerkte;
       hier ist es der umgekehrte Fall und ebenso still. */
    await mailVermerken({
      vorlage,
      empfaenger: alleEmpfaenger.join(", "),
      betreff,
      erfolg: false,
      grund: lage.grund,
      userId,
      gewollt: !lage.wirktWieBetrieb,
    });
    return gewollteAbsage;
  }

  const unzustellbar = alleEmpfaenger.filter(istUnzustellbar);
  const nachInvalid = alleEmpfaenger.filter((a) => !istUnzustellbar(a));
  if (unzustellbar.length > 0) {
    await mailVermerken({
      vorlage,
      empfaenger: unzustellbar.join(", "),
      betreff,
      erfolg: false,
      grund: "Adresse auf .invalid: nicht verschickt, nur vermerkt",
      userId,
      // So gewollt, keine Aufgabe fuer das Team. Siehe gewollt oben.
      gewollt: true,
    });
    if (nachInvalid.length === 0) return gewollteAbsage;
  }

  /* ADRESSEN DER VORFUEHR-INTERESSENTEN GEHEN NIE AN RESEND, egal wem
     der Vorgang gehoert (Auftrag des Inhabers, 24.08.2026). Der
     Konto-Riegel weiter unten haengt am Eigentuemer des Vorgangs;
     dieses Netz greift an der Adresse selbst und haelt auch den Fall,
     dass ein Weg den Vorgang falsch zuordnet. Behandelt wie .invalid:
     vollstaendig vermerkt, Kontingent unberuehrt. */
  const vorfuehrAdressen = nachInvalid.filter(istVorfuehrAdresse);
  const zustellbar = nachInvalid.filter((a) => !istVorfuehrAdresse(a));
  if (vorfuehrAdressen.length > 0) {
    await mailVermerken({
      vorlage,
      empfaenger: vorfuehrAdressen.join(", "),
      betreff,
      erfolg: false,
      grund: "Vorfuehr-Interessenten-Adresse: nicht verschickt, nur vermerkt",
      userId,
      // Gewollt: Diese Adressen existieren nur fuer die Vorfuehrung.
      gewollt: true,
    });
    if (zustellbar.length === 0) return gewollteAbsage;
  }

  /* OHNE EIGENTUEMER WIRD NICHT VERSCHICKT (Auftrag des Inhabers,
     24.08.2026). Der Vorfuehr-Riegel unten prueft den Eigentuemer des
     Vorgangs. ACHT Aufrufstellen gaben keinen mit (eine erste
     Textsuche fand vier, sie war eine Untergrenze), und dort war der
     Riegel blind: Er hing an der Disziplin der Aufrufer, und wer die
     Kennung vergisst, umgeht ihn versehentlich. Deshalb ist die Regel
     umgedreht: Wer keinen Eigentuemer nennt und das nicht
     ausdruecklich begruendet, bekommt keinen Versand, sondern einen
     Vermerk als Aufgabe fuer das Team (gewollt: false). Die
     Bau-Pruefung scripts/mail-eigentuemer-pruefen.mts sorgt dafuer,
     dass so ein Aufruf gar nicht erst in den Bau kommt.

     Steht VOR der Schluessel-Frage, damit der Beleg auf jedem Rechner
     gleich aussieht: Ein fehlender Eigentuemer ist auf dem
     Entwicklungsrechner derselbe Baufehler wie im Betrieb. */
  if (!userId && !ohneEigentuemer?.grund) {
    await mailVermerken({
      vorlage,
      empfaenger: zustellbar.join(", "),
      betreff,
      erfolg: false,
      grund:
        "Kein Eigentuemer am Vorgang angegeben: zur Sicherheit nicht verschickt",
      userId,
      gewollt: false,
    });
    return { verschickt: false, sicherNichtVerschickt: true, gewollt: false };
  }

  if (!mailKonfiguriert()) {
    // Auch das kommt ins Protokoll. Sonst sieht ein Rechner ohne
    // Schluessel genauso aus wie einer, auf dem der Ausloeser fehlt,
    // und genau diese zwei Faelle wollten wir unterscheiden koennen.
    await mailVermerken({
      vorlage,
      empfaenger: zustellbar.join(", "),
      betreff,
      erfolg: false,
      grund: "Mail-Versand nicht eingerichtet (RESEND_API_KEY oder MAIL_FROM fehlt)",
      userId,
      // Kein Befund, sondern ein Rechner ohne Schluessel: siehe gewollt
      gewollt: true,
    });
    return gewollteAbsage;
  }

  /* AUS EINEM VORFUEHRKONTO GEHT NICHTS HINAUS. Seine Interessenten
     sind erfunden, und eine Mail an eine erfundene Adresse ist im
     besten Fall ein Rueckläufer und im schlechtesten ein fremdes
     Postfach, in dem plotzlich eine Besichtigungsbestaetigung liegt.

     SIE WIRD TROTZDEM VOLLSTAENDIG PROTOKOLLIERT. Damit laesst sich in
     der Vorfuehrung zeigen, dass und was hinausgegangen waere, und der
     Weg dorthin ist derselbe wie im Echtbetrieb: Wer hier etwas
     abschaltet, faellt beim naechsten Durchspielen auf. */
  if (await istVorfuehrkonto(userId)) {
    await mailVermerken({
      vorlage,
      empfaenger: zustellbar.join(", "),
      betreff,
      erfolg: false,
      grund: "Vorfuehrkonto: nicht verschickt, nur vermerkt",
      userId,
      // So gewollt, siehe oben. Keine Aufgabe fuer das Team.
      gewollt: true,
    });
    return gewollteAbsage;
  }

  try {
    const antwort = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: von ?? absenderFuer(art),
        to: zustellbar,
        subject: betreff,
        html,
        text,
        ...(antwortAn ? { reply_to: antwortAn } : {}),
        ...(anhaenge?.length
          ? {
              attachments: anhaenge.map((a) => ({
                filename: a.dateiname,
                content:
                  a.inhaltBase64 ?? Buffer.from(a.inhalt ?? "", "utf8").toString("base64"),
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!antwort.ok) {
      const meldung = (await antwort.text()).slice(0, 300);
      console.error("[mail] Versand fehlgeschlagen:", antwort.status, meldung);
      await mailVermerken({
        vorlage,
        empfaenger: zustellbar.join(", "),
        betreff,
        erfolg: false,
        grund: `Resend antwortete mit ${antwort.status}: ${meldung}`,
        userId,
      });
      /* Der Dienst HAT geantwortet, mit einem Fehler: Es ging sicher
         nichts hinaus. Genau dieser Fall darf wiederholt werden. */
      return { verschickt: false, sicherNichtVerschickt: true, gewollt: false };
    }
    /* DIE KENNUNG DER ANGENOMMENEN MAIL AUFHEBEN (24.08.2026):
       Resend antwortet mit einer id, und nur ueber sie laesst sich
       spaeter nachschlagen, was aus der Mail WURDE (zugestellt,
       Ruecklaeufer). Am 24.08. wurde eine Passwort-Mail angenommen
       und kam nie an; ohne Kennung war der weitere Weg nicht
       nachvollziehbar. Ein Fehler beim Lesen der Antwort aendert
       nichts am Erfolg: angenommen ist angenommen. */
    /* SEIT DEM 31.08.2026 IST DIE KENNUNG KEINE BEIGABE MEHR (dritte
       Auflage des Inhabers zu Weg A).

       HIER STAND: "wirkung: gewollt, die Kennung ist Beigabe, der
       Versand steht." Das war fuer den Versand richtig und fuer alles
       danach falsch: OHNE KENNUNG IST DIE MAIL AUF KEINEM WEG
       NACHSCHLAGBAR. Genau daran haengen die 18 Zeilen vor dem
       24.08.2026, darunter die Passwort-Mail, die den Anlass gab; sie
       lassen sich heute nicht mehr klaeren.

       AM VERSAND AENDERT SICH NICHTS: Er ist gelungen, und das bleibt
       so. Was sich aendert, ist, dass das Fehlen der Kennung nicht mehr
       schweigt. Es steht im Grund der Protokollzeile, und der
       Nachschlage-Lauf sieht die Zeile ohnehin nie (er sucht nach
       resend_id is not null). */
    let resendId: string | null = null;
    let kennungsHinweis: string | null = null;
    try {
      const koerper = (await antwort.json()) as { id?: string };
      resendId = typeof koerper.id === "string" ? koerper.id : null;
      if (!resendId) {
        kennungsHinweis =
          "Resend nannte keine Kennung; was aus dieser Mail wurde, laesst sich nicht nachschlagen.";
      }
    } catch (fehler) {
      /* `grund` IST HIER KEIN BELIEBIGER NAME: `wirkung:pruefen`
         erkennt die Behandlung eines Fehlers an wenigen Formen, und
         `grund =` ist eine davon. Sie hat diesen Block beanstandet, als
         er nur eine eigene Variable setzte, und sie hatte recht: Von
         aussen sieht ein unbekannter Name aus wie ein geschluckter
         Fehler. */
      const grund = (fehler as Error).message;
      kennungsHinweis =
        `Die Antwort von Resend war nicht lesbar (${grund}); ` +
        `ohne Kennung laesst sich nicht nachschlagen, was aus dieser Mail wurde.`;
    }
    if (kennungsHinweis) console.error("[mail]", kennungsHinweis);
    await mailVermerken({
      vorlage,
      empfaenger: zustellbar.join(", "),
      betreff,
      erfolg: true,
      userId,
      resendId,
      /* Der begruendete Verzicht auf einen Eigentuemer bleibt am
         Beleg sichtbar, sonst laesst sich spaeter nicht mehr sagen,
         warum diese Mail am Konto-Riegel vorbeidurfte. UND SEIT DEM
         31.08.2026 auch der Hinweis, wenn die Kennung fehlt: Sonst
         sieht die Zeile aus wie jede andere, und dass sich zu ihr nie
         etwas nachschlagen laesst, faellt niemandem auf. */
      ...(ohneEigentuemer || kennungsHinweis
        ? {
            grund: [
              ohneEigentuemer ? `Ohne Eigentuemer, begruendet: ${ohneEigentuemer.grund}` : null,
              kennungsHinweis,
            ]
              .filter(Boolean)
              .join(" "),
          }
        : {}),
    });
    return { verschickt: true, sicherNichtVerschickt: false, gewollt: false };
  } catch (fehler) {
    console.error("[mail] Versand fehlgeschlagen:", fehler);
    await mailVermerken({
      vorlage,
      empfaenger: zustellbar.join(", "),
      betreff,
      erfolg: false,
      // Zeitueberschreitung, DNS, abgebrochene Verbindung. Genau die
      // Faelle, in denen wir NICHT wissen, ob die Mail draussen ist.
      grund: fehler instanceof Error ? fehler.message : String(fehler),
      userId,
    });
    /* Zeitueberschreitung, DNS, abgebrochene Verbindung: Ob die Mail
       draussen ist, weiss niemand. Deshalb hier KEIN
       sicherNichtVerschickt, und damit keine Wiederholung. */
    return { verschickt: false, sicherNichtVerschickt: false, gewollt: false };
  }
}


