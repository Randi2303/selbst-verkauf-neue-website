import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appBasis } from "@/lib/app-basis";
import type { BestellPosition } from "@/lib/bestellung";
import { vollerName } from "@/lib/name";
import { findeAuthNutzer } from "@/lib/einladung";
import { erstelleAuftraegeFuerBuchung } from "@/lib/auftraege";
import { buchungFreischalten } from "@/lib/freischaltung";
import { gutscheinEinloesen, gutscheinFreigeben } from "@/lib/gutschein";
import { melde, NICHT_DAS_TEAM_POSTFACH} from "@/lib/ereignis";
import { sendeMail } from "@/lib/mail";
import { schreibe } from "@/lib/schreiben";
import {
  bestellBestaetigungMail,
  rechnungMail,
  zahlungFehlgeschlagenMail,
} from "@/lib/mail-vorlagen";
import { formatEuroBetrag } from "@/lib/preise";
import { stripeClient } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";
import { ausgeblieben, gewirkt, type Wirkung } from "@/lib/wirkung";
import { siteConfig } from "@/site.config";
import { pflichtMail } from "@/config/pflicht-mails";
import { meldeDemKunden } from "@/lib/kunden-meldung";
import {
  ANFRAGEN_EINMALKAUF_HINWEIS,
  KUENDIGUNG_BLEIBT_HINWEIS,
  MAKLER_BEGLEITUNG_HINWEIS,
  MINDESTLAUFZEIT_HINWEIS,
  SCHALTUNG_HINWEIS,
  SCHALTUNG_MONATLICH_HINWEIS,
} from "@/config/vertragstexte";

/**
 * Die Verarbeitung einer bezahlten (oder schwebenden) Bestellung.
 *
 * AUFGERUFEN VOM WEBHOOK (checkout.session.completed und
 * async_payment_succeeded) UND VOM ADMIN (Erneut verarbeiten). Jeder
 * Schritt ist idempotent: Was schon da ist, entsteht nicht noch
 * einmal, ein zweiter Lauf holt nur das Fehlende nach. Genau deshalb
 * darf der Admin-Knopf denselben Weg nehmen wie der Webhook.
 *
 * REIHENFOLGE, mit Absicht:
 * 1. Konto sicherstellen (erst NACH bestaetigtem Abschluss; wer den
 *    Bezahlvorgang abbricht, hinterlaesst kein halbes Konto).
 * 2. Profil fuellen (nur leere Felder, eigene Angaben gewinnen) und
 *    den Stripe-Kunden am Profil vermerken.
 * 3. Buchungen anlegen; aktiv erst mit bestaetigter Zahlung, bei
 *    schwebender Lastschrift zunaechst "bestellt".
 * 4. Auftraege der Hand-Leistungen anlegen (gemeinsamer Weg).
 * 5. Rechnung vermerken, falls Stripe sie schon erzeugt hat.
 * 6. DIE EINE Bestellbestaetigung verschicken (mit Versandprotokoll).
 *
 * FEHLER BLEIBEN SICHTBAR: Ein Fehlschlag setzt die Bestellung auf
 * "fehler" samt Text, meldet dem Team und wirft weiter, damit Stripe
 * den Webhook erneut zustellt.
 */

type Dienst = SupabaseClient;

type BestellZeile = {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  rechnung_strasse: string;
  rechnung_plz: string;
  rechnung_stadt: string;
  positionen: BestellPosition[];
  summe_einmalig: number;
  summe_einmalig_vor_rabatt: number;
  rabatt: number;
  sofortzahlung: boolean;
  summe_monatlich: number;
  summe_monatlich_spaeter: number;
  gutschein_id: string | null;
  gutschein_code: string | null;
  gutschein_betrag: number;
  widerruf_zustimmung_text: string;
  status: string;
  testbetrieb: boolean;
  stripe_session_id: string | null;
  stripe_customer_id: string | null;
  user_id: string | null;
  konto_bestand: boolean | null;
  verarbeitet_am: string | null;
  bestaetigung_verschickt_am: string | null;
};

/** Abo-Kennung einer Rechnung (seit der Basil-API unter parent) */
function invoiceAboId(invoice: Stripe.Invoice): string | null {
  const abo = invoice.parent?.subscription_details?.subscription;
  if (!abo) return null;
  return typeof abo === "string" ? abo : abo.id;
}

/** Die Laufzeit-Saetze, die zu DIESER Bestellung gehoeren (wie Kasse) */
function laufzeitSaetze(positionen: BestellPosition[]): string[] {
  const saetze: string[] = [];
  const paket = positionen.find((p) => p.art === "paket");
  const abgewaehlt = new Set(paket?.abgewaehlt ?? []);
  const paketConfig = paket
    ? siteConfig.packages.find((p) => p.id === paket.leistungId)
    : null;
  const enthalten = new Set<string>([
    ...positionen.filter((p) => p.art === "leistung").map((p) => p.leistungId),
    ...(paketConfig?.includedServiceIds ?? [])
      .map((e) => e.id)
      .filter((id) => !abgewaehlt.has(id)),
  ]);
  if (paket && paket.zahlweise === "monatlich") saetze.push(MINDESTLAUFZEIT_HINWEIS);
  if (enthalten.has("ansprechpartner")) saetze.push(MAKLER_BEGLEITUNG_HINWEIS);
  /* Nach Zahlweise getrennt (30.08.2026), gleiche Regel wie in der
     Kasse: ohne monatliches Paket gelten die sechs Monate, mit ihm
     laeuft die Schaltung, solange das Paket laeuft. */
  if (enthalten.has("portal-schaltung")) {
    saetze.push(
      paket && paket.zahlweise === "monatlich"
        ? SCHALTUNG_MONATLICH_HINWEIS
        : SCHALTUNG_HINWEIS
    );
  }
  if (paket?.zahlweise === "einmalig" && enthalten.has("ki-anfragenmanagement")) {
    saetze.push(ANFRAGEN_EINMALKAUF_HINWEIS);
  }
  if (saetze.length > 0) saetze.push(KUENDIGUNG_BLEIBT_HINWEIS);
  return saetze;
}

/**
 * Rechnung aus Stripe in unsere Tabelle vermerken (doppelt loest nichts aus).
 *
 * DIESELBE REGEL WIE DIE UEBRIGEN (16.08.2026): Bleibt der Vermerk aus,
 * fehlt die Rechnung im Konto UND die Rechnungs-Mail bleibt aus, denn
 * rechnungsMailSenden sucht genau diese Zeile und steigt ohne sie aus.
 * Der Kunde hat bezahlt und hat keinen Beleg, und bis heute stand
 * davon nur eine Zeile im Server-Log.
 */
export async function rechnungVermerken(
  service: Dienst,
  invoice: Stripe.Invoice,
  zuordnung: { userId: string; bestellungId?: string | null }
): Promise<void> {
  if (invoice.status !== "paid") return;
  const { error } = await service.from("rechnungen").upsert(
    {
      user_id: zuordnung.userId,
      bestellung_id: zuordnung.bestellungId ?? null,
      stripe_invoice_id: invoice.id,
      nummer: invoice.number ?? null,
      betrag: (invoice.amount_paid ?? 0) / 100,
      bezahlt_am: new Date(
        (invoice.status_transitions?.paid_at ?? invoice.created) * 1000
      ).toISOString(),
      beschreibung: invoice.lines?.data?.[0]?.description ?? null,
      testbetrieb: !invoice.livemode,
    },
    { onConflict: "stripe_invoice_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("[bestellung] Rechnung nicht vermerkt:", error.message);
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext:
        "Eine bezahlte Rechnung wurde nicht vermerkt. Der Kunde sieht sie nicht im Konto und bekommt auch keine Rechnungs-Mail.",
      kennungen: { kunde: zuordnung.userId, vorgang: zuordnung.bestellungId ?? null },
      adminPfad: "/admin/bestellungen",
    });
  }
}

