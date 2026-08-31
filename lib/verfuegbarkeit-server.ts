import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  einladungenErlaubt,
  nachweisFilter,
  OBJEKT_FELDER,
  sendeBestaetigung,
  sendeRueckmeldungAnVerkaeufer,
  type BesichtigungsObjekt,
  type BesichtigungsPerson,
} from "@/lib/besichtigungen-server";
import { zeitraumText } from "@/lib/besichtigungen";
import { linkAnlegen } from "@/lib/einmal-link";
import { meldeFuerKunden, NICHT_DAS_TEAM_POSTFACH} from "@/lib/ereignis";
import {
  freieZeiten,
  istBuchbar,
  type Belegung,
  type Einstellungen,
  type FreierTag,
  type Regel,
  type Sperre,
  type Zusatzzeit,
} from "@/lib/verfuegbarkeit";
import { supabaseService } from "@/lib/supabase/service";
import { formatUhrzeit } from "@/lib/utils";

/**
 * DIE VERFÜGBARKEIT AN DER DATENBANK.
 *
 * Die Rechnung selbst steht in lib/verfuegbarkeit.ts und kennt keine
 * Datenbank. Hier wird geladen, was sie braucht, und hier wird
 * gebucht.
 *
 * ES ENTSTEHT KEIN ZWEITER TERMINWEG. Eine Buchung erzeugt eine ganz
 * normale Besichtigung mit einer ganz normalen Einladung; alles
 * Weitere (Absagen, Verschieben, Erinnerung, Kalenderdatei, Akte,
 * Aktivität) gilt danach ohne eine einzige zusätzliche Zeile.
 *
 * DIE DREI REGELN, DIE NICHT UMGEHBAR SEIN DÜRFEN, stehen alle an
 * EINER Stelle, nämlich in buchen():
 *
 *   1. Nach Verkauf oder Archivierung geht nichts   einladungenErlaubt()
 *   2. Ohne bestätigten Nachweis nichts, wenn Pflicht  nachweisFilter()
 *   3. Nur Zeiten aus dem eigenen Raster            istBuchbar()
 *
 * Für 1 und 2 werden ausdrücklich die BESTEHENDEN zentralen
 * Funktionen benutzt und keine zweite Prüfung danebengebaut. Genau
 * daran ist die Nachweis-Pflicht schon zweimal gescheitert: einmal an
 * einer fehlenden Datenbankregel, einmal an einem neuen Weg, der die
 * vorhandene Prüfung umging.
 */

export const VERFUEGBARKEIT_FELDER =
  "buchung_aktiv, buchung_dauer_minuten, buchung_puffer_minuten, buchung_vorlauf_stunden, buchung_horizont_tage, buchung_hinweis_gesehen_am";

export type BuchungsEinstellungen = {
  buchung_aktiv: boolean;
  buchung_dauer_minuten: number;
  buchung_puffer_minuten: number;
  buchung_vorlauf_stunden: number;
  buchung_horizont_tage: number;
  buchung_hinweis_gesehen_am: string | null;
};

export function alsEinstellungen(o: BuchungsEinstellungen): Einstellungen {
  return {
    dauerMinuten: o.buchung_dauer_minuten,
    pufferMinuten: o.buchung_puffer_minuten,
    vorlaufStunden: o.buchung_vorlauf_stunden,
    horizontTage: o.buchung_horizont_tage,
  };
}

export type VerfuegbarkeitsDaten = {
  regeln: (Regel & { id: string })[];
  zusatzzeiten: (Zusatzzeit & { id: string })[];
  sperren: (Sperre & { id: string; grund: string | null })[];
  belegt: Belegung[];
};

/**
 * Alles laden, was die Rechnung braucht.
 *
 * BELEGT IST ALLES, WAS NOCH GILT, gleich woher es kommt: von Hand
 * vorgeschlagen, von Hand bestätigt oder selbst gebucht. Abgesagte und
 * verfallene Termine blockieren nichts mehr, sonst würde eine Absage
 * die Zeit nicht wieder freigeben, und das hat der Interessent gerade
 * eben erst erlebt.
 */
