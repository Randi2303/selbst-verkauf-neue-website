import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { appBasis } from "@/lib/app-basis";
import { basisAdresse, basisFehler } from "@/lib/basis-adresse";
import { berechneBestellung, type BestellEingabe } from "@/lib/bestellung";
import { melde } from "@/lib/ereignis";
import { gutscheinFinden, gutscheinFreigeben, gutscheinMeldung } from "@/lib/gutschein";
import type { ContactData } from "@/lib/checkout";
import { kontaktName } from "@/lib/checkout";
import { steuerRateSichern, stripeClient, stripeKonfiguriert, stripeModus, stripeStartFehler } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { WIDERRUF_ZUSTIMMUNG_TEXT } from "@/config/vertragstexte";

export const dynamic = "force-dynamic";

/**
 * Die Kassen-Route: baut aus dem serverseitig gerechneten Warenkorb
 * eine Stripe-Checkout-Session im Elements-Modus (das Payment Element
 * bleibt auf unserer Seite) und legt VORHER die Bestellung als
 * Datenbankzeile an, samt dokumentierter Widerrufs-Zustimmung.
 *
 * SICHERHEIT:
 * - Der Browser liefert nur Kennungen, Mengen, Varianten und die
 *   Kontaktdaten. Jeder Betrag entsteht in lib/bestellung.ts aus
 *   site.config.ts; behauptete Preise werden nicht gelesen.
 * - Der Schluessel-Waechter (lib/stripe.ts) sperrt die Kasse, wenn
 *   Test- und Betriebszustand nicht zusammenpassen.
 * - Rueckkehr-Adressen kommen ausschliesslich aus der konfigurierten
 *   Basis-Adresse (lib/basis-adresse.ts), nie aus der Anfrage.
 *
 * DREI VORGANGSARTEN (lib/bestellung.ts, modus):
 * - subscription: mindestens ein sofort laufender Monatsposten; die
 *   Einmalposten stehen mit auf der ersten Abo-Rechnung.
 * - payment: nur Einmalposten, mit Stripe-Rechnung. Steckt die
 *   Makler-Begleitung im Korb, wird die Zahlungsmethode fuer deren
 *   spaeteren Abo-Start mit gespeichert.
 * - setup: der Korb enthaelt NUR die Makler-Begleitung. Heute wird
 *   nichts faellig, nur die Zahlungsmethode wird erfasst; das Abo
 *   startet mit der Zuweisung des Ansprechpartners.
 */
