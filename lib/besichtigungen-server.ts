/**
 * Die Serverseite der Besichtigungen: Daten holen, Links erzeugen,
 * Mails verschicken.
 *
 * NUR SERVER-SEITIG. Ein Teil davon braucht die Service-Rolle, weil der
 * Interessent kein Konto hat und deshalb nicht ueber RLS an seine
 * Termine kommt.
 *
 * WARUM DIESE DATEI EXISTIERT: Sechs Routen brauchten sonst dieselben
 * vier Schritte (Objekt holen, Person holen, Link bauen, Mail
 * verschicken). Beim vierten Mal Abschreiben laeuft eine Fassung aus
 * dem Ruder, und dann steht in einer Mail eine Adresse, die dort nicht
 * stehen darf.
 */
import {
  besichtigungKalenderDatei,
  besichtigungDateiname,
} from "@/lib/kalender-datei";
import {
  ortFuerInteressent,
  ortFuerVerkaeufer,
  zeitraumText,
  type Besichtigung,
  type BesichtigungsArt,
  type BesichtigungEreignisArt,
} from "@/lib/besichtigungen";
import type { AnfrageStatus } from "@/lib/anfrage-status";
import { appBasis } from "@/lib/app-basis";
import { empfaengerFuerPflicht } from "@/lib/benachrichtigung";
import { pflichtMail } from "@/config/pflicht-mails";
import { linkAnlegen } from "@/lib/einmal-link";
import {
  anfragenEmpfangSteht,
  sendeMail,
  sendeMailMitBefund,
  type MailBefund,
} from "@/lib/mail";
import {
  besichtigungAenderungMail,
  besichtigungBestaetigtMail,
  besichtigungErinnerungMail,
  besichtigungRueckmeldungMail,
  besichtigungVorschlagMail,
  nachrichtAnInteressentMail,
  type BesichtigungAenderung,
  type TerminZeile,
} from "@/lib/mail-vorlagen";
import { objektBezeichnung } from "@/lib/objekt-felder";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabase/service";
import { siteConfig } from "@/site.config";
import { meldeDemKunden } from "@/lib/kunden-meldung";

/** Die Objektfelder, die fuer Besichtigungen gebraucht werden */
export type BesichtigungsObjekt = {
  id: string;
  objektart: string | null;
  stadt: string | null;
  strasse: string | null;
  plz: string | null;
  anfragen_alias: string | null;
  /** Wahl des Verkaeufers: Besichtigung erst nach Nachweis (0038) */
  nachweis_vor_besichtigung: boolean;
  /* Beide entscheiden, ob ueberhaupt noch eingeladen werden darf;
     siehe einladungenErlaubt() am Ende dieser Datei. */
  verkauf_abgeschlossen_am?: string | null;
  archiviert_am?: string | null;
};

export const OBJEKT_FELDER =
  /* verkauf_abgeschlossen_am und archiviert_am gehoeren dazu, seit es
     die Einladung zu einem bestehenden Termin gibt: Beide Wege muessen
     wissen, ob ueberhaupt noch etwas hinausgehen darf. */
  "id, objektart, stadt, strasse, plz, anfragen_alias, nachweis_vor_besichtigung, verkauf_abgeschlossen_am, archiviert_am";

/** Die Personenfelder, die gebraucht werden */
export type BesichtigungsPerson = {
  id: string;
  anzeigename: string;
  email: string | null;
};

/**
 * Ein frischer Zugang fuer diese Person.
 *
 * Es entsteht bei jeder Mail ein neues Token, weil das Klartext-Token
 * nirgends gespeichert wird und sich deshalb nicht wiederverwenden
 * laesst. Das ist kein Mangel: Der Link haengt an der PERSON, also
 * zeigen auch alle frueher verschickten Links weiterhin den aktuellen
 * Stand. Wer die alte Mail oeffnet, sieht den verschobenen Termin.
 */
