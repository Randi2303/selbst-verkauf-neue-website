/**
 * Gestaltete E-Mail-Vorlagen in unserer CI, verschickt ueber Resend:
 * Anmelde-Mails (Einladung, Passwort, Bestaetigung) und die
 * Benachrichtigungen aus dem Konto.
 *
 * Kopf, Fuss, Logo, Farben und der Dunkelmodus stehen in
 * lib/mail-rahmen.ts und gelten damit auch fuer die
 * Supabase-Rueckfallvorlagen unter docs/mail-vorlagen/. Diese Datei
 * enthaelt nur noch die Inhalte.
 */
import {
  absatz,
  betragsBlock,
  hinweiszeile,
  knopf,
  liste,
  rahmen,
  ersatzlink,
  schuetzeText,
  ueberschrift,
  zitat,
  zwischenueberschrift,
  type BetragsZeile,
} from "@/lib/mail-rahmen";
import {
  HINWEIS_FREIE_ENTSCHEIDUNG,
  HINWEIS_KEINE_BINDUNG,
} from "@/config/bieterverfahren";
import { schutzText } from "@/config/anfragen-schutz";
import { KUENDIGUNG_BLEIBT_HINWEIS } from "@/config/vertragstexte";
import { herkunftSatz } from "@/config/portale";
import { appBasis } from "@/lib/app-basis";
import { VERLAENGERUNG_ANKER } from "@/lib/laufzeit";
import { formatDatumZeit } from "@/lib/utils";
import { siteConfig } from "@/site.config";

export type MailInhalt = { betreff: string; html: string; text: string };

/**
 * Die Basis fuer JEDEN Link dieser Datei.
 *
 * Alle Links hier fuehren in den angemeldeten Bereich (/konto, /admin,
 * /login und die angemeldete Checklisten-Route), und der wohnt seit der
 * Unterdomain-Runde auf der App-Basis (lib/app-basis.ts). Ohne APP_URL
 * faellt das auf die oeffentliche Basis zurueck, also das Verhalten vor
 * der Runde. Wer hier je einen Link fuer DRITTE baut (Objektseite,
 * Einmal-Links), nimmt NICHT diese Funktion, sondern basisAdresse();
 * `npm run adressen:pruefen` wacht darueber.
 */
function kontoBasis(): string {
  return appBasis() ?? siteConfig.domain;
}

/** Einladung eines neuen Kunden: Zugang anlegen, Passwort selbst setzen */
export function einladungsMail({
  name,
  link,
}: {
  name: string | null;
  link: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const html = rahmen(
    [
      ueberschrift("Ihr Zugang zu selbst-verkauf.de"),
      absatz(anrede),
      absatz(
        "Ihr Konto bei selbst-verkauf.de ist angelegt. Mit einem Klick setzen Sie Ihr persönliches Passwort und starten direkt in Ihrem Bereich: Objekt erfassen, Markteinschätzung erhalten und den Verkauf Schritt für Schritt vorbereiten."
      ),
      knopf(link, "Passwort setzen und loslegen"),
      hinweiszeile(
        "Der Link ist einige Tage gültig und funktioniert nur für diese E-Mail-Adresse. Falls Sie kein Konto erwartet haben, können Sie diese Nachricht einfach ignorieren."
      ),
    ].join("\n"),
    "Ihr Konto ist angelegt, setzen Sie jetzt Ihr Passwort."
  );
  const text = `${anrede}\n\nIhr Konto bei selbst-verkauf.de ist angelegt. Setzen Sie Ihr persönliches Passwort über diesen Link:\n\n${link}\n\nDer Link ist einige Tage gültig und funktioniert nur für diese E-Mail-Adresse.\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: "Ihr Zugang zu selbst-verkauf.de", html, text };
}

/** Passwort zuruecksetzen, auch fuer erneut angeforderte Einladungen */
export function passwortMail({ link }: { link: string }): MailInhalt {
  const html = rahmen(
    [
      ueberschrift("Neues Passwort festlegen"),
      absatz("Guten Tag,"),
      absatz(
        "Sie haben einen Link zum Festlegen eines neuen Passworts angefordert. Mit einem Klick wählen Sie Ihr Passwort und sind direkt wieder in Ihrem Bereich."
      ),
      knopf(link, "Neues Passwort festlegen"),
      hinweiszeile(
        "Der Link ist aus Sicherheitsgründen nur kurz gültig und funktioniert nur für diese E-Mail-Adresse. Wenn Sie nichts angefordert haben, ignorieren Sie diese Nachricht, Ihr Passwort bleibt unverändert."
      ),
    ].join("\n"),
    "Ihr Link zum Festlegen eines neuen Passworts."
  );
  const text = `Guten Tag,\n\nSie haben einen Link zum Festlegen eines neuen Passworts angefordert:\n\n${link}\n\nDer Link ist nur kurz gültig. Wenn Sie nichts angefordert haben, ignorieren Sie diese Nachricht.\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: "Neues Passwort für selbst-verkauf.de", html, text };
}

/**
 * Teilmaskierte Adresse fuer Hinweis-Mails: genug zum Wiedererkennen,
 * zu wenig zum Abschreiben. "makler@beispiel.de" wird "ma…@beispiel.de".
 */
function maskierteAdresse(adresse: string): string {
  const [lokal, domain] = adresse.split("@");
  if (!domain) return adresse;
  return `${(lokal ?? "").slice(0, 2)}…@${domain}`;
}

/**
 * Bestaetigung eines E-Mail-Wechsels, geht an die NEUE Adresse
 * (24.08.2026). Erst der Klick vollzieht den Wechsel; genau dieser
 * Klick beweist, dass an der neuen Adresse wirklich jemand Post
 * empfaengt. Anlass war eine Makler-Adresse ohne Postannahme, die sich
 * nachtraeglich nicht aendern liess.
 */
export function emailWechselMail({
  kontoName,
  neueEmail,
  link,
}: {
  kontoName: string | null;
  neueEmail: string;
  link: string;
}): MailInhalt {
  const wessen = kontoName ? `das Konto von ${kontoName}` : "ein Konto";
  const html = rahmen(
    [
      ueberschrift("Neue Anmelde-Adresse bestätigen"),
      absatz("Guten Tag,"),
      absatz(
        `für ${wessen} bei selbst-verkauf.de soll diese E-Mail-Adresse (${neueEmail}) künftig die Anmelde-Adresse sein. Mit einem Klick bestätigen Sie den Wechsel. Bis dahin ändert sich nichts.`
      ),
      knopf(link, "Neue Adresse bestätigen"),
      hinweiszeile(
        "Der Link ist aus Sicherheitsgründen nur drei Tage gültig. Wenn Sie diesen Wechsel nicht erwarten, ignorieren Sie diese Nachricht, dann bleibt alles beim Alten."
      ),
    ].join("\n"),
    "Bestätigen Sie Ihre neue Anmelde-Adresse."
  );
  const text = `Guten Tag,\n\nfür ${wessen} bei selbst-verkauf.de soll diese E-Mail-Adresse (${neueEmail}) künftig die Anmelde-Adresse sein. Bestätigen Sie den Wechsel über diesen Link:\n\n${link}\n\nDer Link ist nur drei Tage gültig. Wenn Sie diesen Wechsel nicht erwarten, ignorieren Sie diese Nachricht, dann bleibt alles beim Alten.\n\nIhr Team von selbst-verkauf.de`;
  return {
    betreff: "Neue Anmelde-Adresse für selbst-verkauf.de bestätigen",
    html,
    text,
  };
}

/**
 * Sicherheits-Hinweis nach vollzogenem Wechsel, geht an die ALTE
 * Adresse. Sie erfaehrt, dass sie nicht mehr die Anmelde-Adresse ist;
 * wer das nicht veranlasst hat, soll sich sofort melden koennen. Die
 * neue Adresse steht nur teilmaskiert darin.
 */
export function emailWechselHinweisMail({
  neueEmail,
}: {
  neueEmail: string;
}): MailInhalt {
  const maskiert = maskierteAdresse(neueEmail);
  const html = rahmen(
    [
      ueberschrift("Ihre Anmelde-Adresse wurde geändert"),
      absatz("Guten Tag,"),
      absatz(
        `die Anmelde-Adresse Ihres Kontos bei selbst-verkauf.de wurde soeben auf ${maskiert} geändert. Diese Adresse hier empfängt dafür keine Konto-Post mehr.`
      ),
      hinweiszeile(
        `Wenn Sie oder Ihr Team das nicht veranlasst haben, antworten Sie bitte sofort auf diese Mail oder rufen Sie uns an: ${siteConfig.contact.phone}.`
      ),
    ].join("\n"),
    "Die Anmelde-Adresse Ihres Kontos wurde geändert."
  );
  const text = `Guten Tag,\n\ndie Anmelde-Adresse Ihres Kontos bei selbst-verkauf.de wurde soeben auf ${maskiert} geändert. Diese Adresse hier empfängt dafür keine Konto-Post mehr.\n\nWenn Sie oder Ihr Team das nicht veranlasst haben, antworten Sie bitte sofort auf diese Mail oder rufen Sie uns an: ${siteConfig.contact.phone}.\n\nIhr Team von selbst-verkauf.de`;
  return {
    betreff: "Ihre Anmelde-Adresse bei selbst-verkauf.de wurde geändert",
    html,
    text,
  };
}

/*
 * ENTFERNT am 08.08.2026: bestaetigungsMail, die Bestaetigung der
 * E-Mail-Adresse.
 *
 * Sie war gebaut, wurde aber von keiner Stelle im Code aufgerufen. Die
 * Bestaetigung einer Adresse loest Supabase aus, nicht unsere App, und
 * die zugehoerige Vorlage liegt im Supabase-Dashboard.
 *
 * Der Hinweis bleibt hier stehen, damit nicht in einem halben Jahr
 * jemand dieselbe Vorlage noch einmal baut, weil sie zu fehlen scheint.
 * Sollte die App die Bestaetigung eines Tages selbst uebernehmen, ist
 * das ein eigener Auftrag und beginnt bei der Umstellung in Supabase.
 */

/* ------------------------------------------------------------------ */
/* Benachrichtigungen aus dem Konto                                    */
/*                                                                     */
/* Diese Mails sind ANTWORTBAR (Absender hallo@, siehe lib/mail.ts):   */
/* Wer auf so eine Nachricht antwortet, landet im Team-Postfach. Der   */
/* Fuss enthaelt deshalb auch keinen "nicht antworten"-Satz, sondern   */
/* den Hinweis auf die Abschalt-Moeglichkeit in den Einstellungen.     */
/* ------------------------------------------------------------------ */

/** Fusszeile der Benachrichtigungen: Antwort erwuenscht, Abschalten moeglich */
function benachrichtigungsFuss(): string {
  return hinweiszeile(
    `Sie können auf diese E-Mail direkt antworten, Ihre Nachricht landet bei Ihrem Team. Wenn Sie solche Hinweise nicht mehr möchten, schalten Sie sie in Ihrem Konto unter <a href="${kontoBasis()}/konto/einstellungen" class="sv-petrol" style="color:${siteConfig.colors.primary};">Einstellungen</a> ab.`
  );
}

const FUSS_TEXT = `\n\nSie können auf diese E-Mail direkt antworten, Ihre Nachricht landet bei Ihrem Team.\nHinweise abschalten: ${kontoBasis()}/konto/einstellungen`;

/** Die Markteinschätzung liegt vor */
export function bewertungMail({
  name,
  spanne,
}: {
  name: string | null;
  spanne: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/bewertung`;
  const html = rahmen(
    [
      ueberschrift("Ihre Markteinschätzung liegt vor"),
      absatz(anrede),
      absatz(
        `Ihre Markteinschätzung ist fertig. Als Spanne ergibt sich ${spanne}. Im Konto sehen Sie, wie dieser Wert zustande kommt und was er für Ihren Angebotspreis bedeutet.`
      ),
      knopf(link, "Markteinschätzung ansehen"),
      benachrichtigungsFuss(),
    ].join("\n"),
    `Ihre Markteinschätzung: ${spanne}`,
    "antwortbar"
  );
  const text = `${anrede}\n\nIhre Markteinschätzung ist fertig. Als Spanne ergibt sich ${spanne}.\n\nMarkteinschätzung ansehen: ${link}${FUSS_TEXT}`;
  return { betreff: "Ihre Markteinschätzung liegt vor", html, text };
}

/**
 * IHR ANSPRECHPARTNER STEHT FEST, und ab heute wird abgebucht.
 *
 * =====================================================================
 * WARUM ES DIESE MAIL SEIT DEM 28.08.2026 GIBT
 * =====================================================================
 * Gemessen in Runde 35: Die Makler-Zuweisung
 * (app/api/admin/kunden/[id]/betreuer/route.ts) startet die Laufzeit
 * UND die Abrechnung (maklerAboStarten), und sie schickte dem Kunden
 * NICHTS. Kein sendeHinweis, keine Mail, nur ein Protokoll-Eintrag fuer
 * uns. Es ist der einzige Vorgang im Haus, bei dem ohne sein Zutun eine
 * wiederkehrende Abbuchung beginnt.
 *
 * Der Inhaber dazu: "Eine Meldung in der Glocke ist mir dafuer zu
 * leise." Die Glocke bekommt sie trotzdem (makler.zugewiesen), aber
 * die Mail ist der Beleg, der auch dann noch da ist, wenn er sich
 * wochenlang nicht anmeldet.
 *
 * =====================================================================
 * WAS DARINSTEHEN MUSS, und warum jeder Punkt
 * =====================================================================
 *   1. WER es ist, und wie er ihn erreicht. Das ist das Gekaufte.
 *   2. DASS ab heute die Laufzeit laeuft. Vorher zahlte er nichts.
 *   3. WAS monatlich abgebucht wird, und woher der Betrag kommt.
 *   4. WANN die erste Abbuchung kommt.
 *   5. WIE er kuendigt. DER WICHTIGSTE PUNKT: Eine Mail, die eine
 *      Zahlung ankuendigt und den Ausweg verschweigt, ist eine
 *      schlechte Mail. Monatlich kuendbar steht im Katalog; wer das
 *      liest, soll es auch tun koennen, ohne zu suchen.
 *
 * KEINE TELEFONNUMMER, und das ist keine Auslassung, sondern eine
 * geltende Entscheidung des Inhabers vom 24.08.2026: Kunden und
 * Interessenten sehen keine Durchwahl mehr, weder die des Maklers noch
 * die zentrale. Anlass war, dass die Karte ohne gespeicherte Durchwahl
 * still auf die Kopf-Nummer zurueckfiel und sie wie die persoenliche
 * beschriftete. Stattdessen nennt die Mail dieselben DREI WEGE wie die
 * Makler-Karte im Konto (components/konto/MaklerKarte.tsx).
 *
 * KEIN BENACHRICHTIGUNGS-FUSS, und das ist Absicht: Diese Mail geht
 * ueber sendeMail() und NICHT ueber sendeHinweis(). Wer die Hinweise
 * abbestellt hat, bekommt sie trotzdem. Eine beginnende Abbuchung ist
 * keine Benachrichtigung, die man abbestellen kann; sie steht deshalb
 * neben den anderen Pflicht-Mails (config/pflicht-mails.ts).
 */
export function maklerZugewiesenMail({
  name,
  maklerName,
  monatsbetrag,
  ersteAbbuchung,
}: {
  name: string | null;
  /** Vorname und Name des zugewiesenen Menschen */
  maklerName: string;
  /** Was monatlich abgebucht wird, bereits formatiert */
  monatsbetrag: string;
  /** Wann die erste Abbuchung kommt, bereits formatiert */
  ersteAbbuchung: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto`;
  const kuendigenLink = `${kontoBasis()}/konto/leistungen`;
  const kopf = "Ihr Ansprechpartner steht fest";
  const wer = `${maklerName} begleitet Sie ab jetzt durch Ihren Verkauf. Auf Ihrer Übersicht finden Sie drei Wege zu ihm oder ihr: einen Rückruf erbitten, einen Termin anfragen oder eine Nachricht schreiben.`;
  const geld = `Mit der Zuweisung beginnt die Makler-Begleitung, und damit auch die Abrechnung: ${monatsbetrag} im Monat, erstmals am ${ersteAbbuchung}, über das Zahlungsmittel, das Sie beim Buchen hinterlegt haben. Bis heute haben Sie dafür nichts gezahlt.`;
  const raus = `Die Begleitung ist monatlich kündbar. Sie beenden sie in Ihrem Konto unter Leistungen, ohne Anruf und ohne Begründung.`;
  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(wer),
      absatz(geld),
      absatz(raus),
      knopf(link, "Zu Ihrem Konto"),
      ersatzlink(kuendigenLink),
    ].join("\n"),
    `${maklerName} begleitet Sie ab jetzt. ${monatsbetrag} im Monat, monatlich kündbar.`,
    "antwortbar"
  );
  const text = `${anrede}\n\n${wer}\n\n${geld}\n\n${raus}\n\nZu Ihrem Konto: ${link}\nLeistungen und Kündigung: ${kuendigenLink}`;
  return { betreff: kopf, html, text };
}

export type TerminAenderung = "bestaetigt" | "verschoben" | "abgesagt";

