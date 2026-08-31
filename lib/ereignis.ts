import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appBasis } from "@/lib/app-basis";
import { supabaseService } from "@/lib/supabase/service";
import { siteConfig } from "@/site.config";

/**
 * DER EINE PUNKT, an dem jede Benachrichtigung vorbeikommt.
 *
 * Aufgebaut wie sendeMail() in lib/mail.ts, und aus demselben Grund:
 * Eine Stelle, die man vergessen kann, wird irgendwann vergessen. Wer
 * kuenftig ein neues Ereignis meldet, ruft melde() auf und ist damit
 * automatisch in Protokoll, Signatur und Verteilung.
 *
 * SELBSTAKTIVIEREND wie die uebrigen Anbindungen: Ohne
 * N8N_WEBHOOK_URL geht nichts hinaus, aber JEDE Meldung landet
 * trotzdem in ereignis_protokoll. Damit laesst sich schon vor dem
 * Anschliessen pruefen, ob Inhalt und Empfaenger stimmen, statt es
 * erst beim Einrichten zu merken.
 *
 * WAS EINE MELDUNG ENTHAELT, und vor allem was nicht: Telegram ist kein
 * geschuetzter Kanal, und Nachrichten bleiben dort auf privaten
 * Telefonen liegen. Also die Art des Ereignisses, der Zeitpunkt, die
 * Kennungen, ein kurzer Text und ein Link in den Admin. KEINE Namen,
 * keine Adressen, keine Gebotsbetraege, keine Nachweise. Wer Genaueres
 * wissen will, klickt.
 *
 * EIN FEHLSCHLAG BLOCKIERT NIE die eigentliche Handlung. Er landet im
 * Protokoll, genau wie beim Mailversand.
 */

/**
 * Die Ereignisse, die gemeldet werden.
 *
 * Die Kennung ist bewusst zweiteilig ("bereich.was"), damit sich in
 * n8n mit einem Praefix filtern laesst, ohne jede einzelne Kennung
 * aufzuzaehlen.
 */
export type EreignisArt =
  // Der wichtigste Fall: ein Mensch wartet auf einen Anruf
  | "rueckruf.gewuenscht"
  | "termin.angefragt"
  | "nachricht.vom_kunden"
  | "problem.gemeldet"
  | "buchung.eingegangen"
  | "buchung.ohne_makler"
  | "bewertung.angefordert"
  | "anfrage.eingegangen"
  /* Die Notbremse der oeffentlichen Anfrage ist gekippt: Ein Objekt
     hat so viele Anfragen an einem Tag bekommen, dass je Anfrage
     keine Mails mehr hinausgehen (lib/bremse.ts, jeObjekt24h). Genau
     EINE Meldung beim Kippen, nicht eine je weiterer Anfrage. */
  | "anfrage.gebremst"
  | "nachweis.eingegangen"
  | "gebot.eingegangen"
  | "gebot.frist_abgelaufen"
  | "besichtigung.zusage"
  | "besichtigung.absage"
  | "objekt.erfasst"
  | "expose.freigegeben"
  /* Die Portalschaltung ist beendet und die Inserate muessen von Hand
     zurueckgezogen werden. Faellt weg, sobald die Portal-Anbindung das
     selbst erledigt (lib/portal-schaltung.ts). */
  | "portal.rueckzug"
  /* Eine Rueckmeldedatei eines Portals liess sich nicht oder nicht
     vollstaendig einlesen. Muss uns erreichen: Dahinter steht ein
     Mensch, der auf Antwort wartet, und die Originaldatei liegt im
     internen Bereich bereit. */
  | "portal.eingang_fehler"
  // Buchung einer Hand-Leistung: der Auftrag wartet auf Uebernahme
  | "auftrag.eingegangen"
  /* Die zwei Kuendigungs-Ereignisse. EIGENE KENNUNGEN und nicht
     "buchung.eingegangen": Eine Kuendigung ist etwas anderes als eine
     Buchung. Sie darf nie ueber denselben Weg verteilt werden (siehe
     NUR_AN_DEN_ADMIN, das braucht eine eigene Kennung, um sie
     auseinanderzuhalten), und sie muss sich im Protokoll allein
     wiederfinden lassen.

     eingegangen  Der Eingang selbst. KEINE Aufgabe in der
                  Meldungs-Liste: Er steht schon oben auf
                  /admin/buchungen, und zweimal dasselbe abzuhaken
                  waere eine Aufgabe zu viel.
     wartet       Frist gerissen (24 bzw. 72 Stunden). DAS ist die
                  Aufgabe, siehe MELDUNGEN_MIT_AUFGABE. */
  | "kuendigung.eingegangen"
  | "kuendigung.wartet"
  | "mail.fehlgeschlagen"
  /* Ein Datei-Upload ist an UNS gescheitert, nicht am Kunden. Was er
     selbst richten kann (Format, Groesse), loest keine Meldung aus. */
  | "upload.fehlgeschlagen"
  | "auftrag.fehler"
  /* Der Zeitplan war weg und ist wieder da. Kommt aus dem Rueckblick
     in /api/auftrag (lib/zeitplan-wacht.ts) und sagt, WIE LANGE die
     Luecke war. Solange er weg BLEIBT, kann diese Meldung nicht
     entstehen; dafuer gibt es das Band im internen Bereich. */
  | "auftrag.ausgefallen"
  // Die Kasse (Stripe): bezahlte Bestellung, Verarbeitungs- oder
  // Abgleichsfehler, gescheiterte Abbuchung (Mahnwesen ohne Automatik)
  | "bestellung.eingegangen"
  | "bestellung.fehler"
  /* EINE PROTOKOLLSPUR FEHLT (31.08.2026). Der Vorgang selbst ist
     geschehen, sein Eintrag im Protokoll nicht: eine Einsicht in einen
     Bonitaetsnachweis, eine Entscheidung darueber, ein Loeschlauf.

     EIGENE ART UND NICHT bestellung.fehler: Diese Meldungen fuehren
     nicht in den Bestell-Bereich, und sie sind kein Geldproblem. Sie
     zaehlen, weil ein Protokoll mit Luecken bei einer Auskunftsanfrage
     schlechter ist als keines: Man kann dann an keiner Stelle mehr
     belegen, wer wann in die Unterlagen eines Menschen gesehen hat. */
  | "protokoll.luecke"
  /* EIN BEZAHLTES STRIPE-EREIGNIS LIEGT SEIT EINEM TAG UNVERARBEITET.
     Der Nachholer greift, sobald das Konto entsteht; kommt es nie (der
     Gast bricht ab, checkout.session.completed scheitert dauerhaft),
     liegt das Ereignis weiter da. Genau so lagen 17 Ereignisse
     neunzehn Tage lang, und niemand sah die Tabelle an. */
  | "zahlung.haengt"
  | "zahlung.fehlgeschlagen"
  /* Der Foto-KI-Rueckruf (Autoenhance) hat etwas gemeldet, das ein
     Mensch lesen muss: die Kopfzeilen-Messung nach dem Eintragen der
     Adresse (welcher Kopf traegt die Beglaubigung?) oder eine
     beglaubigte Meldung zu einem Bild, das es bei uns nicht gibt.
     Alles, was von aussen hereinkommt, ist erst einmal fremd. */
  | "foto_ki.webhook";

