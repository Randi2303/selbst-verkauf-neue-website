/**
 * Sichere Einmal-Links fuer Menschen OHNE Konto bei uns.
 *
 * NUR SERVER-SEITIG. Braucht die Service-Rolle.
 *
 * Wozu: Ein Kaufinteressent soll einen Bonitaetsnachweis hochladen
 * oder ein Gebot abgeben koennen, ohne sich zu registrieren. Der Link
 * gibt genau diesen einen Zweck frei und sonst nichts.
 *
 * Wie der Schutz funktioniert:
 *
 * - Das Token sind 32 zufaellige Bytes aus der Krypto-Quelle des
 *   Systems, base64url kodiert. Raten ist damit ausgeschlossen.
 * - In der Datenbank steht NUR der SHA-256-Abdruck. Wer die Tabelle
 *   liest, kann daraus keinen gueltigen Link bauen.
 * - Der Vergleich laeuft ueber den Abdruck, nicht ueber das Token.
 * - Jeder Link haengt an genau einer Anfrage und einem Zweck. Er gibt
 *   nichts frei, was darueber hinausgeht.
 * - Er laeuft ab. Ohne Frist gaebe es keinen Weg zurueck, wenn eine
 *   Mail in falsche Haende geraet.
 *
 * Bewusst mehrfach nutzbar innerhalb der Frist: Ein Interessent muss
 * einen falschen Upload ersetzen und sein Gebot spaeter aendern oder
 * zurueckziehen koennen.
 */
import { createHash, randomBytes } from "node:crypto";
import { basisAdresse } from "@/lib/basis-adresse";
import { supabaseService } from "@/lib/supabase/service";
import { ausgeblieben, gewirkt, type Wirkung } from "@/lib/wirkung";
import { siteConfig } from "@/site.config";

export type LinkZweck =
  | "bonitaetsnachweis"
  | "gebot"
  | "besichtigung"
  /* Selbst eine freie Zeit aussuchen (Migration 0064). Eigener Zweck
     und nicht "besichtigung", weil er etwas anderes erlaubt: Der
     Besichtigungs-Link sagt zu einem VORHANDENEN Termin zu, dieser
     legt einen an. */
  | "buchung"
  | "expose"
  /* Neue Anmelde-Adresse bestaetigen (Migration 0110). Der einzige
     Zweck, der in ein BESTEHENDES Konto eingreift: Erst der Klick der
     neuen Adresse vollzieht den Wechsel und beweist damit genau das,
     woran der Vorfall vom 24.08.2026 gescheitert waere, naemlich dass
     dort jemand Post empfaengt. */
  | "email-wechsel";

/**
 * Laufzeiten je Zweck.
 *
 * Bonitaetsnachweis: 14 Tage. Lang genug, damit jemand die Unterlage
 * bei seiner Bank anfordern kann, kurz genug, dass ein alter Link
 * nicht ewig offen steht.
 *
 * Gebot: Der Link laeuft mit der Frist des Verfahrens ab, deshalb hier
 * nur eine Obergrenze als Sicherheitsnetz.
 *
 * Besichtigung: Der Link haengt an der Person, nicht an einem einzelnen
 * Termin. Ueber ihn sagt sie zu, sagt spaeter ab, und ueber ihn
 * erreicht sie ein verschobener Termin. Deshalb laeuft er nicht mit dem
 * ersten Vorschlag ab, sondern deckt eine uebliche Verkaufsphase ab. Die
 * Aufrufer setzen bei Bedarf eine kuerzere Frist.
 */
export const LINK_LAUFZEIT_TAGE: Record<LinkZweck, number> = {
  bonitaetsnachweis: 14,
  gebot: 90,
  besichtigung: 120,
  /* Buchung: dieselbe Spanne wie der Besichtigungs-Link. Er haengt
     ebenso an der Person und nicht an einem einzelnen Termin, und wer
     im Maerz anfragt, sucht sich vielleicht erst im Mai eine Zeit. */
  buchung: 120,
  // Expose: mehrfach oeffenbar, solange das Objekt im Verkauf ist.
  // Sechs Wochen decken die uebliche Interessenten-Phase; danach ist
  // ein frischer Link ein Klick in der Akte. Weiterleiten laesst sich
  // ein Link nie verhindern, aber Laufzeit und Widerruf begrenzen ihn.
  expose: 42,
  /* Kurz, mit Absicht: Ein Wechsel-Link ist ein Eingriff in ein Konto.
     Drei Tage reichen, um ein Postfach zu oeffnen; alles darueber
     waere ein stehendes Einfallstor. Nach dem Vollzug wird der Link
     zusaetzlich widerrufen. */
  "email-wechsel": 3,
};