export async function ladeVerfuegbarkeit(
  client: SupabaseClient,
  objektId: string
): Promise<VerfuegbarkeitsDaten> {
  const [regeln, extra, sperren, termine] = await Promise.all([
    client
      .from("verfuegbarkeit_regeln")
      .select("id, wochentag, von_zeit, bis_zeit")
      .eq("objekt_id", objektId)
      .order("wochentag")
      .order("von_zeit"),
    client
      .from("verfuegbarkeit_extra")
      .select("id, datum, von_zeit, bis_zeit")
      .eq("objekt_id", objektId)
      .order("datum"),
    client
      .from("verfuegbarkeit_sperren")
      .select("id, von_datum, bis_datum, grund")
      .eq("objekt_id", objektId)
      .order("von_datum"),
    client
      .from("besichtigungen")
      .select("beginn, dauer_minuten")
      .eq("objekt_id", objektId)
      .in("status", ["vorgeschlagen", "bestaetigt"])
      .gte("beginn", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    regeln: (regeln.data ?? []) as VerfuegbarkeitsDaten["regeln"],
    zusatzzeiten: (extra.data ?? []) as VerfuegbarkeitsDaten["zusatzzeiten"],
    sperren: (sperren.data ?? []) as VerfuegbarkeitsDaten["sperren"],
    belegt: (termine.data ?? []) as Belegung[],
  };
}

/**
 * Die freien Zeiten eines Objekts, fertig für die Anzeige.
 *
 * "ohneBelegung" blendet EINEN belegten Zeitpunkt aus der Rechnung
 * aus, nämlich den eigenen Termin dessen, der gerade wechseln will.
 * Sonst blockiert er sich selbst: Wer um 16:00 gebucht hat, sähe die
 * Nachbarzeit als vergeben, obwohl er genau dorthin verschieben darf.
 * Die Anzeige muss dasselbe sagen wie das Buchen, sonst gibt es wieder
 * zwei Wahrheiten.
 */
export async function freieZeitenFuerObjekt(
  client: SupabaseClient,
  objektId: string,
  einstellungen: BuchungsEinstellungen,
  jetzt = new Date(),
  ohneBelegung?: string | null
): Promise<FreierTag[]> {
  if (!einstellungen.buchung_aktiv) return [];
  const daten = await ladeVerfuegbarkeit(client, objektId);
  return freieZeiten({
    regeln: daten.regeln,
    zusatzzeiten: daten.zusatzzeiten,
    sperren: daten.sperren,
    belegt: ohneEigenen(daten.belegt, ohneBelegung),
    einstellungen: alsEinstellungen(einstellungen),
    jetzt,
  });
}

/** Den eigenen Termin aus der Belegung nehmen, wenn er gleich weicht */
function ohneEigenen(belegt: Belegung[], beginn?: string | null): Belegung[] {
  if (!beginn) return belegt;
  const zeit = new Date(beginn).getTime();
  return belegt.filter((b) => new Date(b.beginn).getTime() !== zeit);
}

export type BuchungsErgebnis =
  | {
      ok: true;
      besichtigungId: string;
      /** Es war ein Wechsel, kein zweiter Termin (Migration 0065) */
      verschoben?: boolean;
    }
  | {
      ok: false;
      /** Für die Seite, damit sie unterscheiden kann */
      grund: "belegt" | "aus" | "vorbei" | "nachweis" | "gesperrt" | "fehler";
      meldung: string;
    };

type Zugang =
  | {
      ok: true;
      objekt: BesichtigungsObjekt & BuchungsEinstellungen & { user_id: string };
      person: BesichtigungsPerson;
    }
  | { ok: false; grund: "aus" | "nachweis" | "fehler"; meldung: string };

/**
 * Darf diese Person zu diesem Objekt überhaupt eine Zeit bekommen?
 *
 * DIESE FRAGE WIRD GENAU EINMAL BEANTWORTET, und zwar hier. Sowohl das
 * Anzeigen der freien Zeiten als auch das Buchen ruft diese Funktion
 * auf. Stünde die Prüfung nur am Buchen, bekäme jemand ohne Nachweis
 * eine hübsche Liste zu sehen und erst nach dem Klick eine Absage;
 * stünde sie zweimal da, wäre irgendwann eine der beiden falsch.
 *
 * Beide Regeln kommen aus den BESTEHENDEN zentralen Funktionen. Genau
 * daran ist die Nachweis-Pflicht schon zweimal gescheitert.
 */
async function zugangPruefen(
  service: SupabaseClient,
  objektId: string,
  interessentId: string
): Promise<Zugang> {
  const { data: objekt } = await service
    .from("objekte")
    .select(`${OBJEKT_FELDER}, ${VERFUEGBARKEIT_FELDER}, user_id`)
    .eq("id", objektId)
    .maybeSingle<BesichtigungsObjekt & BuchungsEinstellungen & { user_id: string }>();
  if (!objekt) {
    return { ok: false, grund: "fehler", meldung: "Dieses Objekt gibt es nicht mehr." };
  }

  /* 1) NACH VERKAUF ODER ARCHIVIERUNG NICHTS, und nichts, solange der
     Verkäufer die Selbstbuchung nicht eingeschaltet hat. */
  const erlaubt = einladungenErlaubt(objekt);
  if (!erlaubt.erlaubt || !objekt.buchung_aktiv) {
    return {
      ok: false,
      grund: "aus",
      meldung:
        "Für dieses Objekt lassen sich derzeit keine Termine buchen. Schreiben Sie gern direkt an die Verkäuferin oder den Verkäufer.",
    };
  }

  const { data: person } = await service
    .from("interessenten")
    .select("id, anzeigename, email, anrede, vorname, nachname")
    .eq("id", interessentId)
    .eq("user_id", objekt.user_id)
    .maybeSingle<BesichtigungsPerson>();
  if (!person) {
    return { ok: false, grund: "fehler", meldung: "Dieser Link gehört zu keinem Vorgang." };
  }

  /* 2) DER NACHWEIS GEHT VOR, über die ZENTRALE Stelle. Sie prüft auf
     einen brauchbaren, bestätigten Nachweis; als unbrauchbar vermerkte
     zählen nicht. Hier steht bewusst keine eigene Abfrage. */
  const { erlaubt: mitNachweis } = await nachweisFilter(
    service,
    objekt.user_id,
    [person],
    objekt.nachweis_vor_besichtigung
  );
  if (mitNachweis.length === 0) {
    return {
      ok: false,
      grund: "nachweis",
      meldung:
        "Für dieses Objekt ist vor einer Besichtigung ein Finanzierungs- oder Bonitätsnachweis nötig. Sobald er vorliegt, können Sie hier eine Zeit auswählen.",
    };
  }

  return { ok: true, objekt, person };
}

export type BestehenderTermin = {
  id: string;
  beginn: string;
  dauerMinuten: number;
  /** Selbst gebucht, lässt sich also durch eine neue Wahl verschieben */
  verschiebbar: boolean;
};

/**
 * Der Termin, den diese Person an diesem Objekt schon hat.
 *
 * WOZU: Der persönliche Link ist bewusst mehrfach nutzbar und läuft
 * 120 Tage. Ohne diese Abfrage bekam jemand, der ihn ein zweites Mal
 * öffnete, einen ZWEITEN Termin dazu, ohne Hinweis an irgendjemanden
 * (nachgemessen am 13.08.2026 beim Durchspielen von 0064).
 *
 * NUR SELBST GEBUCHTE SIND VERSCHIEBBAR. Einen Termin, den der
 * Verkäufer angelegt hat, verschiebt die Selbstbuchung nie; er wird nur
 * genannt, damit niemand versehentlich zwei bekommt.
 *
 * DER NÄCHSTE, wenn es doch mehrere gibt: Er ist der, um den es geht.
 */
export async function bestehenderTermin(
  client: SupabaseClient,
  objektId: string,
  interessentId: string
): Promise<BestehenderTermin | null> {
  const { data: einladungen } = await client
    .from("besichtigungs_einladungen")
    .select("besichtigung_id")
    .eq("interessent_id", interessentId)
    .in("status", ["offen", "zugesagt"]);
  const ids = (einladungen ?? []).map((e) => e.besichtigung_id as string);
  if (ids.length === 0) return null;

  const { data: termine } = await client
    .from("besichtigungen")
    .select("id, beginn, dauer_minuten, aus_verfuegbarkeit")
    .in("id", ids)
    .eq("objekt_id", objektId)
    .in("status", ["vorgeschlagen", "bestaetigt"])
    .gt("beginn", new Date().toISOString())
    .order("beginn", { ascending: true })
    .limit(1);

  const t = (termine ?? [])[0];
  if (!t) return null;
  return {
    id: t.id as string,
    beginn: t.beginn as string,
    dauerMinuten: t.dauer_minuten as number,
    verschiebbar: Boolean(t.aus_verfuegbarkeit),
  };
}

export type ZeitenFuerPerson =
  | {
      erlaubt: true;
      tage: FreierTag[];
      dauerMinuten: number;
      /** Was diese Person schon hat, damit sie keine zwei bekommt */
      bestehend: BestehenderTermin | null;
    }
  | { erlaubt: false; grund: "aus" | "nachweis" | "fehler"; meldung: string };

/**
 * Die freien Zeiten, die DIESE Person sehen darf.
 *
 * Wer nicht buchen darf, bekommt keine Liste, sondern einen Satz, der
 * sagt warum. Eine Zeit, die sich nicht buchen lässt, gehört nicht auf
 * die Seite.
 */
export async function freieZeitenFuerPerson(
  objektId: string,
  interessentId: string
): Promise<ZeitenFuerPerson> {
  const service = supabaseService();
  if (!service) {
    return { erlaubt: false, grund: "fehler", meldung: "Das ist gerade nicht erreichbar." };
  }
  const zugang = await zugangPruefen(service, objektId, interessentId);
  if (!zugang.ok) {
    return { erlaubt: false, grund: zugang.grund, meldung: zugang.meldung };
  }
  const bestehend = await bestehenderTermin(service, objektId, interessentId);
  const eigene = bestehend?.verschiebbar ? bestehend.beginn : null;
  const tage = await freieZeitenFuerObjekt(
    service,
    objektId,
    zugang.objekt,
    new Date(),
    eigene
  );

  /* DIE EIGENE ZEIT SELBST BLEIBT DRAUSSEN, ihre Nachbarn nicht: Sie
     als wählbar anzubieten hieße, jemandem die Zeit anzubieten, die er
     schon hat. Genau darüber steht der Satz mit dem bestehenden
     Termin. */
  const gezeigt = eigene
    ? tage
        .map((t) => ({
          ...t,
          zeiten: t.zeiten.filter(
            (z) => z.beginn.getTime() !== new Date(eigene).getTime()
          ),
        }))
        .filter((t) => t.zeiten.length > 0)
    : tage;

  return {
    erlaubt: true,
    dauerMinuten: zugang.objekt.buchung_dauer_minuten,
    tage: gezeigt,
    bestehend,
  };
}

/**
 * Eine freie Zeit buchen.
 *
 * DIE REIHENFOLGE IST DIE AUSSAGE: Erst wird geprüft, ob überhaupt
 * eingeladen werden darf, dann der Nachweis, dann das Raster, und
 * ganz zuletzt gebucht. Der letzte Schritt ist unteilbar in der
 * Datenbank (slot_buchen, Migration 0064); nur dort lässt sich der
 * Wettlauf um dieselbe Zeit gewinnen.
 */
export async function buchen({
  objektId,
  interessentId,
  beginn,
}: {
  objektId: string;
  interessentId: string;
  beginn: Date;
}): Promise<BuchungsErgebnis> {
  const service = supabaseService();
  if (!service) {
    return { ok: false, grund: "fehler", meldung: "Das ist gerade nicht erreichbar." };
  }

  /* 1) und 2) VERKAUF, ARCHIVIERUNG, SCHALTER UND NACHWEIS, in
     derselben Prüfung, die auch das Anzeigen benutzt. Die Oberfläche
     kann damit nichts anbieten, was hier durchfällt, und dieser Weg
     kann nichts durchlassen, was die Oberfläche verbirgt. */
  const zugang = await zugangPruefen(service, objektId, interessentId);
  if (!zugang.ok) {
    return { ok: false, grund: zugang.grund, meldung: zugang.meldung };
  }
  const { objekt, person } = zugang;

  /* 3) HAT DIESE PERSON SCHON EINEN TERMIN? Das muss VOR der
     Raster-Pruefung feststehen, siehe gleich darunter.

     NUR SELBST GEBUCHTE WERDEN VERSCHOBEN. Einen Termin, den der
     Verkaeufer angelegt hat, ruehrt dieser Weg nicht an; einen
     vereinbarten Termin still zu verschieben waere genau die
     Ueberraschung, die wir ueberall sonst vermeiden. */
  const vorhanden = await bestehenderTermin(service, objektId, interessentId);

  /* 4) NUR ZEITEN AUS DEM EIGENEN RASTER, mit DERSELBEN Rechnung wie
     die Anzeige. Ein zweiter, eigener Pruefweg waere eine zweite
     Wahrheit, und eine davon waere irgendwann falsch.

     DER EIGENE TERMIN DARF DABEI NICHT MITZAEHLEN, wenn er gleich
     verschoben wird: Sonst blockiert die Person sich selbst. Wer um
     16:00 gebucht hat und samt Abstand die Nachbarzeit belegt, koennte
     ausgerechnet dorthin nicht wechseln, und das saehe wie ein Fehler
     aus. */
  const daten = await ladeVerfuegbarkeit(service, objektId);
  const belegt = ohneEigenen(
    daten.belegt,
    vorhanden?.verschiebbar ? vorhanden.beginn : null
  );
  const passt = istBuchbar(beginn, {
    regeln: daten.regeln,
    zusatzzeiten: daten.zusatzzeiten,
    sperren: daten.sperren,
    belegt,
    einstellungen: alsEinstellungen(objekt),
  });
  if (!passt.buchbar) {
    /* DER WIRKLICHE GRUND, seit Bau-Runde 5: Vorher hiess jede
       Ablehnung "gerade vergeben worden", auch eine Zeit, die laengst
       vorbei war. istBuchbar unterscheidet jetzt selbst. */
    if (passt.grund === "vorbei") {
      return {
        ok: false,
        grund: "vorbei",
        meldung:
          "Dieser Zeitpunkt liegt bereits in der Vergangenheit. Bitte wählen Sie eine der angezeigten Zeiten.",
      };
    }
    if (passt.grund === "raster") {
      return {
        ok: false,
        grund: "gesperrt",
        meldung:
          "Diese Zeit steht nicht mehr zur Auswahl. Bitte wählen Sie eine der angezeigten Zeiten.",
      };
    }
    return {
      ok: false,
      grund: "belegt",
      meldung:
        "Diese Zeit ist gerade vergeben worden. Bitte wählen Sie eine der übrigen.",
    };
  }

  /* 5) ANLEGEN ODER VERSCHIEBEN, und diese Entscheidung faellt HIER
     und nicht in der Oberflaeche. Genau deshalb kann auch ein direkter
     Aufruf der Route keine zwei Termine nebeneinander erzeugen. */
  if (vorhanden?.verschiebbar) {
    return verschieben(service, {
      vorhanden,
      objekt,
      person,
      interessentId,
      beginn,
    });
  }

  /* 6) UNTEILBAR BUCHEN. Alles davor kann sich in der Zwischenzeit
     geaendert haben; nur die Datenbank kann das ausschliessen. */
  const { data: antwort, error } = await service.rpc("slot_buchen", {
    p_objekt: objektId,
    p_interessent: interessentId,
    p_beginn: beginn.toISOString(),
    p_dauer: objekt.buchung_dauer_minuten,
  });
  if (error) {
    console.error("[verfuegbarkeit] slot_buchen:", error.message);
    return { ok: false, grund: "fehler", meldung: "Das hat leider nicht geklappt." };
  }

  const wort = String(antwort ?? "");
  if (wort === "belegt") {
    return {
      ok: false,
      grund: "belegt",
      meldung:
        "Diese Zeit war einen Augenblick schneller vergeben. Bitte wählen Sie eine der übrigen.",
    };
  }
  if (wort === "aus") {
    return { ok: false, grund: "aus", meldung: "Es lassen sich gerade keine Termine buchen." };
  }
  if (wort === "vorbei") {
    return { ok: false, grund: "vorbei", meldung: "Dieser Zeitpunkt liegt bereits in der Vergangenheit." };
  }
  if (wort === "unbekannt" || wort.length < 20) {
    return { ok: false, grund: "fehler", meldung: "Das hat leider nicht geklappt." };
  }

  await nachDerBuchung(service, {
    besichtigungId: wort,
    objekt,
    person,
    beginn,
    dauer: objekt.buchung_dauer_minuten,
  });

  return { ok: true, besichtigungId: wort };
}

/**
 * Den vorhandenen selbst gebuchten Termin auf die neue Zeit setzen.
 *
 * VERSCHIEBEN STATT ABSAGEN UND NEU ANLEGEN, und das ist keine
 * Geschmacksfrage: Der Termin behält seine Kennung, und weil die
 * Kalenderdatei genau diese Kennung als UID trägt, WANDERT der
 * vorhandene Eintrag auf die neue Zeit. Bei absagen und neu anlegen
 * stünde am Samstag eine Karteileiche und am Dienstag ein zweiter
 * Eintrag, und zwar in beiden Kalendern.
 */
async function verschieben(
  service: SupabaseClient,
  eingabe: {
    vorhanden: BestehenderTermin;
    objekt: BesichtigungsObjekt & BuchungsEinstellungen & { user_id: string };
    person: BesichtigungsPerson;
    interessentId: string;
    beginn: Date;
  }
): Promise<BuchungsErgebnis> {
  const { vorhanden, objekt, person, interessentId, beginn } = eingabe;

  if (new Date(vorhanden.beginn).getTime() === beginn.getTime()) {
    return {
      ok: false,
      grund: "belegt",
      meldung: "Diese Zeit haben Sie bereits. Wählen Sie eine andere, wenn Sie wechseln möchten.",
    };
  }

  const { data: antwort, error } = await service.rpc("slot_verschieben", {
    p_besichtigung: vorhanden.id,
    p_interessent: interessentId,
    p_beginn: beginn.toISOString(),
  });
  if (error) {
    console.error("[verfuegbarkeit] slot_verschieben:", error.message);
    return { ok: false, grund: "fehler", meldung: "Das hat leider nicht geklappt." };
  }

  const wort = String(antwort ?? "");
  if (wort === "belegt") {
    return {
      ok: false,
      grund: "belegt",
      meldung:
        "Diese Zeit war einen Augenblick schneller vergeben. Ihr bisheriger Termin steht unverändert; wählen Sie gern eine der übrigen.",
    };
  }
  if (wort === "vorbei") {
    return { ok: false, grund: "vorbei", meldung: "Dieser Zeitpunkt liegt bereits in der Vergangenheit." };
  }
  if (wort !== "ok") {
    return { ok: false, grund: "fehler", meldung: "Das hat leider nicht geklappt." };
  }

  await nachDerBuchung(service, {
    besichtigungId: vorhanden.id,
    objekt,
    person,
    beginn,
    dauer: vorhanden.dauerMinuten,
    verschobenVon: vorhanden.beginn,
  });

  return { ok: true, besichtigungId: vorhanden.id, verschoben: true };
}

/**
 * Was NACH einer erfolgreichen Buchung geschieht.
 *
 * DER VERKÄUFER DARF NIE ÜBERRASCHT WERDEN, und das ist genauso
 * wichtig wie die Funktion selbst. Ein Termin, von dem er erst am
 * Vortag erfährt, ist genau das, wovor er Angst hat. Deshalb geht die
 * Nachricht sofort hinaus, nach seinen Benachrichtigungs-Einstellungen,
 * und zusätzlich als Meldung an das Team.
 *
 * KEIN SCHRITT DARF DEN VORHERIGEN UMWERFEN: Eine gescheiterte Mail
 * löscht keinen Termin. Deshalb wird hier nichts geworfen.
 */
async function nachDerBuchung(
  service: SupabaseClient,
  eingabe: {
    besichtigungId: string;
    objekt: BesichtigungsObjekt & { user_id: string };
    person: BesichtigungsPerson;
    beginn: Date;
    dauer: number;
    /** Gesetzt, wenn es ein Wechsel war und kein neuer Termin (0065) */
    verschobenVon?: string;
  }
): Promise<void> {
  const { besichtigungId, objekt, person, beginn, dauer, verschobenVon } = eingabe;

  const { data: besichtigung } = await service
    .from("besichtigungen")
    .select("*")
    .eq("id", besichtigungId)
    .maybeSingle();

  /* Die Chronik zuerst: Sie ist die Quelle fuer Akte und Aktivitaet,
     und sie soll auch dann stimmen, wenn eine Mail scheitert. */
  await service.from("besichtigungs_verlauf").insert({
    besichtigung_id: besichtigungId,
    interessent_id: person.id,
    user_id: objekt.user_id,
    art: "zugesagt",
    fuer_zeitpunkt: beginn.toISOString(),
    dauer_minuten: dauer,
    rueckmeldung: verschobenVon
      ? `Selbst verschoben, vorher ${zeitraumText(verschobenVon, dauer)}`
      : "Selbst gebucht über die freien Zeiten",
  });

  if (besichtigung) {
    // Der Interessent bekommt seine Bestaetigung samt Kalendereintrag,
    // ueber denselben Weg wie bei jedem anderen Termin
    await sendeBestaetigung({
      objekt,
      person,
      userId: objekt.user_id,
      besichtigung,
    });
    /* UND DER VERKAEUFER ERFAEHRT ES SOFORT, ueber DIESELBE Funktion,
       die auch bei einer Zusage auf einen Vorschlag laeuft. Eine
       eigene Mail nur fuer Selbstbuchungen waere ein zweiter Weg mit
       eigener Vorlage, eigenen Einstellungen und eigenem Vergessen.
       Die Rueckmeldung sagt, wer wann kommt; dass die Person sich die
       Zeit selbst ausgesucht hat, steht in der Chronik und in der
       Terminuebersicht. */
    await sendeRueckmeldungAnVerkaeufer({
      person,
      userId: objekt.user_id,
      besichtigung,
      zugesagt: true,
      rueckmeldung: verschobenVon
        ? `Die Person hat ihren Termin selbst verschoben, vorher ${zeitraumText(verschobenVon, dauer)}.`
        : "Diese Zeit hat sich die Person selbst ausgesucht.",
      /* MIT KALENDEREINTRAG. Gerade hier ist er wichtig: Diesen Termin
         hat der Verkaeufer nicht selbst angelegt, er weiss also nur
         aus dieser Mail davon. Steht er nur im Konto, steht er am
         Samstagmorgen nirgends. */
      objekt,
    }).catch(async (fehler) => {
      /* WENN SIE NICHT HINAUSGEHT, ERFAEHRT ES WENIGSTENS DAS TEAM
         (Befund vom 31.08.2026).

         Hier stand `.catch(() => null)`. Der Verkaeufer weiss von
         diesem Termin NUR aus dieser Mail, denn angelegt hat ihn die
         andere Seite. Faellt sie aus, steht der Termin still im Konto,
         und am Samstagmorgen steht jemand vor der Tuer, mit dem
         niemand gerechnet hat. Der Kunde bekommt trotzdem keine
         Fehlermeldung, denn er hat nichts falsch gemacht und kann auch
         nichts tun; das Team kann es. */
      console.error("[verfuegbarkeit] Rueckmeldung an den Verkaeufer:", fehler);
      const { melde } = await import("@/lib/ereignis");
      await melde({
        ereignis: "mail.fehlgeschlagen",
        empfaenger: { art: "admin" },
        kurztext:
          "Ein Verkäufer weiß nichts von einer selbst gebuchten Besichtigung: die Mail an ihn ging nicht hinaus",
        /* Die Mail ging an den VERKAEUFER; seine Adresse steht hier
           nicht im Scope, weil sendeRueckmeldungAnVerkaeufer sie selbst
           nachschlaegt. Sicher ist: Es ist ein Kunde und nie das
           Team-Postfach, also kann von hier keine Schleife ausgehen. */
        betroffeneMailAn: NICHT_DAS_TEAM_POSTFACH,
        kennungen: { kunde: objekt.user_id, vorgang: besichtigung.id },
        adminPfad: "/admin/termine",
      });
    });
  }

  await meldeFuerKunden(objekt.user_id, {
    ereignis: "besichtigung.zusage",
    kurztext: verschobenVon
      ? "Eine selbst gebuchte Besichtigung wurde verschoben"
      : "Eine Besichtigung wurde selbst gebucht",
    kennungen: {
      kunde: objekt.user_id,
      objekt: objekt.id,
      vorgang: besichtigungId,
    },
    adminPfad: "/admin/termine",
  });
}

/* ------------------------------------------------------------------ */
/* Der Antwortvorschlag darf die freien Zeiten anbieten                */
/* ------------------------------------------------------------------ */

const TAG_LANG = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "2-digit",
  month: "long",
});