export async function besichtigungsLink(
  objekt: BesichtigungsObjekt,
  person: BesichtigungsPerson,
  userId: string
): Promise<string | null> {
  const link = await linkAnlegen({
    zweck: "besichtigung",
    userId,
    objektId: objekt.id,
    zielId: person.id,
    empfaengerEmail: person.email,
    empfaengerName: person.anzeigename,
    erstelltVon: userId,
  });
  return link?.adresse ?? null;
}

/** "Haus in Sendenhorst", ohne Adresse */
export function bezeichnung(objekt: BesichtigungsObjekt): string {
  return objektBezeichnung(objekt);
}

/**
 * Was der Interessent vom Ort sehen darf, fertig als Text.
 *
 * Geht ueber ortFuerInteressent() und nirgends daran vorbei. Das ist
 * die einzige Stelle, an der die Strasse in eine Mail an einen
 * Interessenten geraten kann, und genau deshalb gibt es nur diese eine.
 */
export function ortFuer(
  objekt: BesichtigungsObjekt,
  b: Pick<Besichtigung, "status" | "adresse_frueh_freigeben">
): string {
  return ortFuerInteressent(objekt, b);
}

export { ortFuerVerkaeufer };

/* ------------------------------------------------------------------ */
/* Die Mails                                                           */
/*                                                                     */
/* Alle geben zurueck, ob der Versand geklappt hat. Keine wirft:       */
/* Ein Termin, der in der Datenbank steht, ist gesetzt, auch wenn die  */
/* Mail nicht rausging. Die Route sagt dem Verkaeufer dann ehrlich,    */
/* dass er selbst Bescheid geben muss, statt den ganzen Vorgang        */
/* zurueckzudrehen.                                                    */
/* ------------------------------------------------------------------ */

/** Terminvorschlaege an eine Person, Text je Terminart */
export async function sendeVorschlag({
  objekt,
  person,
  userId,
  termine,
  nachricht,
  art,
}: {
  objekt: BesichtigungsObjekt;
  person: BesichtigungsPerson;
  userId: string;
  termine: { besichtigung: Besichtigung; freiePlaetze: number }[];
  nachricht?: string | null;
  art: BesichtigungsArt;
}): Promise<boolean> {
  if (!person.email) return false;
  const link = await besichtigungsLink(objekt, person, userId);
  if (!link) return false;

  const zeilen: TerminZeile[] = termine.map(({ besichtigung, freiePlaetze }) => ({
    zeit: zeitraumText(besichtigung.beginn, besichtigung.dauer_minuten),
    plaetze:
      besichtigung.max_teilnehmer > 1
        ? `${freiePlaetze} von ${besichtigung.max_teilnehmer} Plätzen frei`
        : null,
  }));

  const mail = besichtigungVorschlagMail({
    name: person.anzeigename,
    objektBezeichnung: bezeichnung(objekt),
    // Fuer die Ortsangabe zaehlt der grosszuegigste der Vorschlaege:
    // Hat der Verkaeufer die Adresse freigegeben, steht sie drin.
    ort: ortFuer(objekt, {
      status: "vorgeschlagen",
      adresse_frueh_freigeben: termine.some(
        (t) => t.besichtigung.adresse_frueh_freigeben
      ),
    }),
    termine: zeilen,
    link,
    nachricht,
    art,
  });

  return sendeMail({
    an: person.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: "besichtigung-vorschlag",
    userId: userId,
  });
}

