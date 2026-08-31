"use client";

import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { CreditCard, FlaskConical, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { stripeBereit } from "@/lib/checkout";
import { siteConfig } from "@/site.config";

/**
 * Der Zahlungsbereich der Kasse: das Stripe Payment Element im
 * Elements-Modus der Checkout-Session. Die Eingabefelder fuer
 * Kartendaten und IBAN liegen in iframes von Stripe; durch unseren
 * Code laufen sie nie.
 *
 * REIHENFOLGE DER ZAHLARTEN, eine bewusste Entscheidung (12.08.2026):
 * Die SEPA-Lastschrift steht zuerst und ist damit vorausgewaehlt. Sie
 * kostet uns 35 Cent pauschal, die Karte bei unseren Betraegen ein
 * Vielfaches. Alle Zahlarten bleiben gleichwertig waehlbar, nur die
 * Reihenfolge lenkt; das ist Zumutung genug. Den Mandatstext der
 * Lastschrift zeigt Stripe im Element selbst an.
 *
 * WARTEZEIT EHRLICH ANSAGEN: Mit der Lastschrift als Normalfall ist
 * auch das Warten auf die Bank der Normalfall. Der Hinweis dazu steht
 * HIER, vor der Entscheidung; die Bestellbestaetigung und das Konto
 * wiederholen ihn, solange die Zahlung schwebt.
 */

/** Zeitgrenze fuer den Ladehinweis der Kasse, Begruendung am Zustand. */
const ZAHLUNG_ZEITGRENZE_MS = 15000;

const oeffentlicherSchluessel = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

/** Genau ein Stripe.js je Seite, erst geladen, wenn es gebraucht wird */
let stripeLaden: ReturnType<typeof loadStripe> | null = null;
function stripeJs() {
  if (!stripeLaden && oeffentlicherSchluessel) {
    stripeLaden = loadStripe(oeffentlicherSchluessel);
  }
  return stripeLaden;
}

/** Optik des Payment Elements, angelehnt an die Papier-Anmutung */
const AUSSEHEN = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: siteConfig.colors.primary,
    colorText: siteConfig.colors.ink,
    colorBackground: siteConfig.colors.paper,
    colorDanger: siteConfig.colors.accent,
    borderRadius: "12px",
    fontFamily: `-apple-system, "Segoe UI", Helvetica, Arial, sans-serif`,
  },
};