/**
 * WELCHE MELDUNGEN EINE AUFGABE SIND, und damit: welche im internen
 * Bereich unter "Meldungen" stehen und abgehakt werden koennen.
 *
 * DER BEFUND DAHINTER (16.08.2026): `ereignis_protokoll` wurde
 * geschrieben und von KEINER einzigen Seite gelesen. Die beste der
 * drei gemessenen Bauweisen, `stripeAboBeendenZum`, meldet dem Team,
 * wenn ein Abo nicht beendet werden konnte, und diese Meldung hat
 * niemand je gesehen. Eine Warnung, die niemand liest, ist so gut wie
 * keine.
 *
 * DIE AUSWAHL FOLGT EINER FRAGE: Hat dieser Vorgang schon einen
 * anderen Ort, an dem er auffaellt? Ein neues Gebot steht im
 * Bieterverfahren, eine Anfrage im Posteingang, ein Rueckruf bei den
 * Terminen. Die hier sind die, die sonst NIRGENDS auftauchen, weil
 * ihr Wesen ist, dass etwas NICHT geschehen ist.
 *
 * ---------------------------------------------------------------------
 * WIE EINE MELDUNG ERLISCHT (Bau-Runde 8)
 * ---------------------------------------------------------------------
 * Befund der Runde 7: Keine Meldung erledigte sich mit ihrem Vorgang.
 * Fehler-Bestellung, Kuendigungs-Frist und Makler-Zuweisung wurden
 * dadurch ZWEIMAL gemahnt, einmal als Vorgang und einmal als Meldung,
 * und die Meldung blieb offen stehen, obwohl laengst erledigt war,
 * worauf sie zeigte.
 *
 * Deshalb erklaert jetzt JEDE Aufgaben-Art ihr Erloeschen selbst:
 *
 *   "mit dem Vorgang"  `abgeschlossen` misst am Vorgang, ob er
 *                      abgeschlossen ist. Der Zeitplan-Auftrag
 *                      "Meldungen abgleichen" (lib/meldung-abgleich.ts)
 *                      hakt solche Meldungen dann von selbst ab,
 *                      sichtbar als "von selbst erledigt".
 *   "nur von Hand"     Es gibt keinen Vorgangs-Zustand, an dem sich
 *                      das Erledigtsein messen liesse. Der Haken
 *                      bleibt beim Menschen, und der Grund steht dabei.
 *
 * IM ZWEIFEL BLEIBT SIE OFFEN: Ist der Vorgang nicht auffindbar (alte
 * Kennungen, geloeschte Zeilen), erledigt der Abgleich NICHTS. Eine
 * Meldung, die faelschlich offen bleibt, mahnt doppelt; eine, die
 * faelschlich erlischt, mahnt nie wieder. Das erste ist laestig, das
 * zweite ist genau der stille Ausfall, gegen den alles hier gebaut ist.
 *
 * Der Record ueber ALLE Aufgaben-Arten ist Absicht (Vorbild
 * config/auftraege.ts): Wer eine neue Art aufnimmt, muss ihr Erloeschen
 * erklaeren, sonst scheitert der Bau. Vergessen ist damit keine
 * Moeglichkeit mehr.
 */
export type MeldungsAufgabe =
  | { erlischt: "nur von Hand"; grund: string }
  | {
      erlischt: "mit dem Vorgang";
      grund: string;
      /** Misst am Vorgang. true heisst: abgeschlossen, Meldung erlischt. */
      abgeschlossen: (
        service: SupabaseClient,
        kennungen: Record<string, string | null>
      ) => Promise<boolean>;
    };

/** Die Aufgaben-Arten, ein Teil der Ereignis-Arten */
export type AufgabenArt =
  | "anfrage.gebremst"
  | "bestellung.fehler"
  | "zahlung.fehlgeschlagen"
  | "mail.fehlgeschlagen"
  | "upload.fehlgeschlagen"
  | "auftrag.fehler"
  | "auftrag.ausgefallen"
  | "kuendigung.wartet"
  | "zahlung.haengt"
  | "portal.eingang_fehler"
  | "portal.rueckzug"
  | "buchung.ohne_makler"
  | "foto_ki.webhook";