/** Bestaetigung mit Kalenderdatei, nachdem die Person zugesagt hat */
export async function sendeBestaetigung({
  objekt,
  person,
  userId,
  besichtigung,
}: {
  objekt: BesichtigungsObjekt;
  person: BesichtigungsPerson;
  userId: string;
  besichtigung: Besichtigung;
}): Promise<boolean> {
  if (!person.email) return false;
  const link = await besichtigungsLink(objekt, person, userId);
  if (!link) return false;

  const ort = ortFuer(objekt, besichtigung);
  const zeit = zeitraumText(besichtigung.beginn, besichtigung.dauer_minuten);
  const mail = besichtigungBestaetigtMail({
    name: person.anzeigename,
    objektBezeichnung: bezeichnung(objekt),
    zeit,
    ort,
    link,
    art: besichtigung.art,
  });

  return sendeMail({
    an: person.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: "besichtigung-bestaetigt",
    userId: userId,
    anhaenge: [
      {
        dateiname: besichtigungDateiname(besichtigung),
        inhalt: besichtigungKalenderDatei(
          {
            id: besichtigung.id,
            beginn: besichtigung.beginn,
            dauer_minuten: besichtigung.dauer_minuten,
            status: besichtigung.status,
            folge: besichtigung.folge,
            ort,
            objektBezeichnung: bezeichnung(objekt),
            art: besichtigung.art,
            // Derselbe Einmal-Link wie im Text der Mail. Wer den Termin
            // Wochen spaeter im Kalender sieht, kann von dort absagen,
            // ohne die Mail herauszusuchen.
            absageLink: link,
            ansprechpartner: `selbst-verkauf.de, ${siteConfig.mailAbsender.antwort}`,
          },
          "interessent"
        ),
      },
    ],
  });
}

/** Verschoben oder abgesagt */
export async function sendeAenderung({
  objekt,
  person,
  userId,
  aenderung,
  alteZeit,
  besichtigung,
  grund,
}: {
  objekt: BesichtigungsObjekt;
  person: BesichtigungsPerson;
  userId: string;
  aenderung: BesichtigungAenderung;
  /** Der Zeitpunkt VOR der Aenderung, fertig als Text */
  alteZeit: string;
  besichtigung: Besichtigung;
  grund?: string | null;
}): Promise<boolean> {
  if (!person.email) return false;
  const link = await besichtigungsLink(objekt, person, userId);
  if (!link) return false;

  const mail = besichtigungAenderungMail({
    name: person.anzeigename,
    objektBezeichnung: bezeichnung(objekt),
    aenderung,
    alteZeit,
    neueZeit:
      aenderung === "verschoben"
        ? zeitraumText(besichtigung.beginn, besichtigung.dauer_minuten)
        : null,
    grund,
    link,
    art: besichtigung.art,
  });

  return sendeMail({
    an: person.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: aenderung === "verschoben" ? "besichtigung-verschoben" : "besichtigung-abgesagt",
    userId: userId,
  });
}

/**
 * Was aus einem Erinnerungs-Versuch wurde.
 *
 * `versucht` unterscheidet, was der reine MailBefund nicht kann: ob es
 * ueberhaupt bis zum Maildienst kam. Ohne Adresse oder ohne Link wird
 * gar nicht erst gesendet, und eine Wiederholung wuerde daran nichts
 * aendern; das ist ein Datenproblem und kein Versandproblem. Der
 * Zeitplan wiederholt deshalb nur, was `versucht` UND
 * `sicherNichtVerschickt` ist (lib/auftrag-jobs.ts, Bau-Runde 17).
 */
export type ErinnerungsBefund = MailBefund & { versucht: boolean };

/** Erinnerung am Vortag, mit Befund fuer den Zeitplan */
export async function sendeErinnerungMitBefund({
  objekt,
  person,
  userId,
  besichtigung,
}: {
  objekt: BesichtigungsObjekt;
  person: BesichtigungsPerson;
  userId: string;
  besichtigung: Besichtigung;
}): Promise<ErinnerungsBefund> {
  const nichtVersucht: ErinnerungsBefund = {
    verschickt: false,
    sicherNichtVerschickt: true,
    gewollt: false,
    versucht: false,
  };
  if (!person.email) return nichtVersucht;
  const link = await besichtigungsLink(objekt, person, userId);
  if (!link) return nichtVersucht;

  const mail = besichtigungErinnerungMail({
    name: person.anzeigename,
    objektBezeichnung: bezeichnung(objekt),
    zeit: zeitraumText(besichtigung.beginn, besichtigung.dauer_minuten),
    ort: ortFuer(objekt, besichtigung),
    link,
    art: besichtigung.art,
  });

  const befund = await sendeMailMitBefund({
    an: person.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: "besichtigung-erinnerung",
    userId: userId,
  });
  return { ...befund, versucht: true };
}