/**
 * Was von einer Rechnung zurueckging, an der Rechnung vermerken.
 *
 * WARUM DAS SEIT DEM 16.08.2026 NOETIG IST: Alles, was der Kunde
 * bezahlt hat, wird auf die Maklerprovision angerechnet. Eine
 * erstattete Rechnung hat er nicht bezahlt. Ohne diesen Vermerk
 * rechneten wir Geld an, das wir ihm schon zurueckgegeben haben.
 *
 * ABSOLUT, NICHT ADDIEREND. Der Wert ist immer `amount_refunded`, wie
 * Stripe ihn kennt. Damit ist es gleichgueltig, wie oft dasselbe
 * Ereignis zugestellt wird und ob die Erstattung ueber unsere Route
 * oder ueber das Stripe-Dashboard lief.
 *
 * KEINE RECHNUNG ZUR ZAHLUNG ist kein Fehler: Eine Erstattung kann eine
 * Zahlung treffen, zu der bei uns nie eine Rechnung entstanden ist.
 * Dann gibt es auch nichts anzurechnen.
 *
 * EIN FEHLER DER SUCHE IST ETWAS ANDERES ALS KEINE RECHNUNG (Befund
 * der Runde 7, behoben in Bau-Runde 8): Bis hierher landeten beide im
 * selben stillen Ausgang, der Webhook vermerkte das Ereignis als
 * verarbeitet, Stripe stellte es nie erneut zu, und die Anrechnung
 * zaehlte Geld mit, das der Kunde zurueckbekommen hatte. Ein
 * Geldfehler zu unseren Lasten, den niemand bemerkt. Jetzt gilt die
 * Wirkungs-Regel (lib/wirkung.ts): Scheitert die Suche oder das
 * Schreiben, meldet das dem Team UND dem Aufrufer; der Webhook wirft
 * dann, das Ereignis bleibt unverarbeitet, und Stripe stellt es
 * erneut zu, bis der Vermerk wirklich steht.
 *
 * DER WEG VON DER ZAHLUNG ZUR RECHNUNG geht ueber Stripe und nicht ueber
 * ein eigenes Feld: Eine Charge kennt in dieser Fassung der
 * Schnittstelle ihre Rechnung nicht mehr, wohl aber jede Rechnung ihre
 * Zahlungen. Gesucht wird deshalb unter den bezahlten Rechnungen dieses
 * Kunden die eine, deren Zahlung diese ist. Das deckt beide Faelle ab,
 * den Einmalkauf und die Abo-Rechnung, und braucht keine zweite
 * Buchfuehrung neben Stripe.
 */
export async function erstattungVermerken(charge: Stripe.Charge): Promise<Wirkung> {
  const service = supabaseService();
  const stripe = stripeClient();
  if (!service || !stripe) {
    return ausgeblieben(
      "Die Erstattung wurde nicht vermerkt: Stripe oder der Dienst-Zugang zur Datenbank ist nicht konfiguriert."
    );
  }
  const kundeId =
    typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  const zahlungId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!kundeId || !zahlungId) {
    /* Ohne Kunde oder Zahlung gibt es bei uns keine Rechnung, die der
       Betrag treffen koennte; das ist der gutartige Fall, kein Fehler. */
    return gewirkt("Zu dieser Erstattung gehoert keine Rechnung bei uns.");
  }

  let rechnungId: string | null = null;
  try {
    const rechnungen = await stripe.invoices.list({
      customer: kundeId,
      status: "paid",
      limit: 100,
      expand: ["data.payments"],
    });
    for (const rechnung of rechnungen.data) {
      for (const zahlung of rechnung.payments?.data ?? []) {
        const intent = zahlung.payment.payment_intent;
        const intentId = typeof intent === "string" ? intent : intent?.id;
        if (intentId === zahlungId) rechnungId = rechnung.id ?? null;
      }
    }
  } catch (fehler) {
    /* DIE SUCHE IST GESCHEITERT, nicht leer ausgegangen. Wer das in
       einen Topf wirft, verliert die Erstattung fuer immer. */
    const text = fehler instanceof Error ? fehler.message : String(fehler);
    console.error("[bestellung] Stripe-Suche zur Erstattung gescheitert:", text);
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext:
        "Eine Erstattung konnte nicht vermerkt werden, weil die Stripe-Suche nach der Rechnung scheiterte. Stripe stellt das Ereignis erneut zu; bleibt diese Meldung, zaehlt die Anrechnung Geld mit, das schon zurueckging.",
      kennungen: { zahlung: zahlungId },
      adminPfad: "/admin/bestellungen",
    });
    return ausgeblieben(
      `Die Stripe-Suche nach der Rechnung zur Zahlung ${zahlungId} ist gescheitert (${text}). Die Erstattung ist NICHT vermerkt.`
    );
  }
  if (!rechnungId) {
    return gewirkt("Zu dieser Zahlung gibt es bei uns keine Rechnung, nichts anzurechnen.");
  }

  const { error } = await service
    .from("rechnungen")
    .update({ erstattet: (charge.amount_refunded ?? 0) / 100 })
    .eq("stripe_invoice_id", rechnungId);
  if (error) {
    console.error("[bestellung] Erstattung nicht vermerkt:", error.message);
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext:
        "Eine Erstattung ist bei uns nicht vermerkt. Die Anrechnung auf die Maklerprovision rechnet damit Geld mit, das schon zurueckgegangen ist.",
      kennungen: { vorgang: rechnungId },
      adminPfad: "/admin/bestellungen",
    });
    return ausgeblieben(
      `Die Erstattung liess sich nicht an der Rechnung ${rechnungId} vermerken (${error.message}).`
    );
  }
  /* NULL GETROFFENE ZEILEN SIND HIER IN ORDNUNG: Nicht jede bezahlte
     Stripe-Rechnung hat eine Zeile bei uns (etwa Zahlungen von vor der
     Rechnungs-Tabelle). Der Fall ist derselbe wie "keine Rechnung". */
  return gewirkt(`Die Erstattung ist an der Rechnung ${rechnungId} vermerkt.`);
}

/**
 * Die Rechnungs-Mail zur bezahlten Rechnung: kurze Zustellung mit der
 * PDF im Anhang, ausgeloest AUSSCHLIESSLICH von invoice.paid. Das ist
 * fuer alle Rechnungen derselbe Weg, ob Einmalkauf, erste Abo-Rechnung
 * oder monatliche Folgerechnung.
 *
 * ANHANG STATT VERWEIS, und zwar verlaesslich: Die PDF wird VOR dem
 * Setzen der Versand-Marke abgerufen. Liegt sie bei Stripe noch nicht
 * bereit (das kann kurz nach der Finalisierung passieren), wird NICHT
 * ohne Anhang gesendet, sondern geworfen; der Webhook antwortet dann
 * 500, Stripe stellt das Ereignis erneut zu, und die Mail kommt beim
 * naechsten Versuch vollstaendig. So gibt es nie eine Rechnungs-Mail
 * ohne Rechnung und trotzdem keine doppelte (atomare Marke
 * mail_verschickt_am, Migration 0054).
 */
export async function rechnungsMailSenden(
  service: Dienst,
  invoice: Stripe.Invoice,
  userId: string
): Promise<void> {
  if (invoice.status !== "paid") return;
  const { data: zeile } = await service
    .from("rechnungen")
    .select("id, nummer, betrag, mail_verschickt_am")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle<{
      id: string;
      nummer: string | null;
      betrag: number;
      mail_verschickt_am: string | null;
    }>();
  if (!zeile || zeile.mail_verschickt_am) return;

  const { data: profil } = await service
    .from("profiles")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle<{ name: string | null; email: string | null }>();
  const empfaenger = profil?.email ?? invoice.customer_email ?? null;
  if (!empfaenger) {
    console.error("[rechnung] Keine Empfaenger-Adresse fuer", invoice.id);
    return;
  }

  // PDF-Adresse holen; auf dem Webhook-Objekt kann sie noch fehlen
  let pdfAdresse = invoice.invoice_pdf ?? null;
  if (!pdfAdresse) {
    const stripe = stripeClient();
    if (stripe && invoice.id) {
      const frisch = await stripe.invoices.retrieve(invoice.id);
      pdfAdresse = frisch.invoice_pdf ?? null;
    }
  }
  let pdfBase64: string | null = null;
  if (pdfAdresse) {
    try {
      const antwort = await fetch(pdfAdresse, { signal: AbortSignal.timeout(15_000) });
      if (antwort.ok) {
        pdfBase64 = Buffer.from(await antwort.arrayBuffer()).toString("base64");
      }
    } catch {
      // wirkung: gewollt, der leere Abruf muendet zwei Zeilen tiefer in den Wurf mit erneuter Zustellung
    }
  }
  if (!pdfBase64) {
    throw new Error(
      `Rechnungs-PDF zu ${invoice.id} noch nicht abrufbar, erneute Zustellung noetig.`
    );
  }

  // Atomare Marke: Nur wer sie selbst setzt, darf senden
  const { data: beansprucht } = await service
    .from("rechnungen")
    .update({ mail_verschickt_am: new Date().toISOString() })
    .eq("id", zeile.id)
    .is("mail_verschickt_am", null)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (!beansprucht) return;

  const inhalt = rechnungMail({
    name: profil?.name ?? null,
    nummer: zeile.nummer,
    betragText: formatEuroBetrag(Number(zeile.betrag)),
  });
  const versendet = await sendeMail({
    an: empfaenger,
    ...inhalt,
    art: "benachrichtigung",
    vorlage: pflichtMail("rechnung"),
    userId,
    anhaenge: [
      { dateiname: `Rechnung-${zeile.nummer ?? zeile.id}.pdf`, inhaltBase64: pdfBase64 },
    ],
  });
  if (!versendet) {
    /* Marke leeren, damit die naechste Zustellung des Ereignisses die
       Mail nachholt; der Fehlschlag steht im Mail-Protokoll, das Team
       erfaehrt es. */
    await service
      .from("rechnungen")
      .update({ mail_verschickt_am: null })
      .eq("id", zeile.id);
    await melde({
      ereignis: "mail.fehlgeschlagen",
      empfaenger: { art: "admin" },
      kurztext: "Rechnungs-Mail ließ sich nicht versenden",
      betroffeneMailAn: empfaenger,
      kennungen: { kunde: userId },
      adminPfad: "/admin/mail-vorlagen",
    });
    throw new Error("Rechnungs-Mail ließ sich nicht versenden (siehe Mail-Protokoll).");
  }
}

