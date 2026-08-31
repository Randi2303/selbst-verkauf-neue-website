"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, Mail, XCircle } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearCart } from "@/lib/cart-store";
import { navPrefetch } from "@/lib/passwortschutz";

/**
 * Inhalt der Danke-Seite: fragt den Stand der Bestellung ab, bis der
 * Webhook verarbeitet hat (oder ehrlich sagt, dass es noch dauert).
 *
 * VIER ZUSTAENDE:
 * - bezahlt: Zahlung bestaetigt, Konto und Mail sind unterwegs.
 * - zahlung_offen: Lastschrift schwebt; alles Weitere kommt mit dem
 *   Zahlungseingang (zweite von drei Stellen, die das erklaeren).
 * - wartet: Die Rueckmeldung von Stripe ist noch unterwegs. Nach einer
 *   Minute hoert das Nachfragen auf und die Seite sagt ehrlich, dass
 *   die Bestaetigung per E-Mail kommt.
 * - gescheitert: Zahlung fehlgeschlagen, freundlich zurueck zur Kasse.
 */
function DankeStand() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [stand, setStand] = useState<{
    session?: string;
    zahlung?: string;
    bestellung?: string | null;
    kontoBestand?: boolean | null;
  } | null>(null);
  const [aufgegeben, setAufgegeben] = useState(false);
  const korbGeleert = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    let aktiv = true;
    let versuche = 0;
    const abfragen = async () => {
      versuche += 1;
      try {
        const antwort = await fetch(
          `/api/checkout/status?session=${encodeURIComponent(sessionId)}`
        );
        if (antwort.ok) {
          const daten = await antwort.json();
          if (!aktiv) return;
          setStand(daten);
          const fertig =
            daten.bestellung === "bezahlt" ||
            daten.bestellung === "zahlung_offen" ||
            daten.bestellung === "fehlgeschlagen" ||
            daten.session === "expired";
          if (fertig) return;
        }
      } catch {
        // wirkung: gewollt Diese Schleife fragt bis zu 20 Mal nach; ein einzelner Fehlversuch ist ihr normaler Verlauf, und das Aufgeben meldet setAufgegeben(true) sichtbar.
        // kurz warten und erneut fragen
      }
      if (versuche >= 20) {
        if (aktiv) setAufgegeben(true);
        return;
      }
      window.setTimeout(abfragen, 3000);
    };
    void abfragen();
    return () => {
      aktiv = false;
    };
  }, [sessionId]);

  /* Der Korb ist verbraucht, sobald die Zahlung durch oder unterwegs
     ist; beim Zurueckkehren soll niemand denselben Korb noch einmal
     bezahlen koennen. */
  const erfolgreich =
    stand?.bestellung === "bezahlt" ||
    stand?.bestellung === "zahlung_offen" ||
    stand?.zahlung === "paid" ||
    (stand?.session === "complete" && stand?.zahlung !== "unpaid");
  const schwebt =
    stand?.bestellung === "zahlung_offen" ||
    (stand?.session === "complete" && stand?.zahlung === "unpaid" && stand?.bestellung !== "fehlgeschlagen");
  useEffect(() => {
    if ((erfolgreich || schwebt) && !korbGeleert.current) {
      korbGeleert.current = true;
      clearCart();
    }
  }, [erfolgreich, schwebt]);

  const karte = (inhalt: React.ReactNode) => (
    <div className="mx-auto max-w-xl rounded-4xl border border-line/70 bg-paper p-8 text-center shadow-card sm:p-12">
      {inhalt}
    </div>
  );

  if (!sessionId) {
    return karte(
      <>
        <h1 className="font-heading text-h3 text-ink">Hier fehlt eine Bestellung</h1>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Diese Seite gehört ans Ende des Bezahlvorgangs. Ihre Zusammenstellung
          finden Sie im Wunsch-Paket.
        </p>
        <Link prefetch={navPrefetch} href="/wunsch-paket" className="btn-primary mt-8 inline-flex">
          Zum Wunsch-Paket
        </Link>
      </>
    );
  }

  if (stand?.bestellung === "fehlgeschlagen") {
    return karte(
      <>
        <XCircle size={40} strokeWidth={1.5} className="mx-auto text-accent-deep" />
        <h1 className="mt-5 font-heading text-h3 text-ink">Die Zahlung hat nicht geklappt</h1>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Ihre Bank hat die Zahlung nicht bestätigt. Das kann an einer
          abgelaufenen Karte oder einer Ablehnung der Bank liegen; es wurde
          nichts abgebucht. Versuchen Sie es gern mit einer anderen
          Zahlungsart.
        </p>
        <Link prefetch={navPrefetch} href="/kasse" className="btn-primary mt-8 inline-flex">
          Zurück zur Kasse
        </Link>
      </>
    );
  }

  if (schwebt && stand?.bestellung === "zahlung_offen") {
    return karte(
      <>
        <Clock3 size={40} strokeWidth={1.5} className="mx-auto text-primary" />
        <h1 className="mt-5 font-heading text-h3 text-ink">
          Vielen Dank, Ihre Bestellung ist eingegangen
        </h1>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Ihre Bank bestätigt die Abbuchung noch; bei Lastschrift dauert das
          üblicherweise wenige Tage. Sie müssen nichts weiter tun: Ihre
          Bestellbestätigung ist per E-Mail unterwegs, und wir schalten Ihre
          Leistungen frei, sobald die Zahlung bestätigt ist.
        </p>
        {/* ZEICHEN UND TEXT ALS EINE EINHEIT.
            Vorher stand hier ein Flex-Kasten mit justify-center. Sobald
            der Satz zweizeilig wurde, war der Text ein eigener
            Flex-Posten ueber die Restbreite, seine Zeilen wurden darin
            noch einmal zentriert, und das Briefsymbol blieb weit links
            allein stehen. Jetzt fliesst das Zeichen als Teil der ersten
            Zeile mit: Es kann gar nicht mehr wegrutschen, und die
            Zentrierung stimmt Zeile fuer Zeile.
            Zwischen Zeichen und erstem Wort steht bewusst KEIN
            Leerzeichen, der Abstand kommt aus mr-1.5. Damit gibt es
            dort auch keine Umbruchstelle. */}
        <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-muted">
          <Mail
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
            className="mr-1.5 inline-block shrink-0 align-[-0.15em] text-primary"
          />
          {stand?.kontoBestand
            ? "Die Bestellung liegt in Ihrem bestehenden Konto."
            : "In der E-Mail finden Sie auch den Link, mit dem Sie Ihr Passwort setzen."}
        </p>
        <Link prefetch={navPrefetch} href="/login" className="btn-primary mt-8 inline-flex">
          Zur Anmeldung
        </Link>
      </>
    );
  }

  if (stand?.bestellung === "bezahlt") {
    return karte(
      <>
        <CheckCircle2 size={40} strokeWidth={1.5} className="mx-auto text-success" />
        <h1 className="mt-5 font-heading text-h3 text-ink">
          Vielen Dank, Ihre Zahlung ist bestätigt
        </h1>
        <p className="mt-3 leading-relaxed text-ink-muted">
          {stand?.kontoBestand
            ? "Ihre Bestellung liegt in Ihrem bestehenden Konto; dort finden Sie die neuen Leistungen und Ihre Rechnung. Die Bestellbestätigung ist per E-Mail unterwegs."
            : "Ihr Konto ist angelegt. Ihre Bestellbestätigung ist per E-Mail unterwegs; darin setzen Sie mit einem Klick Ihr Passwort und starten in Ihrem Bereich."}
        </p>
        <Link prefetch={navPrefetch} href="/login" className="btn-primary mt-8 inline-flex">
          Zur Anmeldung
        </Link>
      </>
    );
  }

  if (aufgegeben) {
    return karte(
      <>
        <Mail size={40} strokeWidth={1.5} className="mx-auto text-primary" />
        <h1 className="mt-5 font-heading text-h3 text-ink">Die Bestätigung dauert gerade etwas</h1>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Ihre Zahlung ist bei unserem Zahlungsdienstleister angekommen, die
          Rückmeldung an uns braucht gerade länger als gewohnt. Sie müssen
          nichts weiter tun: Ihre Bestellbestätigung kommt per E-Mail, sobald
          alles bestätigt ist.
        </p>
      </>
    );
  }

  return karte(
    <>
      <span
        aria-hidden="true"
        className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-line border-t-primary"
      />
      <h1 className="mt-5 font-heading text-h3 text-ink">Ihre Zahlung wird bestätigt</h1>
      <p className="mt-3 leading-relaxed text-ink-muted">
        Einen Moment bitte, wir warten auf die Bestätigung des
        Zahlungsdienstleisters. Diese Seite aktualisiert sich von selbst.
      </p>
    </>
  );
}

export default function DankeInhalt() {
  return (
    <Suspense fallback={null}>
      <DankeStand />
    </Suspense>
  );
}