/** Erinnerung am Vortag, einfache Antwort fuer die uebrigen Aufrufer */
export async function sendeErinnerung(
  eingaben: Parameters<typeof sendeErinnerungMitBefund>[0]
): Promise<boolean> {
  return (await sendeErinnerungMitBefund(eingaben)).verschickt;
}

/**
 * Der Verkaeufer erfaehrt von der Zusage oder Absage.
 *
 * ---------------------------------------------------------------------
 * SEIT DEM 30.08.2026 EINE PFLICHT-MAIL, und das ist die Umkehr einer
 * frueheren Entscheidung
 * ---------------------------------------------------------------------
 * Am 13.08.2026 wanderte diese Mail auf den Schalter, weil sie vorher
 * an ihm vorbeilief; das war damals richtig. Es war aber nur die halbe
 * Frage. Uebersehen wurde, WAS an dieser Mail haengt:
 *
 *   Der Kalendereintrag. Bei der ZUSAGE traegt er den Termin ein, bei
 *   der ABSAGE traegt er STATUS:CANCELLED und NIMMT den vorhandenen
 *   Eintrag wieder heraus.
 *
 * Der Inhaber am 30.08.2026: "Wer sie abschaltet, verliert nicht nur
 * einen Text, sondern den Termineintrag fuer seinen eigenen Termin.
 * Das ist kein Hinweis, das ist ein Arbeitsmittel." Der schlimmere
 * Fall ist die Absage: Ohne sie bleibt ein abgesagter Termin fuer
 * immer als bestaetigt im Kalender stehen, und der Verkaeufer haelt
 * sich einen Vormittag frei, den er nicht braucht.
 *
 * Beide Kennungen stehen seither mit Begruendung in
 * config/pflicht-mails.ts. Die Glocke meldet unveraendert.
 *
 * Der Rueckgabewert bleibt erhalten; false heisst jetzt wieder allein
 * "keine Adresse oder Versand fehlgeschlagen", nicht mehr
 * "abbestellt".
 */