/** Gespeicherte Zahlungsmethode zum Standard des Kunden machen */
export async function standardZahlungsmethode(
  stripe: Stripe,
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

/**
 * EIN STUMMER SCHREIBVORGANG IM BEZAHLWEG WIRD LAUT.
 *
 * =====================================================================
 * WOZU (Auftrag des Inhabers, 31.08.2026)
 * =====================================================================
 * Vier Stellen dieser Datei schrieben ohne hinzusehen. Sie waren die
 * einzigen vier des Bezahlwegs, von denen **niemand** erfuhr, wenn sie
 * nichts taten: nicht der Kunde, nicht das Team.
 *
 * Der Inhaber dazu: "Null Treffer ist ein Fehlerfall. Findet die
 * Rueckleseprobe keine Zeile, darf das nicht stillschweigend
 * durchlaufen."
 *
 * WARUM `{ error }` ALLEIN NICHT GENUEGT: Ein PostgREST-update, das
 * null Zeilen trifft, meldet KEINEN Fehler. Es antwortet mit Erfolg.
 * `lib/schreiben.ts` zaehlt deshalb die getroffenen Zeilen; dafuer muss
 * die Abfrage auf `.select()` enden.
 *
 * DIE MELDUNG NENNT DIE FUNDSTELLE, damit beim Anruf eines Kunden
 * niemand suchen muss, welcher der vier Schreibvorgaenge es war.
 */
export async function stillGeschrieben(
  fundstelle: string,
  was: string,
  kennungen: { kunde?: string | null; vorgang?: string | null },
  ergebnis: { fehler: string | null; lautlos: boolean }
): Promise<void> {
  const grund = ergebnis.lautlos
    ? "der Schreibvorgang traf NULL Zeilen (kein Fehler, keine Wirkung)"
    : `Datenbank-Fehler: ${ergebnis.fehler}`;
  console.error(`[bestellung] ${fundstelle}: ${was} nicht geschrieben, ${grund}`);
  await melde({
    ereignis: "bestellung.fehler",
    empfaenger: { art: "admin" },
    kurztext: `${was} wurde nicht geschrieben (${fundstelle}), ${grund}`,
    kennungen,
    adminPfad: "/admin/bestellungen",
  });
}

/**
 * WAS AUF DAS KONTO GEWARTET HAT, wird nachgeholt.
 *
 * =====================================================================
 * DER FALL (gemessen und entschieden am 31.08.2026)
 * =====================================================================
 * Die Kasse nimmt Gastkaeufe an (`user_id: user?.id ?? null`), und das
 * Konto entsteht erst hier in der Verarbeitung. Trifft die erste
 * Abo-Rechnung vorher ein, findet `aboZahlungEingegangen` auf keinem
 * seiner drei Wege ein Konto und wirft, damit Stripe erneut zustellt.
 *
 * DAS SCHEMA ENTSCHEIDET, warum hier nicht "haerter gesucht" wird:
 * `rechnungen.user_id` ist `not null references auth.users`. Eine
 * Rechnung KANN bei uns gar nicht ohne Konto bestehen. Der Inhaber dazu:
 * "Ein besserer Zuordnungsweg hilft nur, wenn es etwas zu finden gibt.
 * Vielleicht ist die richtige Antwort nicht, haerter zu suchen, sondern
 * das Ereignis liegen zu lassen und nachzuholen, sobald das Konto
 * entsteht."
 *
 * GENAU DAS TUT DIESE STELLE, und der Augenblick ist der richtige: Sie
 * laeuft, nachdem das Konto steht.
 *
 * =====================================================================
 * WARUM ES SIE BRAUCHT, obwohl Stripe wiederholt
 * =====================================================================
 * Bis heute hing die Heilung ALLEIN an Stripes Wiederholung. Gemessen
 * am 31.08.2026: Es gibt keinen anderen Nachholer, nichts ausser dem
 * Webhook ruehrt `stripe_ereignisse` an. Laeuft Stripes Frist ab, bleibt
 * das Ereignis liegen, und niemand sieht die Tabelle je an. Genau so
 * lagen 17 Ereignisse neunzehn Tage lang.
 *
 * WAS SIE NICHT LEISTET: Kommt die Kontoanlage nie (der Gast bricht ab,
 * `checkout.session.completed` scheitert dauerhaft), laeuft diese
 * Stelle nie, und das Ereignis bleibt liegen. Dafuer braucht es eine
 * Ueberwachung, die nicht an einem Kundenweg haengt; sie ist dem
 * Inhaber am 31.08.2026 vorgelegt und noch nicht entschieden.
 */
async function wartendeRechnungenNachholen(
  service: Dienst,
  kundeId: string | null
): Promise<string[]> {
  if (!kundeId) return [];
  const stripe = stripeClient();
  if (!stripe) return [];

  /* NUR DIE DIESES KUNDEN, und nur unverarbeitete. Die Kennung steht
     seit dem 31.08.2026 im Ereignis (app/api/stripe/webhook/route.ts);
     aeltere Eintraege tragen sie nicht und bleiben deshalb unberuehrt. */
  const { data: wartende, error } = await service
    .from("stripe_ereignisse")
    .select("id, typ, daten")
    .is("verarbeitet_am", null)
    .eq("typ", "invoice.paid")
    .eq("daten->>kunde", kundeId);
  if (error) {
    console.error("[bestellung] Wartende Ereignisse nicht lesbar:", error.message);
    return [`Wartende Rechnungen liessen sich nicht nachsehen (${error.message}).`];
  }
  if (!wartende || wartende.length === 0) return [];

  /* DER NAME IST NICHT BELIEBIG: `wirkung:pruefen` erkennt
     `offenGeblieben.push` als Behandlung eines Fehlers, `offen.push`
     nicht. Die Pruefung hat diese Stelle beanstandet, als sie noch
     `offen` hiess, und sie hatte recht: Von aussen sieht ein
     unbekannter Name aus wie ein geschluckter Fehler. */
  const offenGeblieben: string[] = [];
  for (const eintrag of wartende) {
    const rechnungId = (eintrag.daten as { objekt?: string } | null)?.objekt;
    if (!rechnungId) continue;
    try {
      const invoice = await stripe.invoices.retrieve(rechnungId);
      await aboZahlungEingegangen(invoice);
      /* ERST NACH DER WIRKUNG DEN MERKER (Bau-Runde 17). Wirft der
         Aufruf, bleibt `verarbeitet_am` leer, und Stripes eigene
         Wiederholung hat weiter ihre Chance. */
      const abgehakt = await schreibe(
        service
          .from("stripe_ereignisse")
          .update({ verarbeitet_am: new Date().toISOString(), fehler: null })
          .eq("id", eintrag.id)
          .select("id")
      );
      if (!abgehakt.ok) {
        await stillGeschrieben(
          "bestellung-verarbeitung: Nachholer",
          `Das nachgeholte Ereignis ${eintrag.id} wurde verarbeitet, aber nicht abgehakt`,
          { vorgang: eintrag.id },
          abgehakt
        );
      }
    } catch (fehler) {
      /* NICHT STILL: Der Nachholer laeuft am Ende eines Kundenwegs, und
         was er nicht schafft, gehoert in dessen Ergebnis. Die
         Verarbeitung selbst wird davon NICHT mitgerissen; die Zahlung
         ist gelaufen, das Konto steht, und eine fehlende Rechnung ist
         kein Grund, all das zurueckzunehmen. */
      const text = (fehler as Error).message;
      console.error(`[bestellung] Nachholen von ${eintrag.id} gescheitert:`, text);
      offenGeblieben.push(
        `Eine bereits bezahlte Rechnung (${rechnungId}) liess sich auch nach der Kontoanlage nicht vermerken: ${text}`
      );
    }
  }
  return offenGeblieben;
}

/**
 * Konto sicherstellen und den Passwort-Link fuer die Bestaetigung
 * erzeugen. Bestehende Konten bekommen keinen Link, nur den Hinweis.
 */
async function kontoSichern(
  service: Dienst,
  bestellung: BestellZeile
): Promise<{ userId: string; kontoBestand: boolean; link: string | null }> {
  const basis = appBasis();
  const name = vollerName(bestellung.vorname, bestellung.nachname);

  // Schon einem Konto zugeordnet (angemeldet bestellt oder zweiter Lauf)
  if (bestellung.user_id) {
    const kontoBestand = bestellung.konto_bestand ?? true;
    if (!kontoBestand && !bestellung.bestaetigung_verschickt_am && basis) {
      // Erster Lauf scheiterte nach der Kontoanlage: neuen Link erzeugen
      const { data } = await service.auth.admin.generateLink({
        type: "recovery",
        email: bestellung.email,
      });
      if (data?.properties?.hashed_token) {
        return {
          userId: bestellung.user_id,
          kontoBestand,
          link: `${basis}/auth/bestaetigen?token_hash=${encodeURIComponent(data.properties.hashed_token)}&typ=recovery`,
        };
      }
    }
    return { userId: bestellung.user_id, kontoBestand, link: null };
  }

  const vorhanden = await findeAuthNutzer(service, bestellung.email);
  if (vorhanden) {
    return { userId: vorhanden.id, kontoBestand: true, link: null };
  }

  /* Neues Konto: generateLink(invite) legt das Auth-Konto an UND
     liefert den Einmal-Link, den unsere eigene Mail traegt. Die
     Adresse gilt als bestaetigt, sobald der Link eingeloest wird;
     "Passwort vergessen" funktioniert ab sofort ebenfalls. */
  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email: bestellung.email,
    options: { data: { name } },
  });
  if (error || !data?.user?.id) {
    throw new Error(`Kontoanlage fehlgeschlagen: ${error?.message ?? "unbekannt"}`);
  }
  const link =
    basis && data.properties?.hashed_token
      ? `${basis}/auth/bestaetigen?token_hash=${encodeURIComponent(data.properties.hashed_token)}&typ=invite`
      : null;
  return { userId: data.user.id, kontoBestand: false, link };
}

