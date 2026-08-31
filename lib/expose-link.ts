import "server-only";
import { basisAdresse } from "@/lib/basis-adresse";
import {
  LINK_LAUFZEIT_TAGE,
  linkAnlegen,
  linkWiderrufen,
} from "@/lib/einmal-link";
import { hatWebExpose, type Buchung } from "@/lib/entitlements";
import { anfragenEmpfangSteht, sendeMail } from "@/lib/mail";
import { exposeLinkMail } from "@/lib/mail-vorlagen";
import { supabaseService } from "@/lib/supabase/service";
import { ohneUmbruch } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * Der persoenliche Expose-Link: EIN Weg fuer den automatischen Versand
 * nach einer neuen Anfrage (Schalter objekte.expose_auto_versand) und
 * fuer den Hand-Versand aus der Akte. Persoenlich heisst: je Anfrage
 * ein Link, damit die Akte zeigt, wer geoeffnet hat.
 *
 * Regeln:
 * - Ohne brauchbare Basis-Adresse wird NICHTS verschickt
 *   (lib/basis-adresse.ts, feste Regel des Projekts).
 * - Das Expose geht sofort; Besichtigung und vertrauliche Unterlagen
 *   bleiben hinter dem Nachweis. Der Link fuehrt NUR zum Expose.
 * - Beim Neu-Senden wird der alte Link derselben Anfrage widerrufen:
 *   je Anfrage hoechstens ein lebender Link.
 * - Versand nur mit gebuchtem Expose und vorhandenem PDF; die Vorschau
 *   des Basis-Pakets reicht nicht.
 */

export type ExposeLinkErgebnis =
  | { ok: true; adresse: string }
  | { ok: false; grund: string; adresse?: string };

type AnfrageZeile = {
  id: string;
  user_id: string;
  objekt_id: string;
  interessent_id: string | null;
  email: string | null;
  vorname: string | null;
  nachname: string | null;
};