export const MELDUNGS_AUFGABEN: Record<AufgabenArt, MeldungsAufgabe> = {
  /* Ungewoehnlich viele Anfragen auf ein Objekt, die Mails je Anfrage
     setzen aus. Taucht sonst nirgends auf: Der Posteingang zeigt die
     Anfragen, aber nicht, dass eine Grenze sie gerade daempft. */
  "anfrage.gebremst": {
    erlischt: "nur von Hand",
    grund:
      "Ob es Missbrauch war oder ein Objekt, das wirklich so gefragt ist, entscheidet ein Mensch; die Grenze selbst loest sich am naechsten Kalendertag, die Frage nicht.",
  },
  "bestellung.fehler": {
    erlischt: "mit dem Vorgang",
    grund:
      "Die Zeile in bestellungen traegt den Stand; verlaesst sie 'fehler', ist der Vorgang bearbeitet. Erstattungs-Meldungen zeigen stattdessen auf die Rechnung und erloeschen, sobald dort ein Erstattungs-Betrag steht.",
    abgeschlossen: async (service, kennungen) => {
      const vorgang = kennungen.vorgang ?? null;
      if (!vorgang) return false;
      /* Zwei Gestalten derselben Art: Verarbeitungs-Fehler zeigen auf
         eine Bestellung, Erstattungs-Fehler auf eine Stripe-Rechnung
         (stripe_invoice_id). Was nicht auffindbar ist, bleibt offen. */
      const { data: bestellung, error: bestellungFehler } = await service
        .from("bestellungen")
        .select("status")
        .eq("id", vorgang)
        .maybeSingle<{ status: string }>();
      if (bestellungFehler) return false;
      if (bestellung) return bestellung.status !== "fehler";
      const { data: rechnung, error: rechnungFehler } = await service
        .from("rechnungen")
        .select("erstattet")
        .eq("stripe_invoice_id", vorgang)
        .maybeSingle<{ erstattet: number | null }>();
      if (rechnungFehler) return false;
      if (rechnung) return rechnung.erstattet !== null && Number(rechnung.erstattet) > 0;
      return false;
    },
  },
  "zahlung.fehlgeschlagen": {
    erlischt: "mit dem Vorgang",
    grund:
      "Bei einer Abo-Abbuchung steht die Ueberfaellig-Marke an der Buchung und faellt mit der nachgeholten Zahlung; bei einer Bestellung gilt der Stand 'bezahlt'. Beides ist messbar.",
    abgeschlossen: async (service, kennungen) => {
      const vorgang = kennungen.vorgang ?? null;
      if (!vorgang) return false;
      const { data: buchung, error: buchungFehler } = await service
        .from("buchungen")
        .select("zahlung_ueberfaellig_seit")
        .eq("id", vorgang)
        .maybeSingle<{ zahlung_ueberfaellig_seit: string | null }>();
      if (buchungFehler) return false;
      if (buchung) return buchung.zahlung_ueberfaellig_seit === null;
      const { data: bestellung, error: bestellungFehler } = await service
        .from("bestellungen")
        .select("status")
        .eq("id", vorgang)
        .maybeSingle<{ status: string }>();
      if (bestellungFehler) return false;
      if (bestellung) return bestellung.status === "bezahlt";
      return false;
    },
  },
  "mail.fehlgeschlagen": {
    erlischt: "nur von Hand",
    grund:
      "Eine verlorene Mail wird nicht von selbst gut. Ob nachgeholt, ueberholt oder verschmerzt, weiss nur, wer nachgesehen hat.",
  },
  "upload.fehlgeschlagen": {
    erlischt: "nur von Hand",
    grund:
      "Ob die Datei erneut kam oder der Kunde aufgegeben hat, steht in keiner Spalte.",
  },
  /* EIGENE ART UND NICHT bestellung.fehler (31.08.2026): Deren
     `abgeschlossen` sucht ueber `kennungen.vorgang` eine Bestellung.
     Hier ist der Vorgang ein STRIPE-EREIGNIS, keine Bestellung; die
     Meldung waere nie erloschen und haette den Zaehler dauerhaft
     hochgehalten. Genau daran haette man nach zwei Wochen aufgehoert
     hinzusehen. */
  "zahlung.haengt": {
    erlischt: "mit dem Vorgang",
    grund:
      "Die Zeile in stripe_ereignisse traegt den Stand: Sobald verarbeitet_am gesetzt ist, hat entweder Stripe erneut zugestellt oder der Nachholer gegriffen, und die Meldung ist gegenstandslos.",
    abgeschlossen: async (service, kennungen) => {
      const vorgang = kennungen.vorgang ?? null;
      if (!vorgang) return false;
      const { data, error } = await service
        .from("stripe_ereignisse")
        .select("verarbeitet_am")
        .eq("id", vorgang)
        .maybeSingle<{ verarbeitet_am: string | null }>();
      /* EIN LESEFEHLER IST KEIN ERLEDIGT (dieselbe Regel wie bei
         bestellung.fehler): Wer nicht nachsehen kann, hakt nichts ab.
         Und ein Ereignis, das es nicht mehr gibt, ist erledigt: Dann
         hat jemand aufgeraeumt. */
      if (error) return false;
      if (!data) return true;
      return Boolean(data.verarbeitet_am);
    },
  },
  "auftrag.fehler": {
    erlischt: "nur von Hand",
    grund:
      "Hinter dieser Art stehen verschiedene Ursachen (Zeitplan-Fehler, ausgebliebene Auftraege, ausgebliebene Uebernahmen); es gibt keinen einen Vorgangs-Zustand, an dem sich alle messen liessen.",
  },
  "auftrag.ausgefallen": {
    erlischt: "nur von Hand",
    grund:
      "Die Meldung entsteht erst, wenn der Zeitplan WIEDER laeuft; sie ist der Nachweis der Luecke, und den nimmt ein Mensch zur Kenntnis.",
  },
  "kuendigung.wartet": {
    erlischt: "mit dem Vorgang",
    grund:
      "Der Eingang traegt verarbeitet_am; damit ist die Kuendigung eingetragen und die Doppel-Mahnung (Vorgang und Meldung) endet mit dem Vorgang.",
    abgeschlossen: async (service, kennungen) => {
      const vorgang = kennungen.vorgang ?? null;
      if (!vorgang) return false;
      const { data, error } = await service
        .from("kuendigungs_eingaenge")
        .select("verarbeitet_am")
        .eq("id", vorgang)
        .maybeSingle<{ verarbeitet_am: string | null }>();
      if (error || !data) return false;
      return data.verarbeitet_am !== null;
    },
  },
  "portal.eingang_fehler": {
    erlischt: "nur von Hand",
    grund:
      "Die Originaldatei muss ein Mensch ansehen; ob die Anfrage dahinter beantwortet wurde, weiss die Datei nicht.",
  },
  /* Die Portalschaltung ist zu Ende und die Inserate muessen von Hand
     zurueckgezogen werden. Faellt weg, sobald die Portal-Anbindung das
     selbst erledigt. */
  "portal.rueckzug": {
    erlischt: "nur von Hand",
    grund:
      "Der Rueckzug geschieht bei den Portalen, ausserhalb unserer Daten; erst die Portal-Anbindung macht ihn messbar.",
  },
  /* Der Foto-KI-Rueckruf: die Kopfzeilen-Messung (webhook_updated)
     und beglaubigte Meldungen zu unbekannten Bildern. */
  "foto_ki.webhook": {
    erlischt: "nur von Hand",
    grund:
      "Die Messung beantwortet die Frage, in welchem Kopf die Beglaubigung ankommt; das liest ein Mensch und traegt den Befund in den Bericht. Fuer eine fremde Bild-Kennung gibt es keinen Vorgang, an dem sich etwas messen liesse.",
  },
  /* Ein Kunde hat die Begleitung bezahlt, und es ist ihm niemand
     zugewiesen. Er wartet auf einen Menschen, den es fuer ihn noch
     nicht gibt. */
  "buchung.ohne_makler": {
    erlischt: "mit dem Vorgang",
    grund:
      "Die Zuweisung steht in profiles.betreuer_id; sobald dort jemand steht, hat der Kunde seinen Menschen, und der Zuweisungs-Auftrag erledigt sich ohnehin von selbst (lib/auftraege.ts).",
    abgeschlossen: async (service, kennungen) => {
      const kunde = kennungen.kunde ?? null;
      if (!kunde) return false;
      const { data, error } = await service
        .from("profiles")
        .select("betreuer_id")
        .eq("id", kunde)
        .maybeSingle<{ betreuer_id: string | null }>();
      if (error || !data) return false;
      return data.betreuer_id !== null;
    },
  },
};