/** Profilfelder fuellen, NUR wo sie leer sind (eigene Angaben gewinnen) */
async function profilFuellen(
  service: Dienst,
  userId: string,
  bestellung: BestellZeile
): Promise<void> {
  const { data: profil } = await service
    .from("profiles")
    .select("vorname, nachname, telefon, strasse, plz, ort, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<{
      vorname: string | null;
      nachname: string | null;
      telefon: string | null;
      strasse: string | null;
      plz: string | null;
      ort: string | null;
      stripe_customer_id: string | null;
    }>();
  if (!profil) {
    console.error("[bestellung] Profil fehlt fuer", userId);
    return;
  }
  const neu: Record<string, string> = {};
  if (!profil.vorname && bestellung.vorname) neu.vorname = bestellung.vorname;
  if (!profil.nachname && bestellung.nachname) neu.nachname = bestellung.nachname;
  if (!profil.telefon && bestellung.telefon) neu.telefon = bestellung.telefon;
  if (!profil.strasse && bestellung.rechnung_strasse) neu.strasse = bestellung.rechnung_strasse;
  if (!profil.plz && bestellung.rechnung_plz) neu.plz = bestellung.rechnung_plz;
  if (!profil.ort && bestellung.rechnung_stadt) neu.ort = bestellung.rechnung_stadt;
  if (bestellung.stripe_customer_id && profil.stripe_customer_id !== bestellung.stripe_customer_id) {
    neu.stripe_customer_id = bestellung.stripe_customer_id;
  }
  if (Object.keys(neu).length === 0) return;
  const { error } = await service.from("profiles").update(neu).eq("id", userId);
  if (error) console.error("[bestellung] Profil nicht gefuellt:", error.message);
}

/** Buchungen anlegen bzw. nachziehen; liefert die Zeilen der Bestellung */
async function buchungenSichern(
  service: Dienst,
  bestellung: BestellZeile,
  userId: string,
  bezahlt: boolean,
  subscriptionId: string | null
): Promise<{ id: string; leistung_id: string; art: string; status: string }[]> {
  const { data: vorhandene } = await service
    .from("buchungen")
    .select("id, leistung_id, art, status, variante")
    .eq("bestellung_id", bestellung.id);
  const schon = new Set(
    (vorhandene ?? []).map((b) => `${b.leistung_id}:${b.variante ?? ""}`)
  );
  const neue = bestellung.positionen.filter(
    (p) => !schon.has(`${p.leistungId}:${p.variante ?? ""}`)
  );
  if (neue.length > 0) {
    const { error } = await service.from("buchungen").insert(
      neue.map((p) => ({
        user_id: userId,
        leistung_id: p.leistungId,
        art: p.art,
        status: bezahlt ? "aktiv" : "bestellt",
        preis: p.betrag,
        grund: "bezahlt",
        zahlweise: p.zahlweise,
        variante: p.variante,
        menge: p.menge > 1 ? p.menge : null,
        /* Der Umfang der Buchung (0119): Was der Kunde abgewaehlt hat,
           hat er nicht bezahlt und bekommt er nicht. Ohne diese Zeile
           steht in der Buchung nur das Paket, und der Anspruch
           entstuende aus dem Katalog statt aus der Bestellung. */
        abgewaehlt: p.abgewaehlt?.length ? p.abgewaehlt : null,
        bestellung_id: bestellung.id,
        stripe_subscription_id:
          p.zahlweise === "monatlich" && !p.spaeter ? subscriptionId : null,
      }))
    );
    if (error) throw new Error(`Buchungen nicht angelegt: ${error.message}`);
  }
  if (bezahlt) {
    const { error } = await service
      .from("buchungen")
      .update({ status: "aktiv" })
      .eq("bestellung_id", bestellung.id)
      .eq("status", "bestellt");
    if (error) throw new Error(`Buchungen nicht aktiviert: ${error.message}`);
  }
  const { data: alle } = await service
    .from("buchungen")
    .select("id, leistung_id, art, status")
    .eq("bestellung_id", bestellung.id);
  return alle ?? [];
}

/**
 * Die EINE Bestellbestaetigung bauen und verschicken (einmalig).
 * Liefert null bei Erfolg oder wenn nichts zu tun war, sonst den
 * Hinweis fuer das Fehlerfeld der Bestellung.
 */