export async function sendeExposeLink({
  anfrageId,
  erstelltVon,
}: {
  anfrageId: string;
  /** user_id des Ausloesers oder null beim automatischen Versand */
  erstelltVon: string | null;
}): Promise<ExposeLinkErgebnis> {
  const service = supabaseService();
  if (!service) return { ok: false, grund: "Der Versand ist nicht eingerichtet." };

  const basis = basisAdresse();
  if (!basis) {
    return {
      ok: false,
      grund: "Es ist keine brauchbare Basis-Adresse konfiguriert, deshalb wurde nichts verschickt.",
    };
  }

  const { data: anfrage } = await service
    .from("anfragen")
    .select("id, user_id, objekt_id, interessent_id, email, vorname, nachname")
    .eq("id", anfrageId)
    .maybeSingle<AnfrageZeile>();
  if (!anfrage) return { ok: false, grund: "Die Anfrage wurde nicht gefunden." };
  if (!anfrage.email?.trim()) {
    return { ok: false, grund: "Die Anfrage hat keine E-Mail-Adresse." };
  }

  const [{ data: objekt }, { data: buchungen }, { data: profil }] =
    await Promise.all([
      service
        .from("objekte")
        .select("id, objektart, stadt, expose_pfad, anfragen_alias")
        .eq("id", anfrage.objekt_id)
        .maybeSingle<{
          id: string;
          objektart: "haus" | "wohnung" | "mehrfamilienhaus" | null;
          stadt: string | null;
          expose_pfad: string | null;
          anfragen_alias: string | null;
        }>(),
      service
        .from("buchungen")
        .select("*")
        .eq("user_id", anfrage.user_id)
        .returns<Buchung[]>(),
      service
        .from("profiles")
        .select("full_name, email")
        .eq("id", anfrage.user_id)
        .maybeSingle<{ full_name: string | null; email: string | null }>(),
    ]);

  if (!objekt) return { ok: false, grund: "Das Objekt wurde nicht gefunden." };
  if (!hatWebExpose(buchungen ?? [])) {
    return { ok: false, grund: "Das Exposé gehört zur Buchung noch nicht dazu." };
  }
  if (!objekt.expose_pfad) {
    return {
      ok: false,
      grund: "Es gibt noch kein erzeugtes Exposé. Bitte erstellen Sie es zuerst.",
    };
  }

  /* JE PERSON hoechstens ein lebender Link, nicht mehr je Anfrage
     (Bau-Runde 6, 17.08.2026). Vorher wurde nur der alte Link
     DERSELBEN Anfrage widerrufen. Jede Absendung des oeffentlichen
     Formulars erzeugt aber eine NEUE Anfrage-Zeile, und so stellte
     sich ein Fremder mit jeder Absendung einen weiteren gueltigen
     Zugang aus; gemessen waren vier gueltige Links nach vier
     Absendungen. Die Akte (interessent_id) fasst dieselbe Person
     ueber ihre E-Mail zusammen, deshalb haengt der Widerruf jetzt an
     ihr: Wer noch einmal fragt, bekommt einen FRISCHEN Link (das
     hilft, wenn die erste Mail verloren ging), und der alte ist zu.
     Ohne Akte (interessent_id leer) bleibt der alte Weg ueber die
     Anfrage als Rueckfall. */
  const alteAbfrage = service
    .from("einmal_links")
    .select("id")
    .eq("zweck", "expose")
    .is("widerrufen_am", null);
  const { data: alte } = anfrage.interessent_id
    ? await alteAbfrage.eq("ziel_id", anfrage.interessent_id)
    : await alteAbfrage.eq("anfrage_id", anfrage.id);
  /* ERST ZU, DANN AUF (16.08.2026): Schlaegt der Widerruf fehl, geht
     KEIN neuer Link hinaus. Sonst haette derselbe Interessent am Ende
     zwei gueltige Zugaenge, und wir haetten geglaubt, es sei einer. */
  for (const alt of alte ?? []) {
    const widerruf = await linkWiderrufen(alt.id as string);
    if (!widerruf.ok) {
      return {
        ok: false,
        grund: `Der bisherige Exposé-Zugang ließ sich nicht zurückziehen, deshalb wurde kein neuer verschickt. ${widerruf.offen.join(" ")}`,
      };
    }
  }

  const empfaengerName =
    [anfrage.vorname, anfrage.nachname].filter(Boolean).join(" ") || null;
  const link = await linkAnlegen({
    zweck: "expose",
    userId: anfrage.user_id,
    objektId: anfrage.objekt_id,
    anfrageId: anfrage.id,
    zielId: anfrage.interessent_id,
    empfaengerEmail: anfrage.email,
    empfaengerName,
    erstelltVon,
  });
  if (!link) {
    return { ok: false, grund: "Der Link konnte nicht erzeugt werden." };
  }
  // Basis-Regel: Die Adresse in der Mail kommt aus basisAdresse(),
  // nie aus der Anfrage und nie fest aus dem Code
  const adresse = `${basis}/expose/${link.token}`;

  const gueltigBis = ohneUmbruch(
    new Date(
      Date.now() + LINK_LAUFZEIT_TAGE.expose * 24 * 60 * 60 * 1000
    ).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
  );

  const mail = exposeLinkMail({
    name: empfaengerName,
    objektart: objekt.objektart,
    ort: objekt.stadt,
    verkaeuferName: profil?.full_name ?? null,
    link: adresse,
    gueltigBis,
  });

  // Absender wie beim Schreiben an Interessenten: die Schutz-Adresse
  // des Objekts; solange dort niemand zuhoert, erreicht die Antwort
  // den Verkaeufer direkt
  const empfangSteht = anfragenEmpfangSteht();
  const versandt = await sendeMail({
    an: anfrage.email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: "expose-link",
    von: objekt.anfragen_alias
      ? `${siteConfig.mailAbsender.name} <${objekt.anfragen_alias}>`
      : null,
    antwortAn: empfangSteht ? (objekt.anfragen_alias ?? null) : (profil?.email ?? null),
    userId: anfrage.user_id,
  });
  if (!versandt) {
    // Der Link bleibt gueltig und geht mit zurueck: Der Verkaeufer
    // kann ihn selbst weitergeben, das Versandprotokoll traegt den Grund
    return {
      ok: false,
      grund: "Die Mail konnte nicht verschickt werden. Der Link gilt trotzdem, Sie können ihn selbst weitergeben.",
      adresse,
    };
  }
  return { ok: true, adresse };
}