function Zahlungsformular({
  rueckkehr,
  buttonLabel,
  nichtsFaellig,
  vorgaben,
}: {
  rueckkehr: string;
  buttonLabel: string;
  nichtsFaellig: boolean;
  vorgaben: ZahlungsDaten["vorgaben"];
}) {
  const ergebnis = useCheckoutElements();
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  /**
   * Wartet der Zahlungsbereich zu lange? Begründung und Text stehen
   * unten am Ladehinweis.
   *
   * FÜNFZEHN SEKUNDEN, kürzer als die zwanzig der Exposé-Vorschau:
   * Hier wird keine grosse Datei geholt, nur Stripes Skript und eine
   * Sitzung. Wer in der Kasse steht, wartet zudem anders als jemand,
   * der ein PDF ansieht.
   */
  const [zuLange, setZuLange] = useState(false);
  const laedt = ergebnis.type === "loading";
  useEffect(() => {
    if (!laedt) {
      setZuLange(false);
      return;
    }
    const uhr = window.setTimeout(() => setZuLange(true), ZAHLUNG_ZEITGRENZE_MS);
    return () => window.clearTimeout(uhr);
  }, [laedt]);

  /* KEINE DOPPELTE EINGABE an der empfindlichsten Stelle: Name und
     Rechnungsanschrift stehen bereits im Bestellformular. Sie werden
     hier einmalig an die Checkout-Sitzung uebergeben (fuer das
     Lastschrift-Mandat), und das Element blendet die eigenen
     Adressfelder aus (fields unten). Schlaegt die Uebergabe fehl,
     verlangt Stripe die Angaben beim Bestaetigen und der Kunde sieht
     eine ehrliche Meldung statt einer stillen Sackgasse. */
  const checkout = ergebnis.type === "success" ? ergebnis.checkout : null;
  const vorbelegt = useRef(false);
  useEffect(() => {
    if (!checkout || vorbelegt.current) return;
    vorbelegt.current = true;
    void checkout
      .updateBillingAddress({
        name: vorgaben.name,
        address: {
          country: "DE",
          line1: vorgaben.strasse,
          postal_code: vorgaben.plz,
          city: vorgaben.stadt,
        },
      })
      /* wirkung: gewollt still, dies belegt nur das Adressfeld von
         Stripe vor. Faellt es aus, tippt der Kunde die Adresse dort
         selbst ein, und Stripe pruegt sie ohnehin. Der Bezahlvorgang
         haengt nicht daran. */
      // wirkung: gewollt still, der Grund steht im Kommentar darueber
      .catch(() => null);
  }, [checkout, vorgaben]);

  if (ergebnis.type === "loading") {
    /* ============================================================
       DER LADEHINWEIS HAT EINE ZEITGRENZE (Auflage des Inhabers,
       30.08.2026).
       ============================================================
       "Ein Ladehinweis ohne Zeitgrenze ist dasselbe wie ein leeres
       Blatt, nur höflicher." Hier wiegt das schwerer als anderswo:
       Wer in der Kasse wartet, denkt irgendwann, seine Zahlung sei
       unterwegs, und niemand sagt ihm etwas.

       DASS DER ZUSTAND VON STRIPE KOMMT UND NICHT VON UNS, ÄNDERT
       NICHTS. Der Kunde sieht unsere Seite.

       DREI DINGE MUSS DIE MELDUNG LEISTEN, in dieser Reihenfolge:
       1. sagen, dass es nicht geklappt hat
       2. die Angst nehmen: es wurde nichts abgebucht und nichts
          bestellt. Das ist der Satz, auf den es ankommt.
       3. einen Ausweg geben, und zwar einen, der wirklich etwas tut:
          neu laden, und wenn das auch nicht hilft, ein Mensch. */
    if (!zuLange) {
      return (
        <div className="rounded-2xl border border-line/70 bg-paper p-5 text-[0.9rem] text-ink-muted">
          Der Zahlungsbereich wird geladen.
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-accent-deep/40 bg-accent/5 p-5 text-[0.9rem] leading-relaxed text-ink">
        <p>
          Der Zahlungsbereich lädt gerade nicht.{" "}
          <span className="font-semibold">
            Es wurde nichts abgebucht und keine Bestellung ausgelöst.
          </span>
        </p>
        <div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-medium text-background transition-colors hover:bg-primary-dark"
          >
            Seite neu laden
          </button>
        </div>
        <p className="text-[0.85rem] text-ink-muted">
          Klappt es dann wieder nicht, schreiben Sie an{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="font-medium text-primary hover:text-primary-dark"
          >
            {siteConfig.contact.email}
          </a>{" "}
          oder rufen Sie {siteConfig.contact.phone} an. Wir schalten die
          Leistung dann von Hand frei.
        </p>
      </div>
    );
  }
  if (ergebnis.type === "error") {
    return (
      <div className="rounded-2xl border border-accent-deep/40 bg-accent/5 p-5 text-[0.9rem] text-ink">
        Der Zahlungsbereich ließ sich nicht laden: {ergebnis.error.message}
      </div>
    );
  }

  const bezahlen = async () => {
    if (sendet || !checkout) return;
    setSendet(true);
    setFehler(null);
    /* KEIN returnUrl hier: Die Session traegt die Rueckkehr-Adresse
       bereits (aus der konfigurierten Basis, /api/checkout), und
       Stripe lehnt eine zweite Quelle ab (belegt 13.08.2026).
       Weiterleitungs-Zahlarten nutzen die Session-Adresse; ohne
       Weiterleitung geht es hier direkt zur Danke-Seite. */
    const bestaetigt = await checkout.confirm();
    if (bestaetigt.type === "error") {
      setFehler(bestaetigt.error.message);
      setSendet(false);
      return;
    }
    window.location.assign(`${rueckkehr}?session_id=${encodeURIComponent(checkout.id)}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line/70 bg-paper p-4 sm:p-5">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["sepa_debit", "card", "paypal", "link"],
            /* Name und Anschrift kommen aus dem Bestellformular (siehe
               updateBillingAddress oben), niemand tippt sie doppelt */
            fields: { billingDetails: { name: "never", address: "never" } },
          }}
        />
      </div>
      {/* EINE KANTE FUER BEIDE ABSAETZE (Beanstandung des Inhabers,
          20.08.2026: "Der Text unter Zahlungsart fluchtet nicht").
          Vorher war der erste Absatz eine Flex-Zeile mit dem Zeichen,
          der zweite ein gewoehnlicher Absatz daneben. Der erste Text
          stand dadurch um Zeichenbreite und Abstand eingerueckt, der
          zweite bündig links, und die beiden begannen sichtbar an
          verschiedenen Stellen. Jetzt steht das Zeichen einmal links,
          und beide Absaetze bilden die Textspalte daneben. */}
      <div className="flex items-start gap-2 text-[0.8rem] leading-relaxed text-ink-muted">
        <Timer size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-2">
          <p>
            Bei Zahlung per Lastschrift bestätigt Ihre Bank die Abbuchung erst
            nach einigen Tagen. Ihre Bestellung gilt sofort, und wir schalten
            Ihre Leistungen frei, sobald die Zahlung bestätigt ist; Sie müssen
            nichts weiter tun.
          </p>
          {nichtsFaellig ? (
            <p>
              Heute wird nichts abgebucht. Ihre Zahlungsart wird nur hinterlegt;
              die monatliche Abbuchung beginnt erst, wenn Ihnen Ihr persönlicher
              Ansprechpartner zugewiesen ist.
            </p>
          ) : null}
        </div>
      </div>
      {fehler ? (
        <p className="rounded-xl bg-accent/10 px-4 py-3 text-[0.85rem] text-accent-deep">
          {fehler}
        </p>
      ) : null}
      <button
        type="button"
        onClick={bezahlen}
        disabled={sendet}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {sendet ? "Zahlung läuft" : buttonLabel}
      </button>
    </div>
  );
}

export type ZahlungsDaten = {
  clientSecret: string;
  bestellungId: string;
  testbetrieb: boolean;
  rueckkehr: string;
  /**
   * Vorbelegung fuer das Payment Element aus dem Bestellformular:
   * Niemand tippt Name und Rechnungsanschrift zweimal, nur weil eine
   * Zahlart (Lastschrift) sie fuer das Mandat braucht.
   *
   * HIER STEHEN GENAU DIE FELDER, DIE UNTEN AUCH GELESEN WERDEN, und
   * das ist eine Regel und keine Momentaufnahme. E-Mail-Adresse und
   * Telefonnummer standen bis zum 16.08.2026 hier, ohne dass sie
   * irgendwo hingingen, und JEDE von beiden hat einmal die gesamte
   * Kasse blockiert: Stripe weist eine Vorgabe zurueck, die zu der
   * gewaehlten Zahlart nicht passt, und dann laesst sich nicht mehr
   * bezahlen. Wer hier ein Feld ergaenzt, ohne es an
   * updateBillingAddress zu uebergeben, baut denselben Fehler zum
   * dritten Mal.
   *
   * Die E-Mail-Adresse braucht das Element nicht: Sie haengt bereits
   * an der Checkout-Sitzung, die der Server anlegt.
   */
  vorgaben: {
    name: string;
    strasse: string;
    plz: string;
    stadt: string;
  };
};

export default function PaymentSection({
  zahlung,
  nichtsFaellig,
}: {
  /** null, solange die Angaben noch nicht bestaetigt sind */
  zahlung: ZahlungsDaten | null;
  /** Korb enthaelt nur die Makler-Begleitung: heute 0 Euro */
  nichtsFaellig: boolean;
}) {
  if (!stripeBereit) {
    return (
      <div className="flex items-start gap-3.5 rounded-2xl border border-line/70 bg-surface px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-primary">
          <CreditCard size={19} strokeWidth={1.7} />
        </span>
        <p className="text-[0.9rem] leading-relaxed text-ink-muted">
          Die Online-Zahlung wird in Kürze freigeschaltet. Bis dahin erhalten
          Sie die Zahlungsinformationen mit Ihrer Auftragsbestätigung.
        </p>
      </div>
    );
  }

  if (!zahlung) {
    return (
      <div className="flex items-start gap-3.5 rounded-2xl border border-line/70 bg-surface px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-primary">
          <CreditCard size={19} strokeWidth={1.7} />
        </span>
        <p className="text-[0.9rem] leading-relaxed text-ink-muted">
          Sie zahlen sicher per Lastschrift, Karte, PayPal oder Link, ohne
          diese Seite zu verlassen. Prüfen Sie zuerst Ihre Angaben und
          klicken Sie unten auf „Weiter zur Zahlung“.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {zahlung.testbetrieb ? (
        <p className="flex items-center gap-2 rounded-xl border border-line/70 bg-surface-tint px-3.5 py-2 text-[0.8rem] font-medium text-ink">
          <FlaskConical size={14} strokeWidth={1.8} className="shrink-0 text-primary" />
          Testbetrieb: Es fließt kein echtes Geld.
        </p>
      ) : null}
      <CheckoutElementsProvider
        stripe={stripeJs()}
        options={{
          clientSecret: zahlung.clientSecret,
          elementsOptions: { appearance: AUSSEHEN },
          /* GAR KEINE VORGABEN AN DIESER STELLE, und das ist der Kern
             einer teuren Geschichte.

             Am 13.08.2026 stand hier eine email-Vorgabe. Sie wurde
             gestrichen, weil Stripe eine zweite Quelle neben dem
             Kunden der Session mit einem Fehler abweist, und der
             Grund wurde hier aufgeschrieben. Die Telefonnummer eine
             Zeile darunter blieb stehen und hatte GENAU DIESELBE
             Bauart.

             Was das kostete, wurde am 15.08.2026 auf der ausgerollten
             Seite gemessen: Wer das Feld "Telefon, optional"
             ausfuellte, bekam statt eines Zahlungsbereichs den Satz
             "Der Zahlungsbereich liess sich nicht laden: You cannot
             update the phone number unless phone_number_collection.
             enabled is set to `true`." Kein Kartenfeld, kein
             Lastschriftfeld, keine Zahlung. Ein englischer Rohtext
             von Stripe als letztes, was ein Kunde von uns liest.
             Blieb das Feld leer, lief alles.

             Die Nummer ist hier nicht verloren: Sie haengt am
             Stripe-Kunden der Session (app/api/checkout/route.ts) und
             steht in unserer Bestellung. Sie ein zweites Mal
             vorzugeben gewinnt nichts.

             Name und Anschrift laufen weiter ueber
             updateBillingAddress im Zahlungsformular;
             defaultValues.billingAddress hat die Felder
             nachweislich nicht vorbelegt.

             WER HIER ETWAS ERGAENZT, prueft es mit ausgefuelltem
             Formular auf der ausgerollten Seite. Diese Klasse Fehler
             faellt oertlich nicht auf. */
        }}
      >
        <Zahlungsformular
          rueckkehr={zahlung.rueckkehr}
          buttonLabel="Kostenpflichtig bestellen"
          nichtsFaellig={nichtsFaellig}
          vorgaben={zahlung.vorgaben}
        />
      </CheckoutElementsProvider>
    </div>
  );
}