async function bestaetigungSenden(
  service: Dienst,
  bestellung: BestellZeile,
  userId: string,
  kontoBestand: boolean,
  link: string | null,
  zahlungOffen: boolean
): Promise<string | null> {
  if (bestellung.bestaetigung_verschickt_am) return null;
  /* ATOMARE MARKE gegen Doppelversand, auch ueber Instanzen hinweg:
     Nur wer die leere Marke selbst setzt, darf senden. Scheitert der
     Versand danach, wird die Marke wieder geleert, damit "Erneut
     verarbeiten" die Mail nachholen kann. */
  const { data: beansprucht } = await service
    .from("bestellungen")
    .update({ bestaetigung_verschickt_am: new Date().toISOString() })
    .eq("id", bestellung.id)
    .is("bestaetigung_verschickt_am", null)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (!beansprucht) return null;
  const positionen = bestellung.positionen;
  const einmalig = positionen.filter((p) => p.zahlweise === "einmalig");
  const monatlich = positionen.filter((p) => p.zahlweise === "monatlich" && !p.spaeter);
  const spaeter = positionen.filter((p) => p.zahlweise === "monatlich" && p.spaeter);
  const posten = (p: BestellPosition, monat: boolean) => ({
    name: p.menge > 1 ? `${p.name}, ${p.menge} ${p.einheit ?? "Stück"}` : p.name,
    betragText: monat ? `${formatEuroBetrag(p.betrag)} je Monat` : formatEuroBetrag(p.betragVorRabatt),
  });
  const inhalt = bestellBestaetigungMail({
    name: vollerName(bestellung.vorname, bestellung.nachname),
    positionenEinmalig: einmalig.map((p) => posten(p, false)),
    positionenMonatlich: monatlich.map((p) => posten(p, true)),
    positionenSpaeter: spaeter.map((p) => posten(p, true)),
    /* Nur der Betrag: Der Zusatz "Nachlass" brach in schmalen
       Mail-Fenstern allein in die naechste Zeile um und sah dort wie
       eine Beschriftung ohne Wert aus. Was es ist, sagt die Zeile
       "Sofortzahlungs-Rabatt" davor bereits.
       MIT MINUSZEICHEN, und das ist keine Kosmetik: Seit die Uebersicht
       zweispaltig steht (13.08.2026), liest sie sich als Rechnung.
       Ohne Vorzeichen stuenden Abzuege in derselben Spalte wie die
       Posten, und 699 + 78 + 50 ergaebe sichtbar nicht die Summe
       darunter. */
    rabattText: bestellung.rabatt > 0 ? `-${formatEuroBetrag(bestellung.rabatt)}` : null,
    gutscheinCode: bestellung.gutschein_betrag > 0 ? bestellung.gutschein_code : null,
    gutscheinBetragText:
      bestellung.gutschein_betrag > 0
        ? `-${formatEuroBetrag(bestellung.gutschein_betrag)}`
        : null,
    summeEinmaligText:
      einmalig.length > 0 ? formatEuroBetrag(bestellung.summe_einmalig) : null,
    summeMonatlichText:
      monatlich.length > 0 ? `${formatEuroBetrag(bestellung.summe_monatlich)} je Monat` : null,
    laufzeitSaetze: laufzeitSaetze(positionen),
    widerrufZustimmungText: bestellung.widerruf_zustimmung_text,
    zahlungOffen,
    kontoLink: link,
    kontoBestehend: kontoBestand,
  });
  const versendet = await sendeMail({
    an: bestellung.email,
    ...inhalt,
    art: "benachrichtigung",
    vorlage: pflichtMail("bestellbestaetigung"),
    userId,
  });
  if (!versendet) {
    /* Der Versand steht im Mail-Protokoll als Fehlschlag; die Marke
       wird geleert, damit "Erneut verarbeiten" die Mail nachholt,
       und das Team erfaehrt es. */
    await service
      .from("bestellungen")
      .update({ bestaetigung_verschickt_am: null })
      .eq("id", bestellung.id);
    await melde({
      ereignis: "mail.fehlgeschlagen",
      empfaenger: { art: "admin" },
      kurztext: "Bestellbestätigung ließ sich nicht versenden",
      betroffeneMailAn: bestellung.email,
      kennungen: { vorgang: bestellung.id },
      adminPfad: "/admin/bestellungen",
    });
    return "Bestellbestätigung ließ sich nicht versenden (siehe Mail-Protokoll).";
  }
  return null;
}

/**
 * NACHEINANDER JE VORGANG, nie parallel: Bei einer Sandbox-Lastschrift
 * kamen "checkout.session.completed" und "async_payment_succeeded"
 * praktisch gleichzeitig an. Zwei parallele Verarbeitungen desselben
 * Vorgangs fanden dann gegenseitig ihre halben Zwischenstaende vor
 * (belegt 13.08.2026: der zweite Lauf hielt das vom ersten gerade
 * angelegte Konto fuer ein bestehendes). Die Kette hier reiht Laeufe
 * zur selben Session aneinander; die Seite laeuft auf EINER Instanz,
 * damit deckt das den Fall ab. Die Mail traegt zusaetzlich eine
 * atomare Marke (bestaetigungSenden), die auch ueber Instanzen hinweg
 * haelt.
 */
const warteschlangen = new Map<string, Promise<unknown>>();

/**
 * DIE ANTWORT IST KEIN SCHMUCK (16.08.2026). Vorher gab diese Funktion
 * `Promise<void>` zurück und stieg an zwei Stellen still aus, wenn es
 * nichts zu verarbeiten gab. Gemessen: Der Knopf "Erneut verarbeiten"
 * antwortete zweimal `{ok:true}` auf eine Bestellung, deren Bezahlung
 * nie abgeschlossen wurde. Der Admin las zweimal Erfolg und hatte
 * keinen Weg zu erfahren, dass gar nichts geschehen war.
 *
 * ECHTE FEHLER WERFEN WEITER, das bleibt: Nur so antwortet der Webhook
 * mit 500 und Stripe stellt erneut zu. Ein "es gab nichts zu tun" ist
 * KEIN Fehler in diesem Sinn, denn eine erneute Zustellung änderte
 * daran nichts. Genau deshalb steht es im Rückgabewert und nicht in
 * einer Ausnahme.
 */
export async function bestellungVerarbeiten(sessionId: string): Promise<Wirkung> {
  const vorheriger = warteschlangen.get(sessionId) ?? Promise.resolve();
  const eigener = vorheriger
    /* wirkung: gewollt still, und das IST der Zweck dieser Zeile: Sie
       haengt die eigene Verarbeitung an die des VORGAENGERS derselben
       Sitzung. Ist der gescheitert, hat er seinen Fehler bereits an
       seinen eigenen Aufrufer gemeldet; hier noch einmal daran zu
       scheitern hiesse, dass ein fremder Fehlschlag die eigene, ganz
       gesunde Verarbeitung mitreisst. Ohne dieses catch bliebe die
       zweite Zustellung von Stripe unverarbeitet. */
    // wirkung: gewollt still, der Grund steht im Kommentar darueber
    .catch(() => undefined)
    .then(() => verarbeitungAusfuehren(sessionId));
  const eintrag = eigener.then(
    () => undefined,
    () => undefined
  );
  warteschlangen.set(sessionId, eintrag);
  try {
    return await eigener;
  } finally {
    if (warteschlangen.get(sessionId) === eintrag) {
      warteschlangen.delete(sessionId);
    }
  }
}