/**
 * Der Pfad, unter dem ein Zweck seine Seite hat.
 *
 * EXPORTIERT, weil app/api/link-oeffnen dieselbe Zuordnung braucht.
 * Dort stand sie bis zum 13.08.2026 ein zweites Mal, mit dem
 * Kommentar "gleichlautend mit lib/einmal-link.ts". Zwei Listen, die
 * gleich sein sollen, sind irgendwann verschieden: Beim Ergaenzen des
 * Buchungs-Zwecks fiel genau das auf.
 */
export const LINK_PFAD: Record<LinkZweck, string> = {
  bonitaetsnachweis: "nachweis",
  gebot: "gebot",
  besichtigung: "besichtigung",
  buchung: "termin",
  expose: "expose",
  /* Unter /auth, damit die Weiche in proxy.ts den Link auf die
     App-Anwendung traegt (KONTO_PFADE): Der Wechsel gehoert zu den
     Anmelde-Wegen. Die Mail traegt trotzdem die oeffentliche Basis wie
     jeder Einmal-Link; die Weiche erledigt den Rest. */
  "email-wechsel": "auth/email-wechsel",
};

export type EinmalLink = {
  id: string;
  zweck: LinkZweck;
  user_id: string;
  objekt_id: string | null;
  anfrage_id: string | null;
  ziel_id: string | null;
  empfaenger_email: string | null;
  empfaenger_name: string | null;
  gueltig_bis: string;
  widerrufen_am: string | null;
  nutzungen: number;
};

