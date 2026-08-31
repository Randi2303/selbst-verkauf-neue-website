"use client";

import Link from "next/link";
import { m, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Mail, Package, PenLine } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import PaymentSection, { type ZahlungsDaten } from "@/components/kasse/PaymentSection";
import { getService } from "@/lib/cart-rules";
import { setInstantPayment, useInstantPayment, type CartItem } from "@/lib/cart-store";
import {
  BESTELL_BUTTON_LABEL,
  stripeBereit,
  submitOrder,
  kontaktName,
  type ContactData,
} from "@/lib/checkout";
import { nameTrennen } from "@/lib/name";
import { findePaketVergleich } from "@/lib/paket-vergleich";
import { navPrefetch } from "@/lib/passwortschutz";
import {
  cartLineLabel,
  cartLinePrice,
  cartMengeLabel,
  cartTotals,
  formatEuroBetrag,
  instantDiscountAmount,
  instantDiscountPercentLabel,
  isMonthlyItem,
  paketEigeneMonatsposten,
} from "@/lib/preise";
import { useLeistungsAuswahl } from "@/lib/use-leistungs-auswahl";
import { cn } from "@/lib/utils";
import { siteConfig, type ServiceCategoryId } from "@/site.config";
import {
  ANFRAGEN_EINMALKAUF_HINWEIS,
  KUENDIGUNG_BLEIBT_HINWEIS,
  LAUFZEIT_KURZFASSUNGEN,
  MAKLER_BEGLEITUNG_HINWEIS,
  MINDESTLAUFZEIT_HINWEIS,
  SCHALTUNG_HINWEIS,
  SCHALTUNG_MONATLICH_HINWEIS,
  WIDERRUF_KURZHINWEIS,
  WIDERRUF_ZUSTIMMUNG_TEXT,
} from "@/config/vertragstexte";

/** Betrag mit weicher Zähl-Animation, wie in der Konfigurator-Summe */
function AnimierteSumme({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 170, damping: 26 });
  const text = useTransform(spring, (v) => formatEuroBetrag(Math.round(v)));
  useEffect(() => {
    if (reduced) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, reduced, spring]);
  return <m.span className={cn("tabular-nums", className)}>{text}</m.span>;
}

/** Felder des Kassen-Formulars, Rechnungsadresse nur bei Abweichung */
type FormFelder = {
  vorname: string;
  nachname: string;
  email: string;
  phone: string;
  objektStrasse: string;
  objektPlz: string;
  objektStadt: string;
  rechnungStrasse: string;
  rechnungPlz: string;
  rechnungStadt: string;
};

const LEERES_FORMULAR: FormFelder = {
  vorname: "",
  nachname: "",
  email: "",
  phone: "",
  objektStrasse: "",
  objektPlz: "",
  objektStadt: "",
  rechnungStrasse: "",
  rechnungPlz: "",
  rechnungStadt: "",
};

/** localStorage ändert sich hier nur durch andere Seiten, kein Abo nötig */
const abonniereNichts = () => () => {};

/**
 * Die Kasse: verbindliche Bestellübersicht (Paket-Basis, Zusatzposten,
 * getrennte Summen), klare Blöcke für Kontakt, Immobilie,
 * Rechnungsadresse und Zahlung, dazu Validierung mit freundlichen
 * Hinweisen.
 *
 * Heute endet der Abschluss in der Bestellung per E-Mail, die
 * Auftragsbestätigung mit den Zahlungsinformationen folgt per E-Mail.
 * Die Route /api/checkout und der Zahlungsbereich (PaymentSection) sind
 * vollständig auf Stripe vorbereitet: Sobald die Schlüssel hinterlegt
 * sind, lädt dieselbe Seite das Payment Element und der Button wechselt
 * auf "Kostenpflichtig bestellen" (BESTELL_BUTTON_LABEL in
 * lib/checkout.ts).
 */