async function verarbeitungAusfuehren(sessionId: string): Promise<Wirkung> {
  const service = supabaseService();
  const stripe = stripeClient();
  if (!service || !stripe) throw new Error("Dienste nicht konfiguriert.");

  const { data: bestellung } = await service
    .from("bestellungen")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle<BestellZeile>();
  if (!bestellung) {
    // Session aus einem anderen System-Stand (z. B. Sandbox-Reste): nur vermerken
    console.error("[bestellung] Keine Bestellung zur Session", sessionId);
    return ausgeblieben(
      `Zu diesem Zahlungsvorgang gibt es bei uns keine Bestellung (${sessionId}). Es wurde nichts angelegt.`
    );
  }
  if (bestellung.status === "bezahlt" && bestellung.verarbeitet_am && bestellung.bestaetigung_verschickt_am) {
    return gewirkt(
      "Diese Bestellung war bereits vollständig verarbeitet: Konto, Buchungen und Bestätigung sind vorhanden."
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "subscription", "invoice", "setup_intent"],
    });
    if (session.status !== "complete") {
      /* GEMESSEN AM 16.08.2026, und das ist die Hälfte des Befundes:
         Hier stand ein stilles `return`. Der Admin drückte "Erneut
         verarbeiten", bekam `{ok:true}` und hatte keinen Weg zu
         erfahren, dass die Kasse nie abgeschlossen wurde. Ein zweiter
         Druck änderte daran nichts, weil es nichts zu ändern gibt: Wer
         die Zahlung abgebrochen hat, hat keine bezahlt. */
      console.error("[bestellung] Session nicht abgeschlossen:", sessionId, session.status);
      return ausgeblieben(
        `Der Bezahlvorgang wurde bei Stripe nie abgeschlossen (Stand "${session.status}"). Es entsteht dazu kein Konto, keine Buchung und keine Rechnung. Erneutes Verarbeiten hilft hier nicht; wenn der Kunde bezahlt hat, gehört der Vorgang im Stripe-Dashboard nachgesehen.`
      );
    }
    const bezahlt =
      session.payment_status === "paid" || session.payment_status === "no_payment_required";
    const subscription = session.subscription as Stripe.Subscription | null;
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
    const setupIntent = session.setup_intent as Stripe.SetupIntent | null;

    /* BETRAGS-PRUEFUNG: Was Stripe abgebucht hat, muss der serverseitig
       gerechneten Summe entsprechen. Eine Abweichung stoppt nichts
       (das Geld ist bereits geflossen), aber sie wird laut. Hinweise
       sammeln sich und landen am Ende GEMEINSAM im Fehlerfeld; ein
       spaeterer erfolgreicher Lauf raeumt damit ueberholte
       Zwischenfehler auf, ohne echte Befunde zu verschlucken.

       ZWEI SORTEN HINWEISE, und der Unterschied entscheidet ueber den
       Merker (Bau-Runde 17, 21.08.2026):

       - AUSGEBLIEBEN (`offenGeblieben`): Ein Schritt, der haette
         geschehen sollen, ist nicht geschehen. Freischaltung,
         Auftrag, Gutschein-Einloesung, Bestellbestaetigung. Der Kunde
         hat bezahlt und etwas davon nicht bekommen. Ein zweiter Lauf
         holt es nach, deshalb darf die Bestellung dann NICHT als
         verarbeitet gelten: Sonst faellt sie aus jeder
         Nachverfolgung, und das Geld ist genommen. Genau das war der
         Befund.

       - FESTGESTELLT (`festgestellt`): Eine Abweichung, die ein
         Mensch ansehen muss und die kein zweiter Lauf behebt. Bisher
         genau eine: der abweichende Betrag. Sie ist keine ausgebliebene
         Wirkung, sondern deren Ergebnis; die Wirkung ist die Meldung
         an das Team, und die geht gleich hier hinaus. Bliebe die
         Bestellung deswegen unverarbeitet, wiederholte Stripe den
         Webhook drei Tage lang um eine Zahl, die sich nie aendert.

       Beide stehen zusammen im Fehlerfeld und beide gehen an den
       Aufrufer; nur die erste Sorte haelt verarbeitet_am zurueck. */
    const offenGeblieben: string[] = [];
    const festgestellt: string[] = [];
    const hinweise: string[] = [];
    const erwartet = Math.round(
      (Number(bestellung.summe_einmalig) + Number(bestellung.summe_monatlich)) * 100
    );
    if (session.mode !== "setup" && (session.amount_total ?? 0) !== erwartet) {
      const hinweis = `Betrag weicht ab: Stripe ${(session.amount_total ?? 0) / 100} €, erwartet ${erwartet / 100} €.`;
      console.error("[bestellung]", bestellung.id, hinweis);
      festgestellt.push(hinweis);
      await melde({
        ereignis: "bestellung.fehler",
        empfaenger: { art: "admin" },
        kurztext: "Bezahlter Betrag weicht von der Bestellung ab",
        kennungen: { vorgang: bestellung.id },
        adminPfad: "/admin/bestellungen",
      });
    }

    // 1) Konto und Link
    const konto = await kontoSichern(service, bestellung);
    /* WIRD DIESE ZEILE NICHT GESCHRIEBEN, verliert die Bestellung ihre
       Abo-Kennung, und `aboZahlungEingegangen` findet die Buchung
       spaeter nicht mehr ueber `stripe_subscription_id`. Der
       Ueberfaellig-Merker weiter unten haengt also an dieser Stelle
       hier, und das war der Grund, sie mit aufzunehmen. */
    const verknuepft = await schreibe(
      service
        .from("bestellungen")
        .update({
          user_id: konto.userId,
          konto_bestand: bestellung.konto_bestand ?? konto.kontoBestand,
          stripe_payment_intent_id: paymentIntent?.id ?? null,
          stripe_subscription_id: subscription?.id ?? null,
        })
        .eq("id", bestellung.id)
        .select("id")
    );
    if (!verknuepft.ok) {
      await stillGeschrieben(
        "bestellung-verarbeitung: Kontoverknuepfung",
        "Die Zuordnung der Bestellung zum Konto",
        { kunde: konto.userId, vorgang: bestellung.id },
        verknuepft
      );
      offenGeblieben.push(
        "Die Bestellung wurde dem Konto nicht zugeordnet; die Abo-Kennung fehlt."
      );
    }

    // 2) Profil fuellen und Stripe-Kunden vermerken
    await profilFuellen(service, konto.userId, bestellung);

    /* Gespeicherte Zahlungsmethode zum Standard machen, damit das
       Makler-Abo bei der Zuweisung abbuchen kann (setup-Modus und
       payment-Modus mit setup_future_usage). Beim Abo-Modus haengt die
       Methode bereits als Standard am Abo. */
    const kundeId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const gespeichertePm =
      (typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id) ??
      (bestellung.summe_monatlich_spaeter > 0 && typeof paymentIntent?.payment_method === "string"
        ? paymentIntent.payment_method
        : null);
    if (kundeId && gespeichertePm) {
      await standardZahlungsmethode(stripe, kundeId, gespeichertePm).catch(async (f) => {
        /* DAS TEAM ERFAEHRT ES, statt nur die Konsole (Befund vom
           31.08.2026).

           Hier stand ein blosses console.error. Scheitert dieser
           Schritt, hat der Kunde bezahlt und alles sieht gut aus; die
           Karte ist nur nicht als Standard hinterlegt. Auffallen wuerde
           es erst bei der NAECHSTEN monatlichen Abbuchung, einen Monat
           spaeter, an einer ganz anderen Stelle, und dann sieht es aus
           wie ein Problem des Kunden.

           Die Bestellung selbst laeuft weiter: Sie ist bezahlt, und
           ein Abbruch hier machte aus einem stillen Nachteil einen
           lauten Schaden. */
        console.error("[bestellung] Standard-Zahlungsmethode:", (f as Error).message);
        await melde({
          ereignis: "mail.fehlgeschlagen",
          empfaenger: { art: "admin" },
          kurztext:
            "Die gespeicherte Zahlungsmethode wurde nicht als Standard gesetzt; die nächste monatliche Abbuchung kann daran scheitern",
          /* Gar kein Mailversand: Es geht um die Zahlungsmethode. Die
             Art heisst nur so; hier ist keine Mail gescheitert. */
          betroffeneMailAn: NICHT_DAS_TEAM_POSTFACH,
          kennungen: { kunde: konto.userId, vorgang: bestellung.id },
          adminPfad: "/admin/bestellungen",
        });
      });
    }

    // 3) Buchungen; 4) Auftraege der Hand-Leistungen
    const buchungen = await buchungenSichern(
      service,
      bestellung,
      konto.userId,
      bezahlt,
      subscription?.id ?? null
    );
    if (bezahlt) {
      for (const buchung of buchungen) {
        const auftraege = await erstelleAuftraegeFuerBuchung({
          id: buchung.id,
          user_id: konto.userId,
          leistung_id: buchung.leistung_id,
          art: buchung.art,
        });
        if (!auftraege.ok) offenGeblieben.push(...auftraege.offen);
        /* UND DIE WIRKUNG: zusaetzliche Monate Portalschaltung, das
           Kontingent fuer die Foto-Aufbereitung. Steht neben dem
           Auftrag, weil beides dasselbe beantwortet, naemlich was mit
           einer bezahlten Buchung geschieht (lib/freischaltung.ts).

           DAS ERGEBNIS WIRD ANGESEHEN (16.08.2026). Bleibt die Wirkung
           aus, hat der Kunde bezahlt und nichts bekommen; das gehoert
           an die Bestellung und nicht nur ins Server-Log. Die Meldung
           an das Team setzt buchungFreischalten selbst ab. */
        const wirkung = await buchungFreischalten(buchung.id);
        if (!wirkung.ok) offenGeblieben.push(...wirkung.offen);
      }
    }

    /* Gutschein: Erst die BESTAETIGTE Zahlung macht aus der
       Reservierung eine Einloesung. Eine schwebende Lastschrift
       laesst sie schwebend; scheitert sie, gibt bestellungGescheitert
       den Platz zurueck. */
    if (bezahlt && bestellung.gutschein_id) {
      const gutschein = await gutscheinEinloesen(service, bestellung.id);
      if (!gutschein.ok) offenGeblieben.push(...gutschein.offen);
    }

    // 5) Rechnung vermerken, falls schon vorhanden
    const invoice = session.invoice as Stripe.Invoice | null;
    if (invoice) {
      await rechnungVermerken(service, invoice, {
        userId: konto.userId,
        bestellungId: bestellung.id,
      });
    }

    /* 5b) WAS AUF DAS KONTO GEWARTET HAT (31.08.2026).
       Hier und nicht frueher: Das Konto steht seit Schritt 1, das
       Profil traegt seit Schritt 2 seine Stripe-Kennung, und die
       Bestellung ist seit Schritt 1 zugeordnet. Erst damit finden die
       drei Zuordnungswege in `aboZahlungEingegangen` ueberhaupt etwas.

       VOR der Bestellbestaetigung, damit ein hier entstandener Hinweis
       noch in `offenGeblieben` landet und `verarbeitet_am` zurueckhaelt:
       Eine bezahlte Rechnung, die auch jetzt nicht zu vermerken ist,
       darf die Bestellung nicht als vollstaendig gelten lassen. */
    const nachgeholt = await wartendeRechnungenNachholen(
      service,
      bestellung.stripe_customer_id
    );
    offenGeblieben.push(...nachgeholt);

    // 6) Die eine Bestellbestaetigung
    const mailHinweis = await bestaetigungSenden(
      service,
      bestellung,
      konto.userId,
      konto.kontoBestand,
      konto.link,
      !bezahlt
    );
    if (mailHinweis) offenGeblieben.push(mailHinweis);

    hinweise.push(...offenGeblieben, ...festgestellt);

    /* DER MERKER GEHOERT HINTER DIE WIRKUNG (Bau-Runde 17).
       verarbeitet_am steht nur, wenn kein Schritt ausblieb. Vorher
       stand er immer, und eine bezahlte Bestellung mit ausgebliebener
       Freischaltung fiel aus jeder Nachverfolgung: Die Sperre weiter
       oben liess "Erneut verarbeiten" dann gar nicht mehr durch und
       meldete stattdessen, die Bestellung sei bereits vollstaendig
       verarbeitet, waehrend das Kontingent fehlte und das Geld
       genommen war. Dieselbe Form wie der 178-Euro-Vorfall in
       lib/wirkung.ts.

       Ein festgestellter Betrags-Unterschied haelt den Merker NICHT
       zurueck: Er ist kein ausgebliebener Schritt, sondern eine
       Feststellung, die ein Mensch ansehen muss. Seine Wirkung, die
       Meldung an das Team, ist oben bereits hinausgegangen, und kein
       zweiter Lauf aendert die Zahl. Er bleibt im Fehlerfeld sichtbar
       und geht an den Aufrufer. */
    /* DIESE ZEILE IST DER ABSCHLUSS, und wenn sie ausbleibt, gibt es
       keine zweite Stelle, die es nachtraegt: Der Status bleibt auf
       seinem alten Wert stehen, waehrend Konto, Buchungen und
       Bestaetigung bereits angelegt sind. Im Admin-Bereich sieht das
       aus, als haette der Kunde nicht bezahlt.

       Deshalb kann hier NICHT `offenGeblieben` genutzt werden, wie bei
       der Kontoverknuepfung: Diese Liste wird ja gerade von dieser
       Zeile geschrieben. Es bleibt die Meldung an das Team. */
    const abgeschlossen = await schreibe(
      service
        .from("bestellungen")
        .update({
          status: bezahlt ? "bezahlt" : "zahlung_offen",
          verarbeitet_am: offenGeblieben.length > 0 ? null : new Date().toISOString(),
          fehler_text: hinweise.length > 0 ? hinweise.join(" ") : null,
        })
        .eq("id", bestellung.id)
        .select("id")
    );
    if (!abgeschlossen.ok) {
      await stillGeschrieben(
        "bestellung-verarbeitung: Abschluss",
        `Der Abschluss der Bestellung (Status ${bezahlt ? "bezahlt" : "zahlung_offen"})`,
        { kunde: konto.userId, vorgang: bestellung.id },
        abgeschlossen
      );
    }

    await melde({
      ereignis: "bestellung.eingegangen",
      empfaenger: { art: "admin" },
      kurztext: bezahlt
        ? "Neue Bestellung, Zahlung bestätigt"
        : "Neue Bestellung, Zahlung wird von der Bank bestätigt",
      kennungen: { kunde: konto.userId, vorgang: bestellung.id },
      adminPfad: "/admin/bestellungen",
    });

    /* WENN ETWAS AUSBLIEB, ERFAEHRT DAS TEAM ES ALS EIGENE MELDUNG.
       Die Bestellung steht dann ohne verarbeitet_am in der Liste und
       traegt den Knopf "Erneut verarbeiten"; ohne diese Meldung
       muesste jemand von sich aus nachsehen. */
    if (offenGeblieben.length > 0) {
      await melde({
        ereignis: "bestellung.fehler",
        empfaenger: { art: "admin" },
        kurztext: `Bezahlte Bestellung mit ${offenGeblieben.length === 1 ? "einem offenen Punkt" : `${offenGeblieben.length} offenen Punkten`}: ${offenGeblieben.join(" ")}`,
        kennungen: { kunde: konto.userId, vorgang: bestellung.id },
        adminPfad: "/admin/bestellungen",
      });
    }

    /* Der Lauf ist durch, aber "durch" ist nicht dasselbe wie
       "vollstaendig": Eine ausgebliebene Freischaltung oder eine nicht
       versandte Bestaetigung stehen in `hinweise` und gehoeren dem
       Aufrufer gesagt, damit "Erneut verarbeiten" nicht Erfolg meldet,
       wo etwas offen ist. */
    if (hinweise.length > 0) {
      return {
        ok: false,
        gewirkt: [
          offenGeblieben.length > 0
            ? "Die Bestellung wurde durchlaufen, gilt aber nicht als verarbeitet."
            : "Die Bestellung wurde verarbeitet.",
        ],
        offen: hinweise,
        /* Nur ein ausgebliebener Schritt laesst sich nachholen. Steht
           allein der abweichende Betrag offen, wiederholt Stripe
           sonst drei Tage lang um eine Zahl, die sich nie aendert. */
        wiederholenHilft: offenGeblieben.length > 0,
      };
    }
    return gewirkt(
      bezahlt
        ? "Konto, Buchungen und Bestätigung sind angelegt, die Zahlung ist bestätigt."
        : "Konto, Buchungen und Bestätigung sind angelegt; die Bank bestätigt die Zahlung noch."
    );
  } catch (fehler) {
    const text = (fehler as Error).message;
    console.error("[bestellung] Verarbeitung fehlgeschlagen:", bestellung.id, text);
    await service
      .from("bestellungen")
      .update({ status: "fehler", fehler_text: text })
      .eq("id", bestellung.id);
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext: "Eine bezahlte Bestellung ließ sich nicht verarbeiten",
      kennungen: { vorgang: bestellung.id },
      adminPfad: "/admin/bestellungen",
    });
    throw fehler;
  }
}