/**
 * ABGELEITET aus dem Katalog, nicht gepflegt: die Liste steht damit
 * genau einmal. Reihenfolge und Mitgliedschaft kommen aus
 * MELDUNGS_AUFGABEN.
 */
export const MELDUNGEN_MIT_AUFGABE: EreignisArt[] = Object.keys(
  MELDUNGS_AUFGABEN
) as AufgabenArt[];

export function istAufgabe(ereignis: string): boolean {
  return (MELDUNGEN_MIT_AUFGABE as string[]).includes(ereignis);
}

/**
 * WAS NIEMALS AN EINEN MAKLER GEHT (festgelegt am 16.08.2026).
 *
 * DIE ENTSCHEIDUNG: Ein Vertragsende ist unsere Sache und nicht die
 * des Begleiters. Wer einen Kunden betreut, hat kein Interesse daran
 * zu erfahren, dass dieser Kunde kuendigt, und er hat auch nichts
 * damit zu tun; die Zuordnung zum Vertrag und das Eintragen des Endes
 * macht das Team.
 *
 * WARUM ALS LISTE UND NICHT ALS KOMMENTAR: Heute geht keine
 * Kuendigungs-Meldung an einen Makler, weil an allen vier Aufrufstellen
 * `{ art: "admin" }` steht. Das ist eine Eigenschaft von vier Zeilen,
 * und vier Zeilen aendert irgendwann jemand. Eine neue Meldung, die
 * ueber meldeFuerKunden laeuft, wuerde stillschweigend beim Makler
 * landen; genau diese Sorte Aufweichung soll hier auflaufen.
 *
 * DER RIEGEL SITZT IN melde() SELBST, also hinter allen drei Wegen
 * (melde, meldeAnMakler, meldeFuerKunden). Er weist nicht ab, sondern
 * LENKT UM: Eine Meldung zu verlieren waere schlimmer als eine, die
 * beim Admin statt beim Makler landet. Dass umgelenkt wurde, steht im
 * Grund der Protokoll-Zeile, damit es niemandem entgeht.
 */
/**
 * WAS ALS MAIL AN DAS TEAM GEHT, weil es jemanden erreichen MUSS.
 *
 * =====================================================================
 * WOZU (Entscheidung des Inhabers, 31.08.2026)
 * =====================================================================
 * `melde()` verschickt ueber n8n, und n8n ist nicht angebunden. Gemessen
 * an dem Tag: 247 Meldungen im Protokoll, davon NULL verschickt. Sie
 * liegen unter /admin/meldungen und warten darauf, dass jemand
 * hinsieht.
 *
 * Der Inhaber dazu: "Eine Ueberwachung, deren Meldung niemanden
 * erreicht, ist keine."
 *
 * DIESE LISTE IST DER KLEINSTE WEG, DER OHNE n8n TRAEGT, und sie ist
 * mit Absicht kurz: Von den 247 Meldungen waren 83 Prozent
 * Betriebsmeldungen ("eine Buchung ist eingegangen"). Die gehoeren in
 * die Liste, nicht ins Postfach. Die sechs hier haetten in denselben
 * dreizehn Tagen SIEBEN Mails erzeugt.
 *
 * =====================================================================
 * DER MASSSTAB: GELD ODER FRIST
 * =====================================================================
 * Nichts kommt dazu, weil es "auch wichtig" ist. Es kommt dazu, wenn
 * ein Mensch daran Geld verliert oder eine Frist reisst.
 *
 * =====================================================================
 * WARUM `mail.fehlgeschlagen` HIER STEHT, OBWOHL SIE ES LANGE NICHT DURFTE
 * =====================================================================
 * BIS ZUM 31.08.2026 ABENDS STAND HIER DAS GEGENTEIL, und der Grund war
 * gut: Scheitert eine dieser Team-Mails, entsteht genau diese Art;
 * stuende sie in der Liste, loeste der Fehlschlag die naechste Mail aus.
 *
 * Der erste echte Nachschlage-Lauf zeigte, was der Ausschluss kostet:
 * drei gefundene Ruecklaeufer, drei Meldungen, keine einzige Mail. Der
 * Inhaber: "Sonst haben wir wieder eine Tabelle, von der niemand
 * erfaehrt."
 *
 * SIE DARF JETZT HIER STEHEN, WEIL DIE KETTE AM ERSTEN GLIED BRICHT:
 * `kettenBruchGrund()` weiter unten verschickt NICHT, wenn die
 * betroffene Mail an das Team-Postfach selbst ging, und auch nicht,
 * wenn die Meldung gar nicht sagt, an wen sie ging.
 *
 * `scripts/meldeweg-pruefen.mts` bricht den Bau, sobald dieser Riegel
 * fehlt, nach dem Versand steht oder eine Meldestelle die Adresse nicht
 * nennt. Ein Kommentar allein haette nicht genuegt.
 */
