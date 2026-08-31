import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  aboBeendetNachziehen,
  aboZahlungEingegangen,
  aboZahlungGescheitert,
  bestellungGescheitert,
  bestellungVerarbeiten,
  erstattungVermerken,
  standardZahlungsmethode,
} from "@/lib/bestellung-verarbeitung";
import { stripeClient } from "@/lib/stripe";
import { gutscheinFreigeben } from "@/lib/gutschein";
import { melde } from "@/lib/ereignis";
import { schreibe } from "@/lib/schreiben";
import { supabaseService } from "@/lib/supabase/service";
import { offenerText } from "@/lib/wirkung";

export const dynamic = "force-dynamic";

/**
 * Die Stripe-Kundenkennung aus dem Ereignis-Gegenstand, soweit er eine
 * traegt. Rechnungen, Sitzungen und Zahlungen tragen sie alle unter
 * `customer`, mal als Zeichenkette, mal als eingebettetes Objekt.
 */
function stripeKunde(gegenstand: unknown): string | null {
  const kunde = (gegenstand as { customer?: string | { id?: string } | null })?.customer;
  if (!kunde) return null;
  return typeof kunde === "string" ? kunde : (kunde.id ?? null);
}

/**
 * Die Gegenstelle fuer Stripes Rueckmeldungen. Ohne sie weiss das
 * System nichts von einer Zahlung; eine Buchung gilt erst als bezahlt,
 * wenn dieses Ereignis es bestaetigt, nie weil jemand auf einen Knopf
 * gedrueckt hat.
 *
 * SCHUTZ: Die Signaturpruefung (STRIPE_WEBHOOK_SECRET) weist alles ab,
 * was nicht nachweislich von Stripe kommt. Deshalb ist der Pfad auch
 * vom Vorlaunch-Passwortschutz ausgenommen (proxy.ts): Stripe kann
 * sich an keinem Anmeldefenster vorbeitippen, und die Route gibt
 * nichts preis.
 *
 * DOPPELTE EREIGNISSE: Stripe stellt Ereignisse mehrfach zu, das ist
 * normal. Jede Kennung landet in stripe_ereignisse; eine bereits
 * VERARBEITETE Kennung loest nichts mehr aus. Ein Ereignis, dessen
 * Verarbeitung scheiterte, traegt verarbeitet_am null und wird beim
 * naechsten Zustellversuch erneut verarbeitet (die Antwort ist dann
 * 500, damit Stripe wiederkommt).
 *
 * JEDES Ereignis wird protokolliert, auch die, mit denen wir nichts
 * anfangen.
 */