/** Lastschrift endgueltig gescheitert: Bestellung ehrlich markieren */
export async function bestellungGescheitert(sessionId: string): Promise<void> {
  const service = supabaseService();
  if (!service) return;
  const { data: bestellung } = await service
    .from("bestellungen")
    .select("id, user_id, email, vorname, nachname")
    .eq("stripe_session_id", sessionId)
    .maybeSingle<{ id: string; user_id: string | null; email: string; vorname: string; nachname: string }>();
  if (!bestellung) return;
  await service
    .from("bestellungen")
    .update({ status: "fehlgeschlagen" })
    .eq("id", bestellung.id);
  // Wer nicht gezahlt hat, verbraucht keine Einloesung
  await gutscheinFreigeben(service, bestellung.id);
  // Noch nicht freigeschaltete Buchungen bleiben stehen, aber sichtbar offen
  await service
    .from("buchungen")
    .update({ zahlung_ueberfaellig_seit: new Date().toISOString() })
    .eq("bestellung_id", bestellung.id)
    .eq("status", "bestellt");
  await melde({
    ereignis: "zahlung.fehlgeschlagen",
    empfaenger: { art: "admin" },
    kurztext: "Die Zahlung einer Bestellung ist endgültig gescheitert",
    kennungen: { vorgang: bestellung.id },
    adminPfad: "/admin/bestellungen",
  });
}

/**
 * Eine Abo-Abbuchung ist gescheitert (invoice.payment_failed): Buchung
 * markieren, den Kunden EINMAL freundlich informieren, das Team
 * benachrichtigen. KEINE automatische Sperre, das Team entscheidet.
 */