export const MELDUNG_PER_MAIL: EreignisArt[] = [
  /* --- GELD --- */
  /* Eine Verarbeitung ist gescheitert oder eine Erstattung nicht
     vermerkt. Der Kunde hat bezahlt; was hier liegen bleibt, kostet
     ihn seine Leistung oder uns das Geld. */
  "bestellung.fehler",
  /* Eine Abbuchung ist geplatzt. Ohne Nachfassen endet die Leistung. */
  "zahlung.fehlgeschlagen",
  /* Ein bezahltes Stripe-Ereignis liegt laenger als einen Tag
     unverarbeitet. Dahinter steht eine Rechnung, die es bei uns nicht
     gibt. */
  "zahlung.haengt",
  /* --- FRIST --- */
  /* Der Zeitplan nennt sie selbst "von allem, was dieser Lauf tut, der
     einzige Punkt, an dem taeglich ein Schaden waechst": Eine
     unbearbeitete Kuendigung nach § 312k heisst, dass wir Geld von
     jemandem nehmen, der nicht mehr zahlen will. */
  "kuendigung.eingegangen",
  /* Dieselbe Sache, nachdem die Frist gerissen ist. */
  "kuendigung.wartet",
  /* Der Zeitplan war weg. In dieser Zeit ist KEINE Frist gelaufen und
     keine Erinnerung hinausgegangen; die Meldung ist der Nachweis der
     Luecke. */
  "auftrag.ausgefallen",
  /* --- EINE MAIL IST NICHT ANGEKOMMEN --- */
  /* SEIT DEM 31.08.2026 IN DER LISTE, und der Weg dahin gehoert dazu:
     Zuerst stand sie ausdruecklich NICHT hier, gegen die Schleife. Der
     erste echte Nachschlage-Lauf zeigte, was das kostet: drei gefundene
     Ruecklaeufer, drei Meldungen, keine einzige Mail. Der Inhaber dazu:
     "Sonst haben wir wieder eine Tabelle, von der niemand erfaehrt."

     DIE SCHLEIFE IST NICHT WEG, sie bricht am ersten Glied:
     `kettenBruchGrund()` verschickt NICHT, wenn die gescheiterte Mail
     an das Team-Postfach selbst ging oder wenn die Meldung gar nicht
     sagt, an wen sie ging. */
  "mail.fehlgeschlagen",
];

/* AUSDRUECKLICH NICHT IN DER LISTE, und der Grund gehoert dazu, damit
   ihn niemand fuer ein Versehen haelt:

   auftrag.fehler       Dahinter stehen verschiedene Ursachen ohne
                        gemeinsamen Vorgangs-Zustand (siehe
                        MELDUNGS_AUFGABEN); die Meldung sagt nicht, was
                        zu tun ist, und eine Mail, die das nicht sagt,
                        ist Laerm.
   protokoll.luecke     Datenschutz-Frage, aber keine Frist und kein
                        Geld. Der Vorgang selbst ist geschehen.
   Alle Betriebsmeldungen (buchung.eingegangen, anfrage.eingegangen,
   besichtigung.zusage, expose.freigegeben, portal.rueckzug): Sie sagen,
   dass etwas GUT gegangen ist. */

/**
 * Die Meldung als schlichte Mail an das Team-Postfach.
 *
 * KEINE VORLAGE, KEIN RAHMEN: Sie geht an uns und nicht an einen
 * Kunden. Was zaehlt, ist, dass sie ankommt und die Kennung nennt,
 * damit man im internen Bereich weitersucht.
 */
/**
 * DARF DIESE MELDUNG PER MAIL HINAUSGEHEN?
 *
 * Gibt den Grund zurueck, warum NICHT, oder null, wenn nichts dagegen
 * spricht. Betrifft ausschliesslich `mail.fehlgeschlagen`; jede andere
 * Art entscheidet allein MELDUNG_PER_MAIL.
 *
 * =====================================================================
 * WARUM ES DIESE FUNKTION GIBT (gemessen am 31.08.2026)
 * =====================================================================
 * Zuerst war `mail.fehlgeschlagen` GANZ vom Mail-Weg ausgenommen, gegen
 * die Schleife. Das war richtig fuer die Quelle, die es damals gab: Wenn
 * eine Team-Mail beim Versand scheitert, entsteht genau diese Art.
 *
 * Der erste echte Nachschlage-Lauf brachte die zweite Quelle: Er findet
 * Ruecklaeufer STUNDEN ODER TAGE spaeter. Der Lauf meldete drei, und
 * alle drei standen mit `verschickt = false` im Protokoll. Der Inhaber
 * dazu: "Sonst haben wir wieder eine Tabelle, von der niemand erfaehrt."
 *
 * Die Kette bricht jetzt am ERSTEN Glied statt gar nicht zu entstehen:
 * Ein Ruecklaeufer an eine Kundenadresse geht hinaus. Kommt DIESE
 * Meldung zurueck, ging sie an das Team-Postfach, und dann bleibt es
 * beim Protokoll.
 */
function kettenBruchGrund(meldung: Meldung): string | null {
  if (meldung.ereignis !== "mail.fehlgeschlagen") return null;

  const team = siteConfig.contact.meldungenEmail?.trim().toLowerCase();
  const betroffen = meldung.betroffeneMailAn?.trim().toLowerCase();

  /* Kein Versand gescheitert, also keine Schleife moeglich. */
  if (betroffen === NICHT_DAS_TEAM_POSTFACH) return null;

  if (!betroffen) {
    /* KEINE ANGABE HEISST NICHT VERSCHICKEN. Wer sie vergisst, bekommt
       eine stumme Meldung; das ist die harmlosere Haelfte des Irrtums. */
    return (
      "Die Meldung nennt nicht, an welche Adresse die gescheiterte Mail ging. " +
      "Ohne diese Angabe geht sie nicht per Mail hinaus, weil sie sonst an das " +
      "Team-Postfach gehen koennte und dessen eigenen Ruecklaeufer vervielfachen wuerde."
    );
  }
  if (team && betroffen === team) {
    return (
      "Die gescheiterte Mail ging an das Team-Postfach selbst. Eine Mail darueber " +
      "traefe dieselbe Adresse und erzeugte beim naechsten Lauf die naechste Meldung. " +
      "Hier bricht die Kette; die Meldung steht unter /admin/meldungen."
    );
  }
  return null;
}