export async function sendeRueckmeldungAnVerkaeufer({
  userId,
  person,
  besichtigung,
  zugesagt,
  rueckmeldung,
  objekt,
  terminHinfaellig = false,
}: {
  /** Der Verkaeufer, dem der Termin gehoert */
  userId: string;
  person: BesichtigungsPerson;
  /**
   * DER ZUSTAND NACH DER AENDERUNG, nie der davor. Aus diesem Objekt
   * entsteht die Kalenderdatei; wer den alten Stand uebergibt,
   * verschickt einen Eintrag, der im Kalender als bestaetigt stehen
   * bleibt, obwohl niemand mehr kommt (Fund aus Runde 9).
   */
  besichtigung: Besichtigung;
  zugesagt: boolean;
  rueckmeldung?: string | null;
  /** Fuer den Kalendereintrag. Ohne Objekt geht die Mail ohne Anhang */
  objekt?: BesichtigungsObjekt | null;
  /** Faellt der Termin durch diese Absage weg? Dann sagt die Mail es. */
  terminHinfaellig?: boolean;
}): Promise<boolean> {
  const service = supabaseService();
  const kennung = zugesagt
    ? pflichtMail("besichtigung-zusage")
    : pflichtMail("besichtigung-absage");
  const empfaenger = await empfaengerFuerPflicht(service, userId, kennung);
  if (!empfaenger) return false;
  const mail = besichtigungRueckmeldungMail({
    name: empfaenger.name,
    interessentName: person.anzeigename,
    zeit: zeitraumText(besichtigung.beginn, besichtigung.dauer_minuten),
    zugesagt,
    rueckmeldung,
    terminHinfaellig,
  });

  /* DER KALENDEREINTRAG GEHOERT AN DIESE MAIL, nicht nur an den Knopf
     im Konto. Am Samstagmorgen schaut niemand ins Konto, sondern in
     seinen Kalender; ein Termin, der nur bei uns steht, ist ein Termin,
     den der Verkaeufer verpasst.

     BEI EINER ABSAGE GEHT ER TROTZDEM MIT: Traegt der uebergebene
     Termin den Zustand abgesagt oder verfallen, entsteht die Datei mit
     STATUS:CANCELLED und derselben Kennung, und der vorhandene Eintrag
     verschwindet aus dem Kalender, statt als Karteileiche stehen zu
     bleiben. Das setzt voraus, dass der Aufrufer den Zustand NACH der
     Aenderung uebergibt, siehe oben; bis Runde 9 kam hier der alte
     Stand an, und der Eintrag blieb als bestaetigt stehen. */
  const anhang = service
    ? await verkaeuferKalenderAnhang(service, besichtigung, objekt ?? null)
    : null;

  /* IN DIE GLOCKE (Runde 35). Bei einer Besichtigung muss der
     Verkaeufer zu Hause sein oder jemanden schicken; sie steht deshalb
     als eigene Art neben den uebrigen Terminen. OHNE den Namen des
     Interessenten. */
  await meldeDemKunden({
    kundeId: userId,
    art: zugesagt ? "besichtigung.zugesagt" : "besichtigung.abgesagt",
    zeile: zugesagt
      ? "Ein Interessent kommt zur Besichtigung. Den Zeitpunkt sehen Sie bei Ihren Terminen."
      : "Eine vereinbarte Besichtigung findet nicht statt.",
    kennungen: { besichtigung: besichtigung.id },
  });

  return sendeMail({
    an: empfaenger.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: kennung,
    userId,
    anhaenge: anhang ? [anhang] : undefined,
  });
}

/**
 * Der Kalendereintrag AUS SICHT DES VERKAEUFERS, als Mail-Anhang.
 *
 * EINE STELLE FUER ZWEI WEGE: Denselben Eintrag liefert der Knopf "In
 * meinen Kalender eintragen" im Konto (app/api/besichtigungen/[id]/
 * kalender). Stuende der Aufbau zweimal da, truege der eine Weg
 * irgendwann die Telefonnummer und der andere nicht.
 *
 * DIE KENNUNG BLEIBT UEBER ALLE AENDERUNGEN DIESELBE (besichtigung-<id>),
 * und "folge" zaehlt jede Verschiebung mit. Kalender erkennen daran
 * eine AKTUALISIERUNG: Der Eintrag wandert auf die neue Zeit, statt
 * dass ein zweiter daneben entsteht und der alte tot stehen bleibt.
 */
