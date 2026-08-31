import "server-only";
import { SERVICES, servicePrice, siteConfig } from "@/site.config";
import { instantDiscountAmount } from "@/lib/preise";
import { gutscheinMeldung, type Gutschein, type GutscheinGrund } from "@/lib/gutschein";

/**
 * Die serverseitige Positionsrechnung der Kasse.
 *
 * SICHERHEITSREGEL: Der Browser schickt nur Kennungen, Mengen und
 * Varianten. JEDER Betrag entsteht hier, aus site.config.ts, der
 * einzigen Preisquelle. Was der Browser an Preisen behauptet, wird
 * nicht einmal gelesen. Dieselben Positionen gehen an Stripe, in die
 * Bestell-Tabelle und in die Bestellbestaetigung; es gibt keinen
 * zweiten Rechenweg.
 *
 * SOFORTZAHLUNGS-RABATT: trifft ausschliesslich die einmaligen
 * Positionen (siteConfig.instantPaymentDiscount). Der Gesamtrabatt
 * wird wie in der Anzeige gerechnet (lib/preise.ts) und dann auf die
 * einzelnen Einmal-Positionen verteilt (groesste Reste zuerst), damit
 * die Summe der Positionen exakt der angezeigten Summe entspricht.
 *
 * MAKLER-BEGLEITUNG (ansprechpartner): wird HEUTE NIE abgerechnet.
 * Sie beginnt erst mit der Zuweisung des Ansprechpartners
 * (lib/laufzeit.ts); das Abo entsteht dann per API mit der beim
 * Bezahlen gespeicherten Zahlungsmethode. Hier laeuft sie als
 * Position "spaeter" mit, damit Bestellung und Bestaetigung sie
 * ehrlich nennen.
 */

/** Was der Browser je Posten schicken darf, mehr wird nicht gelesen */
export type BestellEingabe = {
  type: "paket" | "leistung";
  id: string;
  variant?: string | null;
  quantity?: number;
  paymentMode?: "monthly" | "once";
  abgewaehlt?: string[];
};

export type BestellPosition = {
  leistungId: string;
  art: "paket" | "leistung";
  /** Name, wie der Kunde ihn sieht, mit Variante */
  name: string;
  variante: string | null;
  menge: number;
  /** Einheit der Menge aus dem Katalog ("Monate"), sonst Stueck */
  einheit?: string;
  zahlweise: "einmalig" | "monatlich";
  /** Zeilenbetrag in Euro VOR Rabatt */
  betragVorRabatt: number;
  /** Anteil am Sofortzahlungs-Rabatt in Euro (nur einmalige Posten) */
  rabatt: number;
  /** Anteil am Gutschein-Nachlass in Euro (nur einmalige Posten) */
  gutschein?: number;
  /** Zeilenbetrag in Euro nach allen Nachlaessen; das wird abgerechnet */
  betrag: number;
  /**
   * true bei der Makler-Begleitung: heute nichts abrechnen, das Abo
   * startet erst mit der Zuweisung des Ansprechpartners.
   */
  spaeter?: boolean;
  /** Nur beim Paket: bewusst abgewaehlte enthaltene Leistungen */
  abgewaehlt?: string[];
};

export type BerechneteBestellung = {
  positionen: BestellPosition[];
  /** Einmalig gesamt nach ALLEN Nachlaessen (heute faellig) */
  summeEinmalig: number;
  summeEinmaligVorRabatt: number;
  rabatt: number;
  sofortzahlung: boolean;
  /** Eingeloester Gutschein mit dem tatsaechlich gewaehrten Nachlass */
  gutschein: { id: string; code: string; betrag: number } | null;
  /** Monatlich gesamt, das SOFORT als Abo startet */
  summeMonatlich: number;
  /** Monatlich gesamt, das erst mit der Zuweisung startet */
  summeMonatlichSpaeter: number;
  /**
   * Welcher Stripe-Vorgang gebraucht wird: Abo (mit oder ohne
   * Einmalposten), reine Zahlung, oder nur das Speichern der
   * Zahlungsmethode (Korb enthaelt nur die Makler-Begleitung).
   */
  modus: "subscription" | "payment" | "setup";
  /** Muss die Zahlungsmethode fuer spaeter gespeichert werden? */
  zahlungsmethodeSpeichern: boolean;
};