async function teamMailSenden(nutzlast: {
  ereignis: string;
  text: string;
  kennungen: Record<string, string | null>;
  link: string | null;
}): Promise<{ verschickt: boolean; grund: string }> {
  const an = siteConfig.contact.meldungenEmail;
  if (!an) return { verschickt: false, grund: "Kein Team-Postfach eingetragen." };

  /* DIE VORLAGE STEHT IN lib/mail-vorlagen.ts UND IM KATALOG, und das
     ist keine Formsache: `katalog:pruefen` hat den ersten Anlauf dieser
     Mail beanstandet, weil sie den Text hier an Ort und Stelle baute.
     Ihr Grund war gut: Eine Mail ohne Katalog-Eintrag sieht niemand an,
     weder die Vorschau im internen Bereich noch mail-text:pruefen. */
  const { teamMeldungMail } = await import("@/lib/mail-vorlagen");
  const inhalt = teamMeldungMail({
    ereignis: nutzlast.ereignis,
    text: nutzlast.text,
    kennungen: nutzlast.kennungen,
    link: nutzlast.link,
  });

  const { sendeMail } = await import("@/lib/mail");
  const befund = await sendeMail({
    an,
    betreff: inhalt.betreff,
    html: inhalt.html,
    text: inhalt.text,
    art: "benachrichtigung",
    vorlage: "team-meldung",
    /* OHNE EIGENTUEMER, UND DAS IST ENTSCHIEDEN, nicht uebersehen
       (Inhaber, 31.08.2026):
       "Dass die Mail dort ohne Eigentuemer hinausgeht, auch bei einer
        Vorfuehrung, ist mir recht. Eine haengende Zahlung will ich auch
        dann wissen, wenn sie aus einer Vorfuehrung stammt."

       WAS DAS HEISST: Der Vorfuehr-Riegel haengt am Eigentuemer des
       Vorgangs (lib/mail.ts). Diese Mail nennt keinen, also greift er
       nicht, und eine Meldung ueber einen Vorfuehr-Vorgang geht
       wirklich hinaus.

       WARUM DAS HIER RICHTIG IST: Bei `zahlung.haengt` ist der
       Eigentuemer GERADE DAS, was fehlt; ihn zu verlangen hiesse, genau
       die Meldung zu unterdruecken, die es braucht. Und der Empfaenger
       ist immer dasselbe eigene Postfach, nie ein Kunde und nie ein
       Dritter.

       WER DIES ALS LOCH MELDEN WILL: Es ist keins, es ist die
       Entscheidung oben. */
    ohneEigentuemer: {
      grund:
        "Meldung an das eigene Team-Postfach ueber einen Vorgang, dessen Eigentuemer haeufig gerade unbekannt ist; ausdrueckliche Entscheidung des Inhabers vom 31.08.2026, auch bei Vorfuehr-Vorgaengen",
    },
  });
  return {
    verschickt: befund,
    grund: befund ? "" : "sendeMail meldet false, siehe Versandprotokoll.",
  };
}

export const NUR_AN_DEN_ADMIN: EreignisArt[] = [
  "kuendigung.eingegangen",
  "kuendigung.wartet",
  /* Geld ist ebenfalls unsere Sache: Preise, Abbuchungen und
     Erstattungen gehen einen Begleiter nichts an, und im internen
     Bereich sieht er die Bereiche Buchungen und Bestellungen ohnehin
     nicht (lib/admin-navigation.ts, NUR_ADMIN). */
  "bestellung.eingegangen",
  "bestellung.fehler",
  "zahlung.fehlgeschlagen",
  /* Die eigene Maschinerie geht einen Begleiter nichts an. Dass der
     Zeitplan stand, muss das Team richten, nicht der Makler, und die
     Notizen eines Laufs nennen Vorgaenge fremder Kunden. */
  "auftrag.fehler",
  "auftrag.ausgefallen",
  /* Ob eine Grenze gegen Missbrauch greift, ist Sache des Teams,
     nicht des Begleiters; die Anfragen selbst sieht er weiter. */
  "anfrage.gebremst",
  /* Eine Luecke im Protokoll ueber Bonitaetsnachweise nennt den
     Vorgang eines fremden Interessenten und gehoert dem Team, nicht
     einem Begleiter. */
  "protokoll.luecke",
  /* Geld ist unsere Sache, siehe oben. Ein haengendes Zahlungsereignis
     nennt zudem Betrag und Stripe-Kunden. */
  "zahlung.haengt",
];

/**
 * Fuer `betroffeneMailAn`, wenn sicher ist, dass die betroffene Mail
 * NICHT an das Team-Postfach ging.
 *
 * ZWEI FAELLE, und der Name deckt beide wahrheitsgemaess ab:
 *
 *   1. Es ist gar keine Mail gescheitert. Der haeufigste Fall, und der
 *      Name der Art verschweigt ihn: Sieben von zwoelf Meldestellen
 *      betreffen einen Merker, der NACH einem gelungenen Versand nicht
 *      gesetzt wurde.
 *   2. Eine Mail ist gescheitert, aber sie ging nachweislich an einen
 *      Kunden, und dessen Adresse steht an der Stelle nicht zur Hand
 *      (lib/verfuegbarkeit-server.ts: die Rueckmeldung an den
 *      Verkaeufer schlaegt die Adresse selbst nach).
 *
 * ER HIESS ZUERST KEINE_MAIL_BETROFFEN, und das war fuer Fall 2 schlicht
 * falsch: Dort IST eine Mail gescheitert. Ein Sonderwert, der an einer
 * Stelle luegt, wird beim naechsten Lesen geglaubt.
 *
 * ALS EIGENER WERT UND NICHT ALS WEGGELASSENE ANGABE: Eine fehlende
 * Angabe kann ein Versehen sein und schweigt deshalb. Dieser Wert ist
 * eine Entscheidung, und man sieht ihm beim Lesen an, dass jemand sie
 * getroffen hat.
 */