export async function verkaeuferKalenderAnhang(
  client: SupabaseClient,
  besichtigung: Besichtigung,
  /* Nur die Felder, die im Eintrag wirklich vorkommen. Absichtlich
     nicht BesichtigungsObjekt: Wer diese Funktion aufruft, soll nicht
     Felder mitschleppen muessen, die sie nie liest. */
  objekt: {
    objektart?: string | null;
    strasse: string | null;
    plz: string | null;
    stadt: string | null;
  } | null
): Promise<{ dateiname: string; inhalt: string } | null> {
  const basis = appBasis();
  if (!basis) return null;

  /* Nur die Zusagen. Wer noch nicht geantwortet hat, gehoert nicht in
     den Titel: Sonst steht dort ein Name, und am Ende kommt jemand
     anderes. */
  const { data: einladungen } = await client
    .from("besichtigungs_einladungen")
    .select("interessent_id")
    .eq("besichtigung_id", besichtigung.id)
    .eq("status", "zugesagt");

  let namen: string | null = null;
  let kontakt: string | null = null;
  if (einladungen?.length) {
    const { data: personen } = await client
      .from("interessenten")
      .select("anzeigename, email, telefon")
      .in("id", einladungen.map((e) => e.interessent_id as string));
    const liste = (personen ?? []) as {
      anzeigename: string;
      email: string | null;
      telefon: string | null;
    }[];
    namen = liste.map((p) => p.anzeigename).join(", ") || null;
    /* Der Verkaeufer darf die Kontaktdaten seiner Interessenten sehen,
       sie stehen ohnehin in seiner Akte. Im Kalender erspart es ihm
       das Nachschlagen, wenn er kurzfristig anrufen will. */
    kontakt =
      liste
        .map((p) =>
          [p.anzeigename, p.telefon ?? p.email].filter(Boolean).join(", ")
        )
        .join(" | ") || null;
  }

  return {
    dateiname: besichtigungDateiname(besichtigung),
    inhalt: besichtigungKalenderDatei(
      {
        id: besichtigung.id,
        beginn: besichtigung.beginn,
        dauer_minuten: besichtigung.dauer_minuten,
        status: besichtigung.status,
        folge: besichtigung.folge,
        ort: objekt ? ortFuerVerkaeufer(objekt) : "Bei Ihrer Immobilie",
        objektBezeichnung: objektBezeichnung(objekt ?? {}),
        interessentName: namen,
        art: besichtigung.art,
        // Fuer den Verkaeufer fuehrt der Weg ins eigene Konto, das
        // hinter der Anmeldung liegt. Kein Einmal-Link noetig.
        absageLink: `${basis}/konto/termine`,
        ansprechpartner: kontakt,
      },
      "verkaeufer"
    ),
  };
}

/**
 * Der Verkaeufer schreibt einem Interessenten.
 *
 * DIE PRIVATE ADRESSE DES VERKAEUFERS BLEIBT UNSICHTBAR: Absender ist
 * die objektbezogene Schutz-Adresse. Nur die ANTWORT geht bis auf
 * Weiteres direkt an ihn, weil auf der Schutz-Adresse noch niemand
 * zuhoert. Das steht so auch im Konto.
 *
 * Gibt zusaetzlich zurueck, ob die Antwort schon eingesammelt wird.
 * Danach richtet sich der Satz, den das Konto anzeigt.
 */
export async function sendeNachrichtAnInteressent({
  objekt,
  person,
  nachricht,
  verkaeuferEmail,
  verkaeuferId,
}: {
  objekt: BesichtigungsObjekt;
  person: BesichtigungsPerson;
  nachricht: string;
  verkaeuferEmail: string | null;
  /**
   * Eigentuemer des Vorgangs, fuer den Vorfuehr-Riegel in sendeMail
   * (24.08.2026). Beide Aufrufer sind eingeloggte Verkaeufer.
   */
  verkaeuferId: string;
}): Promise<{ versandt: boolean; antwortGehtAnVerkaeufer: boolean }> {
  const empfangSteht = anfragenEmpfangSteht();
  if (!person.email) return { versandt: false, antwortGehtAnVerkaeufer: !empfangSteht };

  const mail = nachrichtAnInteressentMail({
    name: person.anzeigename,
    objektBezeichnung: bezeichnung(objekt),
    nachricht,
  });

  // Ohne Schutz-Adresse am Objekt bleibt nur unsere feste Team-Adresse.
  // Sie entsteht bei der Exposé-Erzeugung, ist also nicht immer da.
  const absender = objekt.anfragen_alias
    ? `${siteConfig.mailAbsender.name} <${objekt.anfragen_alias}>`
    : null;

  const versandt = await sendeMail({
    an: person.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: "nachricht-an-interessent",
    userId: verkaeuferId,
    von: absender,
    // Solange niemand auf der Schutz-Adresse zuhoert, muss die Antwort
    // den Verkaeufer erreichen, sonst verschwindet sie.
    antwortAn: empfangSteht ? (objekt.anfragen_alias ?? null) : verkaeuferEmail,
  });

  return { versandt, antwortGehtAnVerkaeufer: !empfangSteht };
}