export async function POST(request: Request) {
  const stripe = stripeClient();
  const geheimnis = process.env.STRIPE_WEBHOOK_SECRET;
  const service = supabaseService();
  if (!stripe || !geheimnis || !service) {
    return NextResponse.json({ meldung: "Nicht konfiguriert." }, { status: 503 });
  }

  const signatur = request.headers.get("stripe-signature");
  const rohtext = await request.text();
  let ereignis: Stripe.Event;
  try {
    ereignis = stripe.webhooks.constructEvent(rohtext, signatur ?? "", geheimnis);
  } catch {
    return NextResponse.json({ meldung: "Ungültige Signatur." }, { status: 400 });
  }

  // Protokoll und Deduplizierung in einem Schritt
  const { data: bekannt } = await service
    .from("stripe_ereignisse")
    .select("id, verarbeitet_am")
    .eq("id", ereignis.id)
    .maybeSingle<{ id: string; verarbeitet_am: string | null }>();
  if (bekannt?.verarbeitet_am) {
    return NextResponse.json({ ok: true, doppelt: true });
  }
  if (!bekannt) {
    /* DIESER EINTRAG IST DER ERSTE DOPPELSCHUTZ, und bis zum 31.08.2026
       sah niemand nach, ob er entsteht. Bleibt er aus, ist `bekannt`
       beim naechsten Zustellversuch wieder null, und diese Schicht
       existiert nicht mehr.

       WAS DANN NOCH TRAEGT, IST GEMESSEN (npm run
       doppelte-zustellung:probe, 31.08.2026): Die einzelnen Wege
       bringen ihren eigenen Schutz mit. invoice.payment_failed loest
       beim zweiten Mal keine zweite Mahnung aus, invoice.paid legt
       keine zweite Rechnung an, checkout.session.expired trifft beim
       zweiten Mal null Zeilen. Diese Schicht hier ist also die zweite
       und nicht die einzige.

       SIE IST TROTZDEM NOETIG, denn jeder dieser Wege haengt an einem
       eigenen Merker, und genau deren Stille war der Befund dieser
       Runde. Faellt einer davon, ist das hier die Schicht, die noch
       traegt. */
    const vermerkt = await schreibe(
      service
        .from("stripe_ereignisse")
        .insert({
          id: ereignis.id,
          typ: ereignis.type,
          /* DER STRIPE-KUNDE KOMMT SEIT DEM 31.08.2026 MIT, und das ist
             kein Beiwerk: Der Nachholer in `bestellung-verarbeitung.ts`
             sucht darueber die Ereignisse, die auf genau dieses Konto
             gewartet haben. Ohne diese Kennung muesste er jede wartende
             Rechnung einzeln bei Stripe nachfragen, um ihren Kunden zu
             erfahren.

             DIE 17 BESTEHENDEN HABEN SIE NICHT, und das ist so gewollt:
             Sie sind Pruefdaten und sollen liegen bleiben (Entscheidung
             des Inhabers, 31.08.2026). Der Nachholer findet sie damit
             gar nicht erst. */
          daten: {
            objekt: (ereignis.data.object as { id?: string }).id ?? null,
            kunde: stripeKunde(ereignis.data.object),
          },
        })
        .select("id")
    );
    if (!vermerkt.ok) {
      console.error(
        `[stripe-webhook] Ereignis ${ereignis.id} nicht vermerkt:`,
        vermerkt.fehler ?? "null Zeilen"
      );
      await melde({
        ereignis: "bestellung.fehler",
        empfaenger: { art: "admin" },
        kurztext:
          `Der Doppelschutz fuer das Stripe-Ereignis ${ereignis.id} (${ereignis.type}) wurde nicht ` +
          `vermerkt (${vermerkt.fehler ?? "null Zeilen ohne Fehler"}). Eine erneute Zustellung ` +
          `wuerde diesen Vorgang noch einmal verarbeiten.`,
        kennungen: { vorgang: ereignis.id },
        adminPfad: "/admin/bestellungen",
      });
    }
  }

  try {
    switch (ereignis.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = ereignis.data.object as Stripe.Checkout.Session;
        /* DAS ERGEBNIS WIRD ANGESEHEN (Bau-Runde 17). Vorher lief der
           Rueckgabewert ins Leere: Blieb eine Freischaltung, ein
           Auftrag oder die Bestellbestaetigung aus, galt das
           Stripe-Ereignis trotzdem als verarbeitet, Stripe stellte es
           nie wieder zu, und die einzige Rettung war, dass jemand von
           sich aus auf "Erneut verarbeiten" drueckte.

           NUR BEI NACHHOLBAREN PUNKTEN werfen wir weiter (der catch
           unten antwortet mit 500 und Stripe kommt wieder). Steht
           allein ein abweichender Betrag offen, aendert kein zweiter
           Lauf daran etwas; er ist gemeldet und steht an der
           Bestellung, das Ereignis gilt als verarbeitet. */
        const stand = await bestellungVerarbeiten(session.id);
        if (!stand.ok && stand.wiederholenHilft !== false) {
          throw new Error(
            `Bestellung nicht vollstaendig verarbeitet: ${stand.offen.join(" ")}`
          );
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = ereignis.data.object as Stripe.Checkout.Session;
        await bestellungGescheitert(session.id);
        break;
      }
      case "checkout.session.expired": {
        const session = ereignis.data.object as Stripe.Checkout.Session;
        const { data: abgelaufene } = await service
          .from("bestellungen")
          .update({ status: "abgelaufen" })
          .eq("stripe_session_id", session.id)
          .eq("status", "offen")
          .select("id")
          .maybeSingle<{ id: string }>();
        /* Abbruch verbraucht keine Einloesung: Die Reservierung des
           Gutscheins wird mit der Session wieder frei */
        if (abgelaufene) {
          await gutscheinFreigeben(service, abgelaufene.id);
        }
        break;
      }
      case "invoice.paid": {
        await aboZahlungEingegangen(ereignis.data.object as Stripe.Invoice);
        break;
      }
      case "invoice.payment_failed": {
        await aboZahlungGescheitert(ereignis.data.object as Stripe.Invoice);
        break;
      }
      case "charge.refunded": {
        /* Was zurueckging, gehoert an die Rechnung: Die Anrechnung auf
           die Maklerprovision zaehlt nur, was der Kunde wirklich
           bezahlt hat. Hier landet auch eine Erstattung, die jemand
           direkt im Stripe-Dashboard ausgeloest hat.

           BLEIBT DIE WIRKUNG AUS, wird geworfen: Das Ereignis traegt
           dann keinen Verarbeitet-Vermerk, die Antwort ist 500, und
           Stripe stellt es erneut zu, bis der Vermerk wirklich steht.
           Vorher wurde der stille Fehlschlag als verarbeitet
           vermerkt, und die Erstattung fehlte fuer immer (Befund der
           Runde 7). */
        const wirkung = await erstattungVermerken(
          ereignis.data.object as Stripe.Charge
        );
        if (!wirkung.ok) {
          throw new Error(
            offenerText(wirkung) ?? "Die Erstattung wurde nicht vermerkt."
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        await aboBeendetNachziehen(ereignis.data.object as Stripe.Subscription);
        break;
      }
      case "setup_intent.succeeded": {
        /* Zahlungsart-Wechsel aus dem Konto (/konto/zahlung): die neue
           Methode wird Standard des Kunden und aller laufenden Abos. */
        const intent = ereignis.data.object as Stripe.SetupIntent;
        const kundeId =
          typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
        const methode =
          typeof intent.payment_method === "string"
            ? intent.payment_method
            : intent.payment_method?.id;
        if (intent.metadata?.zweck === "zahlungsart-wechsel" && kundeId && methode) {
          await standardZahlungsmethode(stripe, kundeId, methode);
          const abos = await stripe.subscriptions.list({ customer: kundeId, status: "active" });
          for (const abo of abos.data) {
            await stripe.subscriptions.update(abo.id, { default_payment_method: methode });
          }
        }
        break;
      }
      default:
        // Nur protokolliert, bewusst keine Wirkung
        break;
    }
    /* DIE ANDERE SEITE DESSELBEN SCHUTZES: Ohne `verarbeitet_am` faellt
       die Sperre ganz oben (`if (bekannt?.verarbeitet_am)`) beim
       naechsten Zustellversuch nicht, und die Verarbeitung laeuft
       erneut, obwohl sie gelungen ist. */
    const abgehakt = await schreibe(
      service
        .from("stripe_ereignisse")
        .update({ verarbeitet_am: new Date().toISOString(), fehler: null })
        .eq("id", ereignis.id)
        .select("id")
    );
    if (!abgehakt.ok) {
      console.error(
        `[stripe-webhook] Ereignis ${ereignis.id} nicht abgehakt:`,
        abgehakt.fehler ?? "null Zeilen"
      );
      await melde({
        ereignis: "bestellung.fehler",
        empfaenger: { art: "admin" },
        kurztext:
          `Das Stripe-Ereignis ${ereignis.id} (${ereignis.type}) wurde verarbeitet, aber nicht als ` +
          `verarbeitet vermerkt (${abgehakt.fehler ?? "null Zeilen ohne Fehler"}). Eine erneute ` +
          `Zustellung wuerde denselben Vorgang noch einmal verarbeiten.`,
        kennungen: { vorgang: ereignis.id },
        adminPfad: "/admin/bestellungen",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (fehler) {
    const text = (fehler as Error).message;
    /* DIESE SPALTE IST DIE SPUR (31.08.2026 abgesichert, auf Auftrag
       des Inhabers nach dem Sortieren der 29).

       Aus genau diesem Fehlertext liess sich am 31.08.2026 lesen, warum
       17 Ereignisse unverarbeitet dastanden: "Rechnung … noch keinem
       Konto zuordenbar, erneute Zustellung noetig." Ohne ihn haetten
       17 Ereignisse ohne Grund dagestanden, und niemand haette sagen
       koennen, ob es dieselbe Ursache war oder siebzehn verschiedene.

       Faellt der Vermerk still aus, verlieren wir die Spur genau dann,
       wenn wir sie brauchen: Das Ereignis haengt, und der Grund fehlt. */
    const vermerkt = await schreibe(
      service
        .from("stripe_ereignisse")
        .update({ fehler: text })
        .eq("id", ereignis.id)
        .select("id")
    );
    if (!vermerkt.ok) {
      console.error(
        `[stripe-webhook] Fehlertext zu ${ereignis.id} nicht vermerkt:`,
        vermerkt.fehler ?? "null Zeilen"
      );
      await melde({
        ereignis: "bestellung.fehler",
        empfaenger: { art: "admin" },
        kurztext:
          `Das Stripe-Ereignis ${ereignis.id} (${ereignis.type}) ist gescheitert, und der GRUND ` +
          `liess sich nicht vermerken (${vermerkt.fehler ?? "null Zeilen ohne Fehler"}). Der ` +
          `urspruengliche Fehler lautete: ${text}`,
        kennungen: { vorgang: ereignis.id },
        adminPfad: "/admin/bestellungen",
      });
    }
    // 500, damit Stripe erneut zustellt und die Verarbeitung nachholt
    return NextResponse.json({ meldung: text }, { status: 500 });
  }
}