export const NICHT_DAS_TEAM_POSTFACH = "keine-mail-betroffen";

export type Empfaenger =
  /** Der zustaendige Makler. kennung ist seine n8n_kennung. */
  | { art: "makler"; kennung: string | null }
  /** Alle Admins. n8n entscheidet, wer das ist. */
  | { art: "admin"; kennung?: null };

export type Meldung = {
  ereignis: EreignisArt;
  empfaenger: Empfaenger;
  /** Ein Satz, ohne Namen und ohne Zahlen aus dem Vorgang */
  kurztext: string;
  /** Nur Kennungen, damit sich der Vorgang im Admin finden laesst */
  kennungen?: Record<string, string | null>;
  /** Pfad im Admin, etwa "/admin/termine". Die Basis kommt von uns. */
  adminPfad?: string;
  /**
   * NUR FUER `mail.fehlgeschlagen`: An welche Adresse ging die Mail,
   * um die es hier geht?
   *
   * DAS IST DAS GLIED, AN DEM DIE KETTE BRICHT (31.08.2026). Ohne diese
   * Angabe entstuende die Schleife: Meldung per Mail an das Team, Mail
   * kommt zurueck, das erzeugt wieder `mail.fehlgeschlagen`, wieder
   * eine Mail. Ein Glied je Lauf, und selbstverstaerkend genau dann,
   * wenn das Team-Postfach kaputt ist.
   *
   * `melde()` vergleicht die Adresse mit dem Team-Postfach und
   * verschickt dann NICHT. Ein Ruecklaeufer an eine Kundenadresse geht
   * hinaus, einer an das Team-Postfach bleibt im Protokoll.
   *
   * FEHLT DIE ANGABE, WIRD NICHT VERSCHICKT. Wer sie vergisst, bekommt
   * eine stumme Meldung und keine Schleife; das ist die Richtung, in
   * die ein Versehen fallen darf. `meldeweg:pruefen` erzwingt, dass
   * jede Stelle sie setzt.
   *
   * FUER DEN HAEUFIGEN FALL, DASS GAR KEINE MAIL SCHEITERTE, steht
   * NICHT_DAS_TEAM_POSTFACH. Sieben der zwoelf Stellen sind so: Die Mail
   * ging hinaus, nur ein Merker danach nicht. Von dort kann keine
   * Schleife ausgehen, und ein geratener Empfaenger waere schlimmer als
   * ein ausdrueckliches "keiner".
   */
  betroffeneMailAn?: string | null;
};

/** Der Rumpf, der bei n8n ankommt. Version 1, damit sich das erweitern laesst. */
type Nutzlast = {
  version: 1;
  ereignis: string;
  zeitpunkt: string;
  empfaenger: { art: string; kennung: string | null };
  text: string;
  kennungen: Record<string, string | null>;
  link: string | null;
};

/**
 * Eine Meldung absetzen. Wirft nie; der Aufrufer muss nichts abfangen
 * und darf das Ergebnis ignorieren.
 */
/**
 * Was aus einer Meldung wurde (Bau-Runde 17).
 *
 * WOZU DAS NOETIG WURDE: Zwei Stellen im Zeitplan setzen ihren Merker
 * (eskaliert_am, erinnert_am), BEVOR sie melden, damit kein zweiter
 * Lauf dieselbe Mahnung wiederholt. Solange melde() nichts
 * zurueckgibt, koennen sie den Merker im Fehlerfall nicht
 * zuruecknehmen; eine Kuendigung galt dann als eskaliert, ohne dass
 * jemand davon erfuhr, und wurde nie wieder angemahnt.
 *
 * WAS "ANGEKOMMEN" HEISST: nicht "n8n hat sie bekommen". Der
 * eigentliche Empfaenger ist ereignis_protokoll und damit
 * /admin/meldungen; das ist der Weg, der auch ohne n8n steht (heute
 * ist N8N_WEBHOOK_URL live nicht gesetzt). Erst wenn AUCH diese Zeile
 * ausbleibt, hat niemand etwas erfahren. Genau das sagt
 * `protokolliert`.
 */
export type MeldeBefund = {
  /** Die Zeile in ereignis_protokoll steht. Der Admin-Bereich zeigt sie. */
  protokolliert: boolean;
  /** Die Gegenstelle hat sie zusaetzlich angenommen (n8n) */
  verschickt: boolean;
  /** Warum nicht, im Klartext */
  grund: string | null;
};

/** Melden, ohne den Ausgang anzusehen. Der Weg der meisten Aufrufer. */
export async function melde(meldung: Meldung): Promise<void> {
  await meldeMitBefund(meldung);
}

