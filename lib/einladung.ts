/**
 * Einladungs- und Zugangs-Links: eine Logik fuer Kunden-Anlage,
 * "Einladung erneut senden", die Selbstbedienung bei abgelaufenen
 * Links und "Passwort vergessen".
 *
 * NUR SERVER-SEITIG VERWENDEN (Service-Rolle).
 *
 * Mit konfiguriertem eigenen Mail-Versand (lib/mail.ts) erzeugen wir
 * den Einmal-Link selbst (generateLink) und verschicken die eigene
 * Vorlage; der Link fuehrt ueber /auth/bestaetigen, wo eine fremde
 * Sitzung zuerst beendet wird. Ohne eigenen Versand bleibt der
 * Standard-Versand von Supabase aktiv (mit seinem Stundenlimit).
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { mailKonfiguriert, sendeMail, sendeMailMitBefund } from "@/lib/mail";
/* Zugangs-Links fuehren in den Anmeldebereich und nehmen deshalb die
   App-Basis (Unterdomain-Runde, 24.08.2026); ohne APP_URL faellt sie
   auf die oeffentliche Basis zurueck. */
import { appBasis, appBasisFehler } from "@/lib/app-basis";
import { mailVermerken } from "@/lib/mail-protokoll";
import { einladungsMail, passwortMail } from "@/lib/mail-vorlagen";
import { pflichtMail } from "@/config/pflicht-mails";

/**
 * Auth-Konto zu einer E-Mail-Adresse finden. Die Admin-Schnittstelle
 * hat keine direkte Suche, bei Pilot-Groesse reicht das Durchblaettern.
 */
export async function findeAuthNutzer(
  service: SupabaseClient,
  email: string
): Promise<User | null> {
  const gesucht = email.trim().toLowerCase();
  for (let seite = 1; seite <= 5; seite++) {
    const { data, error } = await service.auth.admin.listUsers({
      page: seite,
      perPage: 200,
    });
    if (error) return null;
    const treffer = data.users.find((u) => u.email?.toLowerCase() === gesucht);
    if (treffer) return treffer;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Supabase-Versandfehler in eine ehrliche deutsche Meldung uebersetzen */
export function einladungsFehlerMeldung(error: {
  code?: string;
  status?: number;
  message?: string;
}): string {
  if (error.code === "email_exists" || /already|registered/i.test(error.message ?? "")) {
    return "Für diese E-Mail-Adresse gibt es bereits ein Konto.";
  }
  if (
    error.code === "over_email_send_rate_limit" ||
    error.code === "email_rate_limit_exceeded" ||
    error.status === 429
  ) {
    return "Das Stundenlimit des eingebauten Mail-Versands ist erreicht (Supabase erlaubt ohne eigenen Versand nur wenige Mails je Stunde). Bitte versuchen Sie es in einer Stunde erneut oder richten Sie den eigenen Mail-Versand ein (RESEND_API_KEY und MAIL_FROM, siehe README).";
  }
  if (error.status && error.status >= 500) {
    return "Der Mail-Dienst war gerade nicht erreichbar. Bitte versuchen Sie es in ein paar Minuten erneut.";
  }
  return "Die Einladung konnte nicht verschickt werden. Bitte versuchen Sie es gleich noch einmal.";
}

export type LinkErgebnis = { ok: true } | { ok: false; meldung: string };

/**
 * Einladungs-Link fuer ein NEUES Konto erzeugen und ueber den eigenen
 * Versand verschicken. Legt das Auth-Konto mit an (generateLink invite).
 * Nur aufrufen, wenn mailKonfiguriert() wahr ist.
 */
export async function sendeEigeneEinladung(
  service: SupabaseClient,
  { email, name }: { email: string; name: string }
): Promise<LinkErgebnis & { userId?: string }> {
  /* KEINE MAIL MIT KAPUTTEM LINK. Die Basis-Adresse kommt
     ausschliesslich aus der Konfiguration, nie aus der Anfrage. Fehlt
     sie oder taugt sie nicht, bricht der Versand hier ab und
     hinterlaesst einen Eintrag im Versandprotokoll. Siehe
     lib/basis-adresse.ts. */
  const basis = appBasis();
  if (!basis) {
    const grund = appBasisFehler();
    await mailVermerken({
      vorlage: pflichtMail("einladung"),
      empfaenger: email,
      betreff: "Zugang zu selbst-verkauf.de",
      erfolg: false,
      grund,
    });
    return { ok: false, meldung: `Es wurde NICHTS verschickt. ${grund}` };
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { name } },
  });
  if (error || !data.properties?.hashed_token) {
    return { ok: false, meldung: einladungsFehlerMeldung(error ?? {}) };
  }
  const link = `${basis}/auth/bestaetigen?token_hash=${encodeURIComponent(
    data.properties.hashed_token
  )}&typ=invite`;
  const inhalt = einladungsMail({ name, link });
  const befund = await sendeMailMitBefund({
    an: email,
    ...inhalt,
    vorlage: pflichtMail("einladung"),
    /* Eigentuemer ist das frisch eingeladene Konto selbst. Damit
       greift der Vorfuehr-Riegel, falls je ein Vorfuehrkonto neu
       eingeladen wird, und die Eigentuemer-Pflicht in sendeMail ist
       erfuellt (24.08.2026). */
    userId: data.user?.id ?? null,
  });
  if (!befund.verschickt) {
    /* DER GRUND GEHOERT IN DIE MELDUNG (24.08.2026): Ein gewollter
       Vermerk (Pruefbetrieb, Vorfuehrkonto, .invalid-Adresse) ist kein
       Konfigurationsfehler, und der alte Einheitssatz "pruefen Sie
       RESEND_API_KEY" schickte einen auf die falsche Suche. */
    return {
      ok: false,
      userId: data.user?.id,
      meldung: befund.gewollt
        ? "Das Konto ist angelegt, aber die Einladung wurde absichtlich NICHT verschickt, nur vermerkt (Prüfbetrieb, Vorführkonto oder .invalid-Adresse). Der Eintrag samt Grund steht im Versandprotokoll."
        : "Das Konto ist angelegt, aber die Einladung ist NICHT hinausgegangen. Der Grund steht im Versandprotokoll unter Mail-Vorlagen; danach hilft Einladung erneut senden.",
    };
  }
  return { ok: true, userId: data.user?.id };
}

