import "server-only";
import Stripe from "stripe";
import { istVorlaunch } from "@/lib/prelaunch";

/**
 * DER EINE Zugang zu Stripe, mit dem Schluessel-Waechter.
 *
 * GRUNDSAETZE (entschieden am 12.08.2026):
 * - Es gibt KEINE Preis-Kennungen in Stripe. Jeder Betrag wird bei
 *   jeder Bestellung serverseitig aus site.config.ts uebermittelt
 *   (price_data). Damit kann es keinen zweiten Preisstand geben, und
 *   beim Schluesseltausch zeigt nichts ins Leere.
 * - Der geheime Schluessel existiert nur hier auf dem Server
 *   (STRIPE_SECRET_KEY). Der Browser kennt nur den veroeffentlichbaren
 *   Schluessel (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
 * - Objekte, die Stripe dauerhaft braucht (die 19-Prozent-Steuerrate,
 *   Produkte fuer spaeter startende Abos), legt der Code bei Bedarf
 *   selbst an und findet sie ueber Metadaten wieder. Beim Wechsel von
 *   Sandbox auf Betrieb entstehen sie im neuen Konto von selbst.
 *
 * DER WAECHTER: Testbetrieb auf der echten Adresse ist bis zum Launch
 * ausdruecklich GEWOLLT (Sandbox-Schluessel hinter dem Passwortschutz,
 * SITE_PRELAUNCH=true). Erst wenn der Vorlaunch endet, sperrt ein
 * Testschluessel die Kasse; und ein LIVE-Schluessel waehrend des
 * Vorlaunchs sperrt sie ebenfalls, damit hinter dem Passwortschutz
 * niemals echtes Geld fliesst.
 */

export type StripeModus = "test" | "live";

/** Modus aus dem Schluessel-Praefix, null ohne Schluessel */
export function stripeModus(): StripeModus | null {
  const schluessel = process.env.STRIPE_SECRET_KEY ?? "";
  if (schluessel.startsWith("sk_test_") || schluessel.startsWith("rk_test_")) return "test";
  if (schluessel.startsWith("sk_live_") || schluessel.startsWith("rk_live_")) return "live";
  return null;
}