/** Ein persönlicher Buchungs-Link für diese Person */
export async function buchungsLink(
  objektId: string,
  userId: string,
  person: { id: string; email: string | null; anzeigename: string }
): Promise<string | null> {
  const link = await linkAnlegen({
    zweck: "buchung",
    userId,
    objektId,
    zielId: person.id,
    empfaengerEmail: person.email,
    empfaengerName: person.anzeigename,
    erstelltVon: userId,
  });
  return link?.adresse ?? null;
}

/**
 * Die freien Zeiten und den Buchungs-Link an einen Antwortvorschlag
 * anhängen.
 *
 * DIESEN TEIL SCHREIBT UNSER CODE, NIE DAS MODELL. Die KI formuliert
 * den Text; die Zeiten und den Link setzt diese Funktion danach ein.
 * Andernfalls erfindet das Modell irgendwann eine Uhrzeit, die es
 * nicht gibt, der Verkäufer überliest es, und jemand steht umsonst vor
 * der Tür. Das ist kein hypothetischer Fall: Ein Sprachmodell, das
 * eine Liste von Zeiten sieht, formuliert sie gern "hilfreich" um.
 *
 * HÖCHSTENS DREI ZEITEN im Text. Eine Antwortmail ist keine
 * Terminliste; wer mehr sehen will, klickt. Und die drei sind die
 * NÄCHSTEN, nicht die schönsten: Alles andere wäre eine Auswahl, die
 * wir nicht treffen dürfen.
 *
 * NICHTS GEHT VON SELBST HINAUS. Der Vorschlag landet wie bisher im
 * Eingabefeld, der Verkäufer liest, ändert und sendet.
 */
export async function mitFreienZeiten(
  text: string,
  eingabe: {
    objektId: string;
    userId: string;
    person: { id: string; email: string | null; anzeigename: string };
    einstellungen: BuchungsEinstellungen;
    client: SupabaseClient;
  }
): Promise<string> {
  if (!eingabe.einstellungen.buchung_aktiv) return text;

  const tage = await freieZeitenFuerObjekt(
    eingabe.client,
    eingabe.objektId,
    eingabe.einstellungen
  );
  const naechste = tage.flatMap((t) => t.zeiten).slice(0, 3);
  if (naechste.length === 0) return text;

  const link = await buchungsLink(eingabe.objektId, eingabe.userId, eingabe.person);
  if (!link) return text;

  const zeilen = naechste.map(
    (z) => `- ${TAG_LANG.format(z.beginn)}, ${formatUhrzeit(z.beginn)}`
  );
  return [
    text.trimEnd(),
    "",
    "Für eine Besichtigung können Sie sich direkt eine Zeit aussuchen, zum Beispiel:",
    ...zeilen,
    "",
    `Alle freien Zeiten und die Buchung: ${link}`,
  ].join("\n");
}