export async function POST(request: NextRequest) {
  const daten = (await request.json().catch(() => null)) as {
    items?: BestellEingabe[];
    contact?: ContactData;
    instantPayment?: boolean;
    gutscheinCode?: string;
    vorherigeBestellungId?: string;
  } | null;

  if (!stripeKonfiguriert()) {
    // Stripe (noch) nicht verbunden: Die Kasse bestellt per E-Mail weiter
    return NextResponse.json({ fallback: "anfrage" });
  }
  const waechter = stripeStartFehler();
  if (waechter) {
    console.error("[checkout] Waechter:", waechter);
    return NextResponse.json({ meldung: waechter }, { status: 503 });
  }
  const stripe = stripeClient();
  const service = supabaseService();
  if (!stripe || !service) {
    return NextResponse.json({ meldung: "Die Kasse ist gerade nicht erreichbar." }, { status: 503 });
  }
  const basis = basisAdresse();
  if (!basis) {
    console.error("[checkout]", basisFehler());
    return NextResponse.json(
      { meldung: "Die Kasse ist gerade nicht erreichbar (Basis-Adresse fehlt)." },
      { status: 503 }
    );
  }

  const kontakt = daten?.contact;
  const emailOk = /^\S+@\S+\.\S+$/.test(kontakt?.email?.trim() ?? "");
  const rechnung = kontakt
    ? kontakt.rechnungWieObjekt
      ? { strasse: kontakt.objektStrasse, plz: kontakt.objektPlz, stadt: kontakt.objektStadt }
      : {
          strasse: kontakt.rechnungStrasse ?? "",
          plz: kontakt.rechnungPlz ?? "",
          stadt: kontakt.rechnungStadt ?? "",
        }
    : null;
  if (
    !kontakt ||
    !emailOk ||
    !kontakt.vorname?.trim() ||
    !kontakt.nachname?.trim() ||
    !rechnung?.strasse?.trim() ||
    !rechnung.plz?.trim() ||
    !rechnung.stadt?.trim()
  ) {
    return NextResponse.json(
      { meldung: "Bitte prüfen Sie Ihre Angaben, es fehlt etwas." },
      { status: 400 }
    );
  }

  const email = kontakt.email.trim().toLowerCase();

  /* Gutschein: Der Browser schickt nur den Text. Gilt der Code nicht
     mehr, bricht die Bestellung HIER mit der ehrlichen Begruendung ab,
     statt still ohne Nachlass abzurechnen. Die wettlaufsichere
     Reservierung folgt nach dem Anlegen der Bestellung. */
  let gutschein = null;
  if (daten?.gutscheinCode?.trim()) {
    const pruefung = await gutscheinFinden(service, daten.gutscheinCode, email);
    if (!pruefung.ok) {
      return NextResponse.json({ meldung: pruefung.meldung, gutschein: true }, { status: 400 });
    }
    gutschein = pruefung.gutschein;
  }

  const rechnung_ = berechneBestellung(
    daten?.items ?? [],
    Boolean(daten?.instantPayment),
    gutschein
  );
  if (!rechnung_.ok) {
    return NextResponse.json(
      { meldung: rechnung_.meldung, gutschein: Boolean(rechnung_.gutscheinGrund) },
      { status: 400 }
    );
  }
  const bestellung = rechnung_.bestellung;

  /* Eine frisch verlassene Session derselben Sitzung aufraeumen: Wer
     zurueckgeht und den Korb aendert, soll keine offene Geister-
     Bestellung hinterlassen. */
  if (daten?.vorherigeBestellungId) {
    const { data: alte } = await service
      .from("bestellungen")
      .select("id, status, stripe_session_id")
      .eq("id", daten.vorherigeBestellungId)
      .eq("email", email)
      .maybeSingle<{ id: string; status: string; stripe_session_id: string | null }>();
    if (alte?.status === "offen") {
      await service.from("bestellungen").update({ status: "abgelaufen" }).eq("id", alte.id);
      // Eine reservierte Gutschein-Einloesung der alten Session wird frei
      await gutscheinFreigeben(service, alte.id);
      if (alte.stripe_session_id) {
        /* wirkung: gewollt still, die Bestellung ist eine Zeile vorher
           bereits auf "abgelaufen" gesetzt und der Gutschein
           freigegeben. Dieser Aufruf raeumt nur bei Stripe hinterher
           auf; eine Sitzung, die dort stehenbleibt, verfaellt von
           selbst und kann nichts mehr ausloesen. Ein Abbruch hier
           hielte den Kunden vor seiner NEUEN Bestellung auf, wegen
           einer alten. */
        // wirkung: gewollt still, der Grund steht im Kommentar darueber
        await stripe.checkout.sessions.expire(alte.stripe_session_id).catch(() => null);
      }
    }
  }

  // Angemeldeter Kunde: Bestellung sofort dem Konto zuordnen
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Wohin nach der Zahlung? Dorthin, wo der Kauf begann. Der Schluss
     laeuft NICHT ueber den Host der Anfrage (Regel in
     lib/basis-adresse.ts), sondern ueber die Sitzung: Eine Sitzung
     gibt es seit der Unterdomain-Runde nur auf der App-Basis, ein
     angemeldeter Kaeufer kam also von der App-Kasse. Ein Gast kauft
     auf der oeffentlichen Seite und kehrt dorthin zurueck. */
  const rueckkehrBasis = user ? appBasis() ?? basis : basis;

  const { data: zeile, error: bestellFehler } = await service
    .from("bestellungen")
    .insert({
      email,
      vorname: kontakt.vorname.trim(),
      nachname: kontakt.nachname.trim(),
      telefon: kontakt.phone?.trim() || null,
      objektart: kontakt.category || null,
      objekt_strasse: kontakt.objektStrasse?.trim() || null,
      objekt_plz: kontakt.objektPlz?.trim() || null,
      objekt_stadt: kontakt.objektStadt?.trim() || null,
      rechnung_strasse: rechnung.strasse.trim(),
      rechnung_plz: rechnung.plz.trim(),
      rechnung_stadt: rechnung.stadt.trim(),
      positionen: bestellung.positionen,
      summe_einmalig: bestellung.summeEinmalig,
      summe_einmalig_vor_rabatt: bestellung.summeEinmaligVorRabatt,
      rabatt: bestellung.rabatt,
      sofortzahlung: bestellung.sofortzahlung,
      summe_monatlich: bestellung.summeMonatlich,
      summe_monatlich_spaeter: bestellung.summeMonatlichSpaeter,
      gutschein_id: bestellung.gutschein?.id ?? null,
      gutschein_code: bestellung.gutschein?.code ?? null,
      gutschein_betrag: bestellung.gutschein?.betrag ?? 0,
      widerruf_zustimmung_text: WIDERRUF_ZUSTIMMUNG_TEXT,
      testbetrieb: stripeModus() === "test",
      user_id: user?.id ?? null,
    })
    .select("id")
    .single<{ id: string }>();
  if (bestellFehler || !zeile) {
    console.error("[checkout] Bestellung nicht angelegt:", bestellFehler?.message);
    return NextResponse.json(
      { meldung: "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }

  /* RESERVIERUNG, wettlaufsicher in der Datenbank: Die Funktion sperrt
     die Gutschein-Zeile, zaehlt und traegt in EINEM Schritt ein. Wenn
     zwei Kassen gleichzeitig die letzte Einloesung wollen, bekommt sie
     genau eine; die andere erfaehrt es hier, BEVOR sie bezahlt. */
  if (bestellung.gutschein) {
    const { data: ergebnis, error: reservierungsFehler } = await service.rpc(
      "gutschein_reservieren",
      {
        p_gutschein_id: bestellung.gutschein.id,
        p_bestellung_id: zeile.id,
        p_email: email,
        p_betrag: bestellung.gutschein.betrag,
      }
    );
    if (reservierungsFehler || ergebnis !== "ok") {
      await service.from("bestellungen").update({ status: "abgelaufen" }).eq("id", zeile.id);
      if (reservierungsFehler) {
        console.error("[checkout] Reservierung:", reservierungsFehler.message);
        return NextResponse.json(
          { meldung: "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut." },
          { status: 500 }
        );
      }
      const grund = ergebnis === "je_kunde" ? "je_kunde" : "aufgebraucht";
      return NextResponse.json(
        { meldung: gutscheinMeldung(grund), gutschein: true },
        { status: 409 }
      );
    }
  }

  try {
    /* Der Stripe-Kunde traegt Name, Rechnungsanschrift und Telefon;
       daraus baut Stripe die Rechnung. Ein angemeldeter Kunde mit
       vorhandenem Stripe-Kunden nutzt diesen weiter (aktualisiert),
       sonst entsteht ein neuer. */
    let kundeId: string | null = null;
    if (user) {
      const { data: profil } = await service
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle<{ stripe_customer_id: string | null }>();
      kundeId = profil?.stripe_customer_id ?? null;
    }
    const kundenDaten: Stripe.CustomerUpdateParams = {
      email,
      name: kontaktName(kontakt),
      phone: kontakt.phone?.trim() || undefined,
      address: {
        line1: rechnung.strasse.trim(),
        postal_code: rechnung.plz.trim(),
        city: rechnung.stadt.trim(),
        country: "DE",
      },
    };
    if (kundeId) {
      await stripe.customers.update(kundeId, kundenDaten).catch(async () => {
        // Kunde aus einem frueheren Schluesselstand: neu anlegen
        const neu = await stripe.customers.create(kundenDaten as Stripe.CustomerCreateParams);
        kundeId = neu.id;
      });
    } else {
      const neu = await stripe.customers.create(kundenDaten as Stripe.CustomerCreateParams);
      kundeId = neu.id;
    }

    const steuerRate = await steuerRateSichern(stripe);
    const zeilen: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const posten of bestellung.positionen) {
      if (posten.spaeter) continue; // Makler-Begleitung startet erst mit der Zuweisung
      const betragCent = Math.round(posten.betrag * 100);
      /* Menge nur dann als Stripe-Menge, wenn der rabattierte Betrag
         glatt teilbar bleibt; sonst eine Zeile mit der Menge im Namen,
         damit auf der Rechnung nie krumme Stueckpreise stehen. */
      const teilbar = posten.menge > 1 && betragCent % posten.menge === 0;
      const name =
        posten.menge > 1 && !teilbar
          ? `${posten.name}, ${posten.menge} ${posten.einheit ?? "Stück"}`
          : posten.name;
      zeilen.push({
        quantity: teilbar ? posten.menge : 1,
        price_data: {
          currency: "eur",
          unit_amount: teilbar ? betragCent / posten.menge : betragCent,
          tax_behavior: "inclusive",
          product_data: {
            name,
            /* Die Rechnung nennt jeden Nachlass beim Namen; der Preis
               der Zeile ist bereits der geminderte. */
            ...(posten.rabatt > 0 || (posten.gutschein ?? 0) > 0
              ? {
                  description: [
                    posten.rabatt > 0
                      ? `Abzüglich Sofortzahlungs-Rabatt (${posten.rabatt} €)`
                      : null,
                    (posten.gutschein ?? 0) > 0
                      ? `Abzüglich Gutschein ${bestellung.gutschein?.code ?? ""} (${posten.gutschein} €)`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }
              : {}),
          },
          ...(posten.zahlweise === "monatlich" ? { recurring: { interval: "month" as const } } : {}),
        },
        tax_rates: [steuerRate],
      });
    }

    const params: Stripe.Checkout.SessionCreateParams = {
      ui_mode: "elements",
      mode: bestellung.modus,
      customer: kundeId,
      return_url: `${rueckkehrBasis}/kasse/danke?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { bestellung_id: zeile.id },
      locale: "de",
    };
    if (bestellung.modus !== "setup") {
      params.line_items = zeilen;
      params.customer_update = { address: "never", name: "never" };
    }
    if (bestellung.modus === "subscription") {
      params.subscription_data = { metadata: { bestellung_id: zeile.id } };
    }
    if (bestellung.modus === "payment") {
      // Stripe erzeugt die Rechnung der Einmal-Zahlung
      params.invoice_creation = { enabled: true };
      params.payment_intent_data = {
        metadata: { bestellung_id: zeile.id },
        ...(bestellung.zahlungsmethodeSpeichern
          ? { setup_future_usage: "off_session" as const }
          : {}),
      };
    }
    if (bestellung.modus === "setup") {
      params.setup_intent_data = { metadata: { bestellung_id: zeile.id } };
      params.currency = "eur";
    }
    /* Mit reserviertem Gutschein laeuft die Session nach 2 Stunden ab
       statt nach den ueblichen 24: Wer die Kasse einfach schliesst,
       blockiert eine Einloesung eines knappen Codes sonst einen ganzen
       Tag, denn erst der expired-Webhook gibt die Reservierung frei.
       Zwei Stunden reichen jedem echten Bezahlvorgang; laeuft sie doch
       ab, fuehrt "Weiter zur Zahlung" einfach zu einer frischen
       Session. Sessions ohne Gutschein behalten den Stripe-Standard. */
    if (bestellung.gutschein) {
      params.expires_at = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
    }

    const session = await stripe.checkout.sessions.create(params);

    /* DIESELBE BAUART WIE BEIM MAKLER-ABO, und hier war sie ungeprueft
       (gefunden am 16.08.2026): Wir nehmen eine Kennung von einem
       fremden Dienst entgegen und speichern sie. Schlaegt DIESE Zeile
       fehl, zahlt der Kunde gleich darauf, und der Webhook findet die
       Bestellung nicht mehr, denn er sucht ausschliesslich ueber
       `stripe_session_id` (app/api/stripe/webhook/route.ts). Der Kunde
       bekaeme kein Konto, keine Buchung und keine Rechnung, und bei uns
       stuende nichts, was darauf hinweist.

       ES WIRD NICHT ABGEBROCHEN, sondern gemeldet: Die Session lebt
       bereits bei Stripe, und ein Abbruch machte sie nicht ungeschehen.
       Die Kennung steht in der Meldung, damit sie sich von Hand
       nachtragen laesst, und `bestellung_id` liegt zusaetzlich in den
       Metadaten der Session. */
    const { data: vermerkt, error: vermerkFehler } = await service
      .from("bestellungen")
      .update({ stripe_session_id: session.id, stripe_customer_id: kundeId })
      .eq("id", zeile.id)
      .select("id");
    if (vermerkFehler || (vermerkt?.length ?? 0) === 0) {
      console.error(
        "[checkout] Session angelegt, aber nicht vermerkt:",
        session.id,
        vermerkFehler?.message ?? "keine Zeile getroffen"
      );
      await melde({
        ereignis: "bestellung.fehler",
        empfaenger: { art: "admin" },
        kurztext:
          "Eine Kassen-Sitzung laeuft bei Stripe, ist bei uns aber nicht vermerkt. Zahlt der Kunde jetzt, findet der Webhook die Bestellung nicht. Bitte die Sitzungs-Kennung an der Bestellung nachtragen.",
        kennungen: { vorgang: zeile.id, sitzung: session.id },
        adminPfad: "/admin/bestellungen",
      });
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
      bestellungId: zeile.id,
      testbetrieb: stripeModus() === "test",
      rueckkehr: `${rueckkehrBasis}/kasse/danke`,
    });
  } catch (fehler) {
    console.error("[checkout] Session fehlgeschlagen:", fehler);
    await service
      .from("bestellungen")
      .update({ status: "fehler", fehler_text: `Session: ${(fehler as Error).message}` })
      .eq("id", zeile.id);
    // Ohne Session wird nie gezahlt: Die Reservierung wird wieder frei
    await gutscheinFreigeben(service, zeile.id);
    return NextResponse.json(
      { meldung: "Die Zahlung ließ sich nicht vorbereiten. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }
}