export async function aboZahlungGescheitert(invoice: Stripe.Invoice): Promise<void> {
  const service = supabaseService();
  if (!service) return;
  const subId = invoiceAboId(invoice);
  if (!subId) return;
  const { data: buchung } = await service
    .from("buchungen")
    .select("id, user_id, leistung_id, zahlung_ueberfaellig_seit")
    .eq("stripe_subscription_id", subId)
    .maybeSingle<{
      id: string;
      user_id: string;
      leistung_id: string;
      zahlung_ueberfaellig_seit: string | null;
    }>();
  if (!buchung) return;
  const ersterFehlschlag = !buchung.zahlung_ueberfaellig_seit;
  if (ersterFehlschlag) {
    /* DER MERKER SICHERT DEN VERSAND AB, nicht umgekehrt (Auflage des
       Inhabers, 31.08.2026).

       DAS PROBLEM WAR NICHT DIE FEHLENDE MELDUNG, sondern der
       Doppelversand: `ersterFehlschlag` liest genau diesen Merker.
       Sitzt er nicht, ist er beim naechsten Stripe-Versuch WIEDER
       falsch, und dieselbe Mahnung geht erneut hinaus. Stripe versucht
       eine geplatzte Abbuchung ueblicherweise drei- bis viermal ueber
       zwei Wochen; der Kunde bekaeme also drei bis vier Mahnungen fuer
       dieselbe Sache.

       DESHALB WIRD BEI EINEM STUMMEN SCHREIBVORGANG NICHTS
       VERSCHICKT. Die Reihenfolge Merker-dann-Mail stand schon vorher
       da und ist richtig; was fehlte, war das Hinsehen dazwischen.

       DER PREIS IST BEWUSST: Bricht es hier ab, bleibt der Kunde
       zunaechst ohne Mahnung. Das ist der bessere Tausch. Der naechste
       Stripe-Versuch findet den Merker weiterhin leer und holt die
       Mahnung dann nach, und das Team hat die Meldung sofort. Eine
       viermal verschickte Mahnung nimmt niemand zurueck. */
    const merker = await schreibe(
      service
        .from("buchungen")
        .update({ zahlung_ueberfaellig_seit: new Date().toISOString() })
        .eq("id", buchung.id)
        .select("id")
    );
    if (!merker.ok) {
      await stillGeschrieben(
        "bestellung-verarbeitung: Ueberfaellig-Merker setzen",
        "Der Ueberfaellig-Merker der Buchung. Die Mahnung wurde deshalb NICHT verschickt, sonst ginge sie bei jedem weiteren Stripe-Versuch erneut hinaus",
        { kunde: buchung.user_id, vorgang: buchung.id },
        merker
      );
      return;
    }
    const { data: profil } = await service
      .from("profiles")
      .select("name, email")
      .eq("id", buchung.user_id)
      .maybeSingle<{ name: string | null; email: string | null }>();
    const leistungsName =
      siteConfig.services.find((s) => s.id === buchung.leistung_id)?.name ??
      siteConfig.packages.find((p) => p.id === buchung.leistung_id)?.name ??
      buchung.leistung_id;
    if (profil?.email) {
      const inhalt = zahlungFehlgeschlagenMail({
        name: profil.name ?? "",
        leistungen: [leistungsName],
      });
      await sendeMail({
        an: profil.email,
        ...inhalt,
        art: "benachrichtigung",
        vorlage: pflichtMail("zahlung-fehlgeschlagen"),
        userId: buchung.user_id,
      });
    }
    /* IN DIE GLOCKE (Runde 35). OHNE BETRAG: Was offen ist, steht auf
       der Zahlungsseite, wo der Rahmen es erklaert. */
    await meldeDemKunden({
      kundeId: buchung.user_id,
      art: "zahlung.fehlgeschlagen",
      zeile: `Die Abbuchung für ${leistungsName} ist nicht durchgegangen. Bitte prüfen Sie Ihr Zahlungsmittel, sonst endet die Leistung.`,
      kennungen: { buchung: buchung.id },
    });

    await melde({
      ereignis: "zahlung.fehlgeschlagen",
      empfaenger: { art: "admin" },
      kurztext: "Eine monatliche Abbuchung ist gescheitert (Wiederholungen laufen)",
      kennungen: { kunde: buchung.user_id, vorgang: buchung.id },
      adminPfad: "/admin/buchungen",
    });
  }
}

/** Abo-Rechnung bezahlt: Rechnung vermerken, Ueberfaellig-Marke loeschen */
export async function aboZahlungEingegangen(invoice: Stripe.Invoice): Promise<void> {
  const service = supabaseService();
  if (!service) return;
  const subId = invoiceAboId(invoice);
  let userId: string | null = null;
  let bestellungId: string | null = null;
  if (subId) {
    const { data: buchung } = await service
      .from("buchungen")
      .select("id, user_id, bestellung_id, status")
      .eq("stripe_subscription_id", subId)
      .maybeSingle<{ id: string; user_id: string; bestellung_id: string | null; status: string }>();
    if (buchung) {
      userId = buchung.user_id;
      bestellungId = buchung.bestellung_id;
      /* DER `.not()`-FILTER IST HIER ENTFERNT WORDEN, und das ist die
         eine Aenderung dieser Runde, die das Verhalten der Abfrage
         selbst betrifft.

         ER WAR DIE URSACHE DER BLINDHEIT, nachweisbar und nicht
         geraten: Er liess das update nur dann greifen, wenn der Merker
         gesetzt WAR. Bei jeder gewoehnlichen Monatszahlung ist er das
         nicht, also traf das update null Zeilen. Null waere damit der
         Normalfall gewesen, und eine Rueckleseprobe darauf haette
         nichts messen koennen: Sie muesste `nullOk` tragen und waere
         genau dort blind, wo es darauf ankommt, naemlich wenn die
         Buchung gar nicht mehr existiert.

         OHNE DEN FILTER trifft das update immer genau die eine Zeile,
         und null Zeilen heisst wieder, was es heissen soll: Diese
         Buchung gibt es nicht.

         DASS DAS UNBEDENKLICH IST, ist gemessen und nicht vermutet:
         Der Trigger `schuetze_buchung_abo` (0039, zuletzt 0124) laesst
         `service_role` in seiner ersten Zeile durch, und er vergleicht
         mit `is distinct from`; ein Schreibvorgang von null auf null
         loest ihn also auch sonst nie aus. Der Preis ist ein
         Schreibvorgang ohne Wertaenderung bei jeder Monatszahlung. */
      const merkerWeg = await schreibe(
        service
          .from("buchungen")
          .update({ zahlung_ueberfaellig_seit: null })
          .eq("id", buchung.id)
          .select("id")
      );
      if (!merkerWeg.ok) {
        await stillGeschrieben(
          "bestellung-verarbeitung: Ueberfaellig-Merker loeschen",
          "Die Ueberfaellig-Marke der Buchung nach eingegangener Zahlung. Der Kunde hat bezahlt und gilt weiter als saeumig",
          { kunde: buchung.user_id, vorgang: buchung.id },
          merkerWeg
        );
      }
    }
  }
  const kundeId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!userId && kundeId) {
    const { data: profil } = await service
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", kundeId)
      .maybeSingle<{ id: string }>();
    userId = profil?.id ?? null;
  }
  /* Zweiter Zuordnungsweg ueber die Bestellung: Der Stripe-Kunde steht
     dort schon VOR der Zahlung. Noetig, weil invoice.paid der
     Kontoanlage zuvorkommen kann (belegt 13.08.2026 auf der echten
     Adresse: die Rechnung blieb sonst unvermerkt). */
  if (!userId && kundeId) {
    const { data: bestellung } = await service
      .from("bestellungen")
      .select("id, user_id")
      .eq("stripe_customer_id", kundeId)
      .order("erstellt_am", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; user_id: string | null }>();
    if (bestellung) {
      bestellungId = bestellungId ?? bestellung.id;
      userId = bestellung.user_id;
    }
  }
  if (!userId) {
    /* Noch nicht zuordenbar (Konto entsteht gerade erst): Fehler
       werfen, damit der Webhook 500 antwortet und Stripe das Ereignis
       spaeter erneut zustellt, statt die Rechnung still zu verlieren. */
    throw new Error(`Rechnung ${invoice.id} noch keinem Konto zuordenbar, erneute Zustellung noetig.`);
  }
  await rechnungVermerken(service, invoice, { userId, bestellungId });
  await rechnungsMailSenden(service, invoice, userId);
}

/**
 * Stripe hat ein Abo beendet: die Buchung ehrlich nachziehen.
 *
 * DIESELBE REGEL WIE DIE UEBRIGEN (16.08.2026): Bleibt das Nachziehen
 * aus, zeigt das Konto dem Kunden eine LAUFENDE Leistung, fuer die
 * niemand mehr zahlt und die deshalb auch niemand mehr erbringt. Das
 * faellt hier niemandem auf, denn der Aufrufer ist ein Webhook.
 *
 * NULL ZEILEN IST KEIN FEHLER: Die Bedingung "status aktiv" trifft beim
 * zweiten Zustellversuch desselben Ereignisses nicht mehr zu, und das
 * ist genau richtig so. Gemeldet wird nur der echte Datenbank-Fehler.
 */
export async function aboBeendetNachziehen(subscription: Stripe.Subscription): Promise<void> {
  const service = supabaseService();
  if (!service) return;
  const { error } = await service
    .from("buchungen")
    .update({ status: "beendet" })
    .eq("stripe_subscription_id", subscription.id)
    .eq("status", "aktiv");
  if (error) {
    console.error("[bestellung] Abo-Ende nicht nachgezogen:", subscription.id, error.message);
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext:
        "Stripe hat ein Abo beendet, bei uns steht die Buchung noch auf aktiv. Bitte von Hand beenden.",
      kennungen: { vorgang: subscription.id },
      adminPfad: "/admin/buchungen",
    });
  }
}