export async function meldeMitBefund(meldung: Meldung): Promise<MeldeBefund> {
  const zeitpunkt = new Date().toISOString();

  /* DER RIEGEL, siehe NUR_AN_DEN_ADMIN. Steht hier und nicht bei den
     Aufrufern, weil alle drei Wege hier vorbeikommen. */
  let umgelenkt: string | null = null;
  let empfaenger = meldung.empfaenger;
  if (
    empfaenger.art === "makler" &&
    (NUR_AN_DEN_ADMIN as string[]).includes(meldung.ereignis)
  ) {
    umgelenkt = `Diese Ereignis-Art geht nie an einen Makler (${meldung.ereignis}), sie wurde auf den Admin-Kanal umgelenkt.`;
    console.warn("[ereignis]", umgelenkt);
    empfaenger = { art: "admin" };
  }
  const basis = appBasis() ?? siteConfig.domain;
  const link = meldung.adminPfad ? `${basis}${meldung.adminPfad}` : null;

  const nutzlast: Nutzlast = {
    version: 1,
    ereignis: meldung.ereignis,
    zeitpunkt,
    empfaenger: {
      art: empfaenger.art,
      kennung: empfaenger.kennung ?? null,
    },
    text: meldung.kurztext,
    kennungen: meldung.kennungen ?? {},
    link,
  };

  let verschickt = false;
  let grund: string | null = umgelenkt;

  const ziel = process.env.N8N_WEBHOOK_URL;
  const geheimnis = process.env.N8N_SECRET;

  const dazu = (satz: string) => (umgelenkt ? `${umgelenkt} ${satz}` : satz);

  if (!ziel) {
    /* DER ERSATZWEG, solange n8n fehlt (31.08.2026).
       Er steht HIER und nicht daneben, und das ist der Kern: Sobald
       N8N_WEBHOOK_URL gesetzt ist, laeuft dieser Zweig nicht mehr, und
       die Mail schweigt von selbst. Der Inhaber wollte ihn als ERSATZ
       und nicht als Ergaenzung, damit spaeter niemand entscheiden muss,
       ob doppelt gemeldet wird. */
    const kettenBruch = kettenBruchGrund(meldung);
    if (kettenBruch) {
      /* DIE AUSNAHME VON DER AUSNAHME (Entscheidung des Inhabers,
         31.08.2026). Sie steht HIER und nicht bei den Aufrufern: Eine
         Regel, die jeder Aufrufer selbst anwenden muss, faellt beim
         naechsten neuen Aufrufer aus. */
      grund = dazu(kettenBruch);
    } else if ((MELDUNG_PER_MAIL as string[]).includes(nutzlast.ereignis)) {
      const befund = await teamMailSenden(nutzlast);
      verschickt = befund.verschickt;
      grund = dazu(
        befund.verschickt
          ? "n8n fehlt; die Meldung ging als Mail an das Team."
          : `n8n fehlt, und die Team-Mail ging nicht hinaus: ${befund.grund}`
      );
    } else {
      grund = dazu("N8N_WEBHOOK_URL ist nicht gesetzt, die Meldung wurde nur protokolliert.");
    }
  } else if (!geheimnis) {
    /* Ohne gemeinsames Geheimnis wird NICHT verschickt. Eine Meldung,
       deren Herkunft die Gegenstelle nicht pruefen kann, ist eine
       offene Tuer, und eine offene Tuer ist schlimmer als eine
       fehlende Meldung. */
    grund = dazu("N8N_SECRET fehlt, ohne Signatur wird nichts verschickt.");
  } else {
    const rumpf = JSON.stringify(nutzlast);
    const signatur = createHmac("sha256", geheimnis).update(rumpf).digest("hex");
    try {
      const antwort = await fetch(ziel, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sv-signatur": `sha256=${signatur}`,
        },
        body: rumpf,
        // Eine haengende Gegenstelle darf die Handlung nicht aufhalten
        signal: AbortSignal.timeout(5000),
      });
      if (antwort.ok) {
        verschickt = true;
      } else {
        grund = dazu(`n8n antwortete mit ${antwort.status}.`);
      }
    } catch (fehler) {
      grund = dazu(`n8n war nicht erreichbar: ${(fehler as Error).message}`);
    }
  }

  /* WOHER STAMMT DIESE ZEILE? (16.08.2026)
     Das Versandprotokoll der Mails traegt seit dem 10.08. eine Marke
     fuer alles, was NICHT im Betrieb entstanden ist (lib/mail-protokoll.ts).
     Hier fehlte sie, und das hat sofort Geld gekostet: Um zu belegen,
     ob N8N_WEBHOOK_URL auf der ausgerollten Seite gesetzt ist, musste
     ich Zeilen ueber ihren Zeitstempel dem Live-Zeitplan zuordnen, weil
     Entwicklungsrechner und Betrieb dieselbe Datenbank beschreiben.
     Mit der Marke ist das eine Abfrage statt einer Herleitung. */
  const marke = process.env.NODE_ENV === "production" ? null : "[Entwicklungsrechner]";
  if (marke) grund = grund ? `${grund} ${marke}` : marke;

  // Protokoll IMMER, verschickt oder nicht
  const service = supabaseService();
  if (!service) {
    console.error("[ereignis] Kein Service-Schluessel, Meldung nicht protokolliert:", nutzlast.ereignis);
    return {
      protokolliert: false,
      verschickt,
      grund: "Kein Service-Schluessel, die Meldung ist nirgends vermerkt.",
    };
  }
  const { error } = await service.from("ereignis_protokoll").insert({
    ereignis: nutzlast.ereignis,
    empfaenger_art: nutzlast.empfaenger.art,
    empfaenger_kennung: nutzlast.empfaenger.kennung,
    kurztext: nutzlast.text,
    kennungen: nutzlast.kennungen,
    link: nutzlast.link,
    verschickt,
    grund,
  });
  if (error) {
    console.error("[ereignis] Protokoll-Eintrag fehlgeschlagen:", error.message);
    return {
      protokolliert: false,
      verschickt,
      grund: `Protokoll-Eintrag fehlgeschlagen: ${error.message}`,
    };
  }
  return { protokolliert: true, verschickt, grund };
}

/**
 * Meldung an den zustaendigen Makler, mit Rueckfall auf den Admin.
 *
 * Ist niemand zugewiesen, geht die Meldung an den Admin statt ins
 * Leere. Genau dann wartet naemlich ein Kunde auf jemanden, den es
 * fuer ihn noch nicht gibt, und das muss auffallen.
 */
export async function meldeAnMakler(
  maklerKennung: string | null,
  meldung: Omit<Meldung, "empfaenger">
): Promise<void> {
  await melde({
    ...meldung,
    empfaenger: maklerKennung
      ? { art: "makler", kennung: maklerKennung }
      : { art: "admin" },
  });
}


/**
 * Meldung, die einen bestimmten Kunden betrifft: sucht selbst den
 * zustaendigen Makler samt Vertretung und faellt auf den Admin
 * zurueck, wenn niemand zugewiesen ist.
 *
 * Der Aufrufer muss damit nichts ueber Zustaendigkeiten wissen, und
 * genau deshalb steht es hier und nicht an jeder Aufrufstelle.
 */
export async function meldeFuerKunden(
  kundeId: string,
  meldung: Omit<Meldung, "empfaenger">
): Promise<void> {
  const { aktiverMakler } = await import("@/lib/makler");
  const betreuung = await aktiverMakler(kundeId);
  const zustaendig = betreuung?.vertretung ?? betreuung?.zustaendig ?? null;
  await meldeAnMakler(zustaendig?.n8n_kennung ?? null, meldung);
}