/** Termin bestätigt, verschoben oder abgesagt */
export function terminMail({
  name,
  aenderung,
  titel,
  zeitpunkt,
  begruendung,
}: {
  name: string | null;
  aenderung: TerminAenderung;
  /** Worum es geht, z. B. "Fototermin" */
  titel: string;
  /** Neuer bzw. bestätigter Zeitpunkt als fertiger deutscher Text */
  zeitpunkt: string | null;
  begruendung?: string | null;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/termine`;
  const kopf =
    aenderung === "bestaetigt"
      ? `Ihr ${titel} steht`
      : aenderung === "verschoben"
        ? `Neuer Zeitpunkt für Ihren ${titel}`
        : `Ihr ${titel} wurde abgesagt`;
  const kern =
    aenderung === "bestaetigt"
      ? `Ihr ${titel} ist bestätigt${zeitpunkt ? `: ${zeitpunkt}` : ""}. Sie müssen nichts weiter tun.`
      : aenderung === "verschoben"
        ? `Ihr ${titel} hat einen neuen Zeitpunkt${zeitpunkt ? `: ${zeitpunkt}` : ""}. Passt Ihnen der Termin nicht, sagen Sie einfach Bescheid.`
        : `Ihr ${titel}${zeitpunkt ? ` am ${zeitpunkt}` : ""} musste abgesagt werden. Einen neuen Termin finden wir gern gemeinsam.`;
  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(kern),
      begruendung ? absatz(`Begründung: ${begruendung}`) : "",
      knopf(link, "Termine ansehen"),
      benachrichtigungsFuss(),
    ]
      .filter(Boolean)
      .join("\n"),
    kern,
    "antwortbar"
  );
  const text = `${anrede}\n\n${kern}${begruendung ? `\n\nBegründung: ${begruendung}` : ""}\n\nTermine ansehen: ${link}${FUSS_TEXT}`;
  return { betreff: kopf, html, text };
}

/** Eine Hand-Leistung wurde freigeschaltet: der Auftrag ist angelegt */
export function auftragBestaetigungMail({
  name,
  leistungen,
}: {
  name: string | null;
  /** Anzeigenamen der beauftragten Leistungen */
  leistungen: string[];
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/leistungen`;
  const liste = leistungen.join(", ");
  const kopf =
    leistungen.length === 1
      ? `Ihr Auftrag ist bei uns: ${liste}`
      : "Ihre Aufträge sind bei uns";
  const kern =
    leistungen.length === 1
      ? `wir haben Ihre Buchung übernommen und kümmern uns jetzt um: ${liste}. Den Stand sehen Sie jederzeit in Ihrem Konto unter Leistungen; sobald das Ergebnis fertig ist, melden wir uns.`
      : `wir haben Ihre Buchung übernommen und kümmern uns jetzt um: ${liste}. Den Stand jeder Leistung sehen Sie jederzeit in Ihrem Konto unter Leistungen; sobald ein Ergebnis fertig ist, melden wir uns.`;
  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(kern),
      absatz(
        "Brauchen wir etwas von Ihnen, etwa einen Wunschtermin, kommen wir direkt auf Sie zu."
      ),
      knopf(link, "Stand ansehen"),
      benachrichtigungsFuss(),
    ].join("\n"),
    kern,
    "antwortbar"
  );
  const text = `${anrede}\n\n${kern}\n\nBrauchen wir etwas von Ihnen, etwa einen Wunschtermin, kommen wir direkt auf Sie zu.\n\nStand ansehen: ${link}${FUSS_TEXT}`;
  return { betreff: kopf, html, text };
}