/**
 * Ein Ereignis in die Chronik der Besichtigung schreiben.
 *
 * WICHTIG: `fuer_zeitpunkt` ist der Zeitpunkt, um den es GERADE geht,
 * und wird hier festgehalten. Er darf spaeter nicht mehr aus dem Termin
 * gelesen werden, sonst stuende nach einer Verschiebung in der Chronik,
 * die Person habe fuer den neuen Zeitpunkt zugesagt. Genau daran ist
 * die erste Fassung gescheitert.
 *
 * Je betroffener Person eine Zeile, auch bei Ereignissen des
 * Verkaeufers: Nur so laesst sich die Chronik ohne Umweg nach Akte
 * filtern.
 *
 * Wirft nie. Eine fehlgeschlagene Chronik darf den Vorgang selbst nicht
 * zurueckdrehen, sie ist die Erzaehlung und nicht die Wahrheit.
 */
export async function ereignisVermerken({
  besichtigungId,
  interessentenIds,
  userId,
  art,
  zeitpunkt,
  dauerMinuten,
  rueckmeldung,
}: {
  besichtigungId: string;
  interessentenIds: string[];
  userId: string;
  art: BesichtigungEreignisArt;
  zeitpunkt: string;
  dauerMinuten: number;
  rueckmeldung?: string | null;
}): Promise<void> {
  if (interessentenIds.length === 0) return;
  const service = supabaseService();
  if (!service) return;
  const { error } = await service.from("besichtigungs_verlauf").insert(
    interessentenIds.map((interessentId) => ({
      besichtigung_id: besichtigungId,
      interessent_id: interessentId,
      user_id: userId,
      art,
      fuer_zeitpunkt: zeitpunkt,
      dauer_minuten: dauerMinuten,
      rueckmeldung: rueckmeldung ?? null,
    }))
  );
  if (error) console.error("[besichtigungen] Chronik-Eintrag fehlgeschlagen:", error);
}

/**
 * Einen Statuswechsel des Interessenten protokollieren.
 *
 * Bisher war der Status ein blosser Wert ohne Geschichte und konnte
 * deshalb im Verlauf der Akte nicht auftauchen. Laeuft ueber die
 * Service-Rolle, weil ein Teil der Wechsel vom Interessenten ausgeloest
 * wird, der kein Konto hat.
 */
export async function statusVermerken({
  interessentId,
  userId,
  von,
  nach,
}: {
  interessentId: string;
  userId: string;
  von: string | null;
  /* Der TYP statt eines freien Strings. Genau hier lag ein Fehler:
     Zwei Aufrufer schrieben noch "im_gespraech" und "besichtigt", die
     es seit 0056 nicht mehr gibt. Die Datenbank wies das ab, der
     Fehler wurde nie geprueft, und im Verlauf der Akte landete ein
     Eintrag auf einen Stand, den die Person nie bekam. Mit dem Typ
     faellt so etwas beim Uebersetzen auf. */
  nach: AnfrageStatus;
}): Promise<void> {
  if (von === nach) return;
  const service = supabaseService();
  if (!service) return;

  /* ERST DIE AKTE, DANN DER VERLAUF. Andersherum stuende im Verlauf
     ein Wechsel, der gar nicht stattgefunden hat, sobald die Datenbank
     den Wert ablehnt. */
  const { error } = await service
    .from("interessenten")
    .update({ status: nach, geaendert_am: new Date().toISOString() })
    .eq("id", interessentId);
  if (error) {
    console.error("[interessenten] Stand nicht gesetzt:", nach, error.message);
    return;
  }
  await service.from("interessenten_status_verlauf").insert({
    interessent_id: interessentId,
    user_id: userId,
    von,
    nach,
  });
}