/** Ist Stripe ueberhaupt konfiguriert (beide Schluessel vorhanden)? */
export function stripeKonfiguriert(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

/**
 * Der Waechter. Liefert null, wenn die Kasse starten darf, sonst die
 * ehrliche Begruendung. Lokal (Entwicklung) sind Testschluessel immer
 * erlaubt, Live-Schluessel nie.
 */
export function stripeStartFehler(): string | null {
  const geheim = process.env.STRIPE_SECRET_KEY ?? "";
  const oeffentlich = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  if (!geheim || !oeffentlich) return null; // nicht konfiguriert ist kein Fehler, nur nicht bereit
  const modus = stripeModus();
  if (!modus) {
    return "Der Stripe-Schlüssel hat ein unbekanntes Format (erwartet sk_test_... oder sk_live_...).";
  }
  const oeffentlichModus = oeffentlich.startsWith("pk_test_")
    ? "test"
    : oeffentlich.startsWith("pk_live_")
      ? "live"
      : null;
  if (oeffentlichModus !== modus) {
    return "Die beiden Stripe-Schlüssel passen nicht zusammen (einer ist test, der andere live). Bitte beide aus demselben Stripe-Konto eintragen.";
  }
  const entwicklung = process.env.NODE_ENV !== "production";
  if (modus === "live" && (entwicklung || istVorlaunch)) {
    return "Es ist ein LIVE-Schlüssel hinterlegt, aber die Seite läuft noch im Vorlaunch. Hinter dem Passwortschutz darf kein echtes Geld fließen; bitte bis zum Launch die Sandbox-Schlüssel verwenden.";
  }
  if (modus === "test" && !entwicklung && !istVorlaunch) {
    return "Die Seite ist live, aber es sind noch die Stripe-TESTSCHLÜSSEL hinterlegt. Bitte die Live-Schlüssel eintragen (siehe Tauschliste im README), sonst bleibt die Kasse gesperrt.";
  }
  return null;
}

let client: Stripe | null = null;

/**
 * Stripe-Client, einmal je Prozess. null, solange kein Schluessel liegt.
 *
 * ZEITGRENZE, und zwar hier fuer JEDEN Aufruf: Ohne eigene Grenze
 * wartet das SDK bis zu 80 Sekunden, laenger als die 60 Sekunden des
 * vorgeschalteten nginx. Ein haengender Stripe-Aufruf liefe damit
 * immer erst in den 504 des Hosters statt in unsere eigene, ehrliche
 * Fehlermeldung. 15 Sekunden reichen fuer jeden normalen Vorgang;
 * jede Aufrufstelle faengt den Fehler ab (Kasse: Meldung an den
 * Kunden, Webhook: 500 und Stripe stellt erneut zu, Abo und
 * Erstattung: Meldung an das Team). Eine Wiederholung uebernimmt das
 * SDK selbst, mit eigenem Idempotenz-Schluessel, es entsteht also
 * nichts doppelt.
 */
export function stripeClient(): Stripe | null {
  const schluessel = process.env.STRIPE_SECRET_KEY;
  if (!schluessel) return null;
  if (!client) {
    client = new Stripe(schluessel, { timeout: 15_000, maxNetworkRetries: 1 });
  }
  return client;
}

/* ------------------------------------------------------------------ */
/* Dauer-Objekte: bei Bedarf anlegen, ueber Metadaten wiederfinden     */
/* ------------------------------------------------------------------ */

const QUELLE = "selbst-verkauf";
let steuerRateId: string | null = null;
const produktIds = new Map<string, string>();

/**
 * Die eine Steuerrate: 19 Prozent, IM Preis enthalten (Bruttopreise
 * nach PAngV, siteConfig.vatNote). Stripe weist damit die enthaltene
 * Steuer auf der Rechnung aus, ohne etwas aufzuschlagen. Stripe Tax
 * (der kostenpflichtige Rechendienst) wird dafuer NICHT gebraucht.
 */
export async function steuerRateSichern(stripe: Stripe): Promise<string> {
  if (steuerRateId) return steuerRateId;
  const vorhandene = await stripe.taxRates.list({ active: true, limit: 100 });
  const treffer = vorhandene.data.find(
    (r) => r.inclusive && r.percentage === 19 && r.metadata?.quelle === QUELLE
  );
  if (treffer) {
    steuerRateId = treffer.id;
    return treffer.id;
  }
  const neu = await stripe.taxRates.create({
    display_name: "USt.",
    percentage: 19,
    inclusive: true,
    country: "DE",
    description: "19 % Umsatzsteuer, im Preis enthalten",
    metadata: { quelle: QUELLE },
  });
  steuerRateId = neu.id;
  return neu.id;
}

/**
 * Produkt zu einer Leistung sichern. Gebraucht NUR fuer Abos, die
 * spaeter per API starten (Makler-Begleitung bei der Zuweisung), weil
 * die Abo-Schnittstelle dort eine Produkt-Kennung verlangt. Die
 * Checkout-Positionen selbst laufen ohne (product_data im Moment der
 * Bestellung).
 */
export async function produktSichern(
  stripe: Stripe,
  leistungId: string,
  name: string
): Promise<string> {
  const gemerkt = produktIds.get(leistungId);
  if (gemerkt) return gemerkt;
  const suche = await stripe.products.search({
    query: `active:'true' AND metadata['quelle']:'${QUELLE}' AND metadata['leistung_id']:'${leistungId}'`,
    limit: 1,
  });
  if (suche.data[0]) {
    produktIds.set(leistungId, suche.data[0].id);
    return suche.data[0].id;
  }
  const neu = await stripe.products.create({
    name,
    metadata: { quelle: QUELLE, leistung_id: leistungId },
  });
  produktIds.set(leistungId, neu.id);
  return neu.id;
}