/**
 * Neuen Zugangs-Link fuer ein BESTEHENDES Konto verschicken
 * (Einladung erneut senden, abgelaufener Link, Passwort vergessen).
 * Mit eigenem Versand laeuft ein selbst erzeugter Wiederherstellungs-
 * Link ueber unsere Vorlage, sonst der Standard-Versand von Supabase.
 */
export async function sendeZugangsLink(
  service: SupabaseClient,
  {
    email,
    alsEinladung = false,
  }: { email: string; alsEinladung?: boolean }
): Promise<LinkErgebnis> {
  /* KEINE MAIL MIT KAPUTTEM LINK. Die Basis-Adresse kommt
     ausschliesslich aus der Konfiguration, nie aus der Anfrage. Fehlt
     sie oder taugt sie nicht, bricht der Versand hier ab und
     hinterlaesst einen Eintrag im Versandprotokoll. Siehe
     lib/basis-adresse.ts. */
  const basis = appBasis();
  if (!basis) {
    const grund = appBasisFehler();
    await mailVermerken({
      vorlage: pflichtMail("einladung-oder-passwort"),
      empfaenger: email,
      betreff: "Zugang zu selbst-verkauf.de",
      erfolg: false,
      grund,
    });
    return { ok: false, meldung: `Es wurde NICHTS verschickt. ${grund}` };
  }

  if (mailKonfiguriert()) {
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (error || !data.properties?.hashed_token) {
      return { ok: false, meldung: einladungsFehlerMeldung(error ?? {}) };
    }
    const link = `${basis}/auth/bestaetigen?token_hash=${encodeURIComponent(
      data.properties.hashed_token
    )}&typ=recovery`;
    const inhalt = alsEinladung
      ? einladungsMail({ name: null, link })
      : passwortMail({ link });
    const befund = await sendeMailMitBefund({
      an: email,
      ...inhalt,
      vorlage: alsEinladung ? pflichtMail("einladung") : pflichtMail("passwort"),
      // Eigentuemer ist das Konto, dessen Zugang neu verschickt wird
      userId: data.user?.id ?? null,
    });
    if (!befund.verschickt) {
      /* Gewollter Vermerk und echter Fehlschlag bekommen verschiedene
         Saetze, siehe sendeEigeneEinladung (24.08.2026). */
      return {
        ok: false,
        meldung: befund.gewollt
          ? "Die Mail wurde absichtlich NICHT verschickt, nur vermerkt (Prüfbetrieb, Vorführkonto oder .invalid-Adresse). Der Eintrag samt Grund steht im Versandprotokoll."
          : "Die Mail ist NICHT hinausgegangen. Der Grund steht im Versandprotokoll unter Mail-Vorlagen.",
      };
    }
    return { ok: true };
  }

  // Standard-Versand: Supabase schickt die Passwort-Mail selbst, der
  // Link traegt seine Sitzung im Fragment und landet auf /passwort-setzen
  const { createClient } = await import("@supabase/supabase-js");
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: `${basis}/passwort-setzen`,
  });
  if (error) {
    return { ok: false, meldung: einladungsFehlerMeldung(error) };
  }
  return { ok: true };
}