/**
 * Wer darf eingeladen werden, wenn am Objekt "Besichtigung erst nach
 * Nachweis" eingeschaltet ist?
 *
 * STAND FRUEHER NUR IM ANLEGE-WEG. Seit es die Einladung zu einem
 * BESTEHENDEN Termin gibt, waere die Regel dort sonst umgehbar
 * gewesen: neuen Termin anlegen ist geprueft, jemanden zu einem
 * vorhandenen einladen nicht. Deshalb liegt sie jetzt hier, und beide
 * Wege rufen dieselbe Funktion.
 *
 * LAUT BENENNEN STATT BLOCKIEREN (Entscheidung vom 11.08.2026): Wer
 * aussen vor bleibt, wird zurueckgegeben, damit der Verkaeufer den
 * Nachweis gezielt anfordern kann, statt vor einer stummen Wand zu
 * stehen.
 */
export async function nachweisFilter(
  supabase: SupabaseClient,
  userId: string,
  personen: BesichtigungsPerson[],
  nachweisPflicht: boolean
): Promise<{ erlaubt: BesichtigungsPerson[]; ohneNachweis: BesichtigungsPerson[] }> {
  if (!nachweisPflicht || personen.length === 0) {
    return { erlaubt: personen, ohneNachweis: [] };
  }

  const { data: anfragenDaten } = await supabase
    .from("anfragen")
    .select("id, interessent_id")
    .eq("user_id", userId)
    .in("interessent_id", personen.map((p) => p.id));
  const anfragen = (anfragenDaten ?? []) as { id: string; interessent_id: string | null }[];

  const mitNachweis = new Set<string>();
  if (anfragen.length > 0) {
    /* Als unbrauchbar markierte Nachweise zaehlen nicht: Das
       Kennzeichen und die Pflicht meinen beide einen brauchbaren
       (siehe lib/bonitaet.ts, zaehltAlsNachweis). */
    const { data: nachweise } = await supabase
      .from("bonitaetsnachweise")
      .select("anfrage_id, status")
      .in("anfrage_id", anfragen.map((a) => a.id))
      .neq("status", "unbrauchbar");
    for (const n of (nachweise ?? []) as { anfrage_id: string }[]) {
      const person = anfragen.find((a) => a.id === n.anfrage_id)?.interessent_id;
      if (person) mitNachweis.add(person);
    }
  }

  return {
    erlaubt: personen.filter((p) => mitNachweis.has(p.id)),
    ohneNachweis: personen.filter((p) => !mitNachweis.has(p.id)),
  };
}

/**
 * Darf zu diesem Objekt ueberhaupt noch eingeladen werden?
 *
 * NACH DEM VERKAUF UND NACH DEM ARCHIVIEREN GEHT NICHTS MEHR HINAUS.
 * Eine Einladung zu einem Haus, das verkauft ist, ist keine
 * Unfreundlichkeit, sondern eine Falschaussage: Der Empfaenger richtet
 * seinen Samstag danach ein.
 */
export function einladungenErlaubt(objekt: {
  verkauf_abgeschlossen_am?: string | null;
  archiviert_am?: string | null;
}): { erlaubt: boolean; grund?: string } {
  if (objekt.verkauf_abgeschlossen_am) {
    return {
      erlaubt: false,
      grund:
        "Ihr Verkauf ist eingetragen, deshalb gehen keine Einladungen mehr hinaus. Nehmen Sie den Verkauf unter Leistungen zurück, wenn Sie doch noch Termine brauchen.",
    };
  }
  if (objekt.archiviert_am) {
    return {
      erlaubt: false,
      grund: "Dieses Objekt ist archiviert. Holen Sie es zurück, um wieder einzuladen.",
    };
  }
  return { erlaubt: true };
}