/** SHA-256 als Hex, der einzige Wert, der gespeichert wird */
function abdruck(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Lebt dieser Link noch? Nicht zurückgezogen und noch nicht abgelaufen.
 *
 * Steht hier und nicht in den Seiten, die es wissen wollen: Der Blick
 * auf die Uhr gehört nicht in das Rendern einer Ansicht, und die Regel
 * wäre sonst an drei Stellen nachgebaut.
 */
export function linkLebt(link: {
  gueltig_bis: string;
  widerrufen_am?: string | null;
}): boolean {
  if (link.widerrufen_am) return false;
  return new Date(link.gueltig_bis).getTime() > Date.now();
}

/**
 * Die vollstaendige Adresse, die in die Mail geht.
 *
 * DIE BASIS KOMMT AUS basisAdresse() und nicht direkt aus siteConfig.
 * Gefunden beim Durchspielen der Selbstbuchung: Eine oertliche
 * Instanz mit SITE_URL=http://localhost:3000 erzeugte Buchungs-Links
 * auf die LIVE-Adresse. Weil oertlich und live an derselben Datenbank
 * haengen, funktioniert so ein Link sogar, und genau das ist das
 * Gefaehrliche: Wer beim Durchspielen klickt, prueft nicht das, was er
 * gerade gebaut hat, sondern den alten Stand im Netz.
 *
 * Der Rueckfall auf siteConfig.domain greift nur, wenn auch die
 * Konfiguration unbrauchbar ist; basisAdresse() hat den Grund dann
 * bereits ins Protokoll geschrieben.
 */
export function linkAdresse(zweck: LinkZweck, token: string): string {
  return `${basisAdresse() ?? siteConfig.domain}/${LINK_PFAD[zweck]}/${token}`;
}

/**
 * Neuen Link anlegen. Gibt das Klartext-Token zurueck, das NUR in die
 * Mail gehoert und danach nirgends mehr auftaucht.
 */
export async function linkAnlegen({
  zweck,
  userId,
  objektId,
  anfrageId,
  zielId,
  empfaengerEmail,
  empfaengerName,
  erstelltVon,
  gueltigBis,
}: {
  zweck: LinkZweck;
  userId: string;
  objektId?: string | null;
  anfrageId?: string | null;
  zielId?: string | null;
  empfaengerEmail?: string | null;
  empfaengerName?: string | null;
  erstelltVon?: string | null;
  /** Ueberschreibt die Standard-Laufzeit, etwa die Frist des Verfahrens */
  gueltigBis?: Date;
}): Promise<{ token: string; adresse: string; id: string } | null> {
  const service = supabaseService();
  if (!service) return null;

  const token = randomBytes(32).toString("base64url");
  const frist =
    gueltigBis ??
    new Date(Date.now() + LINK_LAUFZEIT_TAGE[zweck] * 24 * 60 * 60 * 1000);

  const { data, error } = await service
    .from("einmal_links")
    .insert({
      zweck,
      token_hash: abdruck(token),
      user_id: userId,
      objekt_id: objektId ?? null,
      anfrage_id: anfrageId ?? null,
      ziel_id: zielId ?? null,
      empfaenger_email: empfaengerEmail ?? null,
      empfaenger_name: empfaengerName ?? null,
      erstellt_von: erstelltVon ?? null,
      gueltig_bis: frist.toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[einmal-link] Anlegen fehlgeschlagen:", error);
    return null;
  }
  return { token, adresse: linkAdresse(zweck, token), id: data.id };
}

export type LinkPruefung =
  | { gueltig: true; link: EinmalLink }
  | { gueltig: false; grund: "unbekannt" | "abgelaufen" | "widerrufen" | "falscher_zweck" };

/**
 * Ein Token pruefen. Meldet den Grund mit, damit die Seite einen
 * verstaendlichen Satz zeigen kann statt einer nackten Fehlermeldung.
 */
export async function linkPruefen(
  token: string,
  zweck: LinkZweck
): Promise<LinkPruefung> {
  const service = supabaseService();
  if (!service) return { gueltig: false, grund: "unbekannt" };

  const { data } = await service
    .from("einmal_links")
    .select(
      "id, zweck, user_id, objekt_id, anfrage_id, ziel_id, empfaenger_email, empfaenger_name, gueltig_bis, widerrufen_am, nutzungen"
    )
    .eq("token_hash", abdruck(token))
    .maybeSingle();

  if (!data) return { gueltig: false, grund: "unbekannt" };
  const link = data as EinmalLink;
  if (link.zweck !== zweck) return { gueltig: false, grund: "falscher_zweck" };
  if (link.widerrufen_am) return { gueltig: false, grund: "widerrufen" };
  if (new Date(link.gueltig_bis).getTime() < Date.now()) {
    return { gueltig: false, grund: "abgelaufen" };
  }
  return { gueltig: true, link };
}

/** Nutzung vermerken, rein zur Nachvollziehbarkeit */
export async function nutzungVermerken(linkId: string): Promise<void> {
  const service = supabaseService();
  if (!service) return;
  const { data } = await service
    .from("einmal_links")
    .select("nutzungen")
    .eq("id", linkId)
    .maybeSingle();
  // wirkung: gewollt, der Nutzungszaehler dient nur der Nachvollziehbarkeit und traegt keine Entscheidung
  await service
    .from("einmal_links")
    .update({
      zuletzt_genutzt_am: new Date().toISOString(),
      nutzungen: ((data?.nutzungen as number | undefined) ?? 0) + 1,
    })
    .eq("id", linkId);
}

/**
 * Einen Link vorzeitig ungueltig machen.
 *
 * DIE OFFENE TUER (Befund 15.08.2026, behoben 16.08.2026). Vorher gab
 * diese Funktion `Promise<void>` zurueck und sah weder den Fehler noch
 * die Zeilenzahl an. Gemessen an der Datenbank: Ein Update auf eine
 * Kennung, die es nicht gibt, meldet KEINEN Fehler und trifft null
 * Zeilen. Fuer den Aufrufer war das von einem Erfolg nicht zu
 * unterscheiden.
 *
 * Die Folge ist keine Unbequemlichkeit, sondern eine offene Tuer: Der
 * Kunde liest "neuer Link erstellt", der alte gaelte weiter, und beide
 * fuehren auf das Expose seines Hauses. Wer einen Zugang zurueckzieht,
 * muss wissen, ob er wirklich zu ist.
 *
 * NACHWEIS IST DIE ZEILENZAHL, wie in lib/schreiben.ts. Ein schon
 * widerrufener Link zaehlt als Erfolg: Die Zeile wird getroffen, das
 * Ziel ist erreicht, und der Zeitpunkt wird lediglich neu gesetzt.
 */
export async function linkWiderrufen(linkId: string): Promise<Wirkung> {
  const service = supabaseService();
  if (!service) {
    return ausgeblieben(
      "Der Zugang ließ sich nicht zurückziehen: Der Dienst-Zugang zur Datenbank fehlt. Der alte Link gilt weiter."
    );
  }
  const { data, error } = await service
    .from("einmal_links")
    .update({ widerrufen_am: new Date().toISOString() })
    .eq("id", linkId)
    .select("id");
  if (error) {
    console.error("[einmal-link] Widerruf fehlgeschlagen:", linkId, error.message);
    return ausgeblieben(
      `Der Zugang ließ sich nicht zurückziehen (${error.message}). Der alte Link gilt weiter.`
    );
  }
  if ((data?.length ?? 0) === 0) {
    console.error("[einmal-link] Widerruf traf null Zeilen:", linkId);
    return ausgeblieben(
      "Der Zugang ließ sich nicht zurückziehen: Zu dieser Kennung gibt es keinen Link. Ein etwaiger alter Link gilt weiter."
    );
  }
  return gewirkt("Der alte Zugang ist zurückgezogen.");
}
