/**
 * Benachrichtigungs-Mails aus dem Konto: Bewertung liegt vor, Termin
 * bestätigt/verschoben/abgesagt, Antwort vom Team, Antwort auf eine
 * Fehlermeldung.
 *
 * NUR SERVER-SEITIG. Ein Aufruf hier prüft immer beides:
 *   1. Ist der eigene Mail-Versand überhaupt konfiguriert? Ohne
 *      RESEND_API_KEY passiert schlicht nichts (selbst-aktivierend).
 *   2. Möchte der Kunde GENAU DIESE Sorte Hinweis?
 *
 * Anders als die Anmelde-Mails gehen diese über die antwortbare
 * Team-Adresse raus (siehe MailArt in lib/mail.ts). Der Versand ist
 * bewusst "beiläufig": Schlägt er fehl, landet das im Server-Log, aber
 * die auslösende Aktion (Termin bestätigen, antworten) gilt trotzdem
 * als erledigt. Eine Aktion darf nie an einer Mail scheitern.
 *
 * ---------------------------------------------------------------------
 * DIE KENNUNG IST SEIT DEM 30.08.2026 PFLICHT, UND SIE IST GETYPT
 * ---------------------------------------------------------------------
 * Bis dahin las diese Datei einen einzigen Wahrheitswert
 * (`profiles.mail_benachrichtigungen`) und musste gar nicht wissen,
 * um welche Mail es ging. Jetzt entscheidet der Kunde je THEMA, also
 * muss jede Sende-Stelle sagen, welche Mail sie schickt.
 *
 * `AbschaltbareKennung` laesst nur die 16 Kennungen zu, die in
 * config/meldungs-themen.ts an einem Schalter haengen. Damit kann eine
 * PFLICHT-MAIL diesen Weg gar nicht mehr gehen: Sie waere ein
 * Uebersetzungsfehler, kein stiller Ausfall und kein Fund einer
 * Textsuche. Das ist der Riegel, den der Inhaber verlangt hat.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AbschaltbareKennung } from "@/config/meldungs-themen";
import type { PflichtMailId } from "@/config/pflicht-mails";
import { mailErlaubt } from "@/lib/meldungs-einstellungen";
import { sendeMail } from "@/lib/mail";
import type { MailInhalt } from "@/lib/mail-vorlagen";

export type Empfaenger = { email: string; name: string | null };

/**
 * Empfänger-Daten laden, aber nur wenn die Person Hinweise DIESER
 * Sorte möchte. Liefert null, wenn abbestellt oder ohne E-Mail-Adresse.
 */
export async function empfaengerFuerHinweis(
  service: SupabaseClient | null,
  userId: string,
  /** Welche Mail? Entscheidet, welcher Schalter gilt. */
  kennung: AbschaltbareKennung
): Promise<Empfaenger | null> {
  /* HIER WIRD NICHT MEHR AUF mailKonfiguriert() GEPRUEFT, und das ist
     eine Korrektur vom 08.08.2026.

     Vorher brach die Kette bei fehlendem RESEND_API_KEY still ab. Damit
     sah ein Rechner ohne Schluessel genauso aus wie einer, auf dem der
     Ausloeser gar nicht existiert, und genau diese zwei Faelle
     auseinanderzuhalten ist der Sinn des Versandprotokolls.

     Jetzt laeuft der Aufruf bis sendeMail() durch, das den Fehlschlag
     mit Grund vermerkt und false zurueckgibt. Es geht dadurch keine
     Mail mehr raus als vorher, es ist nur sichtbar. */
  if (!service) return null;
  const { data } = await service
    .from("profiles")
    .select("email, name")
    .eq("id", userId)
    .maybeSingle<{
      email: string | null;
      name: string | null;
    }>();
  if (!data?.email) return null;
  /* SEIT DEM 30.08.2026 JE THEMA. `mail_benachrichtigungen` wird hier
     nicht mehr gelesen; die Spalte ist stillgelegt (Migration 0117)
     und ihr Inhalt einmal in meldungs_einstellungen uebernommen. */
  if (!(await mailErlaubt(service, userId, kennung))) return null;
  return { email: data.email, name: data.name };
}

/**
 * Empfänger-Daten für eine PFLICHT-MAIL laden. Fragt bewusst KEINEN
 * Schalter, sondern nur, ob es überhaupt eine Adresse gibt.
 *
 * WARUM ES DIESE FUNKTION GIBT, obwohl sie fast nichts tut: Vorher las
 * jede Pflicht-Stelle `profiles` selbst, mit einer eigenen Abfrage und
 * einer eigenen Behandlung der fehlenden Adresse. An der Sende-Stelle
 * sah man dann nicht mehr, ob jemand den Schalter ABSICHTLICH übergeht
 * oder ihn nur vergessen hat (genau der Befund, der 2026 zu
 * config/pflicht-mails.ts geführt hat). Jetzt gibt es zwei Funktionen
 * mit sprechenden Namen, und der Typ verlangt an jeder von beiden eine
 * Kennung aus der jeweils richtigen Menge.
 */
export async function empfaengerFuerPflicht(
  service: SupabaseClient | null,
  userId: string,
  /** Nur Kennungen mit Begründung in config/pflicht-mails.ts */
  kennung: PflichtMailId
): Promise<Empfaenger | null> {
  if (!service) return null;
  /* Die Kennung wird hier nicht abgefragt; sie steht in der Signatur,
     damit der Typ die Begründungspflicht durchsetzt. */
  void kennung;
  const { data } = await service
    .from("profiles")
    .select("email, name")
    .eq("id", userId)
    .maybeSingle<{ email: string | null; name: string | null }>();
  if (!data?.email) return null;
  return { email: data.email, name: data.name };
}

/**
 * Einen fertigen Vorlagen-Inhalt an den Kunden schicken, sofern er
 * Hinweise dieser Sorte möchte. Wirft nie; Fehler stehen im Server-Log.
 */
export async function sendeHinweis(
  service: SupabaseClient | null,
  userId: string,
  /**
   * Kennung aus lib/mail-katalog.ts, für das Versandprotokoll UND für
   * die Frage, welcher Schalter gilt. Nur abschaltbare Kennungen sind
   * hier zugelassen; eine Pflicht-Mail geht nie über diesen Weg.
   */
  kennung: AbschaltbareKennung,
  vorlage: (empfaenger: Empfaenger) => MailInhalt
): Promise<void> {
  try {
    const empfaenger = await empfaengerFuerHinweis(service, userId, kennung);
    if (!empfaenger) return;
    const inhalt = vorlage(empfaenger);
    await sendeMail({
      an: empfaenger.email,
      betreff: inhalt.betreff,
      html: inhalt.html,
      text: inhalt.text,
      art: "benachrichtigung",
      vorlage: kennung,
      userId,
    });
  } catch (fehler) {
    // wirkung: gewollt, eine Aktion darf nie an einer Hinweis-Mail scheitern: sendeMail vermerkt und meldet Fehlschlaege selbst
    console.error("[benachrichtigung] Versand fehlgeschlagen:", fehler);
  }
}