export type BestellRechnung =
  | { ok: true; bestellung: BerechneteBestellung }
  | { ok: false; meldung: string; gutscheinGrund?: GutscheinGrund };

/** Leistung, die nie sofort abgerechnet wird (Beginn bei Zuweisung) */
export const SPAETER_LEISTUNGEN = ["ansprechpartner"];

/**
 * UNTERGRENZE des kombinierten Nachlasses: Unter diesen Restpreis
 * faellt eine einmalige Position durch Sofortzahlungs-Rabatt und
 * Gutschein ZUSAMMEN nie. Der eine Euro haelt zugleich jede Zahlung
 * sicher ueber dem Stripe-Mindestbetrag von 50 Cent; gekappt wird
 * immer der Gutschein, nie der Sofortzahlungs-Rabatt.
 */
export const MINDESTPREIS_NACH_NACHLASS = 1;

export function berechneBestellung(
  eingaben: readonly BestellEingabe[],
  sofortzahlung: boolean,
  gutschein?: Gutschein | null
): BestellRechnung {
  if (!Array.isArray(eingaben) || eingaben.length === 0) {
    return { ok: false, meldung: "Der Warenkorb ist leer." };
  }
  const positionen: BestellPosition[] = [];

  for (const eingabe of eingaben) {
    const menge = Math.max(1, Math.round(Number(eingabe.quantity ?? 1)));
    if (!Number.isFinite(menge) || menge > 999) {
      return { ok: false, meldung: "Eine Anzahl im Warenkorb ist ungültig." };
    }

    if (eingabe.type === "paket") {
      const paket = siteConfig.packages.find((p) => p.id === eingabe.id);
      if (!paket) {
        return { ok: false, meldung: "Ein Paket im Warenkorb ist unbekannt. Bitte stellen Sie die Auswahl neu zusammen." };
      }
      const einmalig = eingabe.paymentMode === "once";
      const preis = einmalig ? paket.once : paket.monthly;
      if (typeof preis !== "number") {
        return { ok: false, meldung: `Für das Paket ${paket.name} ist noch kein Preis hinterlegt.` };
      }
      const abgewaehlt = (eingabe.abgewaehlt ?? []).filter((id: string) =>
        paket.includedServiceIds.some((e) => e.id === id)
      );
      positionen.push({
        leistungId: paket.id,
        art: "paket",
        name: `Paket ${paket.name}`,
        variante: null,
        menge: 1,
        zahlweise: einmalig ? "einmalig" : "monatlich",
        betragVorRabatt: preis,
        rabatt: 0,
        betrag: preis,
        abgewaehlt,
      });
      /* Immer-monatliche Bestandteile beim Einmal-Kauf: eigene
         Position, nie im Einmalpreis (lib/preise.ts, 10.08.2026).
         Aktuell ist das genau die Makler-Begleitung, also "spaeter". */
      if (einmalig) {
        const abgewaehltSet = new Set(abgewaehlt);
        for (const eintrag of paket.includedServiceIds) {
          if (abgewaehltSet.has(eintrag.id)) continue;
          const service = SERVICES.find((s) => s.id === eintrag.id);
          if (!service?.eigenstaendigMonatlich) continue;
          const monatsPreis = servicePrice(service, null);
          if (monatsPreis === null) continue;
          positionen.push({
            leistungId: service.id,
            art: "leistung",
            name: service.name,
            variante: null,
            menge: 1,
            zahlweise: "monatlich",
            betragVorRabatt: monatsPreis,
            rabatt: 0,
            betrag: monatsPreis,
            spaeter: SPAETER_LEISTUNGEN.includes(service.id),
          });
        }
      }
      continue;
    }

    const service = SERVICES.find((s) => s.id === eingabe.id);
    if (!service) {
      return { ok: false, meldung: "Eine Leistung im Warenkorb ist unbekannt. Bitte stellen Sie die Auswahl neu zusammen." };
    }
    const variante = eingabe.variant ?? null;
    if (variante && !(service.variants ?? []).includes(variante)) {
      return { ok: false, meldung: `Die gewählte Variante der Leistung ${service.name} ist unbekannt.` };
    }
    const einzelPreis = servicePrice(service, variante);
    if (einzelPreis === null) {
      return {
        ok: false,
        meldung: `Für die Leistung ${service.name} ist noch kein Preis hinterlegt. Bitte bestellen Sie sie über das Kontaktformular mit.`,
      };
    }
    const anzahl = service.countable ? menge : 1;
    const betrag = einzelPreis * anzahl;
    positionen.push({
      leistungId: service.id,
      art: "leistung",
      name: variante ? `${service.name} (${variante})` : service.name,
      variante,
      menge: anzahl,
      /* Die Einheit nur, wenn sie nicht schon im Namen steckt:
         "Verlängerung der Portallaufzeit, 2 Monate" ist klar,
         "Digitale Grundrisse, 2 Grundrisse" wäre gestottert. */
      einheit:
        service.countable &&
        service.unit &&
        !service.name.toLowerCase().includes(service.unit.toLowerCase())
          ? service.unit
          : undefined,
      zahlweise: service.monthly ? "monatlich" : "einmalig",
      betragVorRabatt: betrag,
      rabatt: 0,
      betrag,
      spaeter: service.monthly ? SPAETER_LEISTUNGEN.includes(service.id) : undefined,
    });
  }

  /* Rabatt wie in der Anzeige rechnen und auf die Einmal-Posten
     verteilen. Verteilt wird anteilig in ganzen Euro; Rundungsreste
     bekommen die groessten Posten, bis die Summe exakt stimmt. */
  const einmalige = positionen.filter((p) => p.zahlweise === "einmalig");
  const summeEinmaligVorRabatt = einmalige.reduce((s, p) => s + p.betragVorRabatt, 0);
  let rabatt = 0;
  if (sofortzahlung && summeEinmaligVorRabatt > 0) {
    rabatt = instantDiscountAmount(summeEinmaligVorRabatt);
    let verteilt = 0;
    for (const posten of einmalige) {
      posten.rabatt = Math.floor((posten.betragVorRabatt / summeEinmaligVorRabatt) * rabatt);
      verteilt += posten.rabatt;
    }
    const nachGroesse = [...einmalige].sort((a, b) => b.betragVorRabatt - a.betragVorRabatt);
    for (let i = 0; verteilt < rabatt && nachGroesse.length > 0; i++) {
      nachGroesse[i % nachGroesse.length].rabatt += 1;
      verteilt += 1;
    }
    for (const posten of einmalige) {
      posten.betrag = posten.betragVorRabatt - posten.rabatt;
    }
  }

  /* GUTSCHEIN, nach derselben Grundregel wie der Sofortzahlungs-Rabatt
     und an derselben Stelle: Er rechnet auf den GRUNDPREIS der
     betroffenen einmaligen Positionen, nicht auf den bereits
     rabattierten Betrag; beide Nachlaesse stehen getrennt an der
     Position. Monatliche Positionen bleiben grundsaetzlich unberuehrt.
     Je Position bleiben mindestens MINDESTPREIS_NACH_NACHLASS Euro
     stehen; reicht die Kapazitaet nicht fuer den vollen Gutschein,
     wird der Gutschein gekappt. */
  let gutscheinErgebnis: BerechneteBestellung["gutschein"] = null;
  if (gutschein) {
    if (einmalige.length === 0) {
      return {
        ok: false,
        meldung: gutscheinMeldung("nur_monatlich"),
        gutscheinGrund: "nur_monatlich",
      };
    }
    const beschraenkt = (gutschein.leistungs_ids ?? []).filter(Boolean);
    const betroffene =
      beschraenkt.length > 0
        ? einmalige.filter((p) => beschraenkt.includes(p.leistungId))
        : einmalige;
    if (betroffene.length === 0) {
      return {
        ok: false,
        meldung: gutscheinMeldung("korb_passt_nicht"),
        gutscheinGrund: "korb_passt_nicht",
      };
    }
    if (
      gutschein.mindestbestellwert !== null &&
      summeEinmaligVorRabatt < Number(gutschein.mindestbestellwert)
    ) {
      return {
        ok: false,
        meldung: gutscheinMeldung("mindestwert", gutschein),
        gutscheinGrund: "mindestwert",
      };
    }
    const basis = betroffene.reduce((s, p) => s + p.betragVorRabatt, 0);
    const ziel =
      gutschein.art === "prozent"
        ? Math.round((basis * Number(gutschein.wert)) / 100)
        : Math.round(Number(gutschein.wert));
    /* Verteilen in ganzen Euro, proportional zum Grundpreis, mit der
       Kapazitaet je Position als Deckel; Reste bekommen die Positionen
       mit dem meisten freien Platz. */
    const kapazitaet = new Map<BestellPosition, number>(
      betroffene.map((p) => [
        p,
        Math.max(0, p.betragVorRabatt - p.rabatt - MINDESTPREIS_NACH_NACHLASS),
      ])
    );
    const anteile = new Map<BestellPosition, number>(betroffene.map((p) => [p, 0]));
    let offen = Math.max(0, ziel);
    for (const p of betroffene) {
      const wunsch = Math.min(
        Math.floor((p.betragVorRabatt / basis) * ziel),
        kapazitaet.get(p) ?? 0
      );
      anteile.set(p, wunsch);
      offen -= wunsch;
    }
    while (offen > 0) {
      const mitPlatz = betroffene
        .filter((p) => (anteile.get(p) ?? 0) < (kapazitaet.get(p) ?? 0))
        .sort(
          (a, b) =>
            (kapazitaet.get(b)! - anteile.get(b)!) - (kapazitaet.get(a)! - anteile.get(a)!)
        );
      if (mitPlatz.length === 0) break; // Untergrenze erreicht, Gutschein gekappt
      anteile.set(mitPlatz[0], (anteile.get(mitPlatz[0]) ?? 0) + 1);
      offen -= 1;
    }
    let gewaehrt = 0;
    for (const p of betroffene) {
      const anteil = anteile.get(p) ?? 0;
      if (anteil > 0) {
        p.gutschein = anteil;
        p.betrag = p.betragVorRabatt - p.rabatt - anteil;
        gewaehrt += anteil;
      }
    }
    gutscheinErgebnis = { id: gutschein.id, code: gutschein.code, betrag: gewaehrt };
  }

  const summeEinmalig = einmalige.reduce((s, p) => s + p.betrag, 0);
  const jetztMonatlich = positionen.filter((p) => p.zahlweise === "monatlich" && !p.spaeter);
  const spaeterMonatlich = positionen.filter((p) => p.zahlweise === "monatlich" && p.spaeter);
  const summeMonatlich = jetztMonatlich.reduce((s, p) => s + p.betrag, 0);
  const summeMonatlichSpaeter = spaeterMonatlich.reduce((s, p) => s + p.betrag, 0);

  const modus: BerechneteBestellung["modus"] =
    summeMonatlich > 0 ? "subscription" : summeEinmalig > 0 ? "payment" : "setup";
  if (modus === "setup" && spaeterMonatlich.length === 0) {
    return { ok: false, meldung: "Der Warenkorb enthält nichts, das sich abrechnen lässt." };
  }

  return {
    ok: true,
    bestellung: {
      positionen,
      summeEinmalig,
      summeEinmaligVorRabatt,
      rabatt,
      sofortzahlung: sofortzahlung && rabatt > 0,
      gutschein: gutscheinErgebnis,
      summeMonatlich,
      summeMonatlichSpaeter,
      modus,
      zahlungsmethodeSpeichern: spaeterMonatlich.length > 0,
    },
  };
}