export default function Kasse() {
  const { cart, paketPosten, paketConfig } = useLeistungsAuswahl();
  const instantPayment = useInstantPayment();
  const [sendet, setSendet] = useState(false);
  const [done, setDone] = useState(false);
  /* Stripe-Phase zwei: Nach "Weiter zur Zahlung" liegt die
     Checkout-Session vor und das Payment Element erscheint. Aendert
     sich der Korb oder die Sofortzahlung, faellt die Kasse in Phase
     eins zurueck und rechnet neu; eine Session zu einem alten Korb
     darf nie bezahlbar bleiben. */
  const [zahlungRoh, setZahlung] = useState<ZahlungsDaten | null>(null);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  /* Gutschein: Der Browser haelt nur den TEXT des Codes und das, was
     der Server zuletzt dazu gesagt hat. Geprueft und gerechnet wird
     ausschliesslich serverseitig (/api/gutschein, lib/bestellung.ts);
     verbindlich reserviert erst /api/checkout. */
  const [gutscheinOffen, setGutscheinOffen] = useState(false);
  const [gutscheinCode, setGutscheinCode] = useState("");
  const [gutschein, setGutschein] = useState<{ code: string; betrag: number } | null>(null);
  const [gutscheinMeldung, setGutscheinMeldung] = useState<string | null>(null);
  const [gutscheinPrueft, setGutscheinPrueft] = useState(false);
  const korbStand = JSON.stringify([
    cart.map((i) => [i.key, i.quantity, i.paymentMode ?? null, i.abgewaehlt ?? null]),
    instantPayment,
    gutschein?.code ?? null,
  ]);
  const [zahlungKorbStand, setZahlungKorbStand] = useState<string | null>(null);
  /* Abgeleitet statt per Effekt zurueckgesetzt: Eine vorbereitete
     Zahlung gilt nur fuer exakt den Korb-Stand, zu dem sie gerechnet
     wurde. Aendert sich der Korb, faellt die Kasse von selbst in
     Phase eins zurueck. */
  const zahlung = zahlungRoh && zahlungKorbStand === korbStand ? zahlungRoh : null;
  /* Die letzte angelegte Bestellung, auch nach einem Rueckfall in
     Phase eins: Der Server raeumt sie beim naechsten Anlauf auf,
     statt offene Geister-Bestellungen zu hinterlassen. */
  const [letzteBestellungId, setLetzteBestellungId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFelder>(LEERES_FORMULAR);
  const [rechnungWieObjekt, setRechnungWieObjekt] = useState(true);
  /* Was im Konto steht, so wie es beim Laden der Seite dort stand.
     Nur zum Vergleichen: Weicht die Eingabe hier davon ab, sagt die
     Seite es, statt still das eine oder das andere zu gewinnen. */
  const [profilStand, setProfilStand] = useState<{
    name: string;
    strasse: string;
    plz: string;
    ort: string;
  } | null>(null);

  /*
   * Eine Datenquelle mit dem Konto (Punkt D6): Ist der Kunde
   * angemeldet, werden Name, E-Mail, Telefon und die Rechnungsadresse
   * aus dem Profil vorbelegt; nur leere Felder werden gefuellt, eigene
   * Eingaben gewinnen immer. Nach der Bestellung wandern die Angaben
   * zurueck ins Profil, sofern es dort noch leer ist.
   */
  useEffect(() => {
    fetch("/api/kasse/profil")
      .then((antwort) => (antwort.ok ? antwort.json() : null))
      .then(
        (profil: {
          angemeldet?: boolean;
          email?: string;
          vorname?: string;
          nachname?: string;
          name?: string;
          telefon?: string;
          strasse?: string;
          plz?: string;
          ort?: string;
        } | null) => {
          if (!profil?.angemeldet) return;
          setProfilStand({
            name: profil.name ?? "",
            strasse: profil.strasse ?? "",
            plz: profil.plz ?? "",
            ort: profil.ort ?? "",
          });
          /* Seit Migration 0035 fuehrt das Profil beide Teile selbst.
             Die Trennung am letzten Leerzeichen bleibt nur als
             Rueckfallebene fuer Profile, die noch aus der Zeit davor
             stammen; sie raet, deshalb steht das Ergebnis im Formular
             und nie ungefragt in der Datenbank. */
          const [geratenVorname, geratenNachname] = nameTrennen(profil.name ?? "");
          const vorschlagVorname = profil.vorname || geratenVorname;
          const vorschlagNachname = profil.nachname || geratenNachname;
          setForm((f) => ({
            ...f,
            vorname: f.vorname || vorschlagVorname,
            nachname: f.nachname || vorschlagNachname,
            email: f.email || (profil.email ?? ""),
            phone: f.phone || (profil.telefon ?? ""),
            rechnungStrasse: f.rechnungStrasse || (profil.strasse ?? ""),
            rechnungPlz: f.rechnungPlz || (profil.plz ?? ""),
            rechnungStadt: f.rechnungStadt || (profil.ort ?? ""),
          }));
        }
      )
      /* wirkung: gewollt still, dies ist eine reine VORBELEGUNG der
         Rechnungsfelder aus dem Profil. Faellt sie aus, stehen die
         Felder leer da, und der Kunde fuellt sie aus, wie er es ohne
         Konto ohnehin taete. Eine Meldung an dieser Stelle hielte ihn
         vor einer Kasse auf, in der nichts fehlt. */
      // wirkung: gewollt still, der Grund steht im Kommentar darueber
      .catch(() => null);
  }, []);
  const [fehler, setFehler] = useState<Partial<Record<keyof FormFelder, string>>>({});

  /*
   * Objektart: vorbefüllt aus dem Konfigurator (dort zuletzt gewählt,
   * hydrationssicher über useSyncExternalStore gelesen), eine Auswahl
   * hier auf der Kasse gewinnt.
   */
  const gespeicherteObjektart = useSyncExternalStore(
    abonniereNichts,
    () => window.localStorage.getItem("sv-objektart"),
    () => null
  );
  const [gewaehlteObjektart, setGewaehlteObjektart] = useState<ServiceCategoryId | null>(null);
  const category =
    gewaehlteObjektart ??
    (gespeicherteObjektart &&
    siteConfig.serviceCategories.some((c) => c.id === gespeicherteObjektart)
      ? (gespeicherteObjektart as ServiceCategoryId)
      : "haus");

  const totals = cartTotals(cart);
  const zusatzEinmalig = cart.filter((i) => i.type === "leistung" && !isMonthlyItem(i));
  const zusatzMonatlich = cart.filter((i) => i.type === "leistung" && isMonthlyItem(i));
  const rabatt = instantPayment && totals.hatEinmalig ? instantDiscountAmount(totals.einmalig) : 0;
  /* Der Gutschein-Betrag kommt IMMER vom Server (/api/gutschein bzw.
     /api/checkout); der Browser rechnet ihn nie selbst. */
  const nachlassGesamt = rabatt + (gutschein?.betrag ?? 0);
  /* Enthaelt der Korb nur die Makler-Begleitung, wird heute nichts
     faellig: Sie beginnt erst mit der Zuweisung des Ansprechpartners,
     das Payment Element speichert dann nur die Zahlungsart. */
  const nichtsFaellig =
    !totals.hatEinmalig &&
    !cart.some(
      (i) =>
        (i.type === "paket" && i.paymentMode !== "once") ||
        (i.type === "leistung" && isMonthlyItem(i) && i.id !== "ansprechpartner")
    );

  /* Welche Laufzeit-Saetze gehoeren zu DIESER Bestellung? Nur die
     zutreffenden, nie alle auf Vorrat. Quelle der Regeln:
     lib/laufzeit.ts, Wortlaut in config/vertragstexte.ts. */
  const abgewaehltImPaket = new Set(paketPosten?.abgewaehlt ?? []);
  const enthalteneIds = new Set<string>([
    ...cart.filter((i) => i.type === "leistung").map((i) => i.id),
    ...(paketConfig?.includedServiceIds ?? [])
      .map((e) => e.id)
      .filter((id) => !abgewaehltImPaket.has(id)),
  ]);
  const laufzeitSaetze: string[] = [];
  if (paketPosten && paketPosten.paymentMode !== "once") {
    laufzeitSaetze.push(MINDESTLAUFZEIT_HINWEIS);
  }
  if (enthalteneIds.has("ansprechpartner")) {
    laufzeitSaetze.push(MAKLER_BEGLEITUNG_HINWEIS);
  }
  /* Die Schaltung sagt ihre Laufzeit NACH ZAHLWEISE (30.08.2026).
     Ohne Paket kann sie nur einmalig gekauft werden, dann gelten die
     sechs Monate. Steckt sie in einem monatlichen Paket, laeuft sie
     mit dem Paket und endet erst mit der Kuendigung. */
  if (enthalteneIds.has("portal-schaltung")) {
    laufzeitSaetze.push(
      paketPosten && paketPosten.paymentMode !== "once"
        ? SCHALTUNG_MONATLICH_HINWEIS
        : SCHALTUNG_HINWEIS
    );
  }
  /* Einmalkauf eines Pakets mit Anfragenmanagement: Umfang beziffern
     (10.08.2026), gleiche Dauer wie die Portalschaltung */
  if (
    paketPosten?.paymentMode === "once" &&
    enthalteneIds.has("ki-anfragenmanagement")
  ) {
    laufzeitSaetze.push(ANFRAGEN_EINMALKAUF_HINWEIS);
  }
  if (laufzeitSaetze.length > 0) {
    laufzeitSaetze.push(KUENDIGUNG_BLEIBT_HINWEIS);
  }

  /* Zustimmung zum sofortigen Beginn (Widerruf): Pflicht vor dem
     Abschluss. Der Wortlaut ist eine anwaltlich zu pruefende
     Arbeitsfassung, die STELLE ist verbindlich. */
  const [widerrufZugestimmt, setWiderrufZugestimmt] = useState(false);
  const [widerrufFehlt, setWiderrufFehlt] = useState(false);
  const rabattBezug =
    paketPosten && paketPosten.paymentMode === "once"
      ? "auf den Paketpreis und alle einmaligen Leistungen"
      : paketPosten
        ? "auf die einmaligen Zusatzleistungen"
        : "auf alle Einmalkosten";

  /** Den Code serverseitig pruefen; still = Neupruefung nach Korb-Aenderung */
  const gutscheinPruefen = async (code: string, still = false) => {
    if (!code.trim() || gutscheinPrueft) return;
    setGutscheinPrueft(true);
    if (!still) setGutscheinMeldung(null);
    try {
      const antwort = await fetch("/api/gutschein", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: cart,
          email: form.email.trim() || undefined,
          instantPayment,
        }),
      });
      const daten = (await antwort.json().catch(() => null)) as {
        gueltig?: boolean;
        code?: string;
        betrag?: number;
        meldung?: string;
      } | null;
      if (daten?.gueltig && daten.code) {
        setGutschein({ code: daten.code, betrag: daten.betrag ?? 0 });
        setGutscheinMeldung(null);
      } else {
        setGutschein(null);
        /* Auch nach einer stillen Neupruefung sichtbar begruenden,
           warum der Code herausgefallen ist */
        setGutscheinOffen(true);
        setGutscheinMeldung(daten?.meldung ?? "Das ließ sich gerade nicht prüfen.");
      }
    } catch {
      if (!still) {
        setGutscheinMeldung("Das ließ sich gerade nicht prüfen. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setGutscheinPrueft(false);
    }
  };

  const gutscheinEntfernen = () => {
    setGutschein(null);
    setGutscheinCode("");
    setGutscheinMeldung(null);
  };

  /* Aendert sich der Korb oder die Sofortzahlung, waehrend ein Code
     angewandt ist, rechnet der Server den Nachlass neu; ein Prozent-
     Code aendert seinen Betrag, ein beschraenkter Code kann
     herausfallen und sagt dann warum. */
  const gepruefterStand = useRef<string | null>(null);
  useEffect(() => {
    if (!gutschein) return;
    if (gepruefterStand.current === korbStand) return;
    gepruefterStand.current = korbStand;
    void gutscheinPruefen(gutschein.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [korbStand, gutschein]);

  /** Pflichtfelder prüfen, Ergebnis sind freundliche Hinweise je Feld */
  const pruefeFelder = (): Partial<Record<keyof FormFelder, string>> => {
    const neu: Partial<Record<keyof FormFelder, string>> = {};
    if (!form.vorname.trim()) neu.vorname = "Bitte geben Sie Ihren Vornamen an.";
    if (!form.nachname.trim()) neu.nachname = "Bitte geben Sie Ihren Nachnamen an.";
    if (!form.email.trim()) {
      neu.email = "Bitte geben Sie Ihre E-Mail-Adresse an.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      neu.email = "Diese E-Mail-Adresse sieht unvollständig aus, bitte prüfen Sie sie kurz.";
    }
    if (!form.objektStrasse.trim()) neu.objektStrasse = "Bitte geben Sie Straße und Hausnummer an.";
    if (!/^\d{5}$/.test(form.objektPlz.trim()))
      neu.objektPlz = "Bitte geben Sie eine gültige Postleitzahl an.";
    if (!form.objektStadt.trim()) neu.objektStadt = "Bitte geben Sie die Stadt an.";
    if (!rechnungWieObjekt) {
      if (!form.rechnungStrasse.trim())
        neu.rechnungStrasse = "Bitte geben Sie Straße und Hausnummer an.";
      if (!/^\d{5}$/.test(form.rechnungPlz.trim()))
        neu.rechnungPlz = "Bitte geben Sie eine gültige Postleitzahl an.";
      if (!form.rechnungStadt.trim()) neu.rechnungStadt = "Bitte geben Sie die Stadt an.";
    }
    return neu;
  };

  const setzeFeld = (feld: keyof FormFelder, wert: string) => {
    setForm((f) => ({ ...f, [feld]: wert }));
    // Hinweis verschwindet, sobald das Feld korrigiert wird
    setFehler((f) => {
      if (!f[feld]) return f;
      const rest = { ...f };
      delete rest[feld];
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendet) return;
    const neueFehler = pruefeFelder();
    setFehler(neueFehler);
    const erstesFehlerfeld = (Object.keys(neueFehler) as Array<keyof FormFelder>)[0];
    if (erstesFehlerfeld) {
      document.getElementById(`feld-${erstesFehlerfeld}`)?.focus();
      return;
    }
    if (!widerrufZugestimmt) {
      setWiderrufFehlt(true);
      document.getElementById("widerruf-zustimmung")?.focus();
      return;
    }
    setSendet(true);
    const categoryLabel =
      siteConfig.serviceCategories.find((c) => c.id === category)?.label ?? category;
    const kontakt: ContactData = {
      vorname: form.vorname.trim(),
      nachname: form.nachname.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      category: categoryLabel,
      objektStrasse: form.objektStrasse.trim(),
      objektPlz: form.objektPlz.trim(),
      objektStadt: form.objektStadt.trim(),
      rechnungWieObjekt,
      ...(rechnungWieObjekt
        ? {}
        : {
            rechnungStrasse: form.rechnungStrasse.trim(),
            rechnungPlz: form.rechnungPlz.trim(),
            rechnungStadt: form.rechnungStadt.trim(),
          }),
    };
    // Kontext für unser Team: Einzelauswahl trotz günstigerem Paket
    const vergleich = paketPosten ? null : findePaketVergleich(cart);
    const zusatzHinweise = vergleich
      ? [
          `Hinweis an uns: Kunde hat Einzelauswahl trotz günstigerem Paket ${vergleich.paket.name} gewählt`,
        ]
      : [];
    /* Die Zustimmung gehoert dokumentiert zur Bestellung, sonst laesst
       sich spaeter nicht belegen, dass sie erteilt war. */
    zusatzHinweise.push(
      "Zustimmung zum sofortigen Beginn der Ausführung: erteilt, Widerrufshinweis wurde angezeigt."
    );
    if (stripeBereit) {
      /* Stripe-Weg, Phase eins: Bestellung serverseitig rechnen und
         die Checkout-Session holen; danach erscheint das Payment
         Element und der eigentliche Bezahl-Knopf. Beim Fallback
         (Anbindung nicht bereit) laeuft unten die E-Mail-Bestellung. */
      try {
        const antwort = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart,
            contact: kontakt,
            instantPayment,
            gutscheinCode: gutschein?.code,
            vorherigeBestellungId: letzteBestellungId,
          }),
        });
        const daten = (await antwort.json()) as {
          clientSecret?: string;
          bestellungId?: string;
          testbetrieb?: boolean;
          rueckkehr?: string;
          fallback?: string;
          meldung?: string;
          gutschein?: boolean;
        };
        if (daten.clientSecret && daten.bestellungId && daten.rueckkehr) {
          setLetzteBestellungId(daten.bestellungId);
          setZahlung({
            clientSecret: daten.clientSecret,
            bestellungId: daten.bestellungId,
            testbetrieb: Boolean(daten.testbetrieb),
            rueckkehr: daten.rueckkehr,
            /* NUR NAME UND ANSCHRIFT. E-Mail und Telefon standen hier
               bis zum 16.08.2026 mit, wurden aber nirgends gelesen, und
               jede von beiden hat einmal die Kasse blockiert. Siehe den
               Kommentar an ZahlungsDaten in PaymentSection.tsx. */
            vorgaben: {
              name: kontaktName(kontakt),
              strasse: (rechnungWieObjekt ? kontakt.objektStrasse : kontakt.rechnungStrasse) ?? "",
              plz: (rechnungWieObjekt ? kontakt.objektPlz : kontakt.rechnungPlz) ?? "",
              stadt: (rechnungWieObjekt ? kontakt.objektStadt : kontakt.rechnungStadt) ?? "",
            },
          });
          setZahlungKorbStand(korbStand);
          setServerFehler(null);
          setSendet(false);
          requestAnimationFrame(() =>
            document
              .getElementById("zahlung-bereich")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          );
          return;
        }
        if (!daten.fallback) {
          /* Der Code hat es nicht mehr geschafft (abgelaufen oder die
             letzte Einloesung ging an jemand anderen): Er fliegt aus
             der Rechnung, die Begruendung steht am Feld, und der Kunde
             entscheidet, ob er ohne ihn bestellt. */
          if (daten.gutschein) {
            setGutschein(null);
            setGutscheinOffen(true);
            setGutscheinMeldung(daten.meldung ?? null);
          }
          setServerFehler(
            daten.meldung ?? "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut."
          );
          setSendet(false);
          return;
        }
      } catch {
        setServerFehler(
          "Die Kasse ist gerade nicht erreichbar. Bitte versuchen Sie es gleich erneut."
        );
        setSendet(false);
        return;
      }
    }
    // Angaben ins Profil uebernehmen, sofern dort noch leer (D6);
    // laeuft still im Hintergrund und blockiert die Bestellung nie
    fetch("/api/kasse/profil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vorname: kontakt.vorname,
        nachname: kontakt.nachname,
        telefon: kontakt.phone,
        strasse: rechnungWieObjekt ? kontakt.objektStrasse : form.rechnungStrasse.trim(),
        plz: rechnungWieObjekt ? kontakt.objektPlz : form.rechnungPlz.trim(),
        ort: rechnungWieObjekt ? kontakt.objektStadt : form.rechnungStadt.trim(),
      }),
      /* wirkung: gewollt still, das Speichern der Rechnungsdaten ins
         Profil ist eine Bequemlichkeit fuer den NAECHSTEN Kauf und
         nicht Teil dieser Bestellung. Alle Angaben stecken bereits in
         der Bestellung selbst. Faellt es aus, tippt der Kunde sie beim
         naechsten Mal noch einmal; eine Fehlermeldung mitten in einer
         gelungenen Bezahlung waere schlimmer als das. */
    // wirkung: gewollt still, der Grund steht im Kommentar darueber
    }).catch(() => null);
    submitOrder(cart, kontakt, instantPayment, zusatzHinweise);
    setDone(true);
    setSendet(false);
  };

  /** Einheitliches Textfeld mit Hinweis-Zeile, als Render-Funktion */
  const textFeld = (
    feld: keyof FormFelder,
    label: string,
    eigenschaften: {
      type?: string;
      autoComplete?: string;
      numerisch?: boolean;
      klasse?: string;
    } = {}
  ) => (
    <label className={cn("block", eigenschaften.klasse)}>
      <span className="text-[0.85rem] font-medium">{label}</span>
      <input
        id={`feld-${feld}`}
        type={eigenschaften.type ?? "text"}
        autoComplete={eigenschaften.autoComplete}
        inputMode={eigenschaften.numerisch ? "numeric" : undefined}
        value={form[feld]}
        onChange={(e) => setzeFeld(feld, e.target.value)}
        aria-invalid={Boolean(fehler[feld])}
        aria-describedby={fehler[feld] ? `hinweis-${feld}` : undefined}
        className={cn(
          "mt-1.5 w-full rounded-xl border bg-paper px-4 py-2.5 text-[0.95rem] transition-colors",
          fehler[feld] ? "border-accent-deep/70" : "border-line"
        )}
      />
      {fehler[feld] ? (
        <span id={`hinweis-${feld}`} className="mt-1 block text-[0.8rem] text-accent-deep">
          {fehler[feld]}
        </span>
      ) : null}
    </label>
  );

  if (done) {
    // TODO Stripe: Mit der Anbindung wird dies die Erfolgsseite nach der Zahlung
    return (
      <div className="mx-auto max-w-xl rounded-4xl border border-line/70 bg-paper p-8 text-center shadow-card sm:p-12">
        <CheckCircle2 size={40} strokeWidth={1.5} className="mx-auto text-success" />
        <h2 className="mt-5 font-heading text-h3 text-ink">Vielen Dank für Ihre Bestellung</h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Ihr E-Mail-Programm öffnet sich mit Ihrer Bestellung, bitte senden
          Sie die Nachricht ab. Danach erhalten Sie Ihre Auftragsbestätigung
          mit den Zahlungsinformationen per E-Mail.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link prefetch={navPrefetch} href="/" className="btn-primary">
            Zur Startseite
          </Link>
          <button type="button" onClick={() => setDone(false)} className="btn-secondary">
            Zurück zur Kasse
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-4xl border border-line/70 bg-paper p-8 text-center shadow-card sm:p-12">
        <h2 className="font-heading text-h3 text-ink">Ihr Warenkorb ist leer</h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Stellen Sie sich zuerst Ihr Wunsch-Paket zusammen, danach geht es
          hier weiter.
        </p>
        <Link prefetch={navPrefetch} href="/wunsch-paket" className="btn-primary mt-8 inline-flex">
          Zum Wunsch-Paket
        </Link>
      </div>
    );
  }

  /* Was steht im Konto anders als hier? Nur gefuellte Profilfelder
     zaehlen: Ein leeres Feld wird spaeter ohnehin still gefuellt, und
     darueber muss niemand informiert werden. */
  const rechnungEffektiv = rechnungWieObjekt
    ? { strasse: form.objektStrasse, plz: form.objektPlz, ort: form.objektStadt }
    : { strasse: form.rechnungStrasse, plz: form.rechnungPlz, ort: form.rechnungStadt };
  const gleich = (a: string, b: string) =>
    a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
  const abweichungen: string[] = [];
  if (profilStand) {
    const eingegebenerName = kontaktName({
      vorname: form.vorname,
      nachname: form.nachname,
    });
    if (
      profilStand.name.trim() &&
      eingegebenerName &&
      !gleich(profilStand.name, eingegebenerName)
    ) {
      abweichungen.push(`als Name „${profilStand.name.trim()}“`);
    }
    const profilAdresse = [
      profilStand.strasse.trim(),
      [profilStand.plz.trim(), profilStand.ort.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    const eingegebeneAdresse = [
      rechnungEffektiv.strasse.trim(),
      [rechnungEffektiv.plz.trim(), rechnungEffektiv.ort.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    if (profilAdresse && eingegebeneAdresse && !gleich(profilAdresse, eingegebeneAdresse)) {
      abweichungen.push(`als Rechnungsadresse „${profilAdresse}“`);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr,400px]">
      {/* Kassen-Maske in klaren Blöcken */}
      <form noValidate onSubmit={handleSubmit} className="max-w-xl space-y-9">
        {/* In Phase zwei (Zahlung laeuft) sind die Angaben gesperrt;
            "Angaben ändern" unten oeffnet sie wieder und verwirft die
            vorbereitete Zahlung. */}
        <fieldset
          disabled={Boolean(zahlung)}
          className={cn("min-w-0 space-y-9", zahlung && "opacity-60")}
        >
        {/* Block 1: Kontakt */}
        <div>
          <h2 className="font-heading text-[1.22rem] font-semibold tracking-[-0.01em] text-ink">
            Kontakt
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {textFeld("vorname", "Vorname", { autoComplete: "given-name" })}
            {textFeld("nachname", "Nachname", { autoComplete: "family-name" })}
            {textFeld("email", "E-Mail-Adresse", {
              type: "email",
              autoComplete: "email",
              klasse: "sm:col-span-2",
            })}
            {textFeld("phone", "Telefon, optional", {
              type: "tel",
              autoComplete: "tel",
              klasse: "sm:col-span-2",
            })}
          </div>
        </div>

        {/* Block 2: die Immobilie samt Adresse */}
        <div>
          <h2 className="font-heading text-[1.22rem] font-semibold tracking-[-0.01em] text-ink">
            Ihre Immobilie
          </h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-[0.85rem] font-medium">Objektart</span>
              {/* Auswahlfeld in derselben Optik und Höhe wie die Textfelder */}
              <span className="relative mt-1.5 block">
                <select
                  id="feld-objektart"
                  value={category}
                  onChange={(e) => setGewaehlteObjektart(e.target.value as ServiceCategoryId)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-line bg-paper px-4 py-2.5 pr-11 text-[0.95rem] transition-colors"
                >
                  {siteConfig.serviceCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
                />
              </span>
            </label>
            {textFeld("objektStrasse", "Straße und Hausnummer", {
              autoComplete: "street-address",
            })}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[130px,1fr]">
              {textFeld("objektPlz", "PLZ", { autoComplete: "postal-code", numerisch: true })}
              {textFeld("objektStadt", "Stadt", { autoComplete: "address-level2" })}
            </div>
          </div>
        </div>

        {/* Block 3: Rechnungsadresse, standardmäßig wie die Objektadresse */}
        <div>
          <h2 className="font-heading text-[1.22rem] font-semibold tracking-[-0.01em] text-ink">
            Rechnungsadresse
          </h2>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-background px-4 py-3">
            <input
              type="checkbox"
              checked={rechnungWieObjekt}
              onChange={(e) => setRechnungWieObjekt(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-[0.9rem] leading-snug">Entspricht der Objektadresse</span>
          </label>
          {!rechnungWieObjekt ? (
            <div className="mt-4 space-y-4">
              {textFeld("rechnungStrasse", "Straße und Hausnummer", {
                autoComplete: "billing street-address",
              })}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[130px,1fr]">
                {textFeld("rechnungPlz", "PLZ", {
                  autoComplete: "billing postal-code",
                  numerisch: true,
                })}
                {textFeld("rechnungStadt", "Stadt", { autoComplete: "billing address-level2" })}
              </div>
            </div>
          ) : null}
        </div>

        {/* KEIN STILLES UEBERSCHREIBEN, und kein stilles Verwerfen.
            Wenn im Konto schon etwas anderes steht, erfaehrt der Kunde
            das hier, bevor er bestellt, statt es spaeter irgendwo zu
            entdecken. Die Bestellung nimmt immer die Angaben von
            dieser Seite, das Konto bleibt unangetastet, und wer es
            geaendert haben moechte, bekommt gesagt, wo das geht. */}
        {abweichungen.length > 0 ? (
          <div className="rounded-2xl bg-surface-tint px-4 py-3.5">
            <p className="text-[0.85rem] leading-relaxed text-ink">
              In Ihrem Konto sind andere Angaben hinterlegt:{" "}
              {abweichungen.join("; ")}. Für diese Bestellung gelten die
              Angaben auf dieser Seite. Ihr Konto ändern wir dabei nicht,
              das können Sie jederzeit selbst unter{" "}
              <Link
                prefetch={navPrefetch}
                href="/konto/einstellungen"
                className="font-medium text-primary"
              >
                Einstellungen
              </Link>{" "}
              tun.
            </p>
          </div>
        ) : null}

        {/* Zustimmung zum sofortigen Beginn der Arbeit. Ohne sie koennte
            ein Verbraucher nach Tagen widerrufen, obwohl das Exposé
            fertig ist. Wortlaut: Arbeitsfassung, TODO Anwalt
            (config/vertragstexte.ts). */}
        <div>
          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-2xl border px-4 py-3.5",
              widerrufFehlt ? "border-accent-deep/60 bg-accent/5" : "border-line/60 bg-paper"
            )}
          >
            <input
              id="widerruf-zustimmung"
              type="checkbox"
              checked={widerrufZugestimmt}
              onChange={(e) => {
                setWiderrufZugestimmt(e.target.checked);
                if (e.target.checked) setWiderrufFehlt(false);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-[0.85rem] leading-relaxed text-ink">
              {WIDERRUF_ZUSTIMMUNG_TEXT}
              <span className="mt-1 block text-[0.78rem] text-ink-muted">
                {WIDERRUF_KURZHINWEIS}
              </span>
            </span>
          </label>
          {widerrufFehlt ? (
            <p className="mt-2 text-[0.82rem] text-accent-deep">
              Bitte bestätigen Sie den sofortigen Beginn, sonst dürfen wir
              nicht anfangen zu arbeiten.
            </p>
          ) : null}
        </div>
        </fieldset>

        {/* Zahlung: das Payment Element erscheint nach "Weiter zur
            Zahlung"; die Eingabefelder gehören Stripe, auch wenn sie
            auf unserer Seite stehen. */}
        <div id="zahlung-bereich">
          <h2 className="font-heading text-[1.22rem] font-semibold tracking-[-0.01em] text-ink">
            Zahlung
          </h2>
          <div className="mt-4">
            <PaymentSection zahlung={zahlung} nichtsFaellig={nichtsFaellig} />
          </div>
        </div>

        <div>
          {serverFehler ? (
            <p className="mb-3 rounded-xl bg-accent/10 px-4 py-3 text-[0.85rem] text-accent-deep">
              {serverFehler}
            </p>
          ) : null}
          {zahlung ? (
            <button
              type="button"
              onClick={() => setZahlung(null)}
              className="btn-secondary w-full sm:w-auto"
            >
              Angaben ändern
            </button>
          ) : (
            <button
              type="submit"
              disabled={sendet}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {sendet
                ? "Einen Moment"
                : stripeBereit
                  ? "Weiter zur Zahlung"
                  : BESTELL_BUTTON_LABEL}
            </button>
          )}
          {!stripeBereit ? (
            <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-muted">
              Sie erhalten Ihre Auftragsbestätigung mit den
              Zahlungsinformationen per E-Mail.
            </p>
          ) : null}
          <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-muted">
            Hinweise zum Umgang mit Ihren Daten finden Sie im{" "}
            <Link prefetch={navPrefetch} href="/datenschutz" className="font-medium text-primary">
              Datenschutz
            </Link>
            .
          </p>
          <p className="mt-4 text-[0.85rem]">
            <Link
              prefetch={navPrefetch}
              href="/wunsch-paket"
              className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary-dark"
            >
              <ArrowLeft size={14} strokeWidth={1.8} />
              Zurück zum Wunsch-Paket
            </Link>
          </p>
        </div>
      </form>

      {/* Verbindliche Bestellübersicht, gleiche Struktur wie der Warenkorb */}
      <aside>
        <div className="rounded-3xl border border-line/70 bg-paper p-6 shadow-soft">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Ihre Bestellung
          </p>
          {paketPosten && paketConfig ? (
            <div className="mt-3 rounded-xl border border-primary/20 bg-surface-tint px-3.5 py-3">
              <p className="flex items-center gap-2 text-[0.92rem] font-semibold">
                <Package size={15} strokeWidth={1.8} className="shrink-0 text-primary" />
                Paket {paketConfig.name}
              </p>
              <p className="mt-1 text-[0.85rem] font-semibold tabular-nums">
                {cartLineLabel(paketPosten)}
              </p>
              {/* Immer-monatliche Bestandteile beim Einmal-Kauf: eigene
                  Position, nie im Einmalpreis (10.08.2026) */}
              {paketEigeneMonatsposten(paketPosten).map((posten) => (
                <p
                  key={posten.service.id}
                  className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted"
                >
                  Dazu {posten.service.name} als eigene monatliche Position:{" "}
                  <span className="font-semibold text-ink tabular-nums">
                    {formatEuroBetrag(posten.preis)} je Monat
                  </span>
                  , monatlich kündbar.
                </p>
              ))}
              <ul className="mt-2 space-y-1 border-t border-line/50 pt-2">
                {paketConfig.includedServiceIds.map((eintrag) => {
                  const service = getService(eintrag.id);
                  if (!service) return null;
                  const abgewaehlt = (paketPosten.abgewaehlt ?? []).includes(eintrag.id);
                  return (
                    <li
                      key={eintrag.id}
                      className={cn(
                        "flex items-start gap-1.5 text-[0.78rem] leading-snug text-ink-muted",
                        abgewaehlt && "line-through"
                      )}
                    >
                      <Check
                        size={12}
                        strokeWidth={2.2}
                        className={cn("mt-0.5 shrink-0", abgewaehlt ? "text-line" : "text-success")}
                      />
                      {/* Bewusst OHNE Logos: In der kleinen Bestell-Liste
                          laegen sie unter der Mindestgroesse, und die
                          Varianten-Zeile nennt die Portale ohnehin. */}
                      {service.name}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {(
            [
              { titel: "Zusätzliche Leistungen, einmalig", posten: zusatzEinmalig, zusatz: "" },
              { titel: "Zusätzliche Leistungen, monatlich", posten: zusatzMonatlich, zusatz: " je Monat" },
            ] as const
          ).map((block) =>
            block.posten.length > 0 ? (
              <div key={block.titel} className="mt-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  {block.titel}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {block.posten.map((item: CartItem) => (
                    <li
                      key={item.key}
                      className="flex items-baseline justify-between gap-3 text-[0.85rem]"
                    >
                      <span className="min-w-0">
                        {item.name}
                        {cartMengeLabel(item) ? `, ${cartMengeLabel(item)}` : ""}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatEuroBetrag(cartLinePrice(item) ?? 0)}
                        {block.zusatz}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
          <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3.5 text-[0.85rem] tabular-nums">
            {totals.hatEinmalig ? (
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.95rem] font-semibold">Einmalig gesamt</span>
                  <span className="text-right">
                    {nachlassGesamt > 0 ? (
                      <>
                        <span className="block text-[0.78rem] text-ink-muted line-through">
                          {formatEuroBetrag(totals.einmalig)}
                        </span>
                        <AnimierteSumme
                          value={totals.einmalig - nachlassGesamt}
                          className="block text-[1.15rem] font-semibold leading-tight"
                        />
                      </>
                    ) : (
                      <AnimierteSumme
                        value={totals.einmalig}
                        className="text-[0.95rem] font-semibold"
                      />
                    )}
                  </span>
                </div>
                {/* Zwei getrennte Zeilen, damit der Kunde sieht, woher
                    der Nachlass kommt */}
                {rabatt > 0 ? (
                  <p className="mt-0.5 text-right text-[0.82rem] font-semibold text-accent-deep">
                    Sie sparen <AnimierteSumme value={rabatt} /> (Sofortzahlung)
                  </p>
                ) : null}
                {gutschein ? (
                  <p className="mt-0.5 text-right text-[0.82rem] font-semibold text-accent-deep">
                    Sie sparen <AnimierteSumme value={gutschein.betrag} /> (Gutschein{" "}
                    {gutschein.code})
                  </p>
                ) : null}
              </div>
            ) : null}
            {totals.hatMonatlich ? (
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-[0.95rem] font-semibold">Monatlich gesamt</span>
                <span className="font-semibold">
                  <AnimierteSumme value={totals.monatlich} />{" "}
                  <span className="text-[0.78rem] font-medium text-ink-muted">je Monat</span>
                </span>
              </p>
            ) : null}
            {totals.hatEinmalig ? (
              <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-background px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={instantPayment}
                  onChange={(e) => setInstantPayment(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-[0.85rem] leading-snug">
                  Sofortzahlung: {instantDiscountPercentLabel()} Rabatt {rabattBezug}
                </span>
              </label>
            ) : null}
            {/* Gutscheincode: Pruefung ohne Neuladen, der Nachlass
                erscheint sofort oben in der Summe. Gross- und
                Kleinschreibung und Randleerzeichen sind egal, das
                normalisiert der Server. */}
            <div className="pt-1">
              {gutschein ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-tint px-3.5 py-2.5">
                  <span className="text-[0.85rem] text-ink">
                    Gutschein <span className="font-semibold">{gutschein.code}</span>{" "}
                    eingelöst
                  </span>
                  <button
                    type="button"
                    onClick={gutscheinEntfernen}
                    className="text-[0.82rem] font-medium text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink"
                  >
                    Entfernen
                  </button>
                </div>
              ) : !gutscheinOffen ? (
                <button
                  type="button"
                  onClick={() => setGutscheinOffen(true)}
                  className="text-[0.82rem] font-medium text-primary transition-colors hover:text-primary-dark"
                >
                  Sie haben einen Gutscheincode?
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gutschein-code" className="text-[0.8rem] font-medium">
                    Gutscheincode
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="gutschein-code"
                      type="text"
                      value={gutscheinCode}
                      onChange={(e) => {
                        setGutscheinCode(e.target.value);
                        setGutscheinMeldung(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void gutscheinPruefen(gutscheinCode);
                        }
                      }}
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-2 text-[0.9rem]"
                    />
                    <button
                      type="button"
                      onClick={() => void gutscheinPruefen(gutscheinCode)}
                      disabled={gutscheinPrueft || !gutscheinCode.trim()}
                      className="btn-secondary shrink-0 !px-4 !py-2 text-[0.85rem] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {gutscheinPrueft ? "Prüft" : "Einlösen"}
                    </button>
                  </div>
                  {gutscheinMeldung ? (
                    <p className="text-[0.8rem] leading-relaxed text-accent-deep">
                      {gutscheinMeldung}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            {/* Bruttopreise für Verbraucher nach PAngV, Text zentral in site.config.ts */}
            <p className="pt-0.5 text-[0.75rem] text-ink-muted">{siteConfig.vatNote}</p>
          </div>

          {/* Laufzeit und Kündigung, ehrlich NEBEN den Summen statt im
              Kleingedruckten. Es erscheinen nur die Sätze, die zu
              dieser Bestellung gehören (config/vertragstexte.ts).

              KURZE ZEILE OFFEN, EINZELHEITEN AUFKLAPPBAR: Fünf volle
              Absätze machten die Kasse zur Textwand. Jede kurze Zeile
              trägt die Aussage auch zugeklappt (kein "Mehr erfahren");
              wo es keine Kurzfassung gibt, steht der volle Satz. */}
          {laufzeitSaetze.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-background px-4 py-3.5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Laufzeit und Kündigung
              </p>
              <ul className="mt-2 space-y-2">
                {laufzeitSaetze.map((satz) => {
                  const kurzfassung = LAUFZEIT_KURZFASSUNGEN[satz];
                  if (!kurzfassung) {
                    return (
                      <li
                        key={satz.slice(0, 24)}
                        className="text-[0.8rem] leading-relaxed text-ink-muted"
                      >
                        {satz}
                      </li>
                    );
                  }
                  return (
                    <li key={satz.slice(0, 24)}>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-start gap-1.5 text-[0.8rem] leading-relaxed text-ink-muted [&::-webkit-details-marker]:hidden">
                          <ChevronDown
                            size={13}
                            strokeWidth={2}
                            aria-hidden="true"
                            className="mt-1 shrink-0 -rotate-90 transition-transform group-open:rotate-0"
                          />
                          <span>{kurzfassung.kurz}</span>
                        </summary>
                        <p className="mt-1 pl-[1.2rem] text-[0.8rem] leading-relaxed text-ink-muted">
                          {kurzfassung.details}
                        </p>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {/* Gut sichtbarer Weg zurück in den Konfigurator, um die
              Zusammenstellung noch zu ändern */}
          <Link
            prefetch={navPrefetch}
            href="/wunsch-paket"
            className="btn-secondary mt-4 w-full !px-5 !py-2.5 text-[0.9rem]"
          >
            <PenLine size={15} strokeWidth={1.8} />
            Zusammenstellung anpassen
          </Link>
          {stripeBereit ? (
            <p className="mt-4 flex items-start gap-2 text-[0.82rem] leading-relaxed text-ink-muted">
              <Mail size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
              Nach der Zahlung erhalten Sie Ihre Bestellbestätigung mit allen
              Einzelheiten per E-Mail; Ihre Rechnung folgt als eigene E-Mail
              mit PDF und liegt zusätzlich in Ihrem Konto.
            </p>
          ) : (
            <p className="mt-4 flex items-start gap-2 text-[0.82rem] leading-relaxed text-ink-muted">
              <Mail size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
              Die Zahlungsinformationen erhalten Sie mit der Auftragsbestätigung
              per E-Mail.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