/** Eine Hand-Leistung ist fertig, das Ergebnis liegt im Konto */
export function auftragFertigMail({
  name,
  leistung,
  ergebnisText,
  unterlageAngekommen = false,
}: {
  name: string | null;
  /** Anzeigename der Leistung */
  leistung: string;
  /** Was genau bereitliegt, aus config/auftraege.ts */
  ergebnisText: string;
  /**
   * Ist aus diesem Auftrag eine UNTERLAGE geworden? Dann bekommt die
   * Mail einen zweiten Absatz.
   *
   * WARUM ER SEIN MUSS (Inhaber, 28.08.2026): Bis heute sagte diese
   * Mail nur "unter Leistungen" und verlinkte dorthin. Von der
   * Unterlage war keine Rede, von der fehlenden Freigabe erst recht
   * nicht. Der Kunde hatte eine Datei im Konto, die er nicht selbst
   * hochgeladen hat, und wunderte sich Wochen spaeter, warum kein
   * Interessent sie sieht.
   *
   * ER STEHT NUR DA, WENN WIRKLICH EINE ENTSTANDEN IST. Der Aufrufer
   * ZAEHLT nach (lib/auftraege.ts), statt es aus der Leistung zu
   * schliessen: Ein Video am Fotografie-Auftrag faellt bei der
   * Uebernahme heraus, und dann waere der Satz falsch.
   */
  unterlageAngekommen?: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/leistungen`;
  const unterlagenLink = `${kontoBasis()}/konto/unterlagen`;
  const kopf = `Fertig: ${leistung}`;
  const kern = `${ergebnisText.endsWith(".") ? ergebnisText.slice(0, -1) : ergebnisText} liegt jetzt in Ihrem Konto unter Leistungen bereit.`;
  const unterlagenSatz =
    "Sie finden das Ergebnis zusätzlich in Ihren Unterlagen, richtig einsortiert. Dort ist es noch nicht für Interessenten freigegeben: Ob es in Ihr Exposé und auf Ihre Objektseite darf, entscheiden Sie selbst mit einem Schalter.";
  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(kern),
      unterlageAngekommen ? absatz(unterlagenSatz) : "",
      knopf(unterlageAngekommen ? unterlagenLink : link, unterlageAngekommen ? "Zu Ihren Unterlagen" : "Ergebnis ansehen"),
      benachrichtigungsFuss(),
    ]
      .filter(Boolean)
      .join("\n"),
    kern,
    "antwortbar"
  );
  const text = unterlageAngekommen
    ? `${anrede}\n\n${kern}\n\n${unterlagenSatz}\n\nZu Ihren Unterlagen: ${unterlagenLink}${FUSS_TEXT}`
    : `${anrede}\n\n${kern}\n\nErgebnis ansehen: ${link}${FUSS_TEXT}`;
  return { betreff: kopf, html, text };
}

/** Das Team hat auf eine Anfrage geantwortet */
export function antwortMail({
  name,
  betreff: unterhaltungsBetreff,
  auszug,
  vonMakler,
}: {
  name: string | null;
  /** Betreff der Unterhaltung */
  betreff: string;
  /** Erste Zeilen der Antwort, damit die Mail für sich steht */
  auszug: string;
  /**
   * Name des Maklers, wenn ER geantwortet hat (Bau-Runde 4). Dieselbe
   * Form wie im Konto: Die Überschrift wird genauer, sonst ändert
   * sich nichts. Ein Kunde, der für "eine Nummer, ein Gesicht" zahlt,
   * soll das Gesicht auch in der Mail erkennen.
   */
  vonMakler?: string | null;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/nachrichten`;
  const wer = vonMakler ? `Ihr Makler ${vonMakler}` : "Ihr Team";
  const html = rahmen(
    [
      ueberschrift(`${wer} hat geantwortet`),
      absatz(anrede),
      absatz(
        `Auf Ihre Anfrage "${unterhaltungsBetreff}" gibt es eine Antwort:`
      ),
      zitat(auszug),
      knopf(link, "Antwort im Konto lesen"),
      benachrichtigungsFuss(),
    ].join("\n"),
    `Antwort auf "${unterhaltungsBetreff}"`,
    "antwortbar"
  );
  const text = `${anrede}\n\n${wer} hat auf Ihre Anfrage "${unterhaltungsBetreff}" geantwortet:\n\n${auszug}\n\nIm Konto lesen: ${link}${FUSS_TEXT}`;
  return { betreff: `Antwort auf Ihre Anfrage: ${unterhaltungsBetreff}`, html, text };
}

/**
 * Eine neue Anfrage ist eingegangen, egal über welchen Weg.
 *
 * Sie ging bis zum 13.08.2026 NUR an das Team. Der Kunde, der
 * antworten muss, erfuhr nichts und musste von sich aus nachsehen.
 *
 * Der Auszug der Nachricht steht bewusst drin: Ohne ihn ist die Mail
 * ein Klingelzeichen ohne Inhalt, und der Kunde muss sich anmelden, um
 * überhaupt zu wissen, ob es eilt. Die Kontaktdaten des Interessenten
 * stehen NICHT drin, die gehören ins Konto.
 */
/**
 * Die Erinnerung zum Nachfass-Datum.
 *
 * DAS NÜTZLICHSTE FELD DER AKTE braucht diese Mail, sonst ist es nur
 * eine Notiz: Ein Privatverkäufer vergisst genau das Nachfassen, weil
 * er nebenher arbeitet und die Interessenten nicht im Blick behält.
 *
 * Bewusst OHNE den Inhalt der Unterhaltung: Was mit dieser Person
 * besprochen wurde, gehört ins Konto und nicht in ein Postfach, das
 * womöglich jemand anders mitliest.
 */
export function nachfassErinnerungMail({
  name,
  interessentName,
  interessentId,
}: {
  name: string | null;
  interessentName: string;
  interessentId: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/anfragen?p=${interessentId}`;
  const html = rahmen(
    [
      ueberschrift("Sie wollten heute nachfassen"),
      absatz(anrede),
      absatz(
        `Sie hatten sich vorgenommen, heute bei <strong>${schuetzeText(interessentName)}</strong> nachzufassen.`
      ),
      knopf(link, "Unterhaltung öffnen"),
      hinweiszeile(
        "Sie können das Datum in der Akte jederzeit verschieben oder entfernen."
      ),
      benachrichtigungsFuss(),
    ].join("\n"),
    "Sie wollten heute nachfassen.",
    "antwortbar"
  );
  return {
    betreff: `Nachfassen: ${interessentName}`,
    html,
    text: [
      anrede,
      "",
      `Sie hatten sich vorgenommen, heute bei ${interessentName} nachzufassen.`,
      "",
      `Unterhaltung öffnen: ${link}`,
      "",
      "Sie können das Datum in der Akte jederzeit verschieben oder entfernen.",
    ].join("\n"),
  };
}

export function neueAnfrageMail({
  name,
  interessentName,
  interessentId,
  portal,
  nachricht,
  empfangSteht,
}: {
  name: string | null;
  /** Name des Interessenten, soweit er ihn genannt hat */
  interessentName: string | null;
  /**
   * Die Unterhaltung, um die es geht. Der Knopf führt dann direkt
   * hinein statt in die Liste, aus der man sie noch einmal suchen
   * muss. Fehlt sie (die Zuordnung macht ein Trigger, und ein
   * Fehlschlag darf die Mail nicht verhindern), führt der Knopf wie
   * bisher in den Posteingang.
   */
  interessentId?: string | null;
  /** Herkunft, erscheint als ruhiger Zusatz */
  portal: string | null;
  nachricht: string | null;
  /**
   * Steht der Empfang über die Schutz-Adresse (lib/mail.ts,
   * anfragenEmpfangSteht)? Entscheidet die Hinweiszeile.
   *
   * ALS EIGENSCHAFT UND NICHT HIER GELESEN: Diese Datei wird über
   * lib/mail-katalog.ts von einem Browser-Baustein gelesen (die
   * Vorlagen-Ansicht im internen Bereich). Ein Import von lib/mail
   * zöge den ganzen Versand in das Browser-Bündel, und die Abfrage
   * käme dort immer als "steht nicht" zurück.
   */
  empfangSteht: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = interessentId
    ? `${kontoBasis()}/konto/anfragen?p=${interessentId}`
    : `${kontoBasis()}/konto/anfragen`;
  const wer = interessentName?.trim() || "Jemand";
  /* Der Herkunfts-Halbsatz kommt aus config/portale.ts und traegt die
     gepflegte Schreibweise; vorher stand hier die rohe Kennung
     ("ueber immoscout24"). Nur die Pruef-Anfrage behaelt ihren
     laengeren Mail-Wortlaut. */
  const woher =
    portal === "pruefdaten"
      ? "als Prüf-Anfrage Ihres Teams"
      : portal
        ? herkunftSatz(portal)
        : "";
  const auszug = (nachricht ?? "").trim().slice(0, 400);
  const einleitung = [wer, "hat", woher, "nach Ihrer Immobilie gefragt."]
    .filter(Boolean)
    .join(" ");
  const teile = [
    ueberschrift("Eine neue Anfrage ist da"),
    absatz(anrede),
    absatz(schuetzeText(einleitung)),
  ];
  if (auszug) teile.push(zitat(schuetzeText(auszug)));
  teile.push(
    knopf(link, "Anfrage ansehen und antworten"),
    /* DER SATZ HAENGT AM EMPFANG (23.08.2026): Ohne eingerichtetes
       Anfragen-Postfach ist "bekommt nie zu sehen" eine Behauptung
       ueber etwas, das es noch nicht gibt. Beide Fassungen stehen in
       config/anfragen-schutz.ts und werden von der Satz-Pruefung
       gelesen. */
    hinweiszeile(schutzText("mailHinweis", empfangSteht)),
    benachrichtigungsFuss()
  );
  const html = rahmen(teile.join("\n"), einleitung, "antwortbar");
  const text = `${anrede}\n\n${einleitung}${auszug ? `\n\n${auszug}` : ""}\n\nAnfrage ansehen und antworten: ${link}\n\n${schutzText("mailHinweis", empfangSteht)}${FUSS_TEXT}`;
  return { betreff: "Eine neue Anfrage zu Ihrer Immobilie", html, text };
}

/**
 * Die Notbremse je Objekt ist gekippt (lib/bremse.ts, jeObjekt24h): Auf
 * ein Objekt sind an einem Tag so viele Anfragen eingegangen, dass die
 * einzelnen Verkaeufer-Mails aussetzen, damit das Postfach brauchbar
 * bleibt. Diese eine Mail sagt dem Verkaeufer, dass das geschieht, und
 * vor allem, was er tun soll: im Konto in den Posteingang sehen.
 *
 * PFLICHT-MAIL, kein Hinweis: Sie geht ueber sendeMail() und damit
 * unabhaengig von mail_benachrichtigungen. Gerade WER viele Anfragen
 * bekommt, koennte die Hinweise abgeschaltet haben; genau dann darf
 * dieser Betriebshinweis ihn nicht auch noch verfehlen. Deshalb ohne
 * benachrichtigungsFuss (der die Abmeldung anboete) und ohne FUSS_TEXT.
 */
export function notbremseMail({ name }: { name: string | null }): MailInhalt {
  const anrede = name ? `Guten Tag ${schuetzeText(name)},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/anfragen`;
  const html = rahmen(
    [
      ueberschrift("Ungewöhnlich viele Anfragen zu Ihrer Immobilie"),
      absatz(anrede),
      absatz(
        "auf Ihr Objekt sind gerade ungewöhnlich viele Anfragen eingegangen, weit mehr als an einem gewöhnlichen Tag."
      ),
      absatz(
        "Damit Ihr Postfach übersichtlich bleibt, benachrichtigen wir Sie vorübergehend nicht mehr zu jeder einzelnen Anfrage. Sobald wieder weniger eingeht, schicken wir die einzelnen Hinweise von selbst erneut."
      ),
      absatz(
        "Verloren geht dabei nichts. Jede Anfrage wird weiter gespeichert und steht vollständig in Ihrem Konto. Bitte sehen Sie dort im Posteingang nach, damit Ihnen keine entgeht."
      ),
      knopf(link, "Anfragen im Konto ansehen"),
      hinweiszeile(
        "Sie können auf diese E-Mail direkt antworten, Ihre Nachricht landet bei Ihrem Team."
      ),
    ].join("\n"),
    "Ungewöhnlich viele Anfragen: Ihre Anfragen stehen im Konto.",
    "antwortbar"
  );
  const text = `${anrede}\n\nauf Ihr Objekt sind gerade ungewöhnlich viele Anfragen eingegangen, weit mehr als an einem gewöhnlichen Tag.\n\nDamit Ihr Postfach übersichtlich bleibt, benachrichtigen wir Sie vorübergehend nicht mehr zu jeder einzelnen Anfrage. Sobald wieder weniger eingeht, schicken wir die einzelnen Hinweise von selbst erneut.\n\nVerloren geht dabei nichts. Jede Anfrage wird weiter gespeichert und steht vollständig in Ihrem Konto. Bitte sehen Sie dort im Posteingang nach, damit Ihnen keine entgeht:\n\n${link}\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: "Ungewöhnlich viele Anfragen zu Ihrer Immobilie", html, text };
}

/**
 * Ein Interessent hat einen Nachweis hochgeladen.
 *
 * Ebenfalls neu am 13.08.2026: Bis dahin bekam nur der Interessent
 * seinen Beleg und das Team eine Meldung. Der Verkäufer, der den
 * Nachweis angefordert hatte, erfuhr nichts.
 */
export function nachweisHochgeladenMail({
  name,
  interessentName,
  interessentId,
  bezeichnung,
}: {
  name: string | null;
  interessentName: string | null;
  /** Die Unterhaltung dieser Person, siehe neueAnfrageMail */
  interessentId?: string | null;
  /** Was hochgeladen wurde, in Worten */
  bezeichnung: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = interessentId
    ? `${kontoBasis()}/konto/anfragen?p=${interessentId}`
    : `${kontoBasis()}/konto/anfragen`;
  const wer = interessentName?.trim() || "Ein Interessent";
  const satz = `${wer} hat einen Nachweis hochgeladen: ${bezeichnung}.`;
  const html = rahmen(
    [
      ueberschrift("Ein Nachweis liegt vor"),
      absatz(anrede),
      absatz(schuetzeText(satz)),
      knopf(link, "Nachweis ansehen"),
      hinweiszeile(
        "Sie sehen die Unterlage in Ihrem Konto unter Anfragen und entscheiden dort, ob sie brauchbar ist. Geprüft wird damit, dass eine passende, lesbare Unterlage vorliegt, nicht ihr Inhalt."
      ),
      benachrichtigungsFuss(),
    ].join("\n"),
    satz,
    "antwortbar"
  );
  const text = `${anrede}\n\n${satz}\n\nNachweis ansehen: ${link}\n\nSie entscheiden im Konto, ob die Unterlage brauchbar ist.${FUSS_TEXT}`;
  return { betreff: "Ein Nachweis zu Ihrer Immobilie liegt vor", html, text };
}

/** Eine gemeldete Fehlermeldung wurde beantwortet */
export function fehlermeldungMail({
  name,
  auszug,
}: {
  name: string | null;
  auszug: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/nachrichten`;
  const html = rahmen(
    [
      ueberschrift("Antwort auf Ihre Fehlermeldung"),
      absatz(anrede),
      absatz(
        "Danke, dass Sie uns das Problem gemeldet haben. Hier ist die Rückmeldung dazu:"
      ),
      zitat(auszug),
      knopf(link, "Im Konto ansehen"),
      benachrichtigungsFuss(),
    ].join("\n"),
    "Ihre Fehlermeldung wurde beantwortet.",
    "antwortbar"
  );
  const text = `${anrede}\n\nDanke für Ihre Fehlermeldung. Hier ist die Rückmeldung:\n\n${auszug}\n\nIm Konto ansehen: ${link}${FUSS_TEXT}`;
  return { betreff: "Antwort auf Ihre Fehlermeldung", html, text };
}

/* ------------------------------------------------------------------ */
/* Mails an Kaufinteressenten (keine Kunden, kein Konto)               */
/*                                                                     */
/* Diese Mails gehen an Menschen, die uns nur ueber ein Inserat        */
/* kennen. Sie sind deshalb bewusst zurueckhaltend formuliert: klar    */
/* sagen, wer schreibt, warum, und was passiert, wenn man nichts tut.  */
/* ------------------------------------------------------------------ */

/**
 * Bitte um einen Bonitaets- oder Finanzierungsnachweis, mit dem
 * persoenlichen Link zur Upload-Seite.
 *
 * ZWEI FASSUNGEN, gesteuert vom Objekt (nachweis_vor_besichtigung):
 * Ohne Pflicht ist es eine Bitte, und die Mail sagt ausdruecklich,
 * dass eine Besichtigung auch ohne Nachweis moeglich ist. Die alte
 * Fassung behauptete pauschal, vor jeder Besichtigung werde der
 * Nachweis erbeten; das war im Regelfall eine falsche Aussage
 * gegenueber dem Interessenten. Mit Pflicht sagt die Mail die
 * Bedingung klar und frueh, nicht erst beim Terminwunsch.
 */
export function bonitaetsnachweisMail({
  name,
  objektBezeichnung,
  link,
  gueltigBis,
  pflicht = false,
}: {
  /** Name des Interessenten, falls die Anfrage einen enthielt */
  name: string | null;
  /** Kurze Objektbezeichnung, damit die Mail einzuordnen ist */
  objektBezeichnung: string;
  link: string;
  /** Fertig formatiertes Datum */
  gueltigBis: string;
  /** Verlangt der Verkaeufer den Nachweis vor der Besichtigung? */
  pflicht?: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const kern = pflicht
    ? `vielen Dank für Ihr Interesse an <strong>${objektBezeichnung}</strong>. Für dieses Objekt vergibt der Eigentümer Besichtigungstermine erst, wenn ein kurzer Nachweis zur Finanzierung vorliegt. Damit Sie einen Termin bekommen können, laden Sie ihn bitte vorab hoch.`
    : `vielen Dank für Ihr Interesse an <strong>${objektBezeichnung}</strong>. Der Eigentümer bittet Sie um einen kurzen Nachweis, dass die Finanzierung steht. Das ist eine Bitte und keine Bedingung: Eine Besichtigung ist auch ohne den Nachweis möglich.`;
  const einordnung = pflicht
    ? "Das ist keine Bewertung Ihrer Person. Es sorgt dafür, dass Besichtigungstermine an Menschen gehen, die das Objekt auch wirklich kaufen können, und es schützt Sie davor, gegen unrealistische Mitbewerber anzutreten."
    : "Das ist keine Bewertung Ihrer Person. Der Nachweis hilft dem Eigentümer, Ihre Anfrage einzuordnen, und es entsteht Ihnen kein Nachteil, wenn Sie ihn erst später nachreichen.";
  const html = rahmen(
    [
      ueberschrift("Ein kurzer Nachweis für Ihre Anfrage"),
      absatz(anrede),
      absatz(kern),
      absatz(einordnung),
      absatz(
        "Es genügt <strong>eine</strong> der beiden Unterlagen: die Finanzierungsbestätigung Ihrer Bank oder ein SCHUFA-BonitätsCheck."
      ),
      knopf(link, "Nachweis hochladen"),
      ersatzlink(link),
      hinweiszeile(
        `Der Link gehört zu Ihrer Anfrage und ist bis zum ${gueltigBis} gültig. Wenn Sie kein Interesse mehr haben, können Sie diese Nachricht einfach ignorieren, es passiert dann nichts weiter.`
      ),
    ].join("\n"),
    "Ein kurzer Nachweis, dann geht es weiter."
  );
  const kernText = kern.replace(/<\/?strong>/g, "");
  const text = `${anrede}\n\n${kernText}\n\n${einordnung}\n\nEs genügt eine der beiden Unterlagen: die Finanzierungsbestätigung Ihrer Bank oder ein SCHUFA-BonitätsCheck.\n\nHochladen: ${link}\n\nDer Link gehört zu Ihrer Anfrage und ist bis zum ${gueltigBis} gültig.\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: `Ihre Anfrage zu ${objektBezeichnung}`, html, text };
}

/** Bestaetigung an den Interessenten nach dem Upload */
export function nachweisEingegangenMail({
  name,
  objektBezeichnung,
  art,
}: {
  name: string | null;
  objektBezeichnung: string;
  /** Fertiger Anzeigename der Nachweis-Art */
  art: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const html = rahmen(
    [
      ueberschrift("Ihr Nachweis ist angekommen"),
      absatz(anrede),
      absatz(
        `Ihre Unterlage zu <strong>${objektBezeichnung}</strong> ist bei uns eingegangen: ${art}. Der Eigentümer meldet sich bei Ihnen.`
      ),
      hinweiszeile(
        "Die Unterlage wird ausschließlich für diesen Verkauf verwendet und spätestens nach 90 Tagen automatisch gelöscht. Wenn Sie sie vorher entfernt haben möchten, schreiben Sie uns."
      ),
    ].join("\n"),
    "Ihr Nachweis ist bei uns eingegangen."
  );
  const text = `${anrede}\n\nIhre Unterlage zu ${objektBezeichnung} ist bei uns eingegangen: ${art}. Der Eigentümer meldet sich bei Ihnen.\n\nDie Unterlage wird ausschließlich für diesen Verkauf verwendet und spätestens nach 90 Tagen automatisch gelöscht.\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: "Ihr Nachweis ist angekommen", html, text };
}

/* ------------------------------------------------------------------ */
/* Bieterverfahren                                                     */
/*                                                                     */
/* In JEDER dieser Mails steht der Hinweis, dass ein Gebot noch kein   */
/* Kaufvertrag ist. Der Text kommt aus config/bieterverfahren.ts,      */
/* damit er nach der anwaltlichen Pruefung an einer Stelle wechselt.   */
/* ------------------------------------------------------------------ */

/** Einladung eines Interessenten zum Verfahren */
export function gebotEinladungMail({
  name,
  objektBezeichnung,
  startpreis,
  frist,
  link,
  runde,
}: {
  name: string | null;
  objektBezeichnung: string;
  /** Fertig formatiert, z. B. "395.000 €" */
  startpreis: string;
  /** Fertig formatiert */
  frist: string;
  link: string;
  runde: number;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const zweiteRunde = runde > 1;
  const html = rahmen(
    [
      ueberschrift(
        zweiteRunde
          ? `Zweite Runde für ${objektBezeichnung}`
          : `Ihr Gebot für ${objektBezeichnung}`
      ),
      absatz(anrede),
      absatz(
        zweiteRunde
          ? `für <strong>${objektBezeichnung}</strong> geht es in eine zweite Runde, und Sie sind dabei. Sie können bis zum ${frist} ein neues Gebot abgeben.`
          : `für <strong>${objektBezeichnung}</strong> läuft ein Bieterverfahren. Der Startpreis liegt bei <strong>${startpreis}</strong>. Sie können bis zum ${frist} ein Gebot abgeben.`
      ),
      absatz(HINWEIS_KEINE_BINDUNG),
      knopf(link, zweiteRunde ? "Neues Gebot abgeben" : "Gebot abgeben"),
      ersatzlink(link),
      hinweiszeile(
        "Der Link gehört zu Ihrer Anfrage und gilt bis zum Ende der Frist. Sie können Ihr Gebot jederzeit erhöhen oder zurückziehen, solange die Frist läuft."
      ),
    ].join("\n"),
    `Bieterverfahren: ${objektBezeichnung}`
  );
  const text = `${anrede}\n\nfür ${objektBezeichnung} läuft ein Bieterverfahren. Startpreis: ${startpreis}. Frist: ${frist}.\n\n${HINWEIS_KEINE_BINDUNG}\n\nGebot abgeben: ${link}\n\nIhr Team von selbst-verkauf.de`;
  return {
    betreff: zweiteRunde
      ? `Zweite Runde: ${objektBezeichnung}`
      : `Bieterverfahren: ${objektBezeichnung}`,
    html,
    text,
  };
}

/** Bestaetigung an den Bieter nach dem Abgeben oder Erhoehen */
export function gebotEingegangenMail({
  name,
  betrag,
  erhoeht,
}: {
  name: string;
  betrag: number;
  erhoeht: boolean;
}): MailInhalt {
  const summe = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(betrag);
  const html = rahmen(
    [
      ueberschrift(erhoeht ? "Ihr Gebot ist aktualisiert" : "Ihr Gebot ist eingegangen"),
      absatz(`Guten Tag ${name},`),
      absatz(
        erhoeht
          ? `Ihr Gebot steht jetzt bei <strong>${summe}</strong>.`
          : `wir haben Ihr Gebot über <strong>${summe}</strong> erhalten.`
      ),
      absatz(HINWEIS_KEINE_BINDUNG),
      hinweiszeile(
        "Sie können Ihr Gebot über denselben Link jederzeit erhöhen oder zurückziehen, solange die Frist läuft. Nach Ablauf der Frist meldet sich der Eigentümer bei Ihnen."
      ),
    ].join("\n"),
    `Ihr Gebot: ${summe}`
  );
  const text = `Guten Tag ${name},\n\n${erhoeht ? `Ihr Gebot steht jetzt bei ${summe}.` : `wir haben Ihr Gebot über ${summe} erhalten.`}\n\n${HINWEIS_KEINE_BINDUNG}\n\nIhr Team von selbst-verkauf.de`;
  return {
    betreff: erhoeht ? "Ihr Gebot ist aktualisiert" : "Ihr Gebot ist eingegangen",
    html,
    text,
  };
}

/** Der Verkaeufer hat entschieden: Zusage oder Absage */
export function gebotEntscheidungMail({
  name,
  objektBezeichnung,
  angenommen,
}: {
  name: string;
  objektBezeichnung: string;
  angenommen: boolean;
}): MailInhalt {
  const html = rahmen(
    [
      ueberschrift(
        angenommen
          ? "Der Eigentümer möchte mit Ihnen weitermachen"
          : `Ihr Gebot für ${objektBezeichnung}`
      ),
      absatz(`Guten Tag ${name},`),
      absatz(
        angenommen
          ? `der Eigentümer von <strong>${objektBezeichnung}</strong> hat sich für Ihr Gebot entschieden und meldet sich in den nächsten Tagen bei Ihnen, um das weitere Vorgehen zu besprechen.`
          : `vielen Dank für Ihr Gebot für <strong>${objektBezeichnung}</strong>. Der Eigentümer hat sich für ein anderes Angebot entschieden. Das ist keine Bewertung Ihres Gebots, es kann viele Gründe haben.`
      ),
      angenommen
        ? absatz(
            "Der nächste Schritt ist der Termin beim Notar. Erst die notarielle Beurkundung macht den Kauf verbindlich, bis dahin sind beide Seiten frei."
          )
        : absatz("Wir wünschen Ihnen viel Erfolg bei der weiteren Suche."),
      hinweiszeile(
        "Ihre Unterlagen zu diesem Verfahren werden nach spätestens 90 Tagen automatisch gelöscht."
      ),
    ].join("\n"),
    angenommen ? "Der Eigentümer möchte mit Ihnen weitermachen." : "Rückmeldung zu Ihrem Gebot."
  );
  const text = `Guten Tag ${name},\n\n${angenommen ? `der Eigentümer von ${objektBezeichnung} hat sich für Ihr Gebot entschieden und meldet sich bei Ihnen. Der nächste Schritt ist der Termin beim Notar; erst die notarielle Beurkundung macht den Kauf verbindlich.` : `vielen Dank für Ihr Gebot für ${objektBezeichnung}. Der Eigentümer hat sich für ein anderes Angebot entschieden.`}\n\nIhr Team von selbst-verkauf.de`;
  return {
    betreff: angenommen
      ? "Ihr Gebot: der Eigentümer meldet sich"
      : `Ihr Gebot für ${objektBezeichnung}`,
    html,
    text,
  };
}

/** Der Verkaeufer bekommt jedes neue Gebot als Nachricht */
export function neuesGebotMail({
  name,
  betrag,
  anzahl,
  neu = 1,
}: {
  name: string | null;
  /** Bei mehreren neuen Geboten das hoechste davon */
  betrag: number;
  /** Wie viele Gebote in dieser Runde insgesamt vorliegen */
  anzahl: number;
  /**
   * Wie viele Gebote DIESE Mail abdeckt.
   *
   * 1 beim sofortigen Hinweis, mehr bei der Sammelmeldung aus dem
   * Zeitplan. Der Wert steuert Betreff und ersten Satz: "ein neues
   * Gebot" waere gelogen, wenn in der Ruhezeit vier aufgelaufen sind,
   * und genau das stand hier bis zum 08.08.2026.
   */
  neu?: number;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const summe = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(betrag);
  const link = `${kontoBasis()}/konto/bieterverfahren`;
  const mehrere = neu > 1;

  const kopf = mehrere
    ? `${neu} neue Gebote sind eingegangen`
    : "Ein neues Gebot ist eingegangen";
  const betreff = mehrere
    ? `${neu} neue Gebote, höchstes ${summe}`
    : `Neues Gebot: ${summe}`;
  const kernHtml = mehrere
    ? `für Ihr Objekt sind <strong>${neu} neue Gebote</strong> eingegangen. Das höchste liegt bei <strong>${summe}</strong>. Damit sind es insgesamt ${anzahl} Gebote.`
    : `für Ihr Objekt liegt ein neues Gebot über <strong>${summe}</strong> vor. Damit sind es insgesamt ${anzahl} ${anzahl === 1 ? "Gebot" : "Gebote"}.`;
  const kernText = mehrere
    ? `für Ihr Objekt sind ${neu} neue Gebote eingegangen. Das höchste liegt bei ${summe}. Insgesamt: ${anzahl}.`
    : `für Ihr Objekt liegt ein neues Gebot über ${summe} vor. Insgesamt: ${anzahl}.`;

  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(kernHtml),
      knopf(link, "Gebote ansehen"),
      absatz(HINWEIS_FREIE_ENTSCHEIDUNG),
      benachrichtigungsFuss(),
    ].join("\n"),
    betreff,
    "antwortbar"
  );
  const text = `${anrede}\n\n${kernText}\n\nGebote ansehen: ${link}\n\n${HINWEIS_FREIE_ENTSCHEIDUNG}${FUSS_TEXT}`;
  return { betreff, html, text };
}

/* ------------------------------------------------------------------ */
/* Abschluss des Bieterverfahrens                                      */
/*                                                                     */
/* ANWALTLICH ZU PRUEFEN: alle drei Texte hier unten, besonders die    */
/* Mail an den ausgewaehlten Bieter. Sie darf unter keinen Umstaenden  */
/* nach Vertragsschluss klingen. Kein "Zuschlag", kein "Sie haben      */
/* gewonnen", kein "Glueckwunsch zum Kauf". Verbindlich wird ein       */
/* Immobilienkauf erst mit der notariellen Beurkundung                 */
/* (§ 311b Abs. 1 BGB), und bis dahin kann jede Seite aussteigen.      */
/* ------------------------------------------------------------------ */

function summeText(betrag: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(betrag);
}

/**
 * An den Verkaeufer, sobald die Frist abgelaufen ist.
 *
 * Bewusst OHNE Empfehlung und ohne Druck: Es steht da, was vorliegt,
 * und wo er entscheidet. Kein "Nehmen Sie das hoechste Gebot an", kein
 * "Nur noch heute". Er hat gerade eine der groessten Entscheidungen
 * seines Lebens vor sich, da hilft eine ruhige Zusammenfassung mehr als
 * ein Anstoss.
 */
export function fristAbgelaufenMail({
  name,
  anzahl,
  hoechstes,
}: {
  name: string | null;
  anzahl: number;
  hoechstes: number | null;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/bieterverfahren`;
  const stand =
    anzahl === 0
      ? "Bis zum Ende der Frist ist kein gültiges Gebot eingegangen. Sie können die Frist verlängern oder das Verfahren beenden."
      : `Es liegen ${anzahl} ${anzahl === 1 ? "gültiges Gebot" : "gültige Gebote"} vor, das höchste über <strong>${summeText(hoechstes ?? 0)}</strong>.`;
  const standText =
    anzahl === 0
      ? "Bis zum Ende der Frist ist kein gültiges Gebot eingegangen. Sie können die Frist verlängern oder das Verfahren beenden."
      : `Es liegen ${anzahl} ${anzahl === 1 ? "gültiges Gebot" : "gültige Gebote"} vor, das höchste über ${summeText(hoechstes ?? 0)}.`;

  const html = rahmen(
    [
      ueberschrift("Die Frist ist abgelaufen"),
      absatz(anrede),
      absatz(stand),
      absatz(
        "In Ihrem Konto sehen Sie jedes Gebot mit Name, Kontaktdaten und Finanzierungsart und entscheiden dort in Ruhe."
      ),
      knopf(link, "Gebote ansehen"),
      absatz(HINWEIS_FREIE_ENTSCHEIDUNG),
      benachrichtigungsFuss(),
    ].join("\n"),
    "Die Frist ist abgelaufen",
    "antwortbar"
  );
  const text = `${anrede}\n\n${standText}\n\nIn Ihrem Konto sehen Sie jedes Gebot und entscheiden dort in Ruhe:\n${link}\n\n${HINWEIS_FREIE_ENTSCHEIDUNG}${FUSS_TEXT}`;
  return { betreff: "Die Frist ist abgelaufen", html, text };
}

/**
 * An den Verkaeufer, nachdem er ein Gebot angenommen hat.
 *
 * Freundlich, aber ohne Uebertreibung: Er hat sich entschieden, mehr
 * ist noch nicht passiert. Der naechste Schritt steht klar da.
 */
export function gebotAngenommenVerkaeuferMail({
  name,
  bieterName,
  betrag,
}: {
  name: string | null;
  bieterName: string;
  betrag: number;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const summe = summeText(betrag);
  // Direkt auf die Checkliste, nicht auf den Unterlagen-Bereich: Der
  // nächste Schritt ist der Notar, und genau dieses Blatt hilft dabei.
  const link = `${kontoBasis()}/api/checklisten/notartermin`;
  const html = rahmen(
    [
      ueberschrift("Sie haben sich entschieden"),
      absatz(anrede),
      absatz(
        `Sie haben das Gebot von <strong>${bieterName}</strong> über <strong>${summe}</strong> angenommen. Wir haben ${bieterName} benachrichtigt.`
      ),
      absatz(
        "Der nächste Schritt liegt bei Ihnen beiden: Nehmen Sie Kontakt auf und vereinbaren Sie einen Termin beim Notar. Erst die notarielle Beurkundung macht den Kauf verbindlich, vorher entsteht kein Vertrag."
      ),
      absatz(
        "Damit Sie beim Notar nichts suchen müssen, liegt in Ihrem Konto die Checkliste <strong>Notartermin vorbereiten</strong> als PDF bereit. Sie nennt, was vorher geklärt sein sollte und was Sie mitbringen."
      ),
      knopf(link, "Checkliste öffnen"),
      benachrichtigungsFuss(),
    ].join("\n"),
    `Gebot über ${summe} angenommen`,
    "antwortbar"
  );
  const text = `${anrede}\n\nSie haben das Gebot von ${bieterName} über ${summe} angenommen. Wir haben ${bieterName} benachrichtigt.\n\nDer nächste Schritt: Kontakt aufnehmen und einen Termin beim Notar vereinbaren. Erst die notarielle Beurkundung macht den Kauf verbindlich.\n\nDie Checkliste "Notartermin vorbereiten" liegt in Ihrem Konto bereit:\n${link}${FUSS_TEXT}`;
  return { betreff: `Gebot über ${summe} angenommen`, html, text };
}

/**
 * An den ausgewaehlten Bieter.
 *
 * DER HEIKELSTE TEXT DES GANZEN BEREICHS. Er muss freundlich sein und
 * zugleich unmissverstaendlich sagen, dass noch kein Kaufvertrag
 * besteht. Deshalb steht die Grenze nicht im Kleingedruckten, sondern
 * als eigener Absatz mitten im Text.
 */
export function gebotAngenommenBieterMail({
  name,
  objektBezeichnung,
  betrag,
}: {
  name: string;
  objektBezeichnung: string;
  betrag: number;
}): MailInhalt {
  const summe = summeText(betrag);
  const html = rahmen(
    [
      ueberschrift("Der Eigentümer hat sich für Ihr Gebot entschieden"),
      absatz(`Guten Tag ${name},`),
      absatz(
        `der Eigentümer von ${objektBezeichnung} hat sich für Ihr Gebot über <strong>${summe}</strong> entschieden. Er meldet sich in den nächsten Tagen bei Ihnen, um alles Weitere zu besprechen.`
      ),
      absatz(
        "<strong>Wichtig, damit es keine Missverständnisse gibt:</strong> Dadurch ist noch kein Kaufvertrag entstanden. Ein Immobilienkauf wird in Deutschland erst mit der notariellen Beurkundung verbindlich. Bis dahin können beide Seiten noch zurücktreten."
      ),
      absatz(
        "Wenn Sie eine Finanzierung brauchen, ist jetzt der richtige Zeitpunkt, sie mit Ihrer Bank final zu klären."
      ),
      benachrichtigungsFuss(),
    ].join("\n"),
    `Ihr Gebot über ${summe}`,
    "antwortbar"
  );
  const text = `Guten Tag ${name},\n\nder Eigentümer von ${objektBezeichnung} hat sich für Ihr Gebot über ${summe} entschieden. Er meldet sich in den nächsten Tagen bei Ihnen.\n\nWichtig: Dadurch ist noch kein Kaufvertrag entstanden. Ein Immobilienkauf wird in Deutschland erst mit der notariellen Beurkundung verbindlich. Bis dahin können beide Seiten noch zurücktreten.\n\nWenn Sie eine Finanzierung brauchen, klären Sie sie jetzt final mit Ihrer Bank.${FUSS_TEXT}`;
  return { betreff: `Ihr Gebot über ${summe}`, html, text };
}

/* ------------------------------------------------------------------ */
/* Besichtigungen mit Interessenten                                    */
/*                                                                     */
/* Diese Mails kommen NICHT von uns, sondern vom Verkaeufer. Wir sind  */
/* der Bote. Deshalb heisst es durchgehend "der Eigentuemer" und nie   */
/* "wir haben einen Termin fuer Sie". Wer den Termin macht, muss aus   */
/* dem ersten Satz hervorgehen.                                        */
/*                                                                     */
/* DIE ADRESSE STEHT ERST IN DER BESTAETIGUNG. Der Vorschlag nennt     */
/* Postleitzahl und Ort, die Strasse kommt mit der Zusage. Der         */
/* Verkaeufer kann sie frueher freigeben, das ist seine Entscheidung.  */
/* Die Vorlagen erzwingen hier nichts, sie bekommen den Ort fertig     */
/* uebergeben (lib/besichtigungen.ts, ortFuerInteressent).             */
/* ------------------------------------------------------------------ */

/** Ein Terminvorschlag, wie er in der Liste der Mail erscheint */
export type TerminZeile = { zeit: string; plaetze?: string | null };

/** Vorschlaege als Liste, damit sie im Postfach nicht zur Textwand werden */
function terminListe(termine: TerminZeile[]): string {
  const zeilen = termine
    .map(
      (t) =>
        `<li style="margin:0 0 8px;">${schuetzeText(t.zeit)}${
          t.plaetze ? ` <span style="opacity:0.75;">(${schuetzeText(t.plaetze)})</span>` : ""
        }</li>`
    )
    .join("\n");
  return liste(zeilen);
}

/**
 * Die Terminart steuert den Text: Drei Arten, drei Erwartungen, keine
 * gemeinsame Formulierung, die alles meint und nichts sagt
 * (Entscheidung vom 11.08.2026, lib/besichtigungen.ts).
 */
export type MailTerminArt = "einzeltermin" | "zeitfenster" | "gruppentermin";

/**
 * Der Verkaeufer schlaegt Termine vor. Der Text passt zur Art:
 *
 *   einzeltermin   Bei mehreren Vorschlaegen sagt der Text
 *                  ausdruecklich, dass EINER genuegt. Sonst antwortet
 *                  der Hoefliche auf alle drei und der Verkaeufer hat
 *                  drei Termine mit derselben Person.
 *   zeitfenster    Der Interessent erfaehrt, dass er sich EIN Fenster
 *                  aussucht und die Zeit ihm allein gehoert.
 *   gruppentermin  Die Erwartungen stehen VOR der Tuer, nicht davor:
 *                  mehrere Interessenten gleichzeitig, begrenzte Zeit,
 *                  Fragen im Anschluss.
 */
export function besichtigungVorschlagMail({
  name,
  objektBezeichnung,
  ort,
  termine,
  link,
  nachricht,
  art,
}: {
  name: string | null;
  objektBezeichnung: string;
  /** Fertig aufbereitet, siehe ortFuerInteressent */
  ort: string;
  termine: TerminZeile[];
  link: string;
  /** Freier Zusatz des Verkaeufers, roh */
  nachricht?: string | null;
  art: MailTerminArt;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const mehrere = termine.length > 1;
  const kopf =
    art === "zeitfenster"
      ? "Wählen Sie Ihr Zeitfenster zur Besichtigung"
      : "Termin zur Besichtigung";

  const einstieg =
    art === "zeitfenster"
      ? `der Eigentümer von <strong>${objektBezeichnung}</strong> bietet Ihnen für die Besichtigung mehrere Zeitfenster an. Sie wählen eines aus, und diese Zeit gehört dann Ihnen allein.`
      : art === "gruppentermin"
        ? `der Eigentümer von <strong>${objektBezeichnung}</strong> lädt Sie zu einem gemeinsamen Besichtigungstermin ein.`
        : `der Eigentümer von <strong>${objektBezeichnung}</strong> schlägt Ihnen ${
            mehrere ? "folgende Termine" : "folgenden Termin"
          } für eine Besichtigung vor.`;

  const erwartung =
    art === "zeitfenster"
      ? "Wählen Sie bitte <strong>ein</strong> Fenster aus. Die übrigen bleiben für andere Interessenten frei, Sie begegnen sich nicht."
      : art === "gruppentermin"
        ? "Gut zu wissen: Zu diesem Termin sind mehrere Interessenten gleichzeitig eingeladen, die Plätze werden in der Reihenfolge der Zusagen vergeben. Die Zeit vor Ort ist begrenzt, Ihre Fragen beantwortet der Eigentümer gern im Anschluss."
        : mehrere
          ? "Wählen Sie bitte <strong>einen</strong> Termin aus. Die übrigen Vorschläge werden damit automatisch hinfällig."
          : "";

  const erwartungText =
    art === "zeitfenster"
      ? "Bitte wählen Sie ein Fenster aus. Die übrigen bleiben für andere Interessenten frei, Sie begegnen sich nicht."
      : art === "gruppentermin"
        ? "Gut zu wissen: Zu diesem Termin sind mehrere Interessenten gleichzeitig eingeladen, die Plätze werden in der Reihenfolge der Zusagen vergeben. Die Zeit vor Ort ist begrenzt, Ihre Fragen beantwortet der Eigentümer gern im Anschluss."
        : mehrere
          ? "Bitte wählen Sie einen Termin aus, die übrigen werden damit hinfällig."
          : "";

  const knopfText =
    art === "zeitfenster"
      ? "Zeitfenster auswählen"
      : art === "gruppentermin"
        ? "Platz bestätigen"
        : mehrere
          ? "Termin auswählen"
          : "Termin bestätigen";

  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(einstieg),
      terminListe(termine),
      erwartung ? absatz(erwartung) : "",
      nachricht?.trim() ? zitat(schuetzeText(nachricht.trim())) : "",
      absatz(`Ort: ${schuetzeText(ort)}`),
      knopf(link, knopfText),
      ersatzlink(link),
      hinweiszeile(
        "Über denselben Link können Sie später auch absagen. Solange Sie nicht zusagen, passiert nichts weiter."
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    `${objektBezeichnung}: ${mehrere ? "Terminvorschläge" : termine[0]?.zeit ?? "Terminvorschlag"}`
  );

  const text = `${anrede}\n\n${
    art === "zeitfenster"
      ? `der Eigentümer von ${objektBezeichnung} bietet Ihnen für die Besichtigung mehrere Zeitfenster an. Sie wählen eines aus, und diese Zeit gehört dann Ihnen allein:`
      : art === "gruppentermin"
        ? `der Eigentümer von ${objektBezeichnung} lädt Sie zu einem gemeinsamen Besichtigungstermin ein:`
        : `der Eigentümer von ${objektBezeichnung} schlägt Ihnen ${
            mehrere ? "folgende Termine" : "folgenden Termin"
          } für eine Besichtigung vor:`
  }\n\n${termine
    .map((t) => `- ${t.zeit}${t.plaetze ? ` (${t.plaetze})` : ""}`)
    .join("\n")}\n${erwartungText ? `\n${erwartungText}\n` : ""}${
    nachricht?.trim() ? `\n${nachricht.trim()}\n` : ""
  }\nOrt: ${ort}\n\n${knopfText}: ${link}\n\nÜber denselben Link können Sie später auch absagen.`;

  const betreff =
    art === "zeitfenster"
      ? `Besichtigung ${objektBezeichnung}: Wählen Sie Ihr Zeitfenster`
      : art === "gruppentermin"
        ? `Besichtigung ${objektBezeichnung}: Einladung zum gemeinsamen Termin`
        : `Besichtigung ${objektBezeichnung}: Terminvorschlag`;

  return { betreff, html, text };
}

/**
 * Der Termin steht. Diese Mail traegt die Kalenderdatei im Anhang und
 * ist die erste, in der die genaue Adresse steht.
 */
export function besichtigungBestaetigtMail({
  name,
  objektBezeichnung,
  zeit,
  ort,
  link,
  art = "einzeltermin",
}: {
  name: string | null;
  objektBezeichnung: string;
  zeit: string;
  ort: string;
  link: string;
  art?: MailTerminArt;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const kern = `Ihre Besichtigung von ${objektBezeichnung} steht: ${zeit}.`;
  const artSatz =
    art === "zeitfenster"
      ? "Dieses Zeitfenster gehört Ihnen allein, Sie besichtigen in Ruhe und ohne andere Interessenten."
      : art === "gruppentermin"
        ? "Es ist ein gemeinsamer Termin: Mehrere Interessenten besichtigen gleichzeitig, die Zeit vor Ort ist begrenzt. Ihre Fragen beantwortet der Eigentümer gern im Anschluss."
        : null;
  const html = rahmen(
    [
      ueberschrift("Ihr Besichtigungstermin steht"),
      absatz(anrede),
      absatz(
        art === "zeitfenster"
          ? `Ihr Zeitfenster für die Besichtigung von <strong>${objektBezeichnung}</strong> ist bestätigt.`
          : art === "gruppentermin"
            ? `Ihr Platz beim Besichtigungstermin für <strong>${objektBezeichnung}</strong> ist bestätigt.`
            : `Ihre Besichtigung von <strong>${objektBezeichnung}</strong> ist bestätigt.`
      ),
      absatz(
        `<strong>${schuetzeText(zeit)}</strong><br>${schuetzeText(ort)}`
      ),
      artSatz ? absatz(artSatz) : "",
      absatz(
        "Im Anhang liegt eine Kalenderdatei. Ein Klick darauf trägt den Termin in Ihren Kalender ein."
      ),
      hinweiszeile(
        `Wenn Ihnen etwas dazwischenkommt, sagen Sie bitte rechtzeitig ab: ${link}`
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    kern
  );
  const text = `${anrede}\n\n${
    art === "zeitfenster"
      ? `Ihr Zeitfenster für die Besichtigung von ${objektBezeichnung} ist bestätigt.`
      : art === "gruppentermin"
        ? `Ihr Platz beim Besichtigungstermin für ${objektBezeichnung} ist bestätigt.`
        : `Ihre Besichtigung von ${objektBezeichnung} ist bestätigt.`
  }\n\n${zeit}\n${ort}\n${artSatz ? `\n${artSatz}\n` : ""}\nIm Anhang liegt eine Kalenderdatei für Ihren Kalender.\n\nWenn Ihnen etwas dazwischenkommt, sagen Sie bitte rechtzeitig ab: ${link}`;
  return { betreff: `Besichtigung bestätigt: ${zeit}`, html, text };
}

export type BesichtigungAenderung = "verschoben" | "abgesagt";

/**
 * Der Verkaeufer verschiebt oder sagt ab.
 *
 * Bei einer Verschiebung ist der Termin NICHT automatisch wieder
 * bestaetigt: Der Interessent muss erneut zusagen. Alles andere waere
 * eine Unterstellung, der neue Zeitpunkt kann ihm unmoeglich sein.
 */
export function besichtigungAenderungMail({
  name,
  objektBezeichnung,
  aenderung,
  alteZeit,
  neueZeit,
  grund,
  link,
  art = "einzeltermin",
}: {
  name: string | null;
  objektBezeichnung: string;
  aenderung: BesichtigungAenderung;
  alteZeit: string;
  neueZeit?: string | null;
  /** Begruendung des Verkaeufers, roh */
  grund?: string | null;
  link: string;
  art?: MailTerminArt;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const verschoben = aenderung === "verschoben";
  /* Das Wort passt zur Art: Wer sein eigenes Fenster gewaehlt hat,
     liest "Ihr Zeitfenster", nicht "die Besichtigung". */
  const wortsinn =
    art === "zeitfenster"
      ? "Ihr Zeitfenster"
      : art === "gruppentermin"
        ? "den gemeinsamen Besichtigungstermin"
        : "die Besichtigung";
  const kopf = verschoben
    ? "Neuer Zeitpunkt für Ihre Besichtigung"
    : "Ihre Besichtigung wurde abgesagt";
  const kern = verschoben
    ? `der Eigentümer von <strong>${objektBezeichnung}</strong> muss ${wortsinn} am ${schuetzeText(alteZeit)} verlegen. Neuer Vorschlag: <strong>${schuetzeText(neueZeit ?? "")}</strong>.`
    : `der Eigentümer von <strong>${objektBezeichnung}</strong> muss ${wortsinn} am ${schuetzeText(alteZeit)} leider absagen.`;

  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(kern),
      grund?.trim() ? zitat(schuetzeText(grund.trim())) : "",
      verschoben
        ? absatz(
            "Der neue Termin gilt erst, wenn Sie ihn bestätigen. Passt er Ihnen nicht, sagen Sie über denselben Link ab."
          )
        : absatz(
            "Das ist keine Absage an Ihr Interesse. Sobald es einen neuen Termin gibt, melden wir uns wieder bei Ihnen."
          ),
      verschoben ? knopf(link, "Neuen Termin bestätigen") : "",
      verschoben ? ersatzlink(link) : "",
    ]
      .filter(Boolean)
      .join("\n"),
    verschoben
      ? `Neuer Vorschlag: ${neueZeit ?? ""}`
      : `Die Besichtigung am ${alteZeit} entfällt.`
  );

  const text = `${anrede}\n\n${
    verschoben
      ? `der Eigentümer von ${objektBezeichnung} muss die Besichtigung am ${alteZeit} verlegen. Neuer Vorschlag: ${neueZeit ?? ""}.`
      : `der Eigentümer von ${objektBezeichnung} muss die Besichtigung am ${alteZeit} leider absagen.`
  }${grund?.trim() ? `\n\n${grund.trim()}` : ""}\n\n${
    verschoben
      ? `Der neue Termin gilt erst, wenn Sie ihn bestätigen:\n${link}`
      : "Sobald es einen neuen Termin gibt, melden wir uns wieder bei Ihnen."
  }`;

  return {
    betreff: verschoben
      ? `Besichtigung verlegt: ${objektBezeichnung}`
      : `Besichtigung abgesagt: ${objektBezeichnung}`,
    html,
    text,
  };
}

/**
 * Erinnerung am Vortag, an den Interessenten.
 *
 * BEWUSST NUR AN DEN INTERESSENTEN: Der Verkaeufer hat den Termin in
 * seinem Konto und in der Kalenderdatei, die ihre eigene Erinnerung
 * mitbringt. Der Interessent hat nichts davon, er kennt uns nur aus
 * dieser einen Mail. Genau dort entstehen die vergessenen Termine.
 */
export function besichtigungErinnerungMail({
  name,
  objektBezeichnung,
  zeit,
  ort,
  link,
  art = "einzeltermin",
}: {
  name: string | null;
  objektBezeichnung: string;
  zeit: string;
  ort: string;
  link: string;
  art?: MailTerminArt;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const kern = `Erinnerung: Ihre Besichtigung von ${objektBezeichnung} ist am ${zeit}.`;
  const artSatz =
    art === "zeitfenster"
      ? "Das Zeitfenster gehört Ihnen allein. Kommen Sie bitte pünktlich, direkt danach beginnt das nächste Fenster."
      : art === "gruppentermin"
        ? "Es ist ein gemeinsamer Termin mit mehreren Interessenten, die Zeit vor Ort ist begrenzt."
        : null;
  const html = rahmen(
    [
      ueberschrift("Ihre Besichtigung ist morgen"),
      absatz(anrede),
      absatz(
        `nur zur Erinnerung: Ihre Besichtigung von <strong>${objektBezeichnung}</strong> steht an.`
      ),
      absatz(`<strong>${schuetzeText(zeit)}</strong><br>${schuetzeText(ort)}`),
      artSatz ? absatz(artSatz) : "",
      hinweiszeile(
        `Sollten Sie es doch nicht schaffen, sagen Sie bitte kurz ab, damit der Eigentümer Bescheid weiß: ${link}`
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    kern
  );
  const text = `${anrede}\n\nnur zur Erinnerung: Ihre Besichtigung von ${objektBezeichnung} steht an.\n\n${zeit}\n${ort}\n${artSatz ? `\n${artSatz}\n` : ""}\nSollten Sie es doch nicht schaffen, sagen Sie bitte kurz ab: ${link}`;
  return { betreff: `Erinnerung: Besichtigung am ${zeit}`, html, text };
}

/**
 * Der Interessent hat geantwortet, der Verkaeufer erfaehrt es.
 *
 * Diese Mail ist der Grund, warum der Verkaeufer nicht staendig ins
 * Konto schauen muss. Sie geht auch bei einer Absage raus: Eine Absage
 * ist fuer die Planung genauso wichtig wie eine Zusage.
 */
export function besichtigungRueckmeldungMail({
  name,
  interessentName,
  zeit,
  zugesagt,
  rueckmeldung,
  terminHinfaellig = false,
}: {
  name: string | null;
  interessentName: string;
  zeit: string;
  zugesagt: boolean;
  /** Freier Text des Interessenten, roh */
  rueckmeldung?: string | null;
  /**
   * Faellt der Termin durch DIESE Absage weg, weil niemand mehr
   * zugesagt hat? Der eine Satz entscheidet darueber, ob jemand am
   * Samstag umsonst hinfaehrt (Runde 9).
   */
  terminHinfaellig?: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/termine`;
  const kern = zugesagt
    ? `${interessentName} hat für den ${zeit} zugesagt.`
    : `${interessentName} hat für den ${zeit} abgesagt.`;
  const hinfaelligSatz =
    "Damit findet dieser Termin nicht mehr statt: Es hat jetzt niemand mehr zugesagt. Sie brauchen die Zeit nicht freizuhalten.";
  const html = rahmen(
    [
      ueberschrift(zugesagt ? "Eine Zusage ist da" : "Eine Absage ist da"),
      absatz(anrede),
      absatz(schuetzeText(kern)),
      rueckmeldung?.trim() ? zitat(schuetzeText(rueckmeldung.trim())) : "",
      !zugesagt && terminHinfaellig ? absatz(schuetzeText(hinfaelligSatz)) : "",
      zugesagt
        ? absatz(
            "Der Termin steht damit fest. Die Kalenderdatei finden Sie in Ihrem Konto unter Termine."
          )
        : absatz(
            "Sie können der Person direkt aus ihrer Akte heraus einen neuen Termin vorschlagen."
          ),
      knopf(link, "Termine ansehen"),
      benachrichtigungsFuss(),
    ]
      .filter(Boolean)
      .join("\n"),
    kern,
    "antwortbar"
  );
  const text = `${anrede}\n\n${kern}${
    rueckmeldung?.trim() ? `\n\n${rueckmeldung.trim()}` : ""
  }${!zugesagt && terminHinfaellig ? `\n\n${hinfaelligSatz}` : ""}\n\nTermine ansehen: ${link}${FUSS_TEXT}`;
  return {
    betreff: zugesagt ? `Zusage für den ${zeit}` : `Absage für den ${zeit}`,
    html,
    text,
  };
}

/**
 * Der Verkaeufer schreibt einem Interessenten.
 *
 * WARUM ES DIESE VORLAGE GIBT: Ohne sie muesste der Verkaeufer aus
 * seinem privaten Postfach schreiben und gaebe damit seine eigene
 * Adresse preis. Diese Mail geht ueber die objektbezogene
 * Schutz-Adresse raus (objekte.anfragen_alias).
 *
 * SOLANGE DER EMPFANG AUF DIESER ADRESSE NOCH NICHT STEHT, traegt die
 * Mail eine Antwort-Adresse, die direkt zum Verkaeufer fuehrt, und
 * sagt ihm das im Konto auch ehrlich. Die Route entscheidet das, nicht
 * die Vorlage.
 */
/**
 * Der persoenliche Expose-Link an einen Interessenten, in der Stimme
 * des VERKAEUFERS: kurzer Dank, ein Satz zum Objekt, der Link, offener
 * Schluss. Bewusst keine Rueckfragen zur Finanzierung und kein
 * Zeitplan; der Empfaenger hat bisher nur auf ein Bild geklickt.
 */
export function exposeLinkMail({
  name,
  objektart,
  ort,
  verkaeuferName,
  link,
  gueltigBis,
}: {
  name: string | null;
  objektart: "haus" | "wohnung" | "mehrfamilienhaus" | null;
  ort: string | null;
  /** Anzeigename des Verkaeufers fuer die Grussformel */
  verkaeuferName: string | null;
  link: string;
  /** Fertig formatiertes Datum */
  gueltigBis: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const label =
    objektart === "wohnung"
      ? "Wohnung"
      : objektart === "mehrfamilienhaus"
        ? "Mehrfamilienhaus"
        : objektart === "haus"
          ? "Haus"
          : "Immobilie";
  const inOrt = ort ? ` in ${ort}` : "";
  // "an meinem Haus" gegen "an meiner Wohnung": der kleine Unterschied,
  // der eine Vorlage wie einen Menschen klingen laesst
  const mein = label === "Wohnung" || label === "Immobilie" ? "meiner" : "meinem";
  const das = label === "Wohnung" || label === "Immobilie" ? "die" : "das";
  const betreff = `Ihr Exposé ${label === "Wohnung" ? "zur" : "zum"} ${label}${inOrt}`;
  /* DER LINK OEFFNET EINE SEITE, KEINE DATEI (21.08.2026). Vorher
     stand hier "das vollständige Exposé" und darunter ein Knopf
     "Exposé ansehen"; wer klickte, landete auf der Objektseite. Das
     Exposé als PDF liegt dort zum Herunterladen bereit, also stimmte
     es fast, und genau solche Fast-Wahrheiten sammeln sich an. Jetzt
     nennt der Satz beides und in der richtigen Reihenfolge. */
  const kern = `danke für Ihr Interesse an ${mein} ${label}${inOrt}. Damit Sie sich in Ruhe ein Bild machen können, finden Sie hier alle Angaben, Fotos und Grundrisse auf einer Seite, dazu das vollständige Exposé als PDF zum Herunterladen:`;
  const schluss = `Wenn Sie Fragen haben oder ${das} ${label} ansehen möchten, antworten Sie einfach auf diese Nachricht.`;
  const gruss = verkaeuferName
    ? `Freundliche Grüße<br/>${schuetzeText(verkaeuferName)}`
    : "Freundliche Grüße";
  const html = rahmen(
    [
      ueberschrift(betreff),
      absatz(anrede),
      absatz(kern),
      knopf(link, "Alles zum Objekt ansehen"),
      absatz(schluss),
      absatz(gruss),
      hinweiszeile(
        `Der Link gehört zu Ihrer Anfrage und ist bis zum ${gueltigBis} gültig.`
      ),
    ].join("\n"),
    kern,
    "antwortbar"
  );
  const text = `${anrede}\n\n${kern}\n\n${link}\n\n${schluss}\n\nFreundliche Grüße${verkaeuferName ? `\n${verkaeuferName}` : ""}\n\nDer Link gehört zu Ihrer Anfrage und ist bis zum ${gueltigBis} gültig.`;
  return { betreff, html, text };
}

export function nachrichtAnInteressentMail({
  name,
  objektBezeichnung,
  nachricht,
}: {
  name: string | null;
  objektBezeichnung: string;
  /** Der Text des Verkaeufers, roh */
  nachricht: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const html = rahmen(
    [
      ueberschrift(`Nachricht zu ${objektBezeichnung}`),
      absatz(anrede),
      absatz(
        `der Eigentümer von <strong>${objektBezeichnung}</strong> schreibt Ihnen:`
      ),
      zitat(schuetzeText(nachricht.trim())),
      hinweiszeile(
        "Sie können auf diese E-Mail direkt antworten. Ihre Antwort geht an den Eigentümer, nicht an uns."
      ),
    ].join("\n"),
    `Nachricht zu ${objektBezeichnung}`,
    "antwortbar"
  );
  const text = `${anrede}\n\nder Eigentümer von ${objektBezeichnung} schreibt Ihnen:\n\n${nachricht.trim()}\n\nSie können auf diese E-Mail direkt antworten.`;
  return { betreff: `Ihre Anfrage zu ${objektBezeichnung}`, html, text };
}

/* ------------------------------------------------------------------ */
/* Portalschaltung                                                     */
/* ------------------------------------------------------------------ */

/**
 * Ruhige Erinnerung vor dem Ende der Portalschaltung, ohne Draengen.
 * Der schlechteste Fall waere ein Inserat, das unbemerkt verschwindet;
 * der zweitschlechteste eine Mail, die klingt wie eine Drohung.
 * Deshalb steht hier auch, was NICHT endet: Konto, Expose und alle
 * Daten bleiben.
 */
export function schaltungEndetMail({
  name,
  objektBezeichnung,
  endeDatum,
  verlaengerungLabel,
  vorschlaegeAusPaket = false,
  vorschlaegeEinzeln = false,
}: {
  name: string | null;
  objektBezeichnung: string;
  /** Fertig formatiertes Datum, z. B. "12. Februar 2027" */
  endeDatum: string;
  /** z. B. "89 € je Monat (vorläufiger Preis)" */
  verlaengerungLabel: string;
  /** Enden die Antwortvorschlaege zusammen mit der Schaltung? */
  vorschlaegeAusPaket?: boolean;
  /** Einzeln dazugebucht, laeuft mit eigener Laufzeit weiter */
  vorschlaegeEinzeln?: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  /* EINE WARNUNG FUER BEIDE LEISTUNGEN (Entscheidung des Inhabers,
     30.08.2026). Zwei Mails am selben Tag ueber zwei Haelften
     derselben Sache waeren genau das Durcheinander, das wir
     abstellen. Die Antwortvorschlaege bekommen ihren eigenen Satz,
     WEIL sie unsichtbar sind: Ihr Fehlen merkt man erst an der
     naechsten Anfrage, und dann ist der Aerger schon da. */
  const vorschlaegeSatz = vorschlaegeEinzeln
    ? "Ihre KI-Antwortvorschläge laufen weiter, die haben Sie einzeln dazugebucht."
    : vorschlaegeAusPaket
      ? "Mit der Schaltung enden auch die KI-Antwortvorschläge. Neue Anfragen erreichen Sie weiterhin, Sie beantworten sie dann selbst."
      : null;
  /* AUF DEN WEG, DEN DIE MAIL ANBIETET, und nicht auf die Liste aller
     Leistungen: Die Verlaengerung war dort eine von zwei Dutzend
     Karten. Wer eingeladen wird, soll nicht suchen muessen. */
  const link = `${kontoBasis()}${VERLAENGERUNG_ANKER}`;
  const html = rahmen(
    [
      ueberschrift("Ihre Portalschaltung endet bald"),
      absatz(anrede),
      absatz(
        `die Portalschaltung für <strong>${objektBezeichnung}</strong> läuft noch bis zum <strong>${endeDatum}</strong>. Wenn Ihr Verkauf mehr Zeit braucht, verlängern Sie die Sichtbarkeit monatsweise (${verlaengerungLabel}).`
      ),
      ...(vorschlaegeSatz ? [absatz(vorschlaegeSatz)] : []),
      absatz(
        "Wenn Sie nichts tun, geht nur das Inserat offline. Ihr Konto, Ihre Objektdaten, das Exposé und alle Unterlagen bleiben unbefristet erhalten, und Sie können die Schaltung später jederzeit wieder aufnehmen."
      ),
      knopf(link, "Schaltung verlängern"),
      benachrichtigungsFuss(),
    ].join("\n"),
    "Ihre Portalschaltung endet bald.",
    "antwortbar"
  );
  const text = `${anrede}\n\ndie Portalschaltung für ${objektBezeichnung} läuft noch bis zum ${endeDatum}. Wenn Ihr Verkauf mehr Zeit braucht, verlängern Sie die Sichtbarkeit monatsweise (${verlaengerungLabel}).\n${vorschlaegeSatz ? `\n${vorschlaegeSatz}\n` : ""}\nWenn Sie nichts tun, geht nur das Inserat offline. Ihr Konto, Ihre Objektdaten, das Exposé und alle Unterlagen bleiben erhalten.\n\nSchaltung verlängern: ${link}${FUSS_TEXT}`;
  return { betreff: `Ihre Portalschaltung läuft bis ${endeDatum}`, html, text };
}

/**
 * Die Schaltung ist gekauft, aber noch nicht gestartet, und die Frist
 * dafuer laeuft in zwei Monaten ab.
 *
 * ---------------------------------------------------------------------
 * WARUM ZWEI MONATE UND NICHT VIERZEHN TAGE
 * ---------------------------------------------------------------------
 * Beim ENDE der Schaltung genuegen vierzehn Tage, weil ein Knopf zum
 * Verlaengern danebensteht. Hier muss der Kunde etwas TUN: Fotos,
 * Unterlagen, Energieausweis, und ein Teil davon haengt an Aemtern mit
 * eigener Geschwindigkeit. Vierzehn Tage waeren eine Nachricht, auf
 * die niemand mehr reagieren kann.
 *
 * DER AUSGANG STEHT IN DERSELBEN PASSAGE WIE DIE FRIST. Sonst liest
 * man nur die Frist, und aus einem Hinweis wird eine Drohung.
 */
export function schaltungStartErinnerungMail({
  name,
  objektBezeichnung,
  fristDatum,
}: {
  name: string | null;
  objektBezeichnung: string;
  /** Fertig formatiertes Datum, z. B. "31. August 2027" */
  fristDatum: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/konto/objekt`;
  const textEins = `Sie haben die Portalschaltung für ${objektBezeichnung} gekauft, veröffentlicht ist Ihr Inserat noch nicht. Das ist in Ordnung: Die sechs Monate beginnen erst mit dem Online-Gang, für die Vorbereitungszeit zahlen Sie nichts.`;
  const textZwei = `Ein Datum sollten Sie sich trotzdem notieren. Bis zum ${fristDatum} können Sie die Schaltung starten. Danach endet Ihr Anspruch darauf, und Sie buchen sie zum dann gültigen Preis neu. Alles andere aus Ihrem Paket bleibt Ihnen erhalten.`;
  const textDrei = "In Ihrem Konto sehen Sie, was für die Veröffentlichung noch fehlt.";
  const html = rahmen(
    [
      ueberschrift("Ihre Portalschaltung wartet auf den Start"),
      absatz(anrede),
      absatz(
        `Sie haben die Portalschaltung für <strong>${objektBezeichnung}</strong> gekauft, veröffentlicht ist Ihr Inserat noch nicht. Das ist in Ordnung: Die sechs Monate beginnen erst mit dem Online-Gang, für die Vorbereitungszeit zahlen Sie nichts.`
      ),
      absatz(
        `Ein Datum sollten Sie sich trotzdem notieren. Bis zum <strong>${fristDatum}</strong> können Sie die Schaltung starten. Danach endet Ihr Anspruch darauf, und Sie buchen sie zum dann gültigen Preis neu. Alles andere aus Ihrem Paket bleibt Ihnen erhalten.`
      ),
      absatz(textDrei),
      knopf(link, "Zu Ihrem Objekt"),
      benachrichtigungsFuss(),
    ].join("\n"),
    "Ihre Portalschaltung wartet auf den Start.",
    "antwortbar"
  );
  /* AUS DEN ROHWERTEN, nicht aus dem HTML: schuetzeText() maskiert fuer
     HTML, und wer sein Ergebnis weiterreicht, schleppt die Maskierung
     in die Nur-Text-Fassung (npm run mail-text:pruefen). */
  const text = `${anrede}\n\n${textEins}\n\n${textZwei}\n\n${textDrei}\n\nZu Ihrem Objekt: ${link}${FUSS_TEXT}`;
  return {
    betreff: "Ihre Portalschaltung wartet noch auf den Start",
    html,
    text,
  };
}

/* ------------------------------------------------------------------ */
/* Kuendigung ueber die oeffentliche Stelle                            */
/* ------------------------------------------------------------------ */

/**
 * Empfangsbestaetigung in Textform fuer eine Kuendigung ueber
 * /kuendigen, mit Datum und Uhrzeit des Eingangs (§ 312k BGB
 * sinngemaess). Der Empfaenger hat nicht zwingend ein Konto bei uns,
 * deshalb kein Verweis auf Konto-Einstellungen und keine Anrede aus
 * Profildaten, sondern der Name aus dem Formular.
 *
 * TODO Anwalt: Wortlaut der Bestaetigung ist eine Arbeitsfassung,
 * siehe config/vertragstexte.ts.
 */
export function kuendigungEingangMail({
  name,
  leistung,
  zumWunsch,
  eingegangenAm,
}: {
  name: string;
  leistung: string;
  /** "frühestmöglich" oder ein Wunschdatum als Text */
  zumWunsch: string;
  /** ISO-Zeitpunkt des gespeicherten Eingangs */
  eingegangenAm: string;
}): MailInhalt {
  const zeitpunkt = formatDatumZeit(eingegangenAm);
  const anrede = `Guten Tag ${schuetzeText(name)},`;
  const html = rahmen(
    [
      ueberschrift("Eingang Ihrer Kündigung"),
      absatz(anrede),
      absatz(
        `hiermit bestätigen wir den Eingang Ihrer Kündigungserklärung am <strong>${zeitpunkt}</strong>.`
      ),
      absatz(
        `Gekündigte Leistung laut Ihrer Angabe: <strong>${schuetzeText(leistung)}</strong>, gewünschter Zeitpunkt: <strong>${schuetzeText(zumWunsch)}</strong>.`
      ),
      absatz(
        "Wir ordnen Ihre Erklärung jetzt dem Vertrag zu und bestätigen Ihnen anschließend den Zeitpunkt, zu dem die Leistung endet. Ihr Konto, Ihre Objektdaten, das Exposé und alle Unterlagen bleiben in jedem Fall erhalten."
      ),
      hinweiszeile(
        "Wenn Sie diese Kündigung nicht selbst abgeschickt haben, antworten Sie bitte kurz auf diese E-Mail. Ohne Zuordnung zu Ihrem Vertrag endet nichts automatisch."
      ),
    ].join("\n"),
    "Wir bestätigen den Eingang Ihrer Kündigung.",
    "antwortbar"
  );
  const text = `Guten Tag ${name},\n\nhiermit bestätigen wir den Eingang Ihrer Kündigungserklärung am ${zeitpunkt}.\n\nGekündigte Leistung laut Ihrer Angabe: ${leistung}, gewünschter Zeitpunkt: ${zumWunsch}.\n\nWir ordnen Ihre Erklärung jetzt dem Vertrag zu und bestätigen Ihnen anschließend den Zeitpunkt, zu dem die Leistung endet. Ihr Konto, Ihre Objektdaten, das Exposé und alle Unterlagen bleiben in jedem Fall erhalten.\n\nWenn Sie diese Kündigung nicht selbst abgeschickt haben, antworten Sie bitte kurz auf diese E-Mail.\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: "Eingangsbestätigung Ihrer Kündigung", html, text };
}

/**
 * DIE LEISTUNG IST JETZT WIRKLICH BEENDET (Runde 44, 30.08.2026).
 *
 * =====================================================================
 * WARUM ES SIE GIBT
 * =====================================================================
 * Bis zum 30.08.2026 erfuhr ein Kunde NICHTS, wenn seine Kuendigung
 * wirksam wurde. Die Zeile im Konto verschwand am Stichtag einfach,
 * weil die Leistungs-Seite auf status = 'aktiv' filtert.
 *
 * Und die Empfangsbestaetigung nach Paragraf 312k versprach woertlich
 * eine zweite Mail: "Wir ordnen Ihre Erklaerung jetzt dem Vertrag zu
 * und bestaetigen Ihnen anschliessend den Zeitpunkt, zu dem die
 * Leistung endet." Diese Mail ist sie.
 *
 * =====================================================================
 * WAS DRINSTEHT, UND WARUM IN DIESER REIHENFOLGE
 * =====================================================================
 *   1. Was endet und ab wann. Zuerst, weil er deswegen liest.
 *   2. Die letzte Abbuchung, damit er sie auf dem Kontoauszug
 *      zuordnen kann und nicht bei uns nachfragen muss.
 *   3. Was BLEIBT. Der Satz kommt aus config/vertragstexte.ts und ist
 *      derselbe wie im Kuendigungs-Dialog und in der
 *      Bestellbestaetigung; drei Orte, ein Wortlaut.
 *   4. Der Weg zurueck, in einem Satz.
 *
 * KEIN WERBEN. Wer gerade gekuendigt hat, will keine Rueckgewinnung
 * lesen. Ein Satz, wie er zurueckkommt, reicht (Auflage aus der
 * Vorlage zu Runde 43).
 *
 * DIE MINDESTLAUFZEIT WIRD NUR GENANNT, WO ES SIE GIBT. Beim Paket
 * beginnt sie beim Neubuchen von vorn, bei der Makler-Begleitung gibt
 * es keine; ein pauschaler Satz waere fuer die Haelfte der Faelle
 * falsch.
 */
export function kuendigungWirksamMail({
  name,
  leistung,
  endeDatum,
  letzteAbbuchung,
  mitMindestlaufzeit,
}: {
  name: string | null;
  /** Anzeigename der Leistung, aus config/auftraege.ts oder site.config */
  leistung: string;
  /** Der Tag, zu dem sie geendet hat, als fertiger Text */
  endeDatum: string;
  /**
   * Der Monat, fuer den zuletzt abgebucht wurde, als fertiger Text.
   * NULL, wo es keine Abbuchung gab (von Hand vergebene Buchung); dann
   * faellt der Satz weg, statt eine Zahlung zu behaupten.
   */
  letzteAbbuchung: string | null;
  /** Beginnt beim Neubuchen eine Mindestlaufzeit? */
  mitMindestlaufzeit: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${schuetzeText(name)},` : "Guten Tag,";
  const kopf = `${schuetzeText(leistung)} ist beendet`;
  const kern = `Ihre Leistung <strong>${schuetzeText(leistung)}</strong> ist zum <strong>${schuetzeText(endeDatum)}</strong> beendet. Ab jetzt buchen wir dafür nichts mehr ab.`;
  const abbuchung = letzteAbbuchung
    ? `Die letzte Abbuchung war für ${schuetzeText(letzteAbbuchung)}. Angefangene Monate führen wir zu Ende und rechnen sie nicht anteilig ab; so steht es auch in Ihrer Bestellbestätigung.`
    : null;
  const zurueck = mitMindestlaufzeit
    ? "Sie möchten weitermachen? Sie können die Leistung jederzeit in Ihrem Konto wieder buchen. Damit beginnt die Mindestlaufzeit von vorn."
    : "Sie möchten weitermachen? Sie können die Leistung jederzeit in Ihrem Konto wieder buchen.";
  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(kern),
      abbuchung ? absatz(abbuchung) : "",
      absatz(KUENDIGUNG_BLEIBT_HINWEIS),
      absatz(zurueck),
      knopf(`${kontoBasis()}/konto/leistungen`, "Zu Ihren Leistungen"),
      hinweiszeile(
        "Diese Bestätigung bekommen Sie immer, wenn eine Leistung endet. Sie lässt sich nicht abbestellen, weil damit ein Vertrag und eine Abbuchung enden."
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    kern.replace(/<[^>]+>/g, ""),
    "antwortbar"
  );
  const text = `${anrede}\n\nIhre Leistung ${leistung} ist zum ${endeDatum} beendet. Ab jetzt buchen wir dafür nichts mehr ab.${
    letzteAbbuchung
      ? `\n\nDie letzte Abbuchung war für ${letzteAbbuchung}. Angefangene Monate führen wir zu Ende und rechnen sie nicht anteilig ab.`
      : ""
  }\n\n${KUENDIGUNG_BLEIBT_HINWEIS}\n\n${zurueck}\n\nZu Ihren Leistungen: ${kontoBasis()}/konto/leistungen\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: `${leistung} ist beendet`, html, text };
}

/**
 * DER VERKAUF IST EINGETRAGEN (Runde 44, 30.08.2026).
 *
 * =====================================================================
 * WARUM ES SIE GIBT
 * =====================================================================
 * Das Melden eines Verkaufs beendet DREI Dinge auf einmal: das
 * Inserat sofort und ohne Erstattung, die laufenden monatlichen
 * Buchungen zum Monatsende, und es startet eine Sechs-Monats-Frist auf
 * saemtliche Interessenten-Akten. Bis zum 30.08.2026 gab es dazu
 * KEINE Mail und keine Glocken-Zeile; nur das Team bekam eine Meldung.
 *
 * Der Dialog warnt vorher, und das ist gut. Diese Mail gibt dem Kunden
 * dasselbe schriftlich, denn ein Dialog ist nach dem Klick weg.
 *
 * =====================================================================
 * DER TON
 * =====================================================================
 * Der Inhaber: "Es ist ein guter Moment fuer den Kunden, er hat gerade
 * sein Haus verkauft, und trotzdem verliert er dabei etwas." Deshalb
 * steht der Glueckwunsch zuerst und ohne Einschraenkung, und der
 * Dank fuer die Meldung gleich daneben: Wer uns Bescheid gibt, tut uns
 * einen Gefallen, auch wenn es ihn etwas kostet.
 *
 * KEINE RECHTFERTIGUNG. Der Satz "darauf haben wir Sie hingewiesen"
 * ist nicht drin; er verteidigt uns, statt ihn zu informieren.
 * Stattdessen: "damit Sie es schwarz auf weiss haben".
 */
export function verkaufGemeldetMail({
  name,
  verkauftAm,
  verkaufspreisText,
  schaltungLief,
  monatlicheLeistungen,
}: {
  name: string | null;
  /** Verkaufsdatum als fertiger Text */
  verkauftAm: string;
  /** Der Preis, falls angegeben. Ohne Angabe faellt der Satz weg. */
  verkaufspreisText: string | null;
  /**
   * Das beendete Inserat: seit wann es lief, bis wann es gelaufen
   * waere, und wie lange das noch gewesen waere. NULL, wenn gar kein
   * Inserat online war; dann gibt es nichts zu beenden und der ganze
   * Absatz faellt weg.
   */
  schaltungLief: { seit: string; bis: string; rest: string } | null;
  /**
   * Die monatlichen Leistungen, die enden, und wann. Leer beim
   * Einmalkauf; dort endet ausser dem Inserat nichts.
   */
  monatlicheLeistungen: { namen: string[]; endetAm: string } | null;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${schuetzeText(name)},` : "Guten Tag,";
  const kopf = "Ihr Verkauf ist eingetragen";
  const glueckwunsch = verkaufspreisText
    ? `Glückwunsch zum Verkauf, und danke, dass Sie uns Bescheid gegeben haben. Wir haben eingetragen: verkauft am <strong>${schuetzeText(verkauftAm)}</strong> zu <strong>${schuetzeText(verkaufspreisText)}</strong>.`
    : `Glückwunsch zum Verkauf, und danke, dass Sie uns Bescheid gegeben haben. Wir haben eingetragen: verkauft am <strong>${schuetzeText(verkauftAm)}</strong>.`;
  const inserat = schaltungLief
    ? `<strong>Ihr Inserat ist beendet.</strong> Es lief seit dem ${schuetzeText(schaltungLief.seit)} und wäre noch bis zum ${schuetzeText(schaltungLief.bis)} gelaufen; diese Zeit, also noch ${schuetzeText(schaltungLief.rest)}, ist mit Ihrer Meldung beendet und wird nicht erstattet. Das stand vor dem Eintragen im Hinweis, und wir schreiben es hier noch einmal, damit Sie es schwarz auf weiß haben.`
    : null;
  const leistungen = monatlicheLeistungen
    ? `<strong>${schuetzeText(monatlicheLeistungen.namen.join(" und "))}</strong> ${monatlicheLeistungen.namen.length > 1 ? "enden" : "endet"} zum ${schuetzeText(monatlicheLeistungen.endetAm)}. Für den angefangenen Monat haben wir zuletzt abgebucht; danach buchen wir nichts mehr ab.`
    : "Außer dem Inserat endet nichts: Ihr Konto und alle Leistungen können Sie weiter wie bisher nutzen.";
  const akten =
    "<strong>Ihre Interessenten-Akten</strong> mit allen Anfragen, Nachrichten, Besichtigungen und Nachweisen löschen wir sechs Monate nach der Verkaufsmeldung. Wenn Sie etwas davon aufbewahren möchten, laden Sie es vorher in Ihrem Konto herunter.";
  const zurueck =
    "<strong>Falls der Notartermin doch noch platzt:</strong> Sie können den Verkauf in Ihrem Konto zurücknehmen, Ihre Objektseite ist dann wieder erreichbar. Das Portal-Inserat und die beendeten Leistungen kommen dabei nicht von selbst zurück; schreiben Sie uns kurz, wir richten das ein.";

  const html = rahmen(
    [
      ueberschrift(kopf),
      absatz(anrede),
      absatz(glueckwunsch),
      inserat ? absatz(inserat) : "",
      absatz(leistungen),
      absatz(akten),
      absatz(KUENDIGUNG_BLEIBT_HINWEIS),
      absatz(zurueck),
      knopf(`${kontoBasis()}/konto/leistungen`, "Zu Ihrem Konto"),
      hinweiszeile(
        "Diese Bestätigung bekommen Sie immer, wenn Sie einen Verkauf melden. Sie lässt sich nicht abbestellen, weil damit Verträge enden und Fristen beginnen."
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    "Ihr Verkauf ist eingetragen.",
    "antwortbar"
  );
  /* DIE TEXT-FASSUNG AUS DEN ROHWERTEN, nicht aus dem HTML.
     Der erste Entwurf strich nur die Tags heraus; die ENTITIES blieben
     stehen, und im Text stand "Paket Selbst &amp; Sicher" (gemessen am
     30.08.2026). schuetzeText ist fuer HTML da, und wer sein Ergebnis
     im Text weiterverwendet, schleppt die Maskierung mit. */
  const textGlueckwunsch = verkaufspreisText
    ? `Glückwunsch zum Verkauf, und danke, dass Sie uns Bescheid gegeben haben. Wir haben eingetragen: verkauft am ${verkauftAm} zu ${verkaufspreisText}.`
    : `Glückwunsch zum Verkauf, und danke, dass Sie uns Bescheid gegeben haben. Wir haben eingetragen: verkauft am ${verkauftAm}.`;
  const textInserat = schaltungLief
    ? `Ihr Inserat ist beendet. Es lief seit dem ${schaltungLief.seit} und wäre noch bis zum ${schaltungLief.bis} gelaufen; diese Zeit, also noch ${schaltungLief.rest}, ist mit Ihrer Meldung beendet und wird nicht erstattet. Das stand vor dem Eintragen im Hinweis, und wir schreiben es hier noch einmal, damit Sie es schwarz auf weiß haben.`
    : null;
  const textLeistungen = monatlicheLeistungen
    ? `${monatlicheLeistungen.namen.join(" und ")} ${monatlicheLeistungen.namen.length > 1 ? "enden" : "endet"} zum ${monatlicheLeistungen.endetAm}. Für den angefangenen Monat haben wir zuletzt abgebucht; danach buchen wir nichts mehr ab.`
    : "Außer dem Inserat endet nichts: Ihr Konto und alle Leistungen können Sie weiter wie bisher nutzen.";
  const textAkten =
    "Ihre Interessenten-Akten mit allen Anfragen, Nachrichten, Besichtigungen und Nachweisen löschen wir sechs Monate nach der Verkaufsmeldung. Wenn Sie etwas davon aufbewahren möchten, laden Sie es vorher in Ihrem Konto herunter.";
  const textZurueck =
    "Falls der Notartermin doch noch platzt: Sie können den Verkauf in Ihrem Konto zurücknehmen, Ihre Objektseite ist dann wieder erreichbar. Das Portal-Inserat und die beendeten Leistungen kommen dabei nicht von selbst zurück; schreiben Sie uns kurz, wir richten das ein.";
  const text = `${anrede}\n\n${textGlueckwunsch}${
    textInserat ? `\n\n${textInserat}` : ""
  }\n\n${textLeistungen}\n\n${textAkten}\n\n${KUENDIGUNG_BLEIBT_HINWEIS}\n\n${textZurueck}\n\nZu Ihrem Konto: ${kontoBasis()}/konto/leistungen\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: kopf, html, text };
}

/* ------------------------------------------------------------------ */
/* Die Bestellbestaetigung der Kasse (EINE Mail nach der Bestellung)   */
/* ------------------------------------------------------------------ */

export type BestellMailPosition = {
  /** Name, wie der Kunde ihn in der Kasse gesehen hat */
  name: string;
  /** Betrag als fertiger Text, z. B. "699 €" oder "169 € je Monat" */
  betragText: string;
};

/**
 * Die EINE Mail nach der Bestellung (entschieden am 12.08.2026):
 * Bestellbestaetigung, Laufzeiten und Kuendigungsfristen im Klartext,
 * die dokumentierte Zustimmung zum sofortigen Beginn, der Weg zur
 * Rechnung und der Passwort-Knopf fuer das frisch angelegte Konto.
 * Drei Mails hintereinander saehen aus wie ein Fehler, und niemand
 * wuesste, welche die wichtige ist.
 *
 * Varianten ueber Parameter statt eigener Vorlagen:
 * - kontoLink gesetzt: neues Konto, Knopf zum Passwort-Setzen
 *   (24 Stunden gueltig, steht ehrlich dabei).
 * - kontoBestehend: die Buchung liegt im vorhandenen Konto.
 * - zahlungOffen: Lastschrift schwebt noch, die Leistungen schalten
 *   mit dem Zahlungseingang frei (die Mail sagt das ruhig).
 */
export function bestellBestaetigungMail({
  name,
  positionenEinmalig,
  positionenMonatlich,
  positionenSpaeter,
  rabattText,
  gutscheinCode = null,
  gutscheinBetragText = null,
  summeEinmaligText,
  summeMonatlichText,
  laufzeitSaetze,
  widerrufZustimmungText,
  zahlungOffen,
  kontoLink,
  kontoBestehend,
}: {
  name: string;
  positionenEinmalig: BestellMailPosition[];
  positionenMonatlich: BestellMailPosition[];
  /** Makler-Begleitung: beginnt erst mit der Zuweisung */
  positionenSpaeter: BestellMailPosition[];
  rabattText: string | null;
  /** Eingeloester Gutschein: eigene Zeile mit Code und Betrag */
  gutscheinCode?: string | null;
  gutscheinBetragText?: string | null;
  summeEinmaligText: string | null;
  summeMonatlichText: string | null;
  laufzeitSaetze: string[];
  widerrufZustimmungText: string;
  zahlungOffen: boolean;
  kontoLink: string | null;
  kontoBestehend: boolean;
}): MailInhalt {
  const anrede = `Guten Tag ${name},`;
  /* Zweispaltig statt "Name: Betrag" in einer Zeile: Der Betrag bleibt
     auf Hoehe seiner Bezeichnung, auch auf einem schmalen Bildschirm.
     Siehe betragsBlock() in lib/mail-rahmen.ts. */
  const zeile = (p: BestellMailPosition): BetragsZeile => ({
    label: schuetzeText(p.name),
    betrag: schuetzeText(p.betragText),
  });
  const uebersicht: BetragsZeile[] = [];
  if (positionenEinmalig.length > 0) {
    uebersicht.push({ label: "Einmalig", stark: true });
    uebersicht.push(...positionenEinmalig.map(zeile));
    if (rabattText) {
      uebersicht.push({
        label: "Sofortzahlungs-Rabatt, nur auf einmalige Posten",
        betrag: schuetzeText(rabattText),
      });
    }
    if (gutscheinCode && gutscheinBetragText) {
      uebersicht.push({
        label: `Gutschein ${schuetzeText(gutscheinCode)}`,
        betrag: schuetzeText(gutscheinBetragText),
      });
    }
    if (summeEinmaligText) {
      uebersicht.push({
        label: "Einmalig gesamt",
        betrag: schuetzeText(summeEinmaligText),
        stark: true,
      });
    }
  }
  if (positionenMonatlich.length > 0) {
    if (uebersicht.length > 0) uebersicht.push({ label: "&nbsp;" });
    uebersicht.push({ label: "Monatlich", stark: true });
    uebersicht.push(...positionenMonatlich.map(zeile));
    if (summeMonatlichText) {
      uebersicht.push({
        label: "Monatlich gesamt",
        betrag: schuetzeText(summeMonatlichText),
        stark: true,
      });
    }
  }
  if (positionenSpaeter.length > 0) {
    if (uebersicht.length > 0) uebersicht.push({ label: "&nbsp;" });
    uebersicht.push(...positionenSpaeter.map(zeile));
    uebersicht.push({
      label:
        "Beginnt erst, wenn Ihnen Ihr persönlicher Ansprechpartner zugewiesen ist. Bis dahin zahlen Sie dafür nichts.",
      leise: true,
    });
  }
  uebersicht.push({ label: schuetzeText(siteConfig.vatNote), leise: true });

  const teile: string[] = [
    ueberschrift("Vielen Dank für Ihre Bestellung"),
    absatz(anrede),
    absatz(
      zahlungOffen
        ? "Ihre Bestellung ist eingegangen. Ihre Bank bestätigt die Abbuchung noch; das dauert bei Lastschrift üblicherweise wenige Tage. Sie müssen nichts weiter tun, wir schalten Ihre Leistungen frei, sobald die Zahlung bestätigt ist."
        : "Ihre Bestellung ist eingegangen und Ihre Zahlung ist bestätigt. Wir legen los."
    ),
    betragsBlock(uebersicht),
  ];
  if (laufzeitSaetze.length > 0) {
    teile.push(zwischenueberschrift("Laufzeit und Kündigung"));
    for (const satz of laufzeitSaetze) teile.push(hinweiszeile(schuetzeText(satz)));
  }
  teile.push(
    absatz(
      zahlungOffen
        ? "Ihre Rechnung folgt in einer eigenen E-Mail, sobald Ihre Bank die Abbuchung bestätigt hat; Sie müssen dafür nichts tun. Danach liegt sie auch jederzeit in Ihrem Konto unter Leistungen, wie alle künftigen Rechnungen."
        : "Ihre Rechnung erhalten Sie in einer eigenen E-Mail als PDF. Sie liegt außerdem jederzeit in Ihrem Konto unter Leistungen, dort finden Sie auch alle künftigen Rechnungen."
    )
  );
  if (kontoLink) {
    teile.push(
      absatz(
        "Ihr Konto ist angelegt. Mit einem Klick setzen Sie Ihr persönliches Passwort und sehen Ihre Bestellung, Ihre Rechnungen und alle nächsten Schritte."
      ),
      knopf(kontoLink, "Passwort setzen und ins Konto"),
      hinweiszeile(
        "Der Link ist 24 Stunden gültig und funktioniert nur für diese E-Mail-Adresse. Ist er abgelaufen, fordern Sie auf der Anmeldeseite über „Passwort vergessen“ mit derselben Adresse einfach einen neuen an."
      )
    );
  } else if (kontoBestehend) {
    teile.push(
      absatz(
        "Diese Bestellung liegt in Ihrem bestehenden Konto. Melden Sie sich wie gewohnt an, dort finden Sie die neuen Leistungen und Ihre Rechnung."
      ),
      knopf(`${kontoBasis()}/login`, "Zum Konto")
    );
  }
  teile.push(
    zwischenueberschrift("Widerruf"),
    hinweiszeile(
      "Verbrauchern steht bei online geschlossenen Verträgen ein vierzehntägiges Widerrufsrecht zu. Sie haben dem sofortigen Beginn der Ausführung zugestimmt:"
    ),
    zitat(schuetzeText(widerrufZustimmungText))
  );

  const html = rahmen(
    teile.join("\n"),
    zahlungOffen
      ? "Ihre Bestellung ist eingegangen, die Zahlung wird bestätigt."
      : "Ihre Bestellung und Zahlung sind bestätigt.",
    "antwortbar"
  );

  const textZeilen: string[] = [anrede, ""];
  textZeilen.push(
    zahlungOffen
      ? "Ihre Bestellung ist eingegangen. Ihre Bank bestätigt die Abbuchung noch; das dauert bei Lastschrift üblicherweise wenige Tage. Wir schalten Ihre Leistungen frei, sobald die Zahlung bestätigt ist."
      : "Ihre Bestellung ist eingegangen und Ihre Zahlung ist bestätigt."
  );
  textZeilen.push("");
  if (positionenEinmalig.length > 0) {
    textZeilen.push("Einmalig:");
    for (const p of positionenEinmalig) textZeilen.push(`  ${p.name}: ${p.betragText}`);
    if (rabattText) textZeilen.push(`  Sofortzahlungs-Rabatt, nur auf einmalige Posten: ${rabattText}`);
    if (gutscheinCode && gutscheinBetragText) {
      textZeilen.push(`  Gutschein ${gutscheinCode}: ${gutscheinBetragText}`);
    }
    if (summeEinmaligText) textZeilen.push(`  Einmalig gesamt: ${summeEinmaligText}`);
  }
  if (positionenMonatlich.length > 0) {
    textZeilen.push("Monatlich:");
    for (const p of positionenMonatlich) textZeilen.push(`  ${p.name}: ${p.betragText}`);
    if (summeMonatlichText) textZeilen.push(`  Monatlich gesamt: ${summeMonatlichText}`);
  }
  for (const p of positionenSpaeter) {
    textZeilen.push(`${p.name}: ${p.betragText}, beginnt erst mit der Zuweisung Ihres Ansprechpartners.`);
  }
  textZeilen.push(siteConfig.vatNote);
  if (laufzeitSaetze.length > 0) {
    textZeilen.push("", "Laufzeit und Kündigung:");
    for (const satz of laufzeitSaetze) textZeilen.push(`  ${satz}`);
  }
  textZeilen.push(
    "",
    zahlungOffen
      ? "Ihre Rechnung folgt in einer eigenen E-Mail, sobald Ihre Bank die Abbuchung bestätigt hat; Sie müssen dafür nichts tun. Danach liegt sie auch in Ihrem Konto unter Leistungen."
      : "Ihre Rechnung erhalten Sie in einer eigenen E-Mail als PDF. Sie liegt außerdem jederzeit in Ihrem Konto unter Leistungen."
  );
  if (kontoLink) {
    textZeilen.push(
      "",
      "Ihr Konto ist angelegt. Setzen Sie Ihr Passwort über diesen Link (24 Stunden gültig):",
      kontoLink,
      "Ist er abgelaufen, fordern Sie über „Passwort vergessen“ mit derselben Adresse einen neuen an."
    );
  } else if (kontoBestehend) {
    textZeilen.push("", `Diese Bestellung liegt in Ihrem bestehenden Konto: ${kontoBasis()}/login`);
  }
  textZeilen.push(
    "",
    "Widerruf: Verbrauchern steht ein vierzehntägiges Widerrufsrecht zu. Sie haben dem sofortigen Beginn zugestimmt:",
    widerrufZustimmungText,
    "",
    "Ihr Team von selbst-verkauf.de"
  );

  return {
    betreff: "Ihre Bestellung bei selbst-verkauf.de",
    html,
    text: textZeilen.join("\n"),
  };
}

/**
 * Die Rechnungs-Mail: eine ZUSTELLUNG, keine Ansprache. Kurz gehalten
 * (Betreff, zwei Saetze, Anhang, Verweis ins Konto), denn die Rechnung
 * selbst ist der Inhalt; sie haengt als PDF an. Ausgeloest von Stripes
 * invoice.paid, fuer die erste Rechnung genauso wie fuer jede
 * monatliche Folgerechnung.
 */
export function rechnungMail({
  name,
  nummer,
  betragText,
}: {
  name: string | null;
  /** Rechnungsnummer aus Stripe, ohne Nummer bleibt der Betreff allgemein */
  nummer: string | null;
  betragText: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const bezeichnung = nummer ? `Ihre Rechnung ${nummer}` : "Ihre Rechnung";
  const html = rahmen(
    [
      ueberschrift(bezeichnung),
      absatz(anrede),
      absatz(
        `${bezeichnung} über ${schuetzeText(betragText)} liegt dieser E-Mail als PDF bei. Sie finden sie außerdem jederzeit in Ihrem Konto unter Leistungen, zusammen mit allen weiteren Rechnungen.`
      ),
      knopf(`${kontoBasis()}/konto/leistungen`, "Zum Konto"),
    ].join("\n"),
    "Ihre Rechnung als PDF im Anhang.",
    "antwortbar"
  );
  const text = `${anrede}\n\n${bezeichnung} über ${betragText} liegt dieser E-Mail als PDF bei. Sie finden sie außerdem jederzeit in Ihrem Konto unter Leistungen:\n\n${kontoBasis()}/konto/leistungen\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: bezeichnung, html, text };
}

/** Eine Abo-Abbuchung ist gescheitert: freundlich, mit Loesungsweg */
export function zahlungFehlgeschlagenMail({
  name,
  leistungen,
}: {
  name: string;
  leistungen: string[];
}): MailInhalt {
  const anrede = `Guten Tag ${name},`;
  const liste = leistungen.join(", ");
  const html = rahmen(
    [
      ueberschrift("Eine Abbuchung hat nicht geklappt"),
      absatz(anrede),
      absatz(
        `die monatliche Abbuchung für ${schuetzeText(liste)} ließ sich gerade nicht ausführen. Das passiert schnell, meistens ist nur eine Karte abgelaufen oder das Konto kurz nicht gedeckt.`
      ),
      absatz(
        "Ihre Leistungen laufen ganz normal weiter. Die Abbuchung wird in den nächsten Tagen automatisch erneut versucht; Sie können Ihre Zahlungsart auch direkt in Ihrem Konto aktualisieren."
      ),
      knopf(`${kontoBasis()}/konto/zahlung`, "Zahlungsart prüfen"),
      hinweiszeile(
        "Wenn Sie Fragen dazu haben, antworten Sie einfach auf diese E-Mail, wir kümmern uns."
      ),
    ].join("\n"),
    "Eine Abbuchung hat nicht geklappt, Ihre Leistungen laufen weiter.",
    "antwortbar"
  );
  const text = `${anrede}\n\ndie monatliche Abbuchung für ${liste} ließ sich gerade nicht ausführen. Meistens ist nur eine Karte abgelaufen oder das Konto kurz nicht gedeckt.\n\nIhre Leistungen laufen ganz normal weiter. Die Abbuchung wird in den nächsten Tagen automatisch erneut versucht. Ihre Zahlungsart aktualisieren Sie hier:\n\n${kontoBasis()}/konto/zahlung\n\nWenn Sie Fragen haben, antworten Sie einfach auf diese E-Mail.\n\nIhr Team von selbst-verkauf.de`;
  return { betreff: "Eine Abbuchung hat nicht geklappt", html, text };
}

/* ------------------------------------------------------------------ */
/* Das gemeinsame Erinnerungsverfahren (lib/wartet.ts)                 */
/*                                                                     */
/* VIER VORLAGEN FUER DREIZEHN SORTEN, und das ist der ganze Zweck:    */
/* Wer eine vierzehnte Sorte ergaenzt, schreibt einen Satz in den      */
/* Katalog und keine neue Mail.                                        */
/*                                                                     */
/* EINE MAIL JE EMPFAENGER, nicht je Vorgang. Wer drei offene Anfragen */
/* hat, bekommt einen Brief ueber drei Anfragen. Das ist die wichtigste */
/* der drei Bremsen gegen das Zuschuetten.                             */
/* ------------------------------------------------------------------ */

/** Eine Zeile der Aufzaehlung: was wartet und seit wann */
export type WartetZeile = { text: string; alter: string };

function wartetListe(zeilen: WartetZeile[]): string {
  return liste(
    zeilen
      .map(
        (z) =>
          `<li style="margin:0 0 6px;">${schuetzeText(z.text)} <span class="sv-gedaempft">(${schuetzeText(z.alter)})</span></li>`
      )
      .join("\n")
  );
}

function wartetTextliste(zeilen: WartetZeile[]): string {
  return zeilen.map((z) => `- ${z.text} (${z.alter})`).join("\n");
}

/**
 * An den VERKAEUFER: etwas in seinem Konto wartet auf ihn.
 *
 * DER TON IST DER GANZE PUNKT. Wer drei Tage nicht geantwortet hat,
 * hat vielleicht Urlaub und nicht vergessen. Deshalb steht der Ausweg
 * VOR dem Rat: Wer laengst ausserhalb des Kontos geantwortet hat, soll
 * das lesen, bevor ihm jemand erklaert, wie Verkaufen geht. Keine
 * Frist, keine Mahnung, kein Ausrufezeichen.
 *
 * Bei genau einer offenen Anfrage liest sich die Mail wie ein Brief
 * ueber diese eine Anfrage; bei mehreren wird daraus eine Liste, ohne
 * dass der Ton sich aendert.
 */
export function wartetKundeMail({
  name,
  zeilen,
  letzte,
}: {
  name: string | null;
  zeilen: WartetZeile[];
  /** true bei der zweiten und letzten Erinnerung */
  letzte: boolean;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const eines = zeilen.length === 1;
  const link = `${kontoBasis()}/konto`;
  /* DER EINZELFALL LIEST SICH WIE EIN BRIEF UEBER DIESE EINE SACHE.
     Beim Durchspielen am 16.08.2026 stand hier zweimal "seit" und ein
     kleingeschriebener Satzanfang ("seit seit 4 Tagen", "eine anfrage
     steht"). Ursache war beides Zusammensetzen: luecketext() bringt
     das "seit" schon mit, und toLowerCase() traf einen ganzen Satz
     statt eines Wortes. Jetzt steht der Satz unveraendert da. */
  const einleitung = eines
    ? `in Ihrem Konto wartet ${zeilen[0].alter} etwas auf Sie: ${zeilen[0].text}.`
    : `in Ihrem Konto warten ${zeilen.length} Dinge auf Sie:`;
  const ausweg =
    "Vielleicht haben Sie längst außerhalb des Kontos geantwortet. Dann setzen Sie den Stand einfach um, und diese Erinnerung entfällt.";
  const rat =
    "Falls nicht: Kaufinteressenten schreiben meist mehrere Anbieter an. Eine kurze Rückmeldung, auch eine absagende, hält Sie im Gespräch.";
  const schluss = letzte
    ? "Das ist unsere letzte Erinnerung dazu. Sie finden den Vorgang jederzeit in Ihrem Konto."
    : null;

  const html = rahmen(
    [
      ueberschrift(eines ? "Etwas wartet auf Sie" : "Einiges wartet auf Sie"),
      absatz(anrede),
      absatz(einleitung),
      eines ? "" : wartetListe(zeilen),
      absatz(ausweg),
      absatz(rat),
      knopf(link, "In mein Konto"),
      schluss ? hinweiszeile(schluss) : "",
      benachrichtigungsFuss(),
    ]
      .filter(Boolean)
      .join("\n"),
    eines ? "Etwas in Ihrem Konto wartet auf Sie." : "Einiges wartet auf Sie.",
    "antwortbar"
  );

  return {
    betreff: eines
      ? "Eine Sache in Ihrem Konto wartet noch"
      : `${zeilen.length} Dinge in Ihrem Konto warten noch`,
    html,
    text: [
      anrede,
      "",
      einleitung,
      eines ? "" : wartetTextliste(zeilen),
      "",
      ausweg,
      "",
      rat,
      "",
      `In mein Konto: ${link}`,
      schluss ? `\n${schluss}` : "",
      FUSS_TEXT,
    ]
      .filter((z) => z !== "")
      .join("\n"),
  };
}

/**
 * An den zustaendigen MAKLER: eine Bitte seines Kunden liegt.
 *
 * MIT DER ZUSAGE IM TEXT, nicht mit einer Zahl: Der Satz kommt aus
 * lib/zusage.ts, damit er sich nicht von dem unterscheidet, den der
 * Kunde vor dem Absenden gelesen hat.
 */
export function wartetMaklerMail({
  name,
  zeilen,
  zusage,
}: {
  name: string | null;
  zeilen: WartetZeile[];
  /** Der Wortlaut der Zusage, aus lib/zusage.ts */
  zusage: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const link = `${kontoBasis()}/admin/termine`;
  const einleitung =
    zeilen.length === 1
      ? "eine Bitte eines Ihrer Kunden ist noch offen:"
      : `${zeilen.length} Bitten Ihrer Kunden sind noch offen:`;

  const html = rahmen(
    [
      ueberschrift("Ihre Kunden warten auf eine Antwort"),
      absatz(anrede),
      absatz(einleitung),
      wartetListe(zeilen),
      absatz(`Unsere Zusage lautet: ${zusage}`),
      knopf(link, "Im internen Bereich ansehen"),
    ].join("\n"),
    "Eine Bitte Ihres Kunden ist noch offen.",
    "noreply"
  );

  return {
    betreff:
      zeilen.length === 1
        ? "Eine Bitte Ihres Kunden ist offen"
        : `${zeilen.length} Bitten Ihrer Kunden sind offen`,
    html,
    text: [
      anrede,
      "",
      einleitung,
      wartetTextliste(zeilen),
      "",
      `Unsere Zusage lautet: ${zusage}`,
      "",
      `Im internen Bereich ansehen: ${link}`,
    ].join("\n"),
  };
}

/**
 * An das TEAM: was sonst nirgends auffaellt.
 *
 * ALS MAIL UND NICHT ALS MELDUNG, und das ist kein Geschmack: Eine der
 * Sorten ist "eine Meldung liegt zu lange". Wuerde die Erinnerung
 * daran selbst eine Meldung erzeugen, entstuende bei jedem Lauf eine
 * neue liegende Meldung, und die Liste liefe von allein voll.
 */
/**
 * AN DAS TEAM: eine Meldung, an der Geld oder eine Frist haengt.
 *
 * DER ERSATZ FUER n8n (31.08.2026), solange es nicht angebunden ist.
 * Welche Arten hier landen, steht in `lib/ereignis.ts` unter
 * `MELDUNG_PER_MAIL`, und die Liste ist kurz: gemessen waeren es sieben
 * Mails in dreizehn Tagen gewesen.
 *
 * SIE GEHT NIE AN EINEN KUNDEN, deshalb steht sie in
 * NICHT_AN_DEN_KUNDEN (config/meldungs-themen.ts) und traegt keinen
 * Abschalt-Schalter: Ein Kunde koennte sonst Meldungen ueber seinen
 * eigenen Vorgang abstellen.
 *
 * SCHLICHT UND OHNE WERBUNG, aber im Hausrahmen: Sie geht an uns, und
 * was zaehlt, ist die Kennung, mit der man im internen Bereich
 * weitersucht. Der Text kommt fertig aus der Meldung; diese Vorlage
 * gibt ihm nur eine lesbare Form.
 */
export function teamMeldungMail({
  ereignis,
  text,
  kennungen,
  link,
}: {
  /** Die Art, etwa "zahlung.haengt" */
  ereignis: string;
  /** Der Kurztext der Meldung */
  text: string;
  /** Was den Vorgang auffindbar macht */
  kennungen: Record<string, string | null>;
  /** Der Weg in den internen Bereich, wenn es einen gibt */
  link: string | null;
}): MailInhalt {
  const zeilen = Object.entries(kennungen)
    .filter(([, wert]) => wert)
    .map(([name, wert]) => `${name}: ${wert}`);
  const kennungsText = zeilen.length > 0 ? zeilen.join("\n") : "(keine Kennungen)";

  const html = rahmen(
    [
      ueberschrift("Meldung an das Team"),
      absatz(text),
      absatz(`<code>${kennungsText.replace(/\n/g, "<br>")}</code>`),
      link ? knopf(link, "Im internen Bereich ansehen") : "",
      hinweiszeile(
        `Art: ${ereignis}. Diese Mail geht an das Team, weil an dieser Meldung Geld oder eine Frist hängt. Sie ersetzt die Weiterleitung, solange diese nicht eingerichtet ist.`
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    text.slice(0, 120),
    "noreply"
  );

  return {
    betreff: `[selbst-verkauf] ${ereignis}: ${text.slice(0, 70)}`,
    html,
    text: [
      text,
      "",
      kennungsText,
      link ? `\nIm internen Bereich ansehen: ${link}` : "",
      "",
      `Art: ${ereignis}`,
      "Diese Mail geht an das Team, weil an dieser Meldung Geld oder eine Frist hängt.",
      "Sie ersetzt die Weiterleitung, solange diese nicht eingerichtet ist.",
    ]
      .filter((z) => z !== "")
      .join("\n"),
  };
}

export function wartetTeamMail({
  zeilen,
  deutlich,
}: {
  zeilen: WartetZeile[];
  /** true bei der zweiten Stufe */
  deutlich: boolean;
}): MailInhalt {
  const link = `${kontoBasis()}/admin/liegt-an`;
  /* EINZAHL AUSGESCHRIEBEN, wie in den vier anderen Erinnerungs-Mails.
     Gemessen am 21.08.2026 im Versandprotokoll: Der Betreff lautete
     "1 Vorgänge liegen zu lange". Als einzige der fünf Sorten hatte
     diese hier keinen Einzahl-Zweig; das "?" trennt hier die zweite
     Stufe von der ersten, nicht eins von mehreren. */
  const eines = zeilen.length === 1;
  const einleitung = deutlich
    ? eines
      ? "der folgende Vorgang liegt jetzt deutlich zu lange. Dahinter steht ein Mensch, der wartet:"
      : "die folgenden Vorgänge liegen jetzt deutlich zu lange. Hinter jedem steht ein Mensch, der wartet:"
    : eines
      ? "der folgende Vorgang wartet auf eine Handlung:"
      : "die folgenden Vorgänge warten auf eine Handlung:";

  const html = rahmen(
    [
      ueberschrift(deutlich ? "Das liegt zu lange" : "Das wartet noch"),
      absatz("Guten Tag,"),
      absatz(einleitung),
      wartetListe(zeilen),
      knopf(link, "Übersicht öffnen"),
      hinweiszeile(
        "Diese Erinnerung kommt aus dem Zeitplan. Zu jedem Vorgang gibt es genau zwei davon, danach steht er nur noch in der Übersicht."
      ),
    ].join("\n"),
    deutlich
      ? eines
        ? "Ein Vorgang liegt zu lange."
        : "Vorgänge liegen zu lange."
      : eines
        ? "Ein Vorgang wartet auf eine Handlung."
        : "Vorgänge warten auf eine Handlung.",
    "noreply"
  );

  return {
    betreff: deutlich
      ? eines
        ? "Ein Vorgang liegt zu lange"
        : `${zeilen.length} Vorgänge liegen zu lange`
      : eines
        ? "Ein Vorgang wartet"
        : `${zeilen.length} Vorgänge warten`,
    html,
    text: [
      "Guten Tag,",
      "",
      einleitung,
      wartetTextliste(zeilen),
      "",
      `Übersicht öffnen: ${link}`,
      "",
      "Diese Erinnerung kommt aus dem Zeitplan. Zu jedem Vorgang gibt es genau zwei davon, danach steht er nur noch in der Übersicht.",
    ].join("\n"),
  };
}

/**
 * An den INTERESSENTEN: seine Einladung ist ohne Antwort.
 *
 * ER IST KEIN KUNDE VON UNS. Deshalb kein Konto-Link, keine
 * Abmelde-Zeile fuer Konto-Hinweise, und genau ein Weg: der Link aus
 * der Einladung, mit dem er zu- oder absagen kann. Bewusst freundlich
 * und ohne Druck; wer nicht mehr mag, soll ohne schlechtes Gewissen
 * absagen koennen, denn eine Absage ist fuer den Verkaeufer mehr wert
 * als Schweigen.
 */
export function wartetInteressentMail({
  name,
  objektBezeichnung,
  terminText,
  link,
}: {
  name: string | null;
  objektBezeichnung: string;
  terminText: string;
  link: string;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const einleitung = `Sie sind zu einer Besichtigung eingeladen: ${objektBezeichnung}, ${terminText}. Eine Antwort steht noch aus.`;
  const bitte =
    "Sagen Sie kurz zu oder ab, dann weiß der Anbieter, mit wie vielen Personen er rechnen kann. Eine Absage ist völlig in Ordnung und hilft ihm mehr als keine Antwort.";

  const html = rahmen(
    [
      ueberschrift("Ihre Einladung wartet auf eine Antwort"),
      absatz(anrede),
      absatz(schuetzeText(einleitung)),
      absatz(bitte),
      knopf(link, "Zusagen oder absagen"),
      ersatzlink(link),
    ].join("\n"),
    "Ihre Einladung wartet auf eine Antwort.",
    "noreply"
  );

  return {
    betreff: "Ihre Einladung zur Besichtigung",
    html,
    text: [anrede, "", einleitung, "", bitte, "", `Zusagen oder absagen: ${link}`].join("\n"),
  };
}

/**
 * An den KUNDEN, wenn eine Bitte an seinen Makler ueberfaellig ist.
 *
 * DER PROMPT VERLANGT GENAU EINEN SATZ, und das ist richtig: Wer
 * ohnehin schon wartet, braucht keine Erklaerung unserer inneren
 * Ablaeufe, sondern die Auskunft, dass sich jetzt jemand kuemmert.
 */
export function zusageGerissenMail({
  name,
  anzahl,
}: {
  name: string | null;
  anzahl: number;
}): MailInhalt {
  const anrede = name ? `Guten Tag ${name},` : "Guten Tag,";
  const satz =
    anzahl === 1
      ? "Ihre Bitte ist bei uns liegengeblieben, das tut uns leid. Wir haben sie an das Team weitergegeben, dort kümmert sich jetzt jemand darum."
      : `Ihre Bitten sind bei uns liegengeblieben, das tut uns leid. Wir haben sie an das Team weitergegeben, dort kümmert sich jetzt jemand darum.`;

  const html = rahmen(
    [
      ueberschrift("Wir haben Sie warten lassen"),
      absatz(anrede),
      absatz(satz),
      benachrichtigungsFuss(),
    ].join("\n"),
    "Wir haben Ihre Bitte weitergegeben.",
    "antwortbar"
  );

  return {
    betreff: "Wir haben Sie warten lassen",
    html,
    text: [anrede, "", satz, FUSS_TEXT].join("\n"),
  };
}
